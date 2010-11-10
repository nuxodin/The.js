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
	var undf, k, d=document, w=window, slice=[].slice,
  vendor = w.controllers?'moz':(w.opera?'o':(d.all?'ms':'webkit'))
  ,Ext = {
    String:{
      camelize:function(){ return this.rpl(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) },
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
     rThis: function(){ // if function returns undefined, it now returns "this"
       var fn = this;
       return function(){
         var ret = fn.apply(this,arguments);
         return ret===undf?this:ret;
       }
     },
     each:function(){ // make a funktion that calls itself for every properties of its instance
        var fn = this;
        return function(){
          var args = arguments, ret = [];
          slice.call(this).forEach( function(el){
            var v = fn.apply(el,args);
            v && ret.push(v);
          })
          return ret;
        }
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
          hasMax = 1
          rmMax = $.wait( wait, max);
        }
      },
      args: function(){ // make a function with defined Arguments
        var fn = this, args = arguments;
        return function(){
          fn.apply(this,args);
        }
      }
    }
  }
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
  function $(n){ return n.rThis ? n($) : ( n.p ? n : d.getElementById(n) ) }
  $.fn = function(v){return v}
  $.ext = function(target, src){ target=target||{}; for(k in src) !target[k] && (target[k] = src[k]); return target; };
  $.extEl = function(src){
    for(k in src){
      window[k] = Document.prototype[k] = HTMLElement.prototype[k] = src[k].rThis();
      HTMLCollection.prototype[k] = NodeList.prototype[k] = src[k].rThis().each();
    }
  }
  $.ready= function(fn){ ['complete','loaded'].indexOf(d.readyState)!==-1?fn():d.on('DOMContentLoaded',fn); }
  $.wait = function(fn,v){ return clearTimeout.args( setTimeout(fn,v) ); }
  $.use= function(lib,cb,supports,target){
    var cbs = $.use.cbs;
    target = target||w;
    supports = supports||lib;
    cb=cb||$.fn;
    target[supports]        // loadet?
			?cb(target[supports]) 
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
  }
  $.cEl = function(tag){ return d.createElement(tag) }
  for( k in Ext ){ $.ext(w[k].prototype,Ext[k]); }
  $.extEl({
    css: function(prop, value){
      if(prop.trim) {
        if(value === undf) return (getComputedStyle(this,null).getPropertyValue(prop) || getComputedStyle(this,null).getPropertyValue('-'+vendor+'-'+prop) )+'';
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
    adCl: function(v){ !this.hsCl(v) && (this.className += ' '+v)},
    rmCl: function(v){ this.className = this.className.rpl(new RegExp("(^|\\s)"+v+"(\\s|$)"), '');},
    hsCl: function(v){ return this.className.contains(v,' '); },
    els: function(sel){ return this.querySelectorAll(sel); },
    el: function(sel){ return this.querySelector(sel); },
    is: function(sel){
        return (
          sel.dlg ? sel===this 
          : (
              this.matchesSelector||this[vendor+'MatchesSelector']||function(){ return d.body.els(sel).is(this).length}
            ).bind(this)(sel)
        ) && this; 
    },
    _walk: function(operation,sel,incMe,un){
			return incMe && this.is(sel)
			? un 
			: (un=this[operation]) && ( sel ? un._walk(operation,sel,1) : un ); 
		},
    fst: function(sel, n){ n = this.firstElementChild; return sel ? n && n.nxt(sel,1) : n },
    lst: function(sel, n){ n = this.lastElementChild;  return sel ? n && n.prv(sel,1) : n },
    prv: function(sel,incMe){ return this._walk('previousElementSibling',sel,incMe) },
    nxt: function(sel,incMe){ return this._walk('nextElementSibling',sel,incMe) },
    p:   function(sel,incMe){ return this._walk('parentNode',sel,incMe); },
    ch:  function(sel){ return sel ? this.ch().is(sel) : this.children },
    rm:  function(){ return this.p().removeChild(this) },
    hs: function(el){ return this.contains ? this.contains(el) : (this.compareDocumentPosition(el)&16) },
    ad: function(el,who){
      var trans = {after:'afterEnd',bottom:'beforeEnd',before:'beforeBegin',top:'afterBegin'}
      this['insertAdjacent'+(el.p?'Element':'HTML')](trans[who||'bottom'],el)
    },
    inj:function(el,who){ el.ad(this,who); },
    on:  function(ev,cb){
      //this.addEventListener(ev, function(e){ var x = {}; $.ext(x,e); cb(x) }, false); // ie9
      this.addEventListener(ev, cb, false);
      return this.no.bind(this).args(ev,cb);
    },
    no: function(ev,cb){
      this.removeEventListener(ev, cb, false);
    },
    dlg: function(sel, ev, cb){
      return this.on(ev, function(ev){
        var el = ev.target.p(sel,1);
        el && el!==d && cb(el, ev);
      });
    },
    show:function(){ this.css('display','block') },
    hide:function(){ this.css('display','none') }
  });
  k = d.els('script');
  $.use.path = k[k.length-1].src.rpl(/\/[^\/]+$/,'/');
  $.use.cbs = {};
  $.Eventer = {
    initEvent:function(n){
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
          fn.bind(self)(e)
        })
    }
  }

  w.$||(w.$=$);


	/// firefox
	if(!HTMLElement.prototype.insertAdjacentElement){
		HTMLElement.prototype.insertAdjacentElement = function (where,parsedNode){
			switch (where){
				case 'beforeBegin': 
				this.p().insertBefore(parsedNode,this) 
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
		}
		HTMLElement.prototype.insertAdjacentHTML = function(where,htmlStr){
			var r = d.createRange(); 
			r.setStartBefore(this); 
			var parsedHTML = r.createContextualFragment(htmlStr); 
			this.insertAdjacentElement(where,parsedHTML)
		} 
		HTMLElement.prototype.insertAdjacentText = function(where,txtStr){ 
			var parsedText = d.createTextNode(txtStr) 
			this.insertAdjacentElement(where,parsedText) 
		} 
	}
	/// end firefox
	
  return $;
}();
