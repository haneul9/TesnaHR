sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/mvc/controller/BaseController',
    ],
    (
      // prettier 방지용 주석
      AppUtils,
      BaseController
    ) => {
      'use strict';
  
      return BaseController.extend('sap.ui.tesna.mvc.controller.NotFound', {
        onInit() {
          this.getRouter().getTarget('notFound').attachDisplay(this._onNotFoundDisplayed, this);
        },
  
        _onNotFoundDisplayed(oEvent) {
          this._oData = oEvent.getParameter('data');
  
          AppUtils.setAppBusy(false).setMenuBusy(false);
  
          if (this._oData.error) {
            AppUtils.handleError(this._oData.error);
          }
        },
  
        // override the parent's onNavBack (inherited from BaseController)
        onNavBack(...aArgs) {
          // in some cases we could display a certain target when the back button is pressed
          if (this._oData && this._oData.from) {
            this.getRouter().getTargets().display(this._oData.from);
            delete this._oData.from;
            return;
          }
  
          // call the parent's onNavBack
          BaseController.prototype.onNavBack.apply(this, aArgs);
        },
      });
    }
  );