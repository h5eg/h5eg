/*

每个功能最好独立开，最好将耦合度降低为0

不用去计较代码的量，多写一段代码仅仅只是在内存中多了一小段指令，并不影响性能

游戏中的状态切换设计，灵活方便

画布分四个概念: css宽高, 坐标系统中的绘制空间, 坐标系统被精细化的倍数, 坐标系统的可视窗口

实际绘图宽高

初始化

启动引擎

加载资源

绘制精灵

*/
js.running(function(){
//－－－－－－－－－－－－－－
//－－－ 初 始 画 布 －－－
//－－－－－－－－－－－－－－
// 初始化页面布局
(function(){
    var html = js("html"),
        body = js("body");
    html.style.margin  = "0px";
    html.style.padding = "0px";
    body.style.margin  = "0px";
    body.style.padding = "0px";
    console.log("初始化页面布局成功");
}());
var cvs   = js("#coleee"),  // 默认画布元素(提供此功能，有些情况下，需要在页面中指定的canvas上进行绘制)
    brush = null,
    scale = 2,              // 坐标系统被精细化的倍数
    coordView  = {
        w : 0,       // 坐标系统的可视窗口宽高，会跟着坐标系统同步变动
        h : 0 
    };
if(!js.ckElemType(cvs,"canvas")){
    // 若是没有指定使用页面中已经存在画布，引擎会创建默认画布
    // 同时默认画布的初始大小为窗口的宽高，且相对窗口左上角定位
    cvs = js.newNode("canvas");
    cvs.style.position = "absolute";
    cvs.style.top  = "0px";
    cvs.style.left = "0px";
    console.log("创建画布成功");
    // 初始化画布大小
    setCvsSize(js.viewW, js.viewH);
}
if(!cvs){
    js.showErr("引擎启动失败，无法创建引擎默认画布");
    return false;
}
// 参数值: 代表画布的CSS大小
function setCvsSize(w,h){
    cvs.style.width  = w + "px";
    cvs.style.height = h + "px";
    cvs.width        = w * scale;
    cvs.height       = h * scale;
    coordView.w      = cvs.width;
    coordView.h      = cvs.height;
    console.log("设置了画布窗口大小, 宽:" + w + ",高:" + h);
    console.log("绘制空间在画布窗口上的投放比例:" + scale);
    console.log("坐标系统可视窗口的宽高:" + coordView.w + "*" + coordView.h);
};
// 获取画笔
brush = cvs.getContext("2d");
//－－－－－－－－－－－－－－
//－－－－－ 引 擎 －－－－－
//－－－－－－－－－－－－－－
var sps = [],         // 第0位精灵给了帧速率，第一位精灵给了进度条，这两个精灵会在引擎的最后位置绘制
    gameReady = false,          // 资源加载完毕后会被设置成true,在此加载资源时又会被设置成false
    startTime = null,
    nowTime   = null,           // 为所有精灵提供一致的当前时间
    lastTime  = null,           // 上一帧的时间
    interval  = 0,              // 每帧的时间间隔，大部分精灵的移动，几乎都会用到该时间
    afterTime = null,           // 代表游戏引擎已经启动了多长时间
    deg360    = Math.PI*2,
    deg       = Math.PI/180;    // 1 度
// 开启引擎世界
function loopAnimation(){
    nowTime  = new Date();
    interval = nowTime - lastTime;
    afterTime = nowTime - startTime;
    brush.clearRect(0,0,coordView.w,coordView.h); // 刷新背景, 原理: 将其颜色设置成全透明的黑色,从而使得canvas的背景可以透过该像素显示出来
    //－－－开始诠释所有精灵－－－
    //--(此处如果是多进程，速度就会快很多)--
    var i = 0;
    for(i =2; i<sps.length; i++){
        sps[i].nowTime = nowTime; // 为所有精灵分发一致的当前时间
        sps[i].paint();   // 绘制精灵
        sps[i].update();  // 更新精灵行为
    }
    if(sps.length>=2){
        for(i =0; i<2; i++){
            sps[i].nowTime = nowTime; // 为所有精灵分发一致的当前时间
            sps[i].paint();   // 绘制精灵
            sps[i].update();  // 更新精灵行为
        }
    }
    lastTime = nowTime;
    // 自调用 ,实现无限循环
    nextFlash(function(){
        loopAnimation();
    });
};
// 启动游戏引擎
(function(){
    startTime = new Date();
    lastTime  = startTime;
    loopAnimation();
}());
function getafterTime(){
    return afterTime;
}
function getInterval(){
    return interval;
}
//－－－－－－－－－－－－－－
//－－－－－ 精 灵 －－－－－
//－－－－－－－－－－－－－－
var Sprite = function(name){
    this.name = "none";
    if(js.ckStr(name)){
        this.name = name;
    }
    this.brush     = null;  //指定精灵的画布，引擎会为精灵自动绑定默认是主画布
    this.startTime = null;
    this.lastTime  = null;
    this.nowTime   = null;
    this.afterTime  = null;
    this.x         = 0;
    this.y         = 0;
    this.z         = 0;
    this.startX    = 0;
    this.startY    = 0;
    this.endX      = undefined;
    this.endY      = undefined;
    this.lastEndX  = undefined;
    this.lastEndY  = undefined;
    this.w         = undefined;
    this.h         = undefined;
    this.r         = 0;
    this.minW      = 0;
    this.minH      = 0;
    this.img       = null;
    this.imgX      = 0;
    this.imgY      = 0;
    this.imgW      = undefined;
    this.imgH      = undefined;
    this.curveTime = undefined;
    this.curvePow  = 2;
    this.curveLoop = false;
    this.curveLoopInit = false;
    this.distW     = 0;
    this.distH     = 0;
    this.distX     = 0;
    this.distY     = 0;
    this.nowAction         = [];      // 当前动作
    this.actionArr         = [];      // 当前动作组，数组的每个元素代表一个动作
    this.actionIndex       = 0;       // 指定当前显示动作组中的哪个动作
    this.updActionInterval = 100;     // 更新动作的时间间隔
    this.updActionLTime    = 0;       // 上次更新动作的时间
    this.count    = 0;
    this.deg      = 0;
    this.speedDeg = 0;
    this.text     = "";
    this.speed    = null;
    this.speedX   = null;
    this.speedY   = null;
    this.directionX = null;
    this.directionY = null;
    this.opacity    = 1;
    this.timer      = null;   // 计时器
    this.motionTypeX = "";    // 移动的方式
    this.motionTypeY = "";
    this.flashTime   = null;  // 此次动画需要耗费的时间
    this.moveX       = 0 ;    // 此次运动，已经移动的位移
    this.moveY       = 0 ;
    this.movingInit  = false;    // 用于检测，调用moving()函数时是否进行基本数据初始化
    this.showed      = true;     // 控制该精灵是否显示，精灵的 paint() 函数会通过该属性来判断 是否绘制该精灵
    this.actived     = true;     // 指定该精灵的状态： 静止 或 活动，update() 函数会通过该属性来判断，是否更新精灵状态
    // 绘制器: 绘制精灵自己
    // 更新器: 更新精灵的行为
    // painter(sp,brush) 会根据传递的精灵和画笔，绘制出该精灵
    // updater(sp) 根据传递的精灵，更新该精灵的行为
    this.painter  = null;
    this.updater  = null;
    this.behavior = "";     //每个精灵都有很多行为，该属性用来控制精灵当前要执行的行为(字符串比较方式有点影响性能)
};
Sprite.prototype = {
    show : function(){
        this.showed = true;
    },
    hide : function(){
        this.showed = false;
    },
    active : function(){
        this.actived = true;
    },
    stop : function(){
        this.actived = false;
    },
    stand : function(){        // 停止精灵的移动
        this.endX = null;
        this.endY = null;
    },
    // 绘制自己
    paint : function(){
        if(this.painter && this.showed){
            // 在精灵使用画笔前，先保存画笔属性，精灵使用完画笔后还原画笔，从而不影响其他精灵的绘制
            this.brush.save();
            this.brush.beginPath();
            this.painter(this,this.brush); // painter指向的是外部函数，因此需要将 精灵 跟 画笔 作为参数传递出去
            this.brush.restore();
        }
    },
    // 更新自己
    update : function(){
        if(this.actived){
            if(this.updater){
                // 提供 updater()，目的是为了更新
                this.updater(this);   // updater指向的是外部函数，因此需要将 精灵 作为参数传递出去
            }
            updateAction(this);  // 更新动作
            moving(this);        // 更新位置
            curveLoop(this);     // 循环曲线运动
        }
    },
    // 此方式给精灵设置图片，图片加载完毕后，会默认设置绘制图片的宽高
    // 默认绘制大小为坐标系统可视窗口的 1/4 大小
    setImg : function(img){
        this.img = img;
        var self = this;
        var setDrawSize = setInterval(function(){
            if(img.loaded){
                if(!js.ckNum(self.w)){
                    self.w = coordView.w;
                }
                if(!js.ckNum(self.h)){
                    self.h = coordView.h;
                }
                if(!js.ckNum(self.imgW)){
                    self.imgW = img.width;
                }
                if(!js.ckNum(self.imgH)){
                    self.imgH = img.height;
                }
                clearInterval(setDrawSize);
                console.log("精灵"+ self.name + "的图片加载完毕...");
            }
        },1000);
        // 每秒查询一次，图片加载完毕后就设置绘制大小，并结束查询
    },
    // 绘制图片的某块区域
    chImgArea : function(arr){
        if(!js.ckArr(arr) || arr.length < 4){
            js.showErr("chImgArea(arr), 操作精灵"+this.name+"时，参数arr不正确");
            return;
        }
        this.imgX = arr[0];
        this.imgY = arr[1];
        this.imgW = arr[2];
        this.imgH = arr[3];
    }
};
// 默认的精灵绘制函数
function drawImg(sp,brush){
    if(sp.img&&sp.img.loaded){
        brush.drawImage(sp.img,sp.imgX,sp.imgY,sp.imgW,sp.imgH, sp.x,sp.y,sp.w,sp.h);
    }
}
function newSp(name){
    if(!js.ckStr(name)){
        js.showErr("newSp(name,model), 创建精灵，未给精灵赋予名称 ");
        return false;
    }
    var sp     = new Sprite(name);
    sp.brush   = brush;    // 默认将给精灵绑定主画布，若需要指定其他画布，定义完精灵后修改精灵的brush属性即可
    sp.painter = drawImg;  // 精灵的默认绘制方法
    sps.push(sp);          // 将精灵添加到引擎世界中 (注意：此时精灵的基本属性都没有设置，因此精灵的 running与show 都应该默认设置为false)
    return sp;
}
//－－－－－－－－－－－－－－
//－－－－－ 帧速率 －－－－－
//－－－－－－－－－－－－－－
(function(){
    var sp = newSp("fps");
    sp.hide();
    sp.x   = 20;
    sp.y   = 40;
    sp.val = 60;
    sp.painter = function(sp,brush){
        brush.fillStyle = "rgb(50,250,50)";
        brush.font = "30px 宋体";
        brush.fillText("fps:"+parseInt(sp.val), sp.x, sp.y);
    };
    sp.updater = function(sp){
        sp.count++;
        if(!sp.lastTime){
            sp.lastTime = sp.nowTime;
        }
        //1秒刷新一次帧速率的值
        if(sp.nowTime - sp.lastTime > 1000){
            sp.val   = sp.count;
            sp.count = 0;  //清零，重新统计
            sp.lastTime  = sp.nowTime;
        }
    };
}());
function showFps(){
    sps[0].show();
}
function hideFps(){
    sps[0].hide();
}
function getFps(){
    return sps[0].val;
}
//－－－－－－－－－－－－－－
//－－－－ 进 度 条 －－－－
//－－－－－－－－－－－－－－
// 视觉效果上:
// 引擎一启动就开始绘制进度条
// 实现方式:
// 引擎一启动就开始绘制所有精灵，进度条精灵放在最后绘制，从而遮挡住了其他精灵，实现只显示加载进度
// 开发人员在设置好所有要加载的资源后，调用 showLoadingBar() 方法来告知图片资源已经设置完毕，开始绘制进度条
// 进度条加载完毕后，会绘制和更新
var loadingBarSp = null,
    sourceNum    = 0;
// 显示资源加载进度条
function showLoadingBar(){
    eg.gameReady = false;
    loadingBarSp.show();
    loadingBarSp.active();
    console.log("启动进度条");
}
(function(){
    var sp = newSp("loadingBar");
    loadingBarSp = sp;
    sp.hide();  // 进度条默认隐藏，调用显示进度条时才显示
    sp.stop();  // 进度条默认不刷新, 设置好所有资源后, 调用显示进度条时才刷新
    sp.degPers  = 6;         // 最外的旋转分6份
    sp.degPer   = Math.PI/3; // 每份间隔度数
    sp.speedDeg = Math.PI/2000; // 4秒转一圈
    sp.nowper   = 0.05;            // 已加载的资源进度百分比  count/sourceNum
    sp.drawPer  = 0;         // 当前进度条已绘制的百分比
    sp.count    = 0;            // 统计目前已经加载的图片资源数量，总数量是 sourceNum
    sp.painter  = style1; // 进度条可以是多种展现方式，因此做成外部函数来实现
    sp.updater =  function(){
        if(!sp.lastTime){
            sp.lastTime = sp.nowTime;
        }
        // 旋转坐标，用于绘制外层旋转块使用
        sp.deg += interval*sp.speedDeg;
        if(sp.deg>=deg360){
            sp.deg = sp.deg - deg360;
        }
        // 以每秒0.015的速度，绘制进度条
        sp.drawPer += 0.015; // 1秒播放60帧，最快一秒加载完进度条，100/60 -> 1.666
        sp.nowper = sp.count/sourceNum;
        if(sp.drawPer > sp.nowper){   // 进度条的绘制进度，不能大于当前图片的加载进度
            sp.drawPer = sp.nowper;
        }
        if(sp.drawPer >= 1){
            //  重置所有状态，等待下次调用
            sp.hide();  // 停止绘制
            sp.stop();  // 资源加载完毕，停止更新
            sp.lastTime = null;
            sp.drawPer  = 0;
            sourceNum   = 0;
            sp.count    = 0;
            eg.gameReady   = true;
            console.log("关闭进度条");
        }
        sp.lastTime = sp.nowTime;
    };
    // 进度条1
    function style1(){
        sp.x = coordView.w/2;
        sp.y = coordView.h/2;
        sp.r = coordView.w*0.2;
        // 避免进度条精灵绘制的太大，进度条的半径为窄屏的五分之一
        if(coordView.w > coordView.h){
            sp.r = coordView.h*0.2;
        }
        // 暗色背景
        brush.fillStyle = "rgb(53,78,109)";
        brush.fillRect(0,0,coordView.w,coordView.h);
        // 画线宽
        brush.lineWidth  = 45;
        // 绘制外圈
        brush.beginPath();
        brush.arc(sp.x,sp.y,sp.r,0,Math.PI*2);
        brush.strokeStyle = "rgb(28,42,69)";
        brush.stroke();
        // 绘制旋转线(目的:提升用户体验)
        brush.save();
        // 平移坐标，旋转坐标
        brush.translate(coordView.w/2,coordView.h/2);
        brush.rotate(sp.deg);
        brush.strokeStyle = "rgba(0,204,205,0.5)";
        for(var i=0;i<sp.degPers;i++){
            brush.beginPath();
            brush.arc(0,0,sp.r,i*sp.degPer,i*sp.degPer+deg);
            brush.stroke();
        }
        brush.restore();
        // 绘制内圈
        brush.beginPath();
        brush.arc(sp.x,sp.y,sp.r-brush.lineWidth,0,Math.PI*2);
        brush.strokeStyle = "rgb(44,64,91)";
        brush.stroke();
        // 绘制进度条圈
        brush.beginPath();
        brush.arc(sp.x,sp.y,sp.r-brush.lineWidth,0,Math.PI*2*sp.drawPer);
        brush.strokeStyle = "rgb(132,233,150)";
        brush.stroke();
        // 绘制百分比数值
        brush.shadowBlur  = 0;
        brush.font = "40px Helvetica";
        brush.textAlign = "center";
        brush.textBaseline = "middle";
        brush.fillStyle = "rgb(250,250,250)";
        brush.fillText(""+parseInt(sp.drawPer*100)+"%",sp.x,sp.y);
    }
}());
// (建议)所有图片资源都需要通过该方式来绘制
// 该方式会给图片对象添加状态标记 loaded，用于检测图片是否加载完毕
// 同时记录图片资源的数量
function newImg(src){
    if(!js.ckStr(src)){
        js.showErr("ce.newImg(src),请填写参数src");
        return false;
    }
    var img = new Image();
    img.src = src;
    img.loaded = false;
    js.addEvent(img,"load",function(){
        img.loaded = true;
        loadingBarSp.count++;  // 每加载完一张图片，计数器加一
    });
    sourceNum++;      // 每创建一个图片资源，资源总数加一
    return img;
}
function newAudio(src){
    var audio = new Audio();
    audio.src = src;
    audio.loaded = false;
    js.addEvent(audio,"loadedmetadata",function(){
        audio.loaded = true;
        loadingBarSp.count++;  // 每加载完一个资源，计数器加一
    });
    sourceNum++;      // 每创建一个音乐资源，资源总数加一
    return audio;
}
//－－－－－－－－－－－－－－
//－－－－－ 布 局 －－－－－
//－－－－－－－－－－－－－－
// 平移坐标系统
function translateFunc(x,y,painter){
    painter = painter || brush;
    painter.translate(x,y);
}
// 旋转坐标系统
function rotateFunc(deg,painter){
    painter = painter || brush;
    painter.rotate(deg);
}
// 缩放坐标轴
function scaleFunc(pow1,pow2,painter){
    painter = painter || brush;
    painter.scale(pow1,pow2);
}
//－－－－－－－－－－－－－－
//－－－ 屏 幕 翻 转 －－－
//－－－－－－－－－－－－－－
// 还原默认坐标系统
function restoreCoordSys(){
    brush.translate(0,0);
    console.log("坐标系统还原到了原始坐标(0,0)");
    brush.rotate(0);
    console.log("坐标系统还原到了 0 度");
}
// 屏幕翻转事件
js.addEvent(window,"orientationchange",function(){
    // window.orientation属性 仅支持苹果手机
    // if(window.orientation == 0){
    //     console.log("请切换到横屏模式下玩游戏");
    // }
    console.log("翻转了屏幕");
    // 屏幕翻转了，页面也被翻转了，此时需要重置画布大小(全部)，再次设置为全屏
    // var num = js.viewW;
    // js.viewW = js.viewH;
    // js.viewH = num;
    // setCvsSize(js.viewW,js.viewH);
    // 还原坐标系统
    // restoreCoordSys();
    // 如果是横屏游戏，每次翻转屏幕都监测，并设置为横屏
    // setLandScapeMode();
});

// 横屏游戏，一开始就将坐标系统切换成横屏绘制，从而引导用户通过横屏方式来玩游戏
// 如果用户限制了手机的屏幕内容旋转，直接开始玩游戏即可
// 翻转了手机，画布的宽高
// 无论玩家是横屏玩还是竖屏玩，都进行横屏绘制

// 监测并切换为横屏
function setLandScapeMode(){
    // 屏幕是横屏还是竖屏,以窗口的宽高作为唯一的判断依据
    if(js.viewW < js.viewH){
        // 画布绘图去的宽高调换，画布的css宽高不变
        console.log("横屏游戏.");
        brush.translate(coordView.w,0);
        console.log("坐标系统向右平移:" + coordView.w);
        brush.rotate(Math.PI/2);
        console.log("坐标系统顺时针旋转:90度");
        // 替换坐标系统的可视窗口宽高
        var num     = coordView.w;
        coordView.w = coordView.h;
        coordView.h = num;
    }
}
//－－－－－－－－－－－－－－
//－－－－－ 工 具 －－－－－
//－－－－－－－－－－－－－－
// 图片按宽度来缩放
function scaleW(w,h){

}
// 图片按高度来缩放
function scaleH(){

}
function getRandom(min,max){
    if(!js.ckNum(min)){
        showErr("请指定随机数的最小值");
    }
    if(!js.ckNum(max)){
        showErr("请指定随机数的最大值");
    }
    // Math.random() 会产生 0 < val < 1 的值
    // Math.random() * 10 的随机值就在 0 < val < 10 之间
    // Math.floor() 将数值向下舍入为最接近的整数
    max++;
    return Math.floor(min + Math.random() * (max-min));
}
// 待整理
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
//－－－－－ 动 作 －－－－－
//－－－－－－－－－－－－－－
// 切换动作组
// 参数: 图片, 动作组, 切换时间间隔
function setAction(sp, actionArr, interval){
    if(!js.ckArr(actionArr)){
        js.showErr("精灵" + sp.name +", setAction(img,actionArr), 参数错误");
        return;
    }
    sp.actionArr   = actionArr;
    sp.actionIndex = 0;
    if(js.ckNum(interval)){
        // 默认100ms
        sp.updActionInterval = interval;
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
    if(sp.nowTime - sp.updActionLTime < sp.updActionInterval){
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
// speedX , speedY         : 精灵的移动速度，若不显示设置默认值为 50px/1s
// 引擎的 interval 属性值
var moving = (function(){
    // 一个很独立的函数
    // 给予一个速度，转换成 X轴速度 和 Y轴速度，实现 X轴 和 Y轴同步移动
    var setSpeed = (function(){
        // 此处通过 函数加闭包 的方式 实现了模块
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
            distX = Math.abs(sp.endX - sp.x);
            distY = Math.abs(sp.endY - sp.y);
            dist  = Math.sqrt(Math.pow(distX,2) + Math.pow(distY,2));
            time  = dist / sp.speed;
            sp.speedX = distX/time;
            sp.speedY = distY/time;
        }
    }());
    // 一个很独立的函数
    // 计算精灵的移动方向，跟据 当前坐标 和 目的坐标来 断定移动方向
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
    if(sp.distW){
        sp.w = sp.minW + Math.pow(sp.afterTime*sp.speed,sp.curvePow)*sp.distW;
    }
    if(sp.distH){
        sp.h = sp.minH + Math.pow(sp.afterTime*sp.speed,sp.curvePow)*sp.distH;
    }
    if(sp.distX){
        sp.x = sp.startX + Math.pow(sp.afterTime*sp.speed,sp.curvePow)*sp.distX;
    } 
    if(sp.distY){
        sp.y = sp.startY + Math.pow(sp.afterTime*sp.speed,sp.curvePow)*sp.distY;
    }
};


// 取消浏览器默认行为
js.addEvent(document.body,"touchstart",function(e){
    e = js.getEvent(e);
    js.preventDefault(e); 
});

//－－－－－－－－－－－－－－
//－－－－－ 接 口 －－－－－
//－－－－－－－－－－－－－－
window.eg = {
    view      : coordView,
    translate : translateFunc,
    rotate    : rotateFunc,
    scale     : scaleFunc,
    showFps   : showFps,
    hideFps   : hideFps,
    getFps    : getFps,
    deg       : Math.PI/180,
    newImg    : newImg,
    newAudio  : newAudio,
    drawImg   : drawImg,
    newSp     : newSp,
    getRandom : getRandom,
    setCvsSize : setCvsSize,
    setTouchToEndSps : setTouchToEndSps,
    setLandScapeMode : setLandScapeMode,
    setAction        : setAction,
    showLoadingBar   : showLoadingBar,
    getInterval : getInterval,
    getafterTime  : getafterTime,
    curveLoopStop : curveLoopStop,
    gameReady     : gameReady
};

});
