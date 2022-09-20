sap.ui.define(
  [
    //
    'sap/ui/tesna/control/MessageBox',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/ApprovalStatusHandler',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  (
    //
    MessageBox,
    AppUtils,
    ApprovalStatusHandler,
    Client,
    ServiceNames,
    BaseController
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.commuteCheck.Main', {
      ROUTE_NAME: '',
      LIST_TABLE_ID: 'commuteCheckListTable',

      ApprovalStatusHandler: null,

      getCurrentLocationText() {
        return this.getBundleText('LABEL_06019'); // 이상근태확인신청결재
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      getApprovalType() {
        return 'TJ';
      },

      initializeModel() {
        return {
          initBeguz: moment('0900', 'hhmm').toDate(),
          initEnduz: moment('1800', 'hhmm').toDate(),
          busy: false,
          auth: '',
          isPossibleApproval: true,
          contentsBusy: {
            button: false,
            search: false,
            table: false,
          },
          entry: {
            Persa: [],
            Orgeh: [],
            Kostl: [],
            Corty: [],
          },
          searchConditions: {
            Werks: '',
            Orgeh: '',
            Apbeg: moment().subtract(1, 'month').set('date', 16).hours(9).toDate(),
            Apend: moment().hours(9).toDate(),
            Pernr: '',
            Ename: '',
            Errdata: '',
          },
          listInfo: {
            totalCount: 0,
            rowCount: 0,
            ObjTxt1: this.getBundleText('LABEL_00388'), // 미처리
            infoMessage: this.getBundleText('MSG_06001'), // 근태, 특근, 근무일정, 근무계획 신청 승인 시 자동으로 완료 처리됩니다.
          },
          list: [],
        };
      },

      async onObjectMatched(oParameter, sRouteName) {
        const oViewModel = this.getViewModel();

        this.ROUTE_NAME = sRouteName;

        try {
          oViewModel.setSizeLimit(500);
          this.setContentsBusy(true);

          oViewModel.setProperty('/auth', this.isHass() ? 'H' : this.isMss() ? 'M' : 'E');

          this.ApprovalStatusHandler = new ApprovalStatusHandler(this);

          await this.setPersaEntry();
          await this.setOrgehEntry();
          await this.setKostlEntry();
          await this.setCortyEntry();

          setTimeout(async () => await this.retrieveList(), 0);
        } catch (oError) {
          this.debug('Controller > commuteCheck > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
          this.setContentsBusy(false);
        }
      },

      setDetailsTableStyle() {
        setTimeout(() => {
          const oDetailsTable = this.byId(this.LIST_TABLE_ID);
          const sTableId = oDetailsTable.getId();

          oDetailsTable.getRows().forEach((row, i) => {
            const mRowData = row.getBindingContext().getObject();

            if (mRowData.Apposyn === 'X') {
              $(`#${sTableId}-rowsel${i}`).removeClass('disabled-table-selection');
            } else {
              $(`#${sTableId}-rowsel${i}`).addClass('disabled-table-selection');
            }
          });
        }, 100);
      },

      async setPersaEntry() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/entry/Persa', []);
          oViewModel.setProperty('/entry/Orgeh', []);

          const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.COMMON), 'PersAreaList', {
            Actty: '1',
            Wave: '1',
          });

          oViewModel.setProperty(
            '/entry/Persa',
            _.chain(aEntries)
              .map((o) => _.omit(o, '__metadata'))
              .value()
          );
          oViewModel.setProperty('/searchConditions/Werks', _.get(aEntries, [0, 'Persa']));
        } catch (oError) {
          throw oError;
        }
      },

      async setOrgehEntry() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/entry/Orgeh', []);
          oViewModel.setProperty('/searchConditions/Orgeh', '');

          const sWerks = oViewModel.getProperty('/searchConditions/Werks');

          if (_.isEmpty(sWerks)) return;

          const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.NIGHTWORK), 'TimeOrgehList', {
            Werks: sWerks,
            Austy: oViewModel.getProperty('/auth'),
          });

          oViewModel.setProperty(
            '/entry/Orgeh',
            _.map(aEntries, (o) => _.omit(o, '__metadata'))
          );
          oViewModel.setProperty('/searchConditions/Orgeh', _.get(aEntries, [0, 'Orgeh']));
        } catch (oError) {
          throw oError;
        }
      },

      async setKostlEntry() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/entry/Kostl', []);
          oViewModel.setProperty('/searchConditions/Kostl', '');

          const sWerks = oViewModel.getProperty('/searchConditions/Werks');
          const sOrgeh = oViewModel.getProperty('/searchConditions/Orgeh');

          if (_.isEmpty(sWerks) || _.isEmpty(sOrgeh) || sOrgeh === '00000000') return;

          const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.WORKTIME), 'TimeKostlList', {
            Werks: sWerks,
            Orgeh: sOrgeh,
            Austy: oViewModel.getProperty('/auth'),
          });

          if (_.chain(aEntries).get([0, 'Kostl']).isEmpty().value()) {
            _.set(aEntries, [0, 'Kostl'], '00000000');
          }

          const sAuth = oViewModel.getProperty('/auth');

          oViewModel.setProperty('/searchConditions/Kostl', _.get(aEntries, [sAuth === 'E' ? 1 : 0, 'Kostl']));
          oViewModel.setProperty(
            '/entry/Kostl',
            _.map(aEntries, (o) => _.chain(o).omit('__metadata').omitBy(_.isNil).omitBy(_.isEmpty).value())
          );
        } catch (oError) {
          throw oError;
        }
      },

      async setCortyEntry() {
        const oViewModel = this.getViewModel();

        try {
          const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.WORKTIME), 'CortyCodeList');

          oViewModel.setProperty(
            '/entry/Corty',
            _.map(aEntries, (o) => _.chain(o).omit('__metadata').omitBy(_.isNil).omitBy(_.isEmpty).value())
          );
        } catch (oError) {
          throw oError;
        }
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

      async onChangeWerks() {
        try {
          this.setContentsBusy(true, 'search');

          await this.setOrgehEntry();
          await this.setKostlEntry();
        } catch (oError) {
          this.debug('Controller > commuteCheck > onChangePersa Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'search');
        }
      },

      async onChangeOrgeh() {
        try {
          this.setContentsBusy(true, 'search');

          await this.setKostlEntry();
        } catch (oError) {
          this.debug('Controller > commuteCheck > onChangeOrgeh Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'search');
        }
      },

      onChangeTimeFormat(oEvent) {
        const oSource = oEvent.getSource();
        const aSourceValue = _.split(oSource.getValue(), ':');

        if (aSourceValue.length !== 2) return;

        const sConvertedMinutesValue = this.TimeUtils.stepMinutes(_.get(aSourceValue, 1), 10);

        if (aSourceValue[1] === sConvertedMinutesValue) return;

        const aConvertTimes = [_.get(aSourceValue, 0), sConvertedMinutesValue];

        oSource.setValue(_.join(aConvertTimes, ':'));
        oSource.setDateValue(moment(_.join(aConvertTimes, ''), 'hhmm').toDate());
      },

      onScrollTable() {
        this.setDetailsTableStyle();
      },

      onSelectionTable(oEvent) {
        const oViewModel = this.getViewModel();
        const oTable = oEvent.getSource();
        const aTableData = oViewModel.getProperty('/list');

        if (oEvent.getParameter('selectAll') === true) {
          _.forEach(aTableData, (o, i) => {
            if (o.Apposyn !== 'X') oTable.removeSelectionInterval(i, i);
          });
        }
      },

      onPressSearch() {
        this.setContentsBusy(true, ['search', 'table']);

        setTimeout(async () => await this.retrieveList(), 0);
      },

      onPressApprove() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const aSelectedIndices = oTable.getSelectedIndices();

        if (!aSelectedIndices.length) {
          MessageBox.alert(this.getBundleText('MSG_00010', 'LABEL_00121')); // {신청}할 데이터를 선택하세요.
          return;
        }

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
              const aSelectedTableData = _.chain(this.getViewModel().getProperty('/list'))
                .filter((o, i) => _.includes(aSelectedIndices, i))
                .cloneDeep()
                .value();

              const { Appno } = await Client.deep(this.getModel(ServiceNames.WORKTIME), 'TimeReaderCheck', {
                ..._.get(aSelectedTableData, 0),
                TimeReaderNav: aSelectedTableData,
              });

              // 결재선 저장
              await this.ApprovalStatusHandler.saveWithNoDisplay(Appno);

              // {신청}되었습니다.
              MessageBox.success(this.getBundleText('MSG_00007', 'LABEL_00121'), {
                onClose: () => {
                  this.setContentsBusy(false);
                  this.onPressSearch();
                },
              });
            } catch (oError) {
              this.debug('Controller > commuteCheck > onPressApprove Error', oError);

              this.setContentsBusy(false);
              AppUtils.handleError(oError);
            }
          },
        });
      },

      onPressCancel() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const aSelectedIndices = oTable.getSelectedIndices();

        if (!aSelectedIndices.length) {
          MessageBox.alert(this.getBundleText('MSG_00010', 'LABEL_00118')); // {취소}할 데이터를 선택하세요.
          return;
        }

        const aSelectedTableData = _.chain(this.getViewModel().getProperty('/list'))
          .filter((o, i) => _.includes(aSelectedIndices, i))
          .cloneDeep()
          .uniqBy('Appno')
          .value();

        if (_.filter(aSelectedTableData, (o) => o.Appst !== '20').length > 0) {
          MessageBox.alert(this.getBundleText('MSG_00064')); // 신청 상태의 데이터만 취소가 가능합니다.
          return;
        }

        this.setContentsBusy(true);

        // {취소}하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00006', 'LABEL_00118'), {
          actions: [this.getBundleText('LABEL_00114'), MessageBox.Action.CANCEL],
          onClose: async (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false);
              return;
            }

            try {
              const oModel = this.getModel(ServiceNames.WORKTIME);
              for (const mPayload of aSelectedTableData) {
                await Client.remove(oModel, 'TimeReaderCheck', _.pick(mPayload, 'Appno'));
              }

              // {취소}되었습니다.
              MessageBox.success(this.getBundleText('MSG_00007', 'LABEL_00118'), {
                onClose: () => {
                  this.setContentsBusy(false);
                  this.onPressSearch();
                },
              });
            } catch (oError) {
              this.debug('Controller > commuteCheck > onPressCancel Error', oError);

              this.setContentsBusy(false);
              AppUtils.handleError(oError);
            }
          },
        });
      },

      onPressRowApprovalDetail(oEvent) {
        const mRowData = oEvent.getSource().getParent().getBindingContext().getObject();
        const mApptyRoute = {
          TH: 'shiftChange',
          TI: 'attendance',
          TJ: 'commuteCheck',
          TG: 'shift',
        };

        if (!mRowData || !_.has(mApptyRoute, mRowData.Appty)) return;

        const sHost = window.location.href.split('#')[0];
        const sAuth = this.getViewModel().getProperty('/auth');
        const sRouteName = _.chain(sAuth === 'E' ? null : _.lowerCase(sAuth))
          .concat(mApptyRoute[mRowData.Appty])
          .compact()
          .join('/')
          .value();
        const mParams = [mRowData.Appno];

        if (mRowData.Appty === 'TI') {
          mParams.push(mRowData.Werks);
          mParams.push(mRowData.Orgeh);
          mParams.push(mRowData.Kostl ? mRowData.Kostl : 'NA');
        } else if (mRowData.Appty === 'TH' || mRowData.Appty === 'TG') {
          mParams.push(mRowData.Werks);
          mParams.push(mRowData.Orgeh);
        }

        window.open(`${sHost}#/${sRouteName}/${mParams.join('/')}`, '_blank');
      },

      onPressExcelDownload() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const sFileName = this.getBundleText('LABEL_00282', 'LABEL_06019'); // {이상근태확인신청결재}_목록

        this.TableUtils.export({ oTable, sFileName });
      },

      async retrieveList() {
        const oViewModel = this.getViewModel();

        try {
          const oTable = this.byId(this.LIST_TABLE_ID);
          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const sAuth = oViewModel.getProperty('/auth');

          if (!mSearchConditions.Werks || !mSearchConditions.Orgeh) return;

          const sAppstateNullText = this.getBundleText('LABEL_00388');
          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'TimeReaderCheck', {
            Austy: sAuth,
            Werks: mSearchConditions.Werks,
            Orgeh: mSearchConditions.Orgeh,
            Kostl: mSearchConditions.Kostl === '00000000' ? null : mSearchConditions.Kostl,
            Apbeg: this.DateUtils.parse(mSearchConditions.Apbeg),
            Apend: this.DateUtils.parse(mSearchConditions.Apend),
          });

          oViewModel.setProperty('/listInfo', {
            ...oViewModel.getProperty('/listInfo'),
            ...this.TableUtils.count({ oTable, aRowData }),
          });
          oViewModel.setProperty(
            '/list',
            _.map(aRowData, (o) => ({ ..._.omit(o, '__metadata'), Appsttx: o.Appst === '' ? sAppstateNullText : o.Appsttx }))
          );

          oTable.clearSelection();
          this.setDetailsTableStyle();
        } catch (oError) {
          this.debug('Controller > commuteCheck > retrieveList Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false);
        }
      },
    });
  }
);