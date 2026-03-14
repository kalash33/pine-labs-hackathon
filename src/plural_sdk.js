"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Plural = function Plural(options) {
  var _this = this;

  _classCallCheck(this, Plural);

  _defineProperty(this, "failed", function (response) {
    Plural.options.failedHandler(response);
  });

  _defineProperty(this, "success", function (response) {
    Plural.options.successHandler(response);
  });

  _defineProperty(this, "close", function () {
    var modal = document.getElementById("plural-modal");
    modal.remove();
  });

  _defineProperty(this, "open", function () {
    var modalHtml = `
    <style>@keyframes iframe-loader{0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    <div id="plural-modal" style="display: none; position: fixed; z-index: 99999999999999999; left: 0; top: 0; width: 100%; height: 100% !important; overflow-y: hidden; background-color: rgb(0, 0, 0); background-color: rgba(0, 0, 0, 0.4);" class="modal">
      <div class="modal-content" style="height: 100% !important;">
        <div id="iframe-loader" class="iframe-loader" style="height: 80px; width: 80px; position: absolute; left: 50%; z-index: -1; top: 50%; margin-left: -40px; margin-top: -40px; border: 0.2em solid white; border-bottom-color: #500082; border-radius: 50%; -webkit-animation: 1s iframe-loader linear infinite; animation: 1s iframe-loader linear infinite;"></div>
        <iframe style="overflow: hidden; width: 100%; height: 100%;" id="plural-iframe"></iframe>
      </div>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    var modal = document.getElementById("plural-modal");
    modal.style.display = "block";
    console.log(options)
    Plural.options = _this.options;
    var pluralIframe = document.getElementById("plural-iframe");
    pluralIframe.src = _this.options.redirectUrl;
    var optionsCopy = JSON.parse(JSON.stringify(_this.options));

    pluralIframe.onload = function () {
      document.getElementById("iframe-loader").style.display = "none";
      document.getElementById("plural-iframe").contentWindow.postMessage({
        options: optionsCopy
      }, "*");
    };
  });

  this.options = options;
};

window.addEventListener("message", function (response) {
  var plrlObj1 = new Plural();

  if (response.data.closeModal) {
    plrlObj1.close();
  }

  if (response.data.failed) {
    plrlObj1.failed(response.data.data);
  } else if (response.data.success) {
    plrlObj1.success(response.data.data);
  }
}, false);

