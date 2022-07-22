sap.ui.define(
    [
      'sap/m/VBox', //
    ],
    function (VBox) {
      'use strict';
  
      return VBox.extend('sap.ui.tesna.control.VBox', {
        metadata: {
          events: {
            press: {},
            hover: {},
            leave: {},
          },
        },
  
        renderer: {},
  
        onclick() {
          this.firePress();
        },
  
        onmouseover() {
          this.fireHover();
        },
  
        onmouseout() {
          this.fireLeave();
        },
      });
    }
  );