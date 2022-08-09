sap.ui.define(
  [
    // prettier 방지용 주석
    'sap/ui/base/Object',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/odata/ODataModel',
    'sap/ui/table/SelectionMode',
    'sap/ui/tesna/common/AppUtils',
    'sap/ui/tesna/common/FileDataProvider',
    'sap/ui/tesna/common/odata/ServiceManager',
    'sap/ui/tesna/common/odata/ServiceNames',
    'sap/ui/tesna/control/MessageBox',
  ],
  (
    // prettier 방지용 주석
    BaseObject,
    JSONModel,
    ODataModel,
    SelectionMode,
    AppUtils,
    FileDataProvider,
    ServiceManager,
    ServiceNames,
    MessageBox
  ) => {
    'use strict';

    return BaseObject.extend('sap.ui.tesna.common.FileAttachmentBoxHandler', {
      oController: null,
      oFileAttachmentBox: null,
      oFileUploader: null,
      oFilesTable: null,

      /**
       * 파일첨부 panel 및 FileUploader Control의 표시여부 등을 설정
       * 문서상태 및 첨부파일 여부에 따라 Control의 표시여부를 결정한다.
       */
      /**
       * @override
       * @returns {sap.ui.base.Object}
       */
      constructor: function (oController, opt) {
        const options = {
          fragmentId: '',
          appno: '',
          appty: '',
          message: '',
          gubun: false,
          visible: true,
          editable: false,
          maxFileCount: 3,
          maxFileSize: 10,
          fileTypes: ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'bmp', 'gif', 'png', 'txt', 'pdf'],
          ...opt,
        };

        const sFragmentId = options.fragmentId ? `${options.fragmentId}--` : '';
        const sBoxId = `${sFragmentId}fileAttachmentBox`;

        this.oController = oController;
        this.oFileAttachmentBox = oController.byId(sBoxId);
        this.oFileUploader = oController.byId(`${sFragmentId}fileUploader`);
        this.oFilesTable = oController.byId(`${sFragmentId}filesTable`);

        const oBoxModel = new JSONModel({
          settings: options,
          files: null,
          fileCount: 1,
          fileSelectionMode: options.editable ? SelectionMode.MultiToggle : SelectionMode.None,
          deleteTargetFiles: [],
        });
        this.oFileAttachmentBox.setModel(oBoxModel);

        this.readFileList();
      },

      /**
       * 첨부 파일 목록 조회
       */
      async readFileList() {
        try {
          this.oFileUploader.clear();
          this.oFileUploader.setValue('');

          const oBoxModel = this.oFileAttachmentBox.getModel();
          const mSettings = oBoxModel.getProperty('/settings');

          const aFiles = await FileDataProvider.readListData(mSettings.appno, mSettings.appty);

          oBoxModel.setProperty('/files', aFiles);
          oBoxModel.setProperty('/fileCount', aFiles.length);
        } catch (oError) {
          AppUtils.handleError(oError);
        } finally {
          this.oFileAttachmentBox.setBusy(false);
        }
      },

      /**
       * 첨부 파일 업로드 완료 event handler
       */
      onAttachmentUploadComplete(oEvent) {
        const sResponse = oEvent.getParameter('response');

        MessageBox.alert(sResponse);
      },

      onTypeMissMatch(oEvent) {
        const sFileName = oEvent.getParameter('fileName');
        const sFileType = oEvent.getParameter('fileType');

        MessageBox.alert(AppUtils.getBundleText('MSG_00012', sFileName, sFileType));
      },

      /**
       * 첨부 파일 선택 event handler
       */
      onAttachmentChange(oEvent) {
        const oFileUploader = oEvent.getSource();
        const mSelectedFiles = oEvent.getParameter('files'); // FileList object(Array가 아님)
        const iSelectedFilesLength = mSelectedFiles.length;
        const oBoxModel = this.oFileAttachmentBox.getModel();
        const iMaxFileCount = oBoxModel.getProperty('/settings/maxFileCount');
        const aPrevFiles = oBoxModel.getProperty('/files');
        const iPrevFilesLength = aPrevFiles.length;

        if (!iSelectedFilesLength) {
          return;
        }

        const iTotalFilesLength = iPrevFilesLength + iSelectedFilesLength;

        if (iTotalFilesLength > iMaxFileCount) {
          MessageBox.alert(AppUtils.getBundleText('MSG_00014', iMaxFileCount));
          return;
        }

        Object.values(mSelectedFiles).forEach((file, i) => {
          file.New = true;
          file.Deleted = false;
          file.Fname = file.name;
          file.Type = file.type;
          file.Zbinkey = String(parseInt(Math.random() * 100000000000000));
          file.Numbr = iPrevFilesLength + i + 1;
          file.Fnumr = iPrevFilesLength === 0 ? 1 : _.toNumber(aPrevFiles[aPrevFiles.length - 1].Fnumr) + 1;

          aPrevFiles.push(file);
        });

        oBoxModel.setProperty('/files', aPrevFiles);
        oBoxModel.setProperty('/fileCount', iTotalFilesLength);

        this.oFilesTable.clearSelection();
        this.oFilesTable.setVisibleRowCount(iTotalFilesLength);

        oFileUploader.clear();
        oFileUploader.setValue('');
      },

      /**
       * 첨부 파일 삭제 버튼 click event handler
       */
      onAttachmentRemove() {
        this.toggleDeleted(true, 'MSG_00018'); // 삭제할 파일을 선택하세요.
      },

      /**
       * 첨부 파일 삭제 취소 버튼 click event handler
       */
      onAttachmentRemoveCancel() {
        this.toggleDeleted(false, 'MSG_00051'); // 삭제 취소할 파일을 선택하세요.
      },

      toggleDeleted(bDeleted, sMessageCode) {
        const aSelectedIndices = this.oFilesTable.getSelectedIndices();
        if (!aSelectedIndices.length) {
          MessageBox.alert(AppUtils.getBundleText(sMessageCode));
          return;
        }

        const oBoxModel = this.oFileAttachmentBox.getModel();
        let aFiles = oBoxModel.getProperty('/files');

        // 신규 첨부 파일은 목록에서 즉시 삭제
        aFiles = aFiles.filter((mFile, i) => !aSelectedIndices.includes(i) || !mFile.New);

        aFiles
          .filter((mFile, i) => aSelectedIndices.includes(i))
          .forEach((mFile) => {
            mFile.Deleted = bDeleted;
          });

        oBoxModel.setProperty('/files', aFiles);
        oBoxModel.setProperty('/fileCount', aFiles.length);

        this.oFilesTable.clearSelection();
      },

      /**
       * 첨부파일 개수
       */
      getFileCount() {
        return this.oFileAttachmentBox.getModel().getProperty('/fileCount');
      },

      /**
       * 첨부파일 Upload
       */
      async upload(sAppno) {
        return new Promise(async (resolve, reject) => {
          const oBoxModel = this.oFileAttachmentBox.getModel();
          let aFiles = oBoxModel.getProperty('/files') || [];

          // 파일 삭제
          try {
            const oRemoveModel = AppUtils.getAppComponent().getModel(ServiceNames.COMMON);

            await Promise.all(
              aFiles
                .filter((mFile) => mFile.Deleted)
                .map((mFile) => {
                  return this.removeFile(oRemoveModel, mFile);
                })
            );
          } catch (oError) {
            AppUtils.debug('FileAttachmentBoxHandler > upload > removeFile Error', oError);

            reject(oError);
          }

          // 업로드 완료된 파일만 있는 경우 업로드 동작 불필요
          aFiles = aFiles.filter((mFile) => mFile.New);

          if (!aFiles.length) {
            oBoxModel.setProperty('/settings/appno', sAppno);
            this.readFileList();
            resolve();
          }

          const sServiceUrl = ServiceManager.getServiceUrl('ZHRXX_COMMON_SRV');
          const oUploadModel = new ODataModel(sServiceUrl, { json: true, loadMetadataAsync: true, refreshAfterChange: false });
          const sUploadUrl = `${sServiceUrl}/FileSet/`;
          const sAppty = oBoxModel.getProperty('/settings/appty');

          // 파일 업로드
          try {
            while (aFiles.length) {
              const oError = await this.uploadFile({ sAppno, sAppty, oUploadModel, sUploadUrl, mFile: aFiles.shift() });
              if (oError && oError.code === 'E') {
                reject(oError);
              }
            }

            // New flag 제거
            aFiles = oBoxModel.getProperty('/files');
            aFiles.forEach((mFile) => {
              if (mFile.New) {
                mFile.New = false;
                mFile.Uploaded = true;
              }
            });
            oBoxModel.setProperty('/files', aFiles);

            oBoxModel.setProperty('/settings/appno', sAppno);
            this.readFileList();

            resolve();
          } catch (oError) {
            AppUtils.debug('FileAttachmentBoxHandler > upload > uploadFile Error', oError);

            reject(oError);
          }
        });
      },

      async removeFile(oRemoveModel, { Appno, Appty, Fnumr = 1, Fname }) {
        return new Promise((resolve, reject) => {
          const sUrl = oRemoveModel.createKey('/FileListSet', { Appno, Appty, Fnumr });

          oRemoveModel.remove(sUrl, {
            success: resolve,
            error: (Error) => {
              const sMessage1 = AppUtils.getBundleText('MSG_00008', 'LABEL_00250'); // {파일삭제}중 오류가 발생하였습니다.
              const sMessage2 = AppUtils.getBundleText('MSG_00052', Fname); // 파일명 : {0}

              reject({ code: 'E', message: `${sMessage1}\n\n${sMessage2}`, data: { Appno, Appty, Fnumr, Fname, Error } });
            },
          });
        });
      },

      async uploadFile({ sAppno, sAppty, oUploadModel, sUploadUrl, mFile }) {
        return new Promise((resolve, reject) => {
          const mHeaders = {
            'x-csrf-token': this.getCsrfToken(oUploadModel),
            slug: [sAppno, sAppty, encodeURI(mFile.Fname)].join('|'),
          };

          $.ajax({
            url: sUploadUrl,
            type: 'POST',
            async: false,
            cache: false,
            processData: false,
            contentType: mFile.type,
            headers: mHeaders,
            data: mFile,
            success: (mData) => {
              AppUtils.debug(`${sUploadUrl} success.`, mData);

              resolve();
            },
            error: (oError) => {
              AppUtils.debug(`${sUploadUrl} error.`, oError);

              const sMessage1 = AppUtils.getBundleText('MSG_00041'); // 파일 업로드를 실패하였습니다.
              const sMessage2 = AppUtils.getBundleText('MSG_00052', mFile.Fname); // 파일명 : {0}

              reject({ code: 'E', message: `${sMessage1}\n\n${sMessage2}` });
            },
          });
        });
      },

      getCsrfToken(oUploadModel) {
        oUploadModel.refreshSecurityToken();

        return oUploadModel._createRequest().headers['x-csrf-token'];
      },
    });
  }
);
