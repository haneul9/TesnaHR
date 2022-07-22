sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/m/Breadcrumbs',
    'sap/m/FlexItemData',
    'sap/m/Link',
    'sap/ui/tesna/common/AppUtils',
  ],
  (
    // prettier 방지용 주석
    Breadcrumbs,
    FlexItemData,
    Link,
    AppUtils
  ) => {
    'use strict';

    return Breadcrumbs.extend('sap.ui.tesna.control.Breadcrumbs', {
      renderer: {},

      constructor: function (...aArgs) {
        Breadcrumbs.apply(this, aArgs);

        const oMenuModel = AppUtils.getAppComponent().getMenuModel();
        this.setLayoutData(new FlexItemData({ growFactor: 1 }))
          .setModel(oMenuModel)
          // .setSeparatorStyle(BreadcrumbsSeparatorStyle.GreaterThan)
          .bindProperty('currentLocationText', '/breadcrumbs/currentLocationText')
          .bindAggregation('links', {
            path: '/breadcrumbs/links',
            template: new Link({ text: '{name}', enabled: false, subtle: true }),
            templateShareable: false,
          });
      },
    });
  }
);
