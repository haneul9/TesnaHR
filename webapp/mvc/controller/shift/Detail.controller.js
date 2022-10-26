sap.ui.define(
  [
    //
    'sap/m/MessageToast',
    'sap/ui/table/SelectionMode',
    'sap/ui/tesna/control/MessageBox',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/ApprovalStatusHandler',
    'sap/ui/tesna/common/FileAttachmentBoxHandler',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/common/Validator',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  (
    //
    MessageToast,
    SelectionMode,
    MessageBox,
    AppUtils,
    ApprovalStatusHandler,
    FileAttachmentBoxHandler,
    Client,
    ServiceNames,
    Validator,
    BaseController
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.shift.Detail', {
      DISPLAY_MODE: '',
      LIST_TABLE_ID: 'shiftApprovalTable',

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

        return `${this.getBundleText('LABEL_01002')} ${sRouteText}`;
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      getApprovalType() {
        return 'TG';
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
          },
          fieldLimit: {},
          form: {
            rowCount: 1,
            listMode: 'None',
            list: [],
            Appno: '',
            Appst: '',
            Aprsn: '',
            Werks: '',
            Orgeh: '',
            Orgtx: '',
            TmdatTxt: '',
          },
        };
      },

      onBeforeShow() {
        BaseController.prototype.onBeforeShow.apply(this, arguments);

        this.TableUtils.adjustRowSpan({
          oTable: this.byId(this.LIST_TABLE_ID),
          aColIndices: [0, 1, 2, 3, 4, 5],
          sTheadOrTbody: 'thead',
        });
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
            const oModel = this.getModel(ServiceNames.WORKTIME);
            const mFormData = oViewModel.getProperty('/form');
            const aDetailRow = await Client.getEntitySet(oModel, 'ShiftChangeApply', {
              ..._.pick(mFormData, ['Werks', 'Orgeh', 'Appno']),
            });

            _.chain(mFormData)
              .set('Appst', _.get(aDetailRow, [0, 'Appst']))
              .set('Aprsn', _.get(aDetailRow, [0, 'Aprsn']))
              .set('Orgtx', _.get(aDetailRow, [0, 'Orgtx']))
              .commit();
            oViewModel.setProperty('/form/rowCount', aDetailRow.length);
            oViewModel.setProperty('/form/list', aDetailRow);
            oViewModel.refresh(true);
          } else {
            oViewModel.setProperty('/fieldLimit', this.getEntityLimit(ServiceNames.WORKTIME, 'ShiftChangeApply'));
            oViewModel.setProperty('/form/listMode', SelectionMode.MultiToggle);

            await this.retrieveTmdat();
          }

          this.setOrgtx();
          this.settingsAttachTable();
          this.settingsApprovalStatus();
        } catch (oError) {
          this.debug('Controller > shift-detail > loadPage Error', oError);

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

      retrieveRowEntries(dBegda = moment().hours(9).toDate()) {
        const oViewModel = this.getViewModel();
        const oModel = this.getModel(ServiceNames.WORKTIME);
        const mPayload = {
          Begda: dBegda,
          Werks: oViewModel.getProperty('/form/Werks'),
          Orgeh: oViewModel.getProperty('/form/Orgeh'),
        };

        return Promise.all([
          Client.getEntitySet(oModel, 'TimePernrList', { Austy: oViewModel.getProperty('/auth'), ...mPayload }), //
          Client.getEntitySet(oModel, 'TimeSchkzList', _.omit(mPayload, 'Orgeh')),
          Client.getEntitySet(oModel, 'KostlList', mPayload),
        ]);
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

      async setOrgtx() {
        const oViewModel = this.getViewModel();

        try {
          const mFormData = oViewModel.getProperty('/form');
          const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.NIGHTWORK), 'TimeOrgehList', {
            Werks: mFormData.Werks,
            Austy: this.currentAuth(),
          });

          oViewModel.setProperty('/form/Orgtx', _.chain(aEntries).find({ Orgeh: mFormData.Orgeh }).get('Fulln').value());
        } catch (oError) {
          AppUtils.debug(oError);
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
          Mode: mFormData.Appno ? 'D' : 'N',
          EndPoint: this.DISPLAY_MODE,
          Austy: sAuth,
          Appty: this.getApprovalType(),
          ..._.pick(mFormData, ['Appno', 'Orgeh']),
        });
      },

      async createProcess({ sPrcty = 'S' }) {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const mFormData = _.cloneDeep(oViewModel.getProperty('/form'));

          const { Appno } = await Client.create(oModel, 'ShiftChangeApply', {
            Prcty: sPrcty,
            Pernr: this.getAppointeeProperty('Pernr'),
            ..._.pick(mFormData, ['Appno', 'Werks', 'Orgeh', 'Aprsn']),
            ShiftChangeNav: mFormData.list,
          });

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
          this.debug('Controller > shift Detail > createProcess Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'all');
        }
      },

      async deleteProcess() {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const sAppno = _.cloneDeep(oViewModel.getProperty('/form/Appno'));

          await Client.remove(oModel, 'ShiftChangeApply', {
            Appno: sAppno,
          });

          // {취소}되었습니다.
          MessageBox.success(this.getBundleText('MSG_00007', this.getBundleText('LABEL_00118')), {
            onClose: () => this.getRouter().navTo(oViewModel.getProperty('/previousName')),
          });
        } catch (oError) {
          this.debug('Controller > shift Detail > deleteProcess Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'all');
        }
      },

      onPressApproval() {
        const oViewModel = this.getViewModel();
        const aList = oViewModel.getProperty('/form/list');
        const aFieldProperties = [
          { field: 'Begda', label: 'LABEL_00148', type: Validator.INPUT1 }, // 시작일
          { field: 'Endda', label: 'LABEL_00149', type: Validator.INPUT1 }, // 종료일
          { field: 'Pernr', label: 'LABEL_00174', type: Validator.SELECT2 }, // 대상자
          { field: 'Schkz', label: 'LABEL_01003', type: Validator.SELECT1 }, // 근무일정
          { field: 'Kostl', label: 'LABEL_01004', type: Validator.SELECT2 }, // 공정코드
        ];

        if (_.some(aList, (mFieldValue) => !Validator.check({ mFieldValue, aFieldProperties }))) return;

        this.setContentsBusy(true, 'all');

        // {신청}하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00006', 'LABEL_00121'), {
          actions: [this.getBundleText('LABEL_00121'), MessageBox.Action.CANCEL],
          onClose: (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false, 'all');
              return;
            }

            this.createProcess({ sPrcty: 'S' });
          },
        });
      },

      onPressCancel() {
        this.setContentsBusy(true, 'all');

        // 신청을 취소하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00062'), {
          actions: [this.getBundleText('LABEL_00114'), MessageBox.Action.CANCEL],
          onClose: (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false, 'all');
              return;
            }

            this.deleteProcess();
          },
        });
      },

      onPressApprove() {
        this.setContentsBusy(true, 'all');

        // {승인}하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00006', 'LABEL_00123'), {
          actions: [this.getBundleText('LABEL_00123'), MessageBox.Action.CANCEL],
          onClose: async (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false, 'all');
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
              this.debug('Controller > shift Detail > onPressApprove Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false, 'all');
            }
          },
        });
      },

      onPressReject() {
        this.setContentsBusy(true, 'all');

        // {반려}하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00006', 'LABEL_00124'), {
          actions: [this.getBundleText('LABEL_00121'), MessageBox.Action.CANCEL],
          onClose: async (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false, 'all');
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
              this.debug('Controller > shift Detail > onPressReject Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false, 'all');
            }
          },
        });
      },

      async onPressAddBtn() {
        const oViewModel = this.getViewModel();

        this.setContentsBusy(true, 'table');

        try {
          const aTableRows = oViewModel.getProperty('/form/list');
          const [aEmployees, aSchkzs, aKostls] = await this.retrieveRowEntries();
          const mAddedRow = {
            Begda: moment().hours(9).toDate(),
            Endda: moment('99991231').hours(9).toDate(),
            Schkz: null,
            Kostl: null,
            employees: aEmployees,
            schkzs: aSchkzs,
            kostls: aKostls,
          };

          oViewModel.setProperty('/form/rowCount', aTableRows.length + 1);
          oViewModel.setProperty('/form/list', [...aTableRows, mAddedRow]);
        } catch (oError) {
          this.debug('Controller > shift-detail > onPressAddBtn Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'table');
        }
      },

      onPressDelBtn() {
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
          onClose: function (sAction) {
            if (MessageBox.Action.CANCEL === sAction) return;

            const aUnSelectedData = aTableData.filter((elem, idx) => {
              return !aSelectedIndices.some(function (iIndex) {
                return iIndex === idx;
              });
            });

            oViewModel.setProperty('/form/list', aUnSelectedData);
            oViewModel.setProperty('/form/rowCount', aUnSelectedData.length || 1);

            oTable.clearSelection();
          }.bind(this),
        });
      },

      onPressDialogExcelDownload() {
        window.open('/sap/public/bc/ui2/zui5_tesnahr/documents/shift_upload_template.xlsx', '_blank');
      },

      onPressDialogExcelUpload(oEvent) {
        try {
          if (oEvent.getParameter('files') && oEvent.getParameter('files')[0]) {
            const oFileReader = new FileReader();

            oFileReader.onload = (e) => {
              const workbook = XLSX.read(e.target.result, { type: 'binary' });

              workbook.SheetNames.forEach((sheet) => {
                const aRowObject = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheet]);

                if (!_.isEmpty(aRowObject)) {
                  AppUtils.debug(`Shift upload excel data.`, aRowObject);
                  this.assignTableWithExcel(aRowObject);
                }
              });
            };

            oFileReader.readAsBinaryString(oEvent.getParameter('files')[0]);
          }
        } catch (oError) {
          this.debug('Controller > shift Detail > onPressDialogExcelUpload Error', oError);

          AppUtils.handleError(oError);
        }
      },

      async assignTableWithExcel(aRowObject) {
        const oViewModel = this.getViewModel();

        this.setContentsBusy(true, 'table');

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const aTableData = _.cloneDeep(oViewModel.getProperty('/form/list'));
          const mPayload = {
            Prcty: 'U',
            Orgeh: oViewModel.getProperty('/form/Orgeh'),
          };

          for (const mRowData of aRowObject) {
            const dBegda = this.DateUtils.parse(this._getExcelPropertyValue(mRowData, 'Begda'));
            const mReturnData = await Client.create(oModel, 'ShiftChangeApply', {
              ...mPayload,
              Pernr: this._getExcelPropertyValue(mRowData, 'Pernr'),
              Ename: this._getExcelPropertyValue(mRowData, 'Ename'),
              Begda: dBegda,
              Endda: this.DateUtils.parse(this._getExcelPropertyValue(mRowData, 'Endda')),
              Rtext: this._getExcelPropertyValue(mRowData, 'Rtext'),
              Ltext: this._getExcelPropertyValue(mRowData, 'Ltext'),
            });

            AppUtils.debug(`Shift upload return data.`, mReturnData);

            const iExistRowIndex = _.findIndex(aTableData, (o) => _.isEqual(o.Pernr, mReturnData.Pernr) && moment(o.Begda).isSame(moment(mReturnData.Begda), 'day'));

            if (iExistRowIndex === -1) {
              const [aEmployees, aSchkzs, aKostls] = await this.retrieveRowEntries(dBegda);

              aTableData.push({
                ...mReturnData,
                employees: aEmployees,
                schkzs: aSchkzs,
                kostls: aKostls,
              });
            } else {
              _.set(aTableData, iExistRowIndex, {
                ..._.get(aTableData, iExistRowIndex),
                ...mReturnData,
              });
            }
          }

          oViewModel.setProperty('/form/rowCount', aTableData.length);
          oViewModel.setProperty('/form/list', aTableData);

          MessageToast.show('Complete!', {
            my: 'center center',
            at: 'center center',
          });
        } catch (oError) {
          this.debug('Controller > shift Detail > assignTableWithExcel Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.byId('excelUpload').setValue('');
          this.setContentsBusy(false, 'table');
        }
      },

      _getExcelPropertyValue(mExcelData, sPropName) {
        const mMappingProps = {
          Pernr: '사번',
          Ename: '성명',
          Begda: '시작',
          Endda: '종료',
          Rtext: '근무',
          Ltext: '공정',
        };

        return _.chain(mExcelData)
          .pickBy((v, p) => _.startsWith(p, mMappingProps[sPropName]))
          .values()
          .get(0)
          .toString()
          .value();
      },

      async onChangeBeginDate(oEvent) {
        this.setContentsBusy(true, 'table');

        try {
          const mRowData = oEvent.getSource().getBindingContext().getObject();
          const [aEmployees, aSchkzs, aKostls] = await this.retrieveRowEntries(moment(mRowData.Begda).hours(9).toDate());

          if (mRowData.Pernr && !_.some(aEmployees, (o) => o.Pernr === mRowData.Pernr)) {
            _.chain(mRowData).set('Pernr', '').set('Ename', '').set('Orgeh', '').set('Orgtx', '').set('Zzcaltltx', '').set('Schkz2', '').set('Rtext2', '').set('Kostl2', '').set('Ltext2', '').commit();
          }
          if (mRowData.Schkz && !_.some(aSchkzs, (o) => o.Schkz === mRowData.Schkz)) {
            _.set(mRowData, 'Schkz', '');
          }
          if (mRowData.Kostl && !_.some(aKostls, (o) => o.Kostl === mRowData.Kostl)) {
            _.set(mRowData, 'Kostl', '');
          }

          _.chain(mRowData).set('employees', aEmployees).set('schkzs', aSchkzs).set('kostls', aKostls).commit();
        } catch (oError) {
          this.debug('Controller > shift-detail > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'table');
        }
      },

      onSelectSuggest(oEvent) {
        const oInput = oEvent.getSource();
        const oSelectedSuggestionRow = oEvent.getParameter('selectedRow');

        if (oSelectedSuggestionRow) {
          const oContext = oSelectedSuggestionRow.getBindingContext();
          oInput.setValue(oContext.getProperty('Ename'));

          const sRowPath = oInput.getParent().getBindingContext().getPath();
          const oViewModel = this.getViewModel();

          oViewModel.setProperty(`${sRowPath}/Pernr`, oContext.getProperty('Pernr'));
          oViewModel.setProperty(`${sRowPath}/Orgeh`, oContext.getProperty('Orgeh'));
          oViewModel.setProperty(`${sRowPath}/Orgtx`, oContext.getProperty('Orgtx'));
          oViewModel.setProperty(`${sRowPath}/Zzcaltl`, oContext.getProperty('Zzcaltl'));
          oViewModel.setProperty(`${sRowPath}/Zzcaltltx`, oContext.getProperty('Zzcaltltx'));
          oViewModel.setProperty(`${sRowPath}/Schkz2`, oContext.getProperty('Schkz2'));
          oViewModel.setProperty(`${sRowPath}/Rtext2`, oContext.getProperty('Rtext2'));
          oViewModel.setProperty(`${sRowPath}/Kostl2`, oContext.getProperty('Kostl2'));
          oViewModel.setProperty(`${sRowPath}/Ltext2`, oContext.getProperty('Ltext2'));

          oViewModel.refresh(true);
        }

        oInput.getBinding('suggestionRows').filter([]);
      },

      onSubmitSuggest(oEvent) {
        const oViewModel = this.getViewModel();
        const oInput = oEvent.getSource();
        const oContext = oInput.getParent().getBindingContext();
        const sRowPath = oContext.getPath();

        const sInputValue = oEvent.getParameter('value');
        if (!sInputValue) {
          oViewModel.setProperty(`${sRowPath}/Ename`, '');
          oViewModel.setProperty(`${sRowPath}/Pernr`, '');
          oViewModel.setProperty(`${sRowPath}/Orgeh`, '');
          oViewModel.setProperty(`${sRowPath}/Orgtx`, '');
          oViewModel.setProperty(`${sRowPath}/Zzcaltl`, '');
          oViewModel.setProperty(`${sRowPath}/Zzcaltltx`, '');
          oViewModel.setProperty(`${sRowPath}/Schkz2`, '');
          oViewModel.setProperty(`${sRowPath}/Rtext2`, '');
          oViewModel.setProperty(`${sRowPath}/Kostl2`, '');
          oViewModel.setProperty(`${sRowPath}/Ltext2`, '');
          return;
        }

        const aEmployees = oViewModel.getProperty(`${sRowPath}/employees`);
        const [mEmployee] = _.filter(aEmployees, (o) => _.startsWith(o.Ename, sInputValue));

        if (sRowPath && !_.isEmpty(mEmployee)) {
          oViewModel.setProperty(`${sRowPath}/Ename`, mEmployee.Ename);
          oViewModel.setProperty(`${sRowPath}/Pernr`, mEmployee.Pernr);
          oViewModel.setProperty(`${sRowPath}/Orgeh`, mEmployee.Orgeh);
          oViewModel.setProperty(`${sRowPath}/Orgtx`, mEmployee.Orgtx);
          oViewModel.setProperty(`${sRowPath}/Zzcaltl`, mEmployee.Zzcaltl);
          oViewModel.setProperty(`${sRowPath}/Zzcaltltx`, mEmployee.Zzcaltltx);
          oViewModel.setProperty(`${sRowPath}/Schkz2`, mEmployee.Schkz2);
          oViewModel.setProperty(`${sRowPath}/Rtext2`, mEmployee.Rtext2);
          oViewModel.setProperty(`${sRowPath}/Kostl2`, mEmployee.Kostl2);
          oViewModel.setProperty(`${sRowPath}/Ltext2`, mEmployee.Ltext2);
        } else {
          oViewModel.setProperty(`${sRowPath}/Ename`, '');
          oViewModel.setProperty(`${sRowPath}/Pernr`, '');
          oViewModel.setProperty(`${sRowPath}/Orgeh`, '');
          oViewModel.setProperty(`${sRowPath}/Orgtx`, '');
          oViewModel.setProperty(`${sRowPath}/Zzcaltl`, '');
          oViewModel.setProperty(`${sRowPath}/Zzcaltltx`, '');
          oViewModel.setProperty(`${sRowPath}/Schkz2`, '');
          oViewModel.setProperty(`${sRowPath}/Rtext2`, '');
          oViewModel.setProperty(`${sRowPath}/Kostl2`, '');
          oViewModel.setProperty(`${sRowPath}/Ltext2`, '');
        }
      },

      onHistoryBack() {
        this.setContentsBusy(true);
        history.back();
      },
    });
  }
);
