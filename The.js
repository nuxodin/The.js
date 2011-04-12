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
    var undf, k, d=document, w=self
    , vendor = w.controllers?'moz':(w.opera?'o':(d.all?'ms':'webkit'))
    ,Ext = {
        Array:{
            indexOf:function(obj){ // ie8
                for(var i=0, l=this.length; i<l; i++)
                    if(this[i]===obj) 
                        return i;
                return -1;
            },
            forEach:function(fn, bind){ // ie8
                for (var l = this.length, i = 0; i < l; i++)
                    fn.call(bind, this[i], i, this);
            }
        },
        String:{
            contains:function(str, separ){ separ=separ||''; return (separ+this+separ).indexOf(separ+str+separ) > -1; }
            ,rpl:String.prototype.replace
            ,trim: function(){ return this.rpl(/^\s+|\s+$/g, '');}
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
            }
            ,chained: function(){ // if function returns undefined, it now returns "this"
                var fn = this;
                return function(){
                    var ret = fn.apply(this,arguments);
                    return ret===undf?this:ret;
                };
            }
            ,each:function(retConst){ // make a funktion that calls itself for every properties of its instance
                var fn = this;
                return function(){
                    var ret = retConst ? new retConst : [], i=0, el, v;
                    for(;el=this[i++];){ // return this.map(fn.args(arguments)) ??
                        v = fn.apply(el,arguments);
                        v && ret.push(v);
                    };
                    return ret;
                };
            }
            ,multi:function(){
                var fn = this;
                return function(a,b){
                    if(b === undf && typeof a == 'object'){
                        for(var i in a)
                            if(a.hasOwnProperty(i))
                                fn.call(this,i,a[i]);
                        return;
                    }
                    return fn.apply(this,arguments);
                }
            }
            ,ignoreUntil: function(min,max){ // waits for the execution of the function (min) and then executes the last call, but waits maximal (max) millisecunds
                var fn = this, minTimer, maxTimer, inst, args
                ,wait = function(){
                    clearTimeout(maxTimer)
                    maxTimer = 0;
                    fn.apply(inst,args);
                };
                return function(){
                    inst=this, args=arguments;
                    clearTimeout(minTimer)
                    minTimer = setTimeout(wait, min);
                    !maxTimer && max && (maxTimer = setTimeout(wait, max));
                };
            }
            ,args: function(){ // make a function with defined Arguments
                var fn = this, args = arguments;
                return function(){
                    fn.apply(this,args);
                };
            }
        },
        HTMLElement:{ // firefox 4
            insertAdjacentElement: function (where,parsedNode){
                switch (where){
                case 'beforeBegin': this.p().insertBefore(parsedNode,this); break; 
                case 'afterBegin':  this.insertBefore(parsedNode,this.fst()); break; 
                case 'beforeEnd': this.appendChild(parsedNode); break; 
                case 'afterEnd':  this.nxt() ? this.p().insertBefore(parsedNode,this.nxt()) : this.p().appendChild(parsedNode);
                } 
            },
            insertAdjacentHTML: function(where,htmlStr){ // ff is working on it
                var r = d.createRange();
                r.setStartBefore(this); 
                this.insertAdjacentElement(where,r.createContextualFragment(htmlStr));
            },
            insertAdjacentText: function(where,txtStr){
                this.insertAdjacentElement(where,d.createTextNode(txtStr));
            }
        }
    };

    function $(n){ return n.chained ? n($) : ( n.p ? n : d.getElementById(n) ); }
    $.fn = function(v){return v;};
    $.ext = function(target, src){ target=target||{}; for(k in src) target[k]===undf && (target[k] = src[k]); return target; };
    for( k in Ext ){ w[k] && $.ext(w[k].prototype,Ext[k]) }

    $.extEl = function(src){
        for(k in src){
            var fn = src[k].chained();
            window[k] = document[k] = fn;
            w.HTMLElement && (HTMLElement.prototype[k] = fn);
            w.Element && (Element.prototype[k] = fn);

            $.NodeList.prototype[k] =
//          HTMLCollection.prototype[k] = // ie
//          NodeList.prototype[k] = 
            fn.each($.NodeList); 
        }
    };
    $.NodeList = function(els){
        if(els){
            // els.__proto__ = $.NodeList.prototype; return els;
            for(var i=0,l=els.length;i<l;i++) // this.push.apply(this,els) // working with ff4
                this[i]=els[i]
            this.length = l;
        }
    };
    $.NodeList.prototype = [];

    $.ready = function(fn){ ['complete','loaded'].indexOf(d.readyState)!==-1?fn():d.on('DOMContentLoaded',fn); };
    vendor=='ms' && ( $.ready = function(fn){  setTimeout(fn,200) } ); // ie8, very dirty
  
    $.cEl = function(tag){ return d.createElement(tag); }
    $.cNL = function(els){ return new $.NodeList(els); }
    $.extEl({
        css: function(prop, value){
            if(value === undf){
                if(w.getComputedStyle){
                    k = getComputedStyle(this,null);
                    return (k[prop]||k['-'+vendor+'-'+prop])+'';
                } 
                return this.currentStyle[prop]; // ie8
            }
            this.style.cssText += ';'+prop+":"+value+';-'+vendor+'-'+prop+':'+value;
            //this.style[prop] = this.style['-'+vendor+'-'+prop] = value; // opera 11.10 bugs mit transition / http://jsperf.com/csstext-with-unnown-properties/3
        }.multi()
        ,attr: function(name,value){
            if(value===undf) return this.getAttribute(name);
            this.setAttribute(name,value);
        }.multi()
        ,adCl: function(v){ !this.hsCl(v) && (this.className += ' '+v); },
        rmCl: function(v){ this.className = this.className.rpl(new RegExp("(^|\\s)"+v+"(\\s|$)"), '');},
        hsCl: function(v){ return this.className.contains(v,' '); },
        els: function(sel){ return $.cNL(this.querySelectorAll(sel)); },
        el: function(sel){ return this.querySelector(sel); },
        is: function(sel){
            if(this===d) return sel===this;  // ie9 on document
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
        ch:  function(sel){ return sel ? this.ch().is(sel) : $.cNL(this.children); },
        rm:  function(){ return this.p().removeChild(this); },
        hs: function(el,incMe){ return this===el ? (incMe?this:false) : (this.contains ? this.contains(el) : (this.compareDocumentPosition(el)&16))&&this; },
        ad: function(el,who){
            var trans = {after:'afterEnd',bottom:'beforeEnd',before:'beforeBegin',top:'afterBegin'};
            this['insertAdjacent'+(el.p?'Element':'HTML')](trans[who||'bottom'],el);
        },
        inj:function(el,who){ el.ad(this,who); },
        on: function(ev,cb,useCapture){
            for (var i=0,evs=ev.split(/\s/),x ; x=evs[i++]; ){
                //this.addEventListener(ev, function(e){ var x = {}; $.ext(x,e); cb(x) }, false); // ie9
                //this.addEventListener(x, cb, false);
                if(this.addEventListener){
                    this.addEventListener(x, cb, useCapture);
                } else { // ie8
                    var iecb = function(e){
                        e = $.ext(e,{
                            target:e.srcElement, pageX:e.x, pageY:e.y, preventDefault:function(){ this.returnValue = false; },timeStamp:new Date()
                        });
                        cb( $.ext({},e) );
                    }
                    this.attachEvent('on'+x,iecb);
                }
            }
        }.multi()
        ,no: function(ev,cb){
            for (var i=0,evs=ev.split(/\s/),x ; x=evs[i++]; ){
                //this.removeEventListener(x, cb, false);
                this.removeEventListener ? this.removeEventListener(x, cb, false) : this.detachEvent('on'+x,cb); // ie8
            }
        }.multi()
        ,fire: function(n,ce){
            if(this.dispatchEvent){
                var e = d.createEvent('Events');
                e.initEvent(n, true, false);
                this.dispatchEvent( $.ext(e,ce||{}) )
            } else { // ie8
                this.fireEvent(n,ce)
            }
        },
        one:function(n,cb){
            var fn = function(e){ cb.call(this,e); this.no(n,fn); }
            this.on( n, fn );
        }.multi()
        ,dlg: function(sel, ev, cb){
            return this.on(ev, function(ev){
                var t = ev.target.p ? ev.target : ev.target.parentNode; // for textnodes
                var el = t.p(sel,1);
                el && el!==d && cb.call(el,ev);
            });
        },
        show:function(){ this.style.display='block'; },
        hide:function(){ this.style.display='none'; },
        zTop: function(){
            var p=this.p(), z=p.$zTop;
            if(!z){
                for (var i=0, el, cs=p.ch(), elZ; el = cs[i++];){
                    elZ = el.css('z-index')*1;
                    z = Math.max(z,elZ);//elZ > z ? elZ : z;
                }
            }
            p!==d && p.zTop();
            //p.style.zIndex = p.css('z-index')*1||0; // prevent mix with other contexts (override default auto)
            z = z||0;
            this.style.zIndex = p.$zTop = z+1;
        },
        html:function(v){ this.innerHTML = v; },
        rct:function(rct){
            rct && this.css({top:rct.y+'px',left:rct.x+'px',width:rct.w+'px',height:rct.h+'px'});
            var pos = this.getBoundingClientRect();
            return new $.rct(pos.left+pageXOffset,pos.top+pageYOffset,this.offsetWidth,this.offsetHeight)
        }
    });
    $.rct = function(x,y,w,h){
        this.x = x; this.y = y; this.w = w; this.h = h;
    }
    $.rct.prototype = {
        x:0,y:0,w:0,h:0
        ,r:function(){ return this.x + this.w; }
        ,b:function(){ return this.y + this.h; }
        ,relative:function(rct){ return new $.tct(this.x-rct.x,this.y-rct.y,this.w,this.h); }
        ,isInX: function(rct){ rct.x > this.x && rct.r() < this.r() }
        ,isInY: function(rct){ rct.y > this.y && rct.r() < this.r() }
        ,isIn: function(rct){ return this.isInX(rct) && this.isInY(rct) }
        ,touchesX: function(rct){ return rct.x < this.r() && rct.r() > this.x }
        ,touchesY: function(rct){ return rct.y < this.b() && rct.b() > this.y }
        ,touches: function(rct){ return this.touchesX(rct) && this.touchesY(rct) }
    }
    $.req = function(opt,success){
        var r = new XMLHttpRequest;
        opt = $.ext(opt,{url:location.href,method:'GET',type:'text',data:null})
        r.onreadystatechange = function(e){
            if( r.readyState==4 && (r.status==200 || r.status==0) ){
                if(opt.type == 'xml' && r.responseXML.firstChild===null){ // ie hack
                    r.responseXML.loadXML( r.responseText.rpl('&nbsp;','&#160;') );
                }
                var v = opt.type=='xml' ? r.responseXML : ( opt.type=='json' ? JSON.parse(r.responseText) : r.responseText );
                success(v);
            }
        };
        r.open(opt.method,opt.url,true);
        //r.setRequestHeader('Content-Type','application/json');
        //r.setRequestHeader('X-Requested-With','XMLHttpRequest');
        if(r.overrideMimeType){
            if(opt.type=='xml'){
                r.overrideMimeType('text/xml');
            } else if(opt.type=='json'){
                r.overrideMimeType('application/json');
            }
        }
        r.send(opt.data);
    }
    $.Eventer = {
        initEvent : function(n){
            !this._Es && (this._Es={});
            !this._Es[n] && (this._Es[n]=[]);
            return this._Es[n];
        }
        ,on:function(n,fn){
            this.initEvent(n).push(fn);
        }.multi()
        ,no:function(n,fn){
            var Events = this.initEvent(n);
            Events.splice( Events.indexOf(fn) ,1);
        }.multi()
        ,fire:function(n,e){
            var Events = this.initEvent(n), i=0, E;
            for (;E=Events[i++];)
                E.bind(this)(e);
        }
    };
    $.use= function(lib,cb,supports,target){
        var cbs = $.use.cbs;
        target = target||w;
        supports = supports||lib;
        cb=cb||$.fn;
        target[supports]        // loadet?
            ? cb(target[supports])
            : cbs[lib]            // loading?
                ? cbs[lib].push(cb)
                :(                  // load!
                    cbs[lib] = [cb],
                    $.cEl('script').attr('src',$.use.path+lib+'.js')
                    .on('load',function(fn){
                        while(fn=cbs[lib].shift()){ fn( target[supports] = target[supports] || 1 ) }
                    })
                    .inj(d.el('head'))
                )
            
    };
    k = d.els('script');
    k = k[k.length-1];
    $.use.path = k.attr('basis') || k.src.rpl(/\/[^\/]+$/,'/');
    $.use.cbs = {};

    on(vendor+'TransitionEnd',function(e){ e.target.fire('transitionend',e) });
    on('DOMMouseScroll',function(e){ e.wheelDelta = -e.detail*40; e.target.fire('mousewheel',e) }); // firefox?

    w.$||(w.$=$);
    return $;

}();
