(function(){

//-----游 戏 引 擎-----
//游戏引擎全力负责 不停的绘制 和 更新 所有添加到引擎中的精灵
//仅给所有精灵提供一致的当前时间 和 查看帧速率
window.Coleee = function(canvas,sps){
    //canvas参数：可以是字符串，也可以是已经获取到的canvas元素
    //如果传递的是字符串，则检索canvas元素
    if(ydm.checkStr(canvas)){
        canvas = ydm(canvas);
    }
    if(!ydm.checkElemType(canvas,"canvas")){
        return false;
    }
    var self   = this;
    self.cvs   = canvas;  //为游戏上下文环境，提供一个用来访问 canvas 的接口
    self.cvs.width  = ydm.viewW;   //默认将画布大小设置为屏幕大小
    self.cvs.height = ydm.viewH;
    self.cvsW = ydm.viewW;
    self.cvsH = ydm.viewH;

    self.H5Size = function(){
        //初始化画布宽高
        //最大宽为640且水平居中，高等同于屏幕高
        if(ydm.viewW > 640){
            self.cvs.width = 640;
            self.cvs.style.position = "absolute";
            self.cvs.style.left = (ydm.viewW-640)/2 + "px";
            self.cvsW = 640;
        }
    }


    self.brush = canvas.getContext("2d");
    self.sps   = sps || [];
    self.addSp = function(sp){
        //如果参数 sp 是否是精灵类型的对象
        //精灵类型是在后面的代码中才定义的，此处是否会发生错误？
        if(!(sp instanceof Sprite)){
            return false;
        }
        if(!sp.brush){
            sp.brush = self.brush; //默认给 精灵 绑定主画布
        }
        self.sps.push(sp);  //将精灵添加到引擎世界中
    };

    self.running   = false;   //控制游戏引擎的启动和停止。游戏引擎一般都是启动后就永不停止
    
    self.startTime = null;
    self.nowTime   = null;
    self.lastTime  = null;    //上一帧开始的时间，目前还用不到引擎的 lastTime 和 interval
    self.interval  = 0;       //每帧的时间间隔
    self.tripTime  = null;    //代表游戏引擎已经启动了多长时间

    self.fps       = 60;      //帧速率，默认值60
    self.fpsCount  = 0;       //每次刷新都会自增，用来统计每秒的刷新次数，每过一秒都会被重置为0
    self.fpsTime   = 0;       //纪录上次 刷新帧速率的时间
    self.fpsShow   = false;   //是否在画布左上角 显示 帧速率

    self.deg360    = Math.PI*2;     // 360度对应的数值
    self.deg       = Math.PI/180;   // 1 度
    
    //擦除画布，原理: 将其颜色设置成全透明的黑色,从而使得canvas的背景可以透过该像素显示出来
    self.clearBrush = function(){
        self.brush.clearRect(0,0,canvas.width,canvas.height);
    };
    self.showFpsFunc = function(){
        self.brush.save();
        self.brush.beginPath();
        self.brush.fillStyle = "rgb(50,250,50)";
        self.brush.fillText("fps:"+parseInt(self.fps),20, 20);
        self.brush.restore();
    };
    //启动游戏引擎
    self.Run  = function(){
        self.running   = true;
        self.startTime = new Date();
        self.lastTime  = self.startTime;
        self.fpsTime   = self.startTime;
        self.loopAnimation();
    };
    self.loopAnimation = function(){
        self.nowTime  = new Date();
        self.interval = self.nowTime - self.lastTime;
        self.tripTime = self.nowTime - self.startTime;
        self.clearBrush(); //刷新背景
        //诠释所有精灵
        for(var i =0; i<self.sps.length; i++){
            //为所有精灵分发一致的当前时间
            self.sps[i].nowTime = self.nowTime;
            //绘制精灵
            self.sps[i].paint();
            //更新精灵行为
            self.sps[i].update();
        }
        //帧速率在精灵绘制完毕后才绘制，是为了避免被精灵图像覆盖
        if(self.fpsShow){
            //判断是否显示 帧速率
            self.fpsCount++;
            //1秒刷新一次帧速率的值
            if(self.nowTime - self.fpsTime > 1000){
                self.fps      = self.fpsCount;
                self.fpsCount = 0;  //清零，重新统计
                self.fpsTime  = self.nowTime;
            }
            self.showFpsFunc();
        }
        self.lastTime = self.nowTime;
        //自调用 ,实现无限循环
        if(self.running){
            if(!self.running){
                return false;
            }
            nextFlash(function(){
              self.loopAnimation();
            });
        }
    };
    //停止引擎
    self.Stop = function(){
        self.running = false;
    };
};
//-----游 戏 精 灵 模 版-----
//希望创建精灵的时候，就可以自动将精灵添加到引擎中
var Sprite = function(name,model){
    this.name = "none";
    if(ydm.checkStr(name)){
        this.name = name;
    }
    this.brush = null;  //为精灵指定画布，引擎会为精灵自动绑定默认是主画布
    this.x = 0;
    this.y = 0;
    this.originalX = 0;
    this.originalY = 0;
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
    this.endX    = null;
    this.endY    = null;
    this.directionX = null;
    this.directionY = null;
    this.distX  = 0;   //起始位置 到 终点位置的 位移，必须是正数 Math.abs()
    this.distY  = 0;
    this.speedX = null;
    this.speedY = null;
    this.opacity   = 1;
    this.startTime = null;
    this.nowTime   = null;
    this.lastTime  = null;
    this.tripTime  = null;
    this.timer     = null;     //计时器
    this.motionTypeX    = "";  //移动的方式
    this.motionTypeY    = "";
    this.animationTimes = null ; //此次动画需要耗费的时间
    this.moveX          = 0 ;    //此次运动，已经移动的位移
    this.moveY          = 0 ;
    this.show      = true;  //控制该精灵是否显示，精灵的 paint() 函数会通过该属性来判断 是否绘制该精灵
    this.running   = true;  //指定该精灵的状态： 静止 或 活动，update() 函数会通过该属性来判断，是否更新精灵状态
    
    //该精灵的模版对象，模版对象为 某一类精灵 提供一致的 绘制器 和 更新器
    //主要实现两个方法: paint(sp,brush) , update(sp)
    //paint(sp,brush) 会根据传递的精灵和画笔，绘制出该精灵
    //update(sp) 根据传递的精灵，更新该精灵的行为
    this.model    = model || {};
    this.behavior = "";    //每个精灵都有很多行为，该属性用来控制精灵当前要执行的行为
};
Sprite.prototype = {
    //精灵调用paint()，绘制精灵自身
    //调用时需要提供画笔
    paint:function(){
        if(this.model.paint && this.show){
            //每个精灵需要的画笔属性都会有所不同，但精灵们却会共用一支可怜的画笔(多个canvas元素中就不是这样了)
            //为了不影响其他精灵的绘制
            //在精灵使用画笔前，先保存画笔属性，精灵使用完画笔后还原画笔
            this.brush.save();
            this.model.paint(this,this.brush);
            this.brush.restore();
        }
    },
    update:function(){
        if(this.model.update && this.running){
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
        var self = this,
            per  = 0;    //当前位移百分比 ＝ 速度＊消耗时间／总路程
        self.tripTime = self.nowTime - self.startTime;
        if(!self.distX){
            self.distX = Math.abs(self.startX-self.endX);
        }
        if(!self.distY){
            self.distY = Math.abs(self.startY-self.endY);
        }
        if(!self.speedX){
            self.speedX = self.distX/self.animationTimes;
        }
        if(!self.speedY){
            self.speedY = self.distY/self.animationTimes;
        }
        //这是基于时间的动画，因此通过时间来决定动画的结束
        if(self.tripTime >= self.animationTimes){
            //最后一次调用moving()，确保精灵 精确的 移动到指定位置
            self.tripTime = self.animationTimes;
            moving();
            return false;
        }
        moving();
        function moving(){
            //移动 X 坐标
            if(self.distX){
                switch(self.motionTypeX){ //检测 X轴坐标上的 移动方式
                    case "dec"://逐渐减速运动
                        per = self.speedX * self.tripTime / self.distX;
                        self.moveX = (1-Math.pow(1-per,2))*self.distX;
                        //(1-Math.pow(1-per,2) ,将百分比 做 减速曲线运动 的 转换
                        //转换后的 百分比 乘以总路程，得到转换后的位移
                        //self.moveX 代表从开始时间到现在，这段时间应该移动的距离
                    default :
                        //默认匀速
                        self.moveX = self.speedX * self.tripTime;
                }
                //判断运动方向，球 可能 朝X轴的 反向 或 正向 运动
                if(self.startX > self.endX){
                    self.x = self.startX - self.moveX;
                }else{
                    self.x = self.startX + self.moveX;
                }
            }
            //移动 Y 坐标
            if(self.distY){
                switch(self.motionTypeY){
                    case "dec":
                        per = self.speedY * self.tripTime / self.distY;
                        self.moveY = (1-Math.pow(1-per,2))*self.distY;
                    default :
                        self.moveY = self.speedY * self.tripTime;
                }
                if(self.startY > self.endY){
                    self.y = self.startY - self.moveY;
                }else{
                    self.y = self.startY + self.moveY;
                }
            }  
        } 
    },
    nextCoord2 : function(){
        //仅需要提供 速度 和 终点位置即可(即使不知道终点位置，知道运动的方向也可以，就会按照指定速度去移动)
        //函数会在计算下一个坐标点时，自动检测终点位置是否改变，如果改变则开始新的运动轨迹

        //通过 当前位置 和 终点位置来 判断 精灵在X轴上 和 Y轴上的运动方向
        //运动方向仅在精灵开始运动时，或是终点位置变更时才 重新判断

        //当前动画函数紧紧只是匀速运动，后期需要学会各种力学运动，添加到精灵中

        //由当前动画切换到另一个动画
        //将 directionX 和 directionY重置为 null，并设置新的终点位置 endX 和 endY
        //会自动根据 当前位置坐标 和 终点位置坐标 ,自行判断方向
        //如果速度有变化，修改即可
        //这一切的都改都在精灵的 update函数 中进行

        //注意：lastTime 一定是在精灵的 update函数中 设置

        var self = this;
        if(!ydm.checkNum(self.endX) || !ydm.checkNum(self.endX)){
            return false;
        }
        //初始化 lastEndX 和 lastEndY
        if(!ydm.checkNum(self.lastEndX) || !ydm.checkNum(self.lastEndY)){
            self.lastEndX = self.endX;
            self.lastEndY = self.endY;
        }
        //初始化方向
        if(!self.directionX){
            setDirectionX();
        }
        if(!self.directionX){
            setDirectionY();
        }
        //初始化速度，仅在没有设置速度的前提下，给予一个默认速度
        if(!ydm.checkNum(self.speedX)){
            self.speedX = 0.1;
        }
        if(!ydm.checkNum(self.speedY)){
            self.speedY = 0.1;
        }
        //每次都检测终点位置
        //如果终点位置改变了，重新调整方向
        if(self.lastEndX != self.endX){
            self.lastEndX = self.endX;
            setDirectionX();
        }
        if(self.lastEndY != self.endY){
            self.lastEndY = self.endY;
            setDirectionY();
        }
        //离上次移动的间隔时间
        self.interval = self.nowTime - self.lastTime;
        //移动精灵
        if(self.directionX == "add"){
            self.x += self.interval * self.speedX;
            if(self.x >= self.endX){
                self.x = self.endX;
            }
        }else{
            self.x -= self.interval * self.speedX;
            if(self.x <= self.endX){
                self.x = self.endX;
            }
        }
        if(self.directionY == "add"){
            self.y += self.interval * self.speedY;
            if(self.y >= self.endY){
                self.y = self.endY;
            }
        }else{
            self.y -= self.interval * self.speedY;
            if(self.y <= self.endY){
                self.y = self.endY;
            }
        }
        //检测方向的函数
        function setDirectionX(){
            if(self.x < self.endX){//增大
                self.directionX = "add";
            }else{//减小
                self.directionX = "dec";
            }
        }
        function setDirectionY(){
            if(self.y < self.endY){//增大
                self.directionY = "add";
            }else{//减小
                self.directionY = "dec";
            }
        }
    }
};

function newSp(name,model){
    if(!ydm.checkStr(name)){
        console.log("err: newSp(name,model), 创建精灵，未给精灵赋予名称 ");
        return false;
    }
    if(!ydm.checkObj(model)){
        console.log("err: newSp(name,model), 创建精灵，未给精灵指定模板 ");
        return false;
    }
    var sp = new Sprite(name,model);
};

}());
