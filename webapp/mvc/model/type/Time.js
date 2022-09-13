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
     * Edm.Time
     */
    return SimpleType.extend('sap.ui.tesna.mvc.model.type.Time', {
      constructor: function (...args) {
        SimpleType.apply(this, args);

        this.i9Hours = 9 * 60 * 60 * 1000;
        this.sName = 'CustomTime';
      },

      formatValue(oValue, sTargetType) {
        switch (this.getPrimitiveType(sTargetType)) {
          case 'string':
          case 'any':
            return this._toString(oValue, sTargetType);
          case 'object':
            return this._toObject(oValue, sTargetType);
          default:
            throw new FormatException(`Don't know how to format Time to ${sTargetType}`);
        }
      },

      parseValue(oValue, sTargetType) {
        switch (this.getPrimitiveType(sTargetType)) {
          case 'string':
            return this._toString(oValue, sTargetType);
          case 'object':
          case 'any':
            return this._toObject(oValue, sTargetType);
          default:
            throw new ParseException(`Don't know how to parse Time from ${sTargetType}`);
        }
      },

      validateValue() {
        return true;
      },

      _toString(oValue, sTargetType) {
        if (!oValue) {
          return '';
        }

        const sHHmmss = this.oFormatOptions.pattern;

        if ($.isPlainObject(oValue)) {
          return moment(oValue.ms - this.i9Hours).format(sHHmmss);
        }

        if (typeof oValue === 'string' || oValue instanceof String) {
          return this.getMoment(oValue).format(sHHmmss);
        }

        throw new FormatException(`Don't know how to format Time to ${sTargetType}`);
      },

      _toObject(oValue, sTargetType) {
        if (!oValue) {
          return null;
        }

        if ($.isPlainObject(oValue)) {
          return oValue;
        }

        if (typeof oValue === 'string' || oValue instanceof String) {
          return { __edmType: 'Edm.Time', ms: this.getMoment(oValue).valueOf() };
        }

        throw new ParseException(`Don't know how to parse Time from ${sTargetType}`);
      },

      getParsePatternForMoment() {
        return 'YYYYMMDDHHmmss';
      },

      getMoment(oValue) {
        if (/^PT/.test(oValue)) {
          return moment.duration(oValue).add(this.i9Hours, 'milliseconds');
        }

        const sTimeString = oValue.replace(/[^\d]/g, '');
        return moment(`19700101${sTimeString}`, this.getParsePatternForMoment());
      },
    });
  }
);
