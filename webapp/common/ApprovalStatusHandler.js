sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/base/Object',
    'sap/ui/model/json/JSONModel',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/exceptions/UI5Error',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
  ],
  function (
    // prettier 방지용 주석
    BaseObject,
    JSONModel,
    AppUtils,
    UI5Error,
    Client,
    ServiceNames
  ) {
    'use strict';

    return BaseObject.extend('sap.ui.tesna.common.ApprovalStatusHandler', {
      oController: null,
      oApprovalStatusBox: null,

      APPROVAL_STATUS: {
        APPROVAL: '20',
        APPROVE: '30',
        REJECT: '40',
        CANCEL: '90',
      },

      MAIL_DESTINATION: {
        20: 'http://hrwdp.doosan.com/irj/servlet/prt/portal/prtroot/pcd!3aportal_content!2fDoosanGHRIS!2fiViews!2fTA!2fFP_Approvalbox?sap-config-mode=true%26gAppty=',
        30: 'http://hrwdp.doosan.com/irj/servlet/prt/portal/prtroot/pcd!3aportal_content!2fDoosanGHRIS!2fiViews!2fTA!2fFP_Requestbox?sap-config-mode=true',
        40: 'http://hrwdp.doosan.com/irj/servlet/prt/portal/prtroot/pcd!3aportal_content!2fDoosanGHRIS!2fiViews!2fTA!2fFP_Requestbox?sap-config-mode=true',
      },

      constructor: function (oController, mOptions) {
        const options = {
          Mode: 'D',
          EndPoint: 'B',
          Austy: 'E',
          Pernr: null,
          Appno: null,
          Appty: null,
          Orgeh: null,
          visible: true,
          activeInput: false,
          ...mOptions,
        };

        this.oController = oController;
        this.oApprovalStatusBox = oController.byId('commonApprovalStatusBox');

        if (this.oApprovalStatusBox) {
          const oBoxModel = new JSONModel({
            settings: options,
            rowCount: 1,
            list: [],
          });

          this.oApprovalStatusBox.setModel(oBoxModel);

          this.readApprovalData();
        }
      },

      async saveWithNoDisplay(sAppno) {
        try {
          const oModel = this.oController.getModel(ServiceNames.APPROVAL);
          const sAppty = this.oController.getApprovalType();
          const aRowData = await Client.getEntitySet(oModel, 'ApproverList2', {
            Prcty: 'N',
            Pernr: this.oController.getAppointeeProperty('Pernr'),
            Orgeh: this.oController.getAppointeeProperty('Orgeh'),
            Appno: sAppno,
            Appty: sAppty,
          });

          await Client.deep(oModel, 'ApproverHeader2', {
            Appno: sAppno,
            ApproverList2Nav: [..._.map(aRowData, (o) => ({ ...o, Appno: sAppno }))],
          });

          await this.sendMail(sAppno, this.APPROVAL_STATUS.APPROVAL, sAppty);
        } catch (oError) {
          throw oError;
        }
      },

      async save(sAppno) {
        try {
          const oModel = this.oController.getModel(ServiceNames.APPROVAL);
          const oBoxModel = this.oApprovalStatusBox.getModel();
          const aRowData = oBoxModel.getProperty('/list') || [];
          const sAppty = oBoxModel.getProperty('/settings/Appty');

          await Client.deep(oModel, 'ApproverHeader2', {
            Appno: sAppno,
            ApproverList2Nav: [..._.map(aRowData, (o) => ({ ...o, Appno: sAppno }))],
          });

          await this.sendMail(sAppno, this.APPROVAL_STATUS.APPROVAL, sAppty);
        } catch (oError) {
          throw oError;
        }
      },

      async approve(sAppno) {
        try {
          await this.callApprovalProcess(this.APPROVAL_STATUS.APPROVE, sAppno);

          await this.sendMail(sAppno, this.APPROVAL_STATUS.APPROVE);
        } catch (oError) {
          throw oError;
        }
      },

      async reject(sAppno) {
        try {
          const oBoxModel = this.oApprovalStatusBox.getModel();
          const aRowData = oBoxModel.getProperty('/list') || [];
          const sComment = _.chain(aRowData).find({ enabledComments: true }).get('Comnt').value();

          if (!sComment) {
            throw new UI5Error({ code: 'A', message: this.oController.getBundleText('MSG_00063') }); // 반려사유를 입력하여 주십시오.
          }

          await this.callApprovalProcess(this.APPROVAL_STATUS.REJECT, sAppno, sComment);

          await this.sendMail(sAppno, this.APPROVAL_STATUS.REJECT);
        } catch (oError) {
          throw oError;
        }
      },

      callApprovalProcess(sAppst, sAppno, sComment) {
        const oModel = this.oController.getModel(ServiceNames.APPROVAL);
        const oBoxModel = this.oApprovalStatusBox.getModel();
        const mSettings = oBoxModel.getProperty('/settings');

        return Client.create(oModel, 'ApprovalProcess', {
          Appno: sAppno,
          Appst: sAppst,
          Appty: mSettings.Appty,
          Austy: mSettings.Austy,
          Comnt: sAppst === '40' ? sComment : '',
          Rjrsn: sAppst === '40' ? sComment : '',
        });
      },

      async sendMail(sAppno, sAppst, sAppty) {
        try {
          const oModel = this.oController.getModel(ServiceNames.APPROVAL);
          const sUri = this.MAIL_DESTINATION[sAppst];

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
            Prcty: mSettings.Mode,
            ..._.pick(mSettings, ['Pernr', 'Appno', 'Appty', 'Orgeh']),
          });

          let bActiveInput = false;

          oBoxModel.setProperty('/rowCount', aRowData.length || 1);
          oBoxModel.setProperty(
            '/list',
            _.map(aRowData, (o) => {
              let bEnableComments = false;
              let bLeadLine = true;

              if (mSettings.Mode === 'N' && o.Linty === '10') {
                bActiveInput = true;
                bEnableComments = true;
              } else if (mSettings.EndPoint === 'WE' && o.Linty === '20' && o.Appst === '' && bLeadLine) {
                bActiveInput = true;
                bLeadLine = false;
                bEnableComments = true;
              }

              return _.chain(o)
                .omit('__metadata')
                .set('Comnt', o.Rjrsn ? o.Rjrsn : o.Comnt)
                .set('Perpic', o.Perpic || this.oController.getUnknownAvatarImageURL())
                .set('enabledComments', bEnableComments)
                .value();
            })
          );

          oBoxModel.setProperty('/settings/activeInput', bActiveInput);
          oBoxModel.refresh(true);
        } catch (oError) {
          AppUtils.handleError(oError);
        } finally {
          this.oApprovalStatusBox.setBusy(false);
        }
      },
    });
  }
);
