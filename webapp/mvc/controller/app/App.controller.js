sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/m/InstanceManager',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/UriHandler',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/control/MessageBox',
    'sap/ui/tesna/mvc/controller/BaseController',
    'sap/ui/tesna/mvc/model/type/Boolean',
    'sap/ui/tesna/mvc/model/type/Currency',
    'sap/ui/tesna/mvc/model/type/Date',
    'sap/ui/tesna/mvc/model/type/DateWeekday',
    'sap/ui/tesna/mvc/model/type/Decimal',
    'sap/ui/tesna/mvc/model/type/Docno',
    'sap/ui/tesna/mvc/model/type/InputTime',
    'sap/ui/tesna/mvc/model/type/Mileage',
    'sap/ui/tesna/mvc/model/type/Month',
    'sap/ui/tesna/mvc/model/type/MonthDate',
    'sap/ui/tesna/mvc/model/type/MonthDateWeekday',
    'sap/ui/tesna/mvc/model/type/Percent',
    'sap/ui/tesna/mvc/model/type/Pernr',
    'sap/ui/tesna/mvc/model/type/ShortYearDate',
    'sap/ui/tesna/mvc/model/type/Time',
    'sap/ui/tesna/mvc/model/type/Year',
  ],
  (
    // prettier 방지용 주석
    InstanceManager,
    AppUtils,
    UriHandler,
    Client,
    ServiceNames,
    MessageBox,
    BaseController
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.app.App', {
      onInit() {
        this.debug('App.onInit');

        const oUIComponent = this.getOwnerComponent();
        const oUriHandler = new UriHandler();
        const oAppModel = oUIComponent.getAppModel();
        oAppModel.setProperty('/languageVisible', oUriHandler.getParameter('language-test') === 'true');
        oAppModel.setProperty('/language', oUriHandler.getParameter('sap-language') || 'KO');
      },

      getAppMenu() {
        return this.oAppMenu;
      },

      getLogoPath(sWerks) {
        const logoName = '1000,2000,3000'.split(',').includes(sWerks) ? `logo-${sWerks}` : 'logo-1000';
        this.byId('logo-image').toggleStyleClass(logoName, true);
        return this.getImageURL(`${logoName}.png`);
      },

      navToHome() {
        this.oAppMenu.closeMenuLayer();

        if (this.bMobile) {
          InstanceManager.closeAllPopovers();
        }

        const sCurrentMenuViewId = this.getCurrentMenuViewId();
        if (sCurrentMenuViewId === 'home' || sCurrentMenuViewId === 'mobileHome') {
          return;
        }

        this.oAppMenu.moveToMenu(this.bMobile ? 'ehrMobileHome' : 'ehrHome');
      },

      navToProfile() {
        this.oAppMenu.moveToMenu((this.bMobile ? 'mobile/' : '') + 'employee');
      },

      savePushToken() {
        if (!this.bMobile) {
          return;
        }

        if (/android/i.test(navigator.userAgent) && typeof window.tesnaApp !== 'undefined') {
          const sPushToken = window.tesnaApp.getToken();
          this.requestSavePushToken(sPushToken);
        } else if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !!window.webkit && !!window.webkit.messageHandlers && !!window.webkit.messageHandlers.script) {
          window.getToken = (sPushToken) => {
            this.requestSavePushToken(sPushToken);
          };
          window.webkit.messageHandlers.script.postMessage('requestToken');
        }
      },

      async requestSavePushToken(sPushToken) {
        try {
          const oModel = this.getModel(ServiceNames.COMMON);
          const mPayload = {
            Pernr: this.getSessionProperty('Pernr'),
            Token: sPushToken,
          };

          await Client.create(oModel, 'PernrToken', mPayload);
        } catch (oError) {
          this.debug('requestSavePushToken error.', oError);
        }
      },

      onChangeLanguage(oEvent) {
        AppUtils.setAppBusy(true).setMenuBusy(true);

        const sLanguageKey = oEvent.getParameter('selectedItem').getKey();
        const oUriHandler = new UriHandler();
        if (oUriHandler.getParameter('sap-language') !== sLanguageKey) {
          oUriHandler.setParameter('sap-language', sLanguageKey).redirect();
        } else {
          AppUtils.setAppBusy(false).setMenuBusy(false);
        }
      },

      /**
       * 알림센터 : PC 상단 알림 버튼 & 모바일 하단 5버튼
       * @param {sap.ui.base.Event} oEvent
       */
      onPressNotificationPopoverToggle(oEvent) {
        oEvent.cancelBubble();

        if (this.bMobile) {
          InstanceManager.closeAllPopovers();
          this.oAppMenu.closeMenuLayer();
        }
        this.oNotificationPopoverHandler.onPopoverToggle();
      },

      /**
       * 로그아웃
       */
      onPressLogout() {
        // 로그아웃하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_01006'), {
          actions: [MessageBox.Action.YES, MessageBox.Action.NO],
          onClose: (sAction) => {
            if (sAction === MessageBox.Action.YES) {
              // from=logoff : 모바일(iOS)에서 로그아웃 후 생체인증으로 바로 다시 로그인 되어버리는 현상 방지를 위해 추가
              location.href = this.bMobile ? '/sap/public/bc/icf/logoff?from=logoff' : this.getStaticResourceURL('logoff.html');
            }
          },
        });
      },
    });
  }
);
