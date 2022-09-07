sap.ui.define(
  [
    // prettier 방지용 주석
  ],
  () =>
    // prettier 방지용 주석
    {
      'use strict';

      return {
        /**************************
         * 금액 format ex) 1234567 => 1,234,567
         *************************/
        toCurrency(x) {
          // return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          return new Intl.NumberFormat('ko-KR').format(x || 0);
        },

        /**************************
         * InputBox에서 금액 입력시 보이는 Ui는 금액format이 되고
         * 실질적인 Property에는 그냥 셋팅됨
         *************************/
        liveChangeCurrency(oEvent) {
          const oEventSource = oEvent.getSource();
          const sPath = oEventSource.getBinding('value').getPath();
          const sValue = oEvent.getParameter('value').trim().replace(/[^\d]/g, '');

          oEventSource.setValue(this.toCurrency(sValue || '0'));
          oEventSource.getModel().setProperty(sPath, sValue || '0');
        },

        liveChangePhoneNumber(oEvent) {
          const oEventSource = oEvent.getSource();
          const sValue = oEventSource.getValue();
          const sConvertedValue = _.chain(sValue)
            .replace(/[^0-9]*/g, '')
            .truncate({ length: 11, omission: '' })
            .thru((s) => (s.length < 3 ? s : s.length < 7 ? s.replace(/(\d{3})(\d)/g, '$1-$2') : s.replace(/(\d{3})(\d{3,4})(\d)/, '$1-$2-$3')))
            .value();

          oEventSource.setValue(sConvertedValue);
        },
      };
    }
);
