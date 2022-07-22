sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/core/Fragment',
      'sap/ui/model/json/JSONModel',
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/common/Debuggable',
      'sap/ui/tesna/common/UriHandler',
      'sap/ui/tesna/common/odata/Client',
      'sap/ui/tesna/common/odata/ServiceNames',
      'sap/ui/tesna/control/MessageBox',
    ],
    (
      // prettier 방지용 주석
      Fragment,
      JSONModel,
      AppUtils,
      Debuggable,
      UriHandler,
      Client,
      ServiceNames,
      MessageBox
    ) => {
      'use strict';
  
      return Debuggable.extend('sap.ui.tesna.mvc.controller.app.MobileMyPagePopoverHandler', {
        /**
         * @override
         */
        constructor: function (oController) {
          this.deviceOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'iOS' : /android/i.test(navigator.userAgent) ? 'aOS' : '';
          this.istesnaIOS = this.deviceOS === 'iOS' && !!window.webkit && !!window.webkit.messageHandlers && !!window.webkit.messageHandlers.script;
          this.istesnaAOS = this.deviceOS === 'aOS' && typeof window.tesnaApp !== 'undefined';
          this.iHostport = /^dev/.test(location.hostname) ? 8090 : 8070;
  
          this.oController = oController;
          this.oMyPageModel = new JSONModel(this.getInitialData());
  
          this.init();
        },
  
        getInitialData() {
          const oUriHandler = new UriHandler();
          return {
            busy: true,
            Language: oUriHandler.getParameter('sap-language') || 'KO',
            LanguageVisible: oUriHandler.getParameter('language-test') === 'true',
          };
        },
  
        async init() {
          const oView = this.oController.getView();
  
          this.oMyPagePopover = await Fragment.load({
            id: oView.getId(),
            name: 'sap.ui.tesna.mvc.view.app.fragment.MyPagePopover',
            controller: this,
          });
  
          this.oMyPagePopover
            .attachBeforeOpen(async () => {
              const aVersionData = this.readVersionData();
              this.setVersionData(await aVersionData);
            })
            .setModel(this.oMyPageModel)
            .bindElement('/');
  
          oView.addDependent(this.oMyPagePopover);
  
          this.showContentData();
        },
  
        async showContentData() {
          await this.oController.getSessionModel().getPromise();
  
          const aEmployeeData = this.readEmployeeData();
          const mEmployeeData = this.transformEmployeeData(await aEmployeeData);
          this.oMyPageModel.setData(mEmployeeData, true);
        },
  
        async readEmployeeData() {
          const oCommonModel = this.oController.getModel(ServiceNames.COMMON);
          const mFilters = {
            Actda: moment().hour(9).toDate(),
            Zflag: 'X', // 근속 기간 조회
            Accty: 'Y', // 본인 데이터 조회
          };
  
          return Client.getEntitySet(oCommonModel, 'EmpSearchResult', mFilters);
        },
  
        transformEmployeeData([mEmployeeData = {}]) {
          let { Photo, Ename, Zzjikgbt, Zzjikcht, Chief, Pbtxt, Fulln, Text1, Text2 } = mEmployeeData;
          return { Photo: Photo || AppUtils.getUnknownAvatarImageURL(), Ename, Zzjikgbt, Zzjikcht, Chief, Pbtxt, Fulln, Text1, Text2 };
        },
  
        async readVersionData() {
          const oCommonModel = this.oController.getModel(ServiceNames.COMMON);
          const mFilters = {
            Mobos: this.deviceOS === 'iOS' ? 'IOS' : 'ANDROID',
          };
  
          return Client.getEntitySet(oCommonModel, 'OsVersion', mFilters);
        },
  
        setVersionData([{ Version }]) {
          const DownloadLink = `${location.protocol}//${location.hostname}:${this.iHostport}/download`;
  
          this.oMyPageModel.setData({ Version, DownloadLink }, true);
  
          if (this.istesnaAOS) {
            const sAppVersion = window.tesnaApp.getVersionInfo();
            const UpdateNotification = Version === sAppVersion ? this.oController.getBundleText('LABEL_01603') : this.oController.getBundleText('LABEL_01604'); // 최신 버전 : 업데이트 필요
  
            this.oMyPageModel.setProperty('/AppVersion', sAppVersion);
            this.oMyPageModel.setProperty('/Latest', Version === sAppVersion);
            this.oMyPageModel.setProperty('/UpdateNotification', UpdateNotification);
          } else if (this.istesnaIOS) {
            window.versionCheck = (sAppVersion) => {
              const sVersion = this.oMyPageModel.getProperty('/Version');
              const UpdateNotification = sVersion === sAppVersion ? this.oController.getBundleText('LABEL_01603') : this.oController.getBundleText('LABEL_01604'); // 최신 버전 : 업데이트 필요
  
              this.oMyPageModel.setProperty('/AppVersion', sAppVersion);
              this.oMyPageModel.setProperty('/Latest', sVersion === sAppVersion);
              this.oMyPageModel.setProperty('/UpdateNotification', UpdateNotification);
            };
            window.webkit.messageHandlers.script.postMessage('versionCheck');
          } else {
            this.oMyPageModel.setProperty('/AppVersion', Version);
            this.oMyPageModel.setProperty('/Latest', true);
            this.oMyPageModel.setProperty('/UpdateNotification', this.oController.getBundleText('LABEL_01603')); // 최신 버전
          }
        },
  
        onChangeLanguage(oEvent) {
          this.oController.onChangeLanguage(oEvent);
        },
  
        async onPressRefresh() {
          location.reload();
        },
  
        async onPressLogout() {
          this.oController.onPressLogout();
        },
  
        onPopoverToggle() {
          if (this.oMyPagePopover.isOpen()) {
            this.onPopoverClose();
          } else {
            this.oMyPagePopover.openBy(this.oController.byId('mobile-basis-mypage'));
            this.setBusy(false);
          }
        },
  
        onPopoverClose() {
          this.oMyPagePopover.close();
        },
  
        setBusy(bBusy = true) {
          setTimeout(
            () => {
              this.oMyPageModel.setProperty('/busy', bBusy);
            },
            bBusy ? 0 : 500
          );
          return this;
        },
  
        toggleLanguage() {
          this.oMyPageModel.setProperty('/LanguageVisible', !this.oMyPageModel.getProperty('/LanguageVisible'));
        },
  
        showLocalInfo() {
          const aSystemInfo = [
            `location\n${location}`,
            `document.cookie\n${document.cookie}`, //
            `navigator.userAgent\n${navigator.userAgent}`,
          ];
          MessageBox.alert(aSystemInfo.join('\n\n'));
        },
      });
    }
  );