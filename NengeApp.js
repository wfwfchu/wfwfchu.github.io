/**
 * Copyright (c) 2021, Nenge.net All rights reserved.
 * 本軟件遵從GPL2.0協議 轉載保留本注釋,可自由分發，修改。
 * 編寫人 Nenge.net
 * NengeApp.js 加載執行文件
 * Core.zip 44670源文件打包壓縮（加速加載速度）
 * 編寫人 44670.org Git:https://github.com/44670/vba-next-wasm
 * a.out.js 
 * a.out.wasm
 * forked from libretro/vba-next (https://github.com/libretro/vba-next)
 * 其他文件
 * jquery-3.2.1.min.js
 * jszip.min.js 解壓壓縮包
 * localforage.js indexDBg工具
 * GBK.js 對JSZIP處理ZIP文件時，中文亂碼時轉碼。
 *
 */
 "use strict";

 /**音樂 */
 
 
 class MyAudio {
     AUDIO_BLOCK_SIZE = 1024;
     AUDIO_FIFO_MAXLEN = 4900;
     Ctx = new(window.AudioContext || window.webkitAudioContext)({
         latencyHint: 1e-4,
         sampleRate: 48e3
     });
     Psr = this.Ctx.createScriptProcessor(this.AUDIO_BLOCK_SIZE, 0, 2);
     audioLeft = new Int16Array(this.AUDIO_FIFO_MAXLEN);
     audioRight = new Int16Array(this.AUDIO_FIFO_MAXLEN);
     Num = 0;
     Start = 0;
     readyState = !1;
     constructor(t) {
         return this.Psr.addEventListener("audioprocess", (t => {
             this.state && this.processAudio(t)
         })), this.Psr.connect(this.Ctx.destination), document.addEventListener("visibilitychange", (t => {
             this.es && (t.target.hidden ? this.suspend() : this.resume())
         })), (t, s) => s ? this.Play(t, s) : this.open(t)
     }
     get state() {
         return "running" == this.Ctx.state
     }
     suspend() {
         return this.readyState && this.Ctx.suspend(), !1
     }
     resume() {
         return this.readyState && this.Ctx.resume(), !0
     }
     checkRun() {
         return 1 == this.readyState || (this.Ctx.resume(), this.state && (this.readyState = !0)), this.readyState
     }
     open(t) {
         return this.es = !t, this.checkRun(), t ? this.suspend() : this.resume()
     }
     Play(t, s) {
         var e = NengeApp.Module;
         if (this.state) {
             var i = new Int16Array(e.HEAPU8.buffer).subarray(t / 2, t / 2 + 2048),
                 r = (this.Start + this.Num) % this.AUDIO_FIFO_MAXLEN;
             if (!(this.Num + s >= this.AUDIO_FIFO_MAXLEN)) {
                 for (var a = 0; a < s; a++) this.audioLeft[r] = i[2 * a], this.audioRight[r] = i[2 * a + 1], r = (r += 1) % this.AUDIO_FIFO_MAXLEN;
                 this.Num += s
             }
         }
     }
     processAudio(t) {
         t.inputBuffer;
         var s = t.outputBuffer,
             e = s.getChannelData(0),
             i = s.getChannelData(1);
         if (!Module.isRunning) return e[a] = Array(this.AUDIO_BLOCK_SIZE), void(i[a] = Array(this.AUDIO_BLOCK_SIZE));
         var r = parseInt(this.AUDIO_BLOCK_SIZE);
         this.Num < r && (r = this.Num);
         for (var a = 0; a < r; a++) e[a] = this.audioLeft[this.Start] / 32768, i[a] = this.audioRight[this.Start] / 32768, this.Start = (this.Start += 1) % this.AUDIO_FIFO_MAXLEN, this.Num--
     }
 }
 window.requestAnimFrame = (function () {
     return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         function (callback) {
             window.setTimeout(callback, 6000 / 60);
         };
 })();
 
 class MyFile {
     FILES = [];
     DB = localforage;
     Zip = new JSZip();
     Jpre = 'core-';
     GPre = 'game-';
     SPre = 'save-';
     Input = document.createElement('input');
     Reader = new FileReader();
     constructor(Emulator) {
         var _ = this,
             Input = _.Input;
         Input.hidden = true;
         Input.type = 'file';
         document.body.appendChild(this.Input);
         Input.addEventListener('change',
             (e) => {
                 var file = e.target.files[0];
                 this.InputName = file.name;
                 this.Reader.readAsArrayBuffer(file);
             });
         this.Reader.addEventListener('load', (e) => {
             var buf = new Uint8Array(e.target.result);
             if (buf[0] == 80 && buf[1] == 75) {
                 this.ReadZip(buf);
             } else if (buf[0xB2] == 0x96) {
                 this.save(this.InputName, buf);
                 this.Emulator && this.Emulator.load(this.InputName, buf);
             } else {
                 alert("無效文件，支持GBA文件和含有GBA的ZIP壓縮文件");
             }
 
         });
         this.DB.ready().then(
             () => {
                 this.DB.keys().then((FILES) => {
                     this.FILES = FILES;
                     this.Emulator = Emulator;
                 });
             });
     }
     open() {
         this.Input.click();
     }
     async load(name, func) {
         var b = await this.DB.getItem(name);
         return b;
     }
     async save(name, data) {
         await this.DB.setItem(name, data);
         this.FILES.push(name);
     }
     async ReadZip(buf) {
         var _ = this;
         JSZip.loadAsync(buf, {
             'optimizedBinaryString': true,
             'decodeFileName': (bytes) => {
                 return _.GBKtoUTF8(bytes)
             }
         }).then(zip=>{
             let readgba = file=>{
                 zip.file(file).async("uint8array").then(
                     buf=>{
                         if (buf[0xB2] == 0x96) {
                             this.save(this.GPre + name, buf);
                         }
                     }
 
                 );
             }
             for (var i in zip.files){
                 readgba(zip.files[i]);
             }
 
         });
     }
     GBKtoUTF8(bytes) {
         let _=this,
             str = "",
             i = 0,
             GBKcodeToUTF8 = (code)=>{
                 var d = _.GBKTable.indexOf(code.toUpperCase());
                 if (d == -1) return false;
                 return String.fromCharCode(d);
             }
         while (i < bytes.length) {
             var d = parseInt(bytes[i]);
             if (d >= 0x20 && d <= 0x7F) {
                 str += String.fromCharCode(bytes[i++]);
             } else {
                 var a = bytes[i++].toString(16),
                     b = bytes[i++].toString(16),
                     _str = _.GBKcodeToUTF8(a + b);
                 if (_str !== false) {
                     str += _str;
                 } else {
                     str += decodeURI('%' + a + '%' + b + '%' + bytes[i++].toString(16));
                 }
             }
         }
         return str;
     }
 
 
 }
 var NengeApp = {
     ver:1.0,
     FILES: [],
     FPS: 1000 / 60,
     InIt: function (w) {
         if (typeof WebAssembly == "undefined") {
             return alert("你的瀏覽器不支持WASM。");
         }
         var _ = this,
             layerBody = $(_.LAYER).parent();
         w.onresize = null;
         w.onorientationchange = null;
         $(w).unbind();
 
         _.FILE = new MyFile(this);
         _.EventResize.forEach(
             val => {
                 w.addEventListener(val, function (e) {
                     _.ReSize(e);
                 }, {
                     passive: false
                 });
             }
         );
         _.EventAll.forEach(
             val => {
                 layerBody[0].addEventListener(
                     val,
                     function (e) {
                         var elm = e.target,
                             id = e.id;
                         _.Event(e);
                         //if(["GBA-layer","emulatorGBA"].indexOf(id)!=-1){
                         //	e.preventDefault();
                         //	e.stopPropagation();
                         //}
                     }, {
                         passive: false
                     })
             });
         $(".inputFile").on("change", function (e) {
             return _.UploadFile(e, this);
         });
         ["keydown", "keyup"].forEach(val => w.addEventListener(val, _.EventKEY, {
             passive: false
         }));
         w.addEventListener("gamepadconnected", function (e) {
             _.EventGamePad(e, true);
         }, false);
         w.addEventListener("gamepaddisconnected", function (e) {
             _.EventGamePad(e, false);
         }, false);
         _.DrawContext = $(_.CANVAS)[0].getContext('2d');
         _.ReSize();
         _._GetCore();
         document.addEventListener('touchstart', function () {}, false);
         return _;
     },
     /* 皮膚 */
     LAYER: "#GBA-layer ",
     CANVAS: "#GBA-canvas ",
     GBABTN: "#GBA-Btn ",
     GAMEMENU: "#GBA-GAMEMenu ",
     Speed: "#GBA-Speed ",
     GBAMENU: "#GBA-Menu ",
     GBAMSG: "#GBA-Msg ",
     LAYERBTN: ["a", "b", "select", "start", "right", "left", "up", "down", "r", "l", "menu", "turbo", "ul", "ur", "dl", "dr"],
     SkinData: {
         "BulbasaurGBA": {
             "css": "background:#77b7ac;",
             "portrait": {
                 "menu": {
                     "top": 246,
                     "left": 0,
                     "width": 50,
                     "height": 42
                 },
                 "r": {
                     "top": 0,
                     "left": 269,
                     "width": 106,
                     "height": 32
                 },
                 "a": {
                     "top": 75,
                     "left": 282,
                     "width": 77,
                     "height": 77
                 },
                 "b": {
                     "top": 139,
                     "left": 206,
                     "width": 77,
                     "height": 83
                 },
                 "l": {
                     "top": 0,
                     "left": 0,
                     "width": 114,
                     "height": 32
                 },
                 "up": {
                     "top": 69,
                     "left": 58,
                     "width": 56,
                     "height": 50
                 },
                 "left": {
                     "top": 119,
                     "left": 8,
                     "width": 50,
                     "height": 54
                 },
                 "right": {
                     "top": 119,
                     "left": 109,
                     "width": 54,
                     "height": 54
                 },
                 "down": {
                     "top": 172,
                     "left": 57,
                     "width": 57,
                     "height": 50
                 },
                 "select": {
                     "top": 246,
                     "left": 136,
                     "width": 40,
                     "height": 33
                 },
                 "start": {
                     "top": 246,
                     "left": 197,
                     "width": 46,
                     "height": 33
                 },
                 "turbo": {
                     "top": 32,
                     "left": 136,
                     "width": 107,
                     "height": 28
                 },
                 "size": {
                     "width": 375,
                     "height": 321,
                     "type": "half",
                     "img": "portrait.png"
                 }
             },
             /*
             "landscape":{"menu":{"top":337,"left":250,"width":56,"height":41},"r":{"top":0,"left":742,"width":104,"height":40},"a":{"top":250,"left":695,"width":76,"height":72},"b":{"top":304,"left":624,"width":76,"height":79},"l":{"top":0,"left":0,"width":109,"height":40},"up":{"top":242,"left":107,"width":48,"height":44},"left":{"top":284,"left":62,"width":45,"height":53},"right":{"top":285,"left":155,"width":44,"height":51},"down":{"top":330,"left":107,"width":48,"height":48},"select":{"top":334,"left":336,"width":72,"height":43},"start":{"top":334,"left":433,"width":84,"height":43},"turbo":{"top":304,"left":375,"width":92,"height":35},"size":{"width":846,"height":391,"type":"full","img":"landscape.png"},"ul":{"top":238,"left":58,"width":46,"height":44},"dl":{"top":336,"left":58,"width":46,"height":41},"ur":{"top":238,"left":158,"width":45,"height":44},"dr":{"top":336,"left":158,"width":45,"height":41},"sreen":{"left":248,"top":42,width:350,height:225},
                     }
             */
         }
     },
     /*事件處理*/
     ReSize: function () {
         var _ = this;
         if (_.ReSizeTime) clearTimeout(_.ReSizeTime);
         _.ReSizeTime = setTimeout(function () {
             _.ToReSize();
         }, 300);
     },
     canvasPer: 240 / 160,
     makeoldCSS: function (top, left, w, h, fontSize) {
         return 'top:' + top + 'px;left:' + left + 'px;width:' + w + 'px;height:' + h + 'px;' + 'font-size:' + fontSize + 'px;line-height:' + h + 'px;'
     },
     yuanban: function (width, height, type, name) {
         var _ = this,
             BaseSize = Math.min(Math.min(width, height) * 0.14, 50),
             _offTop = 0,
             canvasTop = 0,
             canvasHeight = height,
             canvasWidth = height * 240 / 160,
             canvasLeft = (width - canvasWidth) / 2;
         if (canvasWidth > width) {
             height = canvasHeight = 414;
             canvasWidth = height * 240 / 160,
                 canvasLeft = (width - canvasWidth) / 2;
         }
         if (type == "portrait") {
             canvasWidth = width;
             canvasHeight = width * 160 / 240;
             _offTop = canvasHeight + BaseSize;
             if ((_offTop + BaseSize * 7) > height) {
                 _offTop = 0
             }
 
         }
         var oldStyleData = {
             "l": _.makeoldCSS(_offTop + BaseSize * 1.5, 0, (BaseSize * 3), BaseSize, BaseSize * 0.7),
             "r": _.makeoldCSS(_offTop + BaseSize * 1.5, (width - (BaseSize * 3)), (BaseSize * 3), BaseSize, BaseSize * 0.7),
             "turbo": _.makeoldCSS(_offTop, 0, (BaseSize * 3), BaseSize, BaseSize * 0.7),
             "menu": _.makeoldCSS(_offTop, (width - (BaseSize * 3)), (BaseSize * 3), BaseSize, BaseSize * 0.7),
 
             "up": _.makeoldCSS(_offTop + BaseSize * 3, (BaseSize), BaseSize, BaseSize, BaseSize * 0.7),
             "ul": _.makeoldCSS(_offTop + BaseSize * 3, 0, BaseSize, BaseSize, BaseSize * 0.7),
             "ur": _.makeoldCSS(_offTop + BaseSize * 3, (BaseSize) * 2, BaseSize, BaseSize, BaseSize * 0.7),
 
             "down": _.makeoldCSS(_offTop + BaseSize * 5, (BaseSize), BaseSize, BaseSize, BaseSize * 0.7),
             "dl": _.makeoldCSS(_offTop + BaseSize * 5, 0, BaseSize, BaseSize, BaseSize * 0.7),
             "dr": _.makeoldCSS(_offTop + BaseSize * 5, (BaseSize * 2), BaseSize, BaseSize, BaseSize * 0.7),
             "left": _.makeoldCSS(_offTop + BaseSize * 4, 0, BaseSize, BaseSize, BaseSize * 0.7),
             "right": _.makeoldCSS(_offTop + BaseSize * 4, (BaseSize * 2), BaseSize, BaseSize, BaseSize * 0.7),
             "a": _.makeoldCSS(_offTop + BaseSize * 3.5, (width - BaseSize * 1.3), BaseSize * 1.3, BaseSize * 1.3, BaseSize * 0.7),
             "b": _.makeoldCSS(_offTop + BaseSize * 4, (width - (BaseSize * 1.3) * 2.4), (BaseSize * 1.3), (BaseSize * 1.3), BaseSize * 0.7),
 
             "select": _.makeoldCSS(height - BaseSize * 0.5, ((width - BaseSize * 3 * 2.2) / 2), (BaseSize * 3), (BaseSize * 0.5), BaseSize * 0.7),
             "start": _.makeoldCSS(height - BaseSize * 0.5, ((width - BaseSize * 3 * 2.2) / 2 + BaseSize * 3) * 1.2, (BaseSize * 3), (BaseSize * 0.5), BaseSize * 0.7),
         };
         var css = "",
             SkinClass = '.' + name + ' ';
         for (var i in oldStyleData) {
             css += SkinClass + '.vk[data-k=' + i + ']{position: absolute;background:rgba(0,0,0,0.1);color:rgba(255,255,255,0.6);z-index:6;text-align:center;' + oldStyleData[i] + '}';
 
         }
         css += SkinClass + _.GBABTN + '{position: absolute;width:' + canvasWidth + 'px;height:' + canvasHeight + 'px;top:' + canvasTop + 'px;left:' + canvasLeft + 'px;margin:0px auto auto auto;text-align:center;z-index:5;display:inline-block;opacity:0.3;}' +
             SkinClass + _.GBABTN + 'button{background:rgba(0,0,0,0.1);}'+
             SkinClass + _.CANVAS + ',' +
             SkinClass + _.GBAMSG + ',' +
             SkinClass + _.GBANAV + '{width:' + canvasWidth + 'px;height:' + canvasHeight + 'px;top:' + canvasTop + 'px;left:' + canvasLeft + 'px;position: absolute;z-index:2;}' +
             SkinClass + _.GBAMENU + ',' +
             SkinClass + _.GAMEPAD + ',' +
             SkinClass + _.GAMEMENU + ',.testDiv{position: absolute;background: rgb(0,0,0,0.6);z-index: 10;}' +
             SkinClass + '.vk.vk-touched{color:rgba(0,0,0,0.6)}' +
             SkinClass + '.vk-round{border-radius: 50%;line-height:180% !important;}' +
             SkinClass + '.vk:hover{color:rgba(0,0,0,0.6) !important;background: rgb(255,255,255,0.3)!important;}' +
             SkinClass + '#game-zip,' +
             SkinClass + '#game-files{ height:' + (height / 2 - 60) + 'px;}';
         return css;
 
     },
     ToReSize: function () {
         var _ = this,
             _W = window.innerWidth,
             _H = window.innerHeight,
             layerBody = $(_.LAYER).parent(),
             w = layerBody.width(),
             h = layerBody.height(),
             MaxW = w > _W ? _W : w,
             MaxH = h > _H || h <= 0 ? _H : h,
             _Type = MaxW > MaxH || MaxW > 700 ? "landscape" : "portrait",
             CSSText = "";
         if (_[_[_Type + _W]]) return;
         console.log("載入畫面適應");
         if (_Type == "portrait") {
             CSSText += "@media only screen and (max-width: " + _W + "px){\n\r";
         } else {
             if (typeof window.orientation != "undefined") {
                 MaxW = _W;
                 MaxH = _H;
             }
             CSSText += "@media only screen and (min-width: " + _W + "px){\n\r";
         }
         MaxW = MaxW > 900 ? 900 : MaxW;
         for (var skinName in _["SkinData"]) {
             layerBody[0].classList.add(skinName);
             var SkinData = _["SkinData"][skinName][_Type];
             if (!SkinData) {
                 CSSText += _.yuanban(MaxW, MaxH, _Type, skinName);
                 continue;
             }
             var SkinClass = "." + skinName + " ",
                 size = SkinData["size"],
                 sreen = SkinData["sreen"],
                 Height = MaxW / (size["width"] / size["height"]),
                 Width = MaxW,
                 wper = Width / size["width"],
                 hper = Height / size["height"];
             if (Height >= MaxH) {
                 Height = MaxH;
                 Width = Height * (size["width"] / size["height"]);
                 wper = Width / size["width"],
                     hper = Height / size["height"];
             }
 
             for (var i = 0; i < _.LAYERBTN.length; i++) {
                 //console.log(Key);
                 var Key = _.LAYERBTN[i],
                     btnData = SkinData[Key];
                 if (!btnData) continue;
                 CSSText += SkinClass + " .vk[data-k=" + Key + "]{" +
                     "top:" + (btnData["top"] * hper) + "px;" +
                     "left:" + (btnData["left"] * wper) + "px;" +
                     "width:" + (btnData["width"] * wper) + "px;" +
                     "height:" + (btnData["height"] * hper) + "px;" +
                     "}";
             };
 
             var Top = 0,
                 _Top = 0,
                 _Left = 0,
                 canvasWidth = !sreen || sreen["width"] == "100%" ? Width : sreen["width"] * wper,
                 canvasHeight = !sreen || sreen["height"] == "100%" ? Width / _.canvasPer : sreen["height"] * hper,
                 canvasTop = !sreen || sreen["top"] == 0 ? 0 : sreen["top"] * hper,
                 canvasLeft = !sreen || sreen["left"] == 0 ? 0 : sreen["left"] * wper;
             if (_Type == "portrait") {
                 //_Top = MaxH - canvasHeight - Height;
                 //Top = _Top/2 + canvasHeight;
                 //canvasTop = _Top/2;
                 Top = canvasHeight + canvasTop;
                 CSSText += SkinClass + _.GBABTN + '{bottom:auto;width:100%;top:' + (Top + Height) + 'px;}';
             } else {
                 canvasHeight = !sreen || sreen["height"] == "100%" ? Height : canvasHeight;
                 canvasWidth = !sreen || sreen["width"] == "100%" ? Height * _.canvasPer : canvasWidth;
                 //canvasWidth = sreen!="100%"?sreen["width"]*wper:Height*(240/160);
                 //canvasTop = canvasTop == 0;;
                 //canvasLeft = sreen&&sreen["left"]?sreen["left"]*wper:"auto;margin:auto;k:0";
                 if (_W > Width) {
                     _Left = (_W - Width) / 2;
                     //居中修正
                     //canvasLeft += (_W - Width)/2;
                 }
                 if (canvasLeft == 0) {
                     canvasLeft = (Width - canvasWidth) / 2;
                 }
                 canvasLeft += _Left;
                 CSSText += SkinClass + _.GBABTN + '{flex-direction:row-reverse;top:3rem;bottom:auto;left:auto;right:' + _Left + 'px;width:120px;}' +
                     SkinClass + _.GBABTN + ' button{margin:' + (_Type == "portrait" ? "" : "10px 2px") + ';display:inline-block}';
             }
             CSSText += SkinClass + _.LAYER + '{width:' + Width + 'px;height:' + Height + 'px;position: absolute;z-index:1;top:' + Top + 'px;left:0;right:0;overflow: hidden;margin: auto;}' +
                 SkinClass + _.GBAMENU + ',' +
                 SkinClass + _.GAMEPAD + ',' +
                 SkinClass + _.GAMEMENU + ',.testDiv{position: absolute;background: rgb(0,0,0,0.6);z-index: 10;width:' + MaxW + 'px;height:' + (_Type == "portrait" ? MaxH : Height) + 'px;left:' + _Left + 'px;font-size:0.5rem;}' +
                 SkinClass + _.Speed + ',.testDiv{position: absolute;background: rgb(0,0,0,0.6);z-index: 10;width:' + MaxW + 'px;height:' + (_Type == "portrait" ? MaxH : Height) + 'px;left:' + _Left + 'px;font-size:0.5rem;}' +
                 SkinClass + _.GBAMENU + '#game-files,' +
                 SkinClass + _.GBAMENU + '#game-zip{padding:5px;overflow:scroll;height:' + (h / 2.5) + 'px;width:100%;}' +
                 SkinClass + _.GBAMENU + '#game-files p{margin:3px 0px;padding:2px;text-align:left;}' +
                 SkinClass + _.CANVAS + ',' +
                 SkinClass + _.GBAMSG + ',' +
                 SkinClass + _.GBANAV + '{width:' + canvasWidth + 'px;height:' + canvasHeight + 'px;top:' + canvasTop + 'px;left:' + canvasLeft + 'px;position: absolute;z-index:2;}'
                 //+  SkinClass+_.GBANAV+'select{display:block;width:100%;}'
                 +
                 SkinClass + _.GBAMSG + ',' +
                 SkinClass + _.GBANAV + '{z-index:9;background:rgba(255, 255, 255, 0.5);}' +
                 SkinClass + _.LAYER + ' .vk{background:rgba(255, 255, 255, 0.25);position: absolute;z-index:2;font-size:0;overflow: hidden;}' +
                 SkinClass + _.LAYER + ' .vk-round{border-radius: 50%;}' +
                 SkinClass + _.GBABTN + '{position: absolute;z-index:2;display: flex; flex-wrap: wrap;justify-content: space-around;overflow:hidden;}' +
                 SkinClass + '.vk[data-k=turbo]:after{content:\"加速\";position: absolute;left:0px;top:0px;font-size:1rem;width:100%;height:100%;color:#000;line-height:150%;}' +
                 SkinClass + '.vk[data-k=menu]{font-size:60% !important;line-height:150% !important}';
         }
         let c = document.querySelector('#skincss');
         if(!c){
             c = document.createElement('style');
             c.id = '#skincss';
             document.head.appendChild(c);
         }
         c.innerHTML = CSSText;
         $(_["LAYER"]).show();
         _[_Type + _W] = Width;
     },
     EventResize: ["resize", "orientationchange"],
     EventClick: ["mousedown", "touchstart"],
     EventOut: ["mousedown", "touchstart"],
     EventMouse: ["mousedown", "mouseup", "mousemove", "mouseover"],
     EventMove: ["touchmove"],
     EventAll: ['mouseup', 'mouseover', 'mousemove', 'mousedown', 'tap', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'touchenter', 'touchleave'],
     Event: function (e) {
         var _ = this,
             Module = _.Module,
             type = e.type,
             elm = $(e.target),
             action = elm.data("action"),
             k = elm.data("k");
         if (_.EventClick.indexOf(type) != -1) {
             if (k == "menu" && Module.isRunning) {
                 Module._resetCpu();
             }; /*_.showGameMenu()*/ ;
             if (typeof action != "undefined") return _.ActionEvent(action, elm, type, e);
         }
         if (Module.isRunning) {
             _.SetKeyState(e, k, type);
         }
 
     },
     //keyList:["a", "b", "select", "start", "right", "left", 'up', 'down', 'r', 'l'],
     _Keyboard: [
         "Numpad2",
         "Numpad1",
         "Numpad0",
         "NumpadDecimal",
         "ArrowRight",
         "ArrowLeft",
         "ArrowUp",
         "ArrowDown",
         "Numpad6",
         "Numpad3",
         "KeyU",
         "KeyY",
         "KeyH",
         "KeyJ",
         "KeyD",
         "KeyA",
         "KeyW",
         "KeyS",
         "KeyT",
         "KeyI",
     ],
     EventKEY: function (e) {
         var _ = NengeApp,
             Module = _.Module,
             key = _._Keyboard.indexOf(e.code) % 10;
         if (Module.isRunning) {
             e.preventDefault();
             e.stopPropagation();
             if (e.type == "keyup") {
                 if (key >= 0) _.keyState[key] = 0;
             } else if (e.type == "keydown") {
                 if (e.code == "NumpadAdd") return _.OpenTurboMode($('div[data-k="turbo"]'));
                 if (key >= 0) _.keyState[key] = 1;
                 //console.log(e.code);
             }
         }
     },
     /*
     EventGamePadMap:{
         0:"b",//X
         1:"a",//O
         2:"",//□
         3:"",//▲
         4:"l",//L1
         5:"r",//R1
         6:"",//L2
         7:"",//R2
         8:"",//截屏 share
         9:"start",//開始 option
         10:"",//L3
         11:"",//R3
         12:"up",//UP
         13:"down",//down
         14:"left",//left
         15:"right",//left
         16:"select",//PS 
     },
     */
     //手柄事件
     GAMEPAD: "#GBA-GAMEPAD ",
     EventGamePad: function (e, connecting) {
         var _ = this,
             Module = _.Module;
         if (connecting) {
             //手柄連接
             if (!_.EventGamePadMap) _.GetGamePadMap();
             _.GamePadConnect = true;
             _.showMsg("GamePad connect...手柄已連接。。。");
         } else {
             _.GamePadConnect = false;
             _.SetKeyStateByKey();
             //防止手柄事件殘留
             _.showMsg("GamePad not connect...手柄已斷開。。。");
 
         }
     },
     SetGamePadMap: function () {
         var _ = this,
             Module = _.Module;
         _.EventGamePadMap = {};
         $(_.GAMEPAD + 'input').each(function () {
             var elm = $(this),
                 index = elm.data("index"),
                 val = elm.val(),
                 type = index ? index.split("-") : null,
                 Map;
             if (type[0] == "key") {
                 _.EventGamePadMap[type[1]] = val;
             }
 
         });
         localStorage.setItem("GamePadMap2", JSON.stringify(_.EventGamePadMap));
 
     },
     SetGameSpeed: function () {
    var _ = this,
        Module = _.Module;

    // Retrieve the speedvalue input element
    var speedInput = $("#GBA-Speed input[data-index='speedvalue']");
    
    // Parse the speed value
    var speed = parseFloat(speedInput.val());

    // Check if the parsed value is a valid number and greater than zero
    if (isNaN(speed) || speed <= 0) {
        speed = 1;
        speedInput.val("1");
    }

    // Store the speed in a property of the Module or perform any other necessary actions
    // Replace 'Module.gameSpeed' with the actual property where you want to store the speed
    Module.gameSpeed = speed;

    // Optionally, save the speed to local storage
    localStorage.setItem("GameSpeed", speed);
},
     GetGamePadMap: function () {
         var _ = this,
             Module = _.Module,
             GamePadMap = localStorage.getItem("GamePadMap2"),
             Map = GamePadMap ? JSON.parse(GamePadMap) : null;
         if (Map && typeof Map == "object") {
             _.EventGamePadMap = Map;
             $(_.GAMEPAD + 'input').each(function () {
                 var elm = $(this),
                     index = elm.data("index"),
                     val = elm.val(),
                     type = index ? index.split("-") : null,
                     Map;
                 if (type[0] == "key") {
                     elm.val(_.EventGamePadMap[type[1]]);
                 }
             });
         } else {
             _.SetGamePadMap();
         }
     },
     EventGamePadRunKey: {},
     EventGamePadAction: function () {
         var _ = this,
             Module = _.Module,
             gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []),
             key = [],
             html = "";
         for (var i = 0; i < gamepads.length; i++) {
             if (gamepads[i]) {
                 var _gamepads = gamepads[i],
                     oldKey = _.EventGamePadRunKey[_gamepads["id"]],
                     keys = [];;
                 for (var j in _gamepads) {
 
                     html += j + ":" + _gamepads[j] + '<br>';
                 }
                 if (_gamepads["connected"]) {
                     //手柄連接中
                     if (Module.isRunning) {
                         for (var k in _gamepads["buttons"]) {
                             if (_gamepads["buttons"][k]["pressed"] == true) {
                                 var _key = _.EventGamePadMap.indexOf(k);
                                 if (_key == "turbo") {
                                     _.OpenTurboMode();
                                     continue;
                                 }
                                 keys.push(_key);
                             }
                         }
                         /*
                         if(_gamepads["axes"]){
                             //return alert(typeof _gamepads["axes"]);
                             var axes = _gamepads["axes"],m=[1,-1];
                             if(m.indexOf(axes[0]) !=-1){
                                 keys.push(_.EventGamePadMap["left"][axes[0]==1?1:0]);
                             }else if(m.indexOf(axes[1]) !=-1){
                                 keys.push(_.EventGamePadMap["left"][axes[1]==1?3:2]);
                             }else if(m.indexOf(axes[2]) !=-1){
                                 keys.push(_.EventGamePadMap["right"][axes[2]==1?1:0]);
                             }else if(m.indexOf(axes[3]) !=-1){
                                 keys.push(_.EventGamePadMap["right"][axes[3]==1?3:2]);
                             }
                         }
                         */
                     } else {
                         /*
                         //_.showGamePadMenu();
                         $(_.GAMEPAD + 'input').removeClass("active");
                         for(var k in _gamepads["buttons"]){
                             if(_gamepads["buttons"][k]["pressed"] == true){
                                 $(_.GAMEPAD + 'input[data-index=key-'+k+']').addClass("active");
                             }
                         }
                         if(_gamepads["axes"]){
                             //return alert(typeof _gamepads["axes"]);
                             var axes = _gamepads["axes"],m=[1,-1];
                             if(m.indexOf(axes[0]) !=-1){
                                 $(_.GAMEPAD + 'input[data-index=axes-left]').addClass("active");
                                 $("#axes-left").html(axes[0]==1?"右平移right":"左平移left");
                             }else if(m.indexOf(axes[1]) !=-1){
                                 $(_.GAMEPAD + 'input[data-index=axes-left]').addClass("active");
                                 $("#axes-left").html(axes[1]==1?"下平移down":"上平移up");
                             }else if(m.indexOf(axes[2]) !=-1){
                                 $(_.GAMEPAD + 'input[data-index=axes-right]').addClass("active");
                                 $("#axes-right").html(axes[2]==1?"右平移right":"左平移left");
                             }else if(m.indexOf(axes[3]) !=-1){
                                 $(_.GAMEPAD + 'input[data-index=axes-right]').addClass("active");
                                 $("#axes-right").html(axes[3]==1?"下平移down":"上平移up");
                             }
                         }
                         */
                     }
                 }
                 if (keys.length > 0) {
                     _.EventGamePadRunKey[_gamepads["id"]] = keys;
                     _.SetKeyStateByKey(keys);
                 } else if (oldKey && oldKey.length > 0) {
                     _.EventGamePadRunKey[_gamepads["id"]] = [];
                     _.SetKeyStateByKey();
                 }
             }
             //if(!_.testDiv) _.testDiv = $('<div class="testDiv GBAMENU"></div>').appendTo('body');
             //_.testDiv.html(html);
 
         }
     },
     ActionEvent: function (action, elm, type, e) {
         var _ = this,
             Module = _.Module;
         switch (action) {
             case "upSrm":
                 $("#upSrm").click();
                 break;
             case "downSrm":
                 _.DownSaveFile();
                 break;
             case "upGba":
                 $("#upGba").click();
                 break;
             case "otherPage":
                 if (typeof Module.isRunning != "undefined") Module.isRunning = false;
                 location.href = "other.html";
                 break;
             case "rePage":
                 if (typeof Module.isRunning != "undefined") Module.isRunning = false;
                 location.href = "index.html";
                 break;
             case "CloseMenu":
                 _._HideMenu(elm.data("target"));
                 break;
             case "SetGamePad":
                 _.SetGamePadMap();
                 break;
             case "GamePad":
                 _.showGamePadMenu();
                 break;
                case "Speed":
                 _.showGameSpeedMenu();
                 break;
             case "OpenMenu":
                 _.showGBAMenu();
                 break;
             case "runGame":
                 var file = elm.parent().data('file');
                 if (file.indexOf(_.GamePre) != -1) {
                     _.RunGameByName(file);
                 } else if (file.indexOf(_.SavePre) != -1) {
                     _.LoadSaveByName(file);
                 }
                 break;
             case "del":
                 _._RemoveFile(elm);
                 break;
             case "ReadCode":
                 _.ReadCode();
                 break;
             case "WriteCode":
                 _.WriteCode();
                 break;
             case 'downZip':
                 _.downZip(elm);
                 break;
             case 'openMusic':
                 var t = elm.text();
                 if (!_.audio) _.audio = new MyAudio(Module);
                 var bool = !_.openMusicText.indexOf(t);
                 var result = _.audio(bool);
                 elm.html(result ? _.openMusicText[0] : _.openMusicText[1]);
                 break;
         }
     },
     openMusicText: ['關閉音樂', '啟用音樂'],
     ReadCodeID: "#ReadCode ",
     WriteCodeID: "#WriteCode ",
     ReadCode: function () {
         var _ = this,
             Module = _.Module,
             elm = $(_.ReadCodeID),
             val = parseInt(elm.val());
         if (!val) {
             return
         }
         $(_.WriteCodeID).val('0x' + (Module._readU32(val) >>> 0).toString(16).toUpperCase()); //;
     },
     WriteCode: function chtWriteBtn() {
         var _ = this,
             Module = _.Module,
             elm = $(_.WriteCodeID),
             val = elm.val(),
             mval = $(_.ReadCodeID).val();
         if (!mval || !parseInt(mval)) {
             return
         }
         Module._writeU32(parseInt(mval), parseInt(val));
         $('<p><input type="text" value="' + mval + ':' + val + '"></input><button data-action="delcheat">刪除</button></p>').appendTo('#cheat');
     },
     _RemoveFile: function (elm) {
         var _ = this,
             Module = _.Module,
             file = elm.parent().data('file');
         _.FILE.DB.removeItem(file).then(function (data) {
             // 當值被移除後，此處代碼運行
             _._remove.apply(_.FILES, [file]);
             _.showGBAMenu();
         })
     },
     _remove: function (val) {
         var index = this.indexOf(val);
         if (index > -1) {
             this.splice(index, 1);
         }
     },
     _HideMenu: function (target) {
         var _ = this,
             Module = _.Module,
             HideId = _.GBAMENU;
         if (typeof Module.isRunning != "undefined") {
             Module.isRunning = true;
             $(_.GBABTN).show();
         }
         if (typeof Module.isRunning == "undefined") {
             $(_.GBABTN).show();
         }
         if (target) {
             HideId = target;
         }
         $(HideId).hide();
     },
     DownSaveFile: function () {
         var _ = this,
             Module = _.Module;
         if (typeof Module.isRunning == "undefined") return;
         var blob = new Blob([Module.wasmSaveBuf], {
             type: "application/binary"
         });
         var link = document.createElement("a");
         link.href = window.URL.createObjectURL(blob);
         link.download = _.getFileName(Module.romFileName) + '.srm';
         link.click();
     },
     showGameMenu: function () {
         var _ = this,
             Module = _.Module,
             elm = $("#game-code"),
             code = localStorage.getItem("code-" + Module.romFileName),
             HTML = "";
         if (typeof Module.isRunning != "undefined") Module.isRunning = false;
         if (code) {
 
         }
         $(_.GBABTN).hide();
         $(_.GAMEMENU).show();
 
     },
     showGamePadMenu: function () {
         var _ = this,
             Module = _.Module;
         if (typeof Module.isRunning != "undefined") Module.isRunning = false;
         $(_.GAMEPAD).show();
 
     },
       showGameSpeedMenu: function () {
         var _ = this,
             Module = _.Module;
         if (typeof Module.isRunning != "undefined") Module.isRunning = false;
         $(_.Speed).show();
 
     },
     QcloudUrl: "", //"https://gbazip-1251354987.cos.ap-guangzhou.myqcloud.com/",//騰訊雲對象儲存
     SeverZip: [
         '精靈寶可夢綠寶石2012中文典藏版[口袋群星SP漢化組].zip',
         //"口袋妖怪特別篇赤15.4.zip "
     ],
     downZip: function (elm) {
         var _ = this,
             Module = _.Module;
         _._HideMenu();
         $(_.GBABTN).hide();
         $(_.GBANAV).html("<b style='color:red;'>文件正在從【能哥網】下載中，請勿退出，切換！</b>").show();
         return fetch((_.QcloudUrl ? _.QcloudUrl : "") + $(elm).text()).then(data => data.arrayBuffer()).then(buf => _.ReadZip(new Uint8Array(buf)));
     },
     showGBAMenu: function () {
         var _ = this,
             Module = _.Module,
             HTML = "",
             files = Array.from(new Set(_.FILES));
         if (typeof Module.isRunning != "undefined") Module.isRunning = false;
         HTML += '<h3>儲存記錄</h3>';
         for (var i = 0; i < files.length; i++) {
             var file = files[i],
                 type = file.split('-')[0],
                 fileName = files[i].replace(type + '-', '');
                 /**"core", */
                 HTML += '<p data-pre="' + type + '" data-file="' + files[i] + '">';
                 HTML += '<button data-action="del">刪</button>';
                 HTML +=  fileName;
                 switch(type){
                     case 'game':
                     case 'save':
                     HTML += '<button data-action="runGame">'+(type == 'game' ? '運行遊戲RunGame' : '加載存檔AddSrm')+'</button>';
                     break;
                     case 'COREDATA':
                     HTML += '→<b>運行數據包</b>';
                     break;
                 }
                 HTML += '</p><hr><hr>';
             //| <button data-action="downFile">下載</button>
         }
         if (_.SeverZip) {
             var ZIPHTML = "<h3>可下載遊戲,先執行一次綠寶石會啟用RTC時鐘再運行其他遊戲</h3>";
             for (var i = 0; i < _.SeverZip.length; i++) {
                 ZIPHTML += '<button data-action="downZip">' + _.SeverZip[i] + '</button> ';
             }
             _.SeverZip = null;
             $("#downZip").html(ZIPHTML);
 
         }
         $("#game-files").html(HTML);
         $(_.GBABTN).hide();
         $(_.GBAMENU).show();
 
         //if(typeof Module.isRunning !="undefined") Module.isRunning = false;
     },
     showMsg: function (msg) {
         var _ = this;
         if (_.GBAMSGTime) clearTimeout(_.GBAMSGTime);
         $(_.GBAMSG).html(msg).show();
         _.GBAMSGTime = setTimeout(function () {
             $(_.GBAMSG).hide();
         }, 3000);
     },
     showTips: function (msg) {
         var _ = this;
         if (_.GBAMSGTime) clearTimeout(_.GBAMSGTime);
         $(_.GBAMSG).html(msg).show();
         _.GBAMSGTime = setTimeout(function () {
             $(_.GBAMSG).hide();
         }, 3000);
     },
     GamePre: "game-",
     SavePre: "save-",
     getFileName: function (romFileName, type) {
         if (type) return romFileName.substr(romFileName.lastIndexOf("."), romFileName.length - romFileName.lastIndexOf(".")).toLowerCase();
         return romFileName.substr(0, romFileName.lastIndexOf("."));
     },
     _GBKtoUTF8: function (code) {
         var _ = this,
             d = _.GBKTable.indexOf(code.toUpperCase());
         if (d == -1) return false;
         return String.fromCharCode(d);
     },
     GBKtoUTF8: function (bytes) {
         var _ = NengeApp,
             str = "",
             i = 0;
         while (i < bytes.length) {
             var d = parseInt(bytes[i]);
             if (d >= 0x20 && d <= 0x7F) {
                 str += String.fromCharCode(bytes[i++]);
             } else {
                 var a = bytes[i++].toString(16),
                     b = bytes[i++].toString(16),
                     _str = _._GBKtoUTF8(a + b);
                 if (_str !== false) {
                     str += _str;
                 } else {
                     //console.log(_str);
                     str += decodeURI('%' + a + '%' + b + '%' + bytes[i++].toString(16));
                 }
             }
         }
         return str;
     },
     ReadZip: function (arrayBuffer) {
         var _ = this,
             Module = _.Module;
         var zip = new JSZip();
         zip.loadAsync(arrayBuffer, {
             optimizedBinaryString: true,
             decodeFileName: _.GBKtoUTF8
         }).then(zip => _.ReadGBA(zip));
     },
     LastGame: "Last-Game",
     LoadSaveByName: function (GameName) {
         var _ = this,
             Module = _.Module;
         _.FILE.DB.getItem(GameName).then(buf => _.loadSaveGame(new Uint8Array(buf)));
     },
     RunGameByName: function (GameName) {
         var _ = this,
             Module = _.Module;
         var GameName = GameName.replace(_.GamePre, '');
         _.FILE.DB.getItem(_.GamePre + GameName).then(buf => _.RunGameData(buf, GameName));
     },
     RunGameData: function (data, GameName) {
         var _ = this,
             Module = _.Module;
         $(_.GAMEMENU).hide();
         $(_.GBAMENU).hide();
         $(_.GBANAV).hide();
         $(_.GBABTN).show();
         _.LoadRom(data, GameName);
         if (_.FILES.indexOf(_.GamePre + GameName) != -1) {
             console.log("文件：" + GameName + "已經存在。無需保存。");
         } else {
             _.SaveGameByName(data, GameName);
         }
         localStorage.setItem(_.LastGame, GameName);
     },
     SaveGameByName: function (buf, Name) {
         var _ = this,
             Module = _.Module;
         _.FILE.DB.setItem(_.GamePre + Name, buf).then(function (cb) {
             _.FILES.push(_.GamePre + Name);
             console.log("存儲成功:" + Name);
         });
     },
     GBANAV: "#GBA-Nav ",
     ReadGBA: function (zip) {
         var _ = this,
             Module = _.Module,
             GBANAV = $(_.GBANAV);
         GBANAV.html('<p class="zip-game-name"><button data-action="CloseMenu" data-target="' + _.GBANAV + '">關閉</button></p>');
         console.log(zip["files"]);
         for (var i in zip["files"]) {
             var zipfile = zip["files"][i];
             if (zipfile.name.toLocaleUpperCase().indexOf('.GBA') === -1) continue;
             if (_.FILES.indexOf(_.GamePre + zipfile.name) != -1) {
                 _.ReadGBAtoShowHtml(zipfile.name);
                 console.log('文件已經存在：' + zipfile.name);
             } else {
                 _.ReadGBAtoDATA(zipfile);
             }
         }
     },
     ReadGBAtoDATA(zipfile) {
         var _ = this,
             Module = _.Module,
             Name = zipfile.name;
         zipfile.async("uint8array").then(buf => {
             _.SaveGameByName(new Uint8Array(buf), Name);
             _.ReadGBAtoShowHtml(Name);
         });
     },
     ReadGBAtoShowHtml: function (Name) {
         var _ = this,
             GBANAV = $(_.GBANAV);
         $(_.GBABTN).hide();
         var html = GBANAV.show().html();
         GBANAV.html(html + '<p class="zip-game-name" data-file="' + _.GamePre + Name + '"><button data-action="runGame">點擊運行：' + Name + '</button></p>');
 
     },
     UploadFile: function (e, file) {
         var _ = this,
             elm = $(file),
             v = elm.val(),
             id = elm.attr("id"),
             Module = _.Module,
             file = file.files[0];
         $(_.GBAMENU).hide();
         if (!_.isWasmReady) {
             elm.val("");
             _.showMsg('WASM沒準備好!');
             return
         }
         if (file) {
             var fileReader = new FileReader();
             fileReader.onload = function (event) {
                 var buf = event.target.result
                 if (id == "upGba") {
                     Module.romFileName = file.name;
                     var Mime = _.getFileName(Module.romFileName, true);
                     var u8 = new Uint8Array(buf);
                     if (u8[0] == 80 && u8[1] == 75) {
                         _.ReadZip(u8);
                     } else if (u8[0xB2] == 0x96) {
                         console.log("這是GBA文件");
                         _.RunGameData(u8, file.name);
                     } else {
                         alert("無效文件，支持GBA文件和ZIP類型壓縮文件");
                         return;
                     }
                 } else if (id == "upSrm") {
                     return _.loadSaveGame(new Uint8Array(buf));
                 }
             };
             fileReader.readAsArrayBuffer(file);
             elm.val("");
         }
     },
     LoadRom: function (u8, Name) {
         var _ = this,
             Module = _.Module;
         Module.isRunning = false;
         Module.gameID = "";
         //console.log(u8[0].toString(16),u8[1]);
         for (var i = 0xAC; i < 0xB2; i++) {
             Module.gameID += String.fromCharCode(u8[i])
         }
         if ((u8[0xAC] == 0) || (Module.gameID.substr(0, 4) == '0000')) {
             Module.gameID = Name
         }
         Module.romFileName = Name;
         Module.HEAPU8.set(u8, Module.romBuffer);
         var ret = Module._loadRom(u8.length);
         _.loadSaveGame();
 
     },
     saveSaveGame: function saveSaveGame(cb) {
         //console.log('save', gameID, index)
         var _ = this,
             Module = _.Module;
         Module.tmpSaveBuf.set(Module.wasmSaveBuf);
         _.FILE.DB.setItem(_.SavePre + Module.romFileName, Module.tmpSaveBuf, function (err, data) {
             _.FILES.push(_.SavePre + Module.romFileName);
             cb(true)
         })
     },
     loadSaveGame: function (buf) {
         var _ = this,
             Module = _.Module;
         if (buf) {
             Module.wasmSaveBuf.set(buf);
         } else {
             var file = 'save-' + Module.romFileName,
                 oldfile = Module.gameID + '-save-' + 0,
                 savefile = _.FILES.indexOf(file) != -1 ? file : (_.FILES.indexOf(oldfile) != -1 ? oldfile : false);
             if (savefile) {
                 return _.LoadSaveByName(savefile);
 
             }
 
         }
         _.clearSaveBufState();
         //隱藏菜單並且運行
         _._HideMenu();
         Module._resetCpu();
 
     },
     checkSaveBufState: function () {
         var _ = this,
             Module = _.Module;
         if (!Module.isRunning) {
             return;
         }
         var state = Module._updateSaveBufState();
         //console.log(state)
         if ((Module.lastCheckedSaveState == 1) && (state == 0)) {
             _.showMsg('存檔儲存中SaveSrm。。。請勿關閉Don’t Colse！')
             _.saveSaveGame(function () {
                 console.log('save done')
             })
         }
         Module.lastCheckedSaveState = state
     },
     clearSaveBufState: function () {
         var _ = this,
             Module = _.Module;
         Module.lastCheckedSaveState = 0;
         Module._updateSaveBufState();
     },
     keyList: ["a", "b", "select", "start", "right", "left", 'up', 'down', 'r', 'l'],
     keyState: new Array(10).fill(0),
     GetStateByKey: function (k) {
         return this.keyList.indexOf(k);
     },
     SwitchKeyState: function (k) {
         //根據KEY設置操作 
         var _ = this,
             Module = _.Module;
         switch (k) {
             case 'ul':
                 _.keyState[_.GetStateByKey("up")] = 1;
                 _.keyState[_.GetStateByKey("left")] = 1;
                 break;
             case 'ur':
                 _.keyState[_.GetStateByKey("up")] = 1;
                 _.keyState[_.GetStateByKey("right")] = 1;
                 break;
             case 'dl':
                 _.keyState[_.GetStateByKey("down")] = 1;
                 _.keyState[_.GetStateByKey("left")] = 1;
                 break;
             case 'dr':
                 _.keyState[_.GetStateByKey("down")] = 1;
                 _.keyState[_.GetStateByKey("right")] = 1;
                 break;
             default:
                 _.keyState[_.GetStateByKey(k)] = 1;
                 break;
         }
     },
     SetKeyStateByKey: function (k) {
         var _ = this,
             Module = _.Module;
         _.keyState = new Array(10).fill(0);
         if (k) {
             if (typeof k == "string") return _.SwitchKeyState(k);
             for (var i = 0; i < k.length; i++) {
                 _.SwitchKeyState(k[i]);
             }
         }
 
     },
     EventMouseDown: false,
     OpenTurboMode: function (elm) {
    var _ = this,
        Module = _.Module,
        elm = elm ? elm : $(".vk[data-k=turbo]"),
        speedInput = $("#GBA-Speed input[data-index='speedvalue']");

    if (Module.turboMode) {
        Module.turboMode = false;
        _.RunAnimation();
        $(elm).removeClass("vk-touched");
        // Reset the speed to 1 when turbo mode is turned off
        speedInput.val("1");
    } else {
        Module.turboMode = true;
        var speed = parseFloat(speedInput.val());
        // Check if the value in the input is a valid number, and set a default value of 1 if not
        if (isNaN(speed) || speed <= 0) {
            speed = 1;
            speedInput.val("1");
        }
        // Update the animation speed based on speedvalue
        _.RunAnimation(60 * speed);
        $(elm).addClass("vk-touched");
    }
},
     SetKeyState: function (e, k, type) {
         var _ = this,
             Module = _.Module;
         e.preventDefault();
         e.stopPropagation();
         if (k == "turbo" && _.EventClick.indexOf(type) != -1) {
             //單擊 觸擊 加速事件
             return _.OpenTurboMode(e.target);
         } else if (_.EventMouse.indexOf(type) != -1) {
             //鼠標事件 電腦訪問事件處理
             if (["mouseout", "mouseup"].indexOf(type) != -1) {
                 _.EventMouseDown = false;
                 _.SetKeyStateByKey();
             } else if (type == "mousedown") {
                 _.EventMouseDown = true;
                 _.SetKeyStateByKey(k);
             } else if (type == "mouseover" && _.EventMouseDown == true) {
                 _.SetKeyStateByKey(k);
             }
             return;
         }
         //手機訪問事件處理
         if (type == "touchend") {
             //清理觸控事件
             return _.SetKeyStateByKey();
         }
         var keys = [];
         for (var i = 0; i < e.touches.length; i++) {
             var t = e.touches[i];
             var dom = document.elementFromPoint(t.clientX, t.clientY);
             if (dom) {
                 var k = dom.getAttribute('data-k'),
                     key = _.keyList.indexOf(k);
                 keys.push(k);
             }
         }
         if (keys.length > 0) _.SetKeyStateByKey(keys);
     },
     getVKState: function () {
         var ret = 0;
         var _ = this,
             Module = _.Module;
         for (var i = 0; i < 10; i++) {
             ret = ret | (_.keyState[i] << i);
         }
         //console.log(_.keyState);
         return ret;
     },
     RunAnimation: function (FPS) {
         var _ = this;
         clearInterval(this.AnimationFrameTime);
         var _FPS = 1000 / (FPS || 60);
         this.AnimationFrameTime = setInterval(() => this.AnimationFrame(), _FPS);
         return;
     },
     AnimationFrame: function (auto) {
         var _ = NengeApp,
             Module = _.Module;
         //if(_.GamePadConnect) _.EventGamePadAction();
         if (Module.isRunning) {
             Module.frameCnt++;
             if (Module.frameCnt % 60 == 0) {
                 _.checkSaveBufState();
             }
             Module._runFrame(_.getVKState());
         }
     },
     DrawFrame: function (ptr) {
         var _ = this,
             Module = _.Module;
         _.DrawContext.putImageData(new ImageData(new Uint8ClampedArray(Module.HEAPU8.buffer).subarray(ptr, ptr + 240 * 160 * 4), 240, 160), 0, 0);
     },
     WriteAudio: function (ptr, frames) {
         var _ = this;
         if (_.audio) return _.audio(ptr, frames);
 
     },
     Ready: function () {
         var _ = this;
         Module.romBuffer = Module._getBuffer(1);
         var ptr = Module._getBuffer(0);
         Module.wasmSaveBufLen = 0x20000 + 0x2000;
         Module.wasmSaveBuf = Module.HEAPU8.subarray(ptr, ptr + Module.wasmSaveBufLen);
         Module.frameCnt = 0;
         Module.tmpSaveBuf = new Uint8Array(Module.wasmSaveBufLen);
         _.lowLatencyMode = false;
         _.isWasmReady = true;
         _.Module = Module;
         _.FILE.DB.ready().then(function () {
             _.FILE.DB.keys().then(function (keys) {
                 _.FILES = keys;
                 var LastRunGame = localStorage.getItem(_.LastGame);
                 console.log(_.LastGame, "取得數據列表，最近玩過：" + LastRunGame);
                 if (LastRunGame && _.FILES.indexOf(_.GamePre + LastRunGame) != -1) {
                     _.showMsg("<div style='background:#000;color:#fff;'>檢測到上次玩過的：<br>" + LastRunGame + "<br>請稍等，正在讀取。。。</div>");
                     _.RunGameByName(LastRunGame);
                 };
 
                 _.RunAnimation();
 
             }); // 包含所有 key 名的數組
         });
         $(_.GBABTN).show();
         console.log("WASM加載完畢");
 
     },
     Module: {},
     _GetCore: function (name) {
         var _ = this,
             gettype = (m)=>{
                 let r;
                 switch(m){
                     case 'js':
                         r='text/javascript';
                     break;
                     case 'png':
                         r = 'image/png';
                     break;
                     case 'wasm':
                         r = "application/binary";
                     break;
                     case 'css':
                         r = "text/css";
                     break;
                 }
                 return r;
             },
             geturl = (file,name)=>{
                 let mime = name.split('.').pop();
                 _.Link[name] = URL.createObjectURL(new Blob([file],{'type':gettype(mime)}));
                 return _.Link[name];
             },
             creat = (name)=>{
                 return document.createElement(name);
             },
             clink = (name,data,rel)=>{
                 let H = document.head,
                     link = creat('link');
                     link.rel=rel;
                     if(data){
                         link.href = geturl(data,'abc.css');
                     }else{
                         link.href = _.Link[name];
                     }
                     if(rel=='icon')link.type="image/png";
                     H.appendChild(link);
             },
             cscript = (name)=>{
                 let H = document.head,
                     link = creat('script');
                     link.src = _.Link[name];
                     H.appendChild(link);
                     return link;
             },
             Ready = ()=>{
                 clink('portrait.png','@media only screen and (min-width: 414px){.BulbasaurGBA #GBA-Btn{top:10px !important;}#emulatorGBA.BulbasaurGBA #GBA-Btn button{background:rgba(0,0,0,0.1);}}@media only screen and (max-width: 700px){.BulbasaurGBA #GBA-layer{background-image: url(' +_.Link['portrait.png'] + ');background-position: top center;background-repeat:no-repeat;background-size: contain;}}',"stylesheet"),clink('gba2.png',null,"apple-touch-icon"),clink('gba2.png',null,"icon"),cscript('GBK.js'),cscript('a.out.js');
             };
         _.Link = {};
         _.FILE.DB.getItem('COREDATA').then( 
             DATA=>{
                 if(DATA&&DATA.ver == _.ver){
                     for(var i in DATA.files){
                         geturl(DATA.files[i],i);
                     }
                     Ready();
                 }else{
                     _.showMsg("正在下載核心文件");
                     fetch('Core2.zip?'+Math.random()).then(v=>v.arrayBuffer()).then((buf)=>{
                         JSZip.loadAsync(buf,{optimizedBinaryString: true}).then(zip=>{
                             let DATAS = {'ver':_.ver,'files':{}},
                                 checkRun = ()=>{
                                     let ok = true;
                                     for(var i in _.Link){
                                         if(_.Link[i]&&DATAS.files[i]){
 
                                         }else{
                                             ok=false;
                                         }
                                     }
                                     if(ok){
                                         _.FILE.DB.setItem('COREDATA',DATAS,()=>{
                                             _.showMsg("記錄核心文件");
                                         });
                                         Ready();
                                     }
                                 },
                                 getZip = (filename)=>{
                                 _.Link[filename] = '';
                                 zip.file(filename).async("uint8array").then(
                                     data=>{
                                         geturl(data,filename);
                                         DATAS.files[filename] = data;
                                         checkRun();
                                     }
                                 )
                             };
                             for (var i in zip.files) {
                                 getZip(i);
                             }
                         })
                     });
                 }
             }
         );
     }
 }.InIt(window);
 window._ = NengeApp;
 window.onerror = function (msg, url, line, col, error) {
     var extra = !col ? '' : '\ncolumn: ' + col;
     extra += !error ? '' : '\nerror: ' + error;
     alert("Error: " + msg + "\nurl: " + url + "\nline: " + line + extra);
     window.onerror = console.log
     debugger
     return true;
 };
