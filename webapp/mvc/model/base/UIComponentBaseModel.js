sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/model/json/JSONModel',
      'sap/ui/tesna/common/exceptions/UI5Error',
    ],
    (
      // prettier 방지용 주석
      JSONModel,
      UI5Error
    ) => {
      'use strict';
  
      return JSONModel.extend('sap.ui.tesna.mvc.model.base.UIComponentBaseModel', {
        constructor: function (oUIComponent) {
          JSONModel.apply(this, this.getInitialData());
  
          this.setUIComponent(oUIComponent);
          this.setPromise(this.retrieve());
        },
  
        setUIComponent(oUIComponent) {
          this._oUIComponent = oUIComponent;
        },
  
        getUIComponent() {
          return this._oUIComponent;
        },
  
        setPromise(oPromise) {
          this._oPromise = oPromise;
        },
  
        getPromise() {
          return this._oPromise;
        },
  
        getInitialData() {
          return {};
        },
  
        /**
         * @abstract
         */
        retrieve() {
          throw new UI5Error({ message: this.getBundleText('MSG_00053', 'Model', 'retrieve') }); // {Model}에 {retrieve} function을 선언하세요.
        },
      });
    }
  );