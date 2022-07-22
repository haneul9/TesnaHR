sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/base/Object',
      'sap/ui/model/json/JSONModel',
      'sap/ui/core/Fragment',
      'sap/ui/tesna/control/MessageBox',
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/common/odata/Client',
      'sap/ui/tesna/common/odata/ServiceNames',
    ],
    (
      // prettier 방지용 주석
      BaseObject,
      JSONModel,
      Fragment,
      MessageBox,
      AppUtils,
      Client,
      ServiceNames
    ) => {
      'use strict';
  
      return BaseObject.extend('sap.ui.tesna.common.GroupDialogHandler', {
        oController: null,
        oGroupDialog: null,
        oTable: null,
        fCallback: null,
  
        constructor: function (oController, fCallback) {
          this.oController = oController;
          this.fCallback = fCallback;
        },
  
        async openDialog() {
          if (!this.oGroupDialog) {
            this.oGroupDialog = await Fragment.load({
              name: 'sap.ui.tesna.fragment.OrganizationDialog',
              controller: this,
            });
  
            this.oGroupDialog
              .setModel(new JSONModel(this.getInitData()))
              .attachBeforeOpen(() => {
                this.oTable = this.oGroupDialog.getContent()[1].getItems()[0];
                this.readDialogData();
              })
              .attachAfterClose(() => {
                this.oTable.clearSelection();
                this.oGroupDialog.getModel().setData(this.getInitData());
              });
          }
  
          this.oController.getView().addDependent(this.oGroupDialog);
          this.oGroupDialog.open();
        },
  
        getInitData() {
          return {
            busy: true,
            Datum: moment().toDate(),
            Stext: '',
            orglist: [],
            rowcount: 1,
          };
        },
  
        async readDialogData() {
          const oDialogModel = this.oGroupDialog.getModel();
  
          try {
            const oDialogData = oDialogModel.getData();
            const aOrgList = await Client.getEntitySet(this.oController.getModel(ServiceNames.COMMON), 'OrgList', {
              Werks: oDialogData.Werks || _.noop(),
              Datum: oDialogData.Datum,
              Stype: '1',
              Stext: oDialogData.Stext || _.noop(),
            });
  
            _.chain(oDialogData)
              .set('orglist', aOrgList ?? [])
              .set('rowcount', Math.min(5, aOrgList.length || 1))
              .commit();
          } catch (oError) {
            AppUtils.debug('Controller > GroupDialogHandler > readDialogData Error', oError);
  
            AppUtils.handleError(oError);
          }
  
          oDialogModel.setProperty('/busy', false);
        },
  
        onPressSelectOrg() {
          const aOrgList = this.oGroupDialog.getModel().getProperty('/orglist');
          const aSelectedIndices = this.oTable.getSelectedIndices();
  
          // if (_.isEmpty(aSelectedIndices)) {
          //   MessageBox.alert(this.oController.getBundleText('MSG_00054')); // 부서를 선택하세요.
          //   return;
          // } else if (aSelectedIndices.length > 1) {
          //   MessageBox.alert(this.oController.getBundleText('MSG_00028')); // 부서를 하나만 선택하여 주십시오.
          //   return;
          // }
  
          this.fCallback(_.map(aSelectedIndices, (v) => _.get(aOrgList, v)));
          this.oGroupDialog.close();
        },
  
        onPressCloseOrg() {
          this.oGroupDialog.close();
        },
  
        onPressSearchOrg() {
          this.readDialogData();
        },
  
        onOrganizationRowSelection(oEvent) {
          const iSelectedRowIndex = oEvent.getParameter('rowIndex');
  
          oEvent.getSource().setSelectionInterval(iSelectedRowIndex, iSelectedRowIndex);
        },
      });
    }
  );