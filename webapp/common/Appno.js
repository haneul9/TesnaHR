sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/tesna/common/exceptions/UI5Error',
      'sap/ui/tesna/common/odata/Client',
      'sap/ui/tesna/common/odata/ServiceNames',
      'sap/ui/tesna/common/AppUtils',
    ],
    (
      // prettier 방지용 주석
      UI5Error,
      Client,
      ServiceNames,
      AppUtils
    ) => {
      'use strict';
  
      return {
        async get() {
          try {
            const oModel = AppUtils.getAppComponent().getModel(ServiceNames.COMMON);
            const aResults = await Client.getEntitySet(oModel, 'CreateAppno');
  
            return (aResults[0] || {}).Appno || '';
          } catch (oError) {
            AppUtils.debug('Appno.get error.', oError);
  
            throw new UI5Error({ message: AppUtils.getBundleText('MSG_00047') }); // 결재문서번호 생성중 오류가 발생하였습니다.\n잠시 후 다시 시도해주세요.
          }
        },
      };
    }
  );