/* eslint-disable no-else-return */
sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/model/SimpleType',
    ],
    function (SimpleType) {
      'use strict';
  
      return SimpleType.extend('sap.ui.tesna.mvc.model.type.Boolean', {
        formatValue(oValue) {
          if (_.isEqual(oValue, 'X')) {
            return true;
          } else {
            return false;
          }
        },
  
        parseValue(oValue) {
          if (oValue === true) {
            return 'X';
          } else {
            return null;
          }
        },
  
        validateValue(oValue) {
          return oValue;
        },
      });
    }
  );