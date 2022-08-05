sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/odata/ServiceNames',
  ],
  (
    // prettier 방지용 주석
    Filter,
    FilterOperator,
    AppUtils,
    ServiceNames
  ) => {
    'use strict';

    return {
      async readData(sAppno, sAppty, iFnumr) {
        const aFiles = await this.read(sAppno, sAppty, iFnumr);
        const mFile = aFiles[0] || {};

        mFile.New = false;
        mFile.Deleted = false;

        return mFile;
      },

      async readListData(sAppno, sAppty) {
        const aFiles = await this.read(sAppno, sAppty);

        aFiles.forEach((mFile) => {
          mFile.New = false;
          mFile.Deleted = false;
        });

        return aFiles;
      },

      async read(sAppno, sAppty, iFnumr) {
        return new Promise((resolve, reject) => {
          const oServiceModel = AppUtils.getAppComponent().getModel(ServiceNames.COMMON);
          const sUrl = '/FileListSet';
          const aFilters = [
            new Filter('Appno', FilterOperator.EQ, sAppno), // prettier 방지용 주석
            new Filter('Appty', FilterOperator.EQ, sAppty),
          ];

          if (typeof iFnumr !== 'undefined') {
            aFilters.push(new Filter('Fnumr', FilterOperator.EQ, iFnumr));
          }

          oServiceModel.read(sUrl, {
            filters: aFilters,
            success: (mData) => {
              resolve((mData || {}).results || []);
            },
            error: (oError) => {
              AppUtils.debug(`${sUrl} error.`, oError);

              reject({ code: 'E', message: AppUtils.getBundleText('MSG_00045') }); // 파일을 조회할 수 없습니다.
            },
          });
        });
      },
    };
  }
);
