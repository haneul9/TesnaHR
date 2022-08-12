sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/base/Object',
    'sap/ui/core/Fragment',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
  ],
  (
    // prettier 방지용 주석
    BaseObject,
    Fragment,
    Client,
    ServiceNames
  ) => {
    'use strict';

    return BaseObject.extend('sap.ui.tesna.mvc.controller.individualWorkState.YearPlanBoxHandler', {
      constructor: function ({ oController, sPernr, sYear }) {
        this.oController = oController;
        this.sPernr = sPernr;

        this.getYearPlan(sYear);
      },

      makeCalendarControl() {
        const oViewModel = this.oController.getViewModel();
        const mBody = _.times(12, this.getWeekBody.bind(this));

        oViewModel.setProperty('/plans', [...this.getWeekHeader(), ...mBody.reduce((a, b) => [...a, ...b], [])]);
      },

      getBoxObject({ day = 'NONE', label = '', dayOrNight = '', classNames = '', borderNames = 'Default', stripes = 'None', holiday = 'None' }) {
        return { day, label, dayOrNight, classNames, borderNames, stripes, holiday };
      },

      getYearPlan(sYear = String(moment().year())) {
        setTimeout(async () => {
          const oViewModel = this.oController.getViewModel();
          const sPersa = this.oController.getAppointeeProperty('Persa');

          const aTimeTypes = oViewModel.getProperty('/TimeTypes');

          if (_.isEmpty(aTimeTypes)) {
            oViewModel.setProperty('/TimeTypes', await Client.getEntitySet(this.oController.getModel(ServiceNames.PERSONALTIME), 'TimeTypeLegend', { Werks: sPersa }));
          }

          // 1년근태
          const aPersonalTimes = await Client.getEntitySet(this.oController.getModel(ServiceNames.WORKTIME), 'PersonalTimeDashboard2', {
            Werks: sPersa,
            Pernr: this.sPernr,
            Tmyea: sYear,
          });

          oViewModel.setProperty(
            '/yearPlan',
            _.map(aPersonalTimes, (o) => ({ ...o, FullDate: `${o.Tmyea}${o.Tmmon}${o.Tmday}` }))
          );

          this.makeCalendarControl();

          this.oController.setContentsBusy(false, 'calendar');
        }, 0);
      },

      getWeekBody(month) {
        const oViewModel = this.oController.getViewModel();
        const iYear = oViewModel.getProperty('/year');
        const dFirstDayOfYear = moment({ y: iYear, M: month, d: 1 });
        const iDaysInMonth = dFirstDayOfYear.daysInMonth();
        const iFirstDay = dFirstDayOfYear.day();
        const iLeadingNoneCount = iFirstDay === 0 ? 6 : iFirstDay - 1;
        const iTrailingNoneCount = 37 - iLeadingNoneCount - iDaysInMonth;
        const aLeadingNoneBox = _.times(iLeadingNoneCount, () => this.getBoxObject({ classNames: 'None' })) ?? [];
        const aTrailingNoneBox = _.times(iTrailingNoneCount, () => this.getBoxObject({ classNames: 'None' })) ?? [];

        return [
          this.getBoxObject({ label: _.toUpper(dFirstDayOfYear.format('MMM')), classNames: 'Header' }), //
          ...aLeadingNoneBox,
          ..._.times(iDaysInMonth, (d) => this.getActivationDayBody(month, ++d)),
          ...aTrailingNoneBox,
        ];
      },

      getWeekHeader() {
        const aWeekNames = _.times(7, (e) => {
          return `${this.oController.getBundleText(`LABEL_020${e + 25}`)}`; // 월,화,수,목,금,토,일
        });
        const mWeekHeaders = aWeekNames.map((o) => this.getBoxObject({ label: o, classNames: 'Header' }));

        return [
          this.getBoxObject({ label: this.oController.getBundleText('LABEL_00147'), classNames: 'Header' }),
          ...mWeekHeaders,
          ...mWeekHeaders,
          ...mWeekHeaders,
          ...mWeekHeaders,
          ...mWeekHeaders,
          this.getBoxObject({ label: this.oController.getBundleText('LABEL_02025'), classNames: 'Header' }),
          this.getBoxObject({ label: this.oController.getBundleText('LABEL_02026'), classNames: 'Header' }),
        ];
      },

      getActivationDayBody(iMonth, iDay) {
        const oViewModel = this.oController.getViewModel();
        const oScheduleData = oViewModel.getProperty('/yearPlan');
        const iYear = oViewModel.getProperty('/year');
        const dDate = moment({ y: iYear, M: iMonth, d: iDay });
        const sFormatDate = dDate.format('YYYYMMDD');
        const iDayNum = dDate.day();
        let sClassNames = '';
        let sBorderNames = 'Default';
        let sStripes = 'None';
        let sHoliday = 'None';
        let sDayOrNight = '';

        if (iDayNum % 6 === 0) {
          sClassNames = 'Weekend';
        } else {
          sClassNames = 'Normal';
        }

        if (moment().isSame(dDate, 'day')) {
          sBorderNames = 'Today';
        }

        if (!_.isEmpty(oScheduleData)) {
          const mDateObject = _.find(oScheduleData, { FullDate: sFormatDate });

          if (!_.isEmpty(mDateObject.Cssty) && _.size(mDateObject.Cssty) === 3) {
            const [sColor, sDuration, sStyle] = _.words(mDateObject.Colty);

            sClassNames = `type${sColor}${sDuration === '1' ? '' : sDuration}`;
            if (sStyle === 'P') sStripes = 'Stripes';
          }

          if (mDateObject.Holyn === 'X') {
            sHoliday = 'Holiday';
            sClassNames = 'Type15';
          }

          sDayOrNight = mDateObject.Dayngt;
        }

        return this.getBoxObject({ day: sFormatDate, label: String(iDay), dayOrNight: sDayOrNight, holiday: sHoliday, classNames: sClassNames, borderNames: sBorderNames, stripes: sStripes });
      },

      async onPressPrevYear() {
        const oViewModel = this.oController.getViewModel();
        const iCurrentYear = oViewModel.getProperty('/year');

        oViewModel.setProperty('/year', iCurrentYear - 1);
        this.oController.YearPlanBoxHandler.getYearPlan(iCurrentYear - 1);
      },

      async onPressNextYear() {
        const oViewModel = this.oController.getViewModel();
        const iCurrentYear = oViewModel.getProperty('/year');

        oViewModel.setProperty('/year', iCurrentYear + 1);
        this.oController.YearPlanBoxHandler.getYearPlan(iCurrentYear + 1);
      },

      // 요일 선택시
      async onClickDay(oEvent) {
        const oViewModel = this.oController.getViewModel();
        const oEventSource = oEvent.getSource();
        const mData = oEventSource.data();
        const [mSelectedDay] = _.filter(oViewModel.getProperty('/yearPlan'), (e) => {
          return e.FullDate === mData.day;
        });

        if (!mSelectedDay || (!mSelectedDay.Awrsntx1 && !mSelectedDay.Awrsntx2)) {
          return;
        }

        oViewModel.setProperty('/YearPlan/detail', mSelectedDay);
        oViewModel.setProperty('/YearPlan/title', moment(mSelectedDay.FullDate).format('YYYY.MM.DD'));

        if (!this.oController._oPopover) {
          const oView = this.oController.getView();

          this.oController._oPopover = await Fragment.load({
            id: oView.getId(),
            name: 'sap.ui.tesna.mvc.view.individualWorkState.fragment.YearPlanPopover',
            controller: this.oController,
          });

          oView.addDependent(this.oController._oPopover);
        }

        this.oController._oPopover.openBy(oEventSource);
      },
    });
  }
);
