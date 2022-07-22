sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/model/FormatException',
      'sap/ui/model/ParseException',
      'sap/ui/model/SimpleType',
    ],
    (
      // prettier 방지용 주석
      FormatException,
      ParseException,
      SimpleType
    ) => {
      'use strict';
  
      /**
       * 0 ~ 100
       */
      return SimpleType.extend('sap.ui.tesna.mvc.model.type.Percent', {
        formatValue(oValue, sTargetType) {
          switch (this.getPrimitiveType(sTargetType)) {
            case 'string':
            case 'any':
              return this._toString(oValue, sTargetType);
            case 'number':
              return this._toNumber(oValue, sTargetType);
            default:
              throw new FormatException(`Don't know how to format Percent to ${sTargetType}`);
          }
        },
  
        parseValue(oValue, sTargetType) {
          switch (this.getPrimitiveType(sTargetType)) {
            case 'string':
              return this._toString(oValue, sTargetType);
            case 'number':
            case 'any':
              return this._toNumber(oValue, sTargetType);
            default:
              throw new ParseException(`Don't know how to parse Percent from ${sTargetType}`);
          }
        },
  
        validateValue() {
          return true;
        },
  
        _toString(oValue, sTargetType) {
          if (!oValue) {
            return '0';
          }
  
          if (typeof oValue === 'number' || oValue instanceof Number) {
            return String(Math.min(100, Math.max(0, Math.abs(oValue))));
          }
  
          if (typeof oValue === 'string' || oValue instanceof String) {
            return this._toString(Number(oValue));
          }
  
          throw new FormatException(`Don't know how to format Percent to ${sTargetType}`);
        },
  
        _toNumber(oValue, sTargetType) {
          if (!oValue) {
            return 0;
          }
  
          if (typeof oValue === 'number' || oValue instanceof Number) {
            return Math.min(100, Math.max(0, Math.abs(oValue)));
          }
  
          if (typeof oValue === 'string' || oValue instanceof String) {
            return this._toNumber(Number(oValue));
          }
  
          throw new ParseException(`Don't know how to parse Percent from ${sTargetType}`);
        },
      });
    }
  );