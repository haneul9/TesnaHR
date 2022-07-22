sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/m/Label',
    'sap/m/Link',
    'sap/ui/base/Object',
    'sap/ui/core/CustomData',
    'sap/ui/core/Fragment',
    'sap/ui/core/routing/HashChanger',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/exceptions/UI5Error',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/control/MessageBox',
    'sap/ui/tesna/mvc/controller/app/control/MenuLevel1',
  ],
  (
    // prettier 방지용 주석
    Label,
    Link,
    BaseObject,
    CustomData,
    Fragment,
    HashChanger,
    AppUtils,
    UI5Error,
    Client,
    ServiceNames,
    MessageBox,
    MenuLevel1
  ) => {
    'use strict';

    return BaseObject.extend('sap.ui.tesna.mvc.controller.app.control.Menus', {
      bMobile: false,

      constructor: function (oAppController) {
        this.bMobile = AppUtils.isMobile();
        this.oAppController = oAppController;
        this.oMenuButton = null;
        this.oMenuLayer = null;
        this.oMenuModel = this.oAppController.getOwnerComponent().getMenuModel();

        this.buildAppMenu();
      },

      /**
       * 메뉴 생성
       */
      async buildAppMenu() {
        await this.oMenuModel.getPromise();

        const aMenuTree = this.oMenuModel.getTree() || [];
        const oAppMenuToolbar = this.oAppController.byId('appMenuToolbar');

        if (!aMenuTree.length) {
          oAppMenuToolbar.insertContent(new Label({ text: '{i18n>MSG_01001}' }), 2); // 조회된 메뉴가 없습니다.
          return;
        }

        // App menu 생성
        aMenuTree.forEach((mMenu, i) => {
          oAppMenuToolbar.insertContent(
            new MenuLevel1({
              id: `menu-${mMenu.Menid}`,
              text: mMenu.Mname,
              customData: new CustomData({ key: 'Mnid1', value: mMenu.Mnid1 }),
            })
              .addStyleClass(mMenu.StyleClasses)
              .setAppMenu(this),
            i + 2 // App logo, ToolbarSpacer 이후부터 menu 추가
          );
        });

        AppUtils.setMenuBusy(false);
      },

      /**
       * Top 메뉴 mouseover에 의한 popover 열기
       * @param {object} oMenuButton
       */
      async openMenuLayer(oMenuButton) {
        this.oMenuButton = oMenuButton;

        this.toggleSelectedMenuStyle(true);

        if (!this.oMenuLayer) {
          this.oMenuLayer = await Fragment.load({
            name: 'sap.ui.tesna.mvc.view.app.fragment.MegadropMenu',
            controller: this,
          });

          this.oMenuLayer.setAppMenu(this);
          this.oMenuLayer.setModel(this.oMenuModel);
          this.oMenuLayer.placeAt('sap-ui-static');
        }

        this.oMenuLayer.bindElement(`/menidToProperties/${oMenuButton.data('Mnid1')}`);

        if (!this.oMenuLayer.getVisible()) {
          this.oMenuLayer.setVisible(true);
        }
      },

      toggleSelectedMenuStyle(bOnHoverStyle) {
        // 메뉴에 mouseover event 발생시 mouseover 스타일 적용, 다른 메뉴의 mouseover 스타일 제거
        setTimeout(() => {
          if (this.oMenuButton) {
            const $MenuButton = this.oMenuButton.$();
            $MenuButton.toggleClass('app-menu-level1-hover', bOnHoverStyle);
            $MenuButton.siblings().toggleClass('app-menu-level1-hover', false);
          }
        });
      },

      /**
       * 메뉴 popover 닫기
       */
      closeMenuLayer(bByMenuClick = false) {
        setTimeout(() => {
          if (!bByMenuClick) {
            this.toggleSelectedMenuStyle(false);
          }
          if (this.oMenuLayer && this.oMenuLayer.getVisible()) {
            this.oMenuLayer.setVisible(false);
          }
        });
      },

      /**
       * 메뉴의 즐겨찾기 클릭 이벤트 처리
       * @param {object} oEvent
       */
      async toggleFavorite(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        const bPressed = oEvent.getParameter('pressed');

        const bSuccess = await this.saveFavorite(oContext.getProperty());
        if (bSuccess) {
          const mActiveInstanceMap = AppUtils.getAppComponent().byId('home').getModel().getProperty('/activeInstanceMap');
          const oMenuFavoritesPortlet = mActiveInstanceMap.P05 || mActiveInstanceMap.M05;
          if (oMenuFavoritesPortlet) {
            oMenuFavoritesPortlet.refreshFavorites();
          }
        } else {
          const sPath = oContext.getPath();
          oContext.getModel().setProperty(`${sPath}/Favor`, !bPressed);
        }
      },

      async saveFavorite({ Favor, Menid, Mnid1, Mnid2, Mnid3 }) {
        try {
          const oCommonModel = this.oAppController.getModel(ServiceNames.COMMON);
          const sUrl = 'PortletFavoriteMenu';
          const mPayload = {
            Menid: Menid,
            Mnid1: Mnid1,
            Mnid2: Mnid2,
            Mnid3: Mnid3,
            Mobile: '',
          };

          if (Favor) {
            await Client.create(oCommonModel, sUrl, mPayload);

            this.oMenuModel.addFavoriteMenid(Menid);
          } else {
            await Client.remove(oCommonModel, sUrl, mPayload);

            this.oMenuModel.removeFavoriteMenid(Menid);
          }

          return true;
        } catch (oError) {
          if (oError instanceof UI5Error) {
            oError.code = oError.LEVEL.INFORMATION;
          }
          AppUtils.handleError(oError);

          return false;
        }
      },

      /**
       *
       * @param {string} sMnurl 메뉴 URL
       * @param {boolean} bMepop popup 메뉴 여부
       * @returns {string} anchor href 속성값
       */
      // eslint-disable-next-line no-unused-vars
      formatMenuUrl(sMnurl, bMepop) {
        if (/^https?:/.test(sMnurl)) {
          return sMnurl;
        }
        if (/^javascript:/.test(sMnurl)) {
          return sMnurl;
        }
        return 'javascript:;'; // Routing URL 노출을 막기위해 anchor의 href 속성에서 URL을 제거
        // return `${location.origin}${location.pathname}#/${(sMnurl || '').replace(/^\/+/, '')}`;
      },

      /**
       *
       * @param {string} sMnurl 메뉴 URL
       * @param {boolean} bMepop popup 메뉴 여부
       * @returns {string} anchor target 속성값
       */
      // eslint-disable-next-line no-unused-vars
      formatMenuTarget(sMnurl, bMepop) {
        if (/^https?:/.test(sMnurl)) {
          return '_blank';
        }
        return '_self';
      },

      /**
       * 메뉴 link click event 처리
       *  - http|https|javascript로 시작되는 경우에는 anchor 본연의 link 기능으로 동작함
       * @param {object} oEvent
       */
      async handleMenuLink(oEvent) {
        const oEventSource = oEvent.getSource();
        const oContext = oEventSource.getBindingContext();
        if (oEventSource instanceof Link) {
          const sHref = oEventSource.getProperty('href');
          if (/^https?:/.test(sHref) || (sHref !== 'javascript:;' && /^javascript:/.test(sHref))) {
            setTimeout(() => {
              this.toggleSelectedMenuStyle(false);
              this.closeMenuLayer(true);
              if (this.bMobile) {
                this.saveFavorite(oContext.getProperty());
              }
            });
            return;
          }
        }

        oEvent.preventDefault();

        setTimeout(() => {
          this.closeMenuLayer(true);
        });

        if (oContext.getProperty('Mepop')) {
          if (this.bMobile) {
            this.saveFavorite(oContext.getProperty());
          }
          return;
        }

        AppUtils.setAppBusy(true).setMenuBusy(true);

        const sMenid = oContext.getProperty('Menid');
        if (/^X/.test(sMenid)) {
          const sMnurl = (this.oMenuModel.getProperties(sMenid) || {}).Mnurl || '';
          this.moveToMenu(sMnurl);
          return;
        }

        try {
          const oCommonModel = this.oAppController.getModel(ServiceNames.COMMON);
          const mKeyMap = {
            Menid: sMenid,
          };

          const { Mnurl } = await Client.get(oCommonModel, 'GetMenuUrl', mKeyMap);
          if (Mnurl) {
            this.moveToMenu(this.bMobile ? `mobile/${Mnurl}` : Mnurl);
          } else {
            this.failMenuLink(AppUtils.getBundleText('MSG_01003')); // 알 수 없는 메뉴입니다.
          }
        } catch (oError) {
          this.failMenuLink(AppUtils.getBundleText('MSG_01004')); // 메뉴링크 확인중 오류가 발생하였습니다.\n다시 시도해주세요.
        }
      },

      failMenuLink(sMessage) {
        MessageBox.error(sMessage, {
          onClose: () => {
            AppUtils.setAppBusy(false).setMenuBusy(false);
          },
        });
      },

      moveToMenu(...aArgs) {
        AppUtils.setMenuBusy(true).setAppBusy(true);

        const sRouteName = aArgs[0] || '';
        // 같은 메뉴 클릭시
        if (HashChanger.getInstance().getHash() === sRouteName) {
          AppUtils.setAppBusy(false).setMenuBusy(false);
          return;
        }

        const bHomeRoute = !sRouteName || sRouteName === 'ehrHome' || sRouteName === 'ehrMobileHome';
        const sMenuUrl = sRouteName.split(/-/)[0];
        const bExistRoute = this.oAppController.getOwnerComponent().getRouter().match(sMenuUrl);
        if (!bHomeRoute && !bExistRoute) {
          const sMessage = AppUtils.isPRD() ? AppUtils.getBundleText('MSG_01003') : AppUtils.getBundleText('MSG_01005'); // 알 수 없는 메뉴입니다. : 개발중입니다.
          MessageBox.alert(sMessage, {
            onClose: () => {
              AppUtils.setAppBusy(false).setMenuBusy(false);
            },
          });
          return;
        }

        if (!bHomeRoute && this.bMobile) {
          const mMenuProperties = this.oMenuModel.getProperties(this.oMenuModel.getMenid(sMenuUrl));
          this.saveFavorite(mMenuProperties); // 최근 사용 메뉴 등록
        }

        this.oAppController.getAppointeeModel().setData({
          ...this.oAppController.getSessionModel().getData(),
          showChangeButton: _.startsWith(sRouteName, 'h/'),
          showBarChangeButton: false,
        });

        // 챠트 툴팁 제거
        const $ChartTooltip = $('#fusioncharts-tooltip-element');
        if ($ChartTooltip.length) {
          $ChartTooltip.hide();
        }

        this.oAppController
          .getOwnerComponent()
          .reduceViewResource() // 메뉴 이동 전 View hidden 처리로 불필요한 DOM 정보를 제거
          .getRouter()
          .navTo(...aArgs);
      },
    });
  }
);
