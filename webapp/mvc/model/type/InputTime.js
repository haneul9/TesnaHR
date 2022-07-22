/* eslint-disable no-else-return */
sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/model/SimpleType',
    ],
    function (SimpleType) {
      'use strict';
  
      return SimpleType.extend('sap.ui.tesna.mvc.model.type.InputTime', {
        constructor: function (...args) {
          SimpleType.apply(this, args);
  
          this.i9Hours = 9 * 60 * 60 * 1000;
        },
  
        formatValue(oValue) {
          if (_.isObject(oValue) && _.has(oValue, 'ms') && !_.isNaN(oValue.ms)) {
            return moment(oValue.ms - this.i9Hours).toDate();
          }
  
          return null;
        },
  
        parseValue(oValue) {
          if (!oValue || _.isNaN(oValue.getTime())) return null;
  
          const dInputDate = moment(oValue).set({ year: 1970, month: 0, date: 1 });
          const iConvertedMillisecond = dInputDate.isSame(moment('19700101')) ? 86400000 : dInputDate.valueOf() + this.i9Hours;
  
          return {
            ms: iConvertedMillisecond,
            __edmType: 'Edm.Time',
          };
        },
  
        validateValue(oValue) {
          return oValue;
        },
      });
    }
  );