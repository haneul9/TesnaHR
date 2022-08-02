sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/tesna/control/MessageBox',
  ],
  (
    // prettier 방지용 주석
    MessageBox
  ) => {
    'use strict';

    return {
      /**
       * @public
       */
      getDevice() {
        return sap.ui.Device.system.desktop === true // prettier 방지용 주석
          ? sap.ui.Device.system.SYSTEMTYPE.DESKTOP
          : sap.ui.Device.system.phone === true
          ? sap.ui.Device.system.SYSTEMTYPE.PHONE
          : sap.ui.Device.system.tablet === true
          ? sap.ui.Device.system.SYSTEMTYPE.PHONE
          : '';
      },

      /**
       * @public
       */
      getAppController() {
        // <div data-sap-ui-component data-name="sap.ui.tesna" data-id="container" data-settings='{ "id": "ehr" }'></div>
        return sap.ui.getCore().getComponent('container-ehr').byId('app').getController();
      },

      /**
       * @public
       */
      getAppComponent() {
        return sap.ui.getCore().getComponent('container-ehr');
      },

      /**
       * Convenience method for getting the resource bundle text.
       * @public
       * @returns {string} The value belonging to the key, if found; otherwise the key itself.
       */
      getBundleText(...aArgs) {
        return this.getAppComponent().getBundleText(...aArgs);
      },

      /**
       * @public
       */
      setAppBusy(state) {
        setTimeout(() => {
          this.getAppComponent().getAppModel().setProperty('/isAppBusy', state);
        });
        return this;
      },

      /**
       * @public
       */
      setMenuBusy(state) {
        setTimeout(() => {
          this.getAppComponent().getAppModel().setProperty('/isMenuBusy', state);
        });
        return this;
      },

      /**
       * @public
       */
      setAtHome(state) {
        setTimeout(() => {
          this.getAppComponent().getAppModel().setProperty('/isAtHome', state);
        });
        return this;
      },

      /**
       * @public
       */
      isLOCAL() {
        return /^localhost/.test(location.hostname);
      },
      /**
       * @public
       */
      isDEV() {
        return /^(dsghrerpd01)/.test(location.hostname) && /sap-client=300/i.test(document.cookie);
      },
      /**
       * @public
       */
      isQAS() {
        return /^(dsghrerpq01)/.test(location.hostname) && /sap-client=510/i.test(document.cookie);
      },
      /**
       * @public
       */
      isPRD() {
        return /^(hrwdp)/.test(location.hostname);
      },

      isMobile() {
        return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      },

      getStaticResourceURL(sResourcePath) {
        return `/sap/public/bc/ui2/zui5_tesnahr/${sResourcePath.replace(/^\/+/, '')}`;
      },

      getImageURL(sImageName) {
        return this.getStaticResourceURL(`images/${sImageName}`);
      },

      getUnknownAvatarImageURL() {
        return this.getImageURL('avatar-unknown.svg');
      },

      /**
       * @public
       */
      parseError(oError) {
        try {
          if (!oError || !oError.responseText) {
            throw new Error('AppUtils.parseError : 에러 데이터 오류!');
          }

          if (oError.statusCode && oError.statusCode === 503) {
            return {
              code: 'E',
              message: 'Session expired.\nPlease refresh and try again.',
            };
          }

          const mErrorData = {
            code: 'E',
          };
          const errorJSON = JSON.parse(oError.responseText);

          if (errorJSON.error.innererror.errordetails && errorJSON.error.innererror.errordetails.length) {
            mErrorData.code = errorJSON.error.code;
            mErrorData.message = errorJSON.error.innererror.errordetails[0].message;
          } else if (errorJSON.error.message) {
            // mErrorData.code = 'I';
            if (_.startsWith(errorJSON.error.message.value, 'In the context of Data Services')) {
              mErrorData.message = 'SAP Server OData Error.\nPlease report to administrator.';
            } else {
              mErrorData.message = errorJSON.error.message.value;
            }
          } else {
            // mErrorData.code = 'I';
            mErrorData.message = 'Unkown error.';
          }
          return mErrorData;
        } catch (ex) {
          return {
            code: 'E',
            message: oError.message,
          };
        }
      },

      handleError(oError, mOptions = {}) {
        sap.ui.require(['sap/ui/tesna/common/exceptions/UI5Error'], (UI5Error) => {
          if (oError instanceof Error) {
            if (oError.responseText) {
              new UI5Error(this.parseError(oError)).showErrorMessage(mOptions);
            } else {
              new UI5Error({ message: oError.message }).showErrorMessage(mOptions);
            }
          } else if (oError instanceof UI5Error) {
            oError.showErrorMessage(mOptions);
          } else if (_.isObject(oError) && _.has(oError, 'message')) {
            new UI5Error({ code: oError.code ?? 'E', message: oError.message }).showErrorMessage(mOptions);
          }
        });
      },

      handleSessionTimeout(oError, reject) {
        const sErrorMessage = oError.getMessage();
        if (sErrorMessage === 'Response did not contain a valid OData result' || (oError.getHttpStatusCode() === 401 && sErrorMessage === 'HTTP request failed')) {
          // Session이 만료되었습니다.\n로그온 화면으로 이동합니다.
          MessageBox.alert(this.getBundleText('MSG_00057'), {
            onClose: () => {
              if (this.isMobile()) {
                // from=logoff : 모바일(iOS)에서 로그아웃 후 생체인증으로 바로 다시 로그인 되어버리는 현상 방지를 위해 추가
                location.href = '/sap/public/bc/icf/logoff?from=logoff';
              } else {
                if (this.isPRD()) {
                  location.reload(); // 운영은 SSO가 있기때문에 /sap/public/bc/icf/logoff 호출 금지
                } else {
                  location.href = '/sap/public/bc/icf/logoff';
                }
              }
            },
          });
        } else {
          reject(oError);
        }
      },

      /**
       * @param {any[]}
       * @public
       */
      debug(...args) {
        // setTimeout(() => console.log(...args));
        console.log(...args);
        return this;
      },
    };
  }
);
