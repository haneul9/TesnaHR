sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/base/Object',
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/control/MessageBox',
    ],
    (
      // prettier 방지용 주석
      BaseObject,
      AppUtils,
      MessageBox
    ) => {
      'use strict';
  
      return BaseObject.extend('sap.ui.tesna.common.exceptions.UI5Error', {
        LEVEL: {
          INFORMATION: 'I',
          ALERT: 'A',
          WARNING: 'W',
          ERROR: 'E',
        },
  
        /**
         * @override
         * @returns {sap.ui.base.Object}
         */
        constructor: function ({ code = this.LEVEL.ERROR, message, httpStatusCode = 0 }) {
          this.MESSAGE_LEVEL = {
            INFORMATION: [this.LEVEL.INFORMATION, this.LEVEL.ALERT, this.LEVEL.WARNING, this.LEVEL.ERROR],
            ALERT: [this.LEVEL.ALERT, this.LEVEL.WARNING, this.LEVEL.ERROR],
            WARNING: [this.LEVEL.WARNING, this.LEVEL.ERROR],
            ERROR: [this.LEVEL.ERROR],
          };
  
          this.code = code;
          this.message = message;
          this.messageLevel = this.MESSAGE_LEVEL.INFORMATION;
          this.httpStatusCode = httpStatusCode;
        },
  
        getHttpStatusCode() {
          return this.httpStatusCode;
        },
  
        getCode() {
          return this.code;
        },
  
        getMessage() {
          return this.message;
        },
  
        showErrorMessage(mOptions = {}) {
          const sCode = this.getCode();
          const sMessage = this.getMessage().replace(/\\n/, '\n');
  
          if (_.includes(this.messageLevel, sCode)) {
            switch (sCode) {
              case this.LEVEL.INFORMATION:
                MessageBox.information(sMessage, { ...mOptions });
                break;
              case this.LEVEL.ALERT:
                MessageBox.alert(sMessage, { ...mOptions });
                break;
              case this.LEVEL.WARNING:
                MessageBox.warning(sMessage, { ...mOptions });
                break;
              case this.LEVEL.ERROR:
                MessageBox.error(sMessage, { ...mOptions });
                break;
              default:
                break;
            }
          } else {
            AppUtils.debug(sCode, sMessage);
          }
        },
      });
    }
  );