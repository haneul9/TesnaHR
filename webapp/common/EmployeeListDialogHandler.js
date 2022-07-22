sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/core/Fragment',
      'sap/ui/model/json/JSONModel',
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/common/TableUtils',
      'sap/ui/tesna/common/Debuggable',
      'sap/ui/tesna/common/odata/Client',
      'sap/ui/tesna/common/odata/ServiceNames',
    ],
    (
      // prettier 방지용 주석
      Fragment,
      JSONModel,
      AppUtils,
      TableUtils,
      Debuggable,
      Client,
      ServiceNames
    ) => {
      'use strict';
  
      return Debuggable.extend('sap.ui.tesna.common.EmployeeListDialogHandler', {
        mService: {
          H: 'PA',
          T: 'WORKTIME',
        },
        mEntitySet: {
          H: 'HeadCountDetail',
          T: 'TimeOverviewDetail1',
        },
  
        constructor: function (oController) {
          this.oController = oController;
          this.oDialogModel = new JSONModel(this.getInitialData());
          this.oDialogModel.setSizeLimit(10000);
  
          this.init();
        },
  
        getInitialData() {
          return {
            dialog: {
              busy: true,
              rowCount: 0,
              totalCount: 0,
              list: null,
            },
          };
        },
  
        async init() {
          this.setPropertiesForNavTo();
  
          const oView = this.oController.getView();
  
          this.oDialog = await Fragment.load({
            id: oView.getId(),
            name: 'sap.ui.tesna.fragment.EmployeeListDialog',
            controller: this,
          });
  
          this.oDialog.setModel(this.oDialogModel).bindElement('/dialog');
  
          oView.addDependent(this.oDialog);
        },
  
        async setPropertiesForNavTo() {
          const oMenuModel = AppUtils.getAppComponent().getMenuModel();
          await oMenuModel.getPromise();
  
          this.bHasProfileViewAuth = oMenuModel.hasEmployeeProfileViewAuth();
        },
  
        async openDialog(oParam) {
          try {
            setTimeout(() => {
              this.setBusy();
              this.oDialog.open();
            });
  
            let mPayload, sService, sEntitySet;
            if (oParam instanceof sap.ui.base.Event) {
              // Portlet 같은 곳에서 Headty, Discod 만 넘어오는 경우
              const mEventSourceData = oParam.getSource().data();
  
              sService = this.mService[mEventSourceData.OData];
              sEntitySet = this.mEntitySet[mEventSourceData.OData];
              mPayload = this.getPayload(mEventSourceData);
            } else {
              // MSS 인원현황 메뉴 같은 곳에서 oParam에 검색 조건이 모두 포함되어 넘어오는 경우
              sService = this.mService[oParam.OData];
              sEntitySet = this.mEntitySet[oParam.OData];
  
              delete oParam.OData;
              mPayload = oParam;
            }
  
            const aEmployees = await Client.getEntitySet(this.oController.getModel(ServiceNames[sService]), sEntitySet, mPayload);
  
            this.oDialogModel.setProperty('/dialog/rowCount', Math.min(aEmployees.length, 12));
            this.oDialogModel.setProperty('/dialog/totalCount', _.size(aEmployees));
            this.oDialogModel.setProperty(
              '/dialog/list',
              _.map(aEmployees, (o, i) => ({
                Idx: ++i,
                Navigable: this.bHasProfileViewAuth ? 'O' : '',
                ...o,
              }))
            );
          } catch (oError) {
            this.debug('EmployeeListDialogHandler > openDialog Error', oError);
  
            AppUtils.handleError(oError, {
              onClose: () => this.closeDialog(),
            });
          } finally {
            if (this.oController.byId('overviewEmpDetailTable')) {
              this.oController.byId('overviewEmpDetailTable').setFirstVisibleRow();
            }
            this.setBusy(false);
          }
        },
  
        getPayload(mEventSourceData) {
          const mSessionProperty = this.oController.getSessionModel().getData();
          if (mEventSourceData.OData === 'H') {
            return {
              Zyear: moment().year(),
              Werks: mSessionProperty.Werks,
              Orgeh: mSessionProperty.Orgeh,
              Headty: mEventSourceData.Headty,
              Discod: mEventSourceData.Discod,
            };
          } else if (mEventSourceData.OData === 'T') {
            return {
              Datum: moment().startOf('date').add(9, 'hours'),
              Werks: mSessionProperty.Werks,
              Orgeh: mSessionProperty.Orgeh,
              Headty: mEventSourceData.Headty,
              Discod: mEventSourceData.Discod,
            };
          }
        },
  
        closeDialog() {
          this.oDialog.close();
        },
  
        formatDetailRowHighlight(sValue) {
          switch (_.toNumber(sValue)) {
            case 1:
              return sap.ui.core.IndicationColor.Indication03;
            case 2:
              return sap.ui.core.IndicationColor.Indication02;
            case 3:
              return sap.ui.core.IndicationColor.Indication04;
            default:
              return null;
          }
        },
  
        onPressEmployeeRow(oEvent) {
          if (!this.bHasProfileViewAuth) {
            return;
          }
  
          const sHost = window.location.href.split('#')[0];
          const mRowData = oEvent.getSource().getParent().getBindingContext().getObject();
          const sUsrty = this.oController.isMss() ? 'M' : this.oController.isHass() ? 'H' : '';
  
          window.open(`${sHost}#/employeeView/${mRowData.Pernr}/${sUsrty}`, '_blank', 'width=1400,height=800');
        },
  
        onPressExcelDownload() {
          const oTable = this.oController.byId('overviewEmpDetailTable');
          const sFileName = this.oController.getBundleText('LABEL_00282', 'LABEL_28038'); // 인원현황상세
  
          TableUtils.export({ oTable, sFileName });
        },
  
        setBusy(bBusy = true) {
          setTimeout(
            () => {
              this.oDialogModel.setProperty('/dialog/busy', bBusy);
            },
            bBusy ? 0 : 500
          );
          return this;
        },
  
        destroy() {
          this.oDialog.destroy();
          this.oDialogModel.destroy();
        },
      });
    }
  );