sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/m/ScrollContainer',
    ],
    (
      // prettier 방지용 주석
      ScrollContainer
    ) => {
      'use strict';
  
      return ScrollContainer.extend('sap.ui.tesna.mvc.controller.app.control.MegadropMenu', {
        metadata: {
          properties: {
            appMenu: {
              type: 'sap.ui.tesna.mvc.controller.app.control.Menus',
            },
          },
        },
  
        renderer: {},
  
        onmouseout(oEvent) {
          // 화면 밖으로 마우스 이동시 || OverflowToolbar로 마우스 이동시 || App body 영역으로 마우스 이동시
          const bMouseOut = !oEvent.toElement || oEvent.toElement.classList.contains('app-menu-toolbar') || $(oEvent.toElement).parents('.app-body').length;
          if (bMouseOut) {
            this.getAppMenu().closeMenuLayer();
          }
        },
      });
    }
  );