/* eslint-disable no-useless-call */
sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/core/routing/History',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/mvc/controller/BaseController',
    'sap/ui/tesna/mvc/controller/individualWorkState/YearPlanBoxHandler',
  ],
  (
    // prettier 방지용 주석
    History,
    AppUtils,
    Client,
    ServiceNames,
    BaseController,
    YearPlanBoxHandler
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.individualWorkState.Main', {
      sCombiChartId: 'combiChart',
      sDoughChartId: 'doughChart',
      sDialChartId: 'WeekWorkDialChart',
      sDialChartDiv: 'chart-weekWork-app-dial-container',

      getCurrentLocationText() {
        return this.getBundleText('LABEL_02001'); // My Time Calendar
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      getPreviousRouteName() {
        return this.getViewModel().getProperty('/previousHash');
      },

      initializeModel() {
        return {
          FullYear: '',
          pernr: '',
          previousHash: '',
          year: moment().get('year'),
          month: moment().get('month'),
          menid: this.getCurrentMenuId(),
          Hass: this.isHass(),
          WeekWorkDate: new Date(),
          busy: {
            calendar: false,
            plan: false,
            quarter: false,
            work: false,
            week: false,
            byYear: false,
            byDay: false,
          },
          appointee: {},
          MonthStrList: [],
          YearPlan: [
            {
              title: '',
              detail: [
                {
                  Atext1: '',
                  Appsttx1: '',
                  Ename: '',
                  Ename: '',
                },
              ],
            },
          ],
          WeekWork: {
            Wkrultx: '',
            WeekTime: 52,
            Tottime: 0,
            Bastime: 0,
            Ottime: 0,
            WorkTime: 0,
          },
          TimeTypes: [],
          DailyWorkList: [],
          DailyWorkCount: 1,
          yearPlan: [],
          plans: [],
          WorkMonths: [],
          VacaTypeList1: [],
          VacaTypeList2: [],
          WorkTypeUseList: [],
          WorkTypeUse: 'A',
          vacationChart: {
            dUsed: 0,
            dPlan: 0,
            dUnPlan: 0,
            pUsed: 0,
            pPlan: 0,
            pUnPlan: 0,
            Month: moment().month() + 1,
          },
        };
      },

      async onObjectMatched(oParameter) {
        const oViewModel = this.getViewModel();

        oViewModel.setSizeLimit(500);
        oViewModel.setData(this.initializeModel());

        this.setContentsBusy(true);

        try {
          const sPreviousHash = History.getInstance().getPreviousHash();

          if (!_.isEmpty(sPreviousHash)) oViewModel.setProperty('/previousHash', sPreviousHash);

          const sPernr = oParameter.pernr ?? this.getAppointeeProperty('Pernr');
          const sYear = oParameter.year ?? moment().get('year');
          const sMonth = oParameter.month ?? moment().get('month');

          oViewModel.setProperty('/pernr', sPernr);
          oViewModel.setProperty('/year', _.toNumber(sYear));
          oViewModel.setProperty('/month', _.toNumber(sMonth));
          oViewModel.setProperty('/WeekWorkDate', oParameter.year ? moment().year(_.toNumber(sYear)).month(_.toNumber(sMonth)).toDate() : new Date());
          oViewModel.setProperty(
            '/MonthStrList',
            _.times(12, (d) => ({ label: `${++d}${this.getBundleText('LABEL_00192')}` })) // 월
          );

          this.setAppointee(sPernr);
          this.setMonth(sMonth);
          this.formYear(sYear);

          this.YearPlanBoxHandler = new YearPlanBoxHandler({ oController: this, sPernr, sYear });

          this.retrieveBoxes(sYear);
        } catch (oError) {
          this.debug(oError);
          AppUtils.handleError(oError);
        } finally {
          AppUtils.setAppBusy(false).setMenuBusy(false);
        }
      },

      buildDoughChart(mLeavePlanData) {
        const oDetailModel = this.getViewModel();
        const mPlan = {
          dUsed: parseFloat(mLeavePlanData.Cnt01 || 0),
          dPlan: parseFloat(mLeavePlanData.Cnt02 || 0),
          dUnPlan: parseFloat(mLeavePlanData.Cnt03 || 0),
          pUsed: parseFloat(mLeavePlanData.Rte01 || 0),
          pPlan: parseFloat(mLeavePlanData.Rte02 || 0),
          pUnPlan: parseFloat(mLeavePlanData.Rte03 || 0),
        };

        oDetailModel.setProperty('/vacationChart', mPlan);

        if (!FusionCharts(this.sDoughChartId)) {
          FusionCharts.ready(() => {
            FusionCharts.getInstance({
              id: this.sDoughChartId,
              type: 'doughnut2d',
              renderAt: 'chart-doughnut-container',
              width: '40%',
              height: '100%',
              dataFormat: 'json',
              dataSource: {
                chart: this.getDoughnutChartOption(),
                data: [
                  {
                    label: this.getBundleText('LABEL_02002'), // 사용일수
                    value: mPlan.dUsed,
                    displayValue: `${mPlan.pUsed}%`,
                    color: '#7BB4EB',
                  },
                  {
                    label: this.getBundleText('LABEL_02003'), // 계획일수
                    value: mPlan.dPlan,
                    displayValue: `${mPlan.pPlan}%`,
                    color: '#A2EB7B',
                  },
                  {
                    label: this.getBundleText('LABEL_02004'), // 잔여일수 (미사용&미계획)
                    value: mPlan.dUnPlan,
                    displayValue: `${mPlan.pUnPlan}%`,
                    color: '#FFE479',
                  },
                ],
              },
            }).render();
          });
        } else {
          const oChart = FusionCharts(this.sDoughChartId);

          oChart.setChartData(
            {
              chart: this.getDoughnutChartOption(),
              data: [
                {
                  label: this.getBundleText('LABEL_02002'), // 사용일수
                  value: mPlan.dUsed,
                  displayValue: `${mPlan.pUsed}%`,
                  color: '#7BB4EB',
                },
                {
                  label: this.getBundleText('LABEL_02003'), // 계획일수
                  value: mPlan.dPlan,
                  displayValue: `${mPlan.pPlan}%`,
                  color: '#A2EB7B',
                },
                {
                  label: this.getBundleText('LABEL_02004'), // 잔여일수 (미사용&미계획)
                  value: mPlan.dUnPlan,
                  displayValue: `${mPlan.pUnPlan}%`,
                  color: '#FFE479',
                },
              ],
            },
            'json'
          );

          oChart.render();
        }
      },

      buildCombiChart(aWorkTypeList) {
        const oDetailModel = this.getViewModel();

        _.chain(aWorkTypeList)
          .set(
            'Current',
            _.map(aWorkTypeList, (e) => {
              return { value: e.Cumuse };
            })
          )
          .set(
            'Monuse',
            _.map(aWorkTypeList, (e) => {
              return { value: e.Monuse };
            })
          )
          .value();

        if (!FusionCharts(this.sCombiChartId)) {
          FusionCharts.ready(() => {
            FusionCharts.getInstance({
              id: this.sCombiChartId,
              type: 'mscombidy2d',
              renderAt: 'chart-combination-container',
              width: '100%',
              height: 300,
              dataFormat: 'json',
              dataSource: {
                chart: this.getCombiChartOption(),
                categories: [
                  {
                    category: oDetailModel.getProperty('/MonthStrList'),
                  },
                ],
                dataset: [
                  {
                    seriesName: this.getBundleText('LABEL_00198'),
                    data: aWorkTypeList.Monuse,
                    color: '#7bb4eb',
                  },
                  {
                    seriesName: this.getBundleText('LABEL_00196'),
                    renderAs: 'line',
                    data: aWorkTypeList.Current,
                    color: '#000000',
                    anchorBgColor: '#000000',
                    anchorRadius: 3,
                    lineThickness: 1,
                  },
                ],
              },
            }).render();
          });
        } else {
          const oChart = FusionCharts(this.sCombiChartId);

          oChart.setChartData(
            {
              chart: this.getCombiChartOption(),
              categories: [
                {
                  category: oDetailModel.getProperty('/MonthStrList'),
                },
              ],
              dataset: [
                {
                  seriesName: this.getBundleText('LABEL_00198'),
                  data: aWorkTypeList.Monuse,
                  color: '#7bb4eb',
                },
                {
                  seriesName: this.getBundleText('LABEL_00196'),
                  renderAs: 'line',
                  data: aWorkTypeList.Current,
                  color: '#000000',
                  anchorBgColor: '#000000',
                  anchorRadius: 3,
                  lineThickness: 1,
                },
              ],
            },
            'json'
          );

          oChart.render();
        }
      },

      buildDialChart(mWeekTimeData) {
        const oChart = FusionCharts(this.sDialChartId);
        const iGaugeOriginY = 225; // 150 + 75 : (chart box height 50%) + (chart real height 50%)

        if (!oChart) {
          FusionCharts.ready(() => {
            FusionCharts.getInstance({
              id: this.sDialChartId,
              type: 'angulargauge',
              renderAt: this.sDialChartDiv,
              width: 400,
              height: 250,
              dataFormat: 'json',
              dataSource: {
                chart: this.getDialChartOption(iGaugeOriginY),
                colorrange: {
                  color: [
                    {
                      minvalue: 0,
                      maxvalue: mWeekTimeData.Alwtm,
                      code: '#34649d',
                    },
                    {
                      minvalue: mWeekTimeData.Alwtm,
                      maxvalue: mWeekTimeData.Maxtm,
                      code: '#fdde17',
                    },
                  ],
                },
                dials: {
                  dial: [
                    {
                      showValue: 1,
                      value: mWeekTimeData.Reltm,
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
                    maxvalue: mWeekTimeData.Alwtm,
                    code: '#34649d',
                  },
                  {
                    minvalue: mWeekTimeData.Alwtm,
                    maxvalue: mWeekTimeData.Maxtm,
                    code: '#fdde17',
                  },
                ],
              },
              dials: {
                dial: [
                  {
                    showValue: 1,
                    value: mWeekTimeData.Reltm,
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

      setContentsBusy(bContentsBusy = true, vTarget = []) {
        const oViewModel = this.getViewModel();
        const mBusy = oViewModel.getProperty('/busy');

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

      async setAppointee(sPernr) {
        const oViewModel = this.getViewModel();

        if (_.isEqual(sPernr, this.getAppointeeProperty('Pernr'))) {
          const mAppointee = AppUtils.getAppComponent().getAppointeeModel().getData();

          oViewModel.setProperty('/appointee', mAppointee);
        } else {
          const [mAppointee] = await Client.getEntitySet(this.getModel(ServiceNames.COMMON), 'EmpSearchResult', {
            Actda: moment().hours(9).toDate(),
            Ename: sPernr,
          });

          oViewModel.setProperty('/appointee', {
            ...mAppointee,
            Pernm: mAppointee.Ename,
            Orgtx: mAppointee.Fulln,
            Stext: mAppointee.Fulln,
            Zzcaltltx: _.chain([mAppointee.Zzcaltltx, mAppointee.Zzpsgrptx]).compact().join(' / ').value(),
            Photo: mAppointee.Photo || this.getUnknownAvatarImageURL(),
          });
        }
      },

      // Combination Rerendering
      setCombiChartData(aWorkTypeList) {
        const oDetailModel = this.getViewModel();
        const oChart = FusionCharts(this.sCombiChartId);

        _.chain(aWorkTypeList)
          .set(
            'Current',
            _.map(aWorkTypeList, (e) => ({ value: e.Cumuse }))
          )
          .set(
            'Monuse',
            _.map(aWorkTypeList, (e) => ({ value: e.Monuse }))
          )
          .value();

        oChart.setChartData(
          {
            chart: this.getCombiChartOption(),
            categories: [
              {
                category: oDetailModel.getProperty('/MonthStrList'),
              },
            ],
            dataset: [
              {
                seriesName: this.getBundleText('LABEL_00198'),
                data: aWorkTypeList.Monuse,
                color: '#7bb4eb',
              },
              {
                seriesName: this.getBundleText('LABEL_00196'),
                renderAs: 'line',
                data: aWorkTypeList.Current,
                color: '#000000',
                anchorBgColor: '#000000',
                anchorRadius: 3,
                lineThickness: 1,
              },
            ],
          },
          'json'
        );
        oChart.render();
      },

      setMonth(sMonth = moment().month()) {
        const oViewModel = this.getViewModel();
        const sMonthLabel = this.getBundleText('LABEL_00192'); // 월

        oViewModel.setProperty('/WorkMonth', _.toNumber(sMonth) + 1);
        oViewModel.setProperty(
          '/WorkMonths',
          _.times(12, (d) => ({ Zcode: d, Ztext: `${d++}${sMonthLabel}` }))
        );
      },

      // Doughnut Chart Setting
      getDoughnutChartOption() {
        return FusionCharts.curryChartOptions({
          legendPosition: 'right',
          plottooltext: `$label $value일`,
          showZeroPies: 1,
          labelDistance: -5,
          slicingDistance: 0,
          chartTopMargin: 10,
          chartBottomMargin: 10,
        });
      },

      // Combination Chart Setting
      getCombiChartOption() {
        return FusionCharts.curryChartOptions({
          usePlotGradientColor: 0,
          showDivLineSecondaryValue: 0,
          showSecondaryLimits: 0,
          showPlotBorder: 0,
          showXAxisLine: 0,
          divLineColor: '#dde1e6',
          divLineDashed: 0,
          plottooltext: "<div class='fusion-tooltip'><table><tr><th>$seriesname-$label</th><td>$value</td></tr></table></div>",
          chartTopMargin: 10,
          chartLeftMargin: 10,
        });
      },

      // WeekWorkTime Chart
      getDialChartOption(iGaugeOriginY) {
        return FusionCharts.curryChartOptions({
          gaugeOriginY: iGaugeOriginY,
          gaugeOuterRadius: 150,
          gaugeInnerRadius: 110,
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
          showTooltip: 0,
        });
      },

      // 년도 선택시 화면전체 년도
      formYear(sYear = moment().year()) {
        return this.getViewModel().setProperty('/FullYear', `${sYear}${this.getBundleText('LABEL_00193')}`); // 년
      },

      async retrievePlan(sYear) {
        const oViewModel = this.getViewModel();

        try {
          const [mPlanData] = await Client.getEntitySet(this.getModel(ServiceNames.WORKTIME), 'LeavePlan', {
            Werks: this.getAppointeeProperty('Persa'),
            Pernr: oViewModel.getProperty('/pernr'),
            Tmyea: sYear,
          });

          this.buildDoughChart(mPlanData);

          this.setContentsBusy(false, 'plan');
        } catch (oError) {
          this.debug('Controller > individualWorkState > retrievePlan Error', oError);

          AppUtils.handleError(oError);
        }
      },

      async retrieveQuarter(sYear) {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const aQuarters = await Client.getEntitySet(oModel, 'AbsQuotaList', {
            Pernr: oViewModel.getProperty('/pernr'),
            Tmyea: sYear,
          });

          oViewModel.setProperty(
            '/VacaTypeList1',
            _.filter(aQuarters, (o) => _.toNumber(o.Ktart) <= 20)
          );
          oViewModel.setProperty(
            '/VacaTypeList2',
            _.filter(aQuarters, (o) => _.toNumber(o.Ktart) > 20)
          );

          this.setContentsBusy(false, 'quarter');
        } catch (oError) {
          this.debug('Controller > individualWorkState > retrieveQuarter Error', oError);

          AppUtils.handleError(oError);
        }
      },

      async retrieveWork(sYear) {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const mPayload = {
            Werks: this.getAppointeeProperty('Persa'),
            Pernr: oViewModel.getProperty('/pernr'),
            Tmyea: sYear,
            Month: oViewModel.getProperty('/WorkMonth'),
          };

          const [aWorkings, aOvertimes] = await Promise.all([
            Client.getEntitySet(oModel, 'WorkingStatus', mPayload), //
            Client.getEntitySet(oModel, 'OvertimeStatus', mPayload),
          ]);

          oViewModel.setProperty('/MonthWorkList', aWorkings);
          oViewModel.setProperty('/OTWorkList', aOvertimes);

          this.setContentsBusy(false, 'work');
        } catch (oError) {
          this.debug('Controller > individualWorkState > retrieveWork Error', oError);

          AppUtils.handleError(oError);
        }
      },

      async retrieveWeek() {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.WORKTIME);
          const [mWeekTimeData] = await Client.getEntitySet(oModel, 'WorkLimitStatus2', {
            Werks: this.getAppointeeProperty('Persa'),
            Pernr: oViewModel.getProperty('/pernr'),
            Datum: moment(oViewModel.getProperty('/WeekWorkDate')).hours(9).toDate(),
          });

          this.buildDialChart(mWeekTimeData);

          if (mWeekTimeData.Wkrul && mWeekTimeData.Wkrul.indexOf('선택') !== -1) {
            mWeekTimeData.Wktext = 'this month';
          } else {
            mWeekTimeData.Wktext = 'this week';
          }

          oViewModel.setProperty('/WeekWork', mWeekTimeData);

          this.setContentsBusy(false, 'week');
        } catch (oError) {
          this.debug('Controller > individualWorkState > retrieveWeek Error', oError);

          AppUtils.handleError(oError);
        }
      },

      async retrieveWorkByYear(sYear) {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.PERSONALTIME);
          const sColty = oViewModel.getProperty('/WorkTypeUse') || 'A';
          const aYearWorks = await Client.getEntitySet(oModel, 'TimeUsageGraph', {
            Werks: this.getAppointeeProperty('Persa'),
            Pernr: oViewModel.getProperty('/pernr'),
            Tmyea: sYear,
            Colty: sColty,
          });

          oViewModel.setProperty('/WorkTypeUse', sColty);
          this.buildCombiChart(aYearWorks);

          this.setContentsBusy(false, 'byYear');
        } catch (oError) {
          this.debug('Controller > individualWorkState > retrieveWorkByYear Error', oError);

          AppUtils.handleError(oError);
        }
      },

      async retrieveWorkByDay(sYear) {
        const oViewModel = this.getViewModel();

        try {
          const oModel = this.getModel(ServiceNames.PERSONALTIME);
          const aDayWorks = await Client.getEntitySet(oModel, 'ApprTimeList', {
            Werks: this.getAppointeeProperty('Persa'),
            Pernr: oViewModel.getProperty('/pernr'),
            Tmyea: sYear,
          });

          oViewModel.setProperty('/DailyWorkCount', aDayWorks.length);
          oViewModel.setProperty(
            '/DailyWorkList',
            _.map(aDayWorks, (o, i) => ({
              ...o,
              No: ++i,
              Beguz: o.Beguz === '-' ? null : o.Beguz,
              Enduz: o.Enduz === '-' ? null : o.Enduz,
            }))
          );

          this.setContentsBusy(false, 'byDay');
        } catch (oError) {
          this.debug('Controller > individualWorkState > retrieveWorkByDay Error', oError);

          AppUtils.handleError(oError);
        }
      },

      // 년도 선택시 화면전체조회
      retrieveBoxes(sYear) {
        const oViewModel = this.getViewModel();

        sYear = sYear || oViewModel.getProperty('/year');

        setTimeout(() => this.retrievePlan(sYear), 0);
        setTimeout(() => this.retrieveQuarter(sYear), 0);
        setTimeout(() => this.retrieveWork(sYear), 0);
        setTimeout(() => this.retrieveWeek(), 0);
        setTimeout(() => this.retrieveWorkByYear(sYear), 0);
        setTimeout(() => this.retrieveWorkByDay(sYear), 0);
      },

      // 근무현황 월 선택
      onChangeWorkMonth() {
        const oViewModel = this.getViewModel();
        const sYear = oViewModel.getProperty('/year');

        this.setContentsBusy(true, 'work');

        setTimeout(() => this.retrieveWork(sYear), 0);
      },

      // 주 52시간 현황 날짜선택
      onChangeWeekWorkTime() {
        this.setContentsBusy(true, 'week');

        setTimeout(() => this.retrieveWeek(), 0);
      },

      // 근태유형별 연간사용현황 Combo
      onChangeWorkTypeUse() {
        const oViewModel = this.getViewModel();
        const sYear = oViewModel.getProperty('/year');

        this.setContentsBusy(true, 'byYear');

        setTimeout(() => this.retrieveWorkByYear(sYear), 0);
      },

      onPressPrevYear() {
        this.setContentsBusy(true);

        this.YearPlanBoxHandler.onPressPrevYear();
        this.formYear(this.getViewModel().getProperty('/year'));

        this.retrieveBoxes();
      },

      onPressNextYear() {
        this.setContentsBusy(true);

        this.YearPlanBoxHandler.onPressNextYear();
        this.formYear(this.getViewModel().getProperty('/year'));

        this.retrieveBoxes();
      },

      onClickDay(oEvent) {
        this.YearPlanBoxHandler.onClickDay(oEvent);
      },

      onPressExcelDownload() {
        this.YearPlanBoxHandler.downloadExcel();
      },
    });
  }
);
