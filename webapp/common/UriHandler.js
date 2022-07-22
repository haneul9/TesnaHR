sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/tesna/common/Debuggable',
    ],
    (
      // prettier 방지용 주석
      Debuggable
    ) => {
      'use strict';
  
      return Debuggable.extend('sap.ui.tesna.common.UriHandler', {
        constructor: function () {
          this.sOrigin = location.origin;
          this.sPathname = location.pathname;
          this.sSearch = location.search;
          this.sHash = location.hash;
          this.mParameterMap = {};
  
          this.initParameterMap();
        },
  
        initParameterMap() {
          this.sSearch
            .substring(1)
            .split(/&/)
            .forEach((sParameter) => {
              const sMatches = sParameter.match(/([^=]+)=(.*)/);
              if (!sMatches) {
                return;
              }
              const sParameterName = decodeURIComponent(sMatches[1]);
              const sParameterValue = decodeURIComponent(sMatches[2].replace(/\+/g, ' '));
              this.addParameter(sParameterName, sParameterValue);
            });
        },
  
        addParameter(sParameterName, sParameterValue) {
          const aMultipleValue = this.mParameterMap[sParameterName];
          if (aMultipleValue) {
            if (Array.isArray(aMultipleValue)) {
              aMultipleValue.push(sParameterValue);
            } else {
              this.mParameterMap[sParameterName] = [aMultipleValue, sParameterValue];
            }
          } else {
            this.mParameterMap[sParameterName] = sParameterValue;
          }
          this.sSearch = '?' + $.param(this.mParameterMap);
          return this;
        },
  
        setParameter(sParameterName, sParameterValue) {
          this.mParameterMap[sParameterName] = sParameterValue;
          this.sSearch = '?' + $.param(this.mParameterMap);
          return this;
        },
  
        getParameterMap() {
          return $.extend(true, {}, this.mParameterMap);
        },
  
        getParameterKeys() {
          return Object.keys(this.mParameterMap);
        },
  
        getParameter(sParameterName) {
          return this.mParameterMap[sParameterName];
        },
  
        getParameters(sParameterName) {
          return this.mParameterMap[sParameterName];
        },
  
        hasParameter(sParameterName) {
          return !!this.mParameterMap[sParameterName];
        },
  
        getOrigin() {
          return this.sOrigin;
        },
  
        getPathname() {
          return this.sPathname;
        },
  
        getQueryString() {
          return this.sSearch;
        },
  
        getHash() {
          return this.sHash;
        },
  
        redirect() {
          location.href = this.toString();
        },
  
        toString() {
          const sHref = `${this.sOrigin}${this.sPathname}${this.sSearch}${this.sHash}`;
          this.debug(sHref);
          return sHref;
        },
      });
    }
  );