
/*
------- 布局兼容 实现原理 --------
原型图是竖屏设计: 背景 和 图片 以及 Y轴坐标 按照高的比例
原型图是横屏设计: 就按照宽的比例

这样就先实现了 所有图片在 在某一个 坐标轴(X轴/Y轴) 上的位置摆放 和 大小渲染

接着再对 图片的 另一个坐标轴(X轴/Y轴) 的位置进行细致调整，从而实现这些图片的整体布局

最后对背景图的坐标进行调整，实现 背景图 跟 这些图片 在位置上 吻合

背景图也按照 同样的的比例 来缩放，为了满足背景图能全屏显示，必须将背景图的原型图设计的大些

再通过关 对背景位置的调整，让背景 跟 已渲染的图片能吻合上

关于屏幕翻转：可以通过 先平移坐标，再旋转坐标 来实现兼容


－－－－背景 和 图片 宽高渲染－－－－
竖屏原型图: 宽＊scaleH => 渲染宽 , 高＊scaleH => 渲染高
横屏原型图: 宽＊scaleW => 渲染宽 , 高＊scaleW => 渲染高

－－－－图片位置－－－－
竖屏原型图: 
图片Y ＊ scaleH => 渲染位置Y
图片X，根据实际需求来调整. 靠左 或 靠右 或 居中，屏幕 中间位置 到 图片中间位置 等多种方式布局，具体根据实际情况

横屏原型图 跟 竖屏原型图 设计相似
*/
js.running(function(){

//-----游 戏 引 擎-----
// 引擎会自动创建默认画布，同时设置画布为全屏大小
// 全力负责: 无休止的 绘制 和 更新 所有添加到引擎中的精灵，直到引擎停止
// 为所有精灵提供一致的当前时间
// 提供本机的帧速率
// 为所有精灵提供一致的每帧时间差,所有精灵的运动就用到每帧的时间差
// 提供创建精灵的方法，创建精灵的同时，给精灵绑定默认画布
// 提供创建图片对象的方法
// --新增--
// 负责移动所有的精灵，所有精灵一旦被创建，就始终处于运动状态
// 所谓的静止状态 实际是目标坐标等同于当前坐标 或是 目标坐标(endX,endY)等于 null
// 通过调用精灵的 stand()方法，可以让精灵站在原地

//引擎原型，仅在此代码块中有效
var Engine = function (){
    var sf = this;
    sf.err = function(str){
        console.log("err: "+str);
    }
    //默认画布: 引擎会自动检索HTML节点，将 id 为 coleee 的canvas元素作为画布
    //如果不存在该画布，引擎会自动创建一个画布
    sf.cvs = js("#coleee");  //为游戏上下文环境，提供一个用来访问 canvas 的接口
    if(!js.ckElemType(sf.cvs,"canvas")){
        sf.cvs = js.newNode(document.body,"canvas");
        if(!sf.cvs){
            console.log("err:引擎启动失败，无法实现为引擎指定默认的画布");
            return false;
        }
    }
    sf.brush = sf.cvs.getContext("2d");

    //画布大小: 默认为全屏，此处指的是css大小，即在浏览器中呈现的大小
    //关于canvs图片粗糙问题
    //将canvas元素的 css大小 设置为全屏
    //将canvas 画布大小 设置成 css大小的 两倍
    sf.cvs.style.width  = js.viewW + "px";
    sf.cvs.style.height = js.viewH + "px";
    sf.drawScale = 2;
    sf.cvs.width  = js.viewW * sf.drawScale;   //默认将画布大小设置为屏幕大小
    sf.cvs.height = js.viewH * sf.drawScale;
    sf.cvsW = sf.cvs.width;
    sf.cvsH = sf.cvs.height;

    //H5游戏，需要调用该函数，确保画布宽最大为640，且左右居中
    sf.setSize_h5 = function(){
        //初始化画布宽高
        //最大宽为640且水平居中，高等同于屏幕高
        if(js.viewW > 640){
            sf.cvs.style.width  = "640px";
            sf.cvs.width = 640 * sf.drawScale;
            sf.cvsW = sf.cvs.width;
            sf.cvs.style.position = "absolute";
            sf.cvs.style.top = "0px";
            sf.cvs.style.left = (js.viewW-640)/2 + "px";
        }
    };
    //创建图片资源
    sf.newImg = function(src){
        if(!js.ckStr(src)){
            sf.err("ce.newImg(src),请填写参数src");
            return false;
        }
        var img = new Image();
        img.src = src;
        img.loaded = false;
        //同时给图片添加 loaded 属性，用于检测图片是否加载完毕
        img.onload = function(){
            img.loaded = true;
        }
        return img;
    };
    //切换精灵表单元
    sf.chSpSheetUnit = function(sp,arr){
        if(!js.ckObjType(sp,Sprite)){
            sf.err("ce.chSpSheetUnit(),请填写参数src");
            return false;
        }
        sp.orgX = arr[0];
        sp.orgY = arr[1];
        sp.orgW = arr[2];
        sp.orgH = arr[3];
    };
    // 获取屏幕上 所有触控点 相对于坐标原点的坐标差(x,y)
    // 此坐标差, 就代表该触控点在坐标系统上的坐标位置
    sf.getTouchDots = function(e){
        //获取 画布的四边 相对于视窗口左上角的间距(存在正负)
        //此处用到了画布的四边，是为了兼容 PC WEB 端的 H5 游戏
        var cvsRect = sf.cvs.getBoundingClientRect(),
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
    // 提供了为精灵自动实现: 点击屏幕，精灵移动到指定点击坐标
    // 目前只提供了单点触控，根据需求会继续提供多点触控
    sf.addTouchToEndSps = [];
    sf.addTouchToEnd    = function(sp){
        sf.addTouchToEndSps.push(sp);
        //后期提供移除效果
    }
    js.addEvent(sf.cvs,"touchstart",function(e){
        // 获取触控点相对于画布左上角原点的坐标
        touchDot   = eg.getTouchDots(e)[0];
        // 小bug，实际画布绘图去大小是cvs元素大小的两倍
        // 因此在获取到触控点时，应该把触控点坐标乘2才能得到精灵在画布上的坐标
        for(var i=0; i<sf.addTouchToEndSps.length; i++){
            sf.addTouchToEndSps[i].endX = touchDot.x * 2 - sf.addTouchToEndSps[i].w/2;
            sf.addTouchToEndSps[i].endY = touchDot.y * 2 - sf.addTouchToEndSps[i].h/2;
            console.log(sf.addTouchToEndSps[i].name+ ".endX:" + sf.addTouchToEndSps[i].endX);
            console.log(sf.addTouchToEndSps[i].name+ ".endY:" + sf.addTouchToEndSps[i].endY);
        }
    });
    
    //所有精灵都存放到 sps 中
    sf.sps   = [];
    //将精灵添加到引擎中的函数
    sf.newSp = function(name,model){
        if(!js.ckStr(name)){
            console.log("err: newSp(name,model), 创建精灵，未给精灵赋予名称 ");
            return false;
        }
        if(!js.ckObj(model)){
            console.log("err: newSp(name,model), 创建精灵，未给精灵指定模板 ");
            return false;
        }
        var sp   = new Sprite(name,model); //新建精灵
        sp.brush = sf.brush; //默认将给精灵绑定主画布，若需要指定其他画布，定义完精灵后修改精灵的brush属性即可
        sf.sps.push(sp);     //将精灵添加到引擎世界中 (注意：此时精灵的基本属性都没有设置，因此精灵的 running与show 都应该默认设置为false)
        return sp; //返回精灵
    };
    //给精灵提供一个，仅用来渲染图片的模版
    sf.drawImgModel = {
        paint : function(sp,brush){
            if(sp.img.loaded){
                brush.drawImage(sp.img,sp.sheetX,sp.sheetY,sp.orgW,sp.orgH, sp.x,sp.y,sp.w,sp.h);
            }
        }
    };
    //文本绘制器，暂时放一边
    //指定绘制区域(sp.x ,sp.y ,sp.w ,sp.h)，行间距(sp.lineHeight)，是否排序(sp.sort)
    //字体色(sp.color,不写默认黑色)，字体大小(sp.fontSize, 不写默认15, 值无单位，就是数值)
    sf.drawText = function(sp,text){
        //1.点击star按钮进入游戏
        //2.倒计时3秒后，点击下方随机出现的足球，进行射门。
        //3.射门时间为10秒，一起帮国足进球吧！
        //4.游戏完成后点击右上角进行分享，为国足助力。

        //检测参数
        if(!js.ckObj(sp) || !js.ckStr(text)){
            return false;
        }
        //获取字体个数(应该需要先进行转换，因为会遇到换行符，而换行符不需要打印)
        var length   = text.length,
            txtX     = 0,
            fontSize = 14;
        //设置字体色
        sp.brush.fillStyle = "rgb(25,25,25)"; //默认字体色
        if(sp.color){
            sp.brush.fillStyle = sp.color;
        }
        //设置字体大小
        sp.brush.font = ""+ fontSize + "px Helvetica";
        if(sp.fontSize){
            fontSize = sp.fontSize;
            sp.brush.font = "" + sp.fontSize + "px Helvetica";
        }
        //设置字体
        if(sp.fontStyle){
            sp.brush.font = "" + sp.fontSize + "px " + sp.fontStyle;
        }
        //循环输出每个字
        for(var i=0; i<length; i++){
            txtX = i * fontSize;
            sp.brush.fillText(text[i], sp.x + txtX, sp.y);
        }  
    };

    sf.running   = false;   //控制游戏引擎的启动和停止。游戏引擎一般都是启动后就永不停止
    sf.startTime = null;
    sf.nowTime   = null;
    sf.lastTime  = null;    //上一帧开始的时间，目前还用不到引擎的 lastTime 和 interval
    sf.interval  = 0;       //每帧的时间间隔
    sf.tripTime  = null;    //代表游戏引擎已经启动了多长时间

    sf.fps       = 60;      //帧速率，默认值60
    sf.fpsCount  = 0;       //每次刷新都会自增，用来统计每秒的刷新次数，每过一秒都会被重置为0
    sf.fpsTime   = 0;       //纪录上次 刷新帧速率的时间
    sf.fpsShow   = false;   //是否在画布左上角 显示 帧速率

    sf.deg360    = Math.PI*2;     // 360度对应的数值
    sf.deg       = Math.PI/180;   // 1 度
    
    //擦除画布，原理: 将其颜色设置成全透明的黑色,从而使得canvas的背景可以透过该像素显示出来
    sf.clearBrush = function(){
        sf.brush.clearRect(0,0,sf.cvs.width,sf.cvs.height);
    };
    sf.showFpsFunc = function(){
        sf.brush.save();
        sf.brush.beginPath();
        sf.brush.fillStyle = "rgb(50,250,50)";
        sf.brush.font = "30px 宋体";
        sf.brush.fillText("fps:"+parseInt(sf.fps),20, 40);
        sf.brush.restore();
    };
    //启动游戏引擎
    sf.Run  = function(){
        sf.running   = true;
        sf.startTime = new Date();
        sf.lastTime  = sf.startTime;
        sf.fpsTime   = sf.startTime;
        sf.loopAnimation();
    };
    sf.loopAnimation = function(){
        sf.nowTime  = new Date();
        sf.interval = sf.nowTime - sf.lastTime;
        sf.tripTime = sf.nowTime - sf.startTime;
        sf.clearBrush(); //刷新背景
        //诠释所有精灵
        for(var i =0; i<sf.sps.length; i++){
            //为所有精灵分发一致的当前时间
            sf.sps[i].nowTime = sf.nowTime;
            //绘制精灵
            sf.sps[i].paint();
            //更新精灵行为
            sf.sps[i].update();
            //移动精灵
            sf.moving(sf.sps[i]);
        }
        //帧速率在精灵绘制完毕后才绘制，是为了避免被精灵图像覆盖
        if(sf.fpsShow){
            //判断是否显示 帧速率
            sf.fpsCount++;
            //1秒刷新一次帧速率的值
            if(sf.nowTime - sf.fpsTime > 1000){
                sf.fps      = sf.fpsCount;
                sf.fpsCount = 0;  //清零，重新统计
                sf.fpsTime  = sf.nowTime;
            }
            sf.showFpsFunc();
        }
        sf.lastTime = sf.nowTime;
        //自调用 ,实现无限循环
        if(sf.running){
            nextFlash(function(){
              sf.loopAnimation();
            });
        }
    };
    //停止引擎
    sf.Stop = function(){
        sf.running = false;
    };
    //设计精灵的移动方向，跟据 当前坐标 和 目的坐标来 断定移动方向
    sf.setDirectionX = function(sp){
        if(sp.x < sp.endX){//增大
            sp.directionX = 1;
        }else{//减小
            sp.directionX = 0;
        }
    };
    sf.setDirectionY = function(sp){
        if(sp.y < sp.endY){//增大
            sp.directionY = 1;
        }else{//减小
            sp.directionY = 0;
        }
    };
    // 让移动实现 X轴 和 Y轴同步
    // 获取当前坐标点 到 终点坐标 其X轴上 和 Y轴上的间距
    // 假设 Y轴上 的位移距离比较长，就讲 speed 赋值给 speedY
    // X轴上的速度 speedX = distX/(distY/speedY) ，路程除以时间得出速度
    sf.setSpeed = function(sp){
        var distX = Math.abs(sp.endX - sp.x),
            distY = Math.abs(sp.endY - sp.y),
            dist  = Math.sqrt(Math.pow(distX,2) + Math.pow(distY,2)),
            time  = dist / sp.speed;
        sp.speedX = distX/time;
        sp.speedY = distY/time;
    };
    //--- 移动精灵 ---
    //启动函数的条件: 当前坐标 和 终点坐标 都被显示指定
    //此移动原理: 根据 每帧的时耗 和 速度 来计算位移的，时耗统一使用引擎的 interval
    //涉及的精灵属性
    // x , y , endX , endY     : 这四个属性必须显示指定
    // lastEndX , lastEndY     : 这两个属性会在精灵移动时被自动设置，如果endX或endY值变更了，lastEndX和lastEndY也会更新
    // directionX , directionY : 决定精灵移动的方向，精灵移动时，会根据当前坐标跟终点坐标自动进行初始化
    // speedX , speedY         : 精灵的移动速度，若不显示设置默认值为 50px/1s
    // 引擎的 interval 属性值
    // -- 新增 --
    // X轴 和 Y轴 同步，同时移动到终点坐标
    // 新增 speed 属性，该速度作为 x 和 y 中距离长的速度
    // 距离短的速度，根据 距离/时间 来获取
    //-- 新增需求 --
    //如果移动过程中，遇到了多个转折点，将转折点做成一组终点坐标
    //按顺序让精灵依次移动到每个终点坐标
    sf.moving = function(sp){
        //检测目标坐标是否设定，未设定则不移动精灵
        //移动精灵，必须 x, y, endX, endY 都指定才行
        // -- 性能优化 --
        // 或判断 的效率会更高些，只要前面一个条件为true，就不回去执行后面的条件
        // 将判断 endX 和 endY 提前，可以减少判断的次数，x 和 y几乎所有精灵都会有，但是 endX 和 endY 很多精灵都不会设置
        if( !js.ckNum(sp.endX) || !js.ckNum(sp.endY) ||!js.ckNum(sp.x) || !js.ckNum(sp.y)){
            return false;
        }
        //如果当前坐标等于终点坐标，直接返回
        if(sp.x == sp.endX && sp.y == sp.endY){
            return false;
        }
        //初始化相关参数
        if(!sp.movingInit){
            //初始化 lastEndX 和 lastEndY, 这两个值代表上次指定的终点
            if(!js.ckNum(sp.lastEndX) || !js.ckNum(sp.lastEndY)){
                sp.lastEndX = sp.endX;
                sp.lastEndY = sp.endY;
            }
            //初始化方向移动方向(X轴上的移动方向 和 Y轴上的移动方向)
            if(sp.directionX != 0 && sp.directionX != 1){
                sf.setDirectionX(sp);
            }
            if(sp.directionY != 0 && sp.directionY != 1){
                sf.setDirectionY(sp);
            }
            //初始化速度，仅在没有设置速度的前提下，给予一个默认速度
            if(!js.ckNum(sp.speed)){
                sp.speed = 0.05; //一秒移动50像素
            }
            //设置 X轴 和 Y轴 上的速度
            sf.setSpeed(sp);
            //标记已初始化
            sp.movingInit = true;
        }
        //每次都检测终点位置
        //如果终点位置改变了 就 重新调整方向
        //重新设置 X轴上 和 Y轴上 的速度
        if(sp.lastEndX != sp.endX || sp.lastEndY != sp.endY){
            sp.lastEndX = sp.endX;
            sp.lastEndY = sp.endY;
            sf.setDirectionX(sp);
            sf.setDirectionY(sp);
            sf.setSpeed(sp);
        }
        //--移动精灵--
        if(sp.x != sp.endX){ //如果移动到终点，则不执行移动代码(加个判断提升性能)
            if(sp.directionX == 1){
                sp.x += sf.interval * sp.speedX;
                if(sp.x >= sp.endX){
                    sp.x = sp.endX;
                }
            }else{
                sp.x -= sf.interval * sp.speedX;
                if(sp.x <= sp.endX){
                    sp.x = sp.endX;
                }
            }
        }
        if(sp.y != sp.endY){ //如果移动到终点，则不执行移动代码(加个判断提升性能)
            if(sp.directionY == 1){
                sp.y += sf.interval * sp.speedY;
                if(sp.y >= sp.endY){
                    sp.y = sp.endY;
                }
            }else{
                sp.y -= sf.interval * sp.speedY;
                if(sp.y <= sp.endY){
                    sp.y = sp.endY;
                }
            }
        }
    };
};
//-----游 戏 精 灵 模 版-----
//希望创建精灵的时候，就可以自动将精灵添加到引擎中
var Sprite = function(name,model){
    this.name = "none";
    if(js.ckStr(name)){
        this.name = name;
    }
    this.brush = null;  //为精灵指定画布，引擎会为精灵自动绑定默认是主画布
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.orgX = 0;
    this.orgY = 0;
    this.orgW = 0;
    this.orgH = 0;
    this.w = 0;
    this.h = 0;
    this.r = 0;
    this.deg      = 0;
    this.speedDeg = 0;
    this.img    = null;
    this.imgSrc = "";
    this.text   = "";
    this.startX = 0;
    this.startY = 0;
    this.lastEndX = null;
    this.lastEndY = null;
    this.endX     = null;
    this.endY     = null;
    this.directionX = null;
    this.directionY = null;
    this.distX  = 0;   //起始位置 到 终点位置的 位移，必须是正数 Math.abs()
    this.distY  = 0;
    this.speed  = null;
    this.speedX = null;
    this.speedY = null;
    this.opacity   = 1;
    this.startTime = null;
    this.nowTime   = null;
    this.lastTime  = null;
    this.interval  = null;
    this.tripTime  = null;
    this.timer     = null;     //计时器
    this.motionTypeX    = "";  //移动的方式
    this.motionTypeY    = "";
    this.animationTimes = null ; //此次动画需要耗费的时间
    this.moveX          = 0 ;    //此次运动，已经移动的位移
    this.moveY          = 0 ;
    this.movingInit  = false; //用于检测，调用moving()函数时是否进行基本数据初始化
    this.showed = false;  //控制该精灵是否显示，精灵的 paint() 函数会通过该属性来判断 是否绘制该精灵
    this.show = function(){
        this.showed = true;
    };
    this.hide = function(){
        this.showed = false;
    };
    this.actived = true;  //指定该精灵的状态： 静止 或 活动，update() 函数会通过该属性来判断，是否更新精灵状态
    this.active = function(){
        this.actived = true;
    };
    this.stop = function(){
        this.actived = false;
    };
    this.stand = function(){
        this.endX = null;
        this.endY = null;
    };
    
    //model是精灵的模版对象，模版对象: 为某一类精灵 提供一致的 绘制器 和 更新器
    //绘制器: 绘制精灵自己，paint(sp,brush)
    //更新器: 更新精灵的行为，update(sp)
    //paint(sp,brush) 会根据传递的精灵和画笔，绘制出该精灵
    //update(sp) 根据传递的精灵，更新该精灵的行为
    this.model    = model;
    this.behavior = "";    //每个精灵都有很多行为，该属性用来控制精灵当前要执行的行为
};
Sprite.prototype = {
    //精灵调用paint()，绘制精灵自身
    //调用时需要提供画笔
    paint:function(){
        if(this.model.paint && this.showed){
            //每个精灵需要的画笔属性都会有所不同，但精灵们却会共用一支可怜的画笔(多个canvas元素中就不是这样了)
            //为了不影响其他精灵的绘制
            //在精灵使用画笔前，先保存画笔属性，精灵使用完画笔后还原画笔
            this.brush.save();
            this.brush.beginPath();
            this.model.paint(this,this.brush);
            this.brush.restore();
        }
    },
    update:function(){
        if(this.model.update && this.actived){
            this.model.update(this);
        }
    },
    //-----------------------------------------
    // nextCoord()函数会将精灵朝着目标坐标，以指定的方式，随着时间自动移动
    // startTime ，标记动画开始时间，精灵开始移动时才设置该值(在精灵的update中设置)
    // lastTime , 每移动完一个位置后，都需要更新lastTime(在精灵的update中设置)
    // tripTime , 动画开始到现在，耗费的总时间
    // nowTime ，每个精灵被加载到引擎时，都会被自动设置
    // animationTimes ，精灵要移动到终点位置所需的总时间
    // startX , startY , 初始坐标
    // endX , endY     , 终点坐标
    // distX , distY   , 位移，两个值都是正数
    // speedX , speedY , X轴 和 Y轴 上的移动速度
    //------------------------------------------
    //仅需提供 startX, startY, endX, endY, animationTimes, motionTypeX(运动方式)
    //自动计算: speedX, speedY, distX, distY
    //startTime 在精灵的 update 中设置，startTime记录下 启用update时刻 的时间
    //lastTime  在 nextCoord 中设置
    //nowTime 由游戏引擎自动提供，用到 nowTime 时，直接从精灵身上获取即可
    nextCoord:function(){
        var sf = this,
            per  = 0;    //当前位移百分比 ＝ 速度＊消耗时间／总路程
        sf.tripTime = sf.nowTime - sf.startTime;
        if(!sf.distX){
            sf.distX = Math.abs(sf.startX-sf.endX);
        }
        if(!sf.distY){
            sf.distY = Math.abs(sf.startY-sf.endY);
        }
        if(!sf.speedX){
            sf.speedX = sf.distX/sf.animationTimes;
        }
        if(!sf.speedY){
            sf.speedY = sf.distY/sf.animationTimes;
        }
        //这是基于时间的动画，因此通过时间来决定动画的结束
        if(sf.tripTime >= sf.animationTimes){
            //最后一次调用moving()，确保精灵 精确的 移动到指定位置
            sf.tripTime = sf.animationTimes;
            moving();
            return false;
        }
        moving();
        function moving(){
            //移动 X 坐标
            if(sf.distX){
                switch(sf.motionTypeX){ //检测 X轴坐标上的 移动方式
                    case "dec"://逐渐减速运动
                        per = sf.speedX * sf.tripTime / sf.distX;
                        sf.moveX = (1-Math.pow(1-per,2))*sf.distX;
                        //(1-Math.pow(1-per,2) ,将百分比 做 减速曲线运动 的 转换
                        //转换后的 百分比 乘以总路程，得到转换后的位移
                        //sf.moveX 代表从开始时间到现在，这段时间应该移动的距离
                    default :
                        //默认匀速
                        sf.moveX = sf.speedX * sf.tripTime;
                }
                //判断运动方向，球 可能 朝X轴的 反向 或 正向 运动
                if(sf.startX > sf.endX){
                    sf.x = sf.startX - sf.moveX;
                }else{
                    sf.x = sf.startX + sf.moveX;
                }
            }
            //移动 Y 坐标
            if(sf.distY){
                switch(sf.motionTypeY){
                    case "dec":
                        per = sf.speedY * sf.tripTime / sf.distY;
                        sf.moveY = (1-Math.pow(1-per,2))*sf.distY;
                    default :
                        sf.moveY = sf.speedY * sf.tripTime;
                }
                if(sf.startY > sf.endY){
                    sf.y = sf.startY - sf.moveY;
                }else{
                    sf.y = sf.startY + sf.moveY;
                }
            }  
        } 
    }
};
// 创建唯一de引擎: eg
// 此处设计存在缺陷
// 不应该将游戏引擎暴露给开发者，仅提供创建精灵的方法给开发者即可
// 目前没啥问题，先不修改
window.eg = new Engine();
if(!window.eg.cvs){
    return false;
}
//启动引擎
window.eg.Run();


//取消浏览器默认行为
js.addEvent(document.body,"touchstart",function(e){
    e = js.getEvent(e);
    js.preventDefault(e); 
});

});
