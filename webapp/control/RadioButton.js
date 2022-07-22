sap.ui.define(
    [
      'sap/m/RadioButton', //
    ],
    function (RadioButton) {
      'use strict';
  
      return RadioButton.extend('sap.ui.tesna.control.RadioButton', {
        metadata: {
          properties: {
            outerSize: {
              type: 'sap.ui.core.CSSSize',
              defaultValue: '50%',
            },
            innerSize: {
              type: 'sap.ui.core.CSSSize',
              defaultValue: '22%',
            },
          },
        },
        onAfterRendering: function () {
          if (sap.ui.core.Control.prototype.onAfterRendering) {
            sap.ui.core.Control.prototype.onAfterRendering.apply(this, arguments); //run the super class's method first
          }
  
          const sId = this.getId();
          const aCircleNodes = document.getElementById(sId).childNodes[0].childNodes[0].childNodes;
  
          aCircleNodes[0].setAttribute('r', this.getOuterSize());
          aCircleNodes[1].setAttribute('r', this.getInnerSize());
        },
        renderer: {},
      });
    }
  );