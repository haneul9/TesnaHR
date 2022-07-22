sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/base/Object',
      'sap/ui/core/Fragment',
      'sap/ui/model/json/JSONModel',
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/common/ComboEntry',
      'sap/ui/tesna/common/exceptions/UI5Error',
      'sap/ui/tesna/common/GroupDialogHandler',
      'sap/ui/tesna/common/odata/Client',
      'sap/ui/tesna/common/odata/ServiceNames',
    ],
    (
      // prettier 방지용 주석
      BaseObject,
      Fragment,
      JSONModel,
      AppUtils,
      ComboEntry,
      UI5Error,
      GroupDialogHandler,
      Client,
      ServiceNames
    ) => {
      'use strict';
  
      return BaseObject.extend('sap.ui.tesna.common.EmployeeSearchDialogHandler', {
        oController: null,
        oCommonEmployeeSearchDialog: null,
        oGroupDialogHandler: null,
        oResultTable: null,
        fCallback: null,
        mOptions: {},
        bMultiSelect: false,
        bOnLoadSearch: false,
        bOpenByAppointee: false,
  
        constructor: function (oController) {
          this.oController = oController;
  
          this.oGroupDialogHandler = new GroupDialogHandler(this.oController, ([mOrgData]) => {
            const oEmployeeDialogModel = this.oCommonEmployeeSearchDialog.getModel();
  
            oEmployeeDialogModel.setProperty('/settings/searchConditions/Orgeh', _.isEmpty(mOrgData) ? null : mOrgData.Orgeh);
            oEmployeeDialogModel.setProperty('/settings/searchConditions/Orgtx', _.isEmpty(mOrgData) ? '' : mOrgData.Stext);
          });
        },
  
        activeMultiSelect() {
          this.bMultiSelect = true;
  
          return this;
        },
  
        setCallback(fnCallback) {
          if (fnCallback && typeof fnCallback === 'function') this.fCallback = fnCallback;
  
          return this;
        },
  
        setOptions(mOptions) {
          if (_.isObject(mOptions)) this.mOptions = mOptions;
  
          return this;
        },
  
        setOnLoadSearch(bOnLoadSearch) {
          if (_.isBoolean(bOnLoadSearch)) this.bOnLoadSearch = bOnLoadSearch;
  
          return this;
        },
  
        setChangeAppointee(bOpenByAppointee) {
          if (_.isBoolean(bOpenByAppointee)) this.bOpenByAppointee = bOpenByAppointee;
  
          return this;
        },
  
        getInitData() {
          return {
            busy: true,
            settings: {
              searchConditions: { Accty: null, Persa: 'ALL', Ename: null, Orgeh: null, Orgtx: null, Stat2: '3', Persg: 'ALL', Persk: 'ALL' },
              fieldEnabled: { Persa: true, Ename: true, Orgeh: true, Stat2: true, Persg: true, Persk: true },
              fieldVisible: { Pernr: true, Ename: true, Fulln: true, Zzjikgbt: true, Zzjikcht: true, Stat2tx: true, Entda: true, Retdt: true },
              fieldBusy: { Persk: false },
            },
            entry: {
              persArea: [],
              workType: [],
              empGroup: [],
              subEmpGroup: [],
            },
            results: {
              rowCount: 0,
              list: [],
            },
          };
        },
  
        async openDialog() {
          if (!this.oCommonEmployeeSearchDialog) {
            this.oCommonEmployeeSearchDialog = await Fragment.load({
              name: 'sap.ui.tesna.fragment.EmployeeSearchDialog',
              controller: this,
            });
  
            this.oCommonEmployeeSearchDialog.setModel(new JSONModel(this.getInitData())).attachBeforeOpen(async () => {
              this.oCommonEmployeeSearchDialog.getModel().setData(this.getInitData());
  
              await this.assignCustomSettings();
              await this.readEntryData();
              await this.initialLoaded();
            });
  
            this.oController.getView().addDependent(this.oCommonEmployeeSearchDialog);
          }
  
          this.oCommonEmployeeSearchDialog.open();
        },
  
        assignCustomSettings() {
          const mEmployeeModelSettings = this.oCommonEmployeeSearchDialog.getModel().getProperty('/settings');
  
          _.forEach(this.mOptions, (v, p) => _.set(mEmployeeModelSettings, p, _.assignIn(mEmployeeModelSettings[p], v)));
        },
  
        initialLoaded() {
          try {
            const oEmployeeDialogModel = this.oCommonEmployeeSearchDialog.getModel();
  
            this.oResultTable = this.oCommonEmployeeSearchDialog.getContent()[0].getItems()[1].getItems()[1];
            this.oResultTable.toggleStyleClass('radio-selection-table', !this.bMultiSelect);
            this.oResultTable.clearSelection();
  
            if (this.bOnLoadSearch) this.readData();
            else oEmployeeDialogModel.setProperty('/busy', false);
          } catch (oError) {
            AppUtils.debug('Common > EmployeeSearchDialogHandler > initialLoaded Error', oError);
            AppUtils.handleError(oError);
          }
        },
  
        async readEntryData() {
          const oEmployeeDialogModel = this.oCommonEmployeeSearchDialog.getModel();
  
          try {
            const fCurriedCommonGetEntitySet = Client.getEntitySet(this.oController.getModel(ServiceNames.COMMON));
            const mSearchConditions = oEmployeeDialogModel.getProperty('/settings/searchConditions');
            const mEmployeeConditionSetting = _.get(this.mOptions, 'searchConditions', {});
  
            const [aAreaList, aWorkList, aEmpList] = await Promise.all([
              fCurriedCommonGetEntitySet('PersAreaList', { Zall: mEmployeeConditionSetting.Accty === 'Z' ? 'X' : null }), //
              fCurriedCommonGetEntitySet('EmpCodeList', { Field: 'STAT2' }),
              fCurriedCommonGetEntitySet('EmpCodeList', { Field: 'PERSG' }),
            ]);
  
            oEmployeeDialogModel.setProperty('/entry', {
              persArea: new ComboEntry({ codeKey: 'Werks', valueKey: 'Pbtxt', aEntries: aAreaList }),
              workType: new ComboEntry({ codeKey: 'Zcode', valueKey: 'Ztext', aEntries: aWorkList }),
              empGroup: new ComboEntry({ codeKey: 'Zcode', valueKey: 'Ztext', aEntries: aEmpList }),
              subEmpGroup: new ComboEntry({ codeKey: 'Zcode', valueKey: 'Ztext' }),
            });
  
            oEmployeeDialogModel.setProperty(
              '/settings/searchConditions',
              _.chain(mSearchConditions)
                .set('Persa', _.isEmpty(mEmployeeConditionSetting.Persa) ? 'ALL' : mEmployeeConditionSetting.Persa)
                .set('Stat2', _.isEmpty(mEmployeeConditionSetting.Stat2) ? '3' : mEmployeeConditionSetting.Stat2)
                .set('Persg', _.isEmpty(mEmployeeConditionSetting.Persg) ? 'ALL' : mEmployeeConditionSetting.Persg)
                .set('Persk', _.isEmpty(mEmployeeConditionSetting.Persk) ? 'ALL' : mEmployeeConditionSetting.Persk)
                .value()
            );
          } catch (oError) {
            AppUtils.debug('Common > EmployeeSearchDialogHandler > readEntryData Error', oError);
            AppUtils.handleError(oError);
          }
        },
  
        async readData() {
          const oEmployeeDialogModel = this.oCommonEmployeeSearchDialog.getModel();
  
          oEmployeeDialogModel.setProperty('/busy', true);
  
          try {
            if (this.oResultTable) this.oResultTable.clearSelection();
  
            const mSearchConditions = oEmployeeDialogModel.getProperty('/settings/searchConditions');
            const aResults = await Client.getEntitySet(this.oController.getModel(ServiceNames.COMMON), 'EmpSearchResult', {
              Menid: this.oController.getCurrentMenuId(),
              ..._.pick(mSearchConditions, ['Ename', 'Orgeh', 'Accty', 'Persa', 'Stat2', 'Persg', 'Persk']),
            });
  
            oEmployeeDialogModel.setProperty('/results/list', aResults);
            oEmployeeDialogModel.setProperty('/results/rowCount', Math.min(aResults.length, 15));
          } catch (oError) {
            throw oError;
          } finally {
            oEmployeeDialogModel.setProperty('/busy', false);
          }
        },
  
        async onSearch() {
          try {
            await this.readData();
          } catch (oError) {
            AppUtils.debug('Common > EmployeeSearchDialogHandler > onSearch Error', oError);
            AppUtils.handleError(oError);
          }
        },
  
        onRowSelection(oEvent) {
          if (this.bMultiSelect) return;
  
          const oEventSource = oEvent.getSource();
          const aSelected = oEventSource.getSelectedIndices();
          const iSelectedRowIndex = oEvent.getParameter('rowIndex');
  
          if (!aSelected) return;
  
          oEventSource.setSelectionInterval(iSelectedRowIndex, iSelectedRowIndex);
        },
  
        onConfirm() {
          const oEmployeeDialogModel = this.oCommonEmployeeSearchDialog.getModel();
  
          try {
            const aSelectedIndices = _.reject(this.oResultTable.getSelectedIndices(), (d) => d === -1);
  
            if (_.isEmpty(aSelectedIndices)) throw new UI5Error({ code: 'A', message: AppUtils.getBundleText('MSG_00050') }); // 사원을 선택하세요.
  
            if (this.bMultiSelect) {
              const aEmployeeData = _.map(aSelectedIndices, (d) => oEmployeeDialogModel.getProperty(`/results/list/${d}`));
  
              if (this.fCallback && typeof this.fCallback === 'function') this.fCallback(aEmployeeData);
            } else {
              const mEmployeeData = oEmployeeDialogModel.getProperty(`/results/list/${aSelectedIndices[0]}`);
  
              if (this.bOpenByAppointee) this.oController.getViewModel('appointeeModel').setData(_.chain(mEmployeeData).set('Werks', mEmployeeData.Persa).set('Orgtx', mEmployeeData.Fulln).value(), true);
              if (this.fCallback && typeof this.fCallback === 'function') this.fCallback(mEmployeeData);
            }
  
            this.onClose();
          } catch (oError) {
            AppUtils.debug('Common > EmployeeSearchDialogHandler > onConfirm Error', oError);
            AppUtils.handleError(oError);
          }
        },
  
        onGroupOpen() {
          this.oGroupDialogHandler.openDialog();
        },
  
        async onChangeEmpGroup(oEvent) {
          const oEmployeeDialogModel = this.oCommonEmployeeSearchDialog.getModel();
  
          oEmployeeDialogModel.setProperty('/settings/fieldBusy/Persk', true);
  
          try {
            const sKey = oEvent.getSource().getSelectedKey();
  
            oEmployeeDialogModel.setProperty('/settings/searchConditions/Persk', 'ALL');
  
            if (!sKey || sKey === 'ALL') return;
  
            const aSubEmpGroups = await Client.getEntitySet(this.oController.getModel(ServiceNames.COMMON), 'EmpCodeList', {
              Field: 'PERSK',
              Excod: sKey,
            });
  
            oEmployeeDialogModel.setProperty('/entry/subEmpGroup', new ComboEntry({ codeKey: 'Zcode', valueKey: 'Ztext', aEntries: aSubEmpGroups }));
          } catch (oError) {
            AppUtils.debug('Common > EmployeeSearchDialogHandler > onChangeEmpGroup Error', oError);
            AppUtils.handleError(oError);
          } finally {
            oEmployeeDialogModel.setProperty('/settings/fieldBusy/Persk', false);
          }
        },
  
        onClose() {
          this.oCommonEmployeeSearchDialog.close();
        },
      });
    }
  );