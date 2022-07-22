sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/core/Fragment',
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/common/odata/Client',
      'sap/ui/tesna/common/odata/ServiceNames',
      'sap/ui/tesna/mvc/controller/app/control/Menus',
    ],
    (
      // prettier 방지용 주석
      Fragment,
      AppUtils,
      Client,
      ServiceNames,
      Menus
    ) => {
      'use strict';
  
      return Menus.extend('sap.ui.tesna.mvc.controller.app.control.MobileMenus', {
        async buildAppMenu() {
          this.oMenuLayer = await Fragment.load({
            name: 'sap.ui.tesna.mvc.view.app.fragment.MenuPopover',
            controller: this,
          });
  
          this.oMenuLayer.attachBeforeOpen(() => {
            this.refreshFavorites();
          });
  
          this.oAppController.getView().addDependent(this.oMenuLayer);
  
          this.oMenuLayer.setModel(this.oMenuModel).bindElement('/');
        },
  
        /**
         * 메뉴 popover 열기
         */
        async toggleMenuLayer(oEvent) {
          if (this.oMenuLayer.isOpen()) {
            this.closeMenuLayer();
          } else {
            this.oMenuLayer.openBy(oEvent.getSource());
          }
        },
  
        /**
         * 메뉴 popover 닫기
         */
        closeMenuLayer() {
          setTimeout(() => {
            this.oMenuLayer.close();
          });
        },
  
        /**
         * 최근 사용 메뉴 등록
         */
        async saveFavorite({ Menid, Mnid1, Mnid2, Mnid3 }) {
          try {
            const oCommonModel = this.oAppController.getModel(ServiceNames.COMMON);
            const mPayload = {
              Menid: Menid,
              Mnid1: Mnid1,
              Mnid2: Mnid2,
              Mnid3: Mnid3,
              Mobile: 'X',
            };
  
            await Client.create(oCommonModel, 'PortletFavoriteMenu', mPayload);
  
            this.refreshFavorites();
  
            return true;
          } catch (oError) {
            if (oError instanceof UI5Error) {
              oError.code = oError.LEVEL.INFORMATION;
            }
            AppUtils.handleError(oError);
  
            return false;
          }
        },
  
        async refreshFavorites() {
          const oCommonModel = this.oAppController.getModel(ServiceNames.COMMON);
          const mPayload = {
            Mobile: 'X',
          };
  
          const aRecentMenus = await Client.getEntitySet(oCommonModel, 'PortletFavoriteMenu', mPayload);
  
          this.oMenuModel.setRecentMenu(aRecentMenus);
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
            const mActiveInstanceMap = AppUtils.getAppComponent().byId('mobileHome').getModel().getProperty('/activeInstanceMap');
            const oMenuFavoritesPortlet = mActiveInstanceMap.P05 || mActiveInstanceMap.M05;
            if (oMenuFavoritesPortlet) {
              oMenuFavoritesPortlet.refreshFavorites();
            }
          } else {
            const sPath = oContext.getPath();
            oContext.getModel().setProperty(`${sPath}/Favor`, !bPressed);
          }
        },
      });
    }
  );