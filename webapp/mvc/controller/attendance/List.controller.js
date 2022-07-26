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

    return BaseController.extend('sap.ui.tesna.mvc.controller.attendance.List', {
      LIST_TABLE_ID: 'attendanceTable',
      ROUTE_NAME: '',

      getCurrentLocationText() {
        return this.getBundleText('LABEL_05001'); // 근태신청
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      initializeModel() {
        return {
          busy: false,
          routeName: '',
          isActiveSearch: false,
          quota: {
            isSecondVisible: false,
            10: { Kotxt: this.getBundleText('LABEL_05002'), Crecnt: 0, Usecnt: 0 }, // 연차쿼터
            15: { Kotxt: this.getBundleText('LABEL_05003'), Crecnt: 0, Usecnt: 0 }, // 연차(1년미만)쿼터
            20: { Kotxt: this.getBundleText('LABEL_05004'), Crecnt: 0, Usecnt: 0 }, // 하계휴가쿼터
            30: { Kotxt: this.getBundleText('LABEL_05005'), Crecnt: 0, Usecnt: 0 }, // 보건휴가
            40: { Kotxt: this.getBundleText('LABEL_05006'), Crecnt: 0, Usecnt: 0 }, // 장기근속휴가
            50: { Kotxt: this.getBundleText('LABEL_05007'), Crecnt: 0, Usecnt: 0 }, // 가족돌봄휴가
          },
          searchConditions: {
            Werks: '',
            Orgeh: '',
            Kostl: '',
            Apbeg: moment().startOf('year').hours(9).toDate(),
            Apend: moment().endOf('year').hours(9).toDate(),
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
          parameter: {
            selectedIndices: [],
            rowData: [],
          },
        };
      },

      getEmployeeSearchDialogCustomOptions() {
        const mSessionInfo = this.getSessionData();
        const bIsEss = _.isEqual(this.currentAuth(), 'E');

        return {
          fieldEnabled: { Persa: !bIsEss, Orgeh: !bIsEss },
          searchConditions: {
            Persa: bIsEss ? mSessionInfo.Werks : 'ALL',
            Orgeh: bIsEss ? mSessionInfo.Orgeh : null,
            Orgtx: bIsEss ? mSessionInfo.Orgtx : null,
          },
        };
      },

      getEmployeeSearchDialogOnLoadSearch() {
        return _.isEqual(this.currentAuth(), 'E');
      },

      async onObjectMatched(oParameter, sRouteName) {
        const oViewModel = this.getViewModel();

        this.ROUTE_NAME = sRouteName;

        try {
          oViewModel.setSizeLimit(1000);
          oViewModel.setProperty('/busy', true);
          oViewModel.setProperty('/routeName', sRouteName);
          oViewModel.setProperty('/auth', this.currentAuth());

          if (!this.isNavBackDetail()) {
            await this.setPersaEntry();
            await this.setOrgehEntry();
            await this.setKostlEntry();
          }

          this.toggleActiveSearch();

          await Promise.all([
            this.retrieveQuota(), //
            this.retrieveList(),
          ]);
        } catch (oError) {
          this.debug('Controller > Attendance List > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
        } finally {
          oViewModel.setProperty('/busy', false);
        }
      },

      async retrieveQuota() {
        const oViewModel = this.getViewModel();

        try {
          const aQuotaResultData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'AbsQuotaList', {
            Pernr: this.getAppointeeProperty('Pernr'),
            Tmyea: moment().format('YYYY'),
            Prcty: 'A' // 2022-11-07 현재일 기준 
          });

          const mQuotaResult = _.reduce(
            aQuotaResultData,
            (acc, { Ktart, Kotxt, Crecnt, Usecnt, Balcnt }) => ({
              ...acc,
              [Ktart]: {
                Kotxt,
                Crecnt: _.toNumber(Crecnt) ?? 0,
                Usecnt: _.toNumber(Usecnt) ?? 0,
                Balcnt: _.toNumber(Balcnt) ?? 0,
              },
            }),
            {}
          );

          const mQuota = oViewModel.getProperty('/quota');

          oViewModel.setProperty('/quota', { ...mQuota, ...mQuotaResult, isSecondVisible: false });
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

          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'LeaveApplList', {
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
            _.map(aRowData, (o) => ({
              ...o,
              AppdaFormatted: this.DateUtils.format(o.Appda),
              SgndaFormatted: this.DateUtils.format(o.Sgnda),
            }))
          );

          this.TableUtils.clearTable(oTable);
        } catch (oError) {
          throw oError;
        }
      },

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

          const sAuth = oViewModel.getProperty('/auth');

          oViewModel.setProperty('/searchConditions/Kostl', _.get(aEntries, [sAuth === 'E' ? 1 : 0, 'Kostl']));
          oViewModel.setProperty(
            '/entry/Kostl',
            _.map(aEntries, (o) => _.chain(o).omitBy(_.isNil).omitBy(_.isEmpty).value())
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

          if (this.isMss()) {
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
          this.debug('Controller > Attendance List > onPressSearch Error', oError);

          AppUtils.handleError(oError);
        } finally {
          oViewModel.setProperty('/busy', false);
        }
      },

      async onChangeWerks() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/busy', true);

          await this.setOrgehEntry();
          await this.setKostlEntry();

          this.toggleActiveSearch();
        } catch (oError) {
          this.debug('Controller > Attendance List > onChangePersa Error', oError);

          AppUtils.handleError(oError);
        } finally {
          oViewModel.setProperty('/busy', false);
        }
      },

      async onChangeOrgeh() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/busy', true);

          await this.setKostlEntry();

          this.toggleActiveSearch();
        } catch (oError) {
          this.debug('Controller > Attendance List > onChangeOrgeh Error', oError);

          AppUtils.handleError(oError);
        } finally {
          oViewModel.setProperty('/busy', false);
        }
      },

      onChangeKostl() {
        this.toggleActiveSearch();
      },

      onPressExcelDownload() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const sFileName = this.getBundleText('LABEL_00185', 'LABEL_05001'); // {근태신청}_목록

        this.TableUtils.export({ oTable, sFileName });
      },

      onSelectRow(oEvent) {
        const sPath = oEvent.getParameters().rowBindingContext.getPath();
        const mRowData = this.getViewModel().getProperty(sPath);

        this.getRouter().navTo(`${this.ROUTE_NAME}-detail`, {
          appno: mRowData.Appno,
          werks: mRowData.Werks,
          orgeh: mRowData.Orgeh,
          kostl: mRowData.Kostl,
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
            kostl: !mSessionData.Kostl ? 'NA' : mSessionData.Kostl,
          });
        } else {
          const mSearchConditions = oViewModel.getProperty('/searchConditions');

          this.getRouter().navTo(`${this.ROUTE_NAME}-detail`, {
            appno: 'N',
            werks: mSearchConditions.Werks,
            orgeh: mSearchConditions.Orgeh,
            kostl: !mSearchConditions.Kostl || mSearchConditions.Kostl === '00000000' ? 'NA' : mSearchConditions.Kostl,
          });
        }
      },

      /*****************************************************************
       * ! Call oData
       *****************************************************************/
    });
  }
);
