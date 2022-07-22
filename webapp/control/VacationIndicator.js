sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/core/Control',
    ],
    function (
      // prettier 방지용 주석
      Control
    ) {
      'use strict';
  
      return Control.extend('sap.ui.tesna.control.VacationIndicator', {
        metadata: {
          properties: {
            width: {
              type: 'sap.ui.core.CSSSize',
              defaultValue: '10rem',
            },
            align: {
              type: 'string',
              defaultValue: 'Middle',
            },
            used: {
              type: 'float',
              defaultValue: 0,
            },
            used2: {
              type: 'float',
              defaultValue: 0,
            },
            total: {
              type: 'float',
              defaultValue: 14,
            },
            showTotal: {
              type: 'boolean',
              defaultValue: false,
            },
            usedType: {
              type: 'string',
              defaultValue: 'Base',
            },
            chartOnly: {
              type: 'boolean',
              defaultValue: false,
            },
          },
          events: {
            press: {},
          },
        },
  
        onclick() {
          this.firePress();
        },
  
        onAfterRendering() {
          const bShowTotal = this.getShowTotal();
          const $indicator = this.$();
  
          // TODO : align 적용
  
          if (bShowTotal) {
            $indicator.find('.vacation-indicator').toggleClass('vacation-indicator-show-total', true);
            $indicator.find('.vacation-indicator-gauge,.vacation-indicator-text').prepend(`<div class="vacation-indicator-total w-100">${this.getTotal()}</div>`);
            $indicator.find('.vacation-indicator-remain,.vacation-indicator-used').hide().toggleClass('w-100 vacation-indicator-animation vacation-indicator-zero', false);
          } else {
            $indicator.find('.vacation-indicator').toggleClass('vacation-indicator-show-total', false);
            $indicator.find('.vacation-indicator-total').remove();
            $indicator.find('.vacation-indicator-used').hide();
            $indicator.find('.vacation-indicator-remain,.vacation-indicator-used').toggleClass('vacation-indicator-animation vacation-indicator-zero', false);
          }
  
          setTimeout(() => {
            const fUsed2 = parseFloat(this.getUsed2() || 0);
            const fUsed = parseFloat(this.getUsed() || 0);
  
            if (bShowTotal) {
              let sRemainWidth = '66.6666666%';
              let sUsedWidth = '33.3333333%';
  
              // if (this.getUsedType() === 'WeekTime') {
              sRemainWidth = this._getUsedWidth(fUsed2);
              sUsedWidth = this._getUsedWidth(fUsed);
              // }
  
              const $remain = $indicator.find('.vacation-indicator-remain').show();
              if (fUsed2 >= 1) {
                $remain.css('width', sRemainWidth);
              }
              $remain.toggleClass('vacation-indicator-animation', true);
  
              const $used = $indicator
                .find('.vacation-indicator-used')
                .toggleClass('vacation-indicator-zero', fUsed < 4.5)
                .show();
              if (fUsed >= 1) {
                $used.css('width', sUsedWidth);
              }
              $used.toggleClass('vacation-indicator-animation', true);
            } else {
              const sUsedWidth = this._getUsedWidth(fUsed);
  
              $indicator.find('.vacation-indicator-remain').toggleClass('w-100', true);
              const $used = $indicator
                .find('.vacation-indicator-used')
                .toggleClass('vacation-indicator-zero', fUsed < 4.5)
                .show();
              if (fUsed >= 1) {
                $used.css('width', sUsedWidth);
              }
              $used.toggleClass('vacation-indicator-animation', true);
            }
          }, 300);
        },
  
        _getUsedWidth(fUsed) {
          const fTotal = parseFloat(this.getTotal());
          const fMinPercent = 18;
          const fMaxPercent = 82;
  
          let fUsedPercent = fTotal === 0 ? 0 : (fUsed / fTotal) * 100;
          if (fUsedPercent < 4.5) {
            return '.5rem';
          } else if (fUsedPercent === 100) {
            return '100%';
          }
          fUsedPercent = Math.min(Math.max(fUsedPercent, fMinPercent), fMaxPercent);
          return `${fUsedPercent}%`;
        },
  
        renderer: {
          apiVersion: 2,
          render(oRM, oControl) {
            // wrapper div
            oRM.openStart('div', oControl);
            oRM.class('vacation-indicator');
            oRM.class(this.getAlignStyleClass(oControl));
            if (oControl.getShowTotal()) {
              oRM.class('vacation-indicator-show-total');
            }
            oRM.style('width', oControl.getWidth());
            oRM.openEnd();
  
            this.insertWrapper(oRM, oControl, 'gauge'); // gauge wrapper div
  
            if (!oControl.getChartOnly()) {
              this.insertWrapper(oRM, oControl, 'text'); // text wrapper div
            }
  
            oRM.close('div');
          },
          insertWrapper(oRM, oControl, sWrapperName) {
            oRM.openStart('div');
            oRM.class(`vacation-indicator-${sWrapperName}`);
            oRM.class('w-100');
            oRM.openEnd();
  
            this.insertTotalDiv(oRM, oControl); // total gauge div
            this.insertRemainDiv(oRM, oControl); // remain gauge div
            this.insertUsedDiv(oRM, oControl); // used gauge div
  
            oRM.close('div');
          },
          insertTotalDiv(oRM, oControl) {
            oRM.openStart('div');
            oRM.class('vacation-indicator-total');
            oRM.class('w-100');
            oRM.openEnd();
            oRM.text(oControl.getTotal());
            oRM.close('div');
          },
          insertRemainDiv(oRM, oControl) {
            const fRemain = this.getRemain(oControl);
            oRM.openStart('div');
            oRM.class('vacation-indicator-remain');
            if (!oControl.getShowTotal()) {
              oRM.class('w-100');
              if (fRemain === 0) {
                oRM.class('vacation-indicator-zero');
              }
            }
            oRM.openEnd();
            oRM.text(fRemain);
            oRM.close('div');
          },
          insertUsedDiv(oRM, oControl) {
            const fUsed = oControl.getUsed();
            oRM.openStart('div');
            oRM.class('vacation-indicator-used');
            if (!oControl.getShowTotal() && fUsed === 0) {
              oRM.class('vacation-indicator-zero');
            }
            oRM.openEnd();
            oRM.text(fUsed);
            oRM.close('div');
          },
          getAlignStyleClass(oControl) {
            const sAlign = oControl.getAlign();
            return sAlign === 'Top' ? 'vacation-indicator-top' : sAlign === 'Bottom' ? 'vacation-indicator-bottom' : 'vacation-indicator-middle';
          },
          getRemain(oControl) {
            let fTotal = 0;
            let fUsed = 0;
            let fRemain = 0;
  
            if (oControl.getUsedType() === 'WeekTime') {
              let fUsed2 = 0;
  
              fTotal = parseFloat(oControl.getTotal());
              fUsed = parseFloat(oControl.getUsed());
              fUsed2 = parseFloat(oControl.getUsed2());
  
              fRemain = fUsed + fUsed2;
            } else {
              fTotal = parseFloat(oControl.getTotal());
              fUsed = parseFloat(oControl.getUsed());
  
              fRemain = fTotal - fUsed;
            }
  
            return fRemain;
          },
        },
      });
    }
  );