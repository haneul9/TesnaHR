sap.ui.define(
    [
      'sap/m/HBox', //
    ],
    function (HBox) {
      'use strict';
  
      return HBox.extend('sap.ui.tesna.control.HBox', {
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