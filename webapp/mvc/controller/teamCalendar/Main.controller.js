/* eslint-disable no-useless-call */
sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/core/Fragment',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  (
    // prettier 방지용 주석
    Fragment,
    AppUtils,
    Client,
    ServiceNames,
    BaseController
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.teamCalendar.Main', {
      isReadMore: false,
      readPerSize: 50,

      getCurrentLocationText() {
        return this.getBundleText('LABEL_03002'); // 팀캘린더
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      initializeModel() {
        return {
          auth: 'E',
          isLoaded: false,
          busy: {
            Tyymm: false,
            Persa: false,
            Orgeh: false,
            Kostl: false,
            Button: false,
            Calendar: false,
          },
          typeLegends: [],
          entry: {
            Persa: [],
            Orgeh: [],
            Kostl: [],
          },
          searchConditions: {
            Tyymm: '',
            Werks: '',
            Orgeh: '',
            Kostl: '',
            Downinc: null,
          },
          calendar: {
            yearMonth: '',
            columnTemplate: '',
            raw: [],
            plans: [],
            remains: [],
            detail: {
              title: '',
              data: {},
            },
          },
          filter: {
            ename: '',
            employees: [],
          },
        };
      },

      async onObjectMatched() {
        const oViewModel = this.getViewModel();

        try {
          const bIsLoaded = oViewModel.getProperty('/isLoaded');

          this.bindInfiniteScroll();

          if (!bIsLoaded) {
            oViewModel.setSizeLimit(20000);
            oViewModel.setProperty('/auth', this.currentAuth());

            this.setContentsBusy(true);

            oViewModel.setProperty('/searchConditions/Tyymm', moment().format('YYYYMM'));
            oViewModel.setProperty('/searchConditions/Downinc', null);
            await this.setPersaEntry();
            await this.setOrgehEntry();
            await this.setKostlEntry();

            this.setCalendarYearMonthLabel();
            this.setCalendarGridHeader();
            await this.loadCalendarData();

            this.setAwartLabels();
            this.buildCalendar();

            this.initializeTeamPlanPopover();
            this.initializeBusyDialog();
          }
        } catch (oError) {
          this.debug('Controller > teamCalendar > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false);
        }
      },

      bindInfiniteScroll() {
        const oPage = this.getView().getContent()[0];

        oPage.addEventDelegate({
          onAfterRendering: () => {
            oPage
              .$()
              .find('.sapMPageEnableScrolling')
              .off('scroll')
              .on('scroll', _.throttle(this.fireScroll.bind(this), 100));
          },
        });
      },

      fireScroll() {
        if (this.isReadMore && this.isScrollBottom()) {
          this.isReadMore = false;
          this._oBusyDialog.open();

          setTimeout(() => this.readMore(), 0);
        }
      },

      isScrollBottom() {
        const $scrollDom = this.getView().getContent()[0].$().find('.sapMPageEnableScrolling');
        const iScrollMarginBottom = $scrollDom.prop('scrollHeight') - $scrollDom.prop('scrollTop');
        const iGrowHeight = $scrollDom.height();

        // this.debug(`Controller > teamCalendar > isScrollBottom iScrollMarginBottom(${iScrollMarginBottom}) - iGrowHeight(${iGrowHeight}) = ${iScrollMarginBottom - iGrowHeight}`);

        return $scrollDom.prop('scrollTop') > 0 && iScrollMarginBottom - iGrowHeight < 100;
      },

      readMore() {
        const oViewModel = this.getViewModel();
        const aPlans = oViewModel.getProperty('/calendar/plans');
        const aRemains = oViewModel.getProperty('/calendar/remains');

        oViewModel.setProperty('/calendar/plans', [
          ...aPlans,
          ..._.chain(aRemains)
            .take(this.readPerSize)
            .reduce((acc, cur) => [...acc, ...this.convertPlanData(cur)], [])
            .value(),
        ]);

        setTimeout(() => {
          if (aRemains.length > this.readPerSize) {
            this.isReadMore = true;
            oViewModel.setProperty('/calendar/remains', _.drop(aRemains, this.readPerSize));
          } else {
            this.isReadMore = false;
            oViewModel.setProperty('/calendar/remains', []);
          }

          this._oBusyDialog.close();
        }, 500);
      },

      async initializeBusyDialog() {
        const oView = this.getView();

        if (!this._oBusyDialog) {
          this._oBusyDialog = await Fragment.load({
            id: oView.getId(),
            name: 'sap.ui.tesna.mvc.view.teamCalendar.fragment.LoadingDialog',
            controller: this,
          });

          oView.addDependent(this._oBusyDialog);
        }
      },

      async initializeTeamPlanPopover() {
        const oView = this.getView();

        this._oPlanDetailPopover = await Fragment.load({
          id: oView.getId(),
          name: 'sap.ui.tesna.mvc.view.teamCalendar.fragment.TeamPlanPopover',
          controller: this,
        });

        oView.addDependent(this._oPlanDetailPopover);
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

      onPressSearch() {
        this.setContentsBusy(true, ['Button', 'Calendar']);
        this.setCalendarYearMonthLabel();

        setTimeout(() => {
          this.setCalendarGridHeader();
          this.retrieveCalendar();
        }, 0);
      },

      async retrieveCalendar() {
        try {
          await this.loadCalendarData();

          this.buildCalendar();
        } catch (oError) {
          this.debug('Controller > teamCalendar > retrieveCalendar Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, ['Button', 'Calendar']);
        }
      },

      async onChangeWerks() {
        try {
          this.setContentsBusy(true, ['Orgeh', 'Kostl']);

          await this.setOrgehEntry();
          await this.setKostlEntry();
        } catch (oError) {
          this.debug('Controller > teamCalendar > onChangeWerks Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, ['Orgeh', 'Kostl']);
        }
      },

      async onChangeOrgeh() {
        try {
          this.setContentsBusy(true, 'Kostl');

          await this.setKostlEntry();
        } catch (oError) {
          this.debug('Controller > teamCalendar > onChangeOrgeh Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'Kostl');
        }
      },

      onChangeKostl() {},

      async setPersaEntry() {
        const oViewModel = this.getViewModel();

        try {
          if (!_.isEqual(this.currentAuth(), 'E')) {
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
              _.map(aEntries, (o) => _.chain(o).omitBy(_.isNil).omitBy(_.isEmpty).value())
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

          oViewModel.setProperty(
            '/searchConditions/Orgeh',
            _.chain(aEntries)
              .filter((o) => o.Orgeh !== '00000000')
              .get([0, 'Orgeh'])
              .value()
          );
          oViewModel.setProperty(
            '/entry/Orgeh',
            _.map(aEntries, (o) => _.chain(o).omitBy(_.isNil).omitBy(_.isEmpty).value())
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

          oViewModel.setProperty('/searchConditions/Kostl', _.get(aEntries, [0, 'Kostl']));
          oViewModel.setProperty(
            '/entry/Kostl',
            _.map(aEntries, (o) => _.chain(o).omitBy(_.isNil).omitBy(_.isEmpty).value())
          );
        } catch (oError) {
          throw oError;
        }
      },

      async setAwartLabels() {
        const oViewModel = this.getViewModel();

        try {
          const aTypeLegend = await Client.getEntitySet(this.getModel(ServiceNames.PERSONALTIME), 'TimeTypeLegend', { Werks: this.getAppointeeProperty('Persa') });

          oViewModel.setProperty('/typeLegends', aTypeLegend);
        } catch (oError) {
          throw oError;
        }
      },

      buildCalendar(bCloseLoading = false, sPernr) {
        const oViewModel = this.getViewModel();

        try {
          const aPlanData = _.filter(oViewModel.getProperty('/calendar/raw'), (o) => !sPernr || o.Pernr === sPernr);
          const sYearMonth = oViewModel.getProperty('/searchConditions/Tyymm');
          const iCurrentDayInMonth = moment(sYearMonth).daysInMonth();

          oViewModel.setProperty('/calendar/plans', [
            ...this.getGridHeader(aPlanData, iCurrentDayInMonth, sYearMonth), //
            ...this.getGridBody(aPlanData),
          ]);
          // oViewModel.setProperty('/calendar/raw', []);
        } catch (oError) {
          throw oError;
        } finally {
          if (bCloseLoading) this._oBusyDialog.close();
        }
      },

      getBoxObject({ day = 'NONE', label = '', gubun = 'X', align = 'center', empno, photo, moveToIndi = false, classNames = '', borderNames = 'Default', stripes = 'None', holiday = 'None' }) {
        return { day, label, gubun, align, empno, photo, moveToIndi, classNames, borderNames, stripes, holiday };
      },

      getGridBody(aPlanData) {
        const aPlanValues = _.chain(aPlanData)
          .groupBy('Pernr')
          .values()
          .map((o) => _.orderBy(o, 'Tmdat'))
          .value();

        if (aPlanValues.length > this.readPerSize) {
          this.isReadMore = true;
          this.getViewModel().setProperty('/calendar/remains', _.drop(aPlanValues, this.readPerSize));
        } else {
          this.isReadMore = false;
          this.getViewModel().setProperty('/calendar/remains', []);
        }

        return _.chain(aPlanValues)
          .take(this.readPerSize)
          .reduce((acc, cur) => [...acc, ...this.convertPlanData(cur)], [])
          .value();
      },

      convertPlanData(aGridData) {
        const mWorkType = {
          '': '',
          T: '통', // 통상
          F: '휴',
          D: '주', // 주간
          N: '야', // 야간
        };

        return [
          this.getBoxObject({
            moveToIndi: true,
            align: 'start',
            classNames: 'Normal',
            label: _.get(aGridData, [0, 'Ename']),
            empno: _.get(aGridData, [0, 'Pernr']),
            photo: _.chain(aGridData)
              .get([0, 'Picurl'])
              .thru((s) => (_.isEmpty(s) ? this.getUnknownAvatarImageURL() : s))
              .value(),
          }), //
          this.getBoxObject({ align: 'center', label: _.get(aGridData, [0, 'Zzcaltltx']), classNames: 'Normal' }),
          this.getBoxObject({ align: 'center', label: _.get(aGridData, [0, 'Number']), classNames: 'Normal' }),
          this.getBoxObject({ align: 'center', label: _.get(aGridData, [0, 'Orgtx']), classNames: 'Normal' }),
          this.getBoxObject({ align: 'center', label: _.get(aGridData, [0, 'Rtext']), classNames: 'Normal' }),
          ..._.map(aGridData, (o) => ({
            ..._.chain(o)
              .pick([
                'Pernr',
                'Dayngt',
                'Holyn',
                'Colty',
                'Cssty',
                'Appsttx1',
                'Appsttx2',
                'Atext1',
                'Atext2',
                'Awrsntx1',
                'Awrsntx2',
                'Awart1',
                'Awart2',
                'Atrsn1',
                'Atrsn2',
                'Duration1',
                'Duration2',
              ])
              .omitBy(_.isEmpty)
              .value(),
            label: mWorkType[o.Dayngt],
            align: 'center',
            gubun: !_.isEmpty(o.Dayngt) ? o.Dayngt : 'X',
            day: moment(o.Tmdat).format('YYYYMMDD'),
            holiday: _.isEqual(o.Holyn, 'X') ? 'Holiday' : 'None',
            classNames:
              _.size(o.Cssty) === 3 ? `type${_.chain(o.Cssty).words().take(2).join('').value()}` : _.isEqual(o.Holyn, 'X') ? 'Holiday' : _.includes(['6', '7'], o.Wkday) ? 'Weekend' : 'Normal',
            stripes: _.endsWith(o.Cssty, 'P') ? 'Stripes' : 'None',
            borderNames: !_.isEmpty(o.Ottyp) ? o.Ottyp : 'Default',
          })),
        ];
      },

      getGridHeader(aPlanData, iCurrentDayInMonth, sYearMonth) {
        const bSameMonth = _.isEmpty(sYearMonth) ? false : moment(sYearMonth).isSame(moment(), 'month');
        const iCurrentDate = moment().get('date') - 1;
        const aHolidays = _.isEmpty(aPlanData)
          ? []
          : _.chain(aPlanData)
              .filter({ Holyn: 'X' })
              .uniqBy('Tmday')
              .map((o) => _.toNumber(o.Tmday) - 1)
              .value();

        return [
          this.getBoxObject({ label: this.getBundleText('LABEL_00210'), classNames: 'Header' }), // 성명
          this.getBoxObject({ label: this.getBundleText('LABEL_00136'), classNames: 'Header' }), // 직급/직책
          this.getBoxObject({ label: 'No.', classNames: 'Header' }),
          this.getBoxObject({ label: this.getBundleText('LABEL_00219'), classNames: 'Header' }), // 부서
          this.getBoxObject({ label: this.getBundleText('LABEL_00188'), classNames: 'Header' }), // 근무일정규칙
          ..._.times(iCurrentDayInMonth, (d) =>
            this.getBoxObject({
              label: _.toString(d + 1),
              classNames: 'Header',
              holiday: _.includes(aHolidays, d) ? 'Holiday' : 'None',
              borderNames: bSameMonth && _.isEqual(iCurrentDate, d) ? 'Today' : 'Default',
            })
          ),
        ];
      },

      async loadCalendarData() {
        const oViewModel = this.getViewModel();

        try {
          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const aResults = await Client.getEntitySet(this.getModel(ServiceNames.WORKTIME), 'TeamCalendar', {
            Austy: oViewModel.getProperty('/auth'),
            Pernr: this.getAppointeeProperty('Pernr'),
            ..._.pick(mSearchConditions, ['Tyymm', 'Werks', 'Orgeh', 'Downinc']),
            Kostl: mSearchConditions.Kostl === '00000000' ? null : mSearchConditions.Kostl,
          });

          oViewModel.setProperty('/isLoaded', true);
          oViewModel.setProperty('/calendar/raw', aResults ?? []);

          const mWorkType = {
            '': '',
            T: this.getBundleText('LABEL_00158'), // 통상
            F: 'OFF',
            D: this.getBundleText('LABEL_00184'), // 주간
            N: this.getBundleText('LABEL_00183'), // 야간
          };

          oViewModel.setProperty('/filter/employees', _.chain(aResults).cloneDeep().uniqBy('Pernr').value());
          oViewModel.setProperty(
            '/calendar/excel',
            _.chain(aResults)
              .cloneDeep()
              .groupBy('Pernr')
              .map((o) => {
                return {
                  ..._.chain(o).get(0).pick(['Ename', 'Number', 'Orgtx', 'Ltext', 'Zzcaltltx']).value(),
                  ..._.chain(o)
                    .orderBy('Tmdat')
                    .map((v, i) => ({ [`Dayngt${i}`]: mWorkType[v.Dayngt] }))
                    .reduce((acc, cur) => ({ ...acc, ...cur }), {})
                    .value(),
                };
              })
              .value() ?? []
          );
        } catch (oError) {
          throw oError;
        }
      },

      setCalendarYearMonthLabel() {
        const oViewModel = this.getViewModel();
        const sTyymm = oViewModel.getProperty('/searchConditions/Tyymm');

        oViewModel.setProperty('/calendar/yearMonth', moment(sTyymm).format(this.getBundleText('LABEL_03001'))); // YYYY년 M월
      },

      setCalendarGridHeader() {
        const oViewModel = this.getViewModel();
        const sTyymm = oViewModel.getProperty('/searchConditions/Tyymm');
        const iCurrentDayInMonth = moment(sTyymm).daysInMonth();

        oViewModel.setProperty('/calendar/columnTemplate', `100px 80px 30px 180px 140px repeat(${iCurrentDayInMonth}, 1fr)`);
        oViewModel.setProperty('/calendar/plans', this.getGridHeader([], iCurrentDayInMonth));
      },

      onPressPrevYear() {
        const oViewModel = this.getViewModel();
        const sCurrentYearMonth = oViewModel.getProperty('/searchConditions/Tyymm');

        oViewModel.setProperty('/searchConditions/Tyymm', moment(sCurrentYearMonth).subtract(1, 'months').format('YYYYMM'));

        this.onPressSearch();
      },

      onPressNextYear() {
        const oViewModel = this.getViewModel();
        const sCurrentYearMonth = oViewModel.getProperty('/searchConditions/Tyymm');

        oViewModel.setProperty('/searchConditions/Tyymm', moment(sCurrentYearMonth).add(1, 'months').format('YYYYMM'));

        this.onPressSearch();
      },

      filteredCalendar(sPernr) {
        this._oBusyDialog.open();

        setTimeout(() => this.buildCalendar(true, sPernr), 0);
      },

      onSelectSuggest(oEvent) {
        const oInput = oEvent.getSource();
        const oSelectedSuggestionRow = oEvent.getParameter('selectedRow');

        if (oSelectedSuggestionRow) {
          const oContext = oSelectedSuggestionRow.getBindingContext();
          const sPernr = oContext.getProperty('Pernr');

          const oViewModel = this.getViewModel();

          oViewModel.setProperty('/filter/pernr', sPernr);

          this.filteredCalendar(sPernr);
        }

        oInput.getBinding('suggestionRows').filter([]);
      },

      onSubmitSuggest(oEvent) {
        const oViewModel = this.getViewModel();
        const sInputValue = oEvent.getParameter('value');

        if (!sInputValue) {
          oViewModel.setProperty('/filter/pernr', '');
          oViewModel.setProperty('/filter/ename', '');

          this.filteredCalendar();

          return;
        }

        const aEmployees = oViewModel.getProperty('/filter/employees');
        const [mEmployee] = _.filter(aEmployees, (o) => _.startsWith(o.Ename, sInputValue));

        if (!_.isEmpty(mEmployee)) {
          oViewModel.setProperty('/filter/pernr', mEmployee.Pernr);

          this.filteredCalendar(mEmployee.Pernr);
        } else {
          oViewModel.setProperty('/filter/pernr', '');
          oViewModel.setProperty('/filter/ename', '');

          this.filteredCalendar();
        }
      },

      async onPressDayBox(oEvent) {
        const oViewModel = this.getViewModel();
        const oSource = oEvent.getSource();
        const mCustomData = oSource.data();

        if (mCustomData.moveToIndi) {
          const sAuth = oViewModel.getProperty('/auth');
          const dSearchYearMonth = moment(oViewModel.getProperty('/searchConditions/Tyymm'));

          if (sAuth === 'E') return;

          this.getRouter().navTo('individualWorkState', {
            pernr: mCustomData.empno,
            year: dSearchYearMonth.get('year'),
            month: dSearchYearMonth.get('month'),
          });
        } else {
          const [mSelectedDay] = _.filter(oViewModel.getProperty('/calendar/plans'), (o) => _.isEqual(o.Pernr, mCustomData.pernr) && _.isEqual(o.day, mCustomData.day));

          if (!mSelectedDay || !mSelectedDay.Awrsntx1) {
            return;
          }

          oViewModel.setProperty('/calendar/detail/title', moment(mSelectedDay.day).format('YYYY.MM.DD'));
          oViewModel.setProperty('/calendar/detail/data', mSelectedDay);

          this._oPlanDetailPopover.openBy(oSource);
        }
      },

      onPressExcelDownload() {
        const oViewModel = this.getViewModel();
        const sTyymm = oViewModel.getProperty('/searchConditions/Tyymm');
        const sFileName = `${this.getBundleText('LABEL_03002')}-${sTyymm}`; // 팀캘린더
        const aTableData = oViewModel.getProperty('/calendar/excel');
        const aCustomColumns = [
          { type: 'String', label: this.getBundleText('LABEL_00210'), property: 'Ename' },
          { type: 'String', label: this.getBundleText('LABEL_00136'), property: 'Zzcaltltx' },
          { type: 'String', label: 'No.', property: 'Number' },
          { type: 'String', label: this.getBundleText('LABEL_00219'), property: 'Orgtx' },
          ..._.times(moment(`${sTyymm}01`).daysInMonth(), (d) => ({ type: 'String', label: _.toString(d + 1), property: `Dayngt${d}` })),
        ];

        this.TableUtils.export({
          sFileName,
          aCustomColumns,
          aTableData,
        });
      },
    });
  }
);
