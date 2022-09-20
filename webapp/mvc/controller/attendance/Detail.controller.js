/* eslint-disable no-else-return */
sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/core/Fragment',
    'sap/ui/tesna/control/MessageBox',
    'sap/ui/tesna/common/exceptions/UI5Error',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/ApprovalStatusHandler',
    'sap/ui/tesna/common/FileAttachmentBoxHandler',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  (
    // prettier 방지용 주석
    Fragment,
    MessageBox,
    UI5Error,
    AppUtils,
    ApprovalStatusHandler,
    FileAttachmentBoxHandler,
    Client,
    ServiceNames,
    BaseController
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.attendance.Detail', {
      DISPLAY_MODE: '',
      LIST_TABLE_ID: 'attendanceApprovalTable',
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
            ? this.getBundleText('LABEL_00360') // 결재
            : this.getBundleText('LABEL_00100'); // 조회

        return `${this.getBundleText('LABEL_05001')} ${sRouteText}`; // 근태신청
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      getApprovalType() {
        return 'TI';
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
            Awart: [],
            Awrsn: [],
            Employees: [],
            TimeTypes: [],
            TimeReasons: [],
            AllTimeReason: [],
          },
          form: {
            Appno: '',
            Appst: '',
            Aprsn: '',
            Werks: '',
            Orgeh: '',
            Orgtx: '',
            Kostl: '',
            TmdatTxt: '',
            rowCount: 0,
            listMode: 'None',
            list: [],
            dialog: {
              minutesStep: 10,
              initBeguz: moment('0900', 'hhmm').toDate(),
              initEnduz: moment('1800', 'hhmm').toDate(),
              calcCompleted: false,
              data: {},
              list: [],
              rowCount: 0,
            },
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
        oViewModel.setProperty('/auth', this.isMss() ? 'M' : this.isHass() ? 'H' : 'E');
        oViewModel.setProperty('/form/Appno', oParameter.appno === 'N' ? '' : oParameter.appno);
        oViewModel.setProperty('/form/Werks', oParameter.werks);
        oViewModel.setProperty('/form/Orgeh', oParameter.orgeh);
        oViewModel.setProperty('/form/Kostl', !oParameter.kostl || _.toUpper(oParameter.kostl) === 'NA' ? null : oParameter.kostl);
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

            oViewModel.setProperty('/form/listMode', 'MultiToggle');
          }

          this.settingsAttachTable();
          this.settingsApprovalStatus();
        } catch (oError) {
          this.debug('Controller > Attendance Detail > loadPage Error', oError);

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
          const sAuth = oViewModel.getProperty('/auth');

          const aResults = await Client.getEntitySet(oModel, 'LeaveApplList', {
            Austy: sAuth,
            ..._.pick(mFormData, ['Appno', 'Werks', 'Orgeh', 'Kostl']),
          });

          mFormData.Appst = _.get(aResults, [0, 'Appst']);

          oViewModel.setProperty('/form', {
            ...mFormData,
            rowCount: Math.min(aResults.length, 10),
            listMode: !mFormData.Appst || mFormData.Appst === '10' ? 'MultiToggle' : 'None',
            list: _.map(aResults, (o) => _.omit(o, '__metadata')),
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

      setWorkPeriod() {
        const oViewModel = this.getViewModel();

        try {
          const sAwrsn = oViewModel.getProperty('/form/dialog/data/Awrsn');

          if (sAwrsn) {
            const aResons = oViewModel.getProperty('/entry/TimeReasons');
            const mAwrsnInfo = _.chain(aResons).find({ Awrsn: sAwrsn }).value();

            oViewModel.setProperty('/form/dialog/data/Awrsntx', mAwrsnInfo.Awrsntx);
            oViewModel.setProperty('/form/dialog/data/Gubun', mAwrsnInfo.Datim === 'D' ? 0 : mAwrsnInfo.Datim === 'T' ? 1 : null);
            oViewModel.setProperty('/form/dialog/data/Datim', mAwrsnInfo.Datim);
            oViewModel.setProperty('/form/dialog/RadioControl', mAwrsnInfo.Datim);
            oViewModel.setProperty('/form/dialog/minutesStep', sAwrsn === 'A6XXXX10' ? 5 : 10); // 보건휴가 5분단위 입력

            // 시간근태일 경우 시작일과 종료일을 맞춰준다.
            if (mAwrsnInfo.Datim === 'T') {
              const dBegda = oViewModel.getProperty('/form/dialog/data/Begda');

              if (dBegda) oViewModel.setProperty('/form/dialog/data/Endda', dBegda);
            }
          } else {
            oViewModel.setProperty('/form/dialog/data/Gubun', null);
            oViewModel.setProperty('/form/dialog/data/Datim', 'X');
            oViewModel.setProperty('/form/dialog/data/RadioControl', 'X');
          }

          oViewModel.setProperty('/form/dialog/data/Beguz', null);
          oViewModel.setProperty('/form/dialog/data/Enduz', null);
          oViewModel.setProperty('/form/dialog/data/Daytm', '');

          this.byId('startTime').setValue(null).setDateValue(null);
          this.byId('endTime').setValue(null).setDateValue(null);
        } catch (oError) {
          throw oError;
        } finally {
          oViewModel.refresh();
        }
      },

      callValidWorkTime() {
        this.setContentsBusy(true, 'period');

        setTimeout(async () => {
          const oViewModel = this.getViewModel();

          try {
            const mDialogFormData = _.cloneDeep(oViewModel.getProperty('/form/dialog/data'));

            if (mDialogFormData.Gubun === 0 && mDialogFormData.Pernr && mDialogFormData.Awart && mDialogFormData.Awrsn && mDialogFormData.Begda && mDialogFormData.Endda) {
            } else if (
              mDialogFormData.Gubun === 1 &&
              mDialogFormData.Pernr &&
              mDialogFormData.Awart &&
              mDialogFormData.Awrsn &&
              mDialogFormData.Begda &&
              mDialogFormData.Endda &&
              mDialogFormData.Beguz &&
              !_.isNaN(mDialogFormData.Beguz.ms) &&
              mDialogFormData.Enduz &&
              !_.isNaN(mDialogFormData.Enduz.ms)
            ) {
            } else if (
              mDialogFormData.Gubun === 1 &&
              mDialogFormData.Pernr &&
              mDialogFormData.Awart &&
              mDialogFormData.Awrsn &&
              mDialogFormData.Begda &&
              mDialogFormData.Endda &&
              _.includes(['A1KR0010', 'A1KR0020', 'A1KR0030', 'A1KR0040', 'A1KR0060', 'A1KR0070', 'A1KR0080', 'A1KR0090'], mDialogFormData.Awrsn)
            ) {
            } else {
              return;
            }

            const [mResult] = await Client.getEntitySet(this.getModel(ServiceNames.WORKTIME), 'PersTimeAbsence2', {
              Tmdat: this.DateUtils.parse(mDialogFormData.Begda),
              Begda: this.DateUtils.parse(mDialogFormData.Begda),
              Endda: this.DateUtils.parse(mDialogFormData.Endda),
              Beguz: mDialogFormData.Beguz ? this.TimeUtils.toString(mDialogFormData.Beguz, 'HHmm') : null,
              Enduz: mDialogFormData.Enduz ? this.TimeUtils.toString(mDialogFormData.Enduz, 'HHmm') : null,
              ..._.pick(mDialogFormData, ['Pernr', 'Awart', 'Awrsn', 'Datim']),
            });

            oViewModel.setProperty('/form/dialog/calcCompleted', true);
            oViewModel.setProperty('/form/dialog/data/Daytm', mResult.Daytm);
            oViewModel.setProperty('/form/dialog/data/Beguz', this.TimeUtils.toEdm(mResult.Beguz));
            oViewModel.setProperty('/form/dialog/data/Enduz', this.TimeUtils.toEdm(mResult.Enduz));
            oViewModel.setProperty('/form/dialog/data/Stdaz', mResult.Stdaz);
            oViewModel.setProperty('/form/dialog/data/Abrtg', mResult.Abrtg);
            oViewModel.setProperty('/form/dialog/data/Abrst', mResult.Abrst);
          } catch (oError) {
            oViewModel.setProperty('/form/dialog/calcCompleted', false);
            oViewModel.setProperty('/form/dialog/data/Daytm', null);
            oViewModel.setProperty('/form/dialog/data/Beguz', null);
            oViewModel.setProperty('/form/dialog/data/Enduz', null);
            oViewModel.setProperty('/form/dialog/data/Stdaz', null);
            oViewModel.setProperty('/form/dialog/data/Abrtg', null);
            oViewModel.setProperty('/form/dialog/data/Abrst', null);

            this.byId('startTime').setValue(null).setDateValue(null);
            this.byId('endTime').setValue(null).setDateValue(null);

            this.debug('Controller > Attendance Detail > callValidWorkTime Error', oError);

            AppUtils.handleError(oError);
          } finally {
            this.setContentsBusy(false, 'period');
          }
        }, 0);
      },

      async createProcess() {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const mFormData = _.cloneDeep(oViewModel.getProperty('/form'));
          const aTableData = _.cloneDeep(oViewModel.getProperty('/form/list'));

          const { Appno } = await Client.deep(oModel, 'LeaveApplList', {
            Prcty: 'A',
            Austy: oViewModel.getProperty('/auth'),
            Pernr: this.getAppointeeProperty('Pernr'),
            ..._.chain(mFormData).pick(['Appno', 'Werks', 'Orgeh', 'Kostl']).omitBy(_.isNil).omitBy(_.isEmpty).value(),
            LeaveApplNav: aTableData,
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

          await Client.remove(oModel, 'LeaveApplList', {
            Appno: sAppno,
          });

          // {취소}되었습니다.
          MessageBox.success(this.getBundleText('MSG_00007', this.getBundleText('LABEL_00118')), {
            onClose: () => this.getRouter().navTo(oViewModel.getProperty('/previousName')),
          });
        } catch (oError) {
          this.debug('Controller > Attendance Detail > deleteProcess Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false);
        }
      },

      /*****************************************************************
       * ! Event handler
       *****************************************************************/
      onHistoryBack() {
        this.setContentsBusy(true);
        history.back();
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
              this.debug('Controller > Attendance Detail > onPressApproval Error', oError);

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
          actions: [this.getBundleText('LABEL_00121'), MessageBox.Action.CANCEL],
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
              this.debug('Controller > Attendance Detail > onPressApprove Error', oError);

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
              this.debug('Controller > Attendance Detail > onPressReject Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false);
            }
          },
        });
      },

      async onPressAddNewApprovalBtn() {
        const oView = this.getView();

        this.setContentsBusy(true, 'dialog');

        if (!this.pFormDialog) {
          this.pFormDialog = await Fragment.load({
            id: oView.getId(),
            name: 'sap.ui.tesna.mvc.view.attendance.fragment.FormDialog',
            controller: this,
          });

          this.pFormDialog.attachBeforeOpen(async () => {
            try {
              await Promise.all([
                this.retrieveTimePernrList(), //
                this.retrieveTimeTypeaList(),
              ]);

              this.getViewModel().setProperty('/form/dialog/data', { Datim: 'X' });

              if (!this.isMss() && !this.isHass()) {
                const oViewModel = this.getViewModel();
                const aEmployees = oViewModel.getProperty('/entry/Employees');
                const sPernr = this.getAppointeeProperty('Pernr');
                const mEmployee = _.find(aEmployees, { Pernr: sPernr });

                if (!!mEmployee) {
                  oViewModel.setProperty('/form/dialog/data', {
                    ..._.pick(mEmployee, ['Pernr', 'Ename', 'Orgeh', 'Orgtx', 'Zzcaltl', 'Zzcaltltx', 'Blqtx']),
                    Schkz: mEmployee.Schkz2,
                    Rtext: mEmployee.Rtext2,
                    Kostl: mEmployee.Kostl2,
                    Ltext: mEmployee.Ltext2,
                    PernrInfoTxt: `(${mEmployee.Pernr}, ${mEmployee.Zzcaltltx}, ${mEmployee.Orgtx})`,
                  });
                }
              }
            } catch (oError) {
              this.debug('Controller > Attendance Detail > onPressAddNewApprovalBtn Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false, 'dialog');
            }
          });

          oView.addDependent(this.pFormDialog);
        }

        this.pFormDialog.open();
      },

      async onPressAddCancleApprolvalBtn() {
        const oView = this.getView();

        this.setContentsBusy(true, 'dialog');

        if (!this.pFormCalcleDialog) {
          this.pFormCalcleDialog = await Fragment.load({
            id: oView.getId(),
            name: 'sap.ui.tesna.mvc.view.attendance.fragment.FormCancleDialog',
            controller: this,
          });

          this.pFormCalcleDialog.attachBeforeOpen(async () => {
            try {
              this.getViewModel().setProperty('/form/dialog/rowCount', 0);
              this.getViewModel().setProperty('/form/dialog/list', []);

              await this.retrieveCancelList();
            } catch (oError) {
              this.debug('Controller > Attendance Detail > onPressAddCancleApprolvalBtn Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false, 'dialog');
            }
          });

          oView.addDependent(this.pFormCalcleDialog);
        }

        this.pFormCalcleDialog.open();
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

      async onPressTimeReason(oEvent) {
        const oViewModel = this.getViewModel();

        try {
          const oCustomData = oEvent.getSource().getCustomData();
          const sAwart = oCustomData[0].getValue();
          const sAwrsn = oCustomData[1].getValue();

          oViewModel.setProperty('/form/dialog/data/Awart', sAwart);

          await this.retrieveTimeReasonList();

          oViewModel.setProperty('/form/dialog/data/Awrsn', sAwrsn);

          this.setWorkPeriod();
          this.callValidWorkTime();
        } catch (oError) {
          this.debug('Controller > Attendance Detail > onPressTimeReason Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.pAwartReasong.close();
        }
      },

      async onChangeAwartCombo() {
        try {
          await this.retrieveTimeReasonList();

          this.setWorkPeriod();
          this.callValidWorkTime();
        } catch (oError) {
          this.debug('Controller > Attendance Detail > onChangeAwartCombo Error', oError);

          AppUtils.handleError(oError);
        }
      },

      async onPressAwartDialog() {
        const oView = this.getView();

        this.setContentsBusy(true, 'dialog');

        if (!this.pAwartReasonDialog) {
          this.pAwartReasong = await Fragment.load({
            id: oView.getId(),
            name: 'sap.ui.tesna.mvc.view.attendance.fragment.AwartReasonDialog',
            controller: this,
          });

          this.pAwartReasong.attachBeforeOpen(async () => {
            try {
              const aTypeReasons = this.getViewModel().getProperty('/entry/AllTimeReason');

              if (!aTypeReasons.length) await this.retrieveTimeReasonList(true);
            } catch (oError) {
              this.debug('Controller > Attendance Detail > onPressAddCancleApprolvalBtn Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false, 'dialog');
            }
          });

          oView.addDependent(this.pAwartReasong);
        }

        this.pAwartReasong.open();
      },

      onChangeAwrsnCombo() {
        this.setWorkPeriod();
        this.callValidWorkTime();
      },

      onSelectGubunRadion(oEvent) {
        const oViewModel = this.getViewModel();
        const iGubun = oEvent.getParameter('selectedIndex');
        const sDatim = oViewModel.getProperty('/form/dialog/data/Datim');

        if (iGubun === 1) {
          const dBegda = oViewModel.getProperty('/form/dialog/data/Begda');

          if (dBegda) oViewModel.setProperty('/form/dialog/data/Endda', dBegda);
        }

        oViewModel.setProperty('/form/dialog/data/Gubun', iGubun);
        oViewModel.setProperty('/form/dialog/data/Datim', iGubun === 0 ? 'D' : iGubun === 1 ? 'T' : sDatim);
        oViewModel.setProperty('/form/dialog/calcCompleted', false);
        oViewModel.setProperty('/form/dialog/data/Daytm', null);
        oViewModel.setProperty('/form/dialog/data/Beguz', null);
        oViewModel.setProperty('/form/dialog/data/Enduz', null);
        oViewModel.setProperty('/form/dialog/data/Stdaz', null);
        oViewModel.setProperty('/form/dialog/data/Abrtg', null);
        oViewModel.setProperty('/form/dialog/data/Abrst', null);
        oViewModel.refresh();

        this.byId('startTime').setValue(null).setDateValue(null);
        this.byId('endTime').setValue(null).setDateValue(null);

        this.callValidWorkTime();
      },

      onPressFormDialogSave() {
        const oViewModel = this.getViewModel();
        const aTableData = oViewModel.getProperty('/form/list');
        const mDialogFormData = oViewModel.getProperty('/form/dialog/data');
        const sBegda = this.DateUtils.format(mDialogFormData.Begda);
        const sEndda = this.DateUtils.format(mDialogFormData.Endda);

        oViewModel.setProperty('/form/rowCount', aTableData.length + 1);
        oViewModel.setProperty('/form/list', [
          ...aTableData,
          {
            Aptyp: 'A',
            Aptyptx: this.getBundleText('LABEL_00105'), // 신규
            Period: _.chain([sBegda, sEndda]).uniq().join(' ~ ').value(),
            ...mDialogFormData,
            Beguz: mDialogFormData.Beguz ? this.TimeUtils.toString(mDialogFormData.Beguz, 'HHmm') : null,
            Enduz: mDialogFormData.Enduz ? this.TimeUtils.toString(mDialogFormData.Enduz, 'HHmm') : null,
          },
        ]);

        this.pFormDialog.close();
      },

      onPressFormDialogClose() {
        this.pFormDialog.close();
      },

      onPressFormCancelDialogSave() {
        const oViewModel = this.getViewModel();
        const oTable = this.byId(this.LIST_DIALOG_CALCLE_TABLE_ID);
        const aSelectedIndices = oTable.getSelectedIndices();
        const aTableData = oViewModel.getProperty('/form/list');
        const aDialogList = oViewModel.getProperty('/form/dialog/list');
        const aSelectedData = _.chain(aDialogList)
          .filter((o, i) => _.includes(aSelectedIndices, i))
          .cloneDeep()
          .map((o) => ({
            ..._.chain(o).omit('__metadata').omitBy(_.isNil).value(),
            Appno: '',
            Aptyp: 'C',
            Aptyptx: this.getBundleText('LABEL_00118'), // 취소
          }))
          .value();

        if (aSelectedData.length !== 1) {
          MessageBox.alert(this.getBundleText('MSG_00020', 'LABEL_00383')); // {취소신청}할 행을 선택하세요.
          return;
        }

        oViewModel.setProperty('/form/rowCount', _.sum([aTableData.length, aSelectedData.length]));
        oViewModel.setProperty('/form/list', _.concat(aTableData, aSelectedData));

        oTable.clearSelection();
        this.onPressFormCancelDialogClose();
      },

      onPressFormCancelDialogClose() {
        this.pFormCalcleDialog.close();
      },

      onChangeWorkStartDate() {
        const oViewModel = this.getViewModel();

        oViewModel.setProperty('/form/dialog/data/Endda', oViewModel.getProperty('/form/dialog/data/Begda'));
        oViewModel.refresh();

        this.callValidWorkTime();
      },

      onChangeTimeFormat(oEvent) {
        const oSource = oEvent.getSource();
        const aSourceValue = _.split(oSource.getValue(), ':');

        if (aSourceValue.length !== 2) return;

        const iStep = this.getViewModel().getProperty('/form/dialog/minutesStep');
        const sConvertedMinutesValue = this.TimeUtils.stepMinutes(_.get(aSourceValue, 1), iStep);

        if (aSourceValue[1] !== sConvertedMinutesValue) {
          const aConvertTimes = [_.get(aSourceValue, 0), sConvertedMinutesValue];

          oSource.setValue(_.join(aConvertTimes, ':'));
          oSource.setDateValue(moment(_.join(aConvertTimes, ''), 'hhmm').toDate());
        }

        this.callValidWorkTime();
      },

      onChangePhoneNumber(oEvent) {
        this.TextUtils.liveChangePhoneNumber(oEvent);
      },

      onSelectSuggest(oEvent) {
        const oViewModel = this.getViewModel();
        const oInput = oEvent.getSource();
        const oSelectedSuggestionRow = oEvent.getParameter('selectedRow');

        oViewModel.setProperty('/form/dialog/calcCompleted', false);

        if (oSelectedSuggestionRow) {
          const oContext = oSelectedSuggestionRow.getBindingContext();
          const mSuggestionData = oContext.getObject();
          // const mDialogFormData = oViewModel.getProperty('/form/dialog/data');

          oInput.setValue(mSuggestionData.Ename);

          oViewModel.setProperty('/form/dialog/data', {
            // ...mDialogFormData,
            ..._.pick(mSuggestionData, ['Pernr', 'Ename', 'Orgeh', 'Orgtx', 'Zzcaltl', 'Zzcaltltx', 'Blqtx']),
            Schkz: mSuggestionData.Schkz2,
            Rtext: mSuggestionData.Rtext2,
            Kostl: mSuggestionData.Kostl2,
            Ltext: mSuggestionData.Ltext2,
            PernrInfoTxt: `(${mSuggestionData.Pernr}, ${mSuggestionData.Zzcaltltx}, ${mSuggestionData.Orgtx})`,
          });

          oViewModel.refresh();
        }

        oInput.getBinding('suggestionRows').filter([]);

        this.callValidWorkTime();
      },

      onSubmitSuggest(oEvent) {
        const oViewModel = this.getViewModel();
        // const mDialogFormData = oViewModel.getProperty('/form/dialog/data');

        oViewModel.setProperty('/form/dialog/calcCompleted', false);

        const sInputValue = oEvent.getParameter('value');
        if (!sInputValue) {
          oViewModel.setProperty('/form/dialog/data', {
            Begda: moment().hours(9).toDate(),
            Endda: moment().hours(9).toDate(),
            Datim: 'X',
          });
          oViewModel.refresh();

          this.callValidWorkTime();

          return;
        }

        const aEmployees = oViewModel.getProperty('/entry/Employees');
        const [mEmployee] = _.filter(aEmployees, (o) => _.startsWith(o.Ename, sInputValue));

        if (!_.isEmpty(mEmployee)) {
          oViewModel.setProperty('/form/dialog/data', {
            // ...mDialogFormData,
            ..._.pick(mEmployee, ['Pernr', 'Ename', 'Orgeh', 'Orgtx', 'Zzcaltl', 'Zzcaltltx', 'Blqtx']),
            Schkz: mEmployee.Schkz2,
            Rtext: mEmployee.Rtext2,
            Kostl: mEmployee.Kostl2,
            Ltext: mEmployee.Ltext2,
            PernrInfoTxt: `(${mEmployee.Pernr}, ${mEmployee.Zzcaltltx}, ${mEmployee.Orgtx})`,
          });
        } else {
          oViewModel.setProperty('/form/dialog/data', {
            Begda: moment().hours(9).toDate(),
            Endda: moment().hours(9).toDate(),
            Datim: 'X',
          });
        }

        oViewModel.refresh();

        this.callValidWorkTime();
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
            Kostl2: mFormData.Kostl,
          });

          oViewModel.setProperty(
            '/entry/Employees',
            _.map(aResults, (o) => _.omit(o, '__metadata'))
          );
        } catch (oError) {
          throw oError;
        }
      },

      async retrieveTimeTypeaList() {
        try {
          const oViewModel = this.getViewModel();
          const oModel = this.getModel(ServiceNames.HRCALENDAR);
          const mFormData = oViewModel.getProperty('/form');
          const aResults = await Client.getEntitySet(oModel, 'TimeTypeList', { Werks: mFormData.Werks });

          oViewModel.setProperty(
            '/entry/TimeTypes',
            _.map(aResults, (o) => _.omit(o, '__metadata'))
          );
        } catch (oError) {
          throw oError;
        }
      },

      async retrieveTimeReasonList(bReadAll = false) {
        try {
          const oViewModel = this.getViewModel();
          const oModel = this.getModel(ServiceNames.HRCALENDAR);
          const mFormData = oViewModel.getProperty('/form');
          const sAuth = oViewModel.getProperty('/auth');
          const aResults = await Client.getEntitySet(oModel, 'TimeReasonList', {
            Austy: sAuth,
            Prcty: bReadAll ? 'P' : 'L',
            Werks: mFormData.Werks,
            Awart: bReadAll ? undefined : mFormData.dialog.data.Awart,
          });

          if (bReadAll) {
            oViewModel.setProperty(
              '/entry/AllTimeReason',
              _.chain(aResults)
                .uniqBy('Tmgrp')
                .map((o) => ({
                  ..._.pick(o, ['Tmgrp', 'Tmgrptx']),
                  items: _.chain(aResults)
                    .filter({ Tmgrp: o.Tmgrp })
                    .map((t) => _.set(t, 'Awrsntx', _.replace(t.Awrsntx, '@', '')))
                    .value(),
                }))
                .value()
            );
          } else {
            oViewModel.setProperty('/form/dialog/data/Awrsn', null);
            oViewModel.setProperty(
              '/entry/TimeReasons',
              _.map(aResults, (o) => _.omit(o, '__metadata'))
            );
          }
        } catch (oError) {
          throw oError;
        }
      },

      async retrieveCancelList() {
        try {
          const oViewModel = this.getViewModel();
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const mFormData = oViewModel.getProperty('/form');

          const aFormList = oViewModel.getProperty('/form/list');
          const aResults = await Client.getEntitySet(oModel, 'LeaveApprList', {
            ..._.pick(mFormData, ['Werks', 'Orgeh', 'Kostl']),
          });

          const aAvailableList = _.differenceWith(
            aResults,
            aFormList,
            (a, b) => _.isEqual(a.Pernr, b.Pernr) && _.isEqual(a.Awart, b.Awart) && moment(a.Begda).isSame(moment(b.Begda), 'day') && moment(a.Endda).isSame(moment(b.Endda), 'day')
          );

          oViewModel.setProperty('/form/dialog/rowCount', Math.min(aAvailableList.length, 10));
          oViewModel.setProperty(
            '/form/dialog/list',
            _.map(aAvailableList, (o) => _.omit(o, '__metadata'))
          );
        } catch (oError) {
          throw oError;
        }
      },

      /*****************************************************************
       * ! Formatter
       *****************************************************************/
      formatDaytm(sValue) {
        return sValue ? `(${sValue})` : '';
      },
    });
  }
);
