sap.ui.define(
  [
    //
    'sap/m/MessageToast',
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
    //
    MessageToast,
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

    return BaseController.extend('sap.ui.tesna.mvc.controller.shiftChange.Detail', {
      DISPLAY_MODE: '',
      LIST_TABLE_ID: 'shiftChangeApprovalTable',
      DIALOG_TABLE_ID: 'registDialogTable',

      ApprovalStatusHandler: null,
      FileAttachmentBoxHandler: null,

      DAY_WORK_TYPES: {},

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

        return `${this.getBundleText('LABEL_04001')} ${sRouteText}`; // 근무계획변경신청
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      getApprovalType() {
        return 'TH';
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
          },
          entry: {
            Wtype: [
              { Zcode: 'T', Ztext: this.getBundleText('LABEL_00126') }, // 통
              { Zcode: 'F', Ztext: this.getBundleText('LABEL_00125') }, // 휴
              { Zcode: 'D', Ztext: this.getBundleText('LABEL_00133') }, // 주
              { Zcode: 'N', Ztext: this.getBundleText('LABEL_00127') }, // 야
            ],
          },
          form: {
            Appno: '',
            Appst: '',
            Aprsn: '',
            Werks: '',
            Orgeh: '',
            Orgtx: '',
            rowCount: 0,
            listMode: 'None',
            list: [],
            weekends: {},
            beginDate: 1,
            visibleColumns: {
              Dayngt1: true,
              Dayngt2: true,
              Dayngt3: true,
              Dayngt4: true,
              Dayngt5: true,
              Dayngt6: true,
              Dayngt7: true,
              Dayngt8: true,
              Dayngt9: true,
              Dayngt10: true,
              Dayngt11: true,
              Dayngt12: true,
              Dayngt13: true,
              Dayngt14: true,
              Dayngt15: true,
              Dayngt16: true,
              Dayngt17: true,
              Dayngt18: true,
              Dayngt19: true,
              Dayngt20: true,
              Dayngt21: true,
              Dayngt22: true,
              Dayngt23: true,
              Dayngt24: true,
              Dayngt25: true,
              Dayngt26: true,
              Dayngt27: true,
              Dayngt28: true,
              Dayngt29: true,
              Dayngt30: true,
              Dayngt31: true,
            },
          },
          dialog: {
            rowCount: 0,
            list: [],
          },
        };
      },

      async onObjectMatched(oParameter, sRouteName) {
        const oViewModel = this.getViewModel();

        oViewModel.setSizeLimit(10000);
        oViewModel.setData(this.initializeModel());

        this.DAY_WORK_TYPES = {
          D: this.getBundleText('LABEL_00133'),
          N: this.getBundleText('LABEL_00127'),
          T: this.getBundleText('LABEL_00126'),
          F: this.getBundleText('LABEL_00125'),
        };

        // 신청,조회 - B, Work to do - WE, Not Work to do - WD
        this.DISPLAY_MODE = oParameter.flag || 'B';
        oViewModel.setProperty('/displayMode', this.DISPLAY_MODE);
        oViewModel.setProperty('/auth', this.isMss() ? 'M' : this.isHass() ? 'H' : 'E');
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
            oViewModel.setProperty('/form/listMode', 'MultiToggle');
            oViewModel.setProperty('/form/Tyymm', moment().format('YYYYMM'));

            await this.setTmPeriod();
          }

          this.setWeekends();
          this.toggleColumns();
          this.toggleTableWeekendClass(this.LIST_TABLE_ID);
          this.setOrgtx();
          this.settingsAttachTable();
          this.settingsApprovalStatus();
        } catch (oError) {
          this.debug('Controller > shiftChange-detail > loadPage Error', oError);

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

          const [[mHeader], aResults] = await Promise.all([
            Client.getEntitySet(oModel, 'DailyShiftChangeApply', {
              Austy: oViewModel.getProperty('/auth'),
              ..._.pick(mFormData, ['Appno', 'Werks', 'Orgeh']),
            }),
            Client.getEntitySet(oModel, 'DailyShiftChangeDetail', {
              Prcty: '1',
              Tyymm: mFormData.Tyymm,
              ..._.pick(mFormData, ['Appno', 'Werks', 'Orgeh']),
            }),
          ]);

          const mHeaderInfo = { ...mFormData, ..._.omit(mHeader, ['Orgeh', 'Orgtx']) };

          oViewModel.setProperty('/form', {
            ...mHeaderInfo,
            rowCount: Math.min(aResults.length, 10),
            listMode: !mHeaderInfo.Appst || mHeaderInfo.Appst === '10' ? 'MultiToggle' : 'None',
            list: _.map(aResults, (o) => _.omit(o, '__metadata')),
            TmDateTxt: `${this.DateUtils.format(mHeaderInfo.Tmdat)} ( ${this.getBundleText('LABEL_04002')}: ${this.DateUtils.format(mHeaderInfo.Clsda)} ${this.TimeUtils.format(mHeaderInfo.Clstm)} )`,
          });
        } catch (oError) {
          throw oError;
        }
      },

      async setTmPeriod() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/form/Tmdat', null);
          oViewModel.setProperty('/form/Clsda', null);
          oViewModel.setProperty('/form/Clstm', null);
          oViewModel.setProperty('/form/Begda', null);
          oViewModel.setProperty('/form/Endda', null);
          oViewModel.setProperty('/form/TmDateTxt', null);

          const mFormData = oViewModel.getProperty('/form');
          const [mReturn] = await Client.getEntitySet(this.getModel(ServiceNames.WORKTIME), 'DailyShiftChangePeriod', {
            Werks: mFormData.Werks,
            Orgeh: mFormData.Orgeh,
            Tyymm: mFormData.Tyymm,
            Austy: this.isHass() ? 'H' : this.isMss() ? 'M' : 'E',
          });

          if (!_.isEmpty(mReturn)) {
            oViewModel.setProperty('/form/Tmdat', mReturn.Tmdat);
            oViewModel.setProperty('/form/Clsda', mReturn.Clsda);
            oViewModel.setProperty('/form/Clstm', mReturn.Clstm);
            oViewModel.setProperty('/form/Begda', mReturn.Begda);
            oViewModel.setProperty('/form/Endda', mReturn.Endda);
            oViewModel.setProperty(
              '/form/TmDateTxt',
              `${this.DateUtils.format(mReturn.Tmdat)} ( ${this.getBundleText('LABEL_04002')}: ${this.DateUtils.format(mReturn.Clsda)} ${this.TimeUtils.format(mReturn.Clstm)} )`
            );
          }
        } catch (oError) {
          throw oError;
        }
      },

      toggleTableWeekendClass(sTableId) {
        const oTable = this.byId(sTableId);
        const aCustomClasses = _.filter(oTable.aCustomStyleClasses, (s) => _.startsWith(s, 'weekend-'));

        _.forEach(aCustomClasses, (s) => oTable.removeStyleClass(s));

        const oViewModel = this.getViewModel();
        const sTyymm = oViewModel.getProperty('/form/Tyymm');
        const iBeginDate = oViewModel.getProperty('/form/beginDate');
        const iBeginDay = moment(`${sTyymm}01`, 'YYYYMMDD').date(iBeginDate).day();

        oTable.addStyleClass(`weekend-${iBeginDay}`);
      },

      toggleColumns() {
        const oViewModel = this.getViewModel();
        const mVisibleColumns = oViewModel.getProperty('/form/visibleColumns');
        const dTmdat = oViewModel.getProperty('/form/Tmdat');
        const dSelectedMonth = moment(oViewModel.getProperty('/form/Tyymm'));

        oViewModel.setProperty('/form/beginDate', 1);

        if (dTmdat) {
          _.forOwn(mVisibleColumns, (v, p) => _.set(mVisibleColumns, p, true));

          const dMomentTmdat = moment(dTmdat);
          const iDaysInMonth = dSelectedMonth.daysInMonth();

          if (dSelectedMonth.isSame(dMomentTmdat, 'month')) {
            oViewModel.setProperty('/form/beginDate', dMomentTmdat.date());
            _.times(dMomentTmdat.date(), (d) => _.set(mVisibleColumns, `Dayngt${d}`, false));
          }

          _.times(31 - iDaysInMonth, (d) => _.set(mVisibleColumns, `Dayngt${31 - d}`, false));
        } else {
          _.forOwn(mVisibleColumns, (v, p) => _.set(mVisibleColumns, p, false));
        }

        oViewModel.refresh(true);
      },

      setWeekends() {
        const oViewModel = this.getViewModel();
        const sTyymm = oViewModel.getProperty('/form/Tyymm');
        const dFirstDate = moment(`${sTyymm}01`);

        oViewModel.setProperty(
          '/form/weekends',
          _.chain(dFirstDate.daysInMonth())
            .times((d) => ({
              [`Day${++d}`]: moment(`${sTyymm}01`).date(d).isoWeekday() > 5 ? 'X' : 'W',
            }))
            .reduce((acc, cur) => ({ ...acc, ...cur }), {})
            .value()
        );
      },

      async setOrgtx() {
        const oViewModel = this.getViewModel();

        try {
          const mFormData = oViewModel.getProperty('/form');
          const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.NIGHTWORK), 'TimeOrgehList', {
            Werks: mFormData.Werks,
            Austy: this.isHass() ? 'H' : this.isMss() ? 'M' : 'E',
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
          Mode: mFormData.Appno && mFormData.Appst !== '10' ? 'D' : 'N',
          EndPoint: this.DISPLAY_MODE,
          Austy: sAuth,
          Appty: this.getApprovalType(),
          ..._.pick(mFormData, ['Appno', 'Orgeh']),
        });
      },

      async createProcess(sPrcty) {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const oDialogTable = this.byId(this.DIALOG_TABLE_ID);
          const aTableList = _.cloneDeep(oViewModel.getProperty('/form/list'));
          const aSelectedData =
            sPrcty === 'A'
              ? aTableList
              : [
                  ...aTableList, //
                  ...this.TableUtils.getSelectionData(oDialogTable),
                ];
          const mFormData = _.cloneDeep(oViewModel.getProperty('/form'));

          const { Appno } = await Client.create(oModel, 'DailyShiftChangeApply', {
            Prcty: sPrcty,
            Austy: oViewModel.getProperty('/auth'),
            Pernr: this.getAppointeeProperty('Pernr'),
            ..._.pick(mFormData, ['Appno', 'Werks', 'Orgeh', 'Aprsn', 'Tyymm', 'Clstm']),
            Tmdat: this.DateUtils.parse(mFormData.Tmdat),
            Clsda: this.DateUtils.parse(mFormData.Clsda),
            Begda: this.DateUtils.parse(mFormData.Begda),
            Endda: this.DateUtils.parse(mFormData.Endda),
            DailyShiftChangeNav: aSelectedData,
          });

          oViewModel.setProperty('/form/Appno', Appno);

          // 파일 삭제 및 업로드
          const oFileError = await this.FileAttachmentBoxHandler.upload(Appno);
          if (oFileError && oFileError.code === 'E') throw oFileError;

          // 결재선 저장
          await this.ApprovalStatusHandler.save(Appno);

          if (sPrcty === 'A') {
            // {신청}되었습니다.
            MessageBox.success(this.getBundleText('MSG_00007', this.getBundleText('LABEL_00121')), {
              onClose: () => this.getRouter().navTo(oViewModel.getProperty('/previousName')),
            });
          }
        } catch (oError) {
          throw oError;
        }
      },

      async deleteProcess() {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const sAppno = _.cloneDeep(oViewModel.getProperty('/form/Appno'));

          await Client.remove(oModel, 'DailyShiftChangeApply', {
            Appno: sAppno,
          });

          // {취소}되었습니다.
          MessageBox.success(this.getBundleText('MSG_00007', this.getBundleText('LABEL_00118')), {
            onClose: () => this.getRouter().navTo(oViewModel.getProperty('/previousName')),
          });
        } catch (oError) {
          this.debug('Controller > shiftChange Detail > deleteProcess Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false);
        }
      },

      async deleteDetailProcess(bDeleteAll = false) {
        const oViewModel = this.getViewModel();

        try {
          const oTable = this.byId(this.LIST_TABLE_ID);
          const aSelectedIndices = oTable.getSelectedIndices();
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const aTableData = oViewModel.getProperty('/form/list');

          await Promise.all(
            _.chain(aTableData)
              .cloneDeep()
              .filter((o, i) => bDeleteAll || _.includes(aSelectedIndices, i))
              .map((o) => Client.remove(oModel, 'DailyShiftChangeDetail', _.pick(o, ['Appno', 'Pernr'])))
              .value()
          );

          // {삭제}되었습니다.
          MessageBox.success(this.getBundleText('MSG_00007', this.getBundleText('LABEL_00110')), {
            onClose: () => {
              oTable.clearSelection();
              this.retriveDocument();
            },
          });
        } catch (oError) {
          throw oError;
        }
      },

      onPressDialogExcelDownload() {
        const oTable = this.byId(this.DIALOG_TABLE_ID);
        const aSelectedIndices = oTable.getSelectedIndices();

        if (!aSelectedIndices.length) {
          MessageBox.alert(this.getBundleText('MSG_00020', 'Download')); // {Dowonload}할 행을 선택하세요.
          return;
        }

        const sFileName = this.getBundleText('LABEL_00185', 'LABEL_04001'); // {근무계획변경신청}_목록
        const aTableData = _.chain(this.getViewModel().getProperty('/dialog/list'))
          .cloneDeep()
          .filter((o, i) => _.includes(aSelectedIndices, i))
          .map((o) => {
            _.chain(o)
              .pickBy((v, p) => _.startsWith(p, 'Dayngt'))
              .forOwn((v, p) => _.set(o, p, this.DAY_WORK_TYPES[v] || ''))
              .commit();

            return o;
          })
          .value();

        this.TableUtils.export({ oTable, sFileName, aTableData });
      },

      onPressDialogExcelUpload(oEvent) {
        this.setContentsBusy(true, 'dialog');

        try {
          if (oEvent.getParameter('files') && oEvent.getParameter('files')[0]) {
            const oFileReader = new FileReader();

            oFileReader.onload = (e) => {
              const workbook = XLSX.read(e.target.result, { type: 'binary' });

              workbook.SheetNames.forEach((sheet) => {
                const aRowObject = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheet]);

                AppUtils.debug(aRowObject);
                if (!_.isEmpty(aRowObject)) this.assignDialogTableWithExcel(aRowObject);
              });
            };

            oFileReader.readAsBinaryString(oEvent.getParameter('files')[0]);
          }
        } catch (oError) {
          this.debug('Controller > shiftChange Detail > onPressDialogExcelUpload Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'dialog');
        }
      },

      assignDialogTableWithExcel(aRowObject) {
        const oViewModel = this.getViewModel();

        try {
          const oTable = this.byId(this.DIALOG_TABLE_ID);
          const aTableData = oViewModel.getProperty('/dialog/list');
          const sPernrLabel = this.getBundleText('LABEL_00209'); // 사번
          const aModifiedIndexes = _.map(aRowObject, (o) => _.findIndex(aTableData, { Pernr: o[sPernrLabel] }));

          _.forEach(aModifiedIndexes, (d, i) => {
            const mOriginalRowData = _.get(aTableData, d);

            oViewModel.setProperty(`/dialog/list/${d}`, {
              ...mOriginalRowData,
              ..._.chain(aRowObject)
                .get(i)
                .pickBy((v, p) => _.isNumber(_.toNumber(p)))
                .mapKeys((v, p) => `Dayngt${_.padStart(p, 2, '0')}`)
                .mapValues((v, p) => _.findKey(this.DAY_WORK_TYPES, (s) => _.isEqual(s, v)) || mOriginalRowData[p])
                .value(),
            });
            oTable.addSelectionInterval(d, d);
          });

          MessageToast.show('Complete!', {
            my: 'center center',
            at: 'center center',
          });
        } catch (oError) {
          throw oError;
        }
      },

      async onPressSaveDialog() {
        const oTable = this.byId(this.DIALOG_TABLE_ID);
        const aSelectedIndices = oTable.getSelectedIndices();

        if (aSelectedIndices.length < 1) {
          MessageBox.alert(this.getBundleText('MSG_00020', 'LABEL_00103')); // {저장}할 행을 선택하세요.
          return;
        }

        try {
          this.setContentsBusy(true);

          await this.createProcess('S');

          this.retriveDocument();
          this.pRegistDialog.close();
        } catch (oError) {
          this.debug('Controller > shiftChange Detail > onPressSaveDialog Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false);
        }
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

              await this.createProcess('A');
            } catch (oError) {
              this.debug('Controller > shiftChange Detail > onPressApproval Error', oError);

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
              this.debug('Controller > shiftChange Detail > onPressApprove Error', oError);

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
              this.debug('Controller > shiftChange Detail > onPressReject Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false, 'all');
            }
          },
        });
      },

      async onPressAddBtn() {
        const oView = this.getView();

        this.setContentsBusy(true, ['table', 'dialog']);

        if (!this.pRegistDialog) {
          this.pRegistDialog = await Fragment.load({
            id: oView.getId(),
            name: 'sap.ui.tesna.mvc.view.shiftChange.fragment.RegistDialog',
            controller: this,
          });

          this.pRegistDialog
            .attachBeforeOpen(async () => {
              const oViewModel = this.getViewModel();
              const mFormData = oViewModel.getProperty('/form');
              const oModel = this.getModel(ServiceNames.WORKTIME);
              const aResults = await Client.getEntitySet(oModel, 'DailyShiftChangeDetail', {
                Prcty: '2',
                ..._.pick(mFormData, ['Appno', 'Werks', 'Orgeh', 'Tyymm']),
              });

              oViewModel.setProperty('/dialog/rowCount', Math.min(aResults.length, 12));
              oViewModel.setProperty(
                '/dialog/list',
                _.map(aResults, (o) => _.omit(o, '__metadata'))
              );

              this.setContentsBusy(false, ['table', 'dialog']);
            })
            .attachAfterOpen(() => {
              this.toggleTableWeekendClass(this.DIALOG_TABLE_ID);
            })
            .attachBeforeClose(() => this.TableUtils.clearTable(this.byId(this.DIALOG_TABLE_ID)));

          oView.addDependent(this.pRegistDialog);
        }

        this.pRegistDialog.open();
      },

      onPressDelBtn() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const aSelectedIndices = oTable.getSelectedIndices();

        if (aSelectedIndices.length < 1) {
          MessageBox.alert(this.getBundleText('MSG_00020', 'LABEL_00110')); // {삭제}할 행을 선택하세요.
          return;
        }

        // 선택된 행을 삭제하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00021'), {
          onClose: async function (sAction) {
            if (MessageBox.Action.CANCEL === sAction) return;

            this.setContentsBusy(true);

            try {
              await this.deleteDetailProcess();
            } catch (oError) {
              this.debug('Controller > shiftChange-detail > onPressDelBtn Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false);
            }
          }.bind(this),
        });
      },

      async onChangeTyymm() {
        const oViewModel = this.getViewModel();
        const aTableData = oViewModel.getProperty('/form/list');

        this.setContentsBusy(true, 'table');

        if (_.isEmpty(aTableData)) {
          try {
            await this.setTmPeriod();

            this.setWeekends();
            this.toggleColumns();
            this.toggleTableWeekendClass(this.LIST_TABLE_ID);
          } catch (oError) {
            this.debug('Controller > shiftChange-detail > onChangeTyymm Error', oError);

            AppUtils.handleError(oError);
          } finally {
            this.setContentsBusy(false, 'table');
          }
        } else {
          // 신청내역이 삭제됩니다.\n진행하시겠습니까?
          MessageBox.confirm(this.getBundleText('MSG_04001'), {
            onClose: async function (sAction) {
              if (MessageBox.Action.CANCEL === sAction) {
                this.setContentsBusy(false, 'table');
                return;
              }

              try {
                await this.deleteDetailProcess(true);
                await this.setTmPeriod();

                this.setWeekends();
                this.toggleColumns();
                this.toggleTableWeekendClass(this.LIST_TABLE_ID);
              } catch (oError) {
                this.debug('Controller > shiftChange-detail > onChangeTyymm Error', oError);

                AppUtils.handleError(oError);
              } finally {
                this.setContentsBusy(false, 'table');
              }
            }.bind(this),
          });
        }
      },

      onChangeDayngt(oEvent) {
        const oSource = oEvent.getSource();
        const oTable = oSource.getParent().getParent();
        const iRowIndex = oSource.getParent().getIndex();

        oTable.addSelectionInterval(iRowIndex, iRowIndex);
      },

      onHistoryBack() {
        this.setContentsBusy(true);
        history.back();
      },

      formatDayngt(sDayngt) {
        return this.DAY_WORK_TYPES[sDayngt];
      },
    });
  }
);
