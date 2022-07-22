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
      return TypeDate.extend('sap.ui.tesna.mvc.model.type.DateWeekday', {
        constructor: function (...args) {
          TypeDate.apply(this, args);
  
          const formatPattern = this.getSessionProperty('/Dtfmt');
          const oFormatOptions = {
            pattern: `${formatPattern} EEE`,
          };
          this.setFormatOptions(oFormatOptions);
          this.sName = 'CustomDateWeekday';
        },
  
        getFormatPatternForMoment() {
          const sDTFMT = this.getSessionProperty('/DTFMT');
          return `${sDTFMT} ddd`;
        },
      });
    }
  );