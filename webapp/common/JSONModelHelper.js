sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/model/json/JSONModel',
      'sap/ui/tesna/common/AppUtils',
      'sap/ui/tesna/common/JSONModelRequest',
    ],
    (
      // prettier 방지용 주석
      JSONModel,
      AppUtils,
      JSONModelRequest
    ) => {
      'use strict';
  
      // Multiple requests sample : ZUI5_SF_EvalAchvCompItemCleanApp/Page.controller.js -> successHrReports function 참고
  
      const _getDefaultLoadDataArguments = function _getDefaultLoadDataArguments() {
        return {
          aRequests: [new JSONModelRequest()],
          sURL: null,
          sType: 'GET',
          bAsync: true,
          bMerge: false,
          bCache: false,
          mHeaders: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Language': 'ko-KR',
          },
        };
      };
  
      return JSONModel.extend('sap.ui.tesna.common.JSONModelHelper', {
        constructor: function (...aArgs) {
          JSONModel.apply(this, aArgs);
  
          this.oController = null; // i18n, view 등의 참조를 제공할 controller
          this.oPromise = null; // loadData function이 반환하는 promise 저장 변수, 아래 promise function을 호출하여 사용
          this.iCount = null; // loadData 후 getData 호출로 얻을 수 있는 data의 d.__count 를 저장해놓는 변수, 아래 getInlinecount function을 호출하여 사용
          this.mResult = null; // loadData 후 getData 호출로 얻을 수 있는 data의 d 를 저장해놓는 변수, 아래 getResult function을 호출하여 사용
          this.aResults = null; // loadData 후 getData 호출로 얻을 수 있는 data의 d.results 를 저장해놓는 변수, 아래 getResults function을 호출하여 사용
          this.mResultsMap = null; // Multiple requests의 경우 비동기로 호출되므로 결과 results의 orderby를 유지할 수 있도록 호출한 순서를 map의 key값으로 저장해둠
          this.mLoadDataArguments = _getDefaultLoadDataArguments(); // loadData 호출시 넘겨주는 parameter들을 임시로 저장하는 변수
        },
  
        setController(oController) {
          this.oController = oController;
          return this;
        },
  
        getController() {
          return this.oController;
        },
  
        _getRequests(oRequest) {
          const mArgs = oRequest.mLoadDataArguments;
          if (!mArgs) {
            this.mLoadDataArguments = _getDefaultLoadDataArguments();
          }
          if (!mArgs.aRequests || !mArgs.aRequests.length) {
            mArgs.aRequests = [new JSONModelRequest()];
          }
          return mArgs.aRequests;
        },
  
        setParameter(sKey, vValue) {
          const aRequests = this._getRequests(this);
          aRequests.forEach((oRequest) => {
            oRequest.setParameter(sKey, vValue);
          });
  
          return this;
        },
  
        getParameter(sKey) {
          const aRequests = this._getRequests(this);
          return aRequests[0].getParameter(sKey);
        },
  
        setUrl(sURL) {
          const aRequests = this._getRequests(this);
          aRequests.forEach((oRequest) => {
            oRequest.setUrl(sURL);
          });
  
          return this;
        },
  
        setRequests(aRequests) {
          this.mLoadDataArguments.aRequests = Array.isArray(aRequests) ? aRequests : [aRequests];
          return this;
        },
  
        setAsync(bAsync) {
          this.mLoadDataArguments.bAsync = bAsync;
          return this;
        },
  
        setMerge(bMerge) {
          this.mLoadDataArguments.bMerge = bMerge;
          return this;
        },
  
        setCache(bCache) {
          this.mLoadDataArguments.bCache = bCache;
          return this;
        },
  
        setHeaders(mHeaders) {
          Object.assign(this.mLoadDataArguments.mHeaders, mHeaders);
          return this;
        },
  
        setGet() {
          this.mLoadDataArguments.sType = 'GET';
          this.mLoadDataArguments.mHeaders.Accept = 'application/json';
          return this;
        },
  
        setPost() {
          this.mLoadDataArguments.sType = 'POST';
          this.mLoadDataArguments.mHeaders.Accept = 'application/json';
          return this;
        },
  
        setDelete() {
          this.mLoadDataArguments.sType = 'DELETE';
          this.mLoadDataArguments.mHeaders.Accept = 'text/plain';
          return this;
        },
  
        setTop(vValue) {
          return this.setParameter('top', vValue);
        },
  
        setSkip(vValue) {
          return this.setParameter('skip', vValue);
        },
  
        setSelect(vValue) {
          const aRequests = this._getRequests(this);
          aRequests.forEach((oRequest) => {
            oRequest.setSelect(vValue);
          });
  
          return this;
        },
  
        setFilter(vValue) {
          const aRequests = this._getRequests(this);
          aRequests.forEach((oRequest) => {
            oRequest.setFilter(vValue);
          });
  
          return this;
        },
  
        setExpand(vValue) {
          const aRequests = this._getRequests(this);
          aRequests.forEach((oRequest) => {
            oRequest.setExpand(vValue);
          });
  
          return this;
        },
  
        setOrderby(vValue) {
          const aRequests = this._getRequests(this);
          aRequests.forEach((oRequest) => {
            oRequest.setOrderby(vValue);
          });
  
          return this;
        },
  
        setInlinecount(bValue) {
          const aRequests = this._getRequests(this);
          aRequests.forEach((oRequest) => {
            oRequest.setInlinecount(bValue);
          });
  
          return this;
        },
  
        getInlinecount() {
          if (this.iCount) {
            return this.iCount;
          }
  
          const mArgs = this.mLoadDataArguments;
          if (mArgs.aRequests[0].isInlinecount()) {
            this.iCount = (this.getData().d || {}).iCount || 0;
          }
  
          return this.iCount;
        },
  
        getLoadDataArgumentsObject() {
          return this.mLoadDataArguments;
        },
  
        getLoadDataArguments() {
          const mArgs = this.mLoadDataArguments;
          const aRequests = mArgs.aRequests;
          return aRequests.length === 1
            ? // single request
              [aRequests[0].getURL(), aRequests[0].getParameterMap(), mArgs.bAsync, mArgs.sType, mArgs.bMerge, mArgs.bCache, mArgs.mHeaders]
            : // multiple requests
              aRequests.map((oRequest) => [oRequest.getURL(), oRequest.getParameterMap(), mArgs.bAsync, mArgs.sType, mArgs.bMerge, mArgs.bCache, mArgs.mHeaders]);
        },
  
        getEncodedURL() {
          return this.mLoadDataArguments.aRequests.map((oRequest) => oRequest.getEncodedURL(oRequest.getParameterMap()));
        },
  
        getDecodedURL() {
          return this.mLoadDataArguments.aRequests.map((oRequest) => oRequest.getDecodedURL(oRequest.getParameterMap()));
        },
  
        load() {
          try {
            const oModel = this;
            const mArgs = this.getLoadDataArguments();
  
            // multiple requests
            if (this.mLoadDataArguments.aRequests.length > 1) {
              this.mResultsMap = {};
              this.oPromise = Promise.all(
                mArgs.map((mArg, i) => {
                  new JSONModelHelper()
                    .setController(this.oController)
                    .attachRequestCompleted(function (...args) {
                      AppUtils.debug('success - child', i, mArg, args);
  
                      const mData = this.getData().d || {};
                      oModel.mResultsMap[i] = mData.results || [];
  
                      if (mData.__next) {
                        AppUtils.debug('Request success but it has more data to retrieve.', i, mData.__next, mArg);
                      }
                    })
                    .attachRequestFailed(function (...args) {
                      AppUtils.debug('failure - child', i, args);
                    });
  
                  return this.loadData(...mArg);
                })
              )
                .then(() => this.loadData('localService/empty.json', null, true, 'GET', true, true, mArgs.mHeaders))
                .catch((...args) => {
                  AppUtils.debug('loadDatas error', args);
                });
            }
            // single request
            else {
              this.oPromise = this.loadData(...mArgs);
              if (mArgs[2] === true) {
                this.oPromise.catch((...args) => {
                  AppUtils.debug('loadData error', args);
                });
              }
            }
          } catch (e) {
            AppUtils.debug('loadData throws', e);
            throw e;
          }
  
          return this;
        },
  
        getPromise() {
          return this.oPromise;
        },
  
        getResult() {
          if (this.mResult) {
            return this.mResult;
          }
  
          // single request 이어야만 results 변수가 없음
          this.mResult = this.getData().d || {};
          return this.mResult;
        },
  
        getResults() {
          if (this.aResults) {
            return this.aResults; // 최초 호출이 아니면 저장된 결과가 있으므로 그 결과를 바로 반환
          }
  
          // multiple requests인 경우
          if (this.mLoadDataArguments.aRequests.length > 1) {
            this.aResults = [];
            Object.keys(this.mResultsMap)
              .sort()
              .forEach((i) => this.aResults.push(this.mResultsMap[i]));
          }
          // single request인 경우
          else {
            this.aResults = (this.getData().d || {}).results || [];
          }
          return this.aResults;
        },
      });
    }
  );