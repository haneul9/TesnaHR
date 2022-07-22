sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/base/security/encodeURLParameters',
    ],
    (
      // prettier 방지용 주석
      encodeURLParameters
    ) => {
      'use strict';
  
      class JSONModelRequest {
        constructor() {
          this.CACHING_PREVENT_PARAMETER_LENGTH = 16; // JSONModel이 실제 요청을 보낼때 붙이는 underscore parameter와 그 값의 길이 (ex: &_=1603696169123)
  
          this.sURL = null;
          this.mParametersTemp = {
            select: null,
            filter: null,
            expand: null,
            skip: null,
            top: null,
          };
          this.mParameters = {
            customPageSize: 1000,
          };
        }
  
        setParameter(sKey, vValue) {
          this.mParametersTemp[sKey] = vValue;
          return this;
        }
  
        getParameter(sKey) {
          const mTemp = this.mParametersTemp;
          return sKey ? mTemp[sKey] : mTemp;
        }
  
        setUrl(sURL) {
          this.sURL = sURL;
          return this;
        }
  
        setTop(vValue) {
          return this.setParameter('top', vValue);
        }
  
        setSkip(vValue) {
          return this.setParameter('skip', vValue);
        }
  
        setSelect(vValue) {
          var aSelect = this.getParameter('select');
          if (Array.isArray(aSelect)) {
            aSelect.push(vValue);
          } else {
            this.setParameter('select', [vValue]);
          }
          return this;
        }
  
        setFilter(vValue) {
          var aFilter = this.getParameter('filter');
          if (Array.isArray(aFilter)) {
            aFilter.push(vValue);
          } else {
            this.setParameter('filter', [vValue]);
          }
          return this;
        }
  
        setExpand(vValue) {
          var aExpand = this.getParameter('expand');
          if (Array.isArray(aExpand)) {
            aExpand.push(vValue);
          } else {
            this.setParameter('expand', [vValue]);
          }
          return this;
        }
  
        setOrderby(vVValue) {
          const aOrderby = this.getParameter('orderby');
          if (Array.isArray(aOrderby)) {
            aOrderby.push(vVValue);
          } else {
            this.setParameter('orderby', [vVValue]);
          }
          return this;
        }
  
        setCustomPageSize(iValue) {
          this.mParameters.customPageSize = iValue;
          return this;
        }
  
        setInlinecount(bValue) {
          if (typeof bValue === 'undefined' || bValue === true) {
            this.mParameters.$inlinecount = 'allpages';
          } else {
            if (typeof this.mParameters.$inlinecount !== 'undefined') {
              delete this.mParameters.$inlinecount;
            }
          }
          return this;
        }
  
        isInlinecount() {
          return this.mParameters.$inlinecount && this.mParameters.$inlinecount === 'allpages';
        }
  
        getParameterMap() {
          const mParam = { ...this.mParameters };
          const mTemp = this.mParametersTemp;
  
          if (mTemp.top) {
            mParam.$top = mTemp.top;
          }
          if (mTemp.skip) {
            mParam.$skip = mTemp.skip;
          }
          if (mTemp.select && mTemp.select.length) {
            mParam.$select = mTemp.select.join(',');
          }
          if (mTemp.filter && mTemp.filter.length) {
            mParam.$filter = mTemp.filter.join(' and ');
          }
          if (mTemp.expand && mTemp.expand.length) {
            mParam.$expand = mTemp.expand.join(',');
          }
          if (mTemp.orderby && mTemp.orderby.length) {
            mParam.$orderby = mTemp.orderby.join(',');
          }
  
          return mParam;
        }
  
        getURL() {
          return this.sURL;
        }
  
        getEncodedURL(mParameterMap) {
          const sQueryString = encodeURLParameters(mParameterMap || this.getmParameterMap());
  
          return `${location.origin}${this.sURL}?${sQueryString}`;
        }
  
        getDecodedURL(mParameterMap) {
          const sQueryString = Object.entries(mParameterMap || this.getmParameterMap())
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
  
          return `${location.origin}${this.sURL}?${sQueryString}`;
        }
  
        setEncodedQueryString(mParameterMap) {
          return encodeURLParameters(mParameterMap || this.getmParameterMap());
        }
  
        isMultipleRequest() {
          return this.getEncodedURL().length + this.CACHING_PREVENT_PARAMETER_LENGTH > 8192;
        }
  
        getEstimatedRequestCount() {
          return Math.ceil((this.getEncodedURL().length + this.CACHING_PREVENT_PARAMETER_LENGTH) / 8192);
        }
      }
  
      return JSONModelRequest;
    }
  );