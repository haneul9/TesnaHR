/* eslint-disable no-else-return */
sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/core/Fragment',
    'sap/ui/table/SelectionMode',
    'sap/ui/tesna/control/MessageBox',
    'sap/ui/tesna/common/exceptions/UI5Error',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/ApprovalStatusHandler',
    'sap/ui/tesna/common/FileAttachmentBoxHandler',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/common/Validator',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  (
    // prettier 방지용 주석
    Fragment,
    SelectionMode,
    MessageBox,
    UI5Error,
    AppUtils,
    ApprovalStatusHandler,
    FileAttachmentBoxHandler,
    Client,
    ServiceNames,
    Validator,
    BaseController
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.changeot.Detail', {
      DISPLAY_MODE: '',
      LIST_TABLE_ID: 'changeotApprovalTable',
      LIST_DIALOG_CALCLE_TABLE_ID: 'dialogCancelTable',

      ApprovalStatusHandler: null,
      FileAttachmentBoxHandler: null,

      getPreviousRouteName() {
        return this.getViewModel().getProperty('/previousName');
      },

      getCurrentLocationText(oArguments) {
        const sRouteText =
          oArguments.appno === 'N'
            ? '' //
            : oArguments.flag === 'WE' || oArguments.flag === 'WD'
            ? this.getBundleText('LABEL_00165') // 결재
            : this.getBundleText('LABEL_00100'); // 조회

        return `${this.getBundleText('LABEL_07013')} ${sRouteText}`; // 특근변경신청
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      getApprovalType() {
        return 'TL';
      },

      /**
       * @override
       */
      onBeforeShow() {
        BaseController.prototype.onBeforeShow.apply(this, arguments);

        this.TableUtils.adjustRowSpan({
          oTable: this.byId(this.LIST_TABLE_ID),
          aColIndices: [0, 1, 2, 3, 4, 5, 12],
          sTheadOrTbody: 'thead',
        });
      },

      initializeModel() {
        return {
          auth: '',
          displayMode: '',
          previousName: '',
          contentsBusy: {
            all: false,
            button: false,
            table: false,
            dialog: false,
            period: false,
          },
          entry: {
            Employees: [],
          },
          form: {
            Appno: '',
            Appst: '',
            Aprsn: '',
            Werks: '',
            Orgeh: '',
            Orgtx: '',
            TmdatTxt: '',
            rowCount: 0,
            listMode: 'None',
            list: [],
          },
          dialog: {
            calcCompleted: false,
            grid: {},
          },
        };
      },

      async onObjectMatched(oParameter, sRouteName) {
        const oViewModel = this.getViewModel();

        oViewModel.setSizeLimit(10000);
        oViewModel.setData(this.initializeModel());

        // 신청,조회 - B, Work to do - WE, Not Work to do - WD
        this.DISPLAY_MODE = oParameter.flag || 'B';
        oViewModel.setProperty('/displayMode', this.DISPLAY_MODE);
        oViewModel.setProperty('/auth', this.currentAuth());
        oViewModel.setProperty('/form/Appno', oParameter.appno === 'N' ? '' : oParameter.appno);
        oViewModel.setProperty('/form/Werks', oParameter.werks);
        oViewModel.setProperty('/form/Orgeh', oParameter.orgeh);
        oViewModel.setProperty('/previousName', _.chain(sRouteName).split('-', 1).head().value());

        this.loadPage();
      },

      setContentsBusy(bContentsBusy = true, vTarget = []) {
        const oViewModel = this.getViewModel();
        const mBusy = oViewModel.getProperty('/contentsBusy');

        if (_.isEmpty(vTarget)) {
          _.forOwn(mBusy, (v, p) => _.set(mBusy, p, bContentsBusy));
        } else {
          if (_.isArray(vTarget)) {
            _.forEach(vTarget, (s) => _.set(mBusy, s, bContentsBusy));
          } else {
            _.set(mBusy, vTarget, bContentsBusy);
          }
        }

        oViewModel.refresh();
      },

      async loadPage() {
        const oViewModel = this.getViewModel();

        this.setContentsBusy(true);

        try {
          const sAppno = oViewModel.getProperty('/form/Appno');

          if (sAppno) {
            await this.retriveDocument();
          } else {
            await this.retrieveTmdat();

            oViewModel.setProperty('/form/listMode', SelectionMode.MultiToggle);
          }

          this.settingsAttachTable();
          this.settingsApprovalStatus();
        } catch (oError) {
          this.debug('Controller > changeot Detail > loadPage Error', oError);

          if (oError instanceof Error) oError = new UI5Error({ message: this.getBundleText('MSG_00043') }); // 잘못된 접근입니다.

          AppUtils.handleError(oError, {
            onClose: () => {
              if (this.DISPLAY_MODE === 'B') {
                this.getRouter().navTo(oViewModel.getProperty('/previousName'));
              } else {
                this.onHistoryBack();
              }
            },
          });
        } finally {
          this.setContentsBusy(false);
        }
      },

      async retriveDocument() {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const mFormData = oViewModel.getProperty('/form');

          const aResults = await Client.getEntitySet(oModel, 'OtworkChangeApply', {
            Appno: mFormData.Appno,
            Werks: mFormData.Werks,
          });

          mFormData.Appst = _.get(aResults, [0, 'Appst']);

          oViewModel.setProperty('/form', {
            ...mFormData,
            rowCount: Math.min(aResults.length, 10),
            listMode: !mFormData.Appst || mFormData.Appst === '10' ? SelectionMode.MultiToggle : SelectionMode.None,
            list: aResults,
          });
        } catch (oError) {
          throw oError;
        }
      },

      async retrieveTmdat() {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const mFormData = oViewModel.getProperty('/form');

          const [mResult] = await Client.getEntitySet(oModel, 'DailyTimeClose', {
            Pernr: this.getAppointeeProperty('Pernr'),
            ..._.pick(mFormData, ['Werks', 'Orgeh']),
          });

          oViewModel.setProperty(
            '/form/TmdatTxt',
            `${this.DateUtils.format(mResult.Tmdat)} ( ${this.getBundleText('LABEL_04002')}: ${this.DateUtils.format(mResult.Clsda)} ${this.TimeUtils.format(mResult.Clstm)} )`
          );
        } catch (oError) {
          throw oError;
        }
      },

      // AttachFileTable Settings
      settingsAttachTable() {
        const oViewModel = this.getViewModel();
        const sStatus = oViewModel.getProperty('/form/Appst');
        const sAppno = oViewModel.getProperty('/form/Appno') || '';

        this.FileAttachmentBoxHandler = new FileAttachmentBoxHandler(this, {
          editable: !sStatus || sStatus === '10',
          appno: sAppno,
          appty: this.getApprovalType(),
          maxFileCount: 10,
        });
      },

      settingsApprovalStatus() {
        const oViewModel = this.getViewModel();
        const mFormData = oViewModel.getProperty('/form');
        const sAuth = oViewModel.getProperty('/auth');
        const sPernr = this.getAppointeeProperty('Pernr');

        this.ApprovalStatusHandler = new ApprovalStatusHandler(this, {
          Pernr: sPernr,
          Mode: mFormData.Appno && mFormData.Appst !== '10' ? 'D' : 'N',
          EndPoint: this.DISPLAY_MODE,
          Austy: sAuth,
          Appty: this.getApprovalType(),
          ..._.pick(mFormData, ['Appno', 'Orgeh']),
        });
      },

      async createProcess() {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const mFormData = _.cloneDeep(oViewModel.getProperty('/form'));
          const aTableData = _.cloneDeep(oViewModel.getProperty('/form/list'));

          const { Appno } = await Client.deep(oModel, 'OtworkChangeApply', {
            ..._.get(aTableData, 0),
            ..._.chain(mFormData).pick(['Appno', 'Werks', 'Orgeh']).omitBy(_.isNil).omitBy(_.isEmpty).value(),
            Prcty: 'C',
            Austy: oViewModel.getProperty('/auth'),
            OtworkChangeNav: aTableData,
          });

          oViewModel.setProperty('/form/Appno', Appno);

          // 파일 삭제 및 업로드
          const oFileError = await this.FileAttachmentBoxHandler.upload(Appno);
          if (oFileError && oFileError.code === 'E') throw oFileError;

          // 결재선 저장
          await this.ApprovalStatusHandler.save(Appno);

          // {신청}되었습니다.
          MessageBox.success(this.getBundleText('MSG_00007', this.getBundleText('LABEL_00121')), {
            onClose: () => this.getRouter().navTo(oViewModel.getProperty('/previousName')),
          });
        } catch (oError) {
          throw oError;
        }
      },

      async deleteProcess() {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const sAppno = _.cloneDeep(oViewModel.getProperty('/form/Appno'));

          await Client.remove(oModel, 'OtworkChangeApply', {
            Appno: sAppno,
          });

          // {취소}되었습니다.
          MessageBox.success(this.getBundleText('MSG_00007', this.getBundleText('LABEL_00118')), {
            onClose: () => {
              this.getRouter().navTo(oViewModel.getProperty('/previousName'));
              this.setContentsBusy(false);
            },
          });
        } catch (oError) {
          this.setContentsBusy(false);
          this.debug('Controller > changeot Detail > deleteProcess Error', oError);

          AppUtils.handleError(oError);
        }
      },

      /*****************************************************************
       * ! Event handler
       *****************************************************************/
      onHistoryBack() {
        this.setContentsBusy(true);
        history.back();
      },

      onChangeApptyp(oEvent) {
        this.getViewModel().setProperty('/dialog/grid/Apptyptx', oEvent.getParameter('value'));
      },

      onPressApproval() {
        this.setContentsBusy(true);

        // {신청}하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00006', 'LABEL_00121'), {
          actions: [this.getBundleText('LABEL_00121'), MessageBox.Action.CANCEL],
          onClose: async (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false);
              return;
            }

            try {
              this.setContentsBusy(true);

              await this.createProcess();
            } catch (oError) {
              this.debug('Controller > changeot Detail > onPressApproval Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false);
            }
          },
        });
      },

      onPressCancel() {
        this.setContentsBusy(true);

        // 신청을 취소하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00062'), {
          actions: [this.getBundleText('LABEL_00114'), MessageBox.Action.CANCEL],
          onClose: (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false);
              return;
            }

            this.deleteProcess();
          },
        });
      },

      onPressApprove() {
        this.setContentsBusy(true);

        // {승인}하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00006', 'LABEL_00123'), {
          actions: [this.getBundleText('LABEL_00123'), MessageBox.Action.CANCEL],
          onClose: async (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false);
              return;
            }

            try {
              const sAppno = this.getViewModel().getProperty('/form/Appno');

              // 승인
              await this.ApprovalStatusHandler.approve(sAppno);

              // 승인되었습니다.
              MessageBox.success(this.getBundleText('MSG_00007', this.getBundleText('LABEL_00123')), {
                onClose: () => this.onHistoryBack(),
              });
            } catch (oError) {
              this.debug('Controller > changeot Detail > onPressApprove Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false);
            }
          },
        });
      },

      onPressReject() {
        this.setContentsBusy(true);

        // {반려}하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00006', 'LABEL_00124'), {
          actions: [this.getBundleText('LABEL_00121'), MessageBox.Action.CANCEL],
          onClose: async (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false);
              return;
            }

            try {
              const sAppno = this.getViewModel().getProperty('/form/Appno');

              // 반려
              await this.ApprovalStatusHandler.reject(sAppno);

              // 반려되었습니다.
              MessageBox.success(this.getBundleText('MSG_00007', this.getBundleText('LABEL_00124')), {
                onClose: () => this.onHistoryBack(),
              });
            } catch (oError) {
              this.debug('Controller > changeot Detail > onPressReject Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false);
            }
          },
        });
      },

      onDialogAfterClose() {
        this.pFormDialog.destroy();
        this.pFormDialog = null;
      },

      async onPressAddRowBtn() {
        const oView = this.getView();

        this.setContentsBusy(true, 'dialog');

        if (!this.pFormDialog) {
          this.pFormDialog = await Fragment.load({
            id: oView.getId(),
            name: 'sap.ui.tesna.mvc.view.changeot.fragment.FormDialog',
            controller: this,
          });

          this.pFormDialog.attachBeforeOpen(async () => {
            try {
              const oViewModel = this.getViewModel();

              oViewModel.setProperty('/dialog/grid', {});

              await this.retrieveTimePernrList();

              if (_.isEqual(this.currentAuth(), 'E')) {
                const oViewModel = this.getViewModel();
                const aEmployees = oViewModel.getProperty('/entry/Employees');
                const sPernr = this.getAppointeeProperty('Pernr');
                const mEmployee = _.find(aEmployees, { Pernr: sPernr });

                if (!!mEmployee) {
                  oViewModel.setProperty(`/dialog/grid/Pernr`, mEmployee.Pernr);
                  oViewModel.setProperty(`/dialog/grid/Ename`, mEmployee.Ename);
                  oViewModel.setProperty(`/dialog/grid/Zzcaltl`, mEmployee.Zzcaltl);
                  oViewModel.setProperty(`/dialog/grid/Zzcaltltx`, mEmployee.Zzcaltltx);
                  oViewModel.setProperty(`/dialog/grid/Orgeh`, mEmployee.Orgeh);
                  oViewModel.setProperty(`/dialog/grid/Orgtx`, mEmployee.Orgtx);
                  oViewModel.setProperty(`/dialog/grid/Kostl`, mEmployee.Kostl2);
                  oViewModel.setProperty(`/dialog/grid/Ltext`, mEmployee.Ltext2);
                  oViewModel.setProperty(`/dialog/grid/PernrInfoTxt`, `(${mEmployee.Pernr}, ${mEmployee.Zzcaltltx}, ${mEmployee.Orgtx})`);
                }
              }
            } catch (oError) {
              this.debug('Controller > changeot Detail > onPressAddNewApprovalBtn Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false, 'dialog');
            }
          });

          oView.addDependent(this.pFormDialog);
        }

        this.pFormDialog.open();
      },

      onSelectSuggest(oEvent) {
        const oViewModel = this.getViewModel();
        const oInput = oEvent.getSource();
        const oSelectedSuggestionRow = oEvent.getParameter('selectedRow');

        oViewModel.setProperty('/dialog/calcCompleted', false);

        if (oSelectedSuggestionRow) {
          const oContext = oSelectedSuggestionRow.getBindingContext();
          const mSuggestionData = oContext.getObject();

          oInput.setValue(mSuggestionData.Ename);

          oViewModel.setProperty(`/dialog/grid/Pernr`, mSuggestionData.Pernr);
          oViewModel.setProperty(`/dialog/grid/Zzcaltltx`, mSuggestionData.Zzcaltltx);
          oViewModel.setProperty(`/dialog/grid/Zzpsgrptx`, mSuggestionData.Zzpsgrptx);
          oViewModel.setProperty(`/dialog/grid/Orgeh`, mSuggestionData.Orgeh);
          oViewModel.setProperty(`/dialog/grid/Orgtx`, mSuggestionData.Orgtx);
          oViewModel.setProperty(`/dialog/grid/Kostl`, mSuggestionData.Kostl2);
          oViewModel.setProperty(`/dialog/grid/Ltext`, mSuggestionData.Ltext2);
          oViewModel.setProperty(`/dialog/grid/PernrInfoTxt`, `(${mSuggestionData.Pernr}, ${mSuggestionData.Zzcaltltx}, ${mSuggestionData.Orgtx})`);

          oViewModel.refresh();
        }

        oInput.getBinding('suggestionRows').filter([]);

        this.onDialogCalcTime();
      },

      onSubmitSuggest(oEvent) {
        const oViewModel = this.getViewModel();
        const sInputValue = oEvent.getParameter('value');

        oViewModel.setProperty('/dialog/calcCompleted', false);

        if (!sInputValue) {
          oViewModel.setProperty('/dialog/grid', {});
          oViewModel.refresh();

          return;
        }

        const aEmployees = oViewModel.getProperty('/entry/Employees');
        const [mEmployee] = _.filter(aEmployees, (o) => _.startsWith(o.Ename, sInputValue));

        if (!_.isEmpty(mEmployee)) {
          oViewModel.setProperty(`/dialog/grid/Pernr`, mEmployee.Pernr);
          oViewModel.setProperty(`/dialog/grid/Ename`, mEmployee.Ename);
          oViewModel.setProperty(`/dialog/grid/Zzcaltl`, mEmployee.Zzcaltl);
          oViewModel.setProperty(`/dialog/grid/Zzcaltltx`, mEmployee.Zzcaltltx);
          oViewModel.setProperty(`/dialog/grid/Orgeh`, mEmployee.Orgeh);
          oViewModel.setProperty(`/dialog/grid/Orgtx`, mEmployee.Orgtx);
          oViewModel.setProperty(`/dialog/grid/Kostl`, mEmployee.Kostl2);
          oViewModel.setProperty(`/dialog/grid/Ltext`, mEmployee.Ltext2);
          oViewModel.setProperty(`/dialog/grid/PernrInfoTxt`, `(${mEmployee.Pernr}, ${mEmployee.Zzcaltltx}, ${mEmployee.Orgtx})`);
        } else {
          oViewModel.setProperty('/dialog/grid', {});
        }

        oViewModel.refresh();
      },

      onPressDelRowBtn() {
        const oViewModel = this.getViewModel();
        const oTable = this.byId(this.LIST_TABLE_ID);
        const aSelectedIndices = oTable.getSelectedIndices();
        const aTableData = oViewModel.getProperty('/form/list');

        if (aSelectedIndices.length < 1) {
          MessageBox.alert(this.getBundleText('MSG_00020', 'LABEL_00110')); // {삭제}할 행을 선택하세요.
          return;
        }

        // 선택된 행을 삭제하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00021'), {
          onClose: (sAction) => {
            if (MessageBox.Action.CANCEL === sAction) return;

            const aUnSelectedData = aTableData.filter((elem, idx) => {
              return !aSelectedIndices.some(function (iIndex) {
                return iIndex === idx;
              });
            });

            oViewModel.setProperty('/form/list', aUnSelectedData);
            oViewModel.setProperty('/form/rowCount', aUnSelectedData.length);

            oTable.clearSelection();
          },
        });
      },

      async onDialogCalcTime() {
        this.setContentsBusy(true, 'dialog');

        setTimeout(async () => {
          const oViewModel = this.getViewModel();

          try {
            const mDialogFormData = _.cloneDeep(oViewModel.getProperty('/dialog/grid'));

            if (!mDialogFormData.Pernr || !mDialogFormData.Tmdat) return;

            const mResult = await Client.create(this.getModel(ServiceNames.WORKTIME), 'OtworkChangeApply', {
              Prcty: 'D',
              Pernr: mDialogFormData.Pernr,
              Tmdat: this.DateUtils.parse(mDialogFormData.Tmdat),
            });

            oViewModel.setProperty('/dialog/grid/Beguz', mResult.Beguz);
            oViewModel.setProperty('/dialog/grid/Enduz', mResult.Enduz);
            oViewModel.setProperty('/dialog/grid/Abrst', _.chain(mResult.Abrst).toNumber().toString().value());
            oViewModel.setProperty('/dialog/grid/Dayngt', mResult.Dayngt);
            oViewModel.setProperty('/dialog/grid/Period', `${this.TimeUtils.toString(mResult.Beguz, 'HH:mm')} ~ ${this.TimeUtils.toString(mResult.Enduz, 'HH:mm')}`);
            oViewModel.setProperty('/dialog/grid/BeguzB', mResult.BeguzB);
            oViewModel.setProperty('/dialog/grid/EnduzB', mResult.EnduzB);
            oViewModel.setProperty('/dialog/grid/AbrstB', _.chain(mResult.AbrstB).toNumber().toString().value());
            oViewModel.setProperty('/dialog/grid/DayngtB', mResult.DayngtB);
            oViewModel.setProperty('/dialog/grid/PeriodB', `${this.TimeUtils.toString(mResult.BeguzB, 'HH:mm')} ~ ${this.TimeUtils.toString(mResult.EnduzB, 'HH:mm')}`);
            oViewModel.setProperty('/dialog/calcCompleted', true);
          } catch (oError) {
            oViewModel.setProperty('/dialog/grid/Apptyp', null);
            oViewModel.setProperty('/dialog/grid/Beguz', null);
            oViewModel.setProperty('/dialog/grid/Enduz', null);
            oViewModel.setProperty('/dialog/grid/Abrst', null);
            oViewModel.setProperty('/dialog/grid/Dayngt', null);
            oViewModel.setProperty('/dialog/grid/Period', null);
            oViewModel.setProperty('/dialog/grid/BeguzB', null);
            oViewModel.setProperty('/dialog/grid/EnduzB', null);
            oViewModel.setProperty('/dialog/grid/AbrstB', null);
            oViewModel.setProperty('/dialog/grid/DayngtB', null);
            oViewModel.setProperty('/dialog/grid/PeriodB', null);
            oViewModel.setProperty('/dialog/calcCompleted', false);

            this.debug('Controller > changeot Detail > onDialogCalcTime Error', oError);

            AppUtils.handleError(oError);
          } finally {
            this.setContentsBusy(false, 'dialog');
          }
        }, 0);
      },

      async onCalcAfterOvertime() {
        this.setContentsBusy(true, 'dialog');

        setTimeout(async () => {
          const oViewModel = this.getViewModel();

          try {
            const mDialogFormData = _.cloneDeep(oViewModel.getProperty('/dialog/grid'));

            if (!mDialogFormData.Dayngt || !mDialogFormData.Abrst) return;

            const mResult = await Client.create(this.getModel(ServiceNames.WORKTIME), 'OtworkChangeApply', {
              Prcty: 'T',
              Tmdat: this.DateUtils.parse(mDialogFormData.Tmdat),
              ..._.pick(mDialogFormData, ['Pernr', 'Dayngt', 'Abrst']),
            });

            oViewModel.setProperty('/dialog/grid/Beguz', mResult.Beguz);
            oViewModel.setProperty('/dialog/grid/Enduz', mResult.Enduz);
            oViewModel.setProperty('/dialog/grid/Period', `${this.TimeUtils.toString(mResult.Beguz, 'HH:mm')} ~ ${this.TimeUtils.toString(mResult.Enduz, 'HH:mm')}`);
          } catch (oError) {
            this.debug('Controller > changeot Detail > onCalcAfterOvertime Error', oError);

            AppUtils.handleError(oError);
          } finally {
            this.setContentsBusy(false, 'dialog');
          }
        }, 0);
      },

      onDialogSavBtn() {
        if (this.validExistRows()) return;

        if (this.validRequiredInputData()) return;

        const oViewModel = this.getViewModel();
        const mDialogGrid = oViewModel.getProperty('/dialog/grid');
        const aFormList = oViewModel.getProperty('/form/list');
        const aRowData = [...aFormList, mDialogGrid];

        oViewModel.setProperty('/form/rowCount', aRowData.length || 1);
        oViewModel.setProperty('/form/list', aRowData);

        this.pFormDialog.close();
      },

      validExistRows() {
        const oViewModel = this.getViewModel();
        const aApprovalList = oViewModel.getProperty('/form/list');
        const mAddedData = oViewModel.getProperty('/dialog/grid');

        if (
          _.chain(aApprovalList)
            .filter((t) => _.isEqual(t.Pernr, mAddedData.Pernr) && moment(mAddedData.Tmdat).isSame(moment(t.Tmdat), 'day'))
            .size()
            .gt(0)
            .value()
        ) {
          MessageBox.alert(this.getBundleText('MSG_07002')); // 동일한 사번/일자 데이터가 존재하여 저장이 불가합니다.
          return true;
        }

        return false;
      },

      validRequiredInputData() {
        const oViewModel = this.getViewModel();
        const mFieldValue = oViewModel.getProperty('/dialog/grid');
        const aFieldProperties = [
          { field: 'Apptyp', label: 'LABEL_00225', type: Validator.SELECT1 }, // 신청구분
          { field: 'Dayngt', label: 'LABEL_07012', type: Validator.SELECT1 }, // 특근구분
          { field: 'Abrst', label: 'LABEL_07007', type: Validator.SELECT1 }, // 특근시간
        ];

        if (!Validator.check({ mFieldValue, aFieldProperties })) return true;

        return false;
      },

      /*****************************************************************
       * ! Call OData
       *****************************************************************/
      async retrieveTimePernrList() {
        try {
          const oViewModel = this.getViewModel();
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const mFormData = oViewModel.getProperty('/form');
          const sAuth = oViewModel.getProperty('/auth');
          const aResults = await Client.getEntitySet(oModel, 'TimePernrList', {
            Austy: sAuth,
            Pernr: sAuth === 'E' ? this.getAppointeeProperty('Pernr') : null,
            Begda: moment().hours(9).toDate(),
            Werks: mFormData.Werks,
            Orgeh: sAuth === 'E' ? null : mFormData.Orgeh,
          });

          oViewModel.setProperty('/entry/Employees', aResults);
        } catch (oError) {
          throw oError;
        }
      },
    });
  }
);
