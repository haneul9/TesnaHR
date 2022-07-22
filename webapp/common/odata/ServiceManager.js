sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/tesna/control/ODataModel',
      'sap/ui/tesna/common/odata/ServiceNames',
    ],
    (
      // prettier 방지용 주석
      ODataModel,
      ServiceNames
    ) => {
      'use strict';
  
      // localhost인 경우 ui5.yaml에 세팅된 proxy server를 경유하여 SAP로 요청이 들어가야하므로 /sap/opu/odata/sap/ 앞에 /proxy를 붙임
      const urlPrefix = (window.location.hostname === 'localhost' ? '/proxy' : '') + '/sap/opu/odata/sap/';
  
      const ServiceManager = {
        /**
         * static fields
         */
        ...ServiceNames,
  
        urlPrefix,
  
        /**
         * 서비스 URL 반환
         * @public
         * @param {string} sServiceNameKey 서비스 이름 key (예 : ServiceNames.COMMON) 또는 서비스 이름 (예 : ZHR_COMMON_SRV)
         * @returns {string} 서비스 URL (예 : /sap/opu/odata/sap/ZHR_COMMON_SRV)
         */
        getServiceUrl(sServiceNameKey = '') {
          const sTrimedServiceNameKey = sServiceNameKey.replace(/^[/\s]+/, ''); // 앞 공백 또는 slash 제거
          const sServiceName = /^ZHR/.test(sTrimedServiceNameKey) ? sTrimedServiceNameKey : this[sTrimedServiceNameKey];
          return `${this.urlPrefix}${sServiceName}`;
        },
  
        /**
         * ODataModel 객체 생성
         * @public
         * @param {string} sServiceName 서비스 이름 (예 : ServiceNames.COMMON)
         * @param {object} oUIComponent component object, controller에서 this.getOwnerComponent()를 호출하여 참조값을 얻을 수 있음
         * @returns {object} OData service의 sap.ui.model.odata.v2.ODataModel 객체
         */
        getODataModel(sServiceName) {
          const sServiceUrl = this.getServiceUrl(sServiceName);
          return new ODataModel(sServiceUrl, { loadMetadataAsync: true, useBatch: false });
        },
  
        /**
         * OData 서비스 이름 배열 반환
         * @public
         * @returns {array}
         */
        getServiceNames() {
          return Object.values(ServiceNames);
        },
  
        getMetadata(oServiceModel) {
          const oSchema = oServiceModel.getServiceMetadata().dataServices.schema[0];
          const mEntityType = {};
  
          oSchema.entityType.forEach((o) => {
            mEntityType[o.name] = {};
  
            o.property.forEach((p) => {
              mEntityType[o.name][p.name] = { ...p, label: (_.find(p.extensions, { name: 'label' }) || {}).value };
            });
  
            if (Array.isArray(o.navigationProperty)) {
              o.navigationProperty.forEach((np) => {
                mEntityType[o.name][np.name] = np.relationship.split('.').slice(-1)[0];
              });
            }
          });
  
          if (Array.isArray(oSchema.association)) {
            oSchema.association.forEach((p) => {
              mEntityType[p.name] = _.find(p.end, { multiplicity: '*' }).type.split('.').slice(-1)[0];
            });
          }
  
          return mEntityType;
        },
      };
  
      return ServiceManager;
    },
    /* bExport= */ true
  );