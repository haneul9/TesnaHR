sap.ui.define(
    [
        'sap/ui/unified/FileUploader',
    ],
    (
        FileUploader
    ) => {
        'use strict';
        return FileUploader.extend("sap.ui.tesna.control.ODataFileUploader", {
            metadata: {
                properties: {
                    modelName: "string",
                    slug: "string"
                }
            },
            upload: function () {
                var fCheckBrowser = function () {
                    try {
                        var ua = navigator.userAgent,
                            tem,
                            M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
                        if (/trident/i.test(M[1])) {
                            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
                            return "IE " + (tem[1] || "");
                        }
                        if (M[1] === "Chrome") {
                            tem = ua.match(/\bOPR\/(\d+)/);
                            if (tem != null) return "Opera " + tem[1];
                        }
                        M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, "-?"];
                        if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
                        return M.join(" ");
                    } catch (ex) {
                        return "";
                    }
                };
        
                var vBrowserInfo = fCheckBrowser();
                if (vBrowserInfo != "") {
                    var vTemp = vBrowserInfo.split(" ");
        
                    if (vTemp[0].toLowerCase() == "msie") {
                        if (parseInt(vTemp[1]) < 10) {
                            this.fireUploadComplete({ response: "Error: 파일 업로드 기능은 IE10 이상 또는 Chrome 등을 사용 바랍니다." });
                            return;
                        }
                    }
                }
            },
        
            renderer: {}
        })
    }
);