sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/core/Control',
      'sap/m/FlexAlignItems',
      'sap/m/FlexJustifyContent',
    ],
    function (
      // prettier 방지용 주석
      Control,
      FlexAlignItems,
      FlexJustifyContent
    ) {
      'use strict';
  
      return Control.extend('sap.ui.tesna.control.Postcode', {
        metadata: {
          properties: {
            completed: { type: 'function' },
          },
        },
  
        createBox: function () {
          const oPostcodeContainer = new sap.m.VBox({ alignItems: FlexAlignItems.Center, justifyContent: FlexJustifyContent.Center });
          const oPostcodeBox = new sap.ui.core.HTML({ content: `<div id='${this.getId()}' class='postcode-box'></div>`, preferDOM: true });
  
          oPostcodeContainer.addItem(oPostcodeBox);
  
          return oPostcodeContainer;
        },
  
        renderer: function (oRm, oControl) {
          const layout = oControl.createBox();
  
          oRm.write('<div');
          oRm.writeControlData(layout);
          oRm.writeClasses();
          oRm.write('>');
          oRm.renderControl(layout);
          oRm.addClass('verticalAlignment');
          oRm.write('</div>');
        },
  
        onAfterRendering: function () {
          const fCompleted = this.getCompleted();
          this.oPostcodeBox = document.getElementById(this.getId());
  
          this.oPostcodeBox.style.width = '500px';
          this.oPostcodeBox.style.height = '500px';
          this.oPostcodeBox.style.border = '3px solid';
  
          new daum.Postcode({
            width: '100%',
            height: '100%',
            maxSuggestItems: 5,
            oncomplete: function ({ userLanguageType, userSelectedType, zonecode, sido, sigungu, roadAddress, roadAddressEnglish, jibunAddress, jibunAddressEnglish, bname, buildingName }) {
              const aFullAddress = [];
              const sExtraAddress = [];
  
              /**
               * userLanguageType === E, 영문주소
               * userSelectedType === R, 도로명
               * bname, 법정동명
               * buildingName, 건물명
               */
              if (_.isEqual(userLanguageType, 'E')) {
                aFullAddress.push(_.isEqual(userSelectedType, 'R') ? roadAddressEnglish : jibunAddressEnglish);
              } else {
                if (_.isEqual(userSelectedType, 'R')) {
                  aFullAddress.push(roadAddress);
  
                  if (!_.isEmpty(bname)) sExtraAddress.push(bname);
                  if (!_.isEmpty(buildingName)) sExtraAddress.push(buildingName);
  
                  if (!_.isEmpty(sExtraAddress)) aFullAddress.push(`(${_.join(sExtraAddress, ', ')})`);
                } else {
                  aFullAddress.push(jibunAddress);
                }
              }
  
              fCompleted({ sPostcode: zonecode, sFullAddr: _.join(aFullAddress, ''), sSido: sido, sSigungu: sigungu });
            },
          }).embed(this.oPostcodeBox);
        },
      });
    }
  );