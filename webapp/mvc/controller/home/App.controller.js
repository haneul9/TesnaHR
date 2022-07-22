sap.ui.define(
  [
    //
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  (
    //
    AppUtils,
    BaseController
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.home.App', {
      initializeModel() {
        return {
          busy: false,
          summary: {
            Bet05: '1000000',
            Bet06: '1000000',
            Bet07: '1000000',
          },
          search: {
            year: moment().format('YYYY'),
          },
          listInfo: {
            rowCount: 1,
          },
          list: [],
        };
      },

      async onObjectMatched() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setData(this.initializeModel());
          oViewModel.setProperty('/busy', true);
        } catch (oError) {
          this.debug('Controller > home > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
        } finally {
          oViewModel.setProperty('/busy', false);
        }
      },

      onPressSearch() {},

      onPressExcelDownload() {},
    });
  }
);
