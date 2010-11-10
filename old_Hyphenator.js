var Hyphenator = (function (window) {

	var supportedLang = {
		'cs': 'cs.js',
		'da': 'da.js',
		'bn': 'bn.js',
		'de': 'de.js',
		'el': 'el-monoton.js',
		'el-monoton': 'el-monoton.js',
		'el-polyton': 'el-polyton.js',
		'en': 'en-us.js',
		'en-gb': 'en-gb.js',
		'en-us': 'en-us.js',
		'es': 'es.js',
		'fi': 'fi.js',
		'fr': 'fr.js',
		'grc': 'grc.js',
		'gu': 'gu.js',
		'hi': 'hi.js',
		'hu': 'hu.js',
		'hy': 'hy.js',
		'it': 'it.js',
		'kn': 'kn.js',
		'la': 'la.js',
		'lt': 'lt.js',
		'ml': 'ml.js',
		'nl': 'nl.js',
		'or': 'or.js',
		'pa': 'pa.js',
		'pl': 'pl.js',
		'pt': 'pt.js',
		'ru': 'ru.js',
		'sl': 'sl.js',
		'sv': 'sv.js',
		'ta': 'ta.js',
		'te': 'te.js',
		'tr': 'tr.js',
		'uk': 'uk.js'
	},
	dontHyphenate = {'script': true, 'code': true, 'pre': true, 'img': true, 'br': true, 'samp': true, 'kbd': true, 'var': true, 'abbr': true, 'acronym': true, 'sub': true, 'sup': true, 'button': true, 'option': true, 'label': true, 'textarea': true, 'input': true},
	enableCache = true,
	storageType = 'local',
	storage,
	enableReducedPatternSet = false,
	dontHyphenateClass = 'donthyphenate',
	min = 6,
	mainLanguage = 'de',
	elements = [],
	exceptions = {},
	docLanguages = {},
	/**
	 * @name Hyphenator-state
	 * @fieldOf Hyphenator
	 * @description
	 * A number that inidcates the current state of the script
	 * 0: not initialized
	 * 1: loading patterns
	 * 2: ready
	 * 3: hyphenation done
	 * 4: hyphenation removed
	 * @type number
	 * @private
	 */	
	state = 0,
	url = '(\\w*:\/\/)?((\\w*:)?(\\w*)@)?((([\\d]{1,3}\\.){3}([\\d]{1,3}))|((www\\.|[a-zA-Z]\\.)?[a-zA-Z0-9\\-\\.]+\\.([a-z]{2,4})))(:\\d*)?(\/[\\w#!:\\.?\\+=&%@!\\-]*)*',
	//      protocoll     usr     pwd                    ip               or                          host                 tld        port               path
	mail = '[\\w-\\.]+@[\\w\\.]+',
	urlOrMailRE = new RegExp('(' + url + ')|(' + mail + ')', 'i'),
	zeroWidthSpace = String.fromCharCode(8203), // not ie6 / opera 10
	onHyphenationDone = function () {},
	selectorFunction = function () {
		return [document.body];
	},
	/**
	 * @name Hyphenator-intermediateState
	 * @fieldOf Hyphenator
	 * @description
	 * The value of style.visibility of the text while it is hyphenated.
	 * @see Hyphenator.config
	 * @type string
	 * @private
	 */		
	intermediateState = 'hidden',
	hyphen = String.fromCharCode(173),
	urlhyphen = zeroWidthSpace,
	safeCopy = true, // Not supported by Opera (no onCopy handler)
	
	Expando = (function () {
		var container = {},
			name = "HyphenatorExpando_" + Math.random(),
			uuid = 0;
		return {
			getDataForElem : function (elem) {
				return container[elem[name]];
			},
			setDataForElem : function (elem, data) {
				var id;
				if (elem[name] && elem[name] !== '') {
					id = elem[name];
				} else {
					id = uuid++;
					elem[name] = id;
				}
				container[id] = data;
			},
			appendDataForElem : function (elem, data) {
				var k;
				for (k in data) {
					if (data.hasOwnProperty(k)) {
						container[elem[name]][k] = data[k];
					}
				}
			},
			delDataOfElem : function (elem) {
				delete container[elem[name]];
			}
		};
	}()),

	getLang = function (el) {
    if(!el || ! el.getAttribute){ return mainLanguage; }
    var lang = el.getAttribute('lang') || el.getAttribute('xml:lang') || getLang(el.parentNode);
    return lang.toLowerCase();
	},

	autoSetMainLanguage = function (){
		var el = contextWindow.document.getElementsByTagName('html')[0],
			m = contextWindow.document.getElementsByTagName('meta'),
			i, e;
		mainLanguage = getLang(el);
		if (!mainLanguage) {
			for (i = 0; i < m.length; i++) {
				//<meta http-equiv = "content-language" content="xy">	
				if (m[i].getAttribute('http-equiv') && (m[i].getAttribute('http-equiv').toLowerCase() === 'content-language')) {
					mainLanguage = m[i].getAttribute('content').toLowerCase();
				}
				//<meta name = "DC.Language" content="xy">
				if (m[i].getAttribute('name') && (m[i].getAttribute('name').toLowerCase() === 'dc.language')) {
					mainLanguage = m[i].getAttribute('content').toLowerCase();
				}			
				//<meta name = "language" content = "xy">
				if (m[i].getAttribute('name') && (m[i].getAttribute('name').toLowerCase() === 'language')) {
					mainLanguage = m[i].getAttribute('content').toLowerCase();
				}
			}
		}
		if (!mainLanguage) {
			var x = navigator.language ? navigator.language : navigator.userLanguage;
			mainLanguage = x.substring(0, 2);
		}
		if (!supportedLang.hasOwnProperty(mainLanguage)) {
			if (supportedLang.hasOwnProperty(mainLanguage.split('-')[0])) { //try subtag
				mainLanguage = mainLanguage.split('-')[0];
			} else {
				mainLanguage = en;
			}
		}
	},
  
	gatherDocumentInfos = function () {
		var elToProcess, tmp, i = 0,
		process = function (el, hide, lang) {
			var n, i = 0, hyphenatorSettings = {};
			if (hide && intermediateState === 'hidden') {
				if (el.getAttribute('style')) {
					hyphenatorSettings.hasOwnStyle = true;
				} else {
					hyphenatorSettings.hasOwnStyle = false;					
				}
				hyphenatorSettings.isHidden = true;
				el.style.visibility = 'hidden';
			}
			if (el.lang && typeof(el.lang) === 'string') {
				hyphenatorSettings.language = el.lang.toLowerCase(); //copy attribute-lang to internal lang
			} else if (lang) {
				hyphenatorSettings.language = lang.toLowerCase();
			} else {
				hyphenatorSettings.language = getLang(el, true);
			}
			lang = hyphenatorSettings.language;
			if (supportedLang[lang]) {
				docLanguages[lang] = true;
			} else {
				if( supportedLang.hasOwnProperty(lang.split('-')[0]) ){ //try subtag
					lang = lang.split('-')[0];
					hyphenatorSettings.language = lang;
				} else {
					onError(new Error('Language ' + lang + ' is not yet supported.'));
				}
			}
			Expando.setDataForElem(el, hyphenatorSettings);
			elements.push(el);
			while ((n = el.childNodes[i++])) {
				if (n.nodeType === 1 && !dontHyphenate[n.nodeName.toLowerCase()] &&
					n.className.indexOf(dontHyphenateClass) === -1 && !(n in elToProcess)) {
					process(n, false, lang);
				}
			}
		};
		elToProcess = selectorFunction();
		while ((tmp = elToProcess[i++])){
			process(tmp, true);
		}
		if (!Hyphenator.languages.hasOwnProperty(mainLanguage)) {
			docLanguages[mainLanguage] = true;
		} else if (!Hyphenator.languages[mainLanguage].prepared) {
			docLanguages[mainLanguage] = true;
		}
		if (elements.length > 0) {
			Expando.appendDataForElem(elements[elements.length - 1], {isLast : true});
		}
	},

	/**
	 * @name Hyphenator-convertPatterns
	 * @methodOf Hyphenator
	 * @description
	 * Converts the patterns from string '_a6' to object '_a':'_a6'.
	 * The result is stored in the {@link Hyphenator-patterns}-object.
	 * @private
	 * @param string the language whose patterns shall be converted
	 */		
	convertPatterns = function (lang) {
		var plen, anfang, ende, pats, pat, key, tmp = {};
		pats = Hyphenator.languages[lang].patterns;
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
		Hyphenator.languages[lang].patterns = tmp;
		Hyphenator.languages[lang].patternsConverted = true;
	},

	/**
	 * @name Hyphenator-convertExceptionsToObject
	 * @methodOf Hyphenator
	 * @description
	 * Converts a list of comma seprated exceptions to an object:
	 * 'Fortran,Hy-phen-a-tion' -> {'Fortran':'Fortran','Hyphenation':'Hy-phen-a-tion'}
	 * @private
	 * @param string a comma separated string of exceptions (without spaces)
	 */		
	convertExceptionsToObject = function (exc) {
		var w = exc.split(', '),
			r = {},
			i, l, key;
		for (i = 0, l = w.length; i < l; i++) {
			key = w[i].replace(/-/g, '');
			if (!r.hasOwnProperty(key)) {
				r[key] = w[i];
			}
		}
		return r;
	},
	
	loadPatterns = function (lang) {
    var url, head, script;
		if (supportedLang[lang] && !Hyphenator.languages[lang]) {
  		$.use('Hyphenator_patterns/'+lang,0,Hyphenator.languages,lang);
		} else {
			return;
		}
	},

	/**
	 * @name Hyphenator-prepareLanguagesObj
	 * @methodOf Hyphenator
	 * @description
	 * Adds a cache to each language and converts the exceptions-list to an object.
	 * If storage is active the object is stored there.
	 * @private
	 * @param string the language ob the lang-obj
	 */		
	prepareLanguagesObj = function (lang) {
		var lo = Hyphenator.languages[lang], wrd;
		if (!lo.prepared) {	
			if (enableCache) {
				lo.cache = {};
			}
			if (enableReducedPatternSet) {
				lo.redPatSet = {};
			}
			if (lo.hasOwnProperty('exceptions')) {
				Hyphenator.addExceptions(lang, lo.exceptions);
				delete lo.exceptions;
			}
			if (exceptions.hasOwnProperty('global')) {
				if (exceptions.hasOwnProperty(lang)) {
					exceptions[lang] += ', ' + exceptions.global;
				} else {
					exceptions[lang] = exceptions.global;
				}
			}
			if (exceptions.hasOwnProperty(lang)) {
				lo.exceptions = convertExceptionsToObject(exceptions[lang]);
				delete exceptions[lang];
			} else {
				lo.exceptions = {};
			}
			convertPatterns(lang);
			wrd = '[\\w' + lo.specialChars + '@' + String.fromCharCode(173) + '-]{' + min + ',}';
			lo.genRegExp = new RegExp('(' + url + ')|(' + mail + ')|(' + wrd + ')', 'gi');
			lo.prepared = true;
		}
		if (storage) {
			storage.setItem(lang, JSON.stringify(lo));
		}
		
	},
	
	/**
	 * @name Hyphenator-prepare
	 * @methodOf Hyphenator
	 * @description
	 * This funtion prepares the Hyphenator-Object: 
	 * If storage is active the object is retrieved there.
	 * It loads the pattern files and waits until they are loaded,
	 * by repeatedly checking Hyphenator.languages. If a patterfile is loaded the patterns are
	 * converted to their object style and the lang-object extended.
	 * Finally the callback is called.
	 * @param function-object callback to call, when all patterns are loaded
	 * @private
	 */
	prepare = function (callback){
		var lang, languagesToLoad = 0, interval, tmp1, tmp2;
		// get all languages that are used and preload the patterns
		state = 1;
		for (lang in docLanguages) {
			if (docLanguages.hasOwnProperty(lang)){
				++languagesToLoad;
				if (storage) {
					if (storage.getItem(lang)) {
						Hyphenator.languages[lang] = JSON.parse(storage.getItem(lang));
						//Replace exceptions since they may have been changed:
						if (exceptions.hasOwnProperty(lang)) {
							tmp1 = convertExceptionsToObject(exceptions[lang]);
							for (tmp2 in tmp1) {
								if (tmp1.hasOwnProperty(tmp2)) {
									Hyphenator.languages[lang].exceptions[tmp2] = tmp1[tmp2];
								}
							}
							delete exceptions[lang];
						}
						//Replace genRegExp since it may have been changed:
						tmp1 = '[\\w' + Hyphenator.languages[lang].specialChars + '@' + String.fromCharCode(173) + '-]{' + min + ',}';
						Hyphenator.languages[lang].genRegExp = new RegExp('(' + url + ')|(' + mail + ')|(' + tmp1 + ')', 'gi');
						
						delete docLanguages[lang];
						--languagesToLoad;
						continue;
					}
				} 
				loadPatterns(lang);
			}
		}
		if (languagesToLoad === 0) {
			state = 2;
			callback();
			return;
		}
		// wait until they are loaded
		interval = window.setInterval(function () {
			var finishedLoading = false, lang;
			for (lang in docLanguages) {
				if (docLanguages.hasOwnProperty(lang)) {
					if (!Hyphenator.languages[lang]) {
						finishedLoading = false;
						break;
					} else {
						finishedLoading = true;
						delete docLanguages[lang];
						//do conversion while other patterns are loading:
						prepareLanguagesObj(lang);
					}
				}
			}
			if (finishedLoading) {
				window.clearInterval(interval);
				state = 2;
				callback();
			}
		}, 100);
	},

	hyphenateWord = function (lang, word) {
		var lo = Hyphenator.languages[lang],
			parts, i, l, w, wl, s, hypos, p, maxwins, win, pat = false, patk, c, t, n, numb3rs, inserted, hyphenatedword, val;
		if (word === '') {
			return '';
		}
		if (word.indexOf(hyphen) !== -1) {
			//word already contains shy; -> leave at it is!
			return word;
		}
		if (enableCache && lo.cache.hasOwnProperty(word)) { //the word is in the cache
			return lo.cache[word];
		}
		if (lo.exceptions.hasOwnProperty(word)) { //the word is in the exceptions list
			return lo.exceptions[word].replace(/-/g, hyphen);
		}
		if (word.indexOf('-') !== -1) {
			//word contains '-' -> hyphenate the parts separated with '-'
			parts = word.split('-');
			for (i = 0, l = parts.length; i < l; i++) {
				parts[i] = hyphenateWord(lang, parts[i]);
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
					if (enableReducedPatternSet) {
						lo.redPatSet[patk] = pat;
					}
					if (typeof pat === 'string') {
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
		if (enableCache) {
			lo.cache[word] = hyphenatedword;
		}
		return hyphenatedword;
	},

	hyphenateURL = function (url) {
		return url.replace(/([:\/\.\?#&_,;!@]+)/gi, '$&' + urlhyphen);
	},

	hyphenateElement = function (el) {
		var hyphenatorSettings = Expando.getDataForElem(el),
		  lang = hyphenatorSettings.language, hyphenate, n, i;
		if (Hyphenator.languages.hasOwnProperty(lang)) {
			hyphenate = function (word) {
				if (urlOrMailRE.test(word)) {
					return hyphenateURL(word);
				} else {
					return hyphenateWord(lang, word);
				}
			};
			i = 0;
			while ((n = el.childNodes[i++])) {
				if (n.nodeType === 3 && n.data.length >= min) { //type 3 = #text -> hyphenate!
					n.data = n.data.replace(Hyphenator.languages[lang].genRegExp, hyphenate);
				}
			}
		}
		if (hyphenatorSettings.isHidden && intermediateState === 'hidden') {
			el.style.visibility = 'visible';
			if (!hyphenatorSettings.hasOwnStyle) {
				el.setAttribute('style', ''); // without this, removeAttribute doesn't work in Safari (thanks to molily)
				el.removeAttribute('style');
			} else {
				if (el.style.removeProperty) {
					el.style.removeProperty('visibility');
				} else if (el.style.removeAttribute) { // IE
					el.style.removeAttribute('visibility');
				}  
			}
		}
		if (hyphenatorSettings.isLast) {
			state = 3;
			onHyphenationDone();
		}
	},

	removeHyphenationFromElement = function (el) {
		var h, i = 0, n;
		switch (hyphen) {
		case '|':
			h = '\\|';
			break;
		case '+':
			h = '\\+';
			break;
		case '*':
			h = '\\*';
			break;
		default:
			h = hyphen;
		}
		while ((n = el.childNodes[i++])) {
			if (n.nodeType === 3) {
				n.data = n.data.replace(new RegExp(h, 'g'), '');
				n.data = n.data.replace(new RegExp(zeroWidthSpace, 'g'), '');
			} else if (n.nodeType === 1) {
				removeHyphenationFromElement(n);
			}
		}
	},

	hyphenateDocument = function () {
		function bind(fun, arg) {
			return function () {
				return fun(arg);
			};
		}
		var i = 0, el;
		while ((el = elements[i++])) {
			window.setTimeout(bind(hyphenateElement, el), 0);
		}
	},

	removeHyphenationFromDocument = function () {
		var i = 0, el;
		while ((el = elements[i++])) {
			removeHyphenationFromElement(el);
		}
		state = 4;
	},
	
	/**
	 * @name Hyphenator-registerOnCopy
	 * @methodOf Hyphenator
	 * @description
	 * Huge work-around for browser-inconsistency when it comes to
	 * copying of hyphenated text.
	 * The idea behind this code has been provided by http://github.com/aristus/sweet-justice
	 * sweet-justice is under BSD-License
	 * @private
	 * @param null
	 */
	registerOnCopy = function () {
		var body = contextWindow.document.getElementsByTagName('body')[0],
		shadow,
		selection,
		range,
		rangeShadow,
		restore,
		oncopyHandler = function (e) {
			e = e || window.event;
			var target = e.target || e.srcElement,
			currDoc = target.ownerDocument,
			body = currDoc.getElementsByTagName('body')[0],
			targetWindow = 'defaultView' in currDoc ? currDoc.defaultView : currDoc.parentWindow;
			if (target.tagName && dontHyphenate[target.tagName.toLowerCase()]) {
				//Safari needs this
				return;
			}
			//create a hidden shadow element
	 		shadow = currDoc.createElement('div');
			shadow.style.cssText = 'overflow:hidden; position:absolute; top = -5000px; height = 1px';
			body.appendChild(shadow);
			if (window.getSelection) {
				//FF3, Webkit
				selection = targetWindow.getSelection();
				range = selection.getRangeAt(0);
				shadow.appendChild(range.cloneContents());
				removeHyphenationFromElement(shadow);
				selection.selectAllChildren(shadow);
				restore = function () {
					shadow.parentNode.removeChild(shadow);
					if (targetWindow.getSelection().setBaseAndExtent) {
						selection.setBaseAndExtent(
							range.startContainer,
							range.startOffset,
							range.endContainer,
							range.endOffset
						);
					}
				};
			} else {
				// IE
				selection = targetWindow.document.selection;
				range = selection.createRange();
				shadow.innerHTML = range.htmlText;
				removeHyphenationFromElement(shadow);
				rangeShadow = body.createTextRange();
				rangeShadow.moveToElementText(shadow);
				rangeShadow.select();
				restore = function () {
					shadow.parentNode.removeChild(shadow);
					if (range.text !== "") {
						range.select();
					}
				};
			}
			window.setTimeout(restore, 0);
		};
		if(!body){
			return;
		}
		if (window.addEventListener) {
			body.addEventListener("copy", oncopyHandler, false);
		} else {
			body.attachEvent("oncopy", oncopyHandler);
		}
	};

	return {
		version: 'X.Y.Z',
		languages: {},
		config: function (obj) {
			var assert = function (name, type) {
					if (typeof obj[name] === type) {
						return true;
					} else {
						onError(new Error('Config onError: ' + name + ' must be of type ' + type));
						return false;
					}
				},
				key;
			for (key in obj) {
				if (obj.hasOwnProperty(key)) {
					switch (key){
					case 'classname':
						if (assert('classname', 'string')) {
							hyphenateClass = obj.classname;
						}
						break;
					case 'donthyphenateclassname':
						if (assert('donthyphenateclassname', 'string')) {
							dontHyphenateClass = obj.donthyphenateclassname;
						}						
						break;
					case 'minwordlength':
						if (assert('minwordlength', 'number')) {
							min = obj.minwordlength;
						}
						break;
					case 'hyphenchar':
						if (assert('hyphenchar', 'string')) {
							if (obj.hyphenchar === '&shy;') {
								obj.hyphenchar = String.fromCharCode(173);
							}
							hyphen = obj.hyphenchar;
						}
						break;
					case 'urlhyphenchar':
						if (obj.hasOwnProperty('urlhyphenchar')) {
							if (assert('urlhyphenchar', 'string')) {
								urlhyphen = obj.urlhyphenchar;
							}
						}
						break;
					case 'enablecache':
						if (assert('enablecache', 'boolean')) {
							enableCache = obj.enablecache;
						}
						break;
					case 'enablereducedpatternset':
						if (assert('enablereducedpatternset', 'boolean')) {
							enableReducedPatternSet = obj.enablereducedpatternset;
						}
						break;
					case 'onhyphenationdonecallback':
						if (assert('onhyphenationdonecallback', 'function')) {
							onHyphenationDone = obj.onhyphenationdonecallback;
						}
						break;
					case 'onerrorhandler':
						if (assert('onerrorhandler', 'function')) {
							onError = obj.onerrorhandler;
						}
						break;
					case 'intermediatestate':
						if (assert('intermediatestate', 'string')) {
							intermediateState = obj.intermediatestate;
						}
						break;
					case 'selectorfunction':
						if (assert('selectorfunction', 'function')) {
							selectorFunction = obj.selectorfunction;
						}
						break;
					case 'safecopy':
						if (assert('safecopy', 'boolean')) {
							safeCopy = obj.safecopy;
						}
						break;
					case 'storagetype':
						if (assert('storagetype', 'string')) {
							storageType = obj.storagetype;
						}						
						break;
					default:
						onError(new Error('Hyphenator.config: property ' + key + ' not known.'));
					}
				}
			}
		},

		run: function () {
			var process = function () {
				if (contextWindow.document.getElementsByTagName('frameset').length > 0) {
					return; //we are in a frameset
				}
				autoSetMainLanguage();
				gatherDocumentInfos();
				prepare(hyphenateDocument);
				if (safeCopy) {
					registerOnCopy();
				}

			}, i, haveAccess, fl = window.frames.length;
			if (storageType !== 'none' &&
				typeof(window.localStorage) !== 'undefined' &&
//				typeof(window.sessionStorage) !== 'undefined' &&
				typeof(JSON.stringify) !== 'undefined' &&
				typeof(JSON.parse) !== 'undefined') {
				switch (storageType) {
				case 'session':
					storage = window.sessionStorage;
					break;
				case 'local':
					storage = window.localStorage;
					break;
				default:
					storage = undefined;
					break;
				}
			}
			$.ready(process);
		},
		
		addExceptions: function (lang, words) {
			if (lang === '') {
				lang = 'global';
			}
			if (exceptions.hasOwnProperty(lang)) {
				exceptions[lang] += ", " + words;
			} else {
				exceptions[lang] = words;
			}
		},

		/**
		 * @name Hyphenator.getRedPatternSet
		 * @methodOf Hyphenator
		 * @description
		 * Returns {@link Hyphenator-isBookmarklet}.
		 * @param string the language patterns are stored for
		 * @returns object {'patk': pat}
		 * @public
         */
		getRedPatternSet: function (lang) {
			return Hyphenator.languages[lang].redPatSet;
		},

		toggleHyphenation: function () {
			switch (state) {
			case 3:
				removeHyphenationFromDocument();
				break;
			case 4:
				hyphenateDocument();
				break;
			}
		}
	};
}(window));
