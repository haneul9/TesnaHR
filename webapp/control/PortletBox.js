sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/f/GridContainerItemLayoutData',
      'sap/m/Button',
      'sap/m/FlexItemData',
      'sap/m/HBox',
      'sap/m/Text',
      'sap/m/Title',
      'sap/m/VBox',
      'sap/ui/core/CustomData',
    ],
    (
      // prettier 방지용 주석
      GridContainerItemLayoutData,
      Button,
      FlexItemData,
      HBox,
      Text,
      Title,
      VBox,
      CustomData
    ) => {
      'use strict';
  
      return VBox.extend('sap.ui.tesna.control.PortletBox', {
        metadata: {
          properties: {
            portletHandler: 'object',
          },
        },
  
        renderer: {},
  
        init(...aArgs) {
          VBox.prototype.init.apply(this, aArgs);
  
          this.addCustomData(new CustomData({ key: 'portlet-switchable', value: '{switchable}' }))
            .setLayoutData(new GridContainerItemLayoutData({ rows: '{height}', columns: '{width}' }))
            .setBusyIndicatorDelay(0)
            .bindProperty('busy', 'busy')
            .bindProperty('tooltip', 'tooltip');
  
          const oCloseButton = new Button({
            icon: 'sap-icon://decline',
            type: 'Transparent',
            visible: '{switchable}',
            tooltip: '{i18n>LABEL_00200}',
          })
            .addStyleClass('icon-button portlet-close-icon')
            .attachEvent('press', this.onPressClose, this);
  
          const oLinkButton = new Button({
            icon: 'sap-icon://add',
            type: 'Transparent',
            visible: '{hasLink}',
            tooltip: '{i18n>LABEL_00342}',
          })
            .addStyleClass('icon-button portlet-link-icon')
            .attachEvent('press', this.onPressLink, this);
  
          const oPortletHeader = new HBox({
            visible: '{= !${hideTitle} || ${switchable} }',
            items: [
              new Title({ level: 'H2', text: '{title}', visible: '{= !${hideTitle} }' }), //
              new Text({ text: '', layoutData: new FlexItemData({ growFactor: 1 }) }),
              oCloseButton,
              oLinkButton,
            ],
          }).addStyleClass('portlet-header');
  
          this.addItem(oPortletHeader).addItem(new HBox().addStyleClass('portlet-body'));
        },
  
        /**
         * @override
         */
        onBeforeRendering(...aArgs) {
          VBox.prototype.onBeforeRendering.apply(this, aArgs);
  
          const oContext = this.getBindingContext();
          const bBorderless = oContext.getProperty('borderless');
          const sPortletKey = oContext.getProperty('key').toLowerCase();
          const iPortletHeight = oContext.getProperty('height');
  
          if (bBorderless) {
            this.addStyleClass(`portlet portlet-${sPortletKey} portlet-h${iPortletHeight}`);
          } else {
            this.addStyleClass(`portlet portlet-box portlet-${sPortletKey} portlet-h${iPortletHeight}`);
          }
        },
  
        onPressClose(oEvent) {
          this.getPortletHandler().onPressClose(oEvent);
        },
  
        onPressLink(oEvent) {
          this.getPortletHandler().onPressLink(oEvent);
        },
      });
    }
  );