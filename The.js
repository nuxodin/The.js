// useful: http://kangax.github.com/es5-compat-table/
// features detect styles: document.documentElement.style.MozTransform !== undefined
//
// Object.prototype.forIn = function(callback, self){
//     for(var key in this)
//         if(this.hasOwnProperty(key) && callback.call(self || this, this[key], key, this) === false)
//             break;
// };
// 


The = function(){
  var undf, k, d=document, w=self, slice=[].slice,
  vendor = w.controllers?'moz':(w.opera?'o':(d.all?'ms':'webkit'))
  ,Ext = {
    String:{
      camelize:function(){ return this.rpl(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : ''; }); },
      contains:function(str, separ){ separ=separ||''; return (separ+this+separ).indexOf(separ+str+separ) > -1; },
      rpl:String.prototype.replace,
      trim: function(){ return this.rpl(/^\s+|\s+$/g, '');}
    },
    Number:{
      limit: function(min, max){ return Math.min(max, Math.max(min, this)); }
    },
    Function:{
     bind: function(bind){
       var fn = this;
       return function(){
          return fn.apply(bind,arguments);
       };
     },
     chained: function(){ // if function returns undefined, it now returns "this"
       var fn = this;
       return function(){
         var ret = fn.apply(this,arguments);
         return ret===undf?this:ret;
       };
     },
     each:function(retConst){ // make a funktion that calls itself for every properties of its instance
        var fn = this;
        return function(){
          var args = arguments, ret = retConst ? new retConst : [];
          slice.call(this).forEach( function(el){
            var v = fn.apply(el,args);
            v && ret.push(v);
          });
          return ret;
        };
      },
      ignoreUntil: function(min,max){ // waits for the execution of the function (min) and then executes the last call, but waits maximal (max) millisecunds
        var fn = this, rmMin = $.fn, rmMax = $.fn, hasMax;
        return function(){
          var inst=this, args=arguments,
          wait = function(){
            hasMax = 0;
            rmMax();
            rmMin();
            fn.apply(inst,args);
          };
          rmMin();
          rmMin = $.wait( wait, min);
          if(hasMax || !max) return;
          hasMax = 1;
          rmMax = $.wait( wait, max);
        };
      },
      args: function(){ // make a function with defined Arguments
        var fn = this, args = arguments;
        return function(){
          fn.apply(this,args);
        };
      }
    },
  	/// firefox 4b9
    HTMLElement:{
      insertAdjacentElement: function (where,parsedNode){
    	  switch (where){
          case 'beforeBegin': 
          this.p().insertBefore(parsedNode,this);
          break; 
          case 'afterBegin': 
          this.insertBefore(parsedNode,this.fst()); 
          break; 
          case 'beforeEnd': 
          this.appendChild(parsedNode); 
          break; 
          case 'afterEnd': 
          this.nextSibling ? this.p().insertBefore(parsedNode,this.nxt()) : this.p().appendChild(parsedNode); 
        } 
  		},
      insertAdjacentHTML: function(where,htmlStr){
      	var r = d.createRange(); 
      	r.setStartBefore(this); 
      	var parsedHTML = r.createContextualFragment(htmlStr); 
      	this.insertAdjacentElement(where,parsedHTML);
      },
      insertAdjacentText: function(where,txtStr){
        var parsedText = d.createTextNode(txtStr);
        this.insertAdjacentElement(where,parsedText);
  	  }
    }
  };

