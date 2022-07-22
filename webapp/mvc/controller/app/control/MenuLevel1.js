sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/m/Label',
      'sap/m/LabelDesign',
      'sap/m/OverflowToolbarLayoutData',
      'sap/m/OverflowToolbarPriority',
    ],
    (
      // prettier 방지용 주석
      Label,
      LabelDesign,
      OverflowToolbarLayoutData,
      OverflowToolbarPriority
    ) => {
      'use strict';
  
      return Label.extend('sap.ui.tesna.mvc.controller.app.control.MenuLevel1', {
        metadata: {
          properties: {
            appMenu: {
              type: 'sap.ui.tesna.mvc.controller.app.control.Menus',
            },
          },
        },
  
        renderer: {},
  
        constructor: function (...aArgs) {
          Label.apply(this, aArgs);
  
          this.setDesign(LabelDesign.Bold)
            .setWrapping(true)
            .setLayoutData(new OverflowToolbarLayoutData({ priority: OverflowToolbarPriority.Low }))
            .addStyleClass('app-menu-level1');
        },
  
        /**
         * Top 메뉴 mouseover 이벤트 처리 : 메뉴 layer를 열어줌
         */
        onmouseover() {
          this.getAppMenu().openMenuLayer(this);
        },
  
        /**
         * Top 메뉴 mouseout 이벤트 처리 : 메뉴 layer를 닫아줌
         */
        onmouseout(oEvent) {
          // 브라우저 밖으로 마우스 이동시
          if (!oEvent.toElement) {
            this.getAppMenu().closeMenuLayer();
            return;
          }
  
          // OverflowToolbar로 마우스 이동시
          const classList = oEvent.toElement.classList;
          if (classList.contains('app-menu-toolbar')) {
            this.getAppMenu().closeMenuLayer();
          }
        },
      });
    }
  );