sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/base/Object',
    'sap/ui/model/json/JSONModel',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
  ],
  function (
    // prettier 방지용 주석
    BaseObject,
    JSONModel,
    AppUtils,
    Client,
    ServiceNames
  ) {
    'use strict';

    return BaseObject.extend('sap.ui.tesna.common.ApprovalStatusHandler', {
      oController: null,
      oApprovalStatusBox: null,

      constructor: function (oController, mOptions) {
        const options = {
          Mode: 'N',
          Pernr: null,
          Appno: null,
          Appty: null,
          Orgeh: null,
          visible: true,
          ...mOptions,
        };

        this.oController = oController;
        this.oApprovalStatusBox = oController.byId('commonApprovalStatusBox');

        const oBoxModel = new JSONModel({
          settings: options,
          rowCount: 1,
          list: [],
          mailUrl: {
            20: 'http://hrwdp.doosan.com/irj/servlet/prt/portal/prtroot/pcd!3aportal_content!2fDoosanGHRIS!2fiViews!2fTA!2fFP_Approvalbox?sap-config-mode=true%26gAppty=',
            30: 'http://hrwdp.doosan.com/irj/servlet/prt/portal/prtroot/pcd!3aportal_content!2fDoosanGHRIS!2fiViews!2fTA!2fFP_Requestbox?sap-config-mode=true',
          },
        });

        this.oApprovalStatusBox.setModel(oBoxModel);

        this.readApprovalData();
      },

      async save(sAppno) {
        try {
          const oModel = this.oController.getModel(ServiceNames.APPROVAL);
          const oBoxModel = this.oApprovalStatusBox.getModel();
          const aRowData = oBoxModel.getProperty('/list') || [];

          await Client.create(oModel, 'ApproverHeader', {
            Appno: sAppno,
            ApproverListNav: [..._.map(aRowData, (o) => ({ ...o, Appno: sAppno }))],
          });
        } catch (oError) {
          throw oError;
        }
      },

      async sendMail(sAppno, sAppst, sAppty) {
        try {
          const oModel = this.oController.getModel(ServiceNames.APPROVAL);
          const oBoxModel = this.oApprovalStatusBox.getModel();
          const sUri = oBoxModel.getProperty(`/mailUrl/${sAppst}`);

          await Client.getEntitySet(oModel, 'SendApprovalMail', {
            Appno: sAppno,
            Appst: sAppst,
            Uri: sAppst === '20' ? `${sUri}${sAppty}` : sUri,
          });
        } catch (oError) {
          throw oError;
        }
      },

      async readApprovalData() {
        try {
          const oBoxModel = this.oApprovalStatusBox.getModel();
          const mSettings = oBoxModel.getProperty('/settings');

          const oModel = this.oController.getModel(ServiceNames.APPROVAL);
          const aRowData = await Client.getEntitySet(oModel, 'ApproverList2', {
            Prcty: mSettings.Mode === 'N' ? 'N' : 'D',
            ..._.pick(mSettings, ['Pernr', 'Appno', 'Appty', 'Orgeh']),
          });

          oBoxModel.setProperty('/rowCount', aRowData.length || 1);
          oBoxModel.setProperty(
            '/list',
            _.map(aRowData, (o) =>
              _.chain(o)
                .omit('__metadata')
                .set('Perpic', o.Perpic || this.oController.getUnknownAvatarImageURL())
                .set('enabledComments', mSettings.Mode === 'N' && o.Linty === '10')
                .value()
            )
          );
        } catch (oError) {
          AppUtils.handleError(oError);
        } finally {
          this.oApprovalStatusBox.setBusy(false);
        }
      },
    });
  }
);
