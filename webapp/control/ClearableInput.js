sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/m/Input',
    ],
    (
      // prettier 방지용 주석
      Input
    ) => {
      'use strict';
  
      return Input.extend('sap.ui.tesna.control.ClearableInput', {
        metadata: {
          properties: {
            key: { type: 'string', group: 'Data', defaultValue: '' },
          },
        },
  
        renderer: {},
  
        init() {
          this.addStyleClass('custom-clearable-input');
        },
  
        onAfterRendering(...aArgs) {
          Input.prototype.onAfterRendering.apply(this, aArgs);
  
          const oEraseIcon = $(
            [
              '<span data-sap-ui="clear-icon-' + String(Math.random()).replace(/\./, '') + '-vhi"',
              'data-sap-ui-icon-content=""',
              'class="sapUiIcon sapUiIconMirrorInRTL sapUiIconPointer sapMInputBaseIcon"',
              'style="font-family:\'SAP\\2dicons\'"></span>',
            ].join(' ')
          ).click(() => {
            this.clear();
          });
  
          this.$().find('.sapMInputBaseIconContainer').prepend(oEraseIcon);
        },
  
        clear() {
          this.setKey('').setValue('');
        },
      });
    }
  );