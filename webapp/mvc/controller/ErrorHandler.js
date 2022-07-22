sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/base/Object',
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/common/odata/ServiceNames',
      'sap/ui/tesna/control/MessageBox',
    ],
    (
      // prettier 방지용 주석
      BaseObject,
      AppUtils,
      ServiceNames,
      MessageBox
    ) => {
      'use strict';
  
      return BaseObject.extend('sap.ui.tesna.mvc.controller.ErrorHandler', {
        /**
         * Handles application errors by automatically attaching to the model events and displaying errors when needed.
         *
         * @param {sap.ui.core.UIComponent} oComponent reference to the app's component
         */
        constructor: function (oComponent) {
          BaseObject.call(this, oComponent);
  
          this._oResourceBundle = oComponent.getModel('i18n').getResourceBundle();
          this._oComponent = oComponent;
          this._oModel = oComponent.getModel(ServiceNames.COMMON);
          this._bMessageOpen = false;
          this._sErrorText = this._oResourceBundle.getText('errorText');
  
          this._oModel.attachMetadataFailed((oEvent) => {
            this._showServiceError(oEvent.getParameter('response'));
          }, this);
  
          this._oModel.attachRequestFailed((oEvent) => {
            const mResponse = oEvent.getParameter('response');
            // An entity that was not found in the service is also throwing a 404 error in oData.
            // We already cover this case with a notFound target so we skip it here.
            // A request that cannot be sent to the server is a technical error that we have to handle though
            if (mResponse.statusCode !== 400 && (mResponse.statusCode !== 404 || (mResponse.statusCode === 404 && mResponse.responseText.indexOf('Cannot POST') === 0))) {
              this._showServiceError(mResponse);
            }
          }, this);
        },
  
        /**
         * Shows a {@link sap.m.MessageBox} when a service call has failed.
         * Only the first error message will be display.
         * @param {string} sDetails a technical error to be displayed on request
         * @private
         */
        _showServiceError(sDetails) {
          if (this._bMessageOpen) {
            return;
          }
          this._bMessageOpen = true;
  
          const oError = {
            getHttpStatusCode() {
              return sDetails.statusCode;
            },
            getMessage() {
              return sDetails.message;
            },
          };
          const reject = () => {
            MessageBox.error(this._sErrorText, {
              id: 'serviceErrorMessageBox',
              details: sDetails,
              actions: [MessageBox.Action.CLOSE],
              onClose: () => {
                this._bMessageOpen = false;
              },
            });
          };
  
          AppUtils.handleSessionTimeout(oError, reject);
        },
      });
    }
  );