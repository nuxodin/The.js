The( function($){

  var 
   hyphen = String.fromCharCode(173)
  ,urlhyphen = String.fromCharCode(8203)
  ,url='(\\w*:\/\/)?((\\w*:)?(\\w*)@)?((([\\d]{1,3}\\.){3}([\\d]{1,3}))|((www\\.|[a-zA-Z]\\.)?[a-zA-Z0-9\\-\\.]+\\.([a-z]{2,4})))(:\\d*)?(\/[\\w#!:\\.?\\+=&%@!\\-]*)*'
  	//      protocoll     usr     pwd                    ip               or                          host                 tld        port               path
  ,mail='[\\w-\\.]+@[\\w\\.]+'
  ,urlOrMailRE=new RegExp('(' + url + ')|(' + mail + ')', 'i')
  ,supportedLang= {
  		'cs': 'cs',
  		'da': 'da',
  		'bn': 'bn',
  		'de': 'de',
  		'el': 'el-monoton',
  		'el-monoton': 'el-monoton',
  		'el-polyton': 'el-polyton',
  		'en': 'en-us',
  		'en-gb': 'en-gb',
  		'en-us': 'en-us',
  		'es': 'es',
  		'fi': 'fi',
  		'fr': 'fr',
  		'grc': 'grc',
  		'gu': 'gu',
  		'hi': 'hi',
  		'hu': 'hu',
  		'hy': 'hy',
  		'it': 'it',
  		'kn': 'kn',
  		'la': 'la',
  		'lt': 'lt',
  		'ml': 'ml',
  		'nl': 'nl',
  		'or': 'or',
  		'pa': 'pa',
  		'pl': 'pl',
  		'pt': 'pt',
  		'ru': 'ru',
  		'sl': 'sl',
  		'sv': 'sv',
  		'ta': 'ta',
  		'te': 'te',
  		'tr': 'tr',
  		'uk': 'uk'
  }
	,dontHyphenate = {'script':1,'code':1,'pre':1,'img':1,'br':1,'samp':1,'kbd':1,'var':1,'abbr':1,'acronym':1,'sub':1,'sup':1,'button':1,'option':1,'label':1,'textarea':1,'input': 1}
  ;

	Hyphenate = {
    element:function(el){
      var 
      self = this,
      oldCSS = el.style.cssText,
      complete = function(str){
        this.data = str;
        if(!--todo){
          el.style.cssText = oldCSS;
        }
      },
      todo = 0,
      hyphEl = function(el){
        var i=0, n;
  			while ((n = el.childNodes[i++])) {
          switch(n.nodeType){
            case 3:
              ++todo;
    					self.string( n.data, el.getLang(), complete.bind(n) );
    					break;
    				case 1:
    				  !dontHyphenate[el.tagName.toLowerCase()]
              && hyphEl(n)
          }
  			}
      }
      el.style.cssText += 'visibility:hidden';
      hyphEl(el)
    },
  	rmElement: function (el) {
  		var i=0, n;
  		while ((n = el.childNodes[i++])) {
  			if (n.nodeType === 3) {
          n.data = this.rmString(n.data);
  			} else if (n.nodeType === 1) {
  				this.rmElement(n);
  			}
  		}
  	},
    string: function(str,lang,cb){
      var self = this;
      lang = supportedLang[lang] || this.mainLanguage
      $.use('Hyphenate.patterns/'+lang, function(lo){

        self.prepareLanguagesObj(lang);

    		if (str.length >= self.min) {
          var hyphenate = function (word) {
    				if (urlOrMailRE.test(word)) {
    					return self.hyphenateURL(word);
    				} else {
    					return self.hyphenateWord(lang, word);
    				}
    			};
    			str = str.replace(self.languages[lang].genRegExp, hyphenate);
    		}
    		cb&&cb(str);

      }, lang, this.languages);
    },
  	rmString: function(str){
				return str.rpl(new RegExp(hyphen,'g'),'').rpl(new RegExp(zeroWidthSpace,'g'),'');
    },
    languages:[],
  	min:6,
  	mainLanguage:'de',
  	hyphenateWord: function (lang, word){
  		var lo = this.languages[lang],
  			parts, i, l, w, wl, s, hypos, p, maxwins, win, pat = false, patk, c, t, n, numb3rs, inserted, hyphenatedword, val;
  		if (word === '') { return ''; }
  		if (word.indexOf(hyphen) !== -1) { return word; }
  		if (lo.cache.hasOwnProperty(word)) { return lo.cache[word]; }
  		if (lo.exceptions && lo.exceptions.hasOwnProperty(word)) { return lo.exceptions[word].replace(/-/g, hyphen); }
  		if (word.indexOf('-') !== -1) {
  			//word contains '-' -> hyphenate the parts separated with '-'
  			parts = word.split('-');
  			for (i = 0, l = parts.length; i < l; i++) {
  				parts[i] = this.hyphenateWord(lang, parts[i]);
  			}
  			return parts.join('-');
  		}
  		//finally the core hyphenation algorithm
  		w = '_' + word + '_';
  		wl = w.length;
  		s = w.split('');
  		if (word.indexOf("'") !== -1) {
  			w = w.toLowerCase().replace("'", "’"); //replace APOSTROPHE with RIGHT SINGLE QUOTATION MARK (since the latter is used in the patterns)
  		} else {
  			w = w.toLowerCase();
  		}
  		hypos = [];
  		numb3rs = {'0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9}; //check for member is faster then isFinite()
  		n = wl - lo.shortestPattern;
  		for (p = 0; p <= n; p++) {
  			maxwins = Math.min((wl - p), lo.longestPattern);
  			for (win = lo.shortestPattern; win <= maxwins; win++) {
  				if (lo.patterns.hasOwnProperty(patk = w.substring(p, p + win))) {
  					pat = lo.patterns[patk];
  					if (typeof pat === 'string'){
  						//convert from string 'a5b' to array [1,5] (pos,value)
  						t = 0;
  						val = [];
  						for (i = 0; i < pat.length; i++) {
  							if ((c = numb3rs[pat.charAt(i)])) {
  								val.push(i - t, c);
  								t++;								
  							}
  						}
  						pat = lo.patterns[patk] = val;
  					}
  				} else {
  					continue;
  				}
  				for (i = 0; i < pat.length; i++) {
  					c = p - 1 + pat[i];
  					if (!hypos[c] || hypos[c] < pat[i + 1]) {
  						hypos[c] = pat[i + 1];
  					}
  					i++;
  				}
  			}
  		}
  		inserted = 0;
  		for (i = lo.leftmin; i <= (word.length - lo.rightmin); i++) {
  			if ((hypos[i] & 1)) {
  				s.splice(i + inserted + 1, 0, hyphen);
  				inserted++;
  			}
  		}
  		hyphenatedword = s.slice(1, -1).join('');
  		lo.cache[word] = hyphenatedword;
  		return hyphenatedword;
  	},

  	hyphenateURL: function (url) {
  		return url.replace(/([:\/\.\?#&_,;!@]+)/gi, '$&' + urlhyphen);
  	},

  	prepareLanguagesObj: function (lang){
  		var lo = Hyphenate.languages[lang], wrd;

    	var convertPatterns = function (lang) {
    		var plen, anfang, ende, pats, pat, key, tmp = {};
    		pats = Hyphenate.languages[lang].patterns;
    		for (plen in pats) {
    			if (pats.hasOwnProperty(plen)) {
    				plen = parseInt(plen, 10);
    				anfang = 0;
    				ende = plen;
    				while ((pat = pats[plen].substring(anfang, ende))) {
    					key = pat.replace(/\d/g, '');
    					tmp[key] = pat;
    					anfang = ende;
    					ende += plen;
    				}
    			}
    		}
    		Hyphenate.languages[lang].patterns = tmp;
    		Hyphenate.languages[lang].patternsConverted = true;
    	}

  		if (!lo.prepared) {	
  			lo.cache = {};
  			if (lo.hasOwnProperty('exceptions')) {
  				Hyphenate.addExceptions(lang, lo.exceptions);
  				delete lo.exceptions;
  			}
  			convertPatterns(lang);
  			wrd = '[\\w' + lo.specialChars + '@' + String.fromCharCode(173) + '-]{' + this.min + ',}';
  			lo.genRegExp = new RegExp('(' + url + ')|(' + mail + ')|(' + wrd + ')', 'gi');
  			lo.prepared = true;
  		}
  	}

  }


  $.extEl({
    getLang:function(){
      if(!this.__lang){
          var lang = this.attr('lang') || this.attr('xml:lang');
          if(!lang){
            if(this.parentNode){
              lang = this.parentNode.getLang();
            } else {
                var m = document.els('meta'), i;
                for (i = 0; i < m.length; i++){
                  if( m[i].attr('http-equiv').toLowerCase() === 'content-language' ) {
                    lang = m[i].attr('content').toLowerCase();
                  }
                  if( m[i].attr('name') && (m[i].attr('name').toLowerCase() === 'dc.language')) {
                     lang = m[i].attr('content').toLowerCase();
                  }
                  if( m[i].attr('name') && (m[i].attr('name').toLowerCase() === 'language')) {
                     lang = m[i].attr('content').toLowerCase();
                  }
                }
                if(!lang){
            			lang = navigator.language ? navigator.language : navigator.userLanguage;
                }
            }
          }
          this.__lang = lang.substr(0,2).toLowerCase();
      }
      return this.__lang;
    },
    hyphenate:function(){
      Hyphenate.element( this );
    },
    unHyphenate:function(){
      Hyphenate.rmElement( this );
    }
  })


});
