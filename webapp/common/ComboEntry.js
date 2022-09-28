sap.ui.define(
  [
    'sap/ui/base/Object', //
    'sap/ui/tesna/common/AppUtils',
  ],
  function (BaseObject, AppUtils) {
    'use strict';

    return BaseObject.extend('sap.ui.tesna.common.ComboEntry', {
      /**
       * @override
       * @returns {sap.ui.base.Object}
       */
      constructor: function ({ codeKey = 'code', valueKey = 'text', aEntries = [] }) {
        return [{ [codeKey]: 'ALL', [valueKey]: AppUtils.getBundleText('LABEL_00187') }, ..._.map(aEntries, (o) => _.omit(o, '__metadata'))];
      },
    });
  }
);
