sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/exceptions/UI5Error',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  (
    // prettier 방지용 주석
    AppUtils,
    UI5Error,
    Client,
    ServiceNames,
    BaseController
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.overtime.List', {
      ROUTE_NAME: '',
      LIST_TABLE_ID: 'overtimeTable',
      CHART_CONTAINER_ID: 'chart-overtime-summary-app-dial-container',
      CHART_ID: 'overtimeSummaryChart',

      getCurrentLocationText() {
        return this.getBundleText('LABEL_07001'); // 특근신청
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      initializeModel() {
        return {
          busy: false,
          routeName: '',
          isActiveSearch: false,
          summary: {},
          conditionBusy: {
            Orgeh: false,
            Kostl: false,
          },
          searchConditions: {
            Werks: '',
            Orgeh: '',
            Kostl: '',
            Apbeg: moment().subtract(1, 'month').add(1, 'day').hours(9).toDate(),
            Apend: moment().hours(9).toDate(),
          },
          entry: {
            Werks: [],
            Orgeh: [],
            Kostl: [],
          },
          listInfo: {
            totalCount: 0,
            rowCount: 1,
            isShowProgress: false,
            ObjTxt2: this.getBundleText('LABEL_00166'), // 기안
          },
          list: [],
        };
      },

      async onObjectMatched(oParameter, sRouteName) {
        const oViewModel = this.getViewModel();

        this.ROUTE_NAME = sRouteName;

        try {
          oViewModel.setSizeLimit(1000);
          oViewModel.setProperty('/busy', true);
          oViewModel.setProperty('/routeName', sRouteName);
          oViewModel.setProperty('/auth', this.isHass() ? 'H' : this.isMss() ? 'M' : 'E');

          if (!oViewModel.getProperty('/entry/Persa')) {
            await this.setPersaEntry();
            await this.setOrgehEntry();
            await this.setKostlEntry();
          }

          this.toggleActiveSearch();

          await this.retrieveSummary();
          await this.retrieveList();
        } catch (oError) {
          this.debug('Controller > overtime List > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
        } finally {
          oViewModel.setProperty('/busy', false);
        }
      },

      async retrieveSummary() {
        const oViewModel = this.getViewModel();

        try {
          const [mSummary] = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'WorkLimitStatus2', {
            Werks: this.getAppointeeProperty('Persa'),
            Pernr: this.getAppointeeProperty('Pernr'),
            Datum: moment().hours(9).toDate(),
          });

          oViewModel.setProperty(
            '/summary',
            _.chain(mSummary)
              .omit('__metadata')
              .set('Text', _.startsWith(mSummary.Wkrul, '선택') ? 'this month' : 'this week')
              .value()
          );

          this.buildChart();
        } catch (oError) {
          throw oError;
        }
      },

      async retrieveList() {
        const oViewModel = this.getViewModel();

        try {
          const oTable = this.byId(this.LIST_TABLE_ID);
          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const sAuth = oViewModel.getProperty('/auth');

          if (!mSearchConditions.Werks || !mSearchConditions.Orgeh) return;

          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'OtWorkApply', {
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
            _.map(aRowData, (o) => _.omit(o, '__metadata'))
          );
        } catch (oError) {
          throw oError;
        }
      },

      buildChart() {
        const oChart = FusionCharts(this.CHART_ID);
        const mMyWork = this.getViewModel().getProperty('/summary');
        const iGaugeOriginY = 150 * 0.75; // chart box height 75%

        if (!oChart) {
          FusionCharts.ready(() => {
            FusionCharts.getInstance({
              id: this.CHART_ID,
              renderAt: this.CHART_CONTAINER_ID,
              type: 'angulargauge',
              width: 225,
              height: 150,
              dataFormat: 'json',
              dataSource: {
                chart: this.getDialChartOption(iGaugeOriginY),
                colorrange: {
                  color: [
                    {
                      minvalue: 0,
                      maxvalue: mMyWork.Alwtm,
                      code: '#34649d',
                    },
                    {
                      minvalue: mMyWork.Alwtm,
                      maxvalue: mMyWork.Maxtm,
                      code: '#fdde17',
                    },
                  ],
                },
                dials: {
                  dial: [
                    {
                      showValue: 1,
                      value: mMyWork.Reltm,
                      valueY: iGaugeOriginY + 13,
                      baseWidth: 4,
                      rearExtension: 0,
                    },
                  ],
                },
              },
            }).render();
          });
        } else {
          oChart.setChartData(
            {
              chart: this.getDialChartOption(iGaugeOriginY),
              colorrange: {
                color: [
                  {
                    minvalue: 0,
                    maxvalue: mMyWork.Alwtm,
                    code: '#34649d',
                  },
                  {
                    minvalue: mMyWork.Alwtm,
                    maxvalue: mMyWork.Maxtm,
                    code: '#fdde17',
                  },
                ],
              },
              dials: {
                dial: [
                  {
                    showValue: 1,
                    value: mMyWork.Reltm,
                    valueY: iGaugeOriginY + 13,
                    baseWidth: 4,
                    rearExtension: 0,
                  },
                ],
              },
            },
            'json'
          );
          oChart.render();
        }
      },

      getDialChartOption(iGaugeOriginY) {
        return FusionCharts.curryChartOptions({
          showTooltip: 0,
          gaugeOriginY: iGaugeOriginY,
          gaugeOuterRadius: 85,
          gaugeInnerRadius: 60,
          majorTMNumber: 13,
          majorTMColor: '#333333',
          majorTMHeight: -2.5,
          majorTMThickness: 1,
          tickValueDistance: 5,
          tickValueStep: 10,
          showPlotBorder: 0,
          showGaugeBorder: 0,
          showPivotBorder: 0,
          pivotRadius: 3,
          pivotFillColor: '#000000',
        });
      },

      async setPersaEntry() {
        const oViewModel = this.getViewModel();

        try {
          if (this.isHass() || this.isMss()) {
            oViewModel.setProperty('/entry/Persa', []);
            oViewModel.setProperty('/entry/Orgeh', []);
            oViewModel.setProperty('/entry/Kostl', []);
            oViewModel.setProperty('/searchConditions/Werks', '');
            oViewModel.setProperty('/searchConditions/Orgeh', '');
            oViewModel.setProperty('/searchConditions/Kostl', '');

            const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.COMMON), 'PersAreaList', {
              Actty: '1',
              Wave: '1',
            });

            oViewModel.setProperty('/searchConditions/Werks', _.get(aEntries, [0, 'Persa']));
            oViewModel.setProperty(
              '/entry/Persa',
              _.map(aEntries, (o) => _.chain(o).omit('__metadata').omitBy(_.isNil).omitBy(_.isEmpty).value())
            );
          } else {
            const mAppointeeData = this.getAppointeeData();

            oViewModel.setProperty('/entry/Persa', [_.pick(mAppointeeData, ['Persa', 'Pbtxt'])]);
            oViewModel.setProperty('/searchConditions/Werks', mAppointeeData.Persa);
          }
        } catch (oError) {
          throw oError;
        }
      },

      async setOrgehEntry() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/entry/Orgeh', []);
          oViewModel.setProperty('/entry/Kostl', []);
          oViewModel.setProperty('/searchConditions/Orgeh', '');
          oViewModel.setProperty('/searchConditions/Kostl', '');

          const sWerks = oViewModel.getProperty('/searchConditions/Werks');

          if (_.isEmpty(sWerks)) return;

          const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.NIGHTWORK), 'TimeOrgehList', {
            Werks: sWerks,
            Austy: oViewModel.getProperty('/auth'),
          });

          const sAuth = oViewModel.getProperty('/auth');

          oViewModel.setProperty(
            '/searchConditions/Orgeh',
            sAuth === 'E'
              ? this.getAppointeeProperty('Orgeh')
              : _.chain(aEntries)
                  .filter((o) => o.Orgeh !== '00000000')
                  .get([0, 'Orgeh'])
                  .value()
          );
          oViewModel.setProperty(
            '/entry/Orgeh',
            _.map(aEntries, (o) => _.chain(o).omit('__metadata').omitBy(_.isNil).omitBy(_.isEmpty).value())
          );
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

      toggleActiveSearch() {
        const oViewModel = this.getViewModel();
        const mSearchConditions = oViewModel.getProperty('/searchConditions');
        const sAuth = oViewModel.getProperty('/auth');

        oViewModel.setProperty('/isActiveSearch', sAuth === 'E' || (!_.isEmpty(mSearchConditions.Werks) && !_.isEmpty(mSearchConditions.Orgeh) && !_.isEqual(mSearchConditions.Orgeh, '00000000')));
      },

      /*****************************************************************
       * ! Event handler
       *****************************************************************/
      async onPressSearch() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/busy', true);

          const sAuth = oViewModel.getProperty('/auth');

          if (sAuth !== 'H') {
            const mSearchConditions = oViewModel.getProperty('/searchConditions');

            if (_.isEmpty(mSearchConditions.Werks)) {
              throw new UI5Error({ code: 'A', message: this.getBundleText('MSG_00005', 'LABEL_00220') }); // {회사}를 선택하세요.
            }
            if (_.isEmpty(mSearchConditions.Orgeh)) {
              throw new UI5Error({ code: 'A', message: this.getBundleText('MSG_00005', 'LABEL_00219') }); // {부서}를 선택하세요.
            }
            if (_.isEmpty(mSearchConditions.Kostl)) {
              throw new UI5Error({ code: 'A', message: this.getBundleText('MSG_00004', 'LABEL_00177') }); // {공정}를 선택하세요.
            }
          }

          await this.retrieveList();
        } catch (oError) {
          this.debug('Controller > overtime List > onPressSearch Error', oError);

          AppUtils.handleError(oError);
        } finally {
          oViewModel.setProperty('/busy', false);
        }
      },

      async onChangeWerks() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/conditionBusy/Orgeh', true);
          oViewModel.setProperty('/conditionBusy/Kostl', true);

          await this.setOrgehEntry();
          await this.setKostlEntry();

          this.toggleActiveSearch();
        } catch (oError) {
          this.debug('Controller > overtime List > onChangePersa Error', oError);

          AppUtils.handleError(oError);
        } finally {
          oViewModel.setProperty('/conditionBusy/Orgeh', false);
          oViewModel.setProperty('/conditionBusy/Kostl', false);
        }
      },

      async onChangeOrgeh() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/conditionBusy/Kostl', true);

          await this.setKostlEntry();

          this.toggleActiveSearch();
        } catch (oError) {
          this.debug('Controller > overtime List > onChangeOrgeh Error', oError);

          AppUtils.handleError(oError);
        } finally {
          oViewModel.setProperty('/conditionBusy/Kostl', false);
        }
      },

      onChangeKostl() {
        this.toggleActiveSearch();
      },

      onPressExcelDownload() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const sFileName = this.getBundleText('LABEL_00185', 'LABEL_07001'); // {특근신청}_목록

        this.TableUtils.export({ oTable, sFileName });
      },

      onSelectRow(oEvent) {
        const sPath = oEvent.getParameters().rowBindingContext.getPath();
        const mRowData = this.getViewModel().getProperty(sPath);

        this.getRouter().navTo(`${this.ROUTE_NAME}-detail`, {
          appno: mRowData.Appno,
          werks: mRowData.Werks,
          orgeh: mRowData.Orgeh,
        });
      },

      onPressNewApprovalBtn() {
        const oViewModel = this.getViewModel();
        const sAuth = oViewModel.getProperty('/auth');

        if (sAuth === 'E') {
          const mSessionData = this.getAppointeeData();

          this.getRouter().navTo(`${this.ROUTE_NAME}-detail`, {
            appno: 'N',
            werks: mSessionData.Persa,
            orgeh: mSessionData.Orgeh,
          });
        } else {
          const mSearchConditions = oViewModel.getProperty('/searchConditions');

          this.getRouter().navTo(`${this.ROUTE_NAME}-detail`, {
            appno: 'N',
            werks: mSearchConditions.Werks,
            orgeh: mSearchConditions.Orgeh,
          });
        }
      },

      /*****************************************************************
       * ! Call oData
       *****************************************************************/
    });
  }
);
