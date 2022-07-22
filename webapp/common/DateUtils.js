sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/model/FormatException',
      'sap/ui/model/ParseException',
      'sap/ui/tesna/common/AppUtils',
    ],
    (
      // prettier 방지용 주석
      FormatException,
      ParseException,
      AppUtils
    ) => {
      ('use strict');
  
      /**
       * 주의 : formatter 사용시 format으로 변환된 값은 해당 control에만 적용되며
       *        model이 TwoWay binding mode라도 model에는 저장되지 않음
       *        model에도 저장이 되도록 하려면 SimpleType을 확장하여 커스텀 type을 만들어 사용해야함
       *        예) sap.ui.tesna.mvc.model.type.Date
       */
      const DateUtils = {
        format(vValue) {
          if (!vValue) {
            return null;
          }
          const sDTFMT = AppUtils.getAppComponent().getSessionModel().getProperty('/DTFMT');
          if (vValue instanceof Date) {
            return moment(vValue).format(sDTFMT);
          }
          if (vValue instanceof String || typeof vValue === 'string') {
            if (/^\/Date/.test(vValue)) {
              const iTime = parseInt(vValue.replace(/\/Date\((-?\d+)\)\//, '$1'), 10);
              return moment(iTime).format(sDTFMT);
            }
            const sDateString = vValue.replace(/[^\d]/g, '');
            return moment(sDateString, 'YYYYMMDD').format(sDTFMT);
          }
          throw new FormatException(`Don't know how to format Date from ${vValue}`);
        },
  
        parse(vValue) {
          if (!vValue) {
            return null;
          }
          if (vValue instanceof Date) {
            return moment(vValue).hour(9).toDate();
          }
          if (vValue instanceof String || typeof vValue === 'string') {
            if (/^\/Date/.test(vValue)) {
              const iTime = parseInt(vValue.replace(/\/Date\((-?\d+)\)\//, '$1'), 10);
              return new Date(iTime);
            }
            const sDateString = vValue.replace(/[^\d]/g, '');
            return moment(sDateString, 'YYYYMMDD').hour(9).toDate();
          }
          throw new ParseException(`Don't know how to parse Date from ${vValue}`);
        },
      };
  
      return DateUtils;
    }
  );