sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/m/PlacementType',
      'sap/ui/core/Fragment',
      'sap/ui/model/json/JSONModel',
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/common/Debuggable',
      'sap/ui/tesna/common/exceptions/UI5Error',
      'sap/ui/tesna/common/odata/Client',
      'sap/ui/tesna/common/odata/ServiceNames',
    ],
    (
      // prettier 방지용 주석
      PlacementType,
      Fragment,
      JSONModel,
      AppUtils,
      Debuggable,
      UI5Error,
      Client,
      ServiceNames
    ) => {
      'use strict';
  
      return Debuggable.extend('sap.ui.tesna.mvc.controller.app.NotificationPopoverHandler', {
        bMobile: null,
  
        /**
         * @override
         */
        constructor: function (oController) {
          this.bMobile = AppUtils.isMobile();
          this.oController = oController;
          this.oNotificationModel = new JSONModel(this.getInitialData());
  
          this.init();
        },
  
        getInitialData() {
          return {
            busy: true,
            placement: this.bMobile ? PlacementType.Top : PlacementType.Bottom,
            onlyUnread: false,
            list: [],
            listCount: 0,
            unreadCount: 0,
            showUnreadCount: false,
          };
        },
  
        async init() {
          const oView = this.getController().getView();
  
          this.oNotificationPopover = await Fragment.load({
            id: oView.getId(),
            name: 'sap.ui.tesna.mvc.view.app.fragment.NotificationPopover',
            controller: this,
          });
  
          const oNotificationModel = this.getNotificationModel();
  
          this.oNotificationPopover
            .attachBeforeOpen(() => {
              this.onChangeNotificationOnlyUnread();
            })
            .attachAfterClose(() => {
              this.clearContentData();
            })
            .setModel(oNotificationModel)
            .bindElement('/');
  
          oView.setModel(oNotificationModel, 'notificationModel');
          oView.addDependent(this.oNotificationPopover);
  
          this.showContentData();
        },
  
        async showContentData() {
          const aContentData = this.readContentData();
          const { unreadCount, list, listCount } = this.transformContentData(await aContentData);
  
          const iUnreadCount = Math.min(unreadCount, 99);
          const oNotificationModel = this.getNotificationModel();
  
          oNotificationModel.setProperty('/showUnreadCount', unreadCount > 0);
          oNotificationModel.setProperty('/unreadCount', `${unreadCount > 99 ? '+' : ''}${iUnreadCount}`);
          oNotificationModel.setProperty('/listCount', listCount);
          oNotificationModel.setProperty('/list', list);
  
          $('.notification-count').removeClass('display-none');
        },
  
        async readContentData() {
          const oNotificationModel = this.getNotificationModel();
          const bOnlyUnread = oNotificationModel.getProperty('/onlyUnread');
  
          const oCommonModel = this.getController().getModel(ServiceNames.COMMON);
          const mFilters = {
            Mode: 'L',
            Unide: bOnlyUnread ? 'X' : '',
          };
  
          return Client.getEntitySet(oCommonModel, 'AlarmCenter', mFilters);
        },
  
        transformContentData(aContentData) {
          let iUnreadCount = 0;
  
          const sDTFMT = this.getController().getSessionProperty('DTFMT');
          aContentData.forEach((mData) => {
            delete mData.__metadata;
  
            mData.Menid = this.bMobile ? mData.MenidMobile : mData.MenidPc;
            mData.AdateFormatted = moment(mData.Adate).format(sDTFMT);
  
            if (mData.Checked !== 'X') {
              iUnreadCount += 1;
            }
          });
  
          return {
            list: aContentData,
            listCount: aContentData.length,
            unreadCount: iUnreadCount,
          };
        },
  
        clearContentData() {
          const oNotificationModel = this.getNotificationModel();
          const { unreadCount, showUnreadCount } = oNotificationModel.getProperty('/');
  
          oNotificationModel.setData(this.getInitialData());
          oNotificationModel.setProperty('/unreadCount', unreadCount);
          oNotificationModel.setProperty('/showUnreadCount', showUnreadCount);
        },
  
        onScroll() {
          if (this.oNotificationPopover.isScrollBottom()) {
            this.setBusy(true);
  
            this.loadMoreContentData();
          }
        },
  
        async loadMoreContentData() {
          const aContentData = await this.readMoreContentData();
          if (!aContentData.length) {
            this.setBusy(false);
            return;
          }
  
          const { unreadCount, list, listCount } = this.transformContentData(aContentData);
  
          const oNotificationModel = this.getNotificationModel();
          const { unreadCount: iPrevUnreadCount, list: iPrevList, listCount: iPrevListCount } = oNotificationModel.getProperty('/');
  
          const iUnreadCount = Math.min(unreadCount + Number(iPrevUnreadCount), 99);
          iPrevList.push(...list);
  
          oNotificationModel.setProperty('/showUnreadCount', iUnreadCount > 0);
          oNotificationModel.setProperty('/unreadCount', `${iUnreadCount === 99 ? '+' : ''}${iUnreadCount}`);
          oNotificationModel.setProperty('/listCount', listCount + iPrevListCount);
          oNotificationModel.setProperty('/list', iPrevList);
  
          this.setBusy(false);
        },
  
        async readMoreContentData() {
          const oNotificationModel = this.getNotificationModel();
          const bOnlyUnread = oNotificationModel.getProperty('/onlyUnread');
          const aList = oNotificationModel.getProperty('/list') || [];
  
          if (!aList.length) {
            return;
          }
  
          // 화면에 존재하는 가장 오래된 알림의 일시를 구함, 화면 상에서 정렬이 변경되면 안되므로 전개구문으로 배열을 복사해서 정렬함
          const [{ Adate, Atime }] = [...aList].sort((m1, m2) => m1.Adate.getTime() + m1.Atime.ms - m2.Adate.getTime() - m2.Atime.ms);
  
          const oCommonModel = this.getController().getModel(ServiceNames.COMMON);
          const mFilters = {
            Mode: 'L',
            Unide: bOnlyUnread ? 'X' : '',
            Adate: Adate,
            Atime: Atime,
          };
  
          return Client.getEntitySet(oCommonModel, 'AlarmCenter', mFilters);
        },
  
        async onChangeNotificationOnlyUnread(oEvent) {
          if (oEvent) {
            oEvent.cancelBubble();
          }
  
          try {
            this.setBusy(true);
  
            await this.showContentData();
          } catch (oError) {
            if (oError instanceof UI5Error) {
              oError.code = oError.LEVEL.INFORMATION;
            }
            AppUtils.handleError(oError);
          } finally {
            this.setBusy(false);
          }
        },
  
        async onPressNotificationPin(oEvent) {
          oEvent.cancelBubble();
  
          try {
            this.setBusy(true);
  
            const oContext = oEvent.getSource().getBindingContext();
            const oAdate = oContext.getProperty('Adate');
            const oAtime = oContext.getProperty('Atime');
            const sSeqnr = oContext.getProperty('Seqnr');
            const sPinned = oContext.getProperty('Pinned');
  
            const oCommonModel = this.getController().getModel(ServiceNames.COMMON);
            const mPayload = {
              Mode: sPinned === 'X' ? 'U' : 'P',
              Adate: oAdate,
              Atime: oAtime,
              Seqnr: sSeqnr,
            };
  
            await Client.create(oCommonModel, 'AlarmCenter', mPayload);
  
            await this.showContentData();
          } catch (oError) {
            if (oError instanceof UI5Error) {
              oError.code = oError.LEVEL.INFORMATION;
            }
            AppUtils.handleError(oError);
          } finally {
            this.setBusy(false);
          }
        },
  
        onPressNotificationLink(oEvent) {
          oEvent.cancelBubble();
  
          this.getController().getAppMenu().handleMenuLink(oEvent);
          this.onPopoverClose();
        },
  
        async onPressNotificationReadToggle(oEvent) {
          oEvent.cancelBubble();
  
          try {
            this.setBusy(true);
  
            const oContext = oEvent.getSource().getBindingContext();
            const oAdate = oContext.getProperty('Adate');
            const oAtime = oContext.getProperty('Atime');
            const sSeqnr = oContext.getProperty('Seqnr');
  
            const oCommonModel = this.getController().getModel(ServiceNames.COMMON);
            const mPayload = {
              Mode: oEvent.getParameter('pressed') ? 'N' : 'C',
              Adate: oAdate,
              Atime: oAtime,
              Seqnr: sSeqnr,
            };
  
            await Client.create(oCommonModel, 'AlarmCenter', mPayload);
  
            await this.showContentData();
          } catch (oError) {
            if (oError instanceof UI5Error) {
              oError.code = oError.LEVEL.INFORMATION;
            }
            AppUtils.handleError(oError);
          } finally {
            this.setBusy(false);
          }
        },
  
        async onPressAllNotificationRead() {
          try {
            this.setBusy(true);
  
            const oCommonModel = this.getController().getModel(ServiceNames.COMMON);
            const mPayload = {
              Mode: 'A',
            };
  
            await Client.create(oCommonModel, 'AlarmCenter', mPayload);
  
            await this.showContentData();
          } catch (oError) {
            if (oError instanceof UI5Error) {
              oError.code = oError.LEVEL.INFORMATION;
            }
            AppUtils.handleError(oError);
          } finally {
            this.setBusy(false);
          }
        },
  
        onPopoverToggle() {
          if (this.oNotificationPopover.isOpen()) {
            this.onPopoverClose();
          } else {
            const sId = this.bMobile ? 'mobile-basis-notification' : 'notification-bell';
            this.oNotificationPopover.openBy(this.getController().byId(sId));
          }
        },
  
        onPopoverClose() {
          this.oNotificationPopover.close();
        },
  
        getController() {
          return this.oController;
        },
  
        getNotificationModel() {
          return this.oNotificationModel;
        },
  
        setBusy(bBusy = true) {
          setTimeout(
            () => {
              this.getNotificationModel().setProperty('/busy', bBusy);
            },
            bBusy ? 0 : 500
          );
          return this;
        },
      });
    }
  );