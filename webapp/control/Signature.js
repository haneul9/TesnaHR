sap.ui.define(
    [
      // prettier 방지용 주석
      'sap/ui/core/Control',
      'sap/m/FlexAlignItems',
      'sap/m/FlexJustifyContent',
      'sap/ui/tesna/common/AppUtils',
    ],
    function (
      // prettier 방지용 주석
      Control,
      FlexAlignItems,
      FlexJustifyContent,
      AppUtils
    ) {
      'use strict';
  
      return Control.extend('sap.ui.tesna.control.Signature', {
        metadata: {
          properties: {
            width: { type: 'String', group: 'Misc', defaultValue: '500' },
            height: { type: 'String', group: 'Misc', defaultValue: '200' },
          },
        },
  
        createSignaturePad: function () {
          const oCanvasContainer = new sap.m.VBox({ alignItems: FlexAlignItems.Center, justifyContent: FlexJustifyContent.Center });
          const oCanvas = new sap.ui.core.HTML({ content: `<canvas id='${this.getId()}' width='${this.getWidth()}' height='${this.getHeight()}' class='signature-pad'></canvas>`, preferDOM: true });
  
          oCanvasContainer.addItem(oCanvas);
  
          return oCanvasContainer;
        },
  
        renderer: function (oRm, oControl) {
          const layout = oControl.createSignaturePad();
  
          oRm.write('<div');
          oRm.writeControlData(layout);
          oRm.writeClasses();
          oRm.write('>');
          oRm.renderControl(layout);
          oRm.addClass('verticalAlignment');
          oRm.write('</div>');
        },
  
        onAfterRendering: function () {
          AppUtils.debug(`Signature initialize - ${this.getId()}`);
  
          this.oCanvas = document.getElementById(this.getId());
          this.oCanvas.width = this.getWidth();
          this.oCanvas.height = this.getHeight();
  
          this.oContext = this.oCanvas.getContext('2d');
          this.oContext.fillStyle = '#fff';
          this.oContext.strokeStyle = '#444';
          this.oContext.lineWidth = 1.5;
          this.oContext.lineCap = 'round';
  
          this.pos = { drawable: false, X: -1, Y: -1 };
          this.drawFinish = false;
  
          this.oCanvas.addEventListener('mousedown', this.eventListener.bind(this), false);
          this.oCanvas.addEventListener('mousemove', this.eventListener.bind(this), false);
          this.oCanvas.addEventListener('mouseup', this.eventListener.bind(this), false);
          this.oCanvas.addEventListener('mouseout', this.eventListener.bind(this), false);
          this.oCanvas.addEventListener('touchstart', this.eventListener.bind(this), false);
          this.oCanvas.addEventListener('touchmove', this.eventListener.bind(this), false);
          this.oCanvas.addEventListener('touchend', this.eventListener.bind(this), false);
        },
  
        eventListener: function (e) {
          switch (e.type) {
            case 'touchstart':
            case 'mousedown':
              this.initDraw(e);
              break;
            case 'touchmove':
            case 'mousemove':
              if (this.pos.drawable) this.draw(e);
              break;
            case 'touchend':
            case 'mouseout':
            case 'mouseup':
              this.finishDraw();
              break;
          }
        },
  
        clear: function () {
          this.oContext.clearRect(0, 0, this.oCanvas.width, this.oCanvas.height);
          this.drawFinish = false;
        },
  
        initDraw: function (e) {
          this.oContext.beginPath();
          this.pos.drawable = true;
  
          const coors = this.getPosition(e);
          this.pos.X = coors.X;
          this.pos.Y = coors.Y;
  
          this.oContext.moveTo(this.pos.X, this.pos.Y);
        },
  
        draw: function (e) {
          var mCoors = this.getPosition(e);
          this.oContext.lineTo(mCoors.X, mCoors.Y);
          this.pos.X = mCoors.X;
          this.pos.Y = mCoors.Y;
  
          this.oContext.stroke();
        },
  
        finishDraw: function () {
          if (this.pos.drawable) this.drawFinish = true;
  
          this.pos.drawable = false;
          this.pos.X = -1;
          this.pos.Y = -1;
        },
  
        getPosition: (e) => {
          let X, Y;
  
          if (e.changedTouches && e.changedTouches[0]) {
            const iOffsetY = this.oCanvas.offsetTop || 0;
            const iOffsetX = this.oCanvas.offsetLeft || 0;
  
            X = e.changedTouches[0].pageX - iOffsetX;
            Y = e.changedTouches[0].pageY - iOffsetY;
          } else if (e.layerX || 0 === e.layerX) {
            X = e.layerX;
            Y = e.layerY;
          } else if (e.offsetX || 0 === e.offsetX) {
            X = e.offsetX;
            Y = e.offsetY;
          }
  
          // IE 인 경우 y 좌표 설정
          const bIsIE = false || !!document.documentMode;
          if (bIsIE) Y = Y - 70;
  
          return { X, Y };
        },
  
        isDraw: function () {
          return this.drawFinish;
        },
  
        getDataUrl: function () {
          return this.oCanvas.toDataURL();
        },
  
        dataURItoBlob: function () {
          // const dataURI = this.oCanvas.toDataURL('image/png');
          // const blobBin = atob(dataURI.split(',')[1]); // base64 데이터 디코딩
          // let array = [];
  
          // for (let i = 0; i < blobBin.length; i++) {
          //   array.push(blobBin.charCodeAt(i));
          // }
  
          // return new Blob([new Uint8Array(array)], { type: 'image/png' });
  
          var dataURI = this.oCanvas.toDataURL('image/png');
          // convert base64/URLEncoded data component to raw binary data held in a string
          var byteString;
          if (dataURI.split(',')[0].indexOf('base64') >= 0) byteString = atob(dataURI.split(',')[1]);
          else byteString = unescape(dataURI.split(',')[1]);
  
          // write the bytes of the string to a typed array
          var ia = new Uint8Array(byteString.length);
          for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
  
          return new Blob([ia], { type: 'image/png' });
        },
      });
    }
  );