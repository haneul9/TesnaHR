sap.ui.define(
  [
    //
    'sap/ui/tesna/control/MessageBox',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/ApprovalStatusHandler',
    'sap/ui/tesna/common/exceptions/UI5Error',
    'sap/ui/tesna/common/odata/Client',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/mvc/controller/BaseController',
  ],
  (
    //
    MessageBox,
    AppUtils,
    ApprovalStatusHandler,
    UI5Error,
    Client,
    ServiceNames,
    BaseController
  ) => {
    'use strict';

    return BaseController.extend('sap.ui.tesna.mvc.controller.commuteCheck.Main', {
      ROUTE_NAME: '',
      LIST_TABLE_ID: 'commuteCheckListTable',

      ApprovalStatusHandler: null,

      getCurrentLocationText() {
        return this.getBundleText('LABEL_06019'); // 근태확인신청
      },

      getBreadcrumbsLinks() {
        return [{ name: this.getBundleText('LABEL_01001') }]; // 기술직근태
      },

      getApprovalType() {
        return 'TJ';
      },

      initializeModel() {
        return {
          initBeguz: moment('0900', 'hhmm').toDate(),
          initEnduz: moment('1800', 'hhmm').toDate(),
          busy: false,
          auth: '',
          isPossibleApproval: true,
          contentsBusy: {
            button: false,
            search: false,
            table: false,
          },
          entry: {
            Persa: [],
            Orgeh: [],
            Kostl: [],
            Corty: [],
          },
          searchConditions: {
            Werks: '',
            Orgeh: '',
            Apbeg: moment().subtract(1, 'month').set('date', 16).hours(9).toDate(),
            Apend: moment().hours(9).toDate(),
            Clsin: '',
          },
          listInfo: {
            totalCount: 0,
            rowCount: 0,
            ObjTxt1: this.getBundleText('LABEL_00102'), // 미처리
            infoMessage: this.getBundleText('MSG_06001'), // 근태, 특근, 근무일정, 근무계획 신청 승인 시 자동으로 완료 처리됩니다.
          },
          list: [],
          original: {},
        };
      },

      async onObjectMatched(oParameter, sRouteName) {
        const oViewModel = this.getViewModel();

        this.ROUTE_NAME = sRouteName;

        try {
          oViewModel.setSizeLimit(500);
          this.setContentsBusy(true);

          oViewModel.setProperty('/auth', this.currentAuth());

          this.ApprovalStatusHandler = new ApprovalStatusHandler(this);

          await this.setPersaEntry();
          await this.setOrgehEntry();
          await this.setKostlEntry();
          await this.setCortyEntry();

          setTimeout(async () => await this.retrieveList(), 0);
        } catch (oError) {
          this.debug('Controller > commuteCheck > onObjectMatched Error', oError);

          AppUtils.handleError(oError);
          this.setContentsBusy(false);
        }
      },

      setDetailsTableStyle() {
        setTimeout(() => {
          const oDetailsTable = this.byId(this.LIST_TABLE_ID);
          const sTableId = oDetailsTable.getId();

          oDetailsTable.getRows().forEach((row, i) => {
            const mRowData = row.getBindingContext().getObject();

            if (mRowData.Apposyn === 'X') {
              $(`#${sTableId}-rowsel${i}`).removeClass('disabled-table-selection');
            } else {
              $(`#${sTableId}-rowsel${i}`).addClass('disabled-table-selection');
            }
          });
        }, 100);
      },

      async setPersaEntry() {
        const oViewModel = this.getViewModel();

        try {
          if (!_.isEqual(this.currentAuth(), 'E')) {
            oViewModel.setProperty('/entry/Persa', []);
            oViewModel.setProperty('/entry/Orgeh', []);

            const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.COMMON), 'PersAreaList', {
              Actty: '1',
              Wave: '1',
            });

            oViewModel.setProperty('/searchConditions/Werks', _.get(aEntries, [0, 'Persa']));
            oViewModel.setProperty('/entry/Persa', aEntries);
          } else {
            const mAppointeeData = this.getAppointeeData();

            oViewModel.setProperty('/entry/Persa', [_.pick(mAppointeeData, ['Persa', 'Pbtxt'])]);
            oViewModel.setProperty('/searchConditions/Werks', mAppointeeData.Persa);
          }
        } catch (oError) {
          throw oError;
        }
      },

      async setOrgehEntry() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/entry/Orgeh', []);
          oViewModel.setProperty('/searchConditions/Orgeh', '');

          const sWerks = oViewModel.getProperty('/searchConditions/Werks');

          if (_.isEmpty(sWerks)) return;

          const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.NIGHTWORK), 'TimeOrgehList', {
            Werks: sWerks,
            Austy: oViewModel.getProperty('/auth'),
          });

          oViewModel.setProperty('/searchConditions/Orgeh', _.get(aEntries, [0, 'Orgeh']));
          oViewModel.setProperty('/entry/Orgeh', aEntries);
        } catch (oError) {
          throw oError;
        }
      },

      async setKostlEntry() {
        const oViewModel = this.getViewModel();

        try {
          oViewModel.setProperty('/entry/Kostl', []);
          oViewModel.setProperty('/searchConditions/Kostl', '');

          const sWerks = oViewModel.getProperty('/searchConditions/Werks');
          const sOrgeh = oViewModel.getProperty('/searchConditions/Orgeh');

          if (_.isEmpty(sWerks) || _.isEmpty(sOrgeh) || sOrgeh === '00000000') return;

          const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.WORKTIME), 'TimeKostlList', {
            Werks: sWerks,
            Orgeh: sOrgeh,
            Austy: oViewModel.getProperty('/auth'),
          });

          if (_.chain(aEntries).get([0, 'Kostl']).isEmpty().value()) {
            _.set(aEntries, [0, 'Kostl'], '00000000');
          }

          const sAuth = oViewModel.getProperty('/auth');

          oViewModel.setProperty('/searchConditions/Kostl', _.get(aEntries, [sAuth === 'E' ? 1 : 0, 'Kostl']));
          oViewModel.setProperty(
            '/entry/Kostl',
            _.map(aEntries, (o) => _.chain(o).omitBy(_.isNil).omitBy(_.isEmpty).value())
          );
        } catch (oError) {
          throw oError;
        }
      },

      async setCortyEntry() {
        const oViewModel = this.getViewModel();

        try {
          const aEntries = await Client.getEntitySet(this.getModel(ServiceNames.WORKTIME), 'CortyCodeList');

          oViewModel.setProperty(
            '/entry/Corty',
            _.map(aEntries, (o) => _.chain(o).omitBy(_.isNil).omitBy(_.isEmpty).value())
          );
        } catch (oError) {
          throw oError;
        }
      },

      setContentsBusy(bContentsBusy = true, vTarget = []) {
        const oViewModel = this.getViewModel();
        const mBusy = oViewModel.getProperty('/contentsBusy');

        if (_.isEmpty(vTarget)) {
          _.forOwn(mBusy, (v, p) => _.set(mBusy, p, bContentsBusy));
        } else {
          if (_.isArray(vTarget)) {
            _.forEach(vTarget, (s) => _.set(mBusy, s, bContentsBusy));
          } else {
            _.set(mBusy, vTarget, bContentsBusy);
          }
        }

        oViewModel.refresh();
      },

      onCortyCheck(oEvent) {
        const oViewModel = this.getViewModel();
        const oRowBindingContext = oEvent.getSource().getParent().getBindingContext();
        const sRowPath = oRowBindingContext.getPath();
        const mRowObject = _.chain(oRowBindingContext.getObject())
          .cloneDeep()
          .pick(['Pernr', 'Tmdat', 'Begdaf', 'Beguzf', 'Enddaf', 'Enduzf'])
          .tap((obj) => {
            _.set(obj, 'Tmdat', moment(obj.Tmdat).format('YYYYMMDD'));
            _.set(obj, 'Begdaf', obj.Begdaf ? this.DateUtils.format(obj.Begdaf) : null);
            _.set(obj, 'Beguzf', obj.Beguzf ? this.TimeUtils.toString(obj.Beguzf, 'HH:mm') : null);
            _.set(obj, 'Enddaf', obj.Enddaf ? this.DateUtils.format(obj.Enddaf) : null);
            _.set(obj, 'Enduzf', obj.Enduzf ? this.TimeUtils.toString(obj.Enduzf, 'HH:mm') : null);
          })
          .value();
        const mSelectedOriginal = _.get(oViewModel.getProperty('/original'), [mRowObject.Pernr, mRowObject.Tmdat]);
        let sChangeCorty = null;

        if (mRowObject.Begdaf && mRowObject.Beguzf && mRowObject.Enddaf && mRowObject.Enduzf) {
          if (
            _.isEqual(mSelectedOriginal.Begdaf, mRowObject.Begdaf) &&
            _.isEqual(mSelectedOriginal.Beguzf, mRowObject.Beguzf) &&
            _.isEqual(mSelectedOriginal.Enddaf, mRowObject.Enddaf) &&
            _.isEqual(mSelectedOriginal.Enduzf, mRowObject.Enduzf)
          ) {
            sChangeCorty = null;
          } else if (_.isEqual(mSelectedOriginal.Enddaf, mRowObject.Enddaf) && _.isEqual(mSelectedOriginal.Enduzf, mRowObject.Enduzf)) {
            sChangeCorty = '10'; // 출근시간 변경완료
          } else if (_.isEqual(mSelectedOriginal.Begdaf, mRowObject.Begdaf) && _.isEqual(mSelectedOriginal.Beguzf, mRowObject.Beguzf)) {
            sChangeCorty = '20'; // 퇴근시간 변경완료
          } else {
            sChangeCorty = '30'; // 출퇴근시간 변경완료
          }
        } else if (mRowObject.Begdaf && mRowObject.Beguzf && (!mRowObject.Enddaf || !mRowObject.Enduzf)) {
          if (_.isEqual(mSelectedOriginal.Begdaf, mRowObject.Begdaf) && _.isEqual(mSelectedOriginal.Beguzf, mRowObject.Beguzf)) {
            sChangeCorty = null;
          } else {
            sChangeCorty = '10'; // 출근시간 변경완료
          }
        } else if (mRowObject.Enddaf && mRowObject.Enduzf && (!mRowObject.Begdaf || !mRowObject.Beguzf)) {
          if (_.isEqual(mSelectedOriginal.Enddaf, mRowObject.Enddaf) && _.isEqual(mSelectedOriginal.Enduzf, mRowObject.Enduzf)) {
            sChangeCorty = null;
          } else {
            sChangeCorty = '20'; // 퇴근시간 변경완료
          }
        } else {
          sChangeCorty = null;
        }

        oViewModel.setProperty(`${sRowPath}/Corty`, sChangeCorty);
      },

      async onChangeWerks() {
        try {
          this.setContentsBusy(true, 'search');

          await this.setOrgehEntry();
          await this.setKostlEntry();
        } catch (oError) {
          this.debug('Controller > commuteCheck > onChangePersa Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'search');
        }
      },

      async onChangeOrgeh() {
        try {
          this.setContentsBusy(true, 'search');

          await this.setKostlEntry();
        } catch (oError) {
          this.debug('Controller > commuteCheck > onChangeOrgeh Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false, 'search');
        }
      },

      onScrollTable() {
        this.setDetailsTableStyle();
      },

      onSelectionTable(oEvent) {
        const oViewModel = this.getViewModel();
        const oTable = oEvent.getSource();
        const aTableData = oViewModel.getProperty('/list');

        if (oEvent.getParameter('selectAll') === true) {
          _.forEach(aTableData, (o, i) => {
            if (o.Apposyn !== 'X') oTable.removeSelectionInterval(i, i);
          });
        }
      },

      onPressSearch() {
        this.setContentsBusy(true, ['search', 'table']);

        setTimeout(async () => await this.retrieveList(), 0);
      },

      onPressApprove() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const aSelectedTableData = this.TableUtils.getSelectionData(oTable);

        if (!aSelectedTableData.length) {
          MessageBox.alert(this.getBundleText('MSG_00010', 'LABEL_00121')); // {신청}할 데이터를 선택하세요.
          return;
        }

        if (
          !_.chain(aSelectedTableData)
            .filter((o) => !!o.Appno && o.Appno !== '0000000000')
            .size()
            .isEqual(0)
            .value()
        ) {
          MessageBox.alert(this.getBundleText('MSG_00066')); // 미신청 상태의 데이터만 신청이 가능합니다.
          return;
        }

        this.setContentsBusy(true);

        // 신청데이터에 대하여 재검증을 실시한 이후 이상이 없을 경우에만 신청처리됩니다.\n진행하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_06002'), {
          actions: [this.getBundleText('LABEL_00114'), MessageBox.Action.CANCEL],
          onClose: async (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false);
              return;
            }

            try {
              const oModel = this.getModel(ServiceNames.WORKTIME);
              const aReturnMsg = [];

              for (const mPayload of aSelectedTableData) {
                const mReturnData = await Client.create(oModel, 'TimeReaderCheck', mPayload);

                if (mReturnData.Retcode === 'I') {
                  mPayload.Dedhr = mReturnData.Dedhr;
                  mPayload.Lateyn = mReturnData.Lateyn;

                  aReturnMsg.push(mReturnData.Retmsg);
                } else if (mReturnData.Retcode === 'E') {
                  throw new UI5Error({ message: mReturnData.Retmsg });
                }
              }

              if (aReturnMsg.length > 0) {
                MessageBox.alert(_.join(aReturnMsg, '\n'), {
                  onClose: async () => {
                    try {
                      await this.createProcess(aSelectedTableData);
                    } catch (oError) {
                      this.setContentsBusy(false);
                      AppUtils.handleError(oError);
                    }
                  },
                });
              } else {
                this.createProcess(aSelectedTableData);
              }
            } catch (oError) {
              this.debug('Controller > commuteCheck > onPressApprove Error', oError);

              this.setContentsBusy(false);
              AppUtils.handleError(oError);
            }
          },
        });
      },

      async createProcess(aRowData) {
        try {
          const { Appno } = await Client.deep(this.getModel(ServiceNames.WORKTIME), 'TimeReaderCheck', {
            ..._.get(aRowData, 0),
            TimeReaderNav: aRowData,
          });

          // 결재선 저장
          await this.ApprovalStatusHandler.saveWithNoDisplay(Appno);

          // {신청}되었습니다.
          MessageBox.success(this.getBundleText('MSG_00007', 'LABEL_00121'), {
            onClose: () => {
              this.setContentsBusy(false);
              this.onPressSearch();
            },
          });
        } catch (oError) {
          throw oError;
        }
      },

      onPressCancel() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const aSelectedTableData = _.chain(this.TableUtils.getSelectionData(oTable)).uniqBy('Appno').value();

        if (!aSelectedTableData.length) {
          MessageBox.alert(this.getBundleText('MSG_00010', 'LABEL_00118')); // {취소}할 데이터를 선택하세요.
          return;
        }

        if (_.filter(aSelectedTableData, (o) => o.Appst !== '20').length > 0) {
          MessageBox.alert(this.getBundleText('MSG_00064')); // 신청 상태의 데이터만 취소가 가능합니다.
          return;
        }

        this.setContentsBusy(true);

        // {취소}하시겠습니까?
        MessageBox.confirm(this.getBundleText('MSG_00006', 'LABEL_00118'), {
          actions: [this.getBundleText('LABEL_00114'), MessageBox.Action.CANCEL],
          onClose: async (sAction) => {
            if (!sAction || sAction === MessageBox.Action.CANCEL) {
              this.setContentsBusy(false);
              return;
            }

            try {
              const oModel = this.getModel(ServiceNames.WORKTIME);
              for (const mPayload of aSelectedTableData) {
                await Client.remove(oModel, 'TimeReaderCheck', _.pick(mPayload, 'Appno'));
              }

              // {취소}되었습니다.
              MessageBox.success(this.getBundleText('MSG_00007', 'LABEL_00118'), {
                onClose: () => {
                  this.setContentsBusy(false);
                  this.onPressSearch();
                },
              });
            } catch (oError) {
              this.debug('Controller > commuteCheck > onPressCancel Error', oError);

              this.setContentsBusy(false);
              AppUtils.handleError(oError);
            }
          },
        });
      },

      onPressRowApprovalDetail(oEvent) {
        const mRowData = oEvent.getSource().getParent().getBindingContext().getObject();
        const mApptyRoute = {
          TG: 'shift',
          TH: 'shiftChange',
          TI: 'attendance',
          TJ: 'commuteCheck',
          TK: 'overtime',
          TL: 'changeot',
        };

        if (!mRowData || !_.has(mApptyRoute, mRowData.Appty)) return;

        const sHost = window.location.href.split('#')[0];
        const sAuth = this.getViewModel().getProperty('/auth');
        const sRouteName = _.chain(sAuth === 'E' ? null : _.lowerCase(sAuth))
          .concat(mApptyRoute[mRowData.Appty])
          .compact()
          .join('/')
          .value();
        const mParams = [mRowData.Appno];

        if (mRowData.Appty === 'TI') {
          mParams.push(mRowData.Werks);
          mParams.push(mRowData.Orgeh);
          mParams.push(mRowData.Kostl ? mRowData.Kostl : 'NA');
        } else if (_.includes(['TG', 'TH', 'TK', 'TL'], mRowData.Appty)) {
          mParams.push(mRowData.Werks);
          mParams.push(mRowData.Orgeh);
        }

        window.open(`${sHost}#/${sRouteName}/${mParams.join('/')}`, '_blank');
      },

      onPressExcelDownload() {
        const oTable = this.byId(this.LIST_TABLE_ID);
        const sFileName = this.getBundleText('LABEL_00185', 'LABEL_06019'); // {근태확인신청}_목록

        this.TableUtils.export({ oTable, sFileName });
      },

      async retrieveList() {
        const oViewModel = this.getViewModel();

        try {
          const oTable = this.byId(this.LIST_TABLE_ID);
          const mSearchConditions = oViewModel.getProperty('/searchConditions');
          const sAuth = oViewModel.getProperty('/auth');

          if (!mSearchConditions.Werks || !mSearchConditions.Orgeh) return;

          oViewModel.setProperty('/list', []);
          oViewModel.refresh(true);
          this.TableUtils.clearTablePicker(oTable);

          const sAppstateNullText = this.getBundleText('LABEL_00102');
          const aRowData = await Client.getEntitySet(this.getViewModel(ServiceNames.WORKTIME), 'TimeReaderCheck', {
            Austy: sAuth,
            Werks: mSearchConditions.Werks,
            Orgeh: mSearchConditions.Orgeh,
            Kostl: mSearchConditions.Kostl === '00000000' ? null : mSearchConditions.Kostl,
            Apbeg: this.DateUtils.parse(mSearchConditions.Apbeg),
            Apend: this.DateUtils.parse(mSearchConditions.Apend),
            Clsin: mSearchConditions.Clsin,
          });

          oViewModel.setProperty('/listInfo', {
            ...oViewModel.getProperty('/listInfo'),
            ...this.TableUtils.count({ oTable, aRowData }),
          });
          oViewModel.setProperty(
            '/list',
            _.map(aRowData, (o) => ({
              ...o,
              Appsttx: o.Appst === '' ? sAppstateNullText : o.Appsttx,
              Beguzf: this.TimeUtils.nvl(o.Beguzf),
              Enduzf: this.TimeUtils.nvl(o.Enduzf),
              Dedhr: this.TimeUtils.nvl(o.Dedhr),
              TmdatFormatted: this.DateUtils.format(o.Tmdat),
              AppdaFormatted: this.DateUtils.format(o.Appda),
              SgndaFormatted: this.DateUtils.format(o.Sgnda),
            }))
          );
          oViewModel.setProperty(
            '/original',
            _.chain(aRowData)
              .groupBy('Pernr')
              .tap((data) => {
                _.forOwn(data, (v, p) => {
                  _.set(
                    data,
                    p,
                    _.chain(v)
                      .map((o) => ({
                        Tmdat: moment(o.Tmdat).format('YYYYMMDD'),
                        Begdaf: this.DateUtils.format(o.Begdaf),
                        Beguzf: this.TimeUtils.toString(o.Beguzf, 'HH:mm'),
                        Enddaf: this.DateUtils.format(o.Enddaf),
                        Enduzf: this.TimeUtils.toString(o.Enduzf, 'HH:mm'),
                      }))
                      .keyBy((k) => moment(k.Tmdat).format('YYYYMMDD'))
                      .value()
                  );
                });
              })
              .value()
          );

          setTimeout(() => oTable.setFirstVisibleRow(), 100);
          this.TableUtils.clearTable(oTable);
          oViewModel.refresh(true);
          this.setDetailsTableStyle();
        } catch (oError) {
          this.debug('Controller > commuteCheck > retrieveList Error', oError);

          AppUtils.handleError(oError);
        } finally {
          this.setContentsBusy(false);
        }
      },
    });
  }
);
