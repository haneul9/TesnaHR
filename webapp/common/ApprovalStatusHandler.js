sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/base/Object',
    'sap/ui/model/json/JSONModel',
    'sap/ui/tesna/control/MessageBox',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/exceptions/UI5Error',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
  ],
  function (
    // prettier 방지용 주석
    BaseObject,
    JSONModel,
    MessageBox,
    AppUtils,
    UI5Error,
    Client,
    ServiceNames
  ) {
    'use strict';

    return BaseObject.extend('sap.ui.tesna.common.ApprovalStatusHandler', {
      oController: null,
      oApprovalStatusBox: null,
      sTableId: 'commonApprovalStatusTable',

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
          activeRef: false,
          Employees: [],
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

          Promise.all([
            this.readApprovalData(), //
            this.readEmployees(),
          ]);
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
            ApproverList2Nav: [..._.chain(aRowData).filter(o => !_.isEmpty(o.Pernr)).map((o) => ({ ...o, Appno: sAppno })).value()],
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
            ApproverList2Nav: [..._.chain(aRowData).filter(o => !_.isEmpty(o.Pernr)).map((o) => ({ ...o, Appno: sAppno })).value()],
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
            Austy: mSettings.Austy,
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

          if (mSettings.Mode === 'N' && mSettings.EndPoint === 'B') {
            oBoxModel.setProperty('/settings/activeRef', true);
          }

          oBoxModel.setProperty('/settings/activeInput', bActiveInput);
          oBoxModel.refresh(true);

          this.setDetailsTableStyle();
        } catch (oError) {
          AppUtils.handleError(oError);
        } finally {
          this.oApprovalStatusBox.setBusy(false);
        }
      },

      async readEmployees() {
        try {
          const oBoxModel = this.oApprovalStatusBox.getModel();
          const mSettings = oBoxModel.getProperty('/settings');

          if (mSettings.Mode !== 'N') return;

          const oModel = this.oController.getModel(ServiceNames.WORKTIME);
          const mAppointeeData = this.oController.getAppointeeData();
          const aResults = await Client.getEntitySet(oModel, 'TimePernrList', {
            Austy: 'H',
            Begda: moment().hours(9).toDate(),
            Werks: mAppointeeData.Werks,
            Orgeh: mAppointeeData.Orgeh,
          });

          oBoxModel.setProperty(
            '/settings/Employees',
            _.map(aResults, (o) => _.omit(o, '__metadata'))
          );
        } catch (oError) {
          AppUtils.handleError(oError);
        }
      },

      setDetailsTableStyle() {
        setTimeout(() => {
          const oTable = this.oController.getView().byId(this.sTableId);
          const sDomTableId = oTable.getId();

          oTable.getRows().forEach((row, i) => {
            const mRowData = row.getBindingContext().getObject();

            if (mRowData.Linty === '40') {
              $(`#${sDomTableId}-rowsel${i}`).removeClass('disabled-table-selection');
            } else {
              $(`#${sDomTableId}-rowsel${i}`).addClass('disabled-table-selection');
            }
          });
        }, 100);
      },

      onRefAdd() {
        const oBoxModel = this.oApprovalStatusBox.getModel();
        const aApprovals = oBoxModel.getProperty('/list');

        oBoxModel.setProperty('/rowCount', aApprovals.length + 1);
        oBoxModel.setProperty('/list', [
          ...aApprovals,
          {
            enabledComments: false,
            Seqnr: _.toString(aApprovals.length + 1),
            Linty: '40',
            Lintytx: this.oController.getBundleText('LABEL_00231'), // 참조
            Perpic: '',
            Pernr: '',
            Ename: '',
            Zzcaltltx: '',
            Zzpsgrptx: '',
            Orgtx: '',
            Appsttx: '',
            Sgntm: '',
          },
        ]);

        this.setDetailsTableStyle();
      },

      onRefDel() {
        const oBoxModel = this.oApprovalStatusBox.getModel();
        const aApprovals = oBoxModel.getProperty('/list');
        const oTable = this.oController.getView().byId(this.sTableId);
        const aSelectedIndices = oTable.getSelectedIndices();

        if (aSelectedIndices.length < 1) {
          MessageBox.alert(this.oController.getBundleText('MSG_00020', 'LABEL_00110')); // {삭제}할 행을 선택하세요.
          return;
        }

        // 선택된 행을 삭제하시겠습니까?
        MessageBox.confirm(this.oController.getBundleText('MSG_00021'), {
          onClose: (sAction) => {
            if (MessageBox.Action.CANCEL === sAction) return;

            const aUnSelectedData = aApprovals.filter((elem, idx) => {
              return !aSelectedIndices.some(function (iIndex) {
                return iIndex === idx;
              });
            });

            oBoxModel.setProperty(
              '/list',
              _.map(aUnSelectedData, (o, i) => _.set(o, 'Seqnr', _.toString(i + 1)))
            );
            oBoxModel.setProperty('/rowCount', aUnSelectedData.length);

            oTable.clearSelection();
            this.setDetailsTableStyle();
          },
        });
      },

      onApprovalRefSelectSuggest(oEvent) {
        const oBoxModel = this.oApprovalStatusBox.getModel();
        const oInput = oEvent.getSource();
        const oSelectedSuggestionRow = oEvent.getParameter('selectedRow');

        if (oSelectedSuggestionRow) {
          const oContext = oSelectedSuggestionRow.getBindingContext();
          const mSuggestionData = oContext.getObject();
          const sRowPath = oInput.getParent().getBindingContext().getPath();

          oInput.setValue(mSuggestionData.Ename);

          oBoxModel.setProperty(`${sRowPath}/Perpic`, mSuggestionData.Picurl);
          oBoxModel.setProperty(`${sRowPath}/Pernr`, mSuggestionData.Pernr);
          oBoxModel.setProperty(`${sRowPath}/Orgeh`, mSuggestionData.Orgeh);
          oBoxModel.setProperty(`${sRowPath}/Orgtx`, mSuggestionData.Orgtx);
          oBoxModel.setProperty(`${sRowPath}/Zzcaltl`, mSuggestionData.Zzcaltl);
          oBoxModel.setProperty(`${sRowPath}/Zzcaltltx`, mSuggestionData.Zzcaltltx);
          oBoxModel.setProperty(`${sRowPath}/Zzpsgrptx`, mSuggestionData.Zzpsgrptx);
        }

        oInput.getBinding('suggestionRows').filter([]);
      },

      onApprovalRefSubmitSuggest(oEvent) {
        const oBoxModel = this.oApprovalStatusBox.getModel();
        const oInput = oEvent.getSource();
        const oContext = oInput.getParent().getBindingContext();
        const sRowPath = oContext.getPath();
        const sInputValue = oEvent.getParameter('value');

        if (!sInputValue) {
          oBoxModel.setProperty(`${sRowPath}/Perpic`, null);
          oBoxModel.setProperty(`${sRowPath}/Ename`, null);
          oBoxModel.setProperty(`${sRowPath}/Pernr`, null);
          oBoxModel.setProperty(`${sRowPath}/Orgeh`, null);
          oBoxModel.setProperty(`${sRowPath}/Orgtx`, null);
          oBoxModel.setProperty(`${sRowPath}/Zzcaltl`, null);
          oBoxModel.setProperty(`${sRowPath}/Zzcaltltx`, null);
          oBoxModel.setProperty(`${sRowPath}/Zzpsgrptx`, null);

          return;
        }

        const aEmployees = oBoxModel.getProperty('/settings/Employees');
        const [mEmployee] = _.filter(aEmployees, (o) => _.startsWith(o.Ename, sInputValue));

        if (!_.isEmpty(mEmployee)) {
          oBoxModel.setProperty(`${sRowPath}/Perpic`, mEmployee.Picurl);
          oBoxModel.setProperty(`${sRowPath}/Pernr`, mEmployee.Pernr);
          oBoxModel.setProperty(`${sRowPath}/Orgeh`, mEmployee.Orgeh);
          oBoxModel.setProperty(`${sRowPath}/Orgtx`, mEmployee.Orgtx);
          oBoxModel.setProperty(`${sRowPath}/Zzcaltl`, mEmployee.Zzcaltl);
          oBoxModel.setProperty(`${sRowPath}/Zzcaltltx`, mEmployee.Zzcaltltx);
          oBoxModel.setProperty(`${sRowPath}/Zzpsgrptx`, mEmployee.Zzpsgrptx);
        }
      },
    });
  }
);
