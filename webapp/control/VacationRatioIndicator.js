sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/tesna/control/VacationIndicator',
    ],
    function (
      // prettier 방지용 주석
      VacationIndicator
    ) {
      'use strict';
  
      return VacationIndicator.extend('sap.ui.tesna.control.VacationRatioIndicator', {
        metadata: {
          properties: {
            decimal: {
              type: 'int',
              defaultValue: 0,
            },
          },
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
            if (oControl.hasListeners('press')) {
              oRM.class('sapMPointer');
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
            oRM.text(this.getPercent(fUsed, oControl));
            oRM.close('div');
          },
          getAlignStyleClass(oControl) {
            const sAlign = oControl.getAlign();
            return sAlign === 'Top' ? 'vacation-indicator-top' : sAlign === 'Bottom' ? 'vacation-indicator-bottom' : 'vacation-indicator-middle';
          },
          getRemain(oControl) {
            const fTotal = parseFloat(oControl.getTotal());
            const fUsed = parseFloat(oControl.getUsed());
  
            return fTotal - fUsed;
          },
          getPercent(fValue, oControl) {
            const fTotal = parseFloat(oControl.getTotal() || 0);
            if (fTotal === 0) {
              return '.5rem';
            }
            const fPercent = ((fValue / fTotal) * 100).toFixed(oControl.getDecimal());
  
            return `${fPercent}%`;
          },
        },
      });
    }
  );