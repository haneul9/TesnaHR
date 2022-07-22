sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/m/MessageBox',
    ],
    function (
      // prettier 방지용 주석
      MessageBox
    ) {
      'use strict';
  
      const getBundleText = (sCode) => {
        return sap.ui.getCore().getComponent('container-ehr').getModel('i18n').getResourceBundle().getText(sCode);
      };
  
      return {
        ...MessageBox,
        show(vMessage, mOptions = {}) {
          MessageBox.show(vMessage, { ...mOptions, title: getBundleText('LABEL_SHOW') }); // 보기
        },
        alert(vMessage, mOptions = {}) {
          MessageBox.alert(vMessage, { ...mOptions, title: getBundleText('LABEL_ALERT') }); // 안내
        },
        confirm(vMessage, mOptions = {}) {
          MessageBox.confirm(vMessage, { ...mOptions, title: getBundleText('LABEL_CONFIRM') }); // 확인
        },
        error(vMessage, mOptions = {}) {
          MessageBox.error(vMessage, { ...mOptions, title: getBundleText('LABEL_ERROR') }); // 오류
        },
        information(vMessage, mOptions = {}) {
          MessageBox.information(vMessage, { ...mOptions, title: getBundleText('LABEL_INFORMATION') }); // 정보
        },
        success(vMessage, mOptions = {}) {
          MessageBox.success(vMessage, { ...mOptions, title: getBundleText('LABEL_SUCCESS') }); // 성공
        },
        warning(vMessage, mOptions = {}) {
          MessageBox.warning(vMessage, { ...mOptions, title: getBundleText('LABEL_WARNING') }); // 경고
        },
      };
    }
  );