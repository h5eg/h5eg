/*
画布分三个层面：
CSS大小，呈现区大小，坐标系统
示例：
CSS大小：300 * 200
呈现区大小：860 *（860/300*200）
坐标系统：坐标系统控制 绘制的图像在呈现区的哪个位置 显示
*/
js(function(){
//－－－－－－－－－－－－－－--
//－－－ 画 布 初 始 化 －－－
//－－－－－－－－－－－－－－--
window.eg = {};  // 供外部调用的对象
var html = document.documentElement,
    body = document.body,
    cvs     = js("#h5eg"),   // 主画布元素
    brush   = null,          // 画笔
    coordSC = 0;
// 初始化页面布局
html.style.margin  = "0px";
html.style.padding = "0px";
body.style.margin  = "0px";
body.style.padding = "0px";
// 创建主画布
if(!js.ckNodeType(cvs,"canvas")){
    // 如果不存在限定的主画布元素，游戏引擎会自动创建主画布元素
    // 主画布会以全屏方式呈现
    html.style.backgroundColor = "rgb(250,250,250)";
    html.style.width  = "100%";
    html.style.height = "100%";
    body.style.width  = "100%";
    body.style.height = "100%";
    cvs = js.newNode("canvas");    // 创建主画布元素
    cvs.style.width  = "100%";     // 设置画布的CSS宽
    cvs.style.height = "100%";     // 设置画布的CSS高
    console.log("创建画布成功");
    cancelDFEvent();               // 取消浏览器默认事件行为
}
if(!cvs){
    js.err("引擎启动失败，无法创建引擎默认画布");
    return false;
}
// 设置画布呈现区大小
(function(){
    var size   = js.getElemSize(cvs);
    if(size.w > 1024){
        cvs.style.width  = "1024px";     // 设置画布的CSS宽
        cvs.style.marginLeft = (size.w-1024)/2+"px";
        cvs.style.outline = "1px solid rgb(150,150,150)";
        size.w = 1024;
    }
    coordSC    = parseFloat(1024/size.w); // 此处不能使用parseInt()将结果取整，这会导致后期依次比例进行转换的值发生误差
    eg.coordSC = coordSC;
    eg.cssW    = size.w;
    eg.cssH    = size.h;
    eg.w       = 1024;
    eg.h       = coordSC * size.h;
    cvs.width  = eg.w;
    cvs.height = eg.h;
    js.log("画布CSS大小: " + eg.cssW + "*" + eg.cssH);
    js.log("画布实际的呈现大小: " + eg.w + "*" + eg.h);
}());
eg.toCssSize = function(val){
    return val/eg.coordSC;
};
eg.toCvsSize = function(val){
    return val*eg.coordSC;
};
// 画布的坐标系统当前值
cvsTranslate = {
    x : 0,
    y : 0
};
// 获取画笔
brush = cvs.getContext("2d");
// 手机上，一个标准字体占18像素
(function(){
    var size = js.getElemSize(cvs),
        fs   = 16;
    if(size.w > 340){
        fs = 17;
    }
    if(size.w > 390){
        fs = 18;
    }
    js.log("字体: " + fs);
    eg.cols = parseInt(size.w/fs);     // 算出该画布一行可以显示多少个字体(多少列字)
    eg.rem  = parseInt(eg.w/eg.cols);  // 算出画布区域中每个字体占的大小
    eg.rows = parseInt(eg.h/eg.rem);   // 算出画布区域可以显示多少行字
    js.log("行: "+eg.rows);
    js.log("列: "+eg.cols);
}());

//－－－－－－－－－－－－－－
//－－－－－ 引 擎 －－－－－
//－－－－－－－－－－－－－－
var sps = [],                   // 第0位精灵给了帧速率，第一位精灵给了进度条，且在引擎中这两个精灵最后绘制
    eventSps  = [],             // 保存添加了事件的精灵(优化性能)
    startTime = null,		   // 游戏引擎的启动时间
    nowTime   = null,           // 为所有精灵提供一致的当前时间
    lastTime  = null,           // 上一帧的时间
    interval  = 0,              // 每帧的时间间隔，大部分精灵的移动几乎都会用到该时间
    afterTime = null,           // 代表游戏引擎已经启动了多长时间
    deg360    = Math.PI*2,      // 360度的值
    deg       = Math.PI/180;    // 1度的值
// 启动游戏引擎
(function(){
    startTime = new Date();
    lastTime  = startTime;
    loopAnimation();
}());
// 开启引擎世界
function loopAnimation(){
    nowTime   = new Date();
    interval  = nowTime - lastTime;
    afterTime = nowTime - startTime; // 游戏引擎从启动到目前运行的总时间
    brush.clearRect(0,0,cvs.width,cvs.height);   // 清除画布
    brush.translate(cvsTranslate.x,cvsTranslate.y);
    //－－－开始诠释所有精灵－－－
    var i = 0,
        j = 0,
        sp = null;
    for(i=2; i<sps.length; i++){
        refreshSp(sps[i]);
    }
    // 绘制帧速率，进度条
    for(i=0; i<sps.length && i<2; i++){
        sps[i].paint();
        sps[i].update();
    }
    lastTime = nowTime;
    // 实现无限循环
    nextFlash(loopAnimation);
};
// 递归执行所有精灵节点
var refreshSp = (function(sp){
    function paint(sp){
        var i = 0;
        sp.paint();  // sp.paint()方法中会检测 sp.showed，再决定是否绘制精灵
        if(sp.showed){
            // 显示子节点精灵
            for(i =0; i<sp.sps.length; i++){
                paint(sp.sps[i]);
            }
        }
    }
    function update(sp){
        var i = 0;
        sp.nowTime = nowTime;
        sp.update();
        for(i =0; i<sp.sps.length; i++){
            update(sp.sps[i]);
        }
    }
    return function(sp){
        paint(sp);  // 所有精灵执行绘制函数
        update(sp); // 所有精灵执行更新函数
    }
}());

// (这几个值不允许外部修改，只允许访问)
// 获取引擎已启动的总时长（外部接口）
function getAfterTime(){
    return afterTime;
}
eg.getAfterTime = getAfterTime;
// 获取两帧之间的时间间隔（外部接口）
function getIntervalTime(){
    return interval;
}
eg.getIntervalTime = getIntervalTime;
// 获取当前时间（外部接口）
function getNowTime(){
    return nowTime;
}
eg.getNowTime = getNowTime;
//－－－－－－－－－－－－－－
//－－－－－ 精 灵 －－－－－
//－－－－－－－－－－－－－－
// 创建精灵
function newSp(name){
    var sp     = new Sprite(name);
    sp.brush   = brush;    // 默认将给精灵绑定主画布，若需要指定其他画布，定义完精灵后修改精灵的brush属性即可
    sp.painter = drawImg;  // 精灵的默认绘制器
    if(sps.length == 0){
        sp.zIndex = 1000;
    }else{
        sp.zIndex = sps[sps.length-1].zIndex + 2000;
        // 每个精灵的都拥有1999个层次用来分配给它的子精灵
    }
    sps.push(sp); // 将精灵添加到引擎世界中
    return sp;
}
var Sprite = function(name){
    this.name = "none";
    if(js.ckStr(name)){
        this.name = name;
    }
    this.brush     = null;
    this.sps       = [];
    this.elems     = [];
    this.zIndex    = "";        // zIndex 决定精灵所在的呈现层次，层次越高，优先触发事件，高层精灵绘制的图案会遮住低层
    this.startTime = null;
    this.lastTime  = null;
    this.nowTime   = null;
    this.interval  = null;
    this.afterTime = null;
    this.x         = 0;
    this.y         = 0;
    this.z         = 0;
    this.translate = {x:0, y:0}; // 指定绘制该精灵时，需要先平移坐标系统
    this.coordX    = 0;
    this.coordY    = 0;
    this.coordZ    = 0;
    this.startX    = 0;
    this.startY    = 0;
    this.endX;
    this.endY;
    this.lastEndX;
    this.lastEndY;
    this.w;
    this.h;
    this.r         = 0;
    this.minW      = 0;
    this.minH      = 0;
    this.img       = null;  // 图片
    this.imgX      = 0;     // 以下四个参数，共同指定绘制图片的限定区域
    this.imgY      = 0;
    this.imgW;
    this.imgH;
    this.curveTime;         // 曲线时间
    this.curvePow  = 2;
    this.curveLoop = false;
    this.curveLoopInit = false;
    this.distW     = 0;
    this.distH     = 0;
    this.distX     = 0;
    this.distY     = 0;
    this.nowAction      = [];      // 当前动作
    this.actionArr      = [];      // 当前动作组，数组的每个元素代表一个动作
    this.actionIndex    = 0;       // 指定当前显示动作组中的具体动作
    this.updActionItl   = 100;     // 更新动作的时间间隔
    this.updActionLTime = 0;       // 上次更新动作的时间
    this.count    = 0;
    this.deg      = 0;
    this.speedDeg = 0;
    this.text     = "";
    this.textMoveUpMax = 0;        // 文本框内的文本可以向上滑动的最大距离
    this.textRows = 0;         // 该精灵区域可显示的最多行数
    this.textLineArr = [];     // 文本会被分解成多行存放到数组中
    this.texted      = false;  // 通过 text文本 得到 行文本数组textLineArr后，texted变成true
    this.lineText;
    this.speed;
    this.speedX;
    this.speedY;
    this.directionX;
    this.directionY;
    this.opacity     = 1;
    this.timer       = null;   // 计时器
    this.motionTypeX = "";     // 移动的方式
    this.motionTypeY = "";
    this.flashTime   = null;   // 此次动画需要耗费的时间
    this.moveX       = 0 ;     // 此次运动，已经移动的位移
    this.moveY       = 0 ;
    this.movingInit  = false;  // 用于检测，调用moving()函数时是否进行基本数据初始化
    this.showed      = true;   // 控制该精灵是否显示
    this.actived     = false;  // 指定该精灵的状态: 静止 或 活动
    this.painter     = function(brush){};;   // 绘制器: 绘制精灵自身，function(sp,brush){ ... }
    this.updater     = function(sp){};       // 更新器: 更新精灵的自身行为，function(sp){ ... }
};
Sprite.prototype = {
    newSp : function(){
        var sp     = new Sprite(name);
        sp.name    = name || "";
        sp.brush   = brush;    // 默认将给精灵绑定主画布，若需要指定其他画布，定义完精灵后修改精灵的brush属性即可
        sp.painter = drawImg;  // 精灵的默认绘制器
        if(this.sps.length == 0){
            sp.zIndex = this.zIndex + 1;
        }else{
            sp.zIndex = this.sps[this.sps.length-1].zIndex + 1;
        }
        this.sps.push(sp);     // 将精灵添加到引擎世界中
        sp.parent = this;
        return sp;
    },
    newElem : function(name){
        var elem = js.newNode(name);
        this.elems.push(elem);
        return elem;
    },
    // 绘制器
    paint : function(){
        if(this.showed){
            // 在精灵使用画笔前，先保存画笔状态，绘图完毕后还原画笔状态，从而不影响其他精灵的绘制
            this.bgFunc();
            this.bdFunc();
            this.lineTextFunc();
            this.drawTextFunc();

            this.brush.save();
            this.brush.translate(this.translate.x,this.translate.y);
            this.painter(this,this.brush);  // painter指向的是外部函数，需要将 精灵 跟 画笔 作为参数传递出去
            this.brush.restore();
        }
    },
    // 更新器
    update : function(){
        if(this.actived){
            this.stepFunc(this);  // 跨步
            this.updater(this);   // updater指向的是外部函数，因此需要将 精灵 作为参数传递出去
            // updateAction(this);   // 更新动作
            // moving(this);         // 移动精灵
            // curveLoop(this);     // 循环曲线运动
        }
    },
    show : (function(){
        // 递归显示子精灵
        function showSp(sp){
            sp.showed = true;
            // 显示子元素
            for(var i=0;i<sp.elems.length;i++){
                sp.elems[i].style.display = "block";
            }
            for(var i=0;i<sp.sps.length;i++){
                showSp(sp.sps[i]);
            }
        }
        return function(){
            var sp = this;
            showSp(sp);
        }
    }()),
    hide : (function(){ // 隐藏精灵，包括所有子节点精灵
        // 递归隐藏子精灵
        function hideSp(sp){
            sp.showed = false;
            // 隐藏子元素
            for(var i=0;i<sp.elems.length;i++){
                sp.elems[i].style.display = "none";
            }
            for(var i=0;i<sp.sps.length;i++){
                hideSp(sp.sps[i]);
            }
        }
        return function(){
            var sp = this;
            hideSp(sp);
        }
    }()),
    nodesHide : function(){ // 隐藏所有子节点精灵
        var sp = this;
        for(var i=0;i<sp.sps.length;i++){
            sp.sps[i].hide();
        }
    },
    active : function(){
        this.actived = true;
        this.startTime = nowTime;
        this.lastTime  = nowTime;
    },
    stop : function(){
        this.actived = false;
    },
    stand : function(){      // 停止精灵的移动
        this.endX = null;
        this.endY = null;
    },
    setImg : function(img){  // 设置精灵使用的图片
        this.img = img;
    },
    setImgArea : function(arr){   // 设置绘制图片的某块区域
        if(!js.ckArr(arr) || arr.length < 4){
            js.err("setImgArea(arr), 操作精灵"+this.name+"时，参数arr不正确");
            return;
        }
        this.imgX = arr[0];
        this.imgY = arr[1];
        this.imgW = arr[2];
        this.imgH = arr[3];
    },
    // 设置精灵的宽高，提供两种方式：百分比值 和 数值
    setW : function(num){
        num = num + "";
        if(num.indexOf("%")!= -1){
            num = parseFloat(num);
            num = parseInt(num*0.01*cvs.width);
        }
        this.w = num;
        // 如果该精灵绘制的是图片，默认情况下，设置了宽的同时，会以等比例缩放的方式设置高
        if(this.imgH && this.imgW){
            this.h = parseInt(this.imgH/this.imgW*this.w);
        }
    },
    setH : function(num){
        num = num + "";
        if(num.indexOf("%")!= -1){
            num = parseFloat(num);
            num = parseInt(num*0.01*cvs.height);
        }
        this.h = num;
        // 如果该精灵绘制的是图片，默认情况下，设置了高的同时，会以等比例缩放的方式设置宽
        if(this.imgH && this.imgW){
            this.w = parseInt(this.imgW/this.imgH*this.h);
        }
    },
    // 设置精灵的坐标位置，提供两种方式：百分比值 和 数值
    setX : function(num){
        num = num + "";
        if(num.indexOf("%")!= -1){
            num = parseFloat(num);
            num = parseInt(num*0.01*cvs.width);
        }
        this.x = num;
    },
    setY : function(num){
        num = num + "";
        if(num.indexOf("%")!= -1){
            num = parseFloat(num);
            num = parseInt(num*0.01*cvs.height);
        }
        this.y = num;
    },
    setFT : function(size,style){
        style = style || "sans-serif";
        this.font = size+"px "+style;
    },
    /*
        启动条件：sp.x, sp.y, sp.w, sp.h ,sp.bg
    */
    bgFunc : function(){
        var sp    = this;
            brush = this.brush;
        if(!js.ckStr(sp.bg) || sp.bg==""){
            return;
        }
        if(!js.ckNum(sp.w)||!js.ckNum(sp.h)||!js.ckNum(sp.x)||!js.ckNum(sp.y)){
            return;
        }
        brush.save();
        brush.fillStyle = sp.bg;
        brush.fillRect(sp.x, sp.y, sp.w, sp.h);
        brush.restore();
    },
    /*
        启动条件： sp.x, sp.y, sp.w, sp.h, (sp.bd || sp.bdT || sp.bdB || sp.bdL || sp.bdR)

        相关参数设置：(所有参数都带有默认值)
        sp.bdCL    ,边框颜色
        sp.bdStyle ,边框样式(solid:实线, dotted:点线, dashed:虚线, double:双实线)
    */
    bdFunc : (function(){
        var bdStyle = {
            solid  : true,
            dotted : true,
            dashed : true,
            double : true
        };
        function parse(str){
            // 将 "3 solid rgb(200,200,200)" 这样的值解析成 obj 对象
            // 返回值： obj 或 false
            var arr = js.sliceStr(str," ");
            if(arr.length != 3){
                return false;
            }
            var obj = {w:"",cl:"",style:""};
            for(var i=0;i<arr.length;i++){
                if(bdStyle[arr[i]]){
                    obj.style = arr[i];
                }else if(js.ckNum(arr[i])){
                    obj.w = arr[i];
                }else{
                    obj.cl = arr[i]
                }
            }
            return obj;
        }
        return function(){
            // 检测必要条件
            if(!js.ckNum(this.w)||!js.ckNum(this.h)||!js.ckNum(this.x)||!js.ckNum(this.y)){
                return;
            }
            var sp    = this;
                brush = this.brush,
                obj   = null,
                endX  = sp.x+sp.w,
                endY  = sp.y+sp.h;
            if(js.ckStr(sp.bd) && sp.bd!=""){
                // 解析值
                if(sp.bd_lastV != sp.bd){
                    sp.bd_lastV = sp.bd;
                    obj = parse(sp.bd);
                    if(!obj){
                        sp.bded = false;
                    }else{
                        sp.bded = true;
                        sp.bd_w  = obj.w;
                        sp.bd_cl = obj.cl;
                        sp.bd_style = obj.style;
                    }
                }
                if(sp.bded){
                    // 绘制
                    brush.save();
                    brush.lineWidth = sp.bd_w;
                    brush.beginPath();
                    switch(sp.bd_style){
                    case "solid":
                        brush.moveTo(sp.x, sp.y);
                        brush.lineTo(endX, sp.y);
                        brush.lineTo(endX, endY);
                        brush.lineTo(sp.x, endY);
                        brush.closePath();
                        break;
                    }
                    brush.strokeStyle = sp.bd_cl;
                    brush.stroke();
                    brush.restore();
                }
            }
            if(js.ckStr(sp.bdL) && sp.bdL!=""){
                if(sp.bdL_lastV != sp.bdL){
                    sp.bdL_lastV = sp.bdL;
                    obj = parse(sp.bdL);
                    if(!obj){
                        sp.bdLed = false;
                    }else{
                        sp.bdLed = true;
                        sp.bdL_w  = obj.w;
                        sp.bdL_cl = obj.cl;
                        sp.bdL_style = obj.style;
                    }

                }
                if(sp.bdLed){
                    brush.save();
                    brush.lineWidth = sp.bdL_w;
                    brush.beginPath();
                    switch(sp.bdL_style){
                    case "solid":
                        brush.moveTo(sp.x, sp.y);
                        brush.lineTo(sp.x, endY);
                        break;
                    }
                    brush.strokeStyle = sp.bdL_cl;
                    brush.stroke();
                    brush.restore();
                }
            }
            if(js.ckStr(sp.bdR) && sp.bdR!=""){
                if(sp.bdR_lastV != sp.bdR){
                    sp.bdR_lastV = sp.bdR;
                    obj = parse(sp.bdR);
                    if(!obj){
                        sp.bdRed = false;
                    }else{
                        sp.bdRed = true;
                        sp.bdR_w  = obj.w;
                        sp.bdR_cl = obj.cl;
                        sp.bdR_style = obj.style;
                    }
                }
                if(sp.bdRed){
                    brush.save();
                    brush.lineWidth = sp.bdR_w;
                    brush.beginPath();
                    switch(sp.bdR_style){
                    case "solid":
                        brush.moveTo(endX, sp.y);
                        brush.lineTo(endX, endY);
                        break;
                    }
                    brush.strokeStyle = sp.bdR_cl;
                    brush.stroke();
                    brush.restore();
                }
            }
            if(js.ckStr(sp.bdT) && sp.bdT!=""){
                if(sp.bdT_lastV != sp.bdT){
                    sp.bdT_lastV = sp.bdT;
                    obj = parse(sp.bdT);
                    if(!obj){
                        sp.bdTed = false;
                    }else{
                        sp.bdTed = true;
                        sp.bdT_w  = obj.w;
                        sp.bdT_cl = obj.cl;
                        sp.bdT_style = obj.style;
                    }
                }
                if(sp.bdTed){
                    brush.save();
                    brush.lineWidth = sp.bdT_w;
                    brush.beginPath();
                    switch(sp.bdT_style){
                    case "solid":
                        brush.moveTo(sp.x, sp.y);
                        brush.lineTo(endX, sp.y);
                        break;
                    }
                    brush.strokeStyle = sp.bdT_cl;
                    brush.stroke();
                    brush.restore();
                }
            }
            if(js.ckStr(sp.bdB) && sp.bdB!=""){
                if(sp.bdB_lastV != sp.bdB){
                    sp.bdB_lastV = sp.bdB;
                    obj = parse(sp.bdB);
                    if(!obj){
                        sp.bdBed = false;
                    }else{
                        sp.bdBed = true;
                        sp.bdB_w  = obj.w;
                        sp.bdB_cl = obj.cl;
                        sp.bdB_style = obj.style;
                    }
                }
                if(sp.bdBed){
                    brush.save();
                    brush.lineWidth = sp.bdB_w;
                    brush.beginPath();
                    switch(sp.bdB_style){
                    case "solid":
                        brush.moveTo(endX, endY);
                        brush.lineTo(endX, endY);
                        break;
                    }
                    brush.strokeStyle = sp.bdB_cl;
                    brush.stroke();
                    brush.restore();
                }
            }
        }
    }()),
    /*
        启动条件：sp.lineText, sp.textX, sp.textY
        相关参数设置：(所有参数都带有默认值)
        sp.fs ,设置字体大小
        sp.cl ,设置字体颜色
        sp.textAlign ,设置文本左右最齐方式
    */
    lineTextFunc : function(){
        if(!js.ckStr(this.lineText) || this.lineText==""){
            return false;
        }
        if(!js.ckNum(this.textX) || !js.ckNum(this.textY)){
            return false;
        }
        var sp = this,
            pt = this.brush;
        pt.save();
        pt.translate(sp.translate.x,sp.translate.y);
        sp.fs = sp.fs || eg.rem;
        pt.font = sp.fs + "px sans-serif";
        pt.textAlign    = sp.textAlign || "center";
        pt.textBaseline = "middle";
        pt.fillStyle    = sp.cl || "rgb(150,150,150)";
        pt.fillText(this.lineText, this.textX, this.textY);
        pt.restore();
    },
    /*
        启动条件：sp.text, sp.w, sp.h, sp.x, sp.y
    */
    drawTextFunc : function(){
        if(!js.ckStr(this.text) || this.text==""){
            return;
        }
        if(!js.ckNum(this.w) || !js.ckNum(this.h) || !js.ckNum(this.x) || !js.ckNum(this.y)){
            return false;
        }
        var sp = this;
        sp.brush.save();
        sp.brush.translate(sp.translate.x,sp.translate.y);
        var pt     = sp.brush,
            fs     = sp.fs || eg.rem,
            index  = 0,
            lh     = 1.5*fs,
            initX  = sp.x,           // 每行第一个字符的X坐标
            lineX  = sp.x,           // 绘制当前字符的 X 坐标
            lineY  = sp.y+lh/2,      // 绘制当前该行字符的 Y 坐标
            endX   = parseInt(sp.x + sp.w);    // 每行最后一个字符的 X 坐标最大限制
        pt.font         = fs + "px 宋体";
        pt.fillStyle    = sp.cl || "rgb(250,250,250)";
        pt.textAlign    = "end";    // 字符的右边刚好在X坐标位置上
        pt.textBaseline = "middle";
        var data  = sp.text.replace(/^\n+|\n+$/g,""); // 抹去字符串 首部的所有换行 和 尾部的所有换行
        while(true){
            // 如果是换行符
            if(data[index] == "\n"){
                // 如果是换行就修改坐标
                lineY += lh;
                lineX = initX;
                // 跳过换行符
                index++;
                if(index>=data.length){ // 只要index一变化，就要检测下标是否越界
                    sp.brush.restore();
                    var height = lineY+lh/2-sp.y;     // 一共绘制的总行高
                    sp.textMoveUpMinY = -(height-sp.h);  // 总行高 - 元素的高 --> 文本可上滑到的最小Y坐标值
                    if(sp.textMoveUpMinY > 0){
                        sp.textMoveUpMinY = 0;
                    }
                    return false;
                }
                continue;
            }
            // 不是换行符
            lineX += pt.measureText(data[index]).width;
            if(lineX>endX){  // 只要lineX一变化，就检测是否越界
                // 只要越界就修改坐标
                lineY += lh;
                lineX = initX;
                lineX += pt.measureText(data[index]).width; // 修改了坐标，需要重置该字符的坐标
            }
            pt.fillText(data[index], lineX, lineY);
            index++;
            if(index>=data.length){   // 只要index一变化，就要检测下标是否越界
                sp.brush.restore();
                var height = lineY+lh/2-sp.y;     // 一共绘制的总行高
                sp.textMoveUpMinY = -(height-sp.h);  // 总行高 - 元素的高 --> 文本可上滑到的最小Y坐标值
                if(sp.textMoveUpMinY > 0){
                    sp.textMoveUpMinY = 0;
                }
                return false;
            }
        }
    },
    stepFunc : (function(){
        // 以下独立出来的值对于每个Person精灵来说，都是固定不变的
        var armT_backEndDeg   = 120,  // 上手臂后摆终点角度
            armT_forntEndDeg  = 70,   // 上手臂前摆终点角度
            armB_backEndDeg   = 110,  // 下手臂后摆终点角度
            armB_forntEndDeg  = 45,   // 下手臂前摆终点角度
            legT_backEndDeg   = 100,  // 上脚臂后摆终点角度
            legT_forntEndDeg1 = 40,   // 上脚臂前摆终点角度1
            legT_forntEndDeg  = 60,   // 上脚臂前摆终点角度2
            legB_backEndDeg   = 121,  // 下脚臂后摆终点角度
            legB_forntEndDeg1 = 135,  // 下脚臂前摆终点角度1
            legB_forntEndDeg  = 80,   // 下脚臂前摆终点角度2
            // ---- 每个部位从起点到终点的摆幅度数，分正负 ----
            // 后手臂向前摆
            hindArmT_swingDeg = armT_forntEndDeg-armT_backEndDeg,  // 后上手臂
            hindArmB_swingDeg = armB_forntEndDeg-armB_backEndDeg,  // 后下手臂
            // 前手臂向前摆
            foreArmT_swingDeg = armT_backEndDeg-armT_forntEndDeg,  // 前上手臂
            foreArmB_swingDeg = armB_backEndDeg-armB_forntEndDeg,  // 前下手臂
            // 后脚向前跨分两个阶段：抬起 与 放下
            hindLegT_swingDeg1 = legT_forntEndDeg1-legT_backEndDeg,
            hindLegT_swingDeg2 = legT_forntEndDeg-legT_forntEndDeg1,
            hindLegB_swingDeg1 = legB_forntEndDeg1-legB_backEndDeg,
            hindLegB_swingDeg2 = legB_forntEndDeg-legB_forntEndDeg1,
            // 前脚间接向后移
            foreLegT_swingDeg  = legT_backEndDeg-legT_forntEndDeg,
            foreLegB_swingDeg  = legB_backEndDeg-legB_forntEndDeg;
        function init(sp){
            sp.stepTime     = sp.stepTime || 5000; // 跨一步花费的时间，默认一秒一步
            sp.stepTimeHalf = sp.stepTime/2;
            // --- 每个摆动动作的速度，分正负 ---
            // 后手臂向前摆
            sp.hindArmT_speed = hindArmT_swingDeg/sp.stepTime;
            sp.hindArmB_speed = hindArmB_swingDeg/sp.stepTime;
            // 前手臂向前摆
            sp.foreArmT_speed = foreArmT_swingDeg/sp.stepTime;
            sp.foreArmB_speed = foreArmB_swingDeg/sp.stepTime;
            // 后脚向前跨：阶段一
            sp.hindLegT_speed1 = hindLegT_swingDeg1/sp.stepTimeHalf;
            sp.hindLegB_speed1 = hindLegB_swingDeg1/sp.stepTimeHalf;
            sp.hindLegT_speed2 = hindLegT_swingDeg2/sp.stepTimeHalf;
            sp.hindLegB_speed2 = hindLegB_swingDeg2/sp.stepTimeHalf;
            // 将四肢都设置成起步状态
            sp.body_deg     = -90;
            sp.hindArmT_deg = armT_backEndDeg;
            sp.hindArmB_deg = armB_backEndDeg;
            sp.foreArmT_deg = armT_forntEndDeg;
            sp.foreArmB_deg = armB_forntEndDeg;
            sp.hindLegT_deg = legT_backEndDeg;
            sp.hindLegB_deg = legB_backEndDeg;
            sp.foreLegT_deg = legT_forntEndDeg;
            sp.foreLegB_deg = legB_forntEndDeg;
            sp.lastX  = sp.x; // 记录下移动前腰部的X坐标
            // 重置计时器
            sp.startTime = sp.nowTime;
            sp.walkInit = true;
        }
        return function(sp){
            if(!sp.walked || !sp.initialY){
                return;
                // sp.initialY，代表检测腰部坐标(该坐标值代表人站直情况下腰部的Y坐标)
            }
            if(!js.ckNum(sp.legT_h) || !js.ckNum(sp.legB_h)){
                return;
                // 上脚臂和下脚臂的高度，会在更新腰部的Y坐标时使用到
            }
            // 在开始动作前，先初始化数据
            if(!sp.walkInit){
                init(sp);
            }
            sp.afterTime = sp.nowTime - sp.startTime;
            // --- 后肢向前跨 ---
            if(sp.afterTime<=sp.stepTimeHalf){
                sp.cgDeg        = sp.afterTime*sp.hindLegT_speed1;
                sp.hindLegT_deg = legT_backEndDeg-sp.cgDeg;
                sp.cgDeg        = sp.afterTime*sp.hindLegB_speed1;
                sp.hindLegB_deg = legB_backEndDeg-sp.cgDeg;
            }else{
                sp.cgDeg        = (sp.afterTime-sp.stepTimeHalf)*sp.legT_speed;
                sp.hindLegT_deg = legT_forntEndDeg1+sp.cgDeg;
                sp.cgDeg        = (sp.afterTime-sp.stepTimeHalf)*sp.legB_speed;
                sp.hindLegB_deg = legB_forntEndDeg1-sp.cgDeg;
            }
            // --- 前肢向后 ---
            sp.cgDeg        = sp.afterTime*sp.legT_speed;
            sp.foreLegT_deg = legT_forntEndDeg+sp.cgDeg;
            sp.cgDeg        = sp.afterTime*sp.legB_speed;
            sp.foreLegB_deg = legB_forntEndDeg+sp.cgDeg;
            // --- 更新腰部高度 ---
            // 双脚的弯曲变化会导致腰部或增高或降低，是增高还是降低，根据始终贴地面的那只脚来实时计算(即向后移的那只脚)
            if(sp.foreLegT_deg<90){
                sp.legT_nowH = Math.sin(sp.foreLegT_deg*eg.deg)*sp.legT_h;
            }else{
                sp.legT_nowH = Math.cos((sp.foreLegT_deg-90)*eg.deg)*sp.legT_h;
            }
            if(sp.foreLegB_deg<90){
                sp.legB_nowH = Math.sin(sp.foreLegB_deg*eg.deg)*sp.legB_h;
            }else{
                sp.legB_nowH = Math.cos((sp.foreLegB_deg-90)*eg.deg)*sp.legB_h;
            }
            sp.nowLegH = sp.legT_nowH+sp.legB_nowH; // 当前上腿臂的垂直高度 + 当前下腿臂的垂直高度
            sp.y       = sp.initialY+(sp.legT_h+sp.legB_h-sp.nowLegH); // sp.initialY，代表人站直情况下腰部的Y坐标
            // --- 后臂向前摆 ---
            sp.cgDeg        = sp.afterTime*sp.armT_speed;
            sp.hindArmT_deg = armT_backEndDeg-sp.cgDeg;
            sp.cgDeg        = sp.afterTime*sp.armB_speed;
            sp.hindArmB_deg = armB_backEndDeg-sp.cgDeg;
            // --- 前臂向后摆 ---
            sp.cgDeg        = sp.afterTime*sp.armT_speed;
            sp.foreArmT_deg = armT_forntEndDeg+sp.cgDeg;
            sp.cgDeg        = sp.afterTime*sp.armB_speed;
            sp.foreArmB_deg = armB_forntEndDeg+sp.cgDeg;
            // --- 到达终点角度 ---
            if(sp.afterTime>=sp.stepTime){
                // 后臂变前臂
                sp.hindArmT_deg = armT_forntEndDeg;
                sp.hindArmB_deg = armB_forntEndDeg;
                // 前臂变后臂
                sp.foreArmT_deg = armT_backEndDeg;
                sp.foreArmB_deg = armB_backEndDeg;
                // 后肢变前肢
                sp.hindLegT_deg = legT_forntEndDeg;
                sp.hindLegB_deg = legB_forntEndDeg;
                // 前肢变后肢
                sp.foreLegT_deg = legT_backEndDeg;
                sp.foreLegB_deg = legB_backEndDeg
                // 每执行完一次跨步，下次跨步时需要对数据进行初始化
                sp.walkInit = false;
                sp.stop();
            }
        }
    }())
};
// 默认的精灵绘制器
function drawImg(sp,brush){
    if(sp.img && sp.img.loaded){
        brush.drawImage(sp.img,sp.imgX,sp.imgY,sp.imgW,sp.imgH, sp.x,sp.y,sp.w,sp.h);
    }
}
//－－－－－－－－－－－－－－
//－－－－－ 帧速率 －－－－－
//－－－－－－－－－－－－－－
(function(){
    var sp = newSp("fps");
    sp.hide();
    sp.x = 0;
    sp.y = 0;
    sp.val = 60;
    sp.painter = function(sp,brush){
        brush.fillStyle = "rgb(120,120,120)";
        brush.font      = eg.rem+"px 宋体";
        brush.textAlign = "start";
        brush.textBaseline = "top";
        brush.fillText("FPS:"+parseInt(sp.val), sp.x, sp.y);
    };
    sp.updater = function(sp){
        sp.count++;  // 统计一秒钟的刷新次数
        if(!sp.lastTime){
            sp.lastTime = nowTime;
        }
        // 1秒更新一次帧速率的值
        if(nowTime-sp.lastTime >= 1000){
            sp.val   = sp.count;
            sp.count = 0;  //清零，重新统计
            sp.lastTime  = nowTime;
        }
    };
}());
// 显示帧速率（外部接口）
function showFps(){
    sps[0].show();
    sps[0].active();
    js.log("显示帧速率。");
}
// 隐藏帧速率（外部接口）
function hideFps(){
    sps[0].hide();
    sps[0].stop();
}
// 获取帧速率（外部接口）
function getFps(){
    return sps[0].val;
}
//－－－－－－－－－－－－－－
//－－－－ 进 度 条 －－－－
//－－－－－－－－－－－－－－
eg.rsReady  = false;   // 资源加载完毕后会被设置成true，一旦又有新的资源需要加载时，又会被设置成false
(function(){
    var sp = newSp("loadingBar");
    sp.hide();
    sp.stop();           // 进度条默认不刷新, 设置好所有资源后, 调用显示进度条时才刷新
    sp.sourceNum = 0;    // 总资源的数量
    sp.loadedNum = 0;    // 当前已加载完毕的资源数量
    sp.nowper    = 0.05; // 默认已加载进度为5%，已加载的资源进度百分比  loadedNum/sourceNum
    sp.w    = cvs.width*0.6; // 进度条的长度
    sp.x    = (cvs.width-sp.w)/2;
    sp.y    = cvs.height*0.8;
    sp.endX = sp.x+sp.w;
    sp.endY = sp.y;
    sp.drawPer  = 0.05;         // 用来绘制显示的百分比(避免进度条绘制一闪而过)
    sp.speed    = 1/1500;       // 及时资源在一瞬间就加载完毕，为了呈现进度条，进度条也要在1.5秒中绘制完毕
    sp.painter  = function(){
        // 绘制背景
        brush.fillStyle = "rgb(53,78,109)";
        brush.fillRect(0,0,cvs.width,cvs.height);
        // 底部绘制一条只带有底色的进度条(末端是圆角的画线)
        brush.lineWidth = 20;
        brush.lineCap = "round";
        brush.beginPath();
        brush.moveTo(sp.x,sp.y);
        brush.lineTo(sp.endX,sp.endY);
        brush.strokeStyle = "rgb(50,60,90)";
        brush.stroke();
        // 绘制一条代表当前加载进度的线
        brush.beginPath();
        brush.moveTo(sp.x,sp.y);
        brush.lineTo(sp.x+sp.drawPer*sp.w,sp.endY);
        brush.strokeStyle = "rgb(100,190,190)";
        brush.stroke();
        // 绘制百分比值
        brush.font = cvs.width*0.03+"px 楷体";
        brush.fillStyle = "rgb(255,255,255)";
        brush.fillText(parseInt(sp.drawPer*100)+"%",sp.x+sp.w-55,sp.y-30);
        // 绘制 www.webydm.com
        brush.font = cvs.width*0.04+"px 楷体";
        brush.textAlign = "center";
        brush.textBaseline = "middle";
        brush.fillStyle = "rgb(100,200,100)";
        brush.fillText("www.webydm.com",cvs.width/2,cvs.height/2-100);
        // 绘制 web源代码，知识分享库
        brush.fillStyle = "rgb(30,70,250)";
        brush.fillText("web源代码 . 知识分享",cvs.width/2,cvs.height/2);
        // 隐藏进度条
        if(sp.drawPer == 1){
            eg.rsReady = true;
            sp.hide();
            sp.stop();
        }
    };
    sp.updater = function(){  // updater 用来更新百分比进度
        sp.w    = cvs.width*0.6; // 进度条的长度
        sp.x    = (cvs.width-sp.w)/2;
        sp.y    = cvs.height*0.8;
        sp.endX = sp.x+sp.w;
        sp.endY = sp.y;
        sp.nowper = parseInt(sp.loadedNum/sp.sourceNum);
        if(!sp.lastTime){
            sp.lastTime = sp.nowTime;
        }
        if(sp.drawPer != sp.nowper){
            sp.drawPer = sp.drawPer + (sp.nowTime-sp.lastTime)*sp.speed;
            if(sp.drawPer>=sp.nowper){
                sp.drawPer = sp.nowper;
            }
        }
        sp.lastTime = sp.nowTime;
    };
}());
// var loadingBarSp = null;
// 设置好要加载的资源后，调用showLoadingBar()方法，方法会根据实际的资源加载情况来绘制进度条
function showLoadingBar(){
    // eg.gameReady = false;
    sps[1].show();
    sps[1].active();
    // console.log("启动进度条");
}
//－－－－－－－－－－－－－－---
//－－－－ 加 载 资 源 －－－－
//－－－－－－－－－－－－－－---
// (建议)所有图片资源都需要通过该方式来创建
// 该方式会给图片对象添加状态标记 loaded，用于检测图片是否加载完毕，同时记录图片资源的数量
function newImg(src){
    if(!js.ckStr(src)){
        js.err("eg.newImg(src),请填写参数src");
        return false;
    }
    var img = new Image();
    img.src = src;
    img.loaded = false;
    js.addEvent(img,"load",function(){
        img.loaded = true;
        // 每加载完一张图片，已加载资源的数量加一
        sps[1].loadedNum++;
    });
    // 每创建一个图片资源，资源总数加一
    sps[1].sourceNum++;
    eg.rsReady = false;
    return img;
}
function newAudio(src){
    var audio = new Audio();
    audio.src = src;
    audio.loaded = false;
    js.addEvent(audio,"loadedmetadata",function(){
        audio.loaded = true;
        // 每加载完一个音乐资源，已加载资源的数量加一
        sps[1].loadedNum++;
    });
    // 每创建一个音乐资源，资源总数加一
    sps[1].sourceNum++;
    eg.rsReady = false;
    return audio;
}
//－－－－－－－－－－－－－－-------
//－－－－ 调 整 坐 标 系 统 －－－－
//－－－－－－－－－－－－－－-------
// 获取画布当前的坐标系统平移状态
eg.getCvsTranslate = function(){
    return cvsTranslate;
}
// 获取画布坐标系统的平移值
eg.setCvsTranslate = function(x,y){
    if(!js.ckNum(x)||!js.ckNum(y)){
        return;
    }
    cvsTranslate.x = x;
    cvsTranslate.y = y;
}
// 平移坐标系统
function moveCoord(x,y,painter){
    painter = painter || brush;
    painter.translate(x,y);
}
// 旋转坐标系统
function rotateCoord(deg,painter){
    painter = painter || brush;
    painter.rotate(deg);
}
// 缩放坐标轴
function scaleCoord(pow1,pow2,painter){
    painter = painter || brush;
    painter.scale(pow1,pow2);
}
// 切换到左下角为原点的坐标系统
function normalCoordSys(brush2){
    if(js.ckObj(brush2)){
        brush2.translate(0,cvs.height);
        brush2.scale(1,-1);
    }else{
        brush.translate(0,cvs.height);
        brush.scale(1,-1);
    }
}
eg.normalCoordSys = normalCoordSys;
//－－－－－－－－－－－－－－
//－－－－－ 工 具 －－－－－
//－－－－－－－－－－－－－－
// 获取指定范围内的随机数
// Math.random() 会产生0～1之间的值，不包括0和1
// Math.random()*10 的随机值就在 0～10 之间，不包括0和10
// Math.floor() 将数值向下舍入为最接近的整数
function getRandom(min,max){
    if(!js.ckNum(min)){
        js.err("请指定随机数的最小值");
    }
    if(!js.ckNum(max)){
        js.err("请指定随机数的最大值");
    }
    max++;
    return Math.floor(min + Math.random() * (max-min));
}
// 待整理...
// 获取屏幕上 所有触控点 相对于坐标原点的坐标差(x,y)
// 此坐标差, 就代表该触控点在坐标系统上的坐标位置
function getTouchDots(e){
    //获取 画布的四边 相对于视窗口左上角的间距(存在正负)
    //此处是为了兼容 PC WEB 端的 H5 游戏
    var cvsRect = cvs.getBoundingClientRect(),
        arr     = [];
    //多个触控点，因此使用循环遍历所有触控点
    for(var i=0; i<e.touches.length; i++){
        //目前坐标差的计算方式是: 依照相对于屏幕的左上角(0,0)计算得来的坐标
        arr.push({x:e.touches[i].clientX - cvsRect.left, y:e.touches[i].clientY - cvsRect.top});
        //还需要增加检测画布坐标系统，坐标系统可能会发生平移或是旋转等变更
        //待增加...
    }
    return arr;
};
//－－－－－－－－－－－－－－
//－－－－－ 文本处理 －－－－－
//－－－－－－－－－－－－－－
// 将给定的数据，按显示区域的大小，分成多页数据
// 显示区域大小：sp.x, sp.y, sp.w, sp.h 这四个值组成
// 返回值：字符串类型数组，每个数组元素都代表一页的数据
function getPageDataArr(sp,data){
    if(!js.ckNum(sp.w) || !js.ckNum(sp.h) || !js.ckNum(sp.x) || !js.ckNum(sp.y)){
        return [];
    }
    if(!js.ckStr(data) || data == ""){
        return [];
    }
    var pt     = sp.brush,
        fs     = sp.fs || eg.rem,
        start  = 0,
        index  = 0,
        lh     = 1.5*fs,
        initX  = sp.x,           // 每行第一个字符的X坐标
        initY  = sp.y+lh/2,      // 第一行字符的Y坐标
        lineX  = sp.x,           // 绘制当前字符的 X 坐标
        lineY  = initY,          // 绘制当前该行字符的 Y 坐标
        endX   = parseInt(sp.x + sp.w),    // 每行最后一个字符的 X 坐标最大限制
        endY   = parseInt(sp.y + sp.h - fs/2),    // 最后一行 Y 坐标限制
        pageDataArr = [];
    pt.save();
    pt.font = fs + "px sans-serif";
    while(true){
        if(data[index] == "\n"){
            // 如果等于换行，跳过该字符，且修改坐标
            lineY += lh;
            if(lineY>endY){
                // 只要lineY一变化，就检测是否越界，如果越界，代表这一页只能容纳下这些字符
                pageDataArr.push(data.slice(start,index));
                start = index;
                lineY = initY;
            }
            lineX = initX;
            index++;
            if(index>=data.length){
                pageDataArr.push(data.slice(start,index));
                pt.restore();
                return pageDataArr;
            }
            continue;
        }
        lineX += pt.measureText(data[index]).width;
        if(lineX>endX){
            lineY += lh;
            if(lineY>endY){
                // 只要lineY一变化，就检测是否越界，如果越界，代表这一页只能容纳下这些字符
                pageDataArr.push(data.slice(start,index));
                start = index;
                lineY = initY;
            }
            lineX = initX;
            lineX += pt.measureText(data[index]).width;
        }
        index++;
        if(index>=data.length){
            pageDataArr.push(data.slice(start,index));
            pt.restore();
            return pageDataArr;
        }
    }
}

//－－－－－－－－－－－－－－
//－－－－－ 动 作 －－－－－
//－－－－－－－－－－－－－－
// 切换动作组
// 参数: 图片, 动作组, 切换时间间隔
function setAction(sp, actionArr, interval){
    if(!js.ckArr(actionArr)){
        js.err("精灵" + sp.name +", setAction(img,actionArr), 参数错误");
        return;
    }
    sp.actionArr      = actionArr;
    sp.actionIndex    = 0;
    sp.updActionLTime = null;
    if(js.ckNum(interval)){
        // 默认100ms
        sp.updActionItl = interval;
    }
}
// 更新动作组中的动作，构成连续的动作
function updateAction(sp){
    if(!sp.img || !sp.img.loaded || !js.ckArr(sp.actionArr)){
        return;
    }
    if(!sp.updActionLTime){
        sp.updActionLTime = sp.nowTime;
    }
    if(sp.nowTime - sp.updActionLTime < sp.updActionItl){
        return;
    }
    sp.actionIndex++;
    if(sp.actionIndex >= sp.actionArr.length){
        sp.actionIndex = 0;
    }
    sp.nowAction = sp.actionArr[sp.actionIndex];
    // 切换单元格，传递：精灵 跟 动作
    if(js.ckArr(sp.nowAction)){
        sp.imgX = sp.nowAction[0];
        sp.imgY = sp.nowAction[1];
        sp.imgW = sp.nowAction[2];
        sp.imgH = sp.nowAction[3];
    }
    sp.updActionLTime = sp.nowTime;
}
//－－－－－－－－－－－－－－
//－－－ 同 步 Size －－－
//－－－－－－－－－－－－－－




//－－－－－－－－－－－－－－
//－－－－－ 移 动 －－－－－
//－－－－－－－－－－－－－－
// 启动条件:
// 当前坐标(默认 0,0 ) 和 终点坐标 都必须被指定，并且 当前坐标 不等于 终点坐标
// 结束条件:
// 当前坐标 等于 终点坐标, sp.x == sp.endX && sp.y == sp.endY
// 移动原理:
// 根据 每帧的时耗 和 速度 来计算位移，时耗统一使用引擎的 interval
// 涉及的精灵属性:
// x , y , endX , endY     : 这四个属性必须指定
// lastEndX , lastEndY     : 这两个属性会在精灵移动时被自动设置，如果endX或endY值变更了，lastEndX和lastEndY也会更新
// directionX , directionY : 决定精灵移动的方向，精灵移动时，会根据当前坐标跟终点坐标自动进行初始化
// speed, speedX , speedY  : 精灵的移动速度，若不显示设置默认的speed值为 50px/1s
// 引擎的 interval 值
var moving = (function(){
    // 一个独立的函数，用来计算水平方向 和 垂直方向上的速度
    // 给予一个速度，转换成 X轴速度 和 Y轴速度，实现 X轴 和 Y轴同步移动
    var setSpeed = (function(){
        // 以下局部变量只会创建一次，降低了每次执行函数时带来的损耗
        var distX = 0,
            distY = 0,
            dist  = 0,
            time  = 0;
        return function(sp){
            // 根据勾股定理计算出 当前坐标点 到 终点坐标 的连线距离
            // 连线距离／速度 -> 时间
            // 水平距离／时间 -> 水平速度
            // 垂直距离／时间 -> 垂直速度
            // 如果有很多碰撞点，导致起点到终点的路线变得曲折，每个碰撞点都会被当成是一个的终点，精灵将会分多个阶段进行移动
            distX = Math.abs(sp.endX - sp.x);
            distY = Math.abs(sp.endY - sp.y);
            dist  = Math.sqrt(Math.pow(distX,2) + Math.pow(distY,2));
            time  = dist / sp.speed;
            sp.speedX = distX/time;
            sp.speedY = distY/time;
        }
    }());
    // 一个很独立的函数，计算精灵的移动方向
    // 跟据 当前坐标 和 目的坐标来 断定移动方向
    // 如果 当前X轴坐标 或 当前Y轴坐标等同于 终点坐标，精灵是不会移动的
    function setDirectionX(sp){
        if(sp.x < sp.endX){//增大
            sp.directionX = 1;
        }else{//减小
            sp.directionX = 0;
        }
    };
    function setDirectionY(sp){
        if(sp.y < sp.endY){//增大
            sp.directionY = 1;
        }else{//减小
            sp.directionY = 0;
        }
    };
    return function(sp){
        // 启动条件
        if( !js.ckNum(sp.endX) || !js.ckNum(sp.endY)){
            return false;
        }
        // 结束条件
        if(sp.x == sp.endX && sp.y == sp.endY){
            return false;
        }
        // 初始化相关参数
        if(!sp.movingInit){
            // 初始化 lastEndX 和 lastEndY, 这两个值代表上次指定的终点
            if(!js.ckNum(sp.lastEndX) || !js.ckNum(sp.lastEndY)){
                sp.lastEndX = sp.endX;
                sp.lastEndY = sp.endY;
            }
            // 初始化方向移动方向(X轴上的移动方向 和 Y轴上的移动方向)
            // 如果不等于 0或1 就代表没有初始化
            if(sp.directionX != 0 && sp.directionX != 1){
                setDirectionX(sp);
            }
            if(sp.directionY != 0 && sp.directionY != 1){
                setDirectionY(sp);
            }
            // 初始化速度，仅在没有设置速度的前提下，给予一个默认速度
            if(!js.ckNum(sp.speed)){
                sp.speed = 0.05; //一秒移动50像素
            }
            // 设置 X轴 和 Y轴 上的速度
            setSpeed(sp);
            // 标记已初始化
            sp.movingInit = true;
        }
        // 每次都检测终点位置
        // 终点位置改变了, 重新调整方向, 重新设置 X轴上 和 Y轴上 的速度
        if(sp.lastEndX != sp.endX || sp.lastEndY != sp.endY){
            sp.lastEndX = sp.endX;
            sp.lastEndY = sp.endY;
            setDirectionX(sp);
            setDirectionY(sp);
            setSpeed(sp);
        }
        //--移动精灵--
        if(sp.x != sp.endX){ //如果移动到终点，则不执行移动代码(加个判断提升性能)
            if(sp.directionX == 1){
                sp.x += interval * sp.speedX;
                if(sp.x >= sp.endX){
                    sp.x = sp.endX;
                }
            }else{
                sp.x -= interval * sp.speedX;
                if(sp.x <= sp.endX){
                    sp.x = sp.endX;
                }
            }
        }
        if(sp.y != sp.endY){ //如果移动到终点，则不执行移动代码(加个判断提升性能)
            if(sp.directionY == 1){
                sp.y += interval * sp.speedY;
                if(sp.y >= sp.endY){
                    sp.y = sp.endY;
                }
            }else{
                sp.y -= interval * sp.speedY;
                if(sp.y <= sp.endY){
                    sp.y = sp.endY;
                }
            }
        }
    }
}());
//－－－－－－－－－－－－－－－－－－－－－－－－
//－－－－－－ 触控改变精灵终点坐标 －－－－－－
//－－－－－－－－－－－－－－－－－－－－－－－－
// 提供了为精灵自动实现: 点击屏幕，精灵移动到指定点击坐标，可以只控制一个精灵，也可以是同时控制多个精灵往同一个终点移去
// 目前只提供了单点触控，根据需求会继续提供多点触控
// touchToEndSps 保存要移动到中终点的精灵
var touchToEndSps  = null;
function setTouchToEndSps(sps){
    touchToEndSps = sps;
}
js.addEvent(cvs,"touchstart",function(e){
    // 获取触控点相对于画布左上角原点的坐标
    touchDot   = getTouchDots(e)[0];
    if(js.ckArr(touchToEndSps)){
        for(var x=0; x<touchToEndSps.length;x++){
            touchToEndSps[x].endX = touchDot.x * 2 - touchToEndSps[x].w/2;
            touchToEndSps[x].endY = touchDot.y * 2 - touchToEndSps[x].h/2;
        }
        // 点击后，显示精灵的终点坐标
        console.log(touchToEndSps[0].name+ ".endX:" + touchToEndSpss[0].endX);
        console.log(touchToEndSps[0].name+ ".endY:" + touchToEndSpss[0].endY);
        return false;
    }
    if(js.ckObjType(touchToEndSps,Sprite)){
        // 小bug，实际画布绘图去大小是cvs元素大小的两倍
        // 因此在获取到触控点时，应该把触控点坐标乘2才能得到精灵在画布上的坐标
        touchToEndSps.endX = touchDot.x * 2 - touchToEndSps.w/2;
        touchToEndSps.endY = touchDot.y * 2 - touchToEndSps.h/2;
    }
    // 点击后，显示精灵的终点坐标
    // console.log(touchToEndSps.name+ ".endX:" + touchToEndSps.endX);
    // console.log(touchToEndSps.name+ ".endY:" + touchToEndSps.endY);
});
//－－－－－－－－－－－－－－－－－－－－－
//－－－－－ 曲 线 循 环 运 动 －－－－－
//－－－－－－－－－－－－－－－－－－－－－
// 无限循环的曲线运动，一个只用来做此事的功能函数
// x, y, w, h 这四项值的变化，都使用相同的曲线时间
// 开启条件: 曲线时间, 位移距离 ,曲线运动开启时间, 曲线率(默认2)

// curveTime    , 曲线时间
// distW, distH, distX, distY   , 各项位移总长度
// 如果存在初始宽高，初始坐标，需要设置: minW, minH, startX, startY
// speed = 1/curveTime;   ,速度
// startTime    , 曲线运动开启时间
// curverPow    , 曲线率
//--- 关闭无限曲线循环 ---
function curveLoopStop(sp){
    sp.curveLoop = false;
    sp.curveLoopInit = false;
    sp.afterTime = null;
}
function curveLoop(sp){
    if(!sp.curveLoop || !sp.curveTime){
        return false;  // curveLoop 属性决定是否开启无限循环的曲线运动
    }
    if(!sp.curveLoopInit){
        sp.curveLoopInit = true;
        // sp.startTime的状态标志也等同于初始化标志
        sp.speed = 1/sp.curveTime;
        sp.startTime  = sp.nowTime;
        if(sp.afterTime){
            // 通过 afterTime 来设置初始位置
            // 动画启动时，如果startTime小于nowTime，代表动画已经开始一段时间了，已经存在位移了
            sp.startTime -= sp.afterTime;
        }
    }
    sp.afterTime = sp.nowTime - sp.startTime;
    if(sp.afterTime >= sp.curveTime){
        sp.afterTime  = sp.afterTime%sp.curveTime;
        sp.startTime = sp.nowTime - sp.afterTime;  // 超出的时间已经照成了位移，必须把超出的时间，叠加到新的运动中
    }
    sp.distW && (sp.w = sp.minW + Math.pow(sp.afterTime*sp.speed,sp.curvePow)*sp.distW);
    sp.distH && (sp.h = sp.minH + Math.pow(sp.afterTime*sp.speed,sp.curvePow)*sp.distH);
    sp.distX && (sp.x = sp.startX + Math.pow(sp.afterTime*sp.speed,sp.curvePow)*sp.distX);
    sp.distY && (sp.y = sp.startY + Math.pow(sp.afterTime*sp.speed,sp.curvePow)*sp.distY);
};
//－－－－－－－－－－－－－－
//－－－－－ 事件 －－－－－
//－－－－－－－－－－－－－－

// ----- 画布上，一个触碰行为经历(h5eg游戏引擎教程) -----
// 第一阶段:
//   在触碰到画布时，先锁定事件精灵：
//     如果可能，将锁定一个添加了 touchstrat 事件的精灵
//     如果可能，将锁定一个添加了 touchmove 事件的精灵
//     如果可能，将锁定一个添加了 click 事件的精灵
//   如果存在多个精灵都添加了相同的事件，游戏引擎会选择 优先权最高的精灵 作为该事件精灵
//   如果锁定了 touchstrat事件的精灵，执行该精灵的 touchstrat事件函数
// 第二阶段:
//   如果发生了滑动，将触发第二阶段，否则直接进入最后阶段
//   完成第一阶段后，如果继续在画布上滑动，将触发 touchmove事件
//   如果锁定了 touchmove事件的精灵，执行该精灵的 touchmove事件函数
// 最后阶段:
//   触控结束，将进入对后阶段
//   如果锁定了 click 事件的精灵，执行该精灵的 click事件函数
//   （还有快速滑动事件未编写）

// ----- 取消默认行为 -----
function cancelDFEvent(){
    js(cvs,"touchstart",function(e){
        js.preventDefault(e);
        // 给body元素添加取消默认事件，会收到浏览器警告
    });
}
// ----- 给精灵添加事件 -----
// 事件类型：
// touchstrat , 初碰事件
// click, 点击事件
// touchmove  , 滑动事件
eg.addEvent = function(sp,type,func){
    if(!js.ckObjType(sp,Sprite) || !js.ckStr(type) || !js.ckFunc(func)){
        return false;
    }
    switch(type){
    case "click":
        sp.click = func;
        break;
    case "touchstart":
        sp.touchstart = func;
        break;
    case "touchmove":
        sp.touchmove = func;
        break;
    }
    eventSps.push(sp); // 所有添加了事件的精灵都存放到 eventSps 中
};
var touchstartTime  = null,
    touchendTime    = null,
    touchstartCoord = {},
    touchmoveCoord  = {},
    touchendCoord   = {},
    touchmoveDist   = {},    // 当前移动的触控点距离初始触控点的距离，数值分正负
    touchclickSp    = null,  // 指向触发点击事件的精灵
    touchstartSp    = null,  // 指向触发 touchstart 事件的精灵
    touchmoveSp     = null;  // 指向触发滑动事件的精灵
// ----- 锁定执行事件的精灵 -----
// 在触碰到画布时，就会锁定好执行事件的精灵(最上层的精灵优先)，一种类型的事件只会有一个精灵触发
js(cvs,"touchstart",function(e){
    touchstartTime = new Date();
    // ----- 获取刚触碰到画布时，触控点坐标 -----
    var e = js.getEvent(e);
    touchstartCoord.x = e.changedTouches[0].pageX;
    touchstartCoord.y = e.changedTouches[0].pageY;
    // ----- 锁定被选中的精灵 -----
    var crd = js.touchToElemDist(cvs,e), // 获取 触控点 相对于 画布左上角的坐标差
        sp  = null;
    crd.x   = parseInt(crd.x*coordSC);   // 坐标差 转成 画布比例值
    crd.y   = parseInt(crd.y*coordSC);
    for(var i=eventSps.length-1; i>=0; i--){
        sp = eventSps[i];
        if(!sp.showed){
            continue;
        }
        // 如果精灵要处于显示状态，检测被点击的坐标点是否在该精灵的区域
        if(crd.x > sp.x && crd.x < sp.x+sp.w && crd.y > sp.y && crd.y < sp.y+sp.h){
            // 锁定触发点击事件的精灵
            if(sp.click){
                if(!touchclickSp){
                    touchclickSp = sp;
                }else{
                    sp.zIndex > touchclickSp.zIndex && (touchclickSp = sp);
                }
            }
            // 锁定触发 touchstart 事件的精灵
            if(sp.touchstart){
                if(!touchstartSp){
                    touchstartSp = sp;
                }else{
                    sp.zIndex > touchstartSp.zIndex && (touchstartSp = sp);
                }
            }
            // 锁定触发滑动事件的精灵
            if(sp.touchmove){
                if(!touchmoveSp){
                    touchmoveSp = sp;
                }else{
                    sp.zIndex > touchmoveSp.zIndex && (touchmoveSp = sp);
                }
            }
        }
    }
    if(touchstartSp){
        touchstartSp.touchstart(sp);
    }
});
// ----- 执行实时滑动事件 -----
js(cvs,"touchmove",function(e){
    // 实时获取当前触控点坐标
    var e = js.getEvent(e);
    touchmoveCoord.x = e.changedTouches[0].pageX;
    touchmoveCoord.y = e.changedTouches[0].pageY;
    // 计算出 当前触控坐标 与 初始触控坐标 的距离差，值分正负
    touchmoveDist.x = touchmoveCoord.x - touchstartCoord.x;
    touchmoveDist.y = touchmoveCoord.y - touchstartCoord.y;
    // 执行事件
    if(touchmoveSp){
        touchmoveSp.touchmove(touchmoveSp,touchmoveDist);
    }
});
// ----- 执行锁定的事件精灵 -----
js(cvs,"touchend",function(e){
    var e = js.getEvent(e);
    touchendTime = new Date();
    // 获取离开画布时，触控点坐标
    touchendCoord.x = e.changedTouches[0].pageX;
    touchendCoord.y = e.changedTouches[0].pageY;
    if(touchstartCoord.x != touchendCoord.x || touchstartCoord.y != touchendCoord.y){
        // 初始坐标与离开坐标不相等，点击不生效
        // ------ 执行快速滑动事件 -----
    }else{
        // 初始坐标与离开坐标相等，点击生效
        // ------ 执行点击事件 -----
        if(touchclickSp){
            touchclickSp.click(touchclickSp);  // 在 touckstart 事件中，就已经锁定了触发 click事件 的精灵
        }
    }
    // 事件结束，释放本次锁定的事件元素
    touchstartSp = null;
    touchclickSp = null;
    touchmoveSp  = null;
});

////－－－－－－－－－－－－－－
////－－－－－ 接 口 －－－－－
////－－－－－－－－－－－－－－
// eg.w * eg.h ，绘图区大小
eg.showFps = showFps;
eg.showFPS = showFps;
eg.deg     = deg;
eg.newImg  = newImg;
eg.showLoadingBar = showLoadingBar;
eg.newSp    = newSp;
eg.drawImg  = drawImg;
eg.getPageDataArr = getPageDataArr;
// window.eg = {
//     cvs         : cvs,
//     moveCoord   : moveCoord,
//     rotateCoord : rotateCoord,
//     scaleCoord  : scaleCoord,
//     showFps    : showFps,
//     hideFps    : hideFps,
//     getFps     : getFps,
//     deg        : deg,
//     deg360     : deg360,
//     newImg     : newImg,
//     newAudio   : newAudio,
//     drawImg    : drawImg,
//     newSp      : newSp,
//     getRandom  : getRandom,
//     setTouchToEndSps : setTouchToEndSps,
//     setLandScapeMode : setLandScapeMode,
//     setAction        : setAction,
//     showLoadingBar   : showLoadingBar,
//     getInterval    : getInterval,
//     getAfterTime   : getAfterTime,
//     curveLoopStop  : curveLoopStop,
//     gameReady      : rsReady,
//     normalCoordSys : normalCoordSys,
//     cancelDFEvent  : cancelDFEvent,
//     addEvent       : addEvent
// };

//－－－－－－－－－－－－－－
//－－－ 屏 幕 翻 转 －－－
//－－－－－－－－－－－－－－
//// 这段代码主要是为了处理 横屏游戏 与 竖屏游戏
//var landScapeMode = false,       // 值为true代表切换为横屏模式
//    portaitMode   = false,       // 值为true代表切换为竖屏模式（默认竖屏模式）
//    cgRotate      = 0,           // 该值用来保存坐标系统被旋转的角度(为了兼容横屏与竖屏)
//    cgTranslate   = {x:0 ,y:0};  // 坐标系统被平移的位移(为了兼容横屏与竖屏)
//// 设置成横屏游戏（外部接口）
//function setLandScapeMode(){
//    landScapeMode = true;  // 将值设置为true，代表是横屏模式游戏
//    if(cvs.width < cvs.height){
//        renderArea_w = cvs.height;
//        renderArea_h = cvs.width;
//        eg.width  = renderArea_w;  // 外部接口
//        eg.height = renderArea_h;
//    }
//}
//// 设置成竖屏游戏（外部接口）
//function setPortaitMode(){
//    portaitMode = true;  // 将值设置为true，代表是横屏模式游戏
//    if(cvs.width > cvs.height){
//        renderArea_w = cvs.height;
//        renderArea_h = cvs.width;
//        eg.width  = renderArea_w;  // 外部接口
//        eg.height = renderArea_h;
//    }
//}
//// 兼容翻转，兼容横屏竖屏（ Flip : 翻转 ）
//function compatibleFlipFunc(){
//    // 还原坐标系统
//    brush.rotate(-cgRotate);
//    brush.translate(-cgTranslate.x ,-cgTranslate.y);
//    cgRotate = 0;
//    cgTranslate.x = 0;
//    cgTranslate.y = 0;
//    // 重置渲染区宽高
//    var size   = js.getElemSize(cvs);
//    cvs.width  = size.w *2;
//    cvs.height = size.h *2;
//    renderArea_w = cvs.width;
//    renderArea_h = cvs.height;
//    // 横屏模式，且当前屏幕处于竖屏状态
//    if(landScapeMode && cvs.width < cvs.height){
//        // 如果渲染区宽小于渲染区高，代表屏幕是竖屏
//        brush.translate(cvs.width,0);
//        brush.rotate(Math.PI/2);
//        cgRotate = Math.PI/2;
//        cgTranslate = {x:cvs.width, y:0};
//        renderArea_w = cvs.height;
//        renderArea_h = cvs.width;
//    }
//    // 竖屏模式，且当前屏幕处于横屏状态
//    if(portaitMode && cvs.width > cvs.height){
//        // 如果渲染区宽大于渲染区高，代表屏幕是横屏
//        brush.rotate(-Math.PI/2);
//        brush.translate(0,cvs.height);
//        cgRotate = -Math.PI/2;
//        cgTranslate = {x:0, y:cvs.height};
//        renderArea_w = cvs.height;
//        renderArea_h = cvs.width;
//    }
//    eg.width  = renderArea_w;  // 外部接口
//    eg.height = renderArea_h;
//}
//js.addEvent(window,"orientationchange",function(){
//    // window.orientation属性 仅支持苹果手机
//    // if(window.orientation == 0){
//    //     console.log("请切换到横屏模式下玩游戏");
//    // }
//    // console.log("翻转了屏幕");

//    // 屏幕翻转的时候要重置所有精灵的宽高
//    resetSpSize = true;
//});

});
