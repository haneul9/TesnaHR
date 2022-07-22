/* eslint-disable quote-props */
sap.ui.define(
  [
    'sap/ui/tesna/common/AppUtils', //
    'sap/ui/model/json/JSONModel',
    'sap/ui/tesna/common/odata/ServiceManager',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/control/MessageBox',
  ],
  (AppUtils, JSONModel, ServiceManager, ServiceNames, MessageBox) => {
    'use strict';

    return {
      AttachId: '',
      FileData: '',
      /*
       * 파일첨부 panel 및 FileUploader Control의 표시여부 등을 설정
       * 문서상태 및 첨부파일 여부에 따라 Control의 표시여부를 결정한다.
       */
      async setAttachFile(oController, opt) {
        const options = $.extend(
          true,
          {
            Id: '',
            RefeFilebox: false,
            Appno: '',
            Type: '',
            Editable: false,
            Gubun: false,
            FileTypes: [],
            Mode: 'S', // S: single file, M: multi file
            Max: 3,
            Message: '',
            LinkText: '',
            LinkUrl: null,
            Visible: true,
            maximumFileSize: 10,
          },
          opt
        );

        options.ListMode = options.Editable ? sap.ui.table.SelectionMode.MultiToggle : sap.ui.table.SelectionMode.None;
        options.FileTypes = !!opt.FileTypes ? opt.FileTypes : ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'bmp', 'gif', 'png', 'txt', 'pdf', 'jpeg'];

        const oAttController = oController.AttachFileAction;
        const sId = options.Id;
        const sIdPath = !!sId ? `${sId}--` : '';
        const oAttachbox = oController.byId(`${sIdPath}ATTACHBOX`);

        if (!!sId) {
          oController.setViewModel(new JSONModel(), sId);
          oAttController.AttachId = sId;
        } else {
          oAttController.AttachId = '';
        }

        const oJsonModel = !!sId ? oController.getViewModel(sId) : oController.getViewModel();

        oJsonModel.setProperty('/Settings', options);
        oJsonModel.setProperty('/DeleteDatas', []);
        try {
          const aFileList = await oAttController.refreshAttachFileList(oController, sId);

          oJsonModel.setProperty('/Data', aFileList);
          oController.AttachFileAction.attachSettings(oController, sId, aFileList);

          const bRefeFix = oJsonModel.getProperty('/UserFixed');
          // ess자료실 첨부파일없는경우 visible처리
          if (!bRefeFix) {
            if (_.isEmpty(aFileList) && options.RefeFilebox) {
              oJsonModel.setProperty('/Settings/Visible', false);
            } else if (!_.isEmpty(aFileList) && options.RefeFilebox) {
              oJsonModel.setProperty('/Settings/Visible', true);
            }
          }
        } catch (oError) {
          AppUtils.handleError(oError);
        } finally {
          oAttachbox.setBusy(false);
        }
      },

      /*
       * SetAttachFileContainer
       */
      attachSettings(oController, sId, aFileList = []) {
        const oJsonModel = !!sId ? oController.getViewModel(sId) : oController.getViewModel();
        const sIdPath = !!sId ? `${sId}--` : '';
        const oAttachTable = oController.byId(`${sIdPath}attachTable`);
        const sPath = '/Data';

        oAttachTable.setModel(oJsonModel);
        oAttachTable.bindRows(sPath);
        oAttachTable.setVisibleRowCount(aFileList.length);
      },

      /*
       * 첨부파일의 Upload가 완료되었을때 처리 내역
       * refreshAttachFileList Function을 호출한다.
       */
      uploadComplete(oEvent) {
        const sResponse = oEvent.getParameter('response');

        MessageBox.alert(sResponse);
      },

      typeMissmatch(oEvent) {
        const sFileName = oEvent.getParameter('fileName');
        const sFileType = oEvent.getParameter('fileType');

        MessageBox.alert(this.getBundleText('MSG_00012', sFileName, sFileType));
      },

      /*
       * Upload할 첨부파일을 선택했을 경우 처리 내역
       */
      onFileChange(oEvent) {
        const oEventSource = oEvent.getSource();
        const oFileUploader = oEventSource;
        const aFileList = [];
        // const vMode = JSonModel.getProperty('/Settings/Mode');
        const files = oEvent.getParameter('files');
        const sBtnId = oEventSource.getId();
        const sPageId = this.getView().getId();
        const sPrefixId = sBtnId.replace(`${sPageId}--`, '');
        const sSuffix = sPrefixId.replace('--ATTACHFILE_BTN', '');
        let sId = '';

        if (sSuffix === this.AttachFileAction.AttachId) {
          sId = this.AttachFileAction.AttachId;
        } else {
          this.AttachFileAction.AttachId = '';
        }

        const JSonModel = !!sId ? oEventSource.getModel(sId) : oEventSource.getModel();
        const sPath = '/Data';
        const sSettingPath = '/Settings/';

        const vMax = JSonModel.getProperty(`${sSettingPath}Max`);
        let vFileData = JSonModel.getProperty(sPath);

        // File 데이터 초기화
        if (!vFileData.length) {
          JSonModel.setProperty(sPath, []);
          vFileData = JSonModel.getProperty(sPath);
        }

        if (!!files) {
          vFileData.forEach((elem) => {
            aFileList.push(elem);
          });

          if (vFileData.length + files.length > vMax) {
            oFileUploader.clear();
            oFileUploader.setValue('');

            MessageBox.alert(this.getBundleText('MSG_00014', vMax));

            return;
          }

          const iFileLength = aFileList.length + files.length;

          for (let i = 0; i < files.length; i++) {
            files[i].New = true;
            files[i].Zfilename = files[i].name;
            files[i].Type = files[i].type;
            files[i].Zbinkey = String(parseInt(Math.random() * 100000000000000));
            files[i].Seqnr = aFileList.length + 1;

            aFileList.push(files[i]);
          }

          JSonModel.setProperty(`${sSettingPath}Length`, iFileLength);
          JSonModel.setProperty(sPath, aFileList);

          const oAttachTable = oEvent.getSource().getParent().getParent().getParent().getItems()[1];

          oAttachTable.clearSelection();
          oAttachTable.setVisibleRowCount(iFileLength);
        }

        oFileUploader.clear();
        oFileUploader.setValue('');
      },

      /*
       * 첨부파일 링크 Click
       */
      onFileLink(oEvent) {
        const mFileData = oEvent.getSource().getBindingContext().getProperty();
        if (!mFileData) {
          return;
        }
        window.open(mFileData.Fileuri, '_blank');
      },

      openFileLink(sUrl) {
        if (_.isEmpty(sUrl)) {
          return;
        }
        window.open(sUrl, '_blank');
      },

      /*
       * 첨부파일 리스트를 Binding한다.
       */
      refreshAttachFileList(oController, sId) {
        const sIdPath = !!sId ? `${sId}--` : '';
        const oAttachbox = oController.byId(`${sIdPath}ATTACHBOX`);
        const oFileUploader = oController.byId(`${sIdPath}ATTACHFILE_BTN`);
        const oModel = oController.getModel(ServiceNames.COMMON);
        const JSonModel = !!sId ? oController.getViewModel(sId) : oController.getViewModel();
        const sPath = '/Data';
        const sSettingPath = '/Settings/';
        const vAttachFileDatas = JSonModel.getProperty(sSettingPath);
        const Datas = { Data: [] };

        JSonModel.setProperty(sPath, []);
        oAttachbox.setBusyIndicatorDelay(0).setBusy(true);
        oFileUploader.clear();
        oFileUploader.setValue('');

        if (_.isEmpty(vAttachFileDatas.Appno)) return [];

        return new Promise((resolve, reject) => {
          oModel.read('/FileListSet', {
            filters: [
              // prettier 방지주석
              new sap.ui.model.Filter('Appno', sap.ui.model.FilterOperator.EQ, vAttachFileDatas.Appno),
              new sap.ui.model.Filter('Zworktyp', sap.ui.model.FilterOperator.EQ, vAttachFileDatas.Type),
            ],
            success: (data) => {
              if (data && data.results.length) {
                data.results.forEach((elem) => {
                  elem.New = false;
                  Datas.Data.push(elem);
                });
              }

              resolve(Datas.Data);
            },
            error: (res) => {
              reject(res);
            },
          });
        });
      },

      readFileList(sAppno, sWorkType) {
        return new Promise((resolve, reject) => {
          const oModel = AppUtils.getAppController().getModel(ServiceNames.COMMON);

          oModel.read('/FileListSet', {
            filters: [new sap.ui.model.Filter('Appno', sap.ui.model.FilterOperator.EQ, sAppno), new sap.ui.model.Filter('Zworktyp', sap.ui.model.FilterOperator.EQ, sWorkType)],
            success: (oData) => {
              resolve(
                oData.results.map((o) => {
                  return { New: false, ...o };
                })
              );
            },
            error: (oError) => {
              this.debug(`${sUrl} error.`, oError);
              reject({ code: 'E', message: AppUtils.getBundleText('MSG_00045') }); // 파일을 조회할 수 없습니다.
            },
          });
        });
      },

      /*
       * 조회화면 list에있는 증빙클릭시 첨부파일리스트 호출
       */
      setTableFileList(oController, oTableRowData = {}) {
        const oListFileTable = oController.byId('listFileTable');
        const oModel = oController.getModel(ServiceNames.COMMON);
        const JSonModel = oController.getViewModel();
        const Datas = { Data: [] };

        oModel.read('/FileListSet', {
          filters: [
            new sap.ui.model.Filter('Appno', sap.ui.model.FilterOperator.EQ, oTableRowData.Appno),
            new sap.ui.model.Filter('Zworktyp', sap.ui.model.FilterOperator.EQ, oController.getApprovalType()),
          ],
          success: (data) => {
            if (data && data.results.length) {
              data.results.forEach((elem) => {
                elem.New = false;
                Datas.Data.push(elem);
              });
            }

            JSonModel.setProperty('/Data', Datas.Data);
            JSonModel.setProperty('/Data/busy', false);
            oListFileTable.setVisibleRowCount(Datas.Data.length);
          },
          error: (res) => {
            this.debug(`${sUrl} error.`, res);
            JSonModel.setProperty('/Data/busy', false);
          },
        });
      },

      /*
       * 첨부파일 길이
       */
      getFileCount(sId) {
        const sIdPath = !!sId ? `${sId}--` : '';
        const Attachbox = this.byId(`${sIdPath}ATTACHBOX`);
        const JSonModel = !!sId ? Attachbox.getModel(sId) : Attachbox.getModel();
        const sPath = '/Data';

        const vAttachDatas = JSonModel.getProperty(sPath);

        return !!vAttachDatas ? vAttachDatas.length : 0;
      },

      /*
       *   첨부파일 Upload
       */
      uploadFile(Appno, Type, sId) {
        const sIdPath = !!sId ? `${sId}--` : '';
        const sServiceUrl = ServiceManager.getServiceUrl('ZHR_COMMON_SRV');
        const oModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true, undefined, undefined, undefined, undefined, undefined, false);
        const Attachbox = this.byId(`${sIdPath}ATTACHBOX`);
        const JSonModel = !!sId ? Attachbox.getModel(sId) : Attachbox.getModel();
        const sPath = '/Data';

        const vAttachDatas = JSonModel.getProperty(sPath) || [];
        const aDeleteFiles = JSonModel.getProperty('/DeleteDatas') || [];
        const oAttachTable = this.byId(`${sIdPath}attachTable`);

        return new Promise(async (resolve, reject) => {
          // 파일 삭제
          if (!!aDeleteFiles.length) {
            try {
              Promise.all(
                _.map(aDeleteFiles, (e) => {
                  this.AttachFileAction.callDeleteFileService(this, e);
                })
              );
            } catch (oError) {
              reject(AppUtils.handleError(oError));
            }
          }

          // 신규 등록된 파일만 업로드
          if (vAttachDatas.every((e) => !e.New)) return resolve();

          vAttachDatas.forEach((elem) => {
            if (elem.New === true) {
              oModel.refreshSecurityToken();
              const oRequest = oModel._createRequest();
              const oHeaders = {
                'x-csrf-token': oRequest.headers['x-csrf-token'],
                slug: [Appno, Type, encodeURI(elem.Zfilename)].join('|'),
              };

              this.AttachFileAction.FileData = elem;

              jQuery.ajax({
                type: 'POST',
                async: false,
                url: `${sServiceUrl}/FileUploadSet/`,
                headers: oHeaders,
                cache: false,
                contentType: elem.type,
                processData: false,
                data: elem,
                success: (data) => {
                  this.debug(`${this.getBundleText('MSG_00016')}, ${data}`);
                  this.AttachFileAction.FileData.New = false;
                  resolve();
                },
                error: (oError) => {
                  this.debug(`Error: ${oError}`);

                  // 파일 업로드를 실패하였습니다.
                  reject({ code: 'E', message: this.getBundleText('MSG_00041') });
                },
                complete: () => {
                  oAttachTable.clearSelection();
                },
              });
            }
          });
        });
      },
      /**
       * @param  {} Appno
       * @param  {} Type
       */
      upload(sAppno, sType, aFiles, sFileName) {
        const sServiceUrl = ServiceManager.getServiceUrl('ZHR_COMMON_SRV', this.getOwnerComponent());
        const oModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true, undefined, undefined, undefined, undefined, undefined, false);

        return new Promise((resolve, reject) => {
          for (let i = 0; i < aFiles.length; i++) {
            oModel.refreshSecurityToken();

            const oFile = aFiles[i];
            const oRequest = oModel._createRequest();
            const oHeaders = {
              'x-csrf-token': oRequest.headers['x-csrf-token'],
              slug: [sAppno, sType, encodeURI(oFile.name || sFileName)].join('|'),
            };

            jQuery.ajax({
              type: 'POST',
              async: false,
              url: `${sServiceUrl}/FileUploadSet/`,
              headers: oHeaders,
              cache: false,
              contentType: oFile.type,
              processData: false,
              data: oFile,
              success: (data) => {
                this.debug(`${this.getBundleText('MSG_00016')}, ${data}`);
                resolve();
              },
              error: (oError) => {
                this.debug(`Error: ${oError}`);

                // 파일 업로드를 실패하였습니다.
                reject({ code: 'E', message: this.getBundleText('MSG_00041') });
              },
            });
          }
        });
      },

      /*
       * 첨부된 파일을 삭제처리
       */
      onDeleteAttachFile() {
        const sId = this.AttachFileAction.AttachId || '';
        const oJSonModel = !!sId ? this.getViewModel(sId) : this.getViewModel();
        const sIdPath = !!sId ? `${sId}--` : '';
        const oTable = this.byId(`${sIdPath}attachTable`);
        const sPath = '/Data';
        const aFileDatas = oJSonModel.getProperty(sPath);
        const aContexts = oTable.getSelectedIndices();

        if (!aContexts.length) {
          MessageBox.alert(this.getBundleText('MSG_00018')); // 삭제할 파일을 선택하세요.
          return;
        }

        MessageBox.confirm(this.getBundleText('MSG_00019'), {
          actions: [MessageBox.Action.YES, MessageBox.Action.NO],
          onClose: (fVal) => {
            if (fVal === MessageBox.Action.YES) {
              const aSelectFiles = [];
              const aDeleteList = [];

              aContexts.forEach((e) => {
                const oFileData = aFileDatas[e];

                if (!!oFileData.Appno) {
                  aDeleteList.push(oFileData);
                }
                aSelectFiles.push(oFileData);
              });

              const aResult = aFileDatas.filter((e) => {
                return !aSelectFiles.includes(e);
              });

              const iFileLeng = aResult.length;

              for (let i = 0; i < iFileLeng; i++) {
                if (!!aResult.length) {
                  aResult[i].Seqnr = i + 1;
                }
              }

              oJSonModel.setProperty(sPath, aResult);
              oJSonModel.setProperty('/DeleteDatas', aDeleteList);
              oTable.setVisibleRowCount(aResult.length);
              oTable.clearSelection();
              // MessageBox.alert(this.getBundleText('MSG_00042')); // 파일 삭제가 완료되었습니다.
            }
          },
        });
      },

      /*
       * 첨부파일 삭제 oData
       */
      callDeleteFileService(oController, fileInfo) {
        const oModel = oController.getModel(ServiceNames.COMMON);
        const sPath = oModel.createKey('/FileListSet', {
          Appno: fileInfo.Appno,
          Zworktyp: fileInfo.Zworktyp,
          Zfileseq: fileInfo.Zfileseq,
        });

        return new Promise((resolve, reject) => {
          oModel.remove(sPath, {
            success: () => {
              resolve();
            },
            error: (oError) => {
              reject(AppUtils.handleError(oError));
            },
          });
        });
      },

      deleteFile(Appno, Zworktyp, Zfileseq = '999') {
        return new Promise((resolve, reject) => {
          const oModel = AppUtils.getAppController().getModel(ServiceNames.COMMON);
          const sPath = oModel.createKey('/FileListSet', { Appno, Zworktyp, Zfileseq });

          oModel.remove(sPath, {
            success: () => {
              resolve();
            },
            error: (oError) => {
              reject(oError);
            },
          });
        });
      },
    };
  }
);
