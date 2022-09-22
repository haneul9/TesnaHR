sap.ui.define(
  [
    //
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  (
    //
    AppUtils,
    Client,
    ServiceNames,
    BaseController
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.commuteRecord.List', {
      LIST_TABLE_ID: 'commuteRecordListTable',
      ROUTE_NAME: '',

      getCurrentLocationText() {
        return this.getBundleText('LABEL_06001'); // 근태타각정보조회
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      rowHighlight(sValue) {
        const vValue = !parseInt(sValue, 10) ? sValue : parseInt(sValue, 10);

        switch (vValue) {
          case 10:
            // 오류
            return sap.ui.core.IndicationColor.Indication02;
          case 20:
            // 확인
            return sap.ui.core.IndicationColor.Indication03;
          case 30:
            // 수정완료
            return sap.ui.core.IndicationColor.Indication04;
          case 50:
            // 정상
            return sap.ui.core.IndicationColor.Indication05;
          default:
            return null;
        }
      },

      /**
       * @override
       */
      onBeforeShow() {
        BaseController.prototype.onBeforeShow.apply(this, arguments);

        this.TableUtils.adjustRowSpan({
          oTable: this.byId(this.LIST_TABLE_ID),
          aColIndices: [4, 5, 6, 7, 8, 9, 10, 15, 16],
          sTheadOrTbody: 'thead',
          bIncludeFixedColumns: true,
          aFixedColIndices: [0, 1, 2, 3, 4, 5, 6, 7],
        });
      },

      initializeModel() {
        return {
          busy: false,
          auth: '',
          isPossibleApproval: true,
          contentsBusy: {
            buttonApproval: false,
            search: false,
            table: false,
          },
          entry: {
            Persa: [],
            Orgeh: [],
          },
          searchConditions: {
            Werks: '',
            Orgeh: '',
            Apbeg: moment().subtract(1, 'month').add(1, 'day').hours(9).toDate(),
            Apend: moment().hours(9).toDate(),
            Pernr: '',
            Ename: '',
            Errdata: '',
          },
          listInfo: {
            totalCount: 0,
            rowCount: 0,
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

          await this.setPersaEntry();
          await this.setOrgehEntry();

          await Promise.all([
            this.retrieveTimePernrList(), //
            this.retrieveList(),
          ]);
        } catch (oError) {
          this.debug('Controller > commuteRecord > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false);
        }
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
        } catch (oError) {
          this.debug('Controller > commuteRecord > onChangePersa Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'search');
        }
      },

      async onChangeOrgeh() {
        try {
          this.setContentsBusy(true, 'search');

          await this.retrieveTimePernrList();
        } catch (oError) {
          this.debug('Controller > commuteRecord > onChangeOrgeh Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'search');
        }
      },

      onSelectSuggest(oEvent) {
        const oViewModel = this.getViewModel();
        const oInput = oEvent.getSource();
        const oSelectedSuggestionRow = oEvent.getParameter('selectedRow');

        if (oSelectedSuggestionRow) {
          const oContext = oSelectedSuggestionRow.getBindingContext();
          const mSuggestionData = oContext.getObject();

          oViewModel.setProperty('/searchConditions/Ename', mSuggestionData.Ename);
          oViewModel.setProperty('/searchConditions/Pernr', mSuggestionData.Pernr);

          oViewModel.refresh();
        }

        oInput.getBinding('suggestionRows').filter([]);
      },

      onSubmitSuggest(oEvent) {
        const oViewModel = this.getViewModel();

        const sInputValue = oEvent.getParameter('value');
        if (!sInputValue) {
          oViewModel.setProperty('/searchConditions/Ename', '');
          oViewModel.setProperty('/searchConditions/Pernr', '');
          oViewModel.refresh();

          return;
        }

        const aEmployees = oViewModel.getProperty('/entry/Employees');
        const [mEmployee] = _.filter(aEmployees, (o) => _.startsWith(o.Ename, sInputValue));

        if (!_.isEmpty(mEmployee)) {
          oViewModel.setProperty('/searchConditions/Ename', mEmployee.Ename);
          oViewModel.setProperty('/searchConditions/Pernr', mEmployee.Pernr);
        } else {
          oViewModel.setProperty('/searchConditions/Ename', '');
          oViewModel.setProperty('/searchConditions/Pernr', '');
        }

        oViewModel.refresh();
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

      onPressSearch() {
        this.setContentsBusy(true, ['search', 'table']);

        setTimeout(async () => await this.retrieveList(), 0);
      },

      onPressExcelDownload() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const sFileName = this.getBundleText('LABEL_00282', 'LABEL_06001'); // {근태타각정보조회}_목록

        this.TableUtils.export({ oTable, sFileName });
      },

      async retrieveList() {
        const oViewModel = this.getViewModel();

        try {
          const oTable = this.byId(this.LIST_TABLE_ID);
          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const sAuth = oViewModel.getProperty('/auth');

          if (!mSearchConditions.Werks || !mSearchConditions.Orgeh) return;

          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'TimeReaderInfo', {
            ..._.pick(mSearchConditions, ['Werks', 'Orgeh', 'Pernr', 'Errdata']),
            Austy: sAuth,
            Apbeg: this.DateUtils.parse(mSearchConditions.Apbeg),
            Apend: this.DateUtils.parse(mSearchConditions.Apend),
          });

          oViewModel.setProperty('/listInfo', {
            ...oViewModel.getProperty('/listInfo'),
            ...this.TableUtils.count({ oTable, aRowData, sStatCode: 'Tstat' }),
          });
          oViewModel.setProperty(
            '/list',
            _.map(aRowData, (o) => _.omit(o, '__metadata'))
          );
        } catch (oError) {
          this.debug('Controller > commuteRecord > retrieveList Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, ['search', 'table']);
        }
      },

      async retrieveTimePernrList() {
        try {
          const oViewModel = this.getViewModel();
          const sAuth = oViewModel.getProperty('/auth');

          if (sAuth === 'E') return;

          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const aResults = await Client.getEntitySet(this.getModel(ServiceNames.WORKTIME), 'TimePernrList', {
            Austy: sAuth,
            Begda: moment().hours(9).toDate(),
            Werks: mSearchConditions.Werks,
            Orgeh: !mSearchConditions.Orgeh || mSearchConditions.Orgeh === '00000000' ? '' : mSearchConditions.Orgeh,
          });

          oViewModel.setProperty(
            '/entry/Employees',
            _.map(aResults, (o) => _.omit(o, '__metadata'))
          );
        } catch (oError) {
          throw oError;
        }
      },
    });
  }
);
