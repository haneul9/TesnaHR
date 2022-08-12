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

    return BaseController.extend('sap.ui.tesna.mvc.controller.shift.List', {
      LIST_TABLE_ID: 'shiftListTable',
      ROUTE_NAME: '',

      getCurrentLocationText() {
        return this.getBundleText('LABEL_01002'); // 근무일정변경신청
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      initializeModel() {
        return {
          busy: false,
          auth: '',
          isPossibleApproval: true,
          isActiveSearch: false,
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
          },
          listInfo: {
            totalCount: 0,
            rowCount: 1,
            isShowProgress: false,
            ObjTxt2: this.getBundleText('LABEL_00359'), // 기안
          },
          list: [],
        };
      },

      onBeforeShow() {
        BaseController.prototype.onBeforeShow.apply(this, arguments);

        this.TableUtils.adjustRowSpan({
          oTable: this.byId(this.LIST_TABLE_ID),
          aColIndices: [0, 1, 2, 7, 8, 9, 10, 11, 12],
          sTheadOrTbody: 'thead',
        });
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

          this.toggleActiveSearch();

          await this.retrieveList();
        } catch (oError) {
          this.debug('Controller > shift > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false);
        }
      },

      toggleActiveSearch() {
        const oViewModel = this.getViewModel();
        const mSearchConditions = oViewModel.getProperty('/searchConditions');
        const sAuth = oViewModel.getProperty('/auth');

        oViewModel.setProperty('/isActiveSearch', _.isEqual(sAuth, 'H') ? true : !_.isEmpty(mSearchConditions.Orgeh));
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

      async retrieveList() {
        const oViewModel = this.getViewModel();

        try {
          const oTable = this.byId(this.LIST_TABLE_ID);
          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const sAuth = oViewModel.getProperty('/auth');

          if (!mSearchConditions.Werks || !mSearchConditions.Orgeh) return;

          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'ShiftChangeApply', {
            Austy: sAuth,
            Werks: mSearchConditions.Werks,
            Orgeh: mSearchConditions.Orgeh,
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

      onChangeWerks() {
        try {
          this.setContentsBusy(true, 'search');

          this.setOrgehEntry();
          this.toggleActiveSearch();
        } catch (oError) {
          this.debug('Controller > shift > onChangePersa Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'search');
        }
      },

      onChangeOrgeh() {
        this.toggleActiveSearch();
      },

      onPressSearch() {
        try {
          this.setContentsBusy(true, ['search', 'table']);

          this.retrieveList();
        } catch (oError) {
          this.debug('Controller > shift > onPressSearch Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, ['search', 'table']);
        }
      },

      onPressNewApprovalBtn() {
        const mSearchConditions = this.getViewModel().getProperty('/searchConditions');

        this.getRouter().navTo(`${this.ROUTE_NAME}-detail`, { appno: 'N', werks: mSearchConditions.Werks, orgeh: mSearchConditions.Orgeh });
      },

      onSelectRow(oEvent) {
        const sPath = oEvent.getParameters().rowBindingContext.getPath();
        const mRowData = this.getViewModel().getProperty(sPath);

        this.getRouter().navTo(`${this.ROUTE_NAME}-detail`, { appno: mRowData.Appno, werks: mRowData.Werks, orgeh: mRowData.Orgeh });
      },

      onPressExcelDownload() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const sFileName = this.getBundleText('LABEL_00282', 'LABEL_01002'); // {근무일정변경신청}_목록

        this.TableUtils.export({ oTable, sFileName });
      },
    });
  }
);