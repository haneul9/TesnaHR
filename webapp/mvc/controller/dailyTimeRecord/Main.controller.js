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

    return BaseController.extend('sap.ui.tesna.mvc.controller.dailyTimeRecord.Main', {
      LIST_TABLE_ID: 'dailyTimeRecordTable',

      getCurrentLocationText() {
        return this.getBundleText('LABEL_08014'); // 근무일지 일별조회
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      rowHighlight(sValue) {
        switch (sValue) {
          case 'X':
            // 오류
            return sap.ui.core.IndicationColor.Indication03;
          default:
            return sap.ui.core.IndicationColor.Indication05;
        }
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
            Kostl: [],
            Employees: [],
          },
          searchConditions: {
            Werks: '',
            Orgeh: '',
            Kostl: '',
            Begmm: moment().subtract(1, 'month').format('YYYYMM'),
            Endmm: moment().format('YYYYMM'),
            Pernr: '',
            Ename: '',
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

        try {
          oViewModel.setSizeLimit(500);
          this.setContentsBusy(true);

          oViewModel.setProperty('/auth', this.isHass() ? 'H' : this.isMss() ? 'M' : 'E');
          oViewModel.setProperty('/searchConditions/Begmm', oParameter.tyymm);
          oViewModel.setProperty('/searchConditions/Endmm', oParameter.tyymm);

          const sKostl = !oParameter.kostl || _.toUpper(oParameter.kostl) === 'NA' ? null : oParameter.kostl;
          const sPernr = !oParameter.pernr || _.toUpper(oParameter.pernr) === 'NA' ? null : oParameter.pernr;
          const sEname = !oParameter.ename || _.toUpper(oParameter.ename) === 'NA' ? null : oParameter.ename;

          await this.setPersaEntry(oParameter.werks);
          await this.setOrgehEntry(oParameter.orgeh);
          await this.setKostlEntry(sKostl);

          await Promise.all([
            this.retrieveTimePernrList(sPernr, sEname), //
            this.retrieveList(),
          ]);
        } catch (oError) {
          this.debug('Controller > dailyTimeRecord > onObjectMatched Error', oError);

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

      async setPersaEntry(sWerks) {
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
            oViewModel.setProperty('/searchConditions/Werks', !sWerks ? _.get(aEntries, [0, 'Persa']) : sWerks);
          } else {
            const mAppointeeData = this.getAppointeeData();

            oViewModel.setProperty('/entry/Persa', [_.pick(mAppointeeData, ['Persa', 'Pbtxt'])]);
            oViewModel.setProperty('/searchConditions/Werks', mAppointeeData.Persa);
          }
        } catch (oError) {
          throw oError;
        }
      },

      async setOrgehEntry(sOrgeh) {
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
          oViewModel.setProperty('/searchConditions/Orgeh', !sOrgeh ? _.get(aEntries, [0, 'Orgeh']) : sOrgeh);
        } catch (oError) {
          throw oError;
        }
      },

      async setKostlEntry(sKostl) {
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

          oViewModel.setProperty('/searchConditions/Kostl', sKostl ? sKostl : _.get(aEntries, [sAuth === 'E' ? 1 : 0, 'Kostl']));
          oViewModel.setProperty(
            '/entry/Kostl',
            _.map(aEntries, (o) => _.chain(o).omit('__metadata').omitBy(_.isNil).omitBy(_.isEmpty).value())
          );
        } catch (oError) {
          throw oError;
        }
      },

      setTableColorStyle() {
        const oTable = this.byId(this.LIST_TABLE_ID);

        setTimeout(() => {
          this.TableUtils.setColorColumn({
            oTable,
            mColorMap: {
              10: 'bgType10',
              11: 'bgType10',
              12: 'bgType10',
              13: 'bgType10',
              14: 'bgType11',
              15: 'bgType11',
              16: 'bgType11',
              17: 'bgType11',
              18: 'bgType11',
              19: 'bgType11',
              20: 'bgType11',
              21: 'bgType11',
            },
          });
        }, 100);
      },

      async retrieveTimePernrList(sPernr, sEname) {
        try {
          const oViewModel = this.getViewModel();
          const sAuth = oViewModel.getProperty('/auth');

          oViewModel.setProperty('/searchConditions/Pernr', sPernr || '');
          oViewModel.setProperty('/searchConditions/Ename', sEname || '');

          if (sAuth === 'E') return;

          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const aResults = await Client.getEntitySet(this.getModel(ServiceNames.WORKTIME), 'TimePernrList', {
            Austy: sAuth,
            Begda: moment().hours(9).toDate(),
            Werks: mSearchConditions.Werks,
            Orgeh: !mSearchConditions.Orgeh || mSearchConditions.Orgeh === '00000000' ? '' : mSearchConditions.Orgeh,
            Kostl2: !mSearchConditions.Kostl || mSearchConditions.Kostl === '00000000' ? '' : mSearchConditions.Kostl,
          });

          oViewModel.setProperty(
            '/entry/Employees',
            _.map(aResults, (o) => _.omit(o, '__metadata'))
          );
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

          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'DailyTimeResult', {
            Austy: sAuth,
            ..._.pick(mSearchConditions, ['Werks', 'Orgeh', 'Pernr', 'Begmm', 'Endmm']),
            Kostl: mSearchConditions.Kostl === '00000000' ? null : mSearchConditions.Kostl,
          });

          oViewModel.setProperty('/listInfo', {
            ...oViewModel.getProperty('/listInfo'),
            ...this.TableUtils.count({ oTable, aRowData, sStatCode: 'Tstat' }),
          });
          oViewModel.setProperty(
            '/list',
            _.map(aRowData, (o) => ({
              ..._.omit(o, '__metadata'),
              Dedhr: this.TimeUtils.nvl(o.Dedhr),
              Lastclock: o.Lastclock === '00:00~00:00' ? '' : o.Lastclock,
            }))
          );
        } catch (oError) {
          this.debug('Controller > dailyTimeRecord > retrieveList Error', oError);

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
          this.debug('Controller > dailyTimeRecord > onChangePersa Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'search');
        }
      },

      async onChangeOrgeh() {
        try {
          this.setContentsBusy(true, 'search');

          await this.setKostlEntry();
          await this.retrieveTimePernrList();
        } catch (oError) {
          this.debug('Controller > dailyTimeRecord > onChangeOrgeh Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'search');
        }
      },

      async onChangeKostl() {
        try {
          this.setContentsBusy(true, 'search');

          await this.retrieveTimePernrList();
        } catch (oError) {
          this.debug('Controller > dailyTimeRecord > onChangeKostl Error', oError);

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

      onSelectRow(oEvent) {
        const oViewModel = this.getViewModel();
        const sPath = oEvent.getParameters().rowBindingContext.getPath();
        const mRowData = oViewModel.getProperty(sPath);
        const mSearchConditions = oViewModel.getProperty('/searchConditions');
        const sAuth = this.getViewModel().getProperty('/auth');
        const sHost = window.location.href.split('#')[0];
        const sRouteName = _.chain(sAuth === 'E' ? null : _.lowerCase(sAuth))
          .concat('commuteRecord')
          .compact()
          .join('/')
          .value();
        const mParams = [
          mSearchConditions.Werks, //
          mSearchConditions.Orgeh,
          !mSearchConditions.Kostl ? 'NA' : mSearchConditions.Kostl,
          moment(mRowData.Tmdat).format('YYYY-MM-DD'),
        ];

        if (!mSearchConditions.Werks || !mSearchConditions.Orgeh || !mRowData.Tmdat) return;

        window.open(`${sHost}#/${sRouteName}/${mParams.join('/')}`, '_blank');
      },

      onPressSearch() {
        this.setContentsBusy(true, ['search', 'table']);

        setTimeout(async () => await this.retrieveList(), 0);
      },

      onPressExcelDownload() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const sFileName = this.getBundleText('LABEL_08014', 'LABEL_08001'); // {근무일지 일별조회}_목록

        this.TableUtils.export({ oTable, sFileName });
      },
    });
  }
);
