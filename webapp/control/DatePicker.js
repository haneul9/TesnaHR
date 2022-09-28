sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/m/Button',
    'sap/m/ButtonType',
    'sap/m/DatePicker',
    'sap/ui/tesna/common/AppUtils',
  ],
  (
    // prettier 방지용 주석
    Button,
    ButtonType,
    DatePicker,
    AppUtils
  ) => {
    'use strict';

    /**
     * '오늘' 버튼 기능을 구현한 DatePicker
     * ResponsivePopover Footer의 '확인' 버튼을 감추고 '취소' 버튼을 '오늘' 버튼으로 오버라이딩
     */
    return DatePicker.extend('sap.ui.tesna.control.DatePicker', {
      metadata: {
        properties: {
          pickOnly: 'boolean',
        },
      },

      renderer: {},

      constructor: function (...aArgs) {
        DatePicker.apply(this, aArgs);

        let Dtfmt;
        const oBindingValueType = (this.getBindingInfo('value') || this.getBindingInfo('dateValue') || {}).type;
        if (oBindingValueType && (oBindingValueType.getName() || '').startsWith('Custom')) {
          Dtfmt = oBindingValueType.oFormatOptions.pattern;
        }
        if (!Dtfmt) {
          Dtfmt = AppUtils.getAppComponent().getAppointeeModel().getProperty('/Dtfmt');
        }

        this.setShowFooter(true).setValueFormat(Dtfmt).setDisplayFormat(Dtfmt).setPlaceholder(Dtfmt).addStyleClass('sapIcon_Date');

        if (this.getPickOnly()) {
          this.addStyleClass('pickonly-datepicker');
        }
      },

      /**
       * @override
       */
      onAfterRendering(...aArgs) {
        DatePicker.prototype.onAfterRendering.apply(this, aArgs);

        if (this.getPickOnly()) {
          this.$()
            .find('input')
            .prop('readonly', true)
            .off('click')
            .on('click', () => {
              this.toggleOpen(this.isOpen());
            });
        }
      },

      _createPopup() {
        DatePicker.prototype._createPopup.apply(this);

        this._oPopup.getBeginButton().setVisible(false);

        const sTodayText = AppUtils.getBundleText('LABEL_00160'); // 오늘
        const oEndButton = this._oPopup.getEndButton();
        if (oEndButton) {
          oEndButton.setType(ButtonType.Emphasized).setText(sTodayText);
        } else {
          this._oPopup.setEndButton(
            new Button({
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