/*  function ajax(method, url, success){
    var r = new XMLHttpRequest();
    r.onreadystatechange = function(){
      if(r.readyState==4 && (r.status==200 || r.status==0))
        success(r.responseText);
    };
    r.open(method,url,true);
    r.setRequestHeader('X-Requested-With','XMLHttpRequest');
    r.send(null);
  }
  $.get = function(url, success){ ajax('GET', url, success); };
  $.post = function(url, success){ ajax('POST', url, success); };
  $.getJSON = function(url, success){
    $.get(url, function(json){ success(JSON.parse(json)) });
  };
*/


  function $(n){ return n.chained ? n($) : ( n.p ? n : d.getElementById(n) ); }
  $.fn = function(v){return v;};
  $.ext = function(target, src){ target=target||{}; for(k in src) !target[k] && (target[k] = src[k]); return target; };
  //$.dom = {};
  $.extEl = function(src){

    var operaNLProtoQSAll = document.querySelectorAll('html').constructor.prototype; // opera prototype for querySelectorAll-NodeLists

    for(k in src){
      var fn = src[k].chained();
      window[k] = Document.prototype[k] = HTMLElement.prototype[k] = fn;
      $.NodeList.prototype[k] =
      operaNLProtoQSAll =  // opera 11
      HTMLCollection.prototype[k] = // ie
      NodeList.prototype[k] = fn.each($.NodeList); // opera know NodeList but extending the prototype has no effect???
      //$.dom[k] = function(fn){ return function(el){ return fn.apply( $(el), slice.call(arguments,1) ) } }( fn ); //  dom functions like that: $.dom.adCl(el,'test');
    }
  };
  $.NodeList = function(){};
  $.NodeList.prototype = new Array();

  $.ready= function(fn){ ['complete','loaded'].indexOf(d.readyState)!==-1?fn():d.on('DOMContentLoaded',fn); };
  $.wait = function(fn,v){ return clearTimeout.args( setTimeout(fn,v) ); };
  $.use= function(lib,cb,supports,target){
    var cbs = $.use.cbs;
    target = target||w;
    supports = supports||lib;
    cb=cb||$.fn;
    target[supports]        // loadet?
			? cb(target[supports])
			:(cbs[lib]            // loading?
				?cbs[lib].push(cb)
				:(                  // load!
				    cbs[lib] = [cb],
				    tmp=$.cEl('script')
						.attr('src',$.use.path+lib+'.js'),
						//.attr('async','true')
						tmp.on('load',function(i,v){
							v = target[supports] = target[supports] || 1;
							for( i in cbs[lib] ){ cbs[lib][i](v) }
							cbs[lib] = undf;
				    }),
						tmp.inj(d.el('head'))
				))
  };
  $.cEl = function(tag){ return d.createElement(tag); }
  for( k in Ext ){ $.ext(w[k].prototype,Ext[k]); }
  $.extEl({
    css: function(prop, value){
      if(prop.trim) {
        if(value === undf){ k = getComputedStyle(this,null); return (k.getPropertyValue(prop)||k.getPropertyValue('-'+vendor+'-'+prop) )+''; }
        //if( /^[0-9]+$/.test(value+'') ){ value += 'px' }
        this.style.cssText += ';'+prop+":"+value+';-'+vendor+'-'+prop+':'+value;
	    } else for(k in prop) this.css(k,prop[k]);
    },
    attr: function(name,value){
      if(name.trim){
        if(value===undf) return this.getAttribute(name);
        this.setAttribute(name,value);
      } else for(k in name) this.attr(k,name[k]);
    },
    adCl: function(v){ !this.hsCl(v) && (this.className += ' '+v); },
    rmCl: function(v){ this.className = this.className.rpl(new RegExp("(^|\\s)"+v+"(\\s|$)"), '');},
    hsCl: function(v){ return this.className.contains(v,' '); },
    els: function(sel){ return this.querySelectorAll(sel); },
    el: function(sel){ return this.querySelector(sel); },
    is: function(sel){
        if(this===d){ return sel===this; } // ie9 on document
        return (
          sel.dlg ? sel===this 
          : (
              this.matchesSelector||this[vendor+'MatchesSelector']||
                function(){ return (d.body.els(sel).is(this).length); }
            ).bind(this)(sel)
        ) && this; 
    },
    _walk: function(operation,sel,incMe,un){
			return incMe && this.is(sel) ? un  : (un=this[operation]) && ( sel ? un._walk(operation,sel,1) : un ); 
		},
    fst: function(sel, n){ n = this.firstElementChild; return sel ? n && n.nxt(sel,1) : n; },
    lst: function(sel, n){ n = this.lastElementChild;  return sel ? n && n.prv(sel,1) : n; },
    prv: function(sel,incMe){ return this._walk('previousElementSibling',sel,incMe); },
    nxt: function(sel,incMe){ return this._walk('nextElementSibling',sel,incMe); },
    p:   function(sel,incMe){ return this._walk('parentNode',sel,incMe); },
    ch:  function(sel){ return sel ? this.ch().is(sel) : this.children; },
    rm:  function(){ return this.p().removeChild(this); },
    hs: function(el){ return this.contains ? this.contains(el) : (this.compareDocumentPosition(el)&16); },
    ad: function(el,who){
      var trans = {after:'afterEnd',bottom:'beforeEnd',before:'beforeBegin',top:'afterBegin'};
      this['insertAdjacent'+(el.p?'Element':'HTML')](trans[who||'bottom'],el);
    },
    inj:function(el,who){ el.ad(this,who); },
    on:  function(ev,cb){
      for (var i=0,evs=ev.split(/\s/),x ; x=evs[i++]; ){
        //this.addEventListener(ev, function(e){ var x = {}; $.ext(x,e); cb(x) }, false); // ie9
        this.addEventListener(x, cb, false);
      }
    },
    no: function(ev,cb){
      for (var i=0,evs=ev.split(/\s/),x ; x=evs[i++]; ){
        this.removeEventListener(x, cb, false);
      }
    },
    fire: function(ev){
      var e; this.dispatchEvent( e = d.createEvent('Events'), e.initEvent(ev, true, false) );
    },
    dlg: function(sel, ev, cb){
      return this.on(ev, function(ev){
        var el = ev.target.p(sel,1);
        el && el!==d && cb.bind(el)(el, ev);
      });
    },
    show:function(){ this.css('display','block'); },
    hide:function(){ this.css('display','none'); },
    zTop: function(){
      var p=this.p(), z=p.$zTop;
      if(!z){
        for (var i=0, el, cs=p.ch(), elZ; el = cs[i++];){
          elZ = el.css('z-index')*1;
          z = Math.max(z,elZ);//elZ > z ? elZ : z;
        }
      }
      p!==d && p.zTop();
//      p.style.zIndex = p.css('z-index')*1||0; // prevent mix with other contexts (override default auto)
      z = z||0;
      this.style.zIndex = p.$zTop = z+1;
    },
    html:function(v){ this.innerHTML = v; }
  });
  k = d.els('script');
  k = k[k.length-1];
  $.use.path = k.attr('basis') || k.src.rpl(/\/[^\/]+$/,'/');
  $.use.cbs = {};

  $.Eventer = {
    initEvent : function(n){
      !this.Events && (this.Events={});
      !this.Events[n] && (this.Events[n]=[]);
    }
    ,on:function(n,fn){
        this.initEvent(n);
        this.Events[n].push(fn);
    }
    ,no:function(n,fn){
        this.initEvent(n);
        var Events = this.Events[n];
        Events.splice( Events.indexOf(fn) ,1);
    }
    ,fire:function(n,e){
        this.initEvent(n);
        var self = this;
        this.Events[n].forEach(function(fn){
          fn.bind(self)(e);
        })
    }
  };

  w.$||(w.$=$);

  return $;
}();
