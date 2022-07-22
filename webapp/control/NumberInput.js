sap.ui.define(['sap/m/Input'], function (Input) {
    'use strict';
  
    return Input.extend('sap.ui.tesna.control.NumberInput', {
      metadata: {
        properties: {
          type: {
            defaultValue: 'Number',
          },
        },
        aggregations: {},
        events: {},
      },
  
      init: function () {
        const allowedKeyCodes = {
          8: true, // Backspace
          9: true, // Tab
          13: true, // Enter
          35: true, // End
          36: true, // Home
          37: true, // Arrow Left
          39: true, // Arrow Right
          46: true, // Delete
        };
  
        this.attachBrowserEvent('keydown', (oEvent) => {
          const iMaxLength = oEvent.target.maxLength;
          if (iMaxLength && oEvent.target.value.length >= iMaxLength && !allowedKeyCodes[oEvent.which || oEvent.keyCode]) {
            oEvent.preventDefault();
            oEvent.stopImmediatePropagation();
          }
        });
  
        this.attachBrowserEvent('mousewheel', (oEvent) => oEvent.preventDefault());
  
        if (sap.ui.core.Control.prototype.init) {
          sap.ui.core.Control.prototype.init.apply(this, arguments); //run the super class's method first
        }
      },
  
      renderer: function (oRM, oControl) {
        sap.m.InputRenderer.render(oRM, oControl);
      },
    });
  });