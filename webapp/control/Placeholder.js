sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/core/Control',
    ],
    (
      // prettier 방지용 주석
      Control
    ) => {
      'use strict';
  
      return Control.extend('sap.ui.tesna.control.Placeholder', {
        metadata: {
          properties: {
            width: { type: 'sap.ui.core.CSSSize', defaultValue: '100%' },
            line: { type: 'int', defaultValue: 5 },
          },
        },
  
        renderer: function (oRM, oControl) {
          oRM.write('<div');
          oRM.writeControlData(oControl);
          oRM.addClass('ui placeholder');
          oRM.writeClasses();
          oRM.addStyle('width', oControl.getWidth());
          oRM.writeStyles();
          oRM.write('>');
          for (let i = 0; i < oControl.getLine(); i++) {
            oRM.write('<div');
            oRM.addClass('line');
            oRM.writeClasses();
            oRM.write('>');
            oRM.write('</div>');
          }
          oRM.write('</div>');
          // oRM.renderControl(oControl.getAggregation('_rating'));
        },
      });
    }
  );