sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/m/Label',
    ],
    (
      // prettier 방지용 주석
      Label
    ) => {
      'use strict';
  
      return Label.extend('sap.ui.tesna.control.PressableLabel', {
        metadata: {
          events: {
            press: {},
          },
        },
  
        renderer: {},
  
        onclick() {
          this.firePress();
        },
      });
    }
  );