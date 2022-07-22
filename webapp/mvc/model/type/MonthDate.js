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
      return TypeDate.extend('sap.ui.tesna.mvc.model.type.MonthDate', {
        constructor: function (...args) {
          TypeDate.apply(this, args);
  
          const formatPattern = this.getSessionProperty('/Dtfmt');
          const oFormatOptions = {
            pattern: formatPattern.replace(/^YYYY[.-/]?/g, ''),
          };
          this.setFormatOptions(oFormatOptions);
          this.sName = 'CustomMonthDate';
        },
  
        getFormatPatternForMoment() {
          return this.getSessionProperty('/DTFMT').replace(/^YYYY[.-/]?/g, '');
        },
      });
    }
  );