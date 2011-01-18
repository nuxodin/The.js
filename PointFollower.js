The(function(){

  PointFollower = function(el){
    var
    self=this
    ,f = {
      start:{y:0,x:0,t:0},
      diff:{x:0,y:0,t:0},
      last:{x:0,y:0,t:0},
      direction:function(){ return f.diff.y/f.diff.x; },
      speed:function(){ return Math.sqrt( (f.diff.x*f.diff.x)+(f.diff.y*f.diff.y) ) * 1000 / f.diff.t; },
      speedX:function(){ return f.diff.x * 1000 / f.diff.t; },
      speedY:function(){ return f.diff.y * 1000 / f.diff.t; },
      distance:function(){ return Math.sqrt( Math.pow(f.last.x - f.start.x,2)+Math.pow(f.last.y-f.start.y,2) ); },
      distanceX:function(){ return f.last.x - f.start.x; },
      distanceY:function(){ return f.last.y - f.start.y; },
      duration:function(){ return f.start.t - f.last.t; }
    }
    ,s = function(ev){
  		f.start = f.last = getPoint(ev);
  		f.diff = {x:0,y:0,t:0};
    	el.on('touchmove',m);
    	el.on('touchend',e);
    	document.on('mousemove',m);
    	document.on('mouseup',e);
    	self.fire('start',f);
    }
    ,m = function(ev){
      var point = getPoint(ev);
      f.diff = {
        x : point.x - f.last.x,
        y : point.y - f.last.y, 
        t : f.last.t - point.t
      };
      f.last = point;
      self.fire('move',f);
    }
  	,e = function(ev){
    	el.no('touchmove',m);
    	el.no('touchend',e);
    	document.no('mousemove',m);
    	document.no('mouseup',e);
    	self.fire('end',f);
    },
    getPoint = function(e){
      var p = e.targetTouches ? e.targetTouches[0] : e;
      return {x:p.pageX,y:p.pageY,t:e.timeStamp}; //return {x:e.clientX,y:e.clientY};
  	};
  	el.on('touchstart',s);
  	el.on('mousedown',s);
  };
  PointFollower.prototype = $.Eventer;
  
});
