sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/tesna/mvc/model/type/Date',
    ],
    (
      // prettier 방지용 주석
      TypeDate
    ) => {
      'use strict';
  
      /**
       * Edm.DateTime
       */
      return TypeDate.extend('sap.ui.tesna.mvc.model.type.MonthDateWeekday', {
        constructor: function (...args) {
          TypeDate.apply(this, args);
  
          const formatPattern = this.getSessionProperty('/Dtfmt').replace(/^YYYY[.-/]?/g, '');
          const oFormatOptions = {
            pattern: `${formatPattern} EEE`,
          };
          this.setFormatOptions(oFormatOptions);
          this.sName = 'CustomMonthDateWeekday';
        },
  
        getFormatPatternForMoment() {
          const sDTFMT = this.getSessionProperty('/DTFMT').replace(/^YYYY[.-/]?/g, '');
          return `${sDTFMT} ddd`;
        },
      });
    }
  );