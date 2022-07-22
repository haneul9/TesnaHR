sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/model/type/Float',
    ],
    (
      // prettier 방지용 주석
      Float
    ) => {
      'use strict';
  
      /**
       * Leading zero trim
       */
      return Float.extend('sap.ui.tesna.mvc.model.type.Decimal', {
        formatValue() {
          let dValue = Float.prototype.formatValue.apply(this, arguments);
  
          if (dValue) dValue = dValue.replace(/,/g, '');
  
          return _.isEqual(_.toNumber(dValue), 0) ? '' : new Intl.NumberFormat('ko-KR').format(_.chain(dValue).toNumber().toString().value());
        },
      });
    }
  );