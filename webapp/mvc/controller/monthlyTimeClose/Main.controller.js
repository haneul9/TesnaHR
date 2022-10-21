sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/tesna/control/MessageBox',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  function (
    //
    MessageBox,
    AppUtils,
    Client,
    ServiceNames,
    BaseController
  ) {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.monthlyTimeClose.Main', {
      LIST_TABLE1_ID: 'monthlyTimeCloseTable1',
      LIST_TABLE2_ID: 'monthlyTimeCloseTable2',
      LIST_TABLE3_ID: 'monthlyTimeCloseTable3',
      LIST_TABLE4_ID: 'monthlyTimeCloseTable4',

      getCurrentLocationText() {
        return this.getBundleText('LABEL_09001'); // 월근태마감
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      initializeModel() {
        return {
          auth: '',
          contentsBusy: {
            button: false,
            search: false,
            table1: false,
            table2: false,
            table3: false,
            table4: false,
          },
          entry: {
            Persa: [],
          },
          searchConditions: {
            Werks: '',
            Tyymm: '',
          },
          table1: {
            infoMessage: null,
            totalCount: 0,
            rowCount: 0,
            list: [],
          },
          table2: {
            totalCount: 0,
            rowCount: 0,
            list: [],
          },
          table3: {
            totalCount: 0,
            rowCount: 0,
            list: [],
          },
          table4: {
            totalCount: 0,
            rowCount: 0,
            list: [],
          },
        };
      },

      /**
       * @override
       */
      onBeforeShow() {
        BaseController.prototype.onBeforeShow.apply(this, arguments);

        this.TableUtils.adjustRowSpan({
          oTable: this.byId(this.LIST_TABLE1_ID),
          aColIndices: [0, 1, 2, 10],
          sTheadOrTbody: 'thead',
        });
      },

      async onObjectMatched(oParameter, sRouteName) {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setSizeLimit(500);
          this.setContentsBusy(true);

          oViewModel.setProperty('/auth', this.isHass() ? 'H' : this.isMss() ? 'M' : 'E');
          oViewModel.setProperty('/searchConditions/Tyymm', moment().date() < 16 ? moment().subtract(1, 'month').format('YYYYMM') : moment().format('YYYYMM'));

          await this.setPersaEntry();

          await Promise.all([
            this.retrieveMonthlyCloseOverview(), //
            this.retrieveTimeReaderCheck(),
            this.retrieveMonthlyCloseList('1'),
            this.retrieveMonthlyCloseList('2'),
          ]);
        } catch (oError) {
          this.debug('Controller > monthlyTimeClose > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, ['search', 'button']);
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

      async setPersaEntry() {
        const oViewModel = this.getViewModel();

        try {
          if (this.isHass() || this.isMss()) {
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
          } else {
            const mAppointeeData = this.getAppointeeData();

            oViewModel.setProperty('/entry/Persa', [_.pick(mAppointeeData, ['Persa', 'Pbtxt'])]);
            oViewModel.setProperty('/searchConditions/Werks', mAppointeeData.Persa);
          }
        } catch (oError) {
          throw oError;
        }
      },

      setTableColorStyle() {
        const oTable = this.byId(this.LIST_TABLE1_ID);

        setTimeout(() => {
          this.TableUtils.setColorColumn({
            oTable,
            mColorMap: {
              3: 'bgType13',
              4: 'bgType11',
              5: 'bgType11',
              6: 'bgType11',
              7: 'bgType11',
              8: 'bgType11',
              9: 'bgType11',
            },
          });
        }, 100);
      },

      async retrieveMonthlyCloseOverview() {
        const oViewModel = this.getViewModel();

        try {
          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const sAuth = oViewModel.getProperty('/auth');
          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'MonthlyCloseOverview', {
            Austy: sAuth,
            ..._.pick(mSearchConditions, ['Werks', 'Tyymm']),
          });

          oViewModel.setProperty('/table1', {
            totalCount: aRowData.length || 0,
            rowCount: Math.min(aRowData.length, 5),
            list: _.map(aRowData, (o) => _.omit(o, '__metadata')),
            infoMessage: _.chain(aRowData)
              .filter((o) => !_.isEmpty(o.Clsdt2))
              .size()
              .eq(0)
              .value()
              ? this.getBundleText('LABEL_09014')
              : _.chain(aRowData)
                  .filter((o) => !_.isEmpty(o.Clsdt2))
                  .get([0, 'Clsdt2'])
                  .value(), // LABEL_09014: 미마감
          });
        } catch (oError) {
          throw oError;
        } finally {
          this.setTableColorStyle();
          this.setContentsBusy(false, 'table1');
        }
      },

      async retrieveTimeReaderCheck() {
        const oViewModel = this.getViewModel();

        try {
          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const dSearchDate = moment(`${mSearchConditions.Tyymm}01`);
          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'TimeReaderCheck', {
            Prcty: 'C',
            Austy: oViewModel.getProperty('/auth'),
            Werks: mSearchConditions.Werks,
            Apbeg: dSearchDate.startOf('month').hours(9).toDate(),
            Apend: dSearchDate.endOf('month').hours(9).toDate(),
          });

          oViewModel.setProperty('/table2', {
            totalCount: aRowData.length || 0,
            rowCount: Math.min(aRowData.length, 5),
            list: _.map(aRowData, (o, i) => ({
              ..._.omit(o, '__metadata'),
              Idx: i + 1,
              Beguzf: this.TimeUtils.nvl(o.Beguzf),
              Enduzf: this.TimeUtils.nvl(o.Enduzf),
            })),
          });
        } catch (oError) {
          throw oError;
        } finally {
          this.setContentsBusy(false, 'table2');
        }
      },

      async retrieveMonthlyCloseList(sPrcty) {
        const oViewModel = this.getViewModel();
        const sTablePath = sPrcty === '1' ? 'table3' : 'table4';

        try {
          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'MonthlyCloseList', {
            Austy: oViewModel.getProperty('/auth'),
            Prcty: sPrcty,
            Werks: mSearchConditions.Werks,
            Tyymm: mSearchConditions.Tyymm,
          });

          oViewModel.setProperty(`/${sTablePath}`, {
            totalCount: aRowData.length || 0,
            rowCount: Math.min(aRowData.length, 5),
            list: _.map(aRowData, (o, i) => ({
              ..._.omit(o, '__metadata'),
              Idx: i + 1,
            })),
          });
        } catch (oError) {
          throw oError;
        } finally {
          this.setContentsBusy(false, sTablePath);
        }
      },

      onSelectRow(oEvent) {
        const oViewModel = this.getViewModel();
        const sPath = oEvent.getParameters().rowBindingContext.getPath();
        const mRowData = oViewModel.getProperty(sPath);

        const mApptyRoute = {
          TG: 'shift',
          TH: 'shiftChange',
          TI: 'attendance',
          TJ: 'commuteCheck',
          TK: 'overtime',
          TL: 'changeot',
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
        } else if (_.includes(['TG', 'TH', 'TK', 'TL'], mRowData.Appty)) {
          mParams.push(mRowData.Werks);
          mParams.push(mRowData.Orgeh);
        }

        window.open(`${sHost}#/${sRouteName}/${mParams.join('/')}`, '_blank');
      },

      onPressSearch() {
        this.setContentsBusy(true, ['search', 'table1', 'table2', 'table3', 'table4']);

        setTimeout(async () => {
          try {
            await Promise.all([
              this.retrieveMonthlyCloseOverview(), //
              this.retrieveTimeReaderCheck(),
              this.retrieveMonthlyCloseList('1'),
              this.retrieveMonthlyCloseList('2'),
            ]);
          } catch (oError) {
            AppUtils.handleError(oError);
          } finally {
            this.setContentsBusy(false, 'search');
          }
        }, 0);
      },

      async createProcess(sPrcty, aPayloadData) {
        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);

          for (const mPayload of aPayloadData) {
            await Client.create(oModel, 'MonthlyCloseOverview', { ...mPayload, Prcty: sPrcty });
          }
        } catch (oError) {
          throw oError;
        }
      },

      onPressComplete() {
        const oViewModel = this.getViewModel();
        const oTable = this.byId(this.LIST_TABLE1_ID);
        const sAuth = this.getViewModel().getProperty('/auth');
        let aSelectedData = [];
        let sConfirmLabel = 'MSG_09004'; // 마감처리 하시겠습니까?

        if (sAuth === 'M') {
          aSelectedData = this.TableUtils.getSelectionData(oTable);

          if (aSelectedData.length < 1) {
            MessageBox.alert(this.getBundleText('MSG_09001')); // Overview에서 데이터를 선택하여 주십시오.
            return;
          }

          if (
            _.chain(aSelectedData)
              .filter((o) => _.isEqual(o.Clstx, '마감'))
              .size()
              .gt(0)
              .value()
          ) {
            MessageBox.alert(this.getBundleText('MSG_09002')); // 미마감 상태의 데이터만 선택하여 주십시오.
            return;
          }

          if (!_.chain(aSelectedData).filter({ Noapp1: '0', Nosgn1: '0', Nosgn2: '0', Nosgn3: '0', Nosgn4: '0', Nosgn5: '0', Nosgn6: '0' }).size().eq(aSelectedData.length).value()) {
            MessageBox.alert(this.getBundleText('MSG_09003')); // 미처리, 미결재 건수가 모두 0인 경우에만 마감이 가능합니다.
            return;
          }
        } else if (sAuth === 'H') {
          aSelectedData = oViewModel.getProperty('/table1/list');

          if (
            _.chain(aSelectedData)
              .filter((o) => _.isEqual(o.Clstx, '미마감'))
              .size()
              .gt(0)
              .value()
          ) {
            sConfirmLabel = 'MSG_09007'; // 미마감 상태의 데이터가 존재합니다.\n그래도 HR마감처리 하시겠습니까?
          }
        }

        this.setContentsBusy(true);

        MessageBox.confirm(this.getBundleText(sConfirmLabel), {
          actions: [this.getBundleText('LABEL_00114'), MessageBox.Action.CANCEL],
          onClose: async (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false);
              return;
            }

            try {
              await this.createProcess('C', sAuth === 'H' ? _.take(aSelectedData) : aSelectedData);
              await this.retrieveMonthlyCloseOverview();

              oTable.clearSelection();

              // {마감}되었습니다.
              MessageBox.success(this.getBundleText('MSG_00007', 'LABEL_09013'));
            } catch (oError) {
              this.debug('Controller > monthlyTimeClose > onPressComplete Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false);
            }
          },
        });
      },

      onPressCancle() {
        const oViewModel = this.getViewModel();
        const oTable = this.byId(this.LIST_TABLE1_ID);
        const sAuth = this.getViewModel().getProperty('/auth');
        let aSelectedData = [];

        if (sAuth === 'M') {
          aSelectedData = this.TableUtils.getSelectionData(oTable);

          if (aSelectedData.length < 1) {
            MessageBox.alert(this.getBundleText('MSG_09001')); // Overview에서 데이터를 선택하여 주십시오.
            return;
          }

          if (
            _.chain(aSelectedData)
              .filter((o) => _.isEqual(o.Clstx, '미마감'))
              .size()
              .gt(0)
              .value()
          ) {
            MessageBox.alert(this.getBundleText('MSG_09006')); // 마감 상태의 데이터만 선택하여 주십시오.
            return;
          }
        } else if (sAuth === 'H') {
          aSelectedData = oViewModel.getProperty('/table1/list');
        }

        this.setContentsBusy(true);

        // 마감취소처리 하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_09005'), {
          actions: [this.getBundleText('LABEL_00114'), MessageBox.Action.CANCEL],
          onClose: async (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false);
              return;
            }

            try {
              await this.createProcess('D', sAuth === 'H' ? _.take(aSelectedData) : aSelectedData);
              await this.retrieveMonthlyCloseOverview();

              oTable.clearSelection();

              // {마감취소}되었습니다.
              MessageBox.success(this.getBundleText('MSG_00007', 'LABEL_09015'));
            } catch (oError) {
              this.debug('Controller > monthlyTimeClose > onPressCancle Error', oError);

              AppUtils.handleError(oError);
            } finally {
              this.setContentsBusy(false);
            }
          },
        });
      },

      onPressExcelDownload(oEvent) {
        const sOrder = oEvent.getSource().getCustomData()[0].getValue();
        const oTable = this.byId(this[`LIST_TABLE${sOrder}_ID`]);
        const aFileNames = {
          1: this.getBundleText('LABEL_00185', 'LABEL_09017'), // {월근태마감_Overview}_목록
          2: this.getBundleText('LABEL_00185', 'LABEL_09018'), // {월근태마감_근태확인미처리현황}_목록
          3: this.getBundleText('LABEL_00185', 'LABEL_09019'), // {월근태마감_미결재현황}_목록
          4: this.getBundleText('LABEL_00185', 'LABEL_09020'), // {월근태마감_결재완료현황}_목록
        };

        this.TableUtils.export({ oTable, sFileName: aFileNames[sOrder] });
      },

      rowHighlight(sValue) {
        const sNotComplete = this.getBundleText('LABEL_09014'); // 미마감
        const sComplete = this.getBundleText('LABEL_09013'); // 마감

        switch (sValue) {
          case sNotComplete:
            // 미마감
            return sap.ui.core.IndicationColor.Indication02;
          case sComplete:
            // 마감
            return sap.ui.core.IndicationColor.Indication05;
          default:
            return null;
        }
      },
    });
  }
);
