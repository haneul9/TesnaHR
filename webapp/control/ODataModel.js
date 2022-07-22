sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/model/odata/v2/ODataModel',
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/common/DateUtils',
    ],
    function (
      // prettier 방지용 주석
      ODataModel,
      AppUtils,
      DateUtils
    ) {
      ('use strict');
  
      return ODataModel.extend('sap.ui.tesna.control.ODataModel', {
        create(sPath, mData) {
          AppUtils.debug(arguments);
  
          if (sap.ui.getCore().byId('container-ehr---app')) {
            const sServiceName = _.chain(this.sServiceUrl).split('/').last().value();
            const mModelMetadata = AppUtils.getAppComponent().getModel('metadataModel').getProperty(`/${sServiceName}`);
            const sEntityKey = sPath.replace(/\/|Set$/g, '');
            const mEntityMetadata = mModelMetadata[sEntityKey];
  
            _.forEach(mData, (vObject, sKey) => {
              if (!_.has(mEntityMetadata, sKey) && !_.isArray(vObject)) {
                delete mData[sKey];
              } else if (_.isArray(vObject)) {
                const mAssociationMetadata = mModelMetadata[mModelMetadata[mEntityMetadata[sKey]]];
  
                _.forEach(vObject, (o) => {
                  _.forEach(o, (v, k) => {
                    if (!_.has(mAssociationMetadata, k)) {
                      delete o[k];
                    } else {
                      this.convertValue(o, k, _.get(mAssociationMetadata, [k, 'type']));
                    }
                  });
                });
              } else {
                this.convertValue(mData, sKey, _.get(mEntityMetadata, [sKey, 'type']));
              }
            });
          }
  
          if (ODataModel.prototype.create) {
            ODataModel.prototype.create.apply(this, arguments); // run the super class's method first
          }
        },
  
        convertValue(mData, sKey, type) {
          const sValue = _.get(mData, sKey);
  
          if (_.startsWith(type, 'Edm.Int')) {
            _.set(mData, sKey, _.toNumber(sValue));
          } else if (_.startsWith(type, 'Edm.Boolean')) {
            _.set(mData, sKey, sValue);
          } else if (_.isEqual(sValue, 'ALL')) {
            _.set(mData, sKey, _.noop());
          } else if (_.isDate(sValue)) {
            _.set(mData, sKey, DateUtils.parse(sValue));
          } else if (_.isNumber(sValue)) {
            _.set(mData, sKey, _.toString(sValue));
          } else if (_.isBoolean(sValue)) {
            _.set(mData, sKey, _.isEqual(true, sValue) ? 'X' : '');
          }
        },
      });
    }
  );