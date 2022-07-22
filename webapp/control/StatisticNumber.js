sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/m/ObjectNumber',
      'sap/ui/core/TextAlign',
      'sap/ui/tesna/mvc/model/type/Currency',
    ],
    (
      // prettier 방지용 주석
      ObjectNumber,
      TextAlign,
      Currency
    ) => {
      'use strict';
  
      return ObjectNumber.extend('sap.ui.tesna.control.StatisticNumber', {
        metadata: {
          properties: {
            prefix: { type: 'string', group: 'Misc', defaultValue: '' },
            path: { type: 'string', group: 'Misc', defaultValue: '' },
            large: { type: 'boolean', group: 'Appearance', defaultValue: false },
            fontWeight: { type: 'int', group: 'Appearance', defaultValue: 500 },
            // size: { type: 'sap.ui.core.CSSSize', group: 'Dimension', defaultValue: '14px' },
          },
          events: {
            press: {},
          },
        },
  
        renderer: {},
  
        /**
         * @override
         */
        constructor: function (...aArgs) {
          ObjectNumber.apply(this, aArgs);
  
          const sTextAlign = this.getTextAlign();
          const bLarge = this.getLarge();
  
          // this.bindProperty('number', this.getPath(), (sNumber) => {
          //   return TextUtils.toCurrency(sNumber);
          // });
          this.bindProperty('number', { path: this.getPath(), type: new Currency() }) //
            .setEmphasized(false)
            .addStyleClass(`statistic-number statistic-number-weight-${this.getFontWeight()}`)
            .toggleStyleClass('statistic-number-align-start', [TextAlign.Begin, TextAlign.Left].includes(sTextAlign))
            .toggleStyleClass('statistic-number-align-center', [TextAlign.Center].includes(sTextAlign))
            .toggleStyleClass('statistic-number-align-end', [TextAlign.End, TextAlign.Right].includes(sTextAlign))
            .toggleStyleClass('statistic-number-large', bLarge);
        },
  
        /**
         * @override
         */
        onBeforeRendering(...aArgs) {
          ObjectNumber.prototype.onBeforeRendering.apply(this, aArgs);
  
          this.toggleStyleClass('statistic-number-active', this._isActive());
        },
  
        /**
         * @override
         */
        onAfterRendering(...aArgs) {
          ObjectNumber.prototype.onAfterRendering.apply(this, aArgs);
  
          const sPrefix = this.getPrefix();
          if (sPrefix) {
            this.$().prepend(`<span class="sapMObjectNumberUnit">${sPrefix.replace(/\s$/, '&nbsp;')}</span>`);
          }
        },
  
        onclick() {
          if (this._isActive()) {
            this.firePress();
          }
        },
  
        _isActive() {
          return this.getNumber() > 0;
        },
  
        _parseSize() {
          const aNumberSize = this.getSize().match(/([.\d]*)(px|rem|em)/) || [null, '14', 'px'];
          return {
            size: Number(aNumberSize[1]),
            unit: aNumberSize[2],
          };
        },
      });
    }
  );