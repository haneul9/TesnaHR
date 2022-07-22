sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/tesna/control/MessageBox',
      'sap/ui/tesna/common/AppUtils',
    ],
    (
      // prettier 방지용 주석
      MessageBox,
      AppUtils
    ) => {
      'use strict';
  
      const mMessageType = {
        INPUT1: 'MSG_00002', // {0}을 입력하세요.
        INPUT2: 'MSG_00003', // {0}를 입력하세요.
        SELECT1: 'MSG_00004', // {0}을 선택하세요.
        SELECT2: 'MSG_00005', // {0}를 선택하세요.
        FILE: 'MSG_00044', // {0}을 등록하세요.
      };
  
      return {
        INPUT1: 'INPUT1',
        INPUT2: 'INPUT2',
        SELECT1: 'SELECT1',
        SELECT2: 'SELECT2',
        FILE: 'FILE',
  
        /**************************
         * Functions
         *************************/
        check({ mFieldValue, aFieldProperties = [], sPrefixMessage }) {
          if (_.isEmpty(mFieldValue)) return false;
  
          const bIsValid = !aFieldProperties.some((o) => {
            const sValue = mFieldValue[o.field];
            const aMessages = [sPrefixMessage];
  
            if (!sValue || ((o.type === this.SELECT1 || o.type === this.SELECT2) && sValue === 'ALL')) {
              aMessages.push(AppUtils.getBundleText(mMessageType[o.type], o.label));
              MessageBox.alert(_.chain(aMessages).compact().join(' ').value());
  
              return true;
            }
          });
  
          return bIsValid;
        },
      };
    }
  );