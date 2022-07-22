sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/base/Object',
      'sap/ui/tesna/common/AppUtils',
    ],
    (
      // prettier 방지용 주석
      BaseObject,
      AppUtils
    ) => {
      'use strict';
  
      return BaseObject.extend('sap.ui.tesna.common.Debuggable', {
        debug(...aArgs) {
          AppUtils.debug(...aArgs);
          return this;
        },
      });
    }
  );