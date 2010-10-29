/*
Basic Use: 
<div id="scrollable">
  <div>slide1</div>
  <div>slide2</div>
</div>
<script>
new scrollableView('scrollable');
*/
// $(div).el('.slides').anim({transform:'translateX(-100px)'},2)


The(function($){

  /* 
    scrollView
  */
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
      duration:function(){ return f.start.t - f.last.t; },
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
  	}
  	el.on('touchstart',s);
  	el.on('mousedown',s);
  }
  PointFollower.prototype = $.Eventer;




  /* 
    scrollView
  */
  scrollable = {
    pos:{}
    ,init:function(div,opts){
      var th = this;
      th.div = $(div).adCl('scrollView')
    	th.el = th.div.ch('.slides')[0]
      th.opts = $.ext(opts,{ 
        speed:1 
      })
  	  var p = new PointFollower(th.el);
    	p.on('move',function(e){
    		var mx = getMatrix(th.el);
    		th.pos = {x: mx[4]||0 , y: mx[5]||0};
    		th.move(e);
    	});
    	p.on('end',th.end.bind(th));
    	th.div.on('touchstart', function(e){e.preventDefault()} );
    }
  	,end: function(e){
    	this.el.css('transition','all 0.6s ease-out');
  		this.setXY({
        x:this.pos.x-(e.speedX()/5),
        y:this.pos.y,
      })
  	}
  	,move: function(e){
  		if( Math.abs(e.direction()) < 0.6){
    		this.el.css('transition','none');
    		this.setXY({
          x:this.pos.x + e.diff.x*(this.opts.speed),
          y:this.pos.y + e.diff.y*(this.opts.speed)
        })
  		}
    }
  	,setXY: function(pos,undf){
      var 
      x = pos.x.limit(this.div.offsetWidth-this.el.offsetWidth,0),
      y = pos.y.limit(this.div.offsetHeight-this.el.offsetHeight,0);
      this.el.css('transform','translate('+x+'px,'+y+'px)');
    }
  }
  

  scrollView = function(el,opts){
    this.init(el,opts);
  }
  scrollView.prototype = scrollable;
  scrollView.prototype.active = 0;
  scrollView.prototype.xmove = function(e){
		if( Math.abs(e.direction()) < 0.6){
  		this.el.css('transition','none');
  		this.setXY({
        x:this.pos.x + e.diff.x*(this.opts.speed),
        y:this.pos.y + e.diff.y*(this.opts.speed)
      })
		}
  }
  scrollView.prototype.xend = function(e){
    var add = Math.round( e.speedX()/900 )
    if( add && Math.abs(e.distanceX()) > 40 ){
			this.active = (this.active+add).limit(1,this.el.children.length)
		}
  	this.el.css('transition','all 0.6s ease-out');
		this.setXY({
      x:(this.active-1)*-this.div.offsetWidth,
      y:this.pos.y
    })
  }
  
  function getMatrix(el){
      var i, matrix = el.css('transform').rpl('matrix(','').split(',');
      for(i in matrix){ matrix[i] = parseFloat( matrix[i].trim() ) }
      return matrix;
  }
})
