// PrismJS 1.29.0
// https://prismjs.com/download.html#themes=prism-dark&languages=markup+css+clike+javascript+bash+css-extras+git+json+markdown+markup-templating+php+php-extras+scss 
// / <reference lib="WebWorker"/>

var _self = typeof window !== 'undefined'
	? window // If in browser
	: 
		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
			? self // if in worker
			: {}   // if in node js
	;

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */
var Prism = (function (_self) {

	// Private helper vars
	var lang = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i;
	var uniqueId = 0;

	// The grammar object for plaintext
	var plainTextGrammar = {};


	var _ = {

		/**
		 * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
		 * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
		 * additional languages or plugins yourself.
		 *
		 * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
		 *
		 * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
		 * empty Prism object into the global scope before loading the Prism script like this:
		 *
		 * ```js
		 * window.Prism = window.Prism || {};
		 * Prism.manual = true;
		 * // add a new <script> to load Prism's script
		 * ```
		 *
		 * @default false
		 * @type {boolean}
		 * @memberof Prism
		 * @public
		 */
		"manual": _self.Prism && _self.Prism.manual,

		/**
		 * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
		 * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
		 * own worker, you don't want it to do this.
		 *
		 * By setting this value to `true`, Prism will not add its own listeners to the worker.
		 *
		 * You obviously have to change this value before Prism executes. To do this, you can add an
		 * empty Prism object into the global scope before loading the Prism script like this:
		 *
		 * ```js
		 * window.Prism = window.Prism || {};
		 * Prism.disableWorkerMessageHandler = true;
		 * // Load Prism's script
		 * ```
		 *
		 * @default false
		 * @type {boolean}
		 * @memberof Prism
		 * @public
		 */
		"disableWorkerMessageHandler": _self.Prism && _self.Prism.disableWorkerMessageHandler,

		/**
		 * A namespace for utility methods.
		 *
		 * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
		 * change or disappear at any time.
		 *
		 * @namespace
		 * @memberof Prism
		 */
		"util": {
			"encode": function encode(tokens) {
				if (tokens instanceof Token) {
					return new Token(tokens.type, encode(tokens.content), tokens.alias);
				} else if (Array.isArray(tokens)) {
					return tokens.map(encode);
				} 
					return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
				
			},

			/**
			 * Returns the name of the type of the given value.
			 *
			 * @param {any} o
			 * @returns {string}
			 * @example
			 * type(null)      === 'Null'
			 * type(undefined) === 'Undefined'
			 * type(123)       === 'Number'
			 * type('foo')     === 'String'
			 * type(true)      === 'Boolean'
			 * type([1, 2])    === 'Array'
			 * type({})        === 'Object'
			 * type(String)    === 'Function'
			 * type(/abc+/)    === 'RegExp'
			 */
			"type": function (o) {
				return Object.prototype.toString.call(o).slice(8, -1);
			},

			/**
			 * Returns a unique number for the given object. Later calls will still return the same number.
			 *
			 * @param {Object} obj
			 * @returns {number}
			 */
			"objId": function (obj) {
				if (!obj.__id) {
					Object.defineProperty(obj, '__id', {value: ++uniqueId});
				}
				return obj.__id;
			},

			/**
			 * Creates a deep clone of the given object.
			 *
			 * The main intended use of this function is to clone language definitions.
			 *
			 * @param {T} o
			 * @param {Record<number, any>} [visited]
			 * @returns {T}
			 * @template T
			 */
			"clone": function deepClone(o, visited) {
				visited = visited || {};

				var clone; var id;
				switch (_.util.type(o)) {
					case 'Object':
						id = _.util.objId(o);
						if (visited[id]) {
							return visited[id];
						}
						clone = /** @type {Record<string, any>} */ {};
						visited[id] = clone;

						for (var key in o) {
							if (o.hasOwnProperty(key)) {
								clone[key] = deepClone(o[key], visited);
							}
						}

						return /** @type {any} */ clone;

					case 'Array':
						id = _.util.objId(o);
						if (visited[id]) {
							return visited[id];
						}
						clone = [];
						visited[id] = clone;

						(/** @type {Array} */(/** @type {any} */o)).forEach(function (v, i) {
							clone[i] = deepClone(v, visited);
						});

						return /** @type {any} */ clone;

					default:
						return o;
				}
			},

			/**
			 * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
			 *
			 * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
			 *
			 * @param {Element} element
			 * @returns {string}
			 */
			"getLanguage": function (element) {
				while (element) {
					var m = lang.exec(element.className);
					if (m) {
						return m[1].toLowerCase();
					}
					element = element.parentElement;
				}
				return 'none';
			},

			/**
			 * Sets the Prism `language-xxxx` class of the given element.
			 *
			 * @param {Element} element
			 * @param {string} language
			 * @returns {void}
			 */
			"setLanguage": function (element, language) {
				// Remove all `language-xxxx` classes
				// (this might leave behind a leading space)
				element.className = element.className.replace(RegExp(lang, 'gi'), '');

				// Add the new `language-xxxx` class
				// (using `classList` will automatically clean up spaces for us)
				element.classList.add(`language-${  language}`);
			},

			/**
			 * Returns the script element that is currently executing.
			 *
			 * This does __not__ work for line script element.
			 *
			 * @returns {HTMLScriptElement | null}
			 */
			"currentScript": function () {
				if (typeof document === 'undefined') {
					return null;
				}
				if ('currentScript' in document && 1 < 2 /* Hack to trip TS' flow analysis */) {
					return /** @type {any} */ document.currentScript;
				}

				// IE11 workaround
				// We'll get the src of the current script by parsing IE11's error stack trace
				// This will not work for inline scripts

				try {
					throw new Error();
				} catch (err) {
					// Get file src url from stack. Specifically works with the format of stack traces in IE.
					// A stack will look like this:
					//
					// Error
					//    At _.util.currentScript (http://localhost/components/prism-core.js:119:5)
					//    At Global code (http://localhost/components/prism-core.js:606:1)

					var src = ((/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i).exec(err.stack) || [])[1];
					if (src) {
						var scripts = document.getElementsByTagName('script');
						for (var i in scripts) {
							if (scripts[i].src == src) {
								return scripts[i];
							}
						}
					}
					return null;
				}
			},

			/**
			 * Returns whether a given class is active for `element`.
			 *
			 * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
			 * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
			 * given class is just the given class with a `no-` prefix.
			 *
			 * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
			 * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
			 * ancestors have the given class or the negated version of it, then the default activation will be returned.
			 *
			 * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
			 * version of it, the class is considered active.
			 *
			 * @param {Element} element
			 * @param {string} className
			 * @param {boolean} [defaultActivation=false]
			 * @returns {boolean}
			 */
			"isActive": function (element, className, defaultActivation) {
				var no = `no-${  className}`;

				while (element) {
					var {classList} = element;
					if (classList.contains(className)) {
						return true;
					}
					if (classList.contains(no)) {
						return false;
					}
					element = element.parentElement;
				}
				return Boolean(defaultActivation);
			}
		},

		/**
		 * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
		 *
		 * @namespace
		 * @memberof Prism
		 * @public
		 */
		"languages": {

			/**
			 * The grammar for plain, unformatted text.
			 */
			"plain": plainTextGrammar,
			"plaintext": plainTextGrammar,
			"text": plainTextGrammar,
			"txt": plainTextGrammar,

			/**
			 * Creates a deep copy of the language with the given id and appends the given tokens.
			 *
			 * If a token in `redef` also appears in the copied language, then the existing token in the copied language
			 * will be overwritten at its original position.
			 *
			 * ## Best practices
			 *
			 * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
			 * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
			 * understand the language definition because, normally, the order of tokens matters in Prism grammars.
			 *
			 * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
			 * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
			 *
			 * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
			 * @param {Grammar} redef The new tokens to append.
			 * @returns {Grammar} The new language created.
			 * @public
			 * @example
			 * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
			 *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
			 *     // at its original position
			 *     'comment': { ... },
			 *     // CSS doesn't have a 'color' token, so this token will be appended
			 *     'color': /\b(?:red|green|blue)\b/
			 * });
			 */
			"extend": function (id, redef) {
				var lang = _.util.clone(_.languages[id]);

				for (var key in redef) {
					lang[key] = redef[key];
				}

				return lang;
			},

			/**
			 * Inserts tokens _before_ another token in a language definition or any other grammar.
			 *
			 * ## Usage
			 *
			 * This helper method makes it easy to modify existing languages. For example, the CSS language definition
			 * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
			 * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
			 * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
			 * this:
			 *
			 * ```js
			 * Prism.languages.markup.style = {
			 *     // token
			 * };
			 * ```
			 *
			 * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
			 * before existing tokens. For the CSS example above, you would use it like this:
			 *
			 * ```js
			 * Prism.languages.insertBefore('markup', 'cdata', {
			 *     'style': {
			 *         // token
			 *     }
			 * });
			 * ```
			 *
			 * ## Special cases
			 *
			 * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
			 * will be ignored.
			 *
			 * This behavior can be used to insert tokens after `before`:
			 *
			 * ```js
			 * Prism.languages.insertBefore('markup', 'comment', {
			 *     'comment': Prism.languages.markup.comment,
			 *     // tokens after 'comment'
			 * });
			 * ```
			 *
			 * ## Limitations
			 *
			 * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
			 * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
			 * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
			 * deleting properties which is necessary to insert at arbitrary positions.
			 *
			 * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
			 * Instead, it will create a new object and replace all references to the target object with the new one. This
			 * can be done without temporarily deleting properties, so the iteration order is well-defined.
			 *
			 * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
			 * you hold the target object in a variable, then the value of the variable will not change.
			 *
			 * ```js
			 * var oldMarkup = Prism.languages.markup;
			 * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
			 *
			 * assert(oldMarkup !== Prism.languages.markup);
			 * assert(newMarkup === Prism.languages.markup);
			 * ```
			 *
			 * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
			 * object to be modified.
			 * @param {string} before The key to insert before.
			 * @param {Grammar} insert An object containing the key-value pairs to be inserted.
			 * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
			 * object to be modified.
			 *
			 * Defaults to `Prism.languages`.
			 * @returns {Grammar} The new grammar object.
			 * @public
			 */
			"insertBefore": function (inside, before, insert, root) {
				root = root || /** @type {any} */ _.languages;
				var grammar = root[inside];

				/** @type {Grammar} */
				var ret = {};

				for (var token in grammar) {
					if (grammar.hasOwnProperty(token)) {

						if (token == before) {
							for (var newToken in insert) {
								if (insert.hasOwnProperty(newToken)) {
									ret[newToken] = insert[newToken];
								}
							}
						}

						// Do not insert token which also occur in insert. See #1525
						if (!insert.hasOwnProperty(token)) {
							ret[token] = grammar[token];
						}
					}
				}

				var old = root[inside];
				root[inside] = ret;

				// Update references in other language definitions
				_.languages.DFS(_.languages, function (key, value) {
					if (value === old && key != inside) {
						this[key] = ret;
					}
				});

				return ret;
			},

			// Traverse a language definition with Depth First Search
			"DFS": function DFS(o, callback, type, visited) {
				visited = visited || {};

				var {objId} = _.util;

				for (var i in o) {
					if (o.hasOwnProperty(i)) {
						callback.call(o, i, o[i], type || i);

						var property = o[i];
						var propertyType = _.util.type(property);

						if (propertyType === 'Object' && !visited[objId(property)]) {
							visited[objId(property)] = true;
							DFS(property, callback, null, visited);
						} else if (propertyType === 'Array' && !visited[objId(property)]) {
							visited[objId(property)] = true;
							DFS(property, callback, i, visited);
						}
					}
				}
			}
		},

		"plugins": {},

		/**
		 * This is the most high-level function in Prism’s API.
		 * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
		 * each one of them.
		 *
		 * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
		 *
		 * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
		 * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
		 * @memberof Prism
		 * @public
		 */
		"highlightAll": function (async, callback) {
			_.highlightAllUnder(document, async, callback);
		},

		/**
		 * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
		 * {@link Prism.highlightElement} on each one of them.
		 *
		 * The following hooks will be run:
		 * 1. `before-highlightall`
		 * 2. `before-all-elements-highlight`
		 * 3. All hooks of {@link Prism.highlightElement} for each element.
		 *
		 * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
		 * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
		 * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
		 * @memberof Prism
		 * @public
		 */
		"highlightAllUnder": function (container, async, callback) {
			var env = {
				"callback": callback,
				"container": container,
				"selector": 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
			};

			_.hooks.run('before-highlightall', env);

			env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));

			_.hooks.run('before-all-elements-highlight', env);

			for (var i = 0, element; element = env.elements[i++];) {
				_.highlightElement(element, async === true, env.callback);
			}
		},

		/**
		 * Highlights the code inside a single element.
		 *
		 * The following hooks will be run:
		 * 1. `before-sanity-check`
		 * 2. `before-highlight`
		 * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
		 * 4. `before-insert`
		 * 5. `after-highlight`
		 * 6. `complete`
		 *
		 * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
		 * the element's language.
		 *
		 * @param {Element} element The element containing the code.
		 * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
		 * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
		 * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
		 * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
		 *
		 * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
		 * asynchronous highlighting to work. You can build your own bundle on the
		 * [Download page](https://prismjs.com/download.html).
		 * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
		 * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
		 * @memberof Prism
		 * @public
		 */
		"highlightElement": function (element, async, callback) {
			// Find language
			var language = _.util.getLanguage(element);
			var grammar = _.languages[language];

			// Set language on the element, if not present
			_.util.setLanguage(element, language);

			// Set language on the parent, for styling
			var parent = element.parentElement;
			if (parent && parent.nodeName.toLowerCase() === 'pre') {
				_.util.setLanguage(parent, language);
			}

			var code = element.textContent;

			var env = {
				"element": element,
				"language": language,
				"grammar": grammar,
				"code": code
			};

			function insertHighlightedCode(highlightedCode) {
				env.highlightedCode = highlightedCode;

				_.hooks.run('before-insert', env);

				env.element.innerHTML = env.highlightedCode;

				_.hooks.run('after-highlight', env);
				_.hooks.run('complete', env);
				callback && callback.call(env.element);
			}

			_.hooks.run('before-sanity-check', env);

			// Plugins may change/add the parent/element
			parent = env.element.parentElement;
			if (parent && parent.nodeName.toLowerCase() === 'pre' && !parent.hasAttribute('tabindex')) {
				parent.setAttribute('tabindex', '0');
			}

			if (!env.code) {
				_.hooks.run('complete', env);
				callback && callback.call(env.element);
				return;
			}

			_.hooks.run('before-highlight', env);

			if (!env.grammar) {
				insertHighlightedCode(_.util.encode(env.code));
				return;
			}

			if (async && _self.Worker) {
				var worker = new Worker(_.filename);

				worker.onmessage = function (evt) {
					insertHighlightedCode(evt.data);
				};

				worker.postMessage(JSON.stringify({
					"language": env.language,
					"code": env.code,
					"immediateClose": true
				}));
			} else {
				insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
			}
		},

		/**
		 * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
		 * and the language definitions to use, and returns a string with the HTML produced.
		 *
		 * The following hooks will be run:
		 * 1. `before-tokenize`
		 * 2. `after-tokenize`
		 * 3. `wrap`: On each {@link Token}.
		 *
		 * @param {string} text A string with the code to be highlighted.
		 * @param {Grammar} grammar An object containing the tokens to use.
		 *
		 * Usually a language definition like `Prism.languages.markup`.
		 * @param {string} language The name of the language definition passed to `grammar`.
		 * @returns {string} The highlighted HTML.
		 * @memberof Prism
		 * @public
		 * @example
		 * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
		 */
		"highlight": function (text, grammar, language) {
			var env = {
				"code": text,
				"grammar": grammar,
				"language": language
			};
			_.hooks.run('before-tokenize', env);
			if (!env.grammar) {
				throw new Error(`The language "${  env.language  }" has no grammar.`);
			}
			env.tokens = _.tokenize(env.code, env.grammar);
			_.hooks.run('after-tokenize', env);
			return Token.stringify(_.util.encode(env.tokens), env.language);
		},

		/**
		 * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
		 * and the language definitions to use, and returns an array with the tokenized code.
		 *
		 * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
		 *
		 * This method could be useful in other contexts as well, as a very crude parser.
		 *
		 * @param {string} text A string with the code to be highlighted.
		 * @param {Grammar} grammar An object containing the tokens to use.
		 *
		 * Usually a language definition like `Prism.languages.markup`.
		 * @returns {TokenStream} An array of strings and tokens, a token stream.
		 * @memberof Prism
		 * @public
		 * @example
		 * let code = `var foo = 0;`;
		 * let tokens = Prism.tokenize(code, Prism.languages.javascript);
		 * tokens.forEach(token => {
		 *     if (token instanceof Prism.Token && token.type === 'number') {
		 *         console.log(`Found numeric literal: ${token.content}`);
		 *     }
		 * });
		 */
		"tokenize": function (text, grammar) {
			var {rest} = grammar;
			if (rest) {
				for (var token in rest) {
					grammar[token] = rest[token];
				}

				delete grammar.rest;
			}

			var tokenList = new LinkedList();
			addAfter(tokenList, tokenList.head, text);

			matchGrammar(text, tokenList, grammar, tokenList.head, 0);

			return toArray(tokenList);
		},

		/**
		 * @namespace
		 * @memberof Prism
		 * @public
		 */
		"hooks": {
			"all": {},

			/**
			 * Adds the given callback to the list of callbacks for the given hook.
			 *
			 * The callback will be invoked when the hook it is registered for is run.
			 * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
			 *
			 * One callback function can be registered to multiple hooks and the same hook multiple times.
			 *
			 * @param {string} name The name of the hook.
			 * @param {HookCallback} callback The callback function which is given environment variables.
			 * @public
			 */
			"add": function (name, callback) {
				var hooks = _.hooks.all;

				hooks[name] = hooks[name] || [];

				hooks[name].push(callback);
			},

			/**
			 * Runs a hook invoking all registered callbacks with the given environment variables.
			 *
			 * Callbacks will be invoked synchronously and in the order in which they were registered.
			 *
			 * @param {string} name The name of the hook.
			 * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
			 * @public
			 */
			"run": function (name, env) {
				var callbacks = _.hooks.all[name];

				if (!callbacks || !callbacks.length) {
					return;
				}

				for (var i = 0, callback; callback = callbacks[i++];) {
					callback(env);
				}
			}
		},

		"Token": Token
	};
	_self.Prism = _;


	// Typescript note:
	// The following can be used to import the Token type in JSDoc:
	//
	//   @typedef {InstanceType<import("./prism-core")["Token"]>} Token

	/**
	 * Creates a new token.
	 *
	 * @param {string} type See {@link Token#type type}
	 * @param {string | TokenStream} content See {@link Token#content content}
	 * @param {string|string[]} [alias] The alias(es) of the token.
	 * @param {string} [matchedStr=""] A copy of the full string this token was created from.
	 * @class
	 * @global
	 * @public
	 */
	function Token(type, content, alias, matchedStr) {

		/**
		 * The type of the token.
		 *
		 * This is usually the key of a pattern in a {@link Grammar}.
		 *
		 * @type {string}
		 * @see GrammarToken
		 * @public
		 */
		this.type = type;

		/**
		 * The strings or tokens contained by this token.
		 *
		 * This will be a token stream if the pattern matched also defined an `inside` grammar.
		 *
		 * @type {string | TokenStream}
		 * @public
		 */
		this.content = content;

		/**
		 * The alias(es) of the token.
		 *
		 * @type {string|string[]}
		 * @see GrammarToken
		 * @public
		 */
		this.alias = alias;
		// Copy of the full string this token was created from
		this.length = (matchedStr || '').length | 0;
	}

	/**
	 * A token stream is an array of strings and {@link Token Token} layout.
	 *
	 * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
	 * them.
	 *
	 * 1. No adjacent strings.
	 * 2. No empty strings.
	 *
	 *    The only exception here is the token stream that only contains the empty string and nothing else.
	 *
	 * @typedef {Array<string | Token>} TokenStream
	 * @global
	 * @public
	 */

	/**
	 * Converts the given token or token stream to an HTML representation.
	 *
	 * The following hooks will be run:
	 * 1. `wrap`: On each {@link Token}.
	 *
	 * @param {string | Token | TokenStream} o The token or token stream to be converted.
	 * @param {string} language The name of current language.
	 * @returns {string} The HTML representation of the token or token stream.
	 * @memberof Token
	 * @static
	 */
	Token.stringify = function stringify(o, language) {
		if (typeof o === 'string') {
			return o;
		}
		if (Array.isArray(o)) {
			var s = '';
			o.forEach(function (e) {
				s += stringify(e, language);
			});
			return s;
		}

		var env = {
			"type": o.type,
			"content": stringify(o.content, language),
			"tag": 'span',
			"classes": ['token',
o.type],
			"attributes": {},
			"language": language
		};

		var aliases = o.alias;
		if (aliases) {
			if (Array.isArray(aliases)) {
				Array.prototype.push.apply(env.classes, aliases);
			} else {
				env.classes.push(aliases);
			}
		}

		_.hooks.run('wrap', env);

		var attributes = '';
		for (var name in env.attributes) {
			attributes += ` ${  name  }="${  (env.attributes[name] || '').replace(/"/g, '&quot;')  }"`;
		}

		return `<${  env.tag  } class="${  env.classes.join(' ')  }"${  attributes  }>${  env.content  }</${  env.tag  }>`;
	};

	/**
	 * @param {RegExp} pattern
	 * @param {number} pos
	 * @param {string} text
	 * @param {boolean} lookbehind
	 * @returns {RegExpExecArray | null}
	 */
	function matchPattern(pattern, pos, text, lookbehind) {
		pattern.lastIndex = pos;
		var match = pattern.exec(text);
		if (match && lookbehind && match[1]) {
			// Change the match to remove the text matched by the Prism lookbehind group
			var lookbehindLength = match[1].length;
			match.index += lookbehindLength;
			match[0] = match[0].slice(lookbehindLength);
		}
		return match;
	}

	/**
	 * @param {string} text
	 * @param {LinkedList<string | Token>} tokenList
	 * @param {any} grammar
	 * @param {LinkedListNode<string | Token>} startNode
	 * @param {number} startPos
	 * @param {RematchOptions} [rematch]
	 * @returns {void}
	 * @private
	 *
	 * @typedef RematchOptions
	 * @property {string} cause
	 * @property {number} reach
	 */
	function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
		for (var token in grammar) {
			if (!grammar.hasOwnProperty(token) || !grammar[token]) {
				continue;
			}

			var patterns = grammar[token];
			patterns = Array.isArray(patterns)
? patterns
: [patterns];

			for (var j = 0; j < patterns.length; ++j) {
				if (rematch && rematch.cause == `${token  },${  j}`) {
					return;
				}

				var patternObj = patterns[j];
				var {inside} = patternObj;
				var lookbehind = Boolean(patternObj.lookbehind);
				var greedy = Boolean(patternObj.greedy);
				var {alias} = patternObj;

				if (greedy && !patternObj.pattern.global) {
					// Without the global flag, lastIndex won't work
					var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
					patternObj.pattern = RegExp(patternObj.pattern.source, `${flags  }g`);
				}

				/** @type {RegExp} */
				var pattern = patternObj.pattern || patternObj;

				for ( // Iterate the token list and keep track of the current token/string position
					var currentNode = startNode.next, pos = startPos;
					currentNode !== tokenList.tail;
					pos += currentNode.value.length, currentNode = currentNode.next
				) {

					if (rematch && pos >= rematch.reach) {
						break;
					}

					var str = currentNode.value;

					if (tokenList.length > text.length) {
						// Something went terribly wrong, ABORT, ABORT!
						return;
					}

					if (str instanceof Token) {
						continue;
					}

					var removeCount = 1; // This is the to parameter of removeBetween
					var match;

					if (greedy) {
						match = matchPattern(pattern, pos, text, lookbehind);
						if (!match || match.index >= text.length) {
							break;
						}

						var from = match.index;
						var to = match.index + match[0].length;
						var p = pos;

						// Find the node that contains the match
						p += currentNode.value.length;
						while (from >= p) {
							currentNode = currentNode.next;
							p += currentNode.value.length;
						}
						// Adjust pos (and p)
						p -= currentNode.value.length;
						pos = p;

						// The current node is a Token, then the match starts inside another Token, which is invalid
						if (currentNode.value instanceof Token) {
							continue;
						}

						// Find the last node which is affected by this match
						for (
							var k = currentNode;
							k !== tokenList.tail && (p < to || typeof k.value === 'string');
							k = k.next
						) {
							removeCount++;
							p += k.value.length;
						}
						removeCount--;

						// Replace with the new match
						str = text.slice(pos, p);
						match.index -= pos;
					} else {
						match = matchPattern(pattern, 0, str, lookbehind);
						if (!match) {
							continue;
						}
					}

					// eslint-disable-next-line no-redeclare
					var from = match.index;
					var matchStr = match[0];
					var before = str.slice(0, from);
					var after = str.slice(from + matchStr.length);

					var reach = pos + str.length;
					if (rematch && reach > rematch.reach) {
						rematch.reach = reach;
					}

					var removeFrom = currentNode.prev;

					if (before) {
						removeFrom = addAfter(tokenList, removeFrom, before);
						pos += before.length;
					}

					removeRange(tokenList, removeFrom, removeCount);

					var wrapped = new Token(token, inside
? _.tokenize(matchStr, inside)
: matchStr, alias, matchStr);
					currentNode = addAfter(tokenList, removeFrom, wrapped);

					if (after) {
						addAfter(tokenList, currentNode, after);
					}

					if (removeCount > 1) {
						// At least one Token object was removed, so we have to do some rematching
						// This can only happen if the current pattern is greedy

						/** @type {RematchOptions} */
						var nestedRematch = {
							"cause": `${token  },${  j}`,
							"reach": reach
						};
						matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);

						// The reach might have been extended because of the rematching
						if (rematch && nestedRematch.reach > rematch.reach) {
							rematch.reach = nestedRematch.reach;
						}
					}
				}
			}
		}
	}

	/**
	 * @typedef LinkedListNode
	 * @property {T} value
	 * @property {LinkedListNode<T> | null} prev The previous node.
	 * @property {LinkedListNode<T> | null} next The next node.
	 * @template T
	 * @private
	 */

	/**
	 * @template T
	 * @private
	 */
	function LinkedList() {

		/** @type {LinkedListNode<T>} */
		var head = {value: null,
prev: null,
next: null};

		/** @type {LinkedListNode<T>} */
		var tail = {value: null,
prev: head,
next: null};
		head.next = tail;

		/** @type {LinkedListNode<T>} */
		this.head = head;

		/** @type {LinkedListNode<T>} */
		this.tail = tail;
		this.length = 0;
	}

	/**
	 * Adds a new node with the given value to the list.
	 *
	 * @param {LinkedList<T>} list
	 * @param {LinkedListNode<T>} node
	 * @param {T} value
	 * @returns {LinkedListNode<T>} The added node.
	 * @template T
	 */
	function addAfter(list, node, value) {
		// Assumes that node != list.tail && values.length >= 0
		var {next} = node;

		var newNode = {value: value,
prev: node,
next: next};
		node.next = newNode;
		next.prev = newNode;
		list.length++;

		return newNode;
	}

	/**
	 * Removes `count` nodes after the given node. The given node will not be removed.
	 *
	 * @param {LinkedList<T>} list
	 * @param {LinkedListNode<T>} node
	 * @param {number} count
	 * @template T
	 */
	function removeRange(list, node, count) {
		var {next} = node;
		for (var i = 0; i < count && next !== list.tail; i++) {
			next = next.next;
		}
		node.next = next;
		next.prev = node;
		list.length -= i;
	}

	/**
	 * @param {LinkedList<T>} list
	 * @returns {T[]}
	 * @template T
	 */
	function toArray(list) {
		var array = [];
		var node = list.head.next;
		while (node !== list.tail) {
			array.push(node.value);
			node = node.next;
		}
		return array;
	}


	if (!_self.document) {
		if (!_self.addEventListener) {
			// In Node.js
			return _;
		}

		if (!_.disableWorkerMessageHandler) {
			// In worker
			_self.addEventListener('message', function (evt) {
				var message = JSON.parse(evt.data);
				var lang = message.language;
				var {code} = message;
				var {immediateClose} = message;

				_self.postMessage(_.highlight(code, _.languages[lang], lang));
				if (immediateClose) {
					_self.close();
				}
			}, false);
		}

		return _;
	}

	// Get current script and highlight
	var script = _.util.currentScript();

	if (script) {
		_.filename = script.src;

		if (script.hasAttribute('data-manual')) {
			_.manual = true;
		}
	}

	function highlightAutomaticallyCallback() {
		if (!_.manual) {
			_.highlightAll();
		}
	}

	if (!_.manual) {
		// If the document state is "loading", then we'll use DOMContentLoaded.
		// If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
		// DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
		// Might take longer one animation frame to execute which can create a race condition where only some plugins have
		// Been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
		// See https://github.com/PrismJS/prism/issues/2102
		var {readyState} = document;
		if (readyState === 'loading' || readyState === 'interactive' && script && script.defer) {
			document.addEventListener('DOMContentLoaded', highlightAutomaticallyCallback);
		} else if (window.requestAnimationFrame) {
				window.requestAnimationFrame(highlightAutomaticallyCallback);
			} else {
				window.setTimeout(highlightAutomaticallyCallback, 16);
			}
	}

	return _;

}(_self));

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Prism;
}

// Hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
	global.Prism = Prism;
}

// some additional documentation/types

/**
 * The expansion of a simple `RegExp` literal to support additional properties.
 *
 * @typedef GrammarToken
 * @property {RegExp} pattern The regular expression of the token.
 * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
 * @property {boolean} [greedy=false] Whether the token is greedy.
 * @property {string|string[]} [alias] An optional alias or list of aliases.
 * @property {Grammar} [inside] The nested grammar of this token.
 *
 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
 *
 * This can be used to make nested and even recursive language definitions.
 *
 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
 * each another.
 * @global
 * @public
 */

/**
 * @typedef Grammar
 * @type {Object<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>}
 * @property {Grammar} [rest] An optional grammar object that will be appended to this grammar.
 * @global
 * @public
 */

/**
 * A function which will invoked after an element was successfully highlighted.
 *
 * @callback HighlightCallback
 * @param {Element} element The element successfully highlighted.
 * @returns {void}
 * @global
 * @public
 */

/**
 * @callback HookCallback
 * @param {Object<string, any>} env The environment variables of the hook.
 * @returns {void}
 * @global
 * @public
 */

Prism.languages.markup = {
	'comment': {
		"pattern": /<!--(?:(?!<!--)[\s\S])*?-->/,
		"greedy": true
	},
	'prolog': {
		"pattern": /<\?[\s\S]+?\?>/,
		"greedy": true
	},
	'doctype': {
		// https://www.w3.org/TR/xml/#NT-doctypedecl
		"pattern": /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
		"greedy": true,
		"inside": {
			'internal-subset': {
				"pattern": /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
				"lookbehind": true,
				"greedy": true,
				"inside": null // See below
			},
			'string': {
				"pattern": /"[^"]*"|'[^']*'/,
				"greedy": true
			},
			'punctuation': /^<!|>$|[[\]]/,
			'doctype-tag': /^DOCTYPE/i,
			'name': /[^\s<>'"]+/
		}
	},
	'cdata': {
		"pattern": /<!\[CDATA\[[\s\S]*?\]\]>/i,
		"greedy": true
	},
	'tag': {
		"pattern": /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
		"greedy": true,
		"inside": {
			'tag': {
				"pattern": /^<\/?[^\s>\/]+/,
				"inside": {
					'punctuation': /^<\/?/,
					'namespace': /^[^\s>\/:]+:/
				}
			},
			'special-attr': [],
			'attr-value': {
				"pattern": /[=]\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
				"inside": {
					'punctuation': [
						{
							"pattern": /^=/,
							"alias": 'attr-equals'
						},
						{
							"pattern": /^(\s*)["']|["']$/,
							"lookbehind": true
						}
					]
				}
			},
			'punctuation': /\/?>/,
			'attr-name': {
				"pattern": /[^\s>\/]+/,
				"inside": {
					'namespace': /^[^\s>\/:]+:/
				}
			}

		}
	},
	'entity': [
		{
			"pattern": /&[\da-z]{1,8};/i,
			"alias": 'named-entity'
		},
		/&#x?[\da-f]{1,8};/i
	]
};

Prism.languages.markup.tag.inside['attr-value'].inside.entity =
	Prism.languages.markup.entity;
Prism.languages.markup.doctype.inside['internal-subset'].inside = Prism.languages.markup;

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function (env) {

	if (env.type === 'entity') {
		env.attributes.title = env.content.replace(/&amp;/, '&');
	}
});

Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {

	/**
	 * Adds an inlined language to markup.
	 *
	 * An example of an inlined language is CSS with `<style>` tags.
	 *
	 * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
	 * case insensitive.
	 * @param {string} lang The language key.
	 * @example
	 * addInlined('style', 'css');
	 */
	"value": function addInlined(tagName, lang) {
		var includedCdataInside = {};
		includedCdataInside[`language-${  lang}`] = {
			"pattern": /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
			"lookbehind": true,
			"inside": Prism.languages[lang]
		};
		includedCdataInside.cdata = /^<!\[CDATA\[|\]\]>$/i;

		var inside = {
			'included-cdata': {
				"pattern": /<!\[CDATA\[[\s\S]*?\]\]>/i,
				"inside": includedCdataInside
			}
		};
		inside[`language-${  lang}`] = {
			"pattern": /[\s\S]+/,
			"inside": Prism.languages[lang]
		};

		var def = {};
		def[tagName] = {
			"pattern": RegExp((/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/).source.replace(/__/g, function () {
 return tagName; 
}), 'i'),
			"lookbehind": true,
			"greedy": true,
			"inside": inside
		};

		Prism.languages.insertBefore('markup', 'cdata', def);
	}
});
Object.defineProperty(Prism.languages.markup.tag, 'addAttribute', {

	/**
	 * Adds an pattern to highlight languages embedded in HTML attributes.
	 *
	 * An example of an inlined language is CSS with `style` attributes.
	 *
	 * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
	 * case insensitive.
	 * @param {string} lang The language key.
	 * @example
	 * addAttribute('style', 'css');
	 */
	"value": function (attrName, lang) {
		Prism.languages.markup.tag.inside['special-attr'].push({
			"pattern": RegExp(
				(/(^|["'\s])/).source + '(?:' + attrName + ')' + (/\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/).source,
				'i'
			),
			"lookbehind": true,
			"inside": {
				'attr-name': /^[^\s=]+/,
				'attr-value': {
					"pattern": /[=][\s\S]+/,
					"inside": {
						'value': {
							"pattern": /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
							"lookbehind": true,
							"alias": [lang,
'language-' + lang],
							"inside": Prism.languages[lang]
						},
						'punctuation': [
							{
								"pattern": /^=/,
								"alias": 'attr-equals'
							},
							/"|'/
						]
					}
				}
			}
		});
	}
});

Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.xml = Prism.languages.extend('markup', {});
Prism.languages.ssml = Prism.languages.xml;
Prism.languages.atom = Prism.languages.xml;
Prism.languages.rss = Prism.languages.xml;

(function (Prism) {

	var string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;

	Prism.languages.css = {
		'comment': /\/\*[\s\S]*?\*\//,
		'atrule': {
			"pattern": RegExp(`@[\\w-](?:${  /[^;{\s"']|\s+(?!\s)/.source  }|${  string.source  })*?${  /(?:;|(?=\s*\{))/.source}`),
			"inside": {
				'rule': /^@[\w-]+/,
				'selector-function-argument': {
					"pattern": /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
					"lookbehind": true,
					"alias": 'selector'
				},
				'keyword': {
					"pattern": /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
					"lookbehind": true
				}
				// See rest below
			}
		},
		'url': {
			// https://drafts.csswg.org/css-values-3/#urls
			"pattern": RegExp(`\\burl\\((?:${  string.source  }|${  /(?:[^\\\r\n()"']|\\[\s\S])*/.source  })\\)`, 'i'),
			"greedy": true,
			"inside": {
				'function': /^url/i,
				'punctuation': /^\(|\)$/,
				'string': {
					"pattern": RegExp(`^${  string.source  }$`),
					"alias": 'url'
				}
			}
		},
		'selector': {
			"pattern": RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|${  string.source  })*(?=\\s*\\{)`),
			"lookbehind": true
		},
		'string': {
			"pattern": string,
			"greedy": true
		},
		'property': {
			"pattern": /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
			"lookbehind": true
		},
		'important': /!important\b/i,
		'function': {
			"pattern": /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
			"lookbehind": true
		},
		'punctuation': /[(){};:,]/
	};

	Prism.languages.css.atrule.inside.rest = Prism.languages.css;

	var {markup} = Prism.languages;
	if (markup) {
		markup.tag.addInlined('style', 'css');
		markup.tag.addAttribute('style', 'css');
	}

}(Prism));

Prism.languages.clike = {
	'comment': [
		{
			"pattern": /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
			"lookbehind": true,
			"greedy": true
		},
		{
			"pattern": /(^|[^\\:])\/\/.*/,
			"lookbehind": true,
			"greedy": true
		}
	],
	'string': {
		"pattern": /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
		"greedy": true
	},
	'class-name': {
		"pattern": /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
		"lookbehind": true,
		"inside": {
			'punctuation': /[.\\]/
		}
	},
	'keyword': /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
	'boolean': /\b(?:false|true)\b/,
	'function': /\b\w+(?=\()/,
	'number': /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
	'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
	'punctuation': /[{}[\];(),.:]/
};

Prism.languages.javascript = Prism.languages.extend('clike', {
	'class-name': [
		Prism.languages.clike['class-name'],
		{
			"pattern": /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
			"lookbehind": true
		}
	],
	'keyword': [
		{
			"pattern": /((?:^|\})\s*)catch\b/,
			"lookbehind": true
		},
		{
			"pattern": /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
			"lookbehind": true
		}
	],
	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
	'function': /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
	'number': {
		"pattern": RegExp(/(^|[^\w$])/.source +
			'(?:' +
			(
				// Constant
				(/NaN|Infinity/).source +
				'|' +
				// Binary integer
				(/0[bB][01]+(?:_[01]+)*n?/).source +
				'|' +
				// Octal integer
				(/0[oO][0-7]+(?:_[0-7]+)*n?/).source +
				'|' +
				// Hexadecimal integer
				(/0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/).source +
				'|' +
				// Decimal bigint
				(/\d+(?:_\d+)*n/).source +
				'|' +
				// Decimal number (integer or float) but no bigint
				(/(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/).source
			) +
			')' +
			(/(?![\w$])/).source),
		"lookbehind": true
	},
	'operator': /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
});

Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;

Prism.languages.insertBefore('javascript', 'keyword', {
	'regex': {
		"pattern": RegExp(
			// Lookbehind
			// eslint-disable-next-line regexp/no-dupe-characters-character-class
			(/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/).source +
			// Regex pattern:
			// There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
			// Classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
			// With the only syntax, so we have to define 2 different regex patterns.
			(/\//).source +
			'(?:' +
			(/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/).source +
			'|' +
			// `v` flag syntax. This supports 3 levels of nested character classes.
			(/(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/).source +
			')' +
			// Lookahead
			(/(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/).source),
		"lookbehind": true,
		"greedy": true,
		"inside": {
			'regex-source': {
				"pattern": /^(\/)[\s\S]+(?=\/[a-z]*$)/,
				"lookbehind": true,
				"alias": 'language-regex',
				"inside": Prism.languages.regex
			},
			'regex-delimiter': /^\/|\/$/,
			'regex-flags': /^[a-z]+$/
		}
	},
	// This must be declared before keyword because we use "function" inside the look-forward
	'function-variable': {
		"pattern": /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
		"alias": 'function'
	},
	'parameter': [
		{
			"pattern": /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
			"lookbehind": true,
			"inside": Prism.languages.javascript
		},
		{
			"pattern": /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
			"lookbehind": true,
			"inside": Prism.languages.javascript
		},
		{
			"pattern": /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
			"lookbehind": true,
			"inside": Prism.languages.javascript
		},
		{
			"pattern": /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
			"lookbehind": true,
			"inside": Prism.languages.javascript
		}
	],
	'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
});

Prism.languages.insertBefore('javascript', 'string', {
	'hashbang': {
		"pattern": /^#!.*/,
		"greedy": true,
		"alias": 'comment'
	},
	'template-string': {
		"pattern": /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
		"greedy": true,
		"inside": {
			'template-punctuation': {
				"pattern": /^`|`$/,
				"alias": 'string'
			},
			'interpolation': {
				"pattern": /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
				"lookbehind": true,
				"inside": {
					'interpolation-punctuation': {
						"pattern": /^\$\{|\}$/,
						"alias": 'punctuation'
					},
					"rest": Prism.languages.javascript
				}
			},
			'string': /[\s\S]+/
		}
	},
	'string-property': {
		"pattern": /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
		"lookbehind": true,
		"greedy": true,
		"alias": 'property'
	}
});

Prism.languages.insertBefore('javascript', 'operator', {
	'literal-property': {
		"pattern": /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
		"lookbehind": true,
		"alias": 'property'
	}
});

if (Prism.languages.markup) {
	Prism.languages.markup.tag.addInlined('script', 'javascript');

	// Add attribute support for all DOM events.
	// https://developer.mozilla.org/en-US/docs/Web/Events#Standard_events
	Prism.languages.markup.tag.addAttribute(
		(/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/).source,
		'javascript'
	);
}

Prism.languages.js = Prism.languages.javascript;

(function (Prism) {
	// $ set | grep '^[A-Z][^[:space:]]*=' | cut -d= -f1 | tr '\n' '|'
	// + LC_ALL, RANDOM, REPLY, SECONDS.
	// + make sure PS1..4 are here as they are not always set,
	// - some useless things.
	var envVars = '\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b';

	var commandAfterHeredoc = {
		"pattern": /(^(["']?)\w+\2)[ \t]+\S.*/,
		"lookbehind": true,
		"alias": 'punctuation', // This looks reasonably well in all themes
		"inside": null // See below
	};

	var insideString = {
		'bash': commandAfterHeredoc,
		'environment': {
			"pattern": RegExp(`\\$${  envVars}`),
			"alias": 'constant'
		},
		'variable': [
			// [0]: Arithmetic Environment
			{
				"pattern": /\$?\(\([\s\S]+?\)\)/,
				"greedy": true,
				"inside": {
					// If there is a $ sign at the beginning highlight $(( and )) as variable
					'variable': [
						{
							"pattern": /(^\$\(\([\s\S]+)\)\)/,
							"lookbehind": true
						},
						/^\$\(\(/
					],
					'number': /\b0x[\dA-Fa-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee]-?\d+)?/,
					// Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
					'operator': /--|\+\+|\*\*=?|<<=?|>>=?|&&|\|\||[=!+\-*/%<>^&|]=?|[?~:]/,
					// If there is no $ sign at the beginning highlight (( and )) as punctuation
					'punctuation': /\(\(?|\)\)?|,|;/
				}
			},
			// [1]: Command Substitution
			{
				"pattern": /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
				"greedy": true,
				"inside": {
					'variable': /^\$\(|^`|\)$|`$/
				}
			},
			// [2]: Brace expansion
			{
				"pattern": /\$\{[^}]+\}/,
				"greedy": true,
				"inside": {
					'operator': /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
					'punctuation': /[\[\]]/,
					'environment': {
						"pattern": RegExp(`(\\{)${  envVars}`),
						"lookbehind": true,
						"alias": 'constant'
					}
				}
			},
			/\$(?:\w+|[#?*!@$])/
		],
		// Escape sequences from echo and printf's manuals, and escaped quotes.
		'entity': /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|U[0-9a-fA-F]{8}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,2})/
	};

	Prism.languages.bash = {
		'shebang': {
			"pattern": /^#!\s*\/.*/,
			"alias": 'important'
		},
		'comment': {
			"pattern": /(^|[^"{\\$])#.*/,
			"lookbehind": true
		},
		'function-name': [
			// A) function foo {
			// B) foo() {
			// C) function foo() {
			// But not “foo {”
			{
				// A) and c)
				"pattern": /(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/,
				"lookbehind": true,
				"alias": 'function'
			},
			{
				// B)
				"pattern": /\b[\w-]+(?=\s*\(\s*\)\s*\{)/,
				"alias": 'function'
			}
		],
		// Highlight variable names as variables in for and select beginnings.
		'for-or-select': {
			"pattern": /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
			"alias": 'variable',
			"lookbehind": true
		},
		// Highlight variable names as variables in the left-hand part
		// Of assignments (“=” and “+=”).
		'assign-left': {
			"pattern": /(^|[\s;|&]|[<>]\()\w+(?:\.\w+)*(?=\+?=)/,
			"inside": {
				'environment': {
					"pattern": RegExp(`(^|[\\s;|&]|[<>]\\()${  envVars}`),
					"lookbehind": true,
					"alias": 'constant'
				}
			},
			"alias": 'variable',
			"lookbehind": true
		},
		// Highlight parameter names as variables
		'parameter': {
			"pattern": /(^|\s)-{1,2}(?:\w+:[+-]?)?\w+(?:\.\w+)*(?=[=\s]|$)/,
			"alias": 'variable',
			"lookbehind": true
		},
		'string': [
			// Support for Here-documents https://en.wikipedia.org/wiki/Here_document
			{
				"pattern": /((?:^|[^<])<<-?\s*)(\w+)\s[\s\S]*?(?:\r?\n|\r)\2/,
				"lookbehind": true,
				"greedy": true,
				"inside": insideString
			},
			// Here-document with quotes around the tag
			// → No expansion (so no “inside”).
			{
				"pattern": /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,
				"lookbehind": true,
				"greedy": true,
				"inside": {
					'bash': commandAfterHeredoc
				}
			},
			// “Normal” string
			{
				// https://www.gnu.org/software/bash/manual/html_node/Double-Quotes.html
				"pattern": /(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/,
				"lookbehind": true,
				"greedy": true,
				"inside": insideString
			},
			{
				// https://www.gnu.org/software/bash/manual/html_node/Single-Quotes.html
				"pattern": /(^|[^$\\])'[^']*'/,
				"lookbehind": true,
				"greedy": true
			},
			{
				// https://www.gnu.org/software/bash/manual/html_node/ANSI_002dC-Quoting.html
				"pattern": /\$'(?:[^'\\]|\\[\s\S])*'/,
				"greedy": true,
				"inside": {
					'entity': insideString.entity
				}
			}
		],
		'environment': {
			"pattern": RegExp(`\\$?${  envVars}`),
			"alias": 'constant'
		},
		'variable': insideString.variable,
		'function': {
			"pattern": /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|apt-cache|apt-get|aptitude|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cargo|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|docker|docker-compose|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|java|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|node|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|podman|podman-compose|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|sysctl|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vcpkg|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
			"lookbehind": true
		},
		'keyword': {
			"pattern": /(^|[\s;|&]|[<>]\()(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while)(?=$|[)\s;|&])/,
			"lookbehind": true
		},
		// https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
		'builtin': {
			"pattern": /(^|[\s;|&]|[<>]\()(?:\.|:|alias|bind|break|builtin|caller|cd|command|continue|declare|echo|enable|eval|exec|exit|export|getopts|hash|help|let|local|logout|mapfile|printf|pwd|read|readarray|readonly|return|set|shift|shopt|source|test|times|trap|type|typeset|ulimit|umask|unalias|unset)(?=$|[)\s;|&])/,
			"lookbehind": true,
			// Alias added to make those easier to distinguish from strings.
			"alias": 'class-name'
		},
		'boolean': {
			"pattern": /(^|[\s;|&]|[<>]\()(?:false|true)(?=$|[)\s;|&])/,
			"lookbehind": true
		},
		'file-descriptor': {
			"pattern": /\B&\d\b/,
			"alias": 'important'
		},
		'operator': {
			// Lots of redirections here, but not just that.
			"pattern": /\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,
			"inside": {
				'file-descriptor': {
					"pattern": /^\d/,
					"alias": 'important'
				}
			}
		},
		'punctuation': /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
		'number': {
			"pattern": /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
			"lookbehind": true
		}
	};

	commandAfterHeredoc.inside = Prism.languages.bash;

	/* Patterns in command substitution. */
	var toBeCopied = [
		'comment',
		'function-name',
		'for-or-select',
		'assign-left',
		'parameter',
		'string',
		'environment',
		'function',
		'keyword',
		'builtin',
		'boolean',
		'file-descriptor',
		'operator',
		'punctuation',
		'number'
	];
	var {inside} = insideString.variable[1];
	for (var i = 0; i < toBeCopied.length; i++) {
		inside[toBeCopied[i]] = Prism.languages.bash[toBeCopied[i]];
	}

	Prism.languages.sh = Prism.languages.bash;
	Prism.languages.shell = Prism.languages.bash;
}(Prism));

(function (Prism) {

	var string = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;
	var selectorInside;

	Prism.languages.css.selector = {
		"pattern": Prism.languages.css.selector.pattern,
		"lookbehind": true,
		"inside": selectorInside = {
			'pseudo-element': /:(?:after|before|first-letter|first-line|selection)|::[-\w]+/,
			'pseudo-class': /:[-\w]+/,
			'class': /\.[-\w]+/,
			'id': /#[-\w]+/,
			'attribute': {
				"pattern": RegExp(`\\[(?:[^[\\]"']|${  string.source  })*\\]`),
				"greedy": true,
				"inside": {
					'punctuation': /^\[|\]$/,
					'case-sensitivity': {
						"pattern": /(\s)[si]$/i,
						"lookbehind": true,
						"alias": 'keyword'
					},
					'namespace': {
						"pattern": /^(\s*)(?:(?!\s)[-*\w\xA0-\uFFFF])*\|(?!=)/,
						"lookbehind": true,
						"inside": {
							'punctuation': /\|$/
						}
					},
					'attr-name': {
						"pattern": /^(\s*)(?:(?!\s)[-\w\xA0-\uFFFF])+/,
						"lookbehind": true
					},
					'attr-value': [
						string,
						{
							"pattern": /(=\s*)(?:(?!\s)[-\w\xA0-\uFFFF])+(?=\s*$)/,
							"lookbehind": true
						}
					],
					'operator': /[|~*^$]?=/
				}
			},
			'n-th': [
				{
					"pattern": /(\(\s*)[+-]?\d*[\dn](?:\s*[+-]\s*\d+)?(?=\s*\))/,
					"lookbehind": true,
					"inside": {
						'number': /[\dn]+/,
						'operator': /[+-]/
					}
				},
				{
					"pattern": /(\(\s*)(?:even|odd)(?=\s*\))/i,
					"lookbehind": true
				}
			],
			'combinator': />|\+|~|\|\|/,

			// The `tag` token has been existed and removed.
			// Because we can't find a perfect tokenize to match it.
			// If you want to add it, please read https://github.com/PrismJS/prism/pull/2373 first.

			'punctuation': /[(),]/
		}
	};

	Prism.languages.css.atrule.inside['selector-function-argument'].inside = selectorInside;

	Prism.languages.insertBefore('css', 'property', {
		'variable': {
			"pattern": /(^|[^-\w\xA0-\uFFFF])--(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*/i,
			"lookbehind": true
		}
	});

	var unit = {
		"pattern": /(\b\d+)(?:%|[a-z]+(?![\w-]))/,
		"lookbehind": true
	};
	// 123 -123 .123 -.123 12.3 -12.3
	var number = {
		"pattern": /(^|[^\w.-])-?(?:\d+(?:\.\d+)?|\.\d+)/,
		"lookbehind": true
	};

	Prism.languages.insertBefore('css', 'function', {
		'operator': {
			"pattern": /(\s)[+\-*\/](?=\s)/,
			"lookbehind": true
		},
		// CAREFUL!
		// Previewers and Inline color use hexcode and color.
		'hexcode': {
			"pattern": /\B#[\da-f]{3,8}\b/i,
			"alias": 'color'
		},
		'color': [
			{
				"pattern": /(^|[^\w-])(?:AliceBlue|AntiqueWhite|Aqua|Aquamarine|Azure|Beige|Bisque|Black|BlanchedAlmond|Blue|BlueViolet|Brown|BurlyWood|CadetBlue|Chartreuse|Chocolate|Coral|CornflowerBlue|Cornsilk|Crimson|Cyan|DarkBlue|DarkCyan|DarkGoldenRod|DarkGr[ae]y|DarkGreen|DarkKhaki|DarkMagenta|DarkOliveGreen|DarkOrange|DarkOrchid|DarkRed|DarkSalmon|DarkSeaGreen|DarkSlateBlue|DarkSlateGr[ae]y|DarkTurquoise|DarkViolet|DeepPink|DeepSkyBlue|DimGr[ae]y|DodgerBlue|FireBrick|FloralWhite|ForestGreen|Fuchsia|Gainsboro|GhostWhite|Gold|GoldenRod|Gr[ae]y|Green|GreenYellow|HoneyDew|HotPink|IndianRed|Indigo|Ivory|Khaki|Lavender|LavenderBlush|LawnGreen|LemonChiffon|LightBlue|LightCoral|LightCyan|LightGoldenRodYellow|LightGr[ae]y|LightGreen|LightPink|LightSalmon|LightSeaGreen|LightSkyBlue|LightSlateGr[ae]y|LightSteelBlue|LightYellow|Lime|LimeGreen|Linen|Magenta|Maroon|MediumAquaMarine|MediumBlue|MediumOrchid|MediumPurple|MediumSeaGreen|MediumSlateBlue|MediumSpringGreen|MediumTurquoise|MediumVioletRed|MidnightBlue|MintCream|MistyRose|Moccasin|NavajoWhite|Navy|OldLace|Olive|OliveDrab|Orange|OrangeRed|Orchid|PaleGoldenRod|PaleGreen|PaleTurquoise|PaleVioletRed|PapayaWhip|PeachPuff|Peru|Pink|Plum|PowderBlue|Purple|RebeccaPurple|Red|RosyBrown|RoyalBlue|SaddleBrown|Salmon|SandyBrown|SeaGreen|SeaShell|Sienna|Silver|SkyBlue|SlateBlue|SlateGr[ae]y|Snow|SpringGreen|SteelBlue|Tan|Teal|Thistle|Tomato|Transparent|Turquoise|Violet|Wheat|White|WhiteSmoke|Yellow|YellowGreen)(?![\w-])/i,
				"lookbehind": true
			},
			{
				"pattern": /\b(?:hsl|rgb)\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*\)\B|\b(?:hsl|rgb)a\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*(?:0|0?\.\d+|1)\s*\)\B/i,
				"inside": {
					unit,
					number,
					'function': /[\w-]+(?=\()/,
					'punctuation': /[(),]/
				}
			}
		],
		// It's important that there is no boundary assertion after the hex digits
		'entity': /\\[\da-f]{1,8}/i,
		unit,
		number
	});

}(Prism));

Prism.languages.git = {

	// A simple one line comment like in a git status command
	// For instance:
	// $ git status
	// # On branch infinite-scroll
	// # Your branch and 'origin/sharedBranches/frontendTeam/infinite-scroll' have diverged,
	// # and have 1 and 2 different commits each, respectively.
	// nothing to commit (working directory clean)
	'comment': /^#.*/m,

	// Regexp to match the changed lines in a git diff output. Check the example below.
	'deleted': /^[-–].*/m,
	'inserted': /^\+.*/m,

	// a string (double and simple quote)
	'string': /("|')(?:\\.|(?!\1)[^\\\r\n])*\1/,

	// a git command. It starts with a random prompt finishing by a $, then "git" then some other parameters
	// For instance:
	// $ git add file.txt
	'command': {
		"pattern": /^.*\$ git .*$/m,
		"inside": {

			// A git command can contain a parameter starting by a single or a double dash followed by a string
			// For instance:
			// $ git diff --cached
			// $ git log -p
			'parameter': /\s--?\w+/
		}
	},

	// Coordinates displayed in a git diff command
	// For instance:
	// $ git diff
	// diff --git file.txt file.txt
	// index 6214953..1d54a52 100644
	// --- file.txt
	// +++ file.txt
	// @@ -1 +1,2 @@
	// -Here's my tetx file
	// +Here's my text file
	// +And this is the second line
	'coord': /^@@.*@@$/m,

	// Match a "commit [SHA1]" line in a git log output.
	// For instance:
	// $ git log
	// commit a11a14ef7e26f2ca62d4b35eac455ce636d0dc09
	// Author: lgiraudel
	// Date:   Mon Feb 17 11:18:34 2014 +0100
	// 
	//     Add of a new line
	'commit-sha1': /^commit \w{40}$/m
};

// https://www.json.org/json-en.html
Prism.languages.json = {
	'property': {
		"pattern": /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
		"lookbehind": true,
		"greedy": true
	},
	'string': {
		"pattern": /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
		"lookbehind": true,
		"greedy": true
	},
	'comment': {
		"pattern": /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
		"greedy": true
	},
	'number': /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
	'punctuation': /[{}[\],]/,
	'operator': /:/,
	'boolean': /\b(?:false|true)\b/,
	'null': {
		"pattern": /\bnull\b/,
		"alias": 'keyword'
	}
};

Prism.languages.webmanifest = Prism.languages.json;

(function (Prism) {

	// Allow only one line break
	var inner = (/(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/).source;

	/**
	 * This function is intended for the creation of the bold or italic pattern.
	 *
	 * This also adds a lookbehind group to the given pattern to ensure that the pattern is not backslash-escaped.
	 *
	 * _Note:_ Keep in mind that this adds a capturing group.
	 *
	 * @param {string} pattern
	 * @returns {RegExp}
	 */
	function createInline(pattern) {
		pattern = pattern.replace(/<inner>/g, function () {
 return inner; 
});
		return RegExp((/((?:^|[^\\])(?:\\{2})*)/).source + '(?:' + pattern + ')');
	}


	var tableCell = (/(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/).source;
	var tableRow = (/\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/).source.replace(/__/g, function () {
 return tableCell; 
});
	var tableLine = (/\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/).source;


	Prism.languages.markdown = Prism.languages.extend('markup', {});
	Prism.languages.insertBefore('markdown', 'prolog', {
		'front-matter-block': {
			"pattern": /(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,
			"lookbehind": true,
			"greedy": true,
			"inside": {
				'punctuation': /^---|---$/,
				'front-matter': {
					"pattern": /\S+(?:\s+\S+)*/,
					"alias": ['yaml',
'language-yaml'],
					"inside": Prism.languages.yaml
				}
			}
		},
		'blockquote': {
			// > ...
			"pattern": /^>(?:[\t ]*>)*/m,
			"alias": 'punctuation'
		},
		'table': {
			"pattern": RegExp(`^${  tableRow  }${tableLine  }(?:${  tableRow  })*`, 'm'),
			"inside": {
				'table-data-rows': {
					"pattern": RegExp(`^(${  tableRow  }${tableLine  })(?:${  tableRow  })*$`),
					"lookbehind": true,
					"inside": {
						'table-data': {
							"pattern": RegExp(tableCell),
							"inside": Prism.languages.markdown
						},
						'punctuation': /\|/
					}
				},
				'table-line': {
					"pattern": RegExp(`^(${  tableRow  })${  tableLine  }$`),
					"lookbehind": true,
					"inside": {
						'punctuation': /\||:?-{3,}:?/
					}
				},
				'table-header-row': {
					"pattern": RegExp(`^${  tableRow  }$`),
					"inside": {
						'table-header': {
							"pattern": RegExp(tableCell),
							"alias": 'important',
							"inside": Prism.languages.markdown
						},
						'punctuation': /\|/
					}
				}
			}
		},
		'code': [
			{
				// Prefixed by 4 spaces or 1 tab and preceded by an empty line
				"pattern": /((?:^|\n)[ \t]*\n|(?:^|\r\n?)[ \t]*\r\n?)(?: {4}|\t).+(?:(?:\n|\r\n?)(?: {4}|\t).+)*/,
				"lookbehind": true,
				"alias": 'keyword'
			},
			{
				// ```optional language
				// Code block
				// ```
				"pattern": /^```[\s\S]*?^```$/m,
				"greedy": true,
				"inside": {
					'code-block': {
						"pattern": /^(```.*(?:\n|\r\n?))[\s\S]+?(?=(?:\n|\r\n?)^```$)/m,
						"lookbehind": true
					},
					'code-language': {
						"pattern": /^(```).+/,
						"lookbehind": true
					},
					'punctuation': /```/
				}
			}
		],
		'title': [
			{
				// Title 1
				// =======

				// Title 2
				// -------
				"pattern": /\S.*(?:\n|\r\n?)(?:==+|--+)(?=[ \t]*$)/m,
				"alias": 'important',
				"inside": {
					"punctuation": /[=]=+$|--+$/
				}
			},
			{
				// # title 1
				// ###### title 6
				"pattern": /(^\s*)#.+/m,
				"lookbehind": true,
				"alias": 'important',
				"inside": {
					"punctuation": /^#+|#+$/
				}
			}
		],
		'hr': {
			// ***
			// ---
			// * * *
			// -----------
			"pattern": /(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,
			"lookbehind": true,
			"alias": 'punctuation'
		},
		'list': {
			// * Item
			// + item
			// - item
			// 1. item
			"pattern": /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
			"lookbehind": true,
			"alias": 'punctuation'
		},
		'url-reference': {
			// [id]: http://example.com "Optional title"
			// [id]: http://example.com 'Optional title'
			// [id]: http://example.com (Optional title)
			// [id]: <http://example.com> "Optional title"
			"pattern": /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
			"inside": {
				'variable': {
					"pattern": /^(!?\[)[^\]]+/,
					"lookbehind": true
				},
				'string': /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
				'punctuation': /^[\[\]!:]|[<>]/
			},
			"alias": 'url'
		},
		'bold': {
			// **Strong**
			// __strong__

			// Allow one nested instance of italic text using the same delimiter
			"pattern": createInline((/\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\b|\*\*(?:(?!\*)<inner>|\*(?:(?!\*)<inner>)+\*)+\*\*/).source),
			"lookbehind": true,
			"greedy": true,
			"inside": {
				'content': {
					"pattern": /(^..)[\s\S]+(?=..$)/,
					"lookbehind": true,
					"inside": {} // See below
				},
				'punctuation': /\*\*|__/
			}
		},
		'italic': {
			// *Em*
			// _em_

			// Allow one nested instance of bold text using the same delimiter
			"pattern": createInline((/\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\b|\*(?:(?!\*)<inner>|\*\*(?:(?!\*)<inner>)+\*\*)+\*/).source),
			"lookbehind": true,
			"greedy": true,
			"inside": {
				'content': {
					"pattern": /(^.)[\s\S]+(?=.$)/,
					"lookbehind": true,
					"inside": {} // See below
				},
				'punctuation': /[*_]/
			}
		},
		'strike': {
			// ~~strike through~~
			// ~strike~
			// eslint-disable-next-line regexp/strict
			"pattern": createInline((/(~~?)(?:(?!~)<inner>)+\2/).source),
			"lookbehind": true,
			"greedy": true,
			"inside": {
				'content': {
					"pattern": /(^~~?)[\s\S]+(?=\1$)/,
					"lookbehind": true,
					"inside": {} // See below
				},
				'punctuation': /~~?/
			}
		},
		'code-snippet': {
			// `code`
			// ``code``
			"pattern": /(^|[^\\`])(?:``[^`\r\n]+(?:`[^`\r\n]+)*``(?!`)|`[^`\r\n]+`(?!`))/,
			"lookbehind": true,
			"greedy": true,
			"alias": ['code',
'keyword']
		},
		'url': {
			// [example](http://example.com "Optional title")
			// [example][id]
			// [example] [id]
			"pattern": createInline((/!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)|[ \t]?\[(?:(?!\])<inner>)+\])/).source),
			"lookbehind": true,
			"greedy": true,
			"inside": {
				'operator': /^!/,
				'content': {
					"pattern": /(^\[)[^\]]+(?=\])/,
					"lookbehind": true,
					"inside": {} // See below
				},
				'variable': {
					"pattern": /(^\][ \t]?\[)[^\]]+(?=\]$)/,
					"lookbehind": true
				},
				'url': {
					"pattern": /(^\]\()[^\s)]+/,
					"lookbehind": true
				},
				'string': {
					"pattern": /(^[ \t]+)"(?:\\.|[^"\\])*"(?=\)$)/,
					"lookbehind": true
				}
			}
		}
	});

	['url',
'bold',
'italic',
'strike'].forEach(function (token) {
		['url',
'bold',
'italic',
'strike',
'code-snippet'].forEach(function (inside) {
			if (token !== inside) {
				Prism.languages.markdown[token].inside.content.inside[inside] = Prism.languages.markdown[inside];
			}
		});
	});

	Prism.hooks.add('after-tokenize', function (env) {
		if (env.language !== 'markdown' && env.language !== 'md') {
			return;
		}

		function walkTokens(tokens) {
			if (!tokens || typeof tokens === 'string') {
				return;
			}

			for (var i = 0, l = tokens.length; i < l; i++) {
				var token = tokens[i];

				if (token.type !== 'code') {
					walkTokens(token.content);
					continue;
				}

				// Add the correct `language-xxxx` class to this code block. Keep in mind that the `code-language` token
				// is optional. But the grammar is defined so that there is only one case we have to handle:
				// 
				// token.content = [
				//     <span class="punctuation">```</span>,
				//     <span class="code-language">xxxx</span>,
				//     '\n', // exactly one new lines (\r or \n or \r\n)
				//     <span class="code-block">...</span>,
				//     '\n', // exactly one new lines again
				//     <span class="punctuation">```</span>
				// ];

				var codeLang = token.content[1];
				var codeBlock = token.content[3];

				if (codeLang && codeBlock &&
					codeLang.type === 'code-language' && codeBlock.type === 'code-block' &&
					typeof codeLang.content === 'string') {

					// This might be a language that Prism does not support

					// Do some replacements to support C++, C#, and F#
					var lang = codeLang.content.replace(/\b#/g, 'sharp').replace(/\b\+\+/g, 'pp');
					// Only use the first word
					lang = ((/[a-z][\w-]*/i).exec(lang) || [''])[0].toLowerCase();
					var alias = `language-${  lang}`;

					// Add alias
					if (!codeBlock.alias) {
						codeBlock.alias = [alias];
					} else if (typeof codeBlock.alias === 'string') {
						codeBlock.alias = [codeBlock.alias,
alias];
					} else {
						codeBlock.alias.push(alias);
					}
				}
			}
		}

		walkTokens(env.tokens);
	});

	Prism.hooks.add('wrap', function (env) {
		if (env.type !== 'code-block') {
			return;
		}

		var codeLang = '';
		for (var i = 0, l = env.classes.length; i < l; i++) {
			var cls = env.classes[i];
			var match = (/language-(.+)/).exec(cls);
			if (match) {
				codeLang = match[1];
				break;
			}
		}

		var grammar = Prism.languages[codeLang];

		if (!grammar) {
			if (codeLang && codeLang !== 'none' && Prism.plugins.autoloader) {
				var id = `md-${  new Date().valueOf()  }-${  Math.floor(Math.random() * 1e16)}`;
				env.attributes.id = id;

				Prism.plugins.autoloader.loadLanguages(codeLang, function () {
					var ele = document.getElementById(id);
					if (ele) {
						ele.innerHTML = Prism.highlight(ele.textContent, Prism.languages[codeLang], codeLang);
					}
				});
			}
		} else {
			env.content = Prism.highlight(textContent(env.content), grammar, codeLang);
		}
	});

	var tagPattern = RegExp(Prism.languages.markup.tag.pattern.source, 'gi');

	/**
	 * A list of known entity names.
	 *
	 * This will always be incomplete to save space. The current list is the one used by lowdash's unescape function.
	 *
	 * @see {@link https://github.com/lodash/lodash/blob/2da024c3b4f9947a48517639de7560457cd4ec6c/unescape.js#L2}
	 */
	var KNOWN_ENTITY_NAMES = {
		'amp': '&',
		'lt': '<',
		'gt': '>',
		'quot': '"'
	};

	// IE 11 doesn't support `String.fromCodePoint`
	var fromCodePoint = String.fromCodePoint || String.fromCharCode;

	/**
	 * Returns the text content of a given HTML source code string.
	 *
	 * @param {string} html
	 * @returns {string}
	 */
	function textContent(html) {
		// Remove all tags
		var text = html.replace(tagPattern, '');

		// Decode known entities
		text = text.replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi, function (m, code) {
			code = code.toLowerCase();

			if (code[0] === '#') {
				var value;
				if (code[1] === 'x') {
					value = parseInt(code.slice(2), 16);
				} else {
					value = Number(code.slice(1));
				}

				return fromCodePoint(value);
			} 
				var known = KNOWN_ENTITY_NAMES[code];
				if (known) {
					return known;
				}

				// unable to decode
				return m;
			
		});

		return text;
	}

	Prism.languages.md = Prism.languages.markdown;

}(Prism));

(function (Prism) {

	/**
	 * Returns the placeholder for the given language id and index.
	 *
	 * @param {string} language
	 * @param {string|number} index
	 * @returns {string}
	 */
	function getPlaceholder(language, index) {
		return `___${  language.toUpperCase()  }${index  }___`;
	}

	Object.defineProperties(Prism.languages['markup-templating'] = {}, {
		"buildPlaceholders": {

			/**
			 * Tokenize all inline templating expressions matching `placeholderPattern`.
			 *
			 * If `replaceFilter` is provided, only matches of `placeholderPattern` for which `replaceFilter` returns
			 * `true` will be replaced.
			 *
			 * @param {object} env The environment of the `before-tokenize` hook.
			 * @param {string} language The language id.
			 * @param {RegExp} placeholderPattern The matches of this pattern will be replaced by placeholders.
			 * @param {(match: string) => boolean} [replaceFilter]
			 */
			"value": function (env, language, placeholderPattern, replaceFilter) {
				if (env.language !== language) {
					return;
				}

				var tokenStack = env.tokenStack = [];

				env.code = env.code.replace(placeholderPattern, function (match) {
					if (typeof replaceFilter === 'function' && !replaceFilter(match)) {
						return match;
					}
					var i = tokenStack.length;
					var placeholder;

					// Check for existing strings
					while (env.code.indexOf(placeholder = getPlaceholder(language, i)) !== -1) {
						++i;
					}

					// Create a sparse array
					tokenStack[i] = match;

					return placeholder;
				});

				// Switch the grammar to markup
				env.grammar = Prism.languages.markup;
			}
		},
		"tokenizePlaceholders": {

			/**
			 * Replace placeholders with proper tokens after tokenizing.
			 *
			 * @param {object} env The environment of the `after-tokenize` hook.
			 * @param {string} language The language id.
			 */
			"value": function (env, language) {
				if (env.language !== language || !env.tokenStack) {
					return;
				}

				// Switch the grammar back
				env.grammar = Prism.languages[language];

				var j = 0;
				var keys = Object.keys(env.tokenStack);

				function walkTokens(tokens) {
					for (var i = 0; i < tokens.length; i++) {
						// All placeholders are replaced already
						if (j >= keys.length) {
							break;
						}

						var token = tokens[i];
						if (typeof token === 'string' || token.content && typeof token.content === 'string') {
							var k = keys[j];
							var t = env.tokenStack[k];
							var s = typeof token === 'string'
? token
: token.content;
							var placeholder = getPlaceholder(language, k);

							var index = s.indexOf(placeholder);
							if (index > -1) {
								++j;

								var before = s.substring(0, index);
								var middle = new Prism.Token(language, Prism.tokenize(t, env.grammar), `language-${  language}`, t);
								var after = s.substring(index + placeholder.length);

								var replacement = [];
								if (before) {
									replacement.push.apply(replacement, walkTokens([before]));
								}
								replacement.push(middle);
								if (after) {
									replacement.push.apply(replacement, walkTokens([after]));
								}

								if (typeof token === 'string') {
									tokens.splice.apply(tokens, [i,
1].concat(replacement));
								} else {
									token.content = replacement;
								}
							}
						} else if (token.content /* && typeof token.content !== 'string' */) {
							walkTokens(token.content);
						}
					}

					return tokens;
				}

				walkTokens(env.tokens);
			}
		}
	});

}(Prism));

/**
 * Original by Aaron Harun: http://aahacreative.com/2012/07/31/php-syntax-highlighting-prism/
 * Modified by Miles Johnson: http://milesj.me
 * Rewritten by Tom Pavelec
 *
 * Supports PHP 5.3 - 8.0
 */
(function (Prism) {
	var comment = /\/\*[\s\S]*?\*\/|\/\/.*|#(?!\[).*/;
	var constant = [
		{
			"pattern": /\b(?:false|true)\b/i,
			"alias": 'boolean'
		},
		{
			"pattern": /(::\s*)\b[a-z_]\w*\b(?!\s*\()/i,
			"greedy": true,
			"lookbehind": true
		},
		{
			"pattern": /(\b(?:case|const)\s+)\b[a-z_]\w*(?=\s*[;=])/i,
			"greedy": true,
			"lookbehind": true
		},
		/\b(?:null)\b/i,
		/\b[A-Z_][A-Z0-9_]*\b(?!\s*\()/
	];
	var number = /\b0b[01]+(?:_[01]+)*\b|\b0o[0-7]+(?:_[0-7]+)*\b|\b0x[\da-f]+(?:_[\da-f]+)*\b|(?:\b\d+(?:_\d+)*\.?(?:\d+(?:_\d+)*)?|\B\.\d+)(?:e[+-]?\d+)?/i;
	var operator = /<?=>|\?\?=?|\.{3}|\??->|[!=]=?=?|::|\*\*=?|--|\+\+|&&|\|\||<<|>>|[?~]|[/^|%*&<>.+-]=?/;
	var punctuation = /[{}\[\](),:;]/;

	Prism.languages.php = {
		'delimiter': {
			"pattern": /\?>$|^<\?(?:php(?=\s)|=)?/i,
			"alias": 'important'
		},
		comment,
		'variable': /\$+(?:\w+\b|(?=\{))/,
		'package': {
			"pattern": /(namespace\s+|use\s+(?:function\s+)?)(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
			"lookbehind": true,
			"inside": {
				'punctuation': /\\/
			}
		},
		'class-name-definition': {
			"pattern": /(\b(?:class|enum|interface|trait)\s+)\b[a-z_]\w*(?!\\)\b/i,
			"lookbehind": true,
			"alias": 'class-name'
		},
		'function-definition': {
			"pattern": /(\bfunction\s+)[a-z_]\w*(?=\s*\()/i,
			"lookbehind": true,
			"alias": 'function'
		},
		'keyword': [
			{
				"pattern": /(\(\s*)\b(?:array|bool|boolean|float|int|integer|object|string)\b(?=\s*\))/i,
				"alias": 'type-casting',
				"greedy": true,
				"lookbehind": true
			},
			{
				"pattern": /([(,?]\s*)\b(?:array(?!\s*\()|bool|callable|(?:false|null)(?=\s*\|)|float|int|iterable|mixed|object|self|static|string)\b(?=\s*\$)/i,
				"alias": 'type-hint',
				"greedy": true,
				"lookbehind": true
			},
			{
				"pattern": /(\)\s*:\s*(?:\?\s*)?)\b(?:array(?!\s*\()|bool|callable|(?:false|null)(?=\s*\|)|float|int|iterable|mixed|never|object|self|static|string|void)\b/i,
				"alias": 'return-type',
				"greedy": true,
				"lookbehind": true
			},
			{
				"pattern": /\b(?:array(?!\s*\()|bool|float|int|iterable|mixed|object|string|void)\b/i,
				"alias": 'type-declaration',
				"greedy": true
			},
			{
				"pattern": /(\|\s*)(?:false|null)\b|\b(?:false|null)(?=\s*\|)/i,
				"alias": 'type-declaration',
				"greedy": true,
				"lookbehind": true
			},
			{
				"pattern": /\b(?:parent|self|static)(?=\s*::)/i,
				"alias": 'static-context',
				"greedy": true
			},
			{
				// Yield from
				"pattern": /(\byield\s+)from\b/i,
				"lookbehind": true
			},
			// `class` is always a keyword unlike other keywords
			/\bclass\b/i,
			{
				// https://www.php.net/manual/en/reserved.keywords.php
				//
				// Keywords cannot be preceded by "->"
				// The complex lookbehind means `(?<!(?:->|::)\s*)`
				"pattern": /((?:^|[^\s>:]|(?:^|[^-])>|(?:^|[^:]):)\s*)\b(?:abstract|and|array|as|break|callable|case|catch|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|enum|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|never|new|or|parent|print|private|protected|public|readonly|require|require_once|return|self|static|switch|throw|trait|try|unset|use|var|while|xor|yield|__halt_compiler)\b/i,
				"lookbehind": true
			}
		],
		'argument-name': {
			"pattern": /([(,]\s*)\b[a-z_]\w*(?=\s*:(?!:))/i,
			"lookbehind": true
		},
		'class-name': [
			{
				"pattern": /(\b(?:extends|implements|instanceof|new(?!\s+self|\s+static))\s+|\bcatch\s*\()\b[a-z_]\w*(?!\\)\b/i,
				"greedy": true,
				"lookbehind": true
			},
			{
				"pattern": /(\|\s*)\b[a-z_]\w*(?!\\)\b/i,
				"greedy": true,
				"lookbehind": true
			},
			{
				"pattern": /\b[a-z_]\w*(?!\\)\b(?=\s*\|)/i,
				"greedy": true
			},
			{
				"pattern": /(\|\s*)(?:\\?\b[a-z_]\w*)+\b/i,
				"alias": 'class-name-fully-qualified',
				"greedy": true,
				"lookbehind": true,
				"inside": {
					'punctuation': /\\/
				}
			},
			{
				"pattern": /(?:\\?\b[a-z_]\w*)+\b(?=\s*\|)/i,
				"alias": 'class-name-fully-qualified',
				"greedy": true,
				"inside": {
					'punctuation': /\\/
				}
			},
			{
				"pattern": /(\b(?:extends|implements|instanceof|new(?!\s+self\b|\s+static\b))\s+|\bcatch\s*\()(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
				"alias": 'class-name-fully-qualified',
				"greedy": true,
				"lookbehind": true,
				"inside": {
					'punctuation': /\\/
				}
			},
			{
				"pattern": /\b[a-z_]\w*(?=\s*\$)/i,
				"alias": 'type-declaration',
				"greedy": true
			},
			{
				"pattern": /(?:\\?\b[a-z_]\w*)+(?=\s*\$)/i,
				"alias": ['class-name-fully-qualified',
'type-declaration'],
				"greedy": true,
				"inside": {
					'punctuation': /\\/
				}
			},
			{
				"pattern": /\b[a-z_]\w*(?=\s*::)/i,
				"alias": 'static-context',
				"greedy": true
			},
			{
				"pattern": /(?:\\?\b[a-z_]\w*)+(?=\s*::)/i,
				"alias": ['class-name-fully-qualified',
'static-context'],
				"greedy": true,
				"inside": {
					'punctuation': /\\/
				}
			},
			{
				"pattern": /([(,?]\s*)[a-z_]\w*(?=\s*\$)/i,
				"alias": 'type-hint',
				"greedy": true,
				"lookbehind": true
			},
			{
				"pattern": /([(,?]\s*)(?:\\?\b[a-z_]\w*)+(?=\s*\$)/i,
				"alias": ['class-name-fully-qualified',
'type-hint'],
				"greedy": true,
				"lookbehind": true,
				"inside": {
					'punctuation': /\\/
				}
			},
			{
				"pattern": /(\)\s*:\s*(?:\?\s*)?)\b[a-z_]\w*(?!\\)\b/i,
				"alias": 'return-type',
				"greedy": true,
				"lookbehind": true
			},
			{
				"pattern": /(\)\s*:\s*(?:\?\s*)?)(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
				"alias": ['class-name-fully-qualified',
'return-type'],
				"greedy": true,
				"lookbehind": true,
				"inside": {
					'punctuation': /\\/
				}
			}
		],
		constant,
		'function': {
			"pattern": /(^|[^\\\w])\\?[a-z_](?:[\w\\]*\w)?(?=\s*\()/i,
			"lookbehind": true,
			"inside": {
				'punctuation': /\\/
			}
		},
		'property': {
			"pattern": /(->\s*)\w+/,
			"lookbehind": true
		},
		number,
		operator,
		punctuation
	};

	var string_interpolation = {
		"pattern": /\{\$(?:\{(?:\{[^{}]+\}|[^{}]+)\}|[^{}])+\}|(^|[^\\{])\$+(?:\w+(?:\[[^\r\n\[\]]+\]|->\w+)?)/,
		"lookbehind": true,
		"inside": Prism.languages.php
	};

	var string = [
		{
			"pattern": /<<<'([^']+)'[\r\n](?:.*[\r\n])*?\1;/,
			"alias": 'nowdoc-string',
			"greedy": true,
			"inside": {
				'delimiter': {
					"pattern": /^<<<'[^']+'|[a-z_]\w*;$/i,
					"alias": 'symbol',
					"inside": {
						'punctuation': /^<<<'?|[';]$/
					}
				}
			}
		},
		{
			"pattern": /<<<(?:"([^"]+)"[\r\n](?:.*[\r\n])*?\1;|([a-z_]\w*)[\r\n](?:.*[\r\n])*?\2;)/i,
			"alias": 'heredoc-string',
			"greedy": true,
			"inside": {
				'delimiter': {
					"pattern": /^<<<(?:"[^"]+"|[a-z_]\w*)|[a-z_]\w*;$/i,
					"alias": 'symbol',
					"inside": {
						'punctuation': /^<<<"?|[";]$/
					}
				},
				'interpolation': string_interpolation
			}
		},
		{
			"pattern": /`(?:\\[\s\S]|[^\\`])*`/,
			"alias": 'backtick-quoted-string',
			"greedy": true
		},
		{
			"pattern": /'(?:\\[\s\S]|[^\\'])*'/,
			"alias": 'single-quoted-string',
			"greedy": true
		},
		{
			"pattern": /"(?:\\[\s\S]|[^\\"])*"/,
			"alias": 'double-quoted-string',
			"greedy": true,
			"inside": {
				'interpolation': string_interpolation
			}
		}
	];

	Prism.languages.insertBefore('php', 'variable', {
		string,
		'attribute': {
			"pattern": /#\[(?:[^"'\/#]|\/(?![*/])|\/\/.*$|#(?!\[).*$|\/\*(?:[^*]|\*(?!\/))*\*\/|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*')+\](?=\s*[a-z$#])/im,
			"greedy": true,
			"inside": {
				'attribute-content': {
					"pattern": /^(#\[)[\s\S]+(?=\]$)/,
					"lookbehind": true,
					// Inside can appear subset of php
					"inside": {
						comment,
						string,
						'attribute-class-name': [
							{
								"pattern": /([^:]|^)\b[a-z_]\w*(?!\\)\b/i,
								"alias": 'class-name',
								"greedy": true,
								"lookbehind": true
							},
							{
								"pattern": /([^:]|^)(?:\\?\b[a-z_]\w*)+/i,
								"alias": [
									'class-name',
									'class-name-fully-qualified'
								],
								"greedy": true,
								"lookbehind": true,
								"inside": {
									'punctuation': /\\/
								}
							}
						],
						constant,
						number,
						operator,
						punctuation
					}
				},
				'delimiter': {
					"pattern": /^#\[|\]$/,
					"alias": 'punctuation'
				}
			}
		}
	});

	Prism.hooks.add('before-tokenize', function (env) {
		if (!(/<\?/).test(env.code)) {
			return;
		}

		var phpPattern = /<\?(?:[^"'/#]|\/(?![*/])|("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|(?:\/\/|#(?!\[))(?:[^?\n\r]|\?(?!>))*(?=$|\?>|[\r\n])|#\[|\/\*(?:[^*]|\*(?!\/))*(?:\*\/|$))*?(?:\?>|$)/g;
		Prism.languages['markup-templating'].buildPlaceholders(env, 'php', phpPattern);
	});

	Prism.hooks.add('after-tokenize', function (env) {
		Prism.languages['markup-templating'].tokenizePlaceholders(env, 'php');
	});

}(Prism));

Prism.languages.insertBefore('php', 'variable', {
	'this': {
		"pattern": /\$this\b/,
		"alias": 'keyword'
	},
	'global': /\$(?:GLOBALS|HTTP_RAW_POST_DATA|_(?:COOKIE|ENV|FILES|GET|POST|REQUEST|SERVER|SESSION)|argc|argv|http_response_header|php_errormsg)\b/,
	'scope': {
		"pattern": /\b[\w\\]+::/,
		"inside": {
			'keyword': /\b(?:parent|self|static)\b/,
			'punctuation': /::|\\/
		}
	}
});

Prism.languages.scss = Prism.languages.extend('css', {
	'comment': {
		"pattern": /(^|[^\\])(?:\/\*[\s\S]*?\*\/|\/\/.*)/,
		"lookbehind": true
	},
	'atrule': {
		"pattern": /@[\w-](?:\([^()]+\)|[^()\s]|\s+(?!\s))*?(?=\s+[{;])/,
		"inside": {
			'rule': /@[\w-]+/
			// See rest below
		}
	},
	// Url, compassified
	'url': /(?:[-a-z]+-)?url(?=\()/i,
	// CSS selector regex is not appropriate for Sass
	// Since there can be lot more things (var, @ directive, nesting..)
	// A selector must start at the end of a property or after a brace (end of other rules or nesting)
	// It can contain some characters that aren't used for defining rules or end of selector, & (parent selector), or interpolated variable
	// The end of a selector is found when there is no rules in it ( {} or {\s}) or if there is a property (because an interpolated var
	// Can "pass" as a selector- e.g: proper#{$erty})
	// This one was hard to do, so please be careful if you edit this one :)
	'selector': {
		// Initial look-ahead is used to prevent matching of blank selectors
		"pattern": /(?=\S)[^@;{}()]?(?:[^@;{}()\s]|\s+(?!\s)|#\{\$[-\w]+\})+(?=\s*\{(?:\}|\s|[^}][^:{}]*[:{][^}]))/,
		"inside": {
			'parent': {
				"pattern": /&/,
				"alias": 'important'
			},
			'placeholder': /%[-\w]+/,
			'variable': /\$[-\w]+|#\{\$[-\w]+\}/
		}
	},
	'property': {
		"pattern": /(?:[-\w]|\$[-\w]|#\{\$[-\w]+\})+(?=\s*:)/,
		"inside": {
			'variable': /\$[-\w]+|#\{\$[-\w]+\}/
		}
	}
});

Prism.languages.insertBefore('scss', 'atrule', {
	'keyword': [
		/@(?:content|debug|each|else(?: if)?|extend|for|forward|function|if|import|include|mixin|return|use|warn|while)\b/i,
		{
			"pattern": /( )(?:from|through)(?= )/,
			"lookbehind": true
		}
	]
});

Prism.languages.insertBefore('scss', 'important', {
	// Var and interpolated vars
	'variable': /\$[-\w]+|#\{\$[-\w]+\}/
});

Prism.languages.insertBefore('scss', 'function', {
	'module-modifier': {
		"pattern": /\b(?:as|hide|show|with)\b/i,
		"alias": 'keyword'
	},
	'placeholder': {
		"pattern": /%[-\w]+/,
		"alias": 'selector'
	},
	'statement': {
		"pattern": /\B!(?:default|optional)\b/i,
		"alias": 'keyword'
	},
	'boolean': /\b(?:false|true)\b/,
	'null': {
		"pattern": /\bnull\b/,
		"alias": 'keyword'
	},
	'operator': {
		"pattern": /(\s)(?:[-+*\/%]|[=!]=|<=?|>=?|and|not|or)(?=\s)/,
		"lookbehind": true
	}
});

Prism.languages.scss.atrule.inside.rest = Prism.languages.scss;
