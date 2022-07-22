sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/m/DateRangeSelection',
      'sap/m/ButtonType',
      'sap/ui/tesna/common/AppUtils',
    ],
    (
      // prettier 방지용 주석
      DateRangeSelection,
      ButtonType,
      AppUtils
    ) => {
      'use strict';
  
      /**
       * '오늘' 버튼 기능을 구현한 DateRangeSelection
       * ResponsivePopover Footer의 '확인' 버튼을 감추고 '취소' 버튼을 '오늘' 버튼으로 오버라이딩
       */
      return DateRangeSelection.extend('sap.ui.tesna.control.DateRangeSelection', {
        renderer: {},
  
        constructor: function (...aArgs) {
          DateRangeSelection.apply(this, aArgs);
  
          let Dtfmt;
          const oBindingValueType = (this.getBindingInfo('value') || this.getBindingInfo('dateValue') || {}).type;
          if (oBindingValueType && (oBindingValueType.getName() || '').startsWith('Custom')) {
            Dtfmt = oBindingValueType.oFormatOptions.pattern;
          }
          if (!Dtfmt) {
            Dtfmt = AppUtils.getAppComponent().getAppointeeModel().getProperty('/Dtfmt');
          }
  
          this.setShowFooter(true).setValueFormat(Dtfmt).setDisplayFormat(Dtfmt).setPlaceholder(`${Dtfmt} - ${Dtfmt}`).addStyleClass('sapIcon_Date');
        },
  
        _createPopup() {
          DateRangeSelection.prototype._createPopup.apply(this);
  
          this._oPopup.getBeginButton().setVisible(false);
  
          const sTodayText = AppUtils.getBundleText('LABEL_01001'); // 오늘
          const oEndButton = this._oPopup.getEndButton();
          if (oEndButton) {
            oEndButton.setType(ButtonType.Emphasized).setText(sTodayText);
          } else {
            this._oPopup.setEndButton(
              new sap.m.Button({
                text: sTodayText,
                type: ButtonType.Emphasized,
                press: this._handleCancelButton.bind(this),
              })
            );
          }
        },
  
        _handleCancelButton() {
          this._oCalendar.focusDate(new Date());
        },
  
        _handleCalendarSelect() {
          this._selectDate();
        },
      });
    }
  );