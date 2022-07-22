sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/base/Object',
      'sap/ui/core/Fragment',
    ],
    (
      // prettier 방지용 주석
      BaseObject,
      Fragment
    ) => {
      'use strict';
  
      return BaseObject.extend('sap.ui.tesna.common.PostcodeDialogHandler', {
        oController: null,
        oPostcodeDialog: null,
        fCallback: null,
  
        constructor: function (oController, fCallback) {
          this.oController = oController;
          this.fCallback = fCallback;
        },
  
        async openDialog() {
          if (!this.oPostcodeDialog) {
            this.oPostcodeDialog = await Fragment.load({
              name: 'sap.ui.tesna.fragment.PostcodeDialog',
              controller: this,
            });
          }
  
          this.oController.getView().addDependent(this.oPostcodeDialog);
          this.oPostcodeDialog.open();
        },
  
        onPostcodeDialogClose() {
          this.oPostcodeDialog.close();
        },
  
        callbackPostcode({ sPostcode, sFullAddr, sSido, sSigungu }) {
          this.fCallback({ sPostcode, sFullAddr, sSido, sSigungu });
          this.oPostcodeDialog.close();
        },
      });
    }
  );