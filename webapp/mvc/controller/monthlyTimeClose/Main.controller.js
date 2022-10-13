sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  function (AppUtils, Client, ServiceNames, BaseController) {
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
            Tyymm: moment().format('YYYYMM'),
          },
          table1: {
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

          await this.setPersaEntry();
          await this.setOrgehEntry();

          await this.retrieveList();
        } catch (oError) {
          this.debug('Controller > monthlyTimeClose > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false);
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

      async retrieveList() {
        const oViewModel = this.getViewModel();

        try {
          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const sAuth = oViewModel.getProperty('/auth');

          if (!mSearchConditions.Werks || !mSearchConditions.Orgeh) return;

          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'MonthlyCloseOverview', {
            Austy: sAuth,
            ..._.pick(mSearchConditions, ['Werks', 'Orgeh', 'Tyymm']),
          });

          oViewModel.setProperty('/table1', {
            totalCount: aRowData.length || 0,
            rowCount: Math.min(aRowData.length, 5),
            list: _.map(aRowData, (o) => _.omit(o, '__metadata')),
          });
        } catch (oError) {
          this.debug('Controller > monthlyTimeClose > retrieveList Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setTableColorStyle();
          this.setContentsBusy(false, ['search', 'table']);
        }
      },

      async onChangeWerks() {
        try {
          this.setContentsBusy(true, 'search');

          await this.setOrgehEntry();
          await this.setKostlEntry();
        } catch (oError) {
          this.debug('Controller > monthlyTimeClose > onChangePersa Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'search');
        }
      },

      onSelectRow(oEvent) {
        const oViewModel = this.getViewModel();
        const sPath = oEvent.getParameters().rowBindingContext.getPath();
        const mRowData = oViewModel.getProperty(sPath);
        const mSearchConditions = oViewModel.getProperty('/searchConditions');
        const sAuth = this.getViewModel().getProperty('/auth');
        const sHost = window.location.href.split('#')[0];
        const sRouteName = _.chain(sAuth === 'E' ? null : _.lowerCase(sAuth))
          .concat('dailyTimeRecord')
          .compact()
          .join('/')
          .value();
        const mParams = [
          mSearchConditions.Werks,
          mSearchConditions.Orgeh,
          !mSearchConditions.Kostl ? 'NA' : mSearchConditions.Kostl,
          !mSearchConditions.Pernr ? 'NA' : mSearchConditions.Pernr,
          !mSearchConditions.Ename ? 'NA' : mSearchConditions.Ename,
          mRowData.Tyymm,
        ];

        if (!mSearchConditions.Werks || !mSearchConditions.Orgeh || !mRowData.Tyymm) return;

        window.open(`${sHost}#/${sRouteName}/${mParams.join('/')}`, '_blank');
      },

      onPressSearch() {
        this.setContentsBusy(true, ['search', 'table']);

        setTimeout(async () => await this.retrieveList(), 0);
      },

      onPressExcelDownload() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const sFileName = this.getBundleText('LABEL_00185', 'LABEL_08001'); // {근무일지 월별조회}_목록

        this.TableUtils.export({ oTable, sFileName });
      },

      rowHighlight(sValue) {
        switch (sValue) {
          case '미마감':
            // 오류
            return sap.ui.core.IndicationColor.Indication02;
          case '마감':
            // 정상
            return sap.ui.core.IndicationColor.Indication05;
          default:
            return null;
        }
      },
    });
  }
);
