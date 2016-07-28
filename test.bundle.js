(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var queryString = require('query-string')
var Pattern     = require('url-pattern')
var parallel    = require('async').parallel
var ready       = require('document-ready')
//Object to store keyed routes in
var routes = {}
//Array of stored patterns for url param matching
var patterns = []
//Array of functions to call when the url updates
var listeners = []
ready(
  function(){
    if (typeof window !== 'undefined') {
      window.popstate = update
    }
  }
)
//Adds a listener for route changes
function addListener(listener) {
  testListener(listener)
  listeners.push(listener)
  return readListeners()
}
function testListener(listener) {
  if (typeof listener !== 'function') {
    throw new Error(
      'Listener must be a function'
    )
  }
}
//Read only copy of listeners
function readListeners() {
  return listeners.slice()
}
//Navigates to a route
function navigate(path, title, state) {
  //Change the url
  if (typeof window !== 'undefined') {
    window.history.pushState(state, title, path)
  }
  //Notify listeners
  listeners.foreach(function(listener) {
    listener(getComponents(path, state))
  })
}
//Updates listeners on popstate
function update(e) {
  let path = ''
  let state = e.state
  if (typeof window !== 'undefined') {
    path = window.location.pathname
  }
  listeners.foreach(function(listener) {
    listener(getComponents(path, state))
  })
}
//Defends against es2015 default export
function defendAgainstDefault(component) {
  if (component.default) {
    component = component.default
  }
  return component
}
//This function takes an Array of routes and
// registers them.
function register(routes) {
  testRoutes(routes)
  testRoutesArray(routes)
  routes.forEach(
    function(route) {
      addRoute(route)
    }
  )
}
//Tests for the existence of the routes array, throws if missing
function testRoutes(routes) {
  if (!routes) {
    throw new Error(
      'Missing required routes Array argument'
    )
  }
}
//Tests that the routes argument is an array, throws if not
function testRoutesArray(routes) {
  if (!Array.isArray(routes)) {
    throw new Error(
      'The routes argument needs to be an Array'
    )
  }
}
// This function adds a unique route.
// full routes have the unique signature of:
// route:layer:component
// A route can have many layers and
//  layers can have many component,
//  but a layer can only have one component per route
//  Options: Object with the signature:
//    route: String of url or paramaterized url
//    layer: String of the name of the target layer
//    component: Function to call when loading the component takes a callback
//    props: Object of props to pass to the component
//
// INPUT
// -------
// options = {
//  route: '/',
//  layer: 'screens',
//  component: function(callback) {
//    callback(null, require('../components/foo.js')
//  },
//  props: {
//    title: 'TODAY'
// }
//
// OUTPUT
// -------
//
// '/': {
//   'screens': {
//      component: function(callback) {
//        callback(null, require('../components/bar.js')
//      },
//      props: {
//        title: 'TODAY'
//       }
//   }
// }
//
// A route can target multiple layers.
// A layer can only have one component per route.
// This data structure _enforces_ that.
function addRoute(options) {
  testOptions(options)
  var route     = options.route || '/'
  var layer     = options.layer || 'screens'
  var component = options.component
  var props     = options.props || {}
  testComponentOption(component)

  //Use an existing route, or store a new one
  var storedRoute = routes[route] ?
    routes[route] : routes[route] = {}

  //Use an existing layer, or store a new one
  var storedLayer = storedRoute[layer] ?
    storedRoute[layer] : storedRoute[layer] = {}

  storedLayer.component = component
  storedLayer.props = props

  //Test for a paramaterized route
  if (/:/.test(route)) {
    var pattern = new Pattern(route)
    //Add the pattern and the route for easier lookup
    patterns.push({
      pattern: pattern,
      route: storedRoute
    })
  }

  return Object.assign({}, routes)
}
//Gets a render ready array of component definitions
function getComponents(path, callback) {
  var urlData = getUrlData(path)
  path = urlData.path
  var route = readRoute(path)
  return resolveComponents(route, urlData, callback)
}
// Resolves component definitions for render
function resolveComponents(route, urlData, callback) {
  var components = Object.keys(route).map(function(layer) {
    var routeData = route[layer]
    var load = routeData.component
    var props = Object.assign({}, routeData.props, urlData)
    //To keep the user method signature simple
    //we wrap the callback to return the structure we actually want
    return function(callback) {
      load(function(err, component) {
        component = defendAgainstDefault(component)
        if (err) {
          throw err
          return
        }
        callback(
          null, {
            component:component,
            props: Object.assign({}, props, layer)
          }
        )
      })
    }
  })
  //Since multiple layers can have component updates
  // for a given route we need to resolve them all in parallel
  parallel(components, function(err, results) {
    if (err) {
      throw err
      return
    } else {
      callback(results)
      return results
    }
  })
}
//Returns a copy of a route
function readRoute(path) {
  var route = routes[path]
    //If we don't find an exact match
    //  then we look for a paramaterized route
    //  EXAMPLE:
    //  -------
    //  /thing/:id would match /thing/4
  if (!route) {
    patterns.forEach(function(matcher) {
      var params = matcher.pattern.match(path)
      if (params) {
        route = matcher.route
      }
    })
  }
  return Object.assign({}, route)
}
//Returns a copy of the routes object
function readRoutes() {
  return Object.assign({}, routes)
}
//Tests for options object and throws if missing
function testOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new Error(
      'Missing required options Object'
    )
  }
}
//Tests for options component property used in require call
//  and throws if missing
function testComponentOption(component) {
  if (!component || typeof component !== 'function') {
    throw new Error(
      'Missing component require function. function(callback) { callback(null, component) }'
    )
  }
}
//Gets a path object of:
//path: String value of the url pathname
//query: Object of the query string parameters
//params: Object of paramaterized data from pattern match.
// EXAMPLE:
// -------
//
// If route pattern is:
// /things/:id/1234
//
// and url is:
// /things/1/1234
//
// then params would be:
// { id:1234 }
function getUrlData(path, data) {

  if (typeof window !== 'undefined' &&
      typeof window.location !== 'undefined') {

    var pathname = window.location.pathname
    if (pathname && !path) {
      path = pathname
    }

    var search = window.location.search
    if (search) {
      data = search
    }

  }

  //If we are dealing with the root path return
  if (path === '/') {
    return {
      path:path,
      query: {},
      params: {}
    }
  }

  path = removeTrailingSlash(path)
  var query = queryString.parse(data)
  var params = {}

  //Passes params based on the pattern stored when we call
  //the register method
  if (patterns.length) {
    params = patterns.map(function(p) {
      return p.pattern.match(path)
    })[0] || {}
  }

  return {
    path:path,
    query:query,
    params:params
  }
}
//Resets all stored values
function reset() {
  routes = {}
  patterns = []
  listeners = []
}
//Removes the trailing slash from a pathname
function removeTrailingSlash(path) {
  if (!path) {
    return
  }
  var hasTrailingSlash = path.length > 1 && path.slice(-1) === '/'
  if (hasTrailingSlash) {
    path = path.substring(0, path.length - 1)
  }
  return path
}

module.exports = {
  addListener:addListener,
  addRoute:addRoute,
  getComponents:getComponents,
  getUrlData:getUrlData,
  navigate:navigate,
  readListeners:readListeners,
  readRoute:readRoute,
  readRoutes:readRoutes,
  removeTrailingSlash:removeTrailingSlash,
  register:register,
  reset:reset,
  resolveComponents:resolveComponents,
  testComponentOption:testComponentOption,
  testListener:testListener,
  testOptions:testOptions,
  testRoutes:testRoutes,
  testRoutesArray:testRoutesArray,
  update:update
}

},{"async":2,"document-ready":9,"query-string":11,"url-pattern":14}],2:[function(require,module,exports){
(function (process,global){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.async = global.async || {})));
}(this, function (exports) { 'use strict';

  /**
   * A faster alternative to `Function#apply`, this function invokes `func`
   * with the `this` binding of `thisArg` and the arguments of `args`.
   *
   * @private
   * @param {Function} func The function to invoke.
   * @param {*} thisArg The `this` binding of `func`.
   * @param {Array} args The arguments to invoke `func` with.
   * @returns {*} Returns the result of `func`.
   */
  function apply(func, thisArg, args) {
    var length = args.length;
    switch (length) {
      case 0: return func.call(thisArg);
      case 1: return func.call(thisArg, args[0]);
      case 2: return func.call(thisArg, args[0], args[1]);
      case 3: return func.call(thisArg, args[0], args[1], args[2]);
    }
    return func.apply(thisArg, args);
  }

  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/6.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  var funcTag = '[object Function]';
  var genTag = '[object GeneratorFunction]';
  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objectToString = objectProto.toString;

  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */
  function isFunction(value) {
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in Safari 8 which returns 'object' for typed array and weak map constructors,
    // and PhantomJS 1.9 which returns 'function' for `NodeList` instances.
    var tag = isObject(value) ? objectToString.call(value) : '';
    return tag == funcTag || tag == genTag;
  }

  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */
  function isObjectLike(value) {
    return !!value && typeof value == 'object';
  }

  /** `Object#toString` result references. */
  var symbolTag = '[object Symbol]';

  /** Used for built-in method references. */
  var objectProto$1 = Object.prototype;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objectToString$1 = objectProto$1.toString;

  /**
   * Checks if `value` is classified as a `Symbol` primitive or object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isSymbol(Symbol.iterator);
   * // => true
   *
   * _.isSymbol('abc');
   * // => false
   */
  function isSymbol(value) {
    return typeof value == 'symbol' ||
      (isObjectLike(value) && objectToString$1.call(value) == symbolTag);
  }

  /** Used as references for various `Number` constants. */
  var NAN = 0 / 0;

  /** Used to match leading and trailing whitespace. */
  var reTrim = /^\s+|\s+$/g;

  /** Used to detect bad signed hexadecimal string values. */
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

  /** Used to detect binary string values. */
  var reIsBinary = /^0b[01]+$/i;

  /** Used to detect octal string values. */
  var reIsOctal = /^0o[0-7]+$/i;

  /** Built-in method references without a dependency on `root`. */
  var freeParseInt = parseInt;

  /**
   * Converts `value` to a number.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {number} Returns the number.
   * @example
   *
   * _.toNumber(3.2);
   * // => 3.2
   *
   * _.toNumber(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toNumber(Infinity);
   * // => Infinity
   *
   * _.toNumber('3.2');
   * // => 3.2
   */
  function toNumber(value) {
    if (typeof value == 'number') {
      return value;
    }
    if (isSymbol(value)) {
      return NAN;
    }
    if (isObject(value)) {
      var other = isFunction(value.valueOf) ? value.valueOf() : value;
      value = isObject(other) ? (other + '') : other;
    }
    if (typeof value != 'string') {
      return value === 0 ? value : +value;
    }
    value = value.replace(reTrim, '');
    var isBinary = reIsBinary.test(value);
    return (isBinary || reIsOctal.test(value))
      ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
      : (reIsBadHex.test(value) ? NAN : +value);
  }

  var INFINITY = 1 / 0;
  var MAX_INTEGER = 1.7976931348623157e+308;
  /**
   * Converts `value` to a finite number.
   *
   * @static
   * @memberOf _
   * @since 4.12.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {number} Returns the converted number.
   * @example
   *
   * _.toFinite(3.2);
   * // => 3.2
   *
   * _.toFinite(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toFinite(Infinity);
   * // => 1.7976931348623157e+308
   *
   * _.toFinite('3.2');
   * // => 3.2
   */
  function toFinite(value) {
    if (!value) {
      return value === 0 ? value : 0;
    }
    value = toNumber(value);
    if (value === INFINITY || value === -INFINITY) {
      var sign = (value < 0 ? -1 : 1);
      return sign * MAX_INTEGER;
    }
    return value === value ? value : 0;
  }

  /**
   * Converts `value` to an integer.
   *
   * **Note:** This method is loosely based on
   * [`ToInteger`](http://www.ecma-international.org/ecma-262/6.0/#sec-tointeger).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {number} Returns the converted integer.
   * @example
   *
   * _.toInteger(3.2);
   * // => 3
   *
   * _.toInteger(Number.MIN_VALUE);
   * // => 0
   *
   * _.toInteger(Infinity);
   * // => 1.7976931348623157e+308
   *
   * _.toInteger('3.2');
   * // => 3
   */
  function toInteger(value) {
    var result = toFinite(value),
        remainder = result % 1;

    return result === result ? (remainder ? result - remainder : result) : 0;
  }

  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeMax = Math.max;

  /**
   * Creates a function that invokes `func` with the `this` binding of the
   * created function and arguments from `start` and beyond provided as
   * an array.
   *
   * **Note:** This method is based on the
   * [rest parameter](https://mdn.io/rest_parameters).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Function
   * @param {Function} func The function to apply a rest parameter to.
   * @param {number} [start=func.length-1] The start position of the rest parameter.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var say = _.rest(function(what, names) {
   *   return what + ' ' + _.initial(names).join(', ') +
   *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
   * });
   *
   * say('hello', 'fred', 'barney', 'pebbles');
   * // => 'hello fred, barney, & pebbles'
   */
  function rest(func, start) {
    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    start = nativeMax(start === undefined ? (func.length - 1) : toInteger(start), 0);
    return function() {
      var args = arguments,
          index = -1,
          length = nativeMax(args.length - start, 0),
          array = Array(length);

      while (++index < length) {
        array[index] = args[start + index];
      }
      switch (start) {
        case 0: return func.call(this, array);
        case 1: return func.call(this, args[0], array);
        case 2: return func.call(this, args[0], args[1], array);
      }
      var otherArgs = Array(start + 1);
      index = -1;
      while (++index < start) {
        otherArgs[index] = args[index];
      }
      otherArgs[start] = array;
      return apply(func, this, otherArgs);
    };
  }

  function initialParams (fn) {
      return rest(function (args /*..., callback*/) {
          var callback = args.pop();
          fn.call(this, args, callback);
      });
  }

  function applyEach$1(eachfn) {
      return rest(function (fns, args) {
          var go = initialParams(function (args, callback) {
              var that = this;
              return eachfn(fns, function (fn, cb) {
                  fn.apply(that, args.concat([cb]));
              }, callback);
          });
          if (args.length) {
              return go.apply(this, args);
          } else {
              return go;
          }
      });
  }

  /**
   * A method that returns `undefined`.
   *
   * @static
   * @memberOf _
   * @since 2.3.0
   * @category Util
   * @example
   *
   * _.times(2, _.noop);
   * // => [undefined, undefined]
   */
  function noop() {
    // No operation performed.
  }

  function once(fn) {
      return function () {
          if (fn === null) return;
          var callFn = fn;
          fn = null;
          callFn.apply(this, arguments);
      };
  }

  /**
   * The base implementation of `_.property` without support for deep paths.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @returns {Function} Returns the new accessor function.
   */
  function baseProperty(key) {
    return function(object) {
      return object == null ? undefined : object[key];
    };
  }

  /**
   * Gets the "length" property value of `object`.
   *
   * **Note:** This function is used to avoid a
   * [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792) that affects
   * Safari on at least iOS 8.1-8.3 ARM64.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {*} Returns the "length" value.
   */
  var getLength = baseProperty('length');

  /** Used as references for various `Number` constants. */
  var MAX_SAFE_INTEGER = 9007199254740991;

  /**
   * Checks if `value` is a valid array-like length.
   *
   * **Note:** This function is loosely based on
   * [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a valid length,
   *  else `false`.
   * @example
   *
   * _.isLength(3);
   * // => true
   *
   * _.isLength(Number.MIN_VALUE);
   * // => false
   *
   * _.isLength(Infinity);
   * // => false
   *
   * _.isLength('3');
   * // => false
   */
  function isLength(value) {
    return typeof value == 'number' &&
      value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }

  /**
   * Checks if `value` is array-like. A value is considered array-like if it's
   * not a function and has a `value.length` that's an integer greater than or
   * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
   * @example
   *
   * _.isArrayLike([1, 2, 3]);
   * // => true
   *
   * _.isArrayLike(document.body.children);
   * // => true
   *
   * _.isArrayLike('abc');
   * // => true
   *
   * _.isArrayLike(_.noop);
   * // => false
   */
  function isArrayLike(value) {
    return value != null && isLength(getLength(value)) && !isFunction(value);
  }

  var iteratorSymbol = typeof Symbol === 'function' && Symbol.iterator;

  function getIterator (coll) {
      return iteratorSymbol && coll[iteratorSymbol] && coll[iteratorSymbol]();
  }

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeGetPrototype = Object.getPrototypeOf;

  /**
   * Gets the `[[Prototype]]` of `value`.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {null|Object} Returns the `[[Prototype]]`.
   */
  function getPrototype(value) {
    return nativeGetPrototype(Object(value));
  }

  /** Used for built-in method references. */
  var objectProto$2 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto$2.hasOwnProperty;

  /**
   * The base implementation of `_.has` without support for deep paths.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {Array|string} key The key to check.
   * @returns {boolean} Returns `true` if `key` exists, else `false`.
   */
  function baseHas(object, key) {
    // Avoid a bug in IE 10-11 where objects with a [[Prototype]] of `null`,
    // that are composed entirely of index properties, return `false` for
    // `hasOwnProperty` checks of them.
    return object != null &&
      (hasOwnProperty.call(object, key) ||
        (typeof object == 'object' && key in object && getPrototype(object) === null));
  }

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeKeys = Object.keys;

  /**
   * The base implementation of `_.keys` which doesn't skip the constructor
   * property of prototypes or treat sparse arrays as dense.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function baseKeys(object) {
    return nativeKeys(Object(object));
  }

  /**
   * The base implementation of `_.times` without support for iteratee shorthands
   * or max array length checks.
   *
   * @private
   * @param {number} n The number of times to invoke `iteratee`.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the array of results.
   */
  function baseTimes(n, iteratee) {
    var index = -1,
        result = Array(n);

    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }

  /**
   * This method is like `_.isArrayLike` except that it also checks if `value`
   * is an object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an array-like object,
   *  else `false`.
   * @example
   *
   * _.isArrayLikeObject([1, 2, 3]);
   * // => true
   *
   * _.isArrayLikeObject(document.body.children);
   * // => true
   *
   * _.isArrayLikeObject('abc');
   * // => false
   *
   * _.isArrayLikeObject(_.noop);
   * // => false
   */
  function isArrayLikeObject(value) {
    return isObjectLike(value) && isArrayLike(value);
  }

  /** `Object#toString` result references. */
  var argsTag = '[object Arguments]';

  /** Used for built-in method references. */
  var objectProto$3 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$1 = objectProto$3.hasOwnProperty;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objectToString$2 = objectProto$3.toString;

  /** Built-in value references. */
  var propertyIsEnumerable = objectProto$3.propertyIsEnumerable;

  /**
   * Checks if `value` is likely an `arguments` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isArguments(function() { return arguments; }());
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  function isArguments(value) {
    // Safari 8.1 incorrectly makes `arguments.callee` enumerable in strict mode.
    return isArrayLikeObject(value) && hasOwnProperty$1.call(value, 'callee') &&
      (!propertyIsEnumerable.call(value, 'callee') || objectToString$2.call(value) == argsTag);
  }

  /**
   * Checks if `value` is classified as an `Array` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @type {Function}
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isArray([1, 2, 3]);
   * // => true
   *
   * _.isArray(document.body.children);
   * // => false
   *
   * _.isArray('abc');
   * // => false
   *
   * _.isArray(_.noop);
   * // => false
   */
  var isArray = Array.isArray;

  /** `Object#toString` result references. */
  var stringTag = '[object String]';

  /** Used for built-in method references. */
  var objectProto$4 = Object.prototype;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objectToString$3 = objectProto$4.toString;

  /**
   * Checks if `value` is classified as a `String` primitive or object.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isString('abc');
   * // => true
   *
   * _.isString(1);
   * // => false
   */
  function isString(value) {
    return typeof value == 'string' ||
      (!isArray(value) && isObjectLike(value) && objectToString$3.call(value) == stringTag);
  }

  /**
   * Creates an array of index keys for `object` values of arrays,
   * `arguments` objects, and strings, otherwise `null` is returned.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array|null} Returns index keys, else `null`.
   */
  function indexKeys(object) {
    var length = object ? object.length : undefined;
    if (isLength(length) &&
        (isArray(object) || isString(object) || isArguments(object))) {
      return baseTimes(length, String);
    }
    return null;
  }

  /** Used as references for various `Number` constants. */
  var MAX_SAFE_INTEGER$1 = 9007199254740991;

  /** Used to detect unsigned integer values. */
  var reIsUint = /^(?:0|[1-9]\d*)$/;

  /**
   * Checks if `value` is a valid array-like index.
   *
   * @private
   * @param {*} value The value to check.
   * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
   * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
   */
  function isIndex(value, length) {
    length = length == null ? MAX_SAFE_INTEGER$1 : length;
    return !!length &&
      (typeof value == 'number' || reIsUint.test(value)) &&
      (value > -1 && value % 1 == 0 && value < length);
  }

  /** Used for built-in method references. */
  var objectProto$5 = Object.prototype;

  /**
   * Checks if `value` is likely a prototype object.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
   */
  function isPrototype(value) {
    var Ctor = value && value.constructor,
        proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$5;

    return value === proto;
  }

  /**
   * Creates an array of the own enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects. See the
   * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
   * for more details.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keys(new Foo);
   * // => ['a', 'b'] (iteration order is not guaranteed)
   *
   * _.keys('hi');
   * // => ['0', '1']
   */
  function keys(object) {
    var isProto = isPrototype(object);
    if (!(isProto || isArrayLike(object))) {
      return baseKeys(object);
    }
    var indexes = indexKeys(object),
        skipIndexes = !!indexes,
        result = indexes || [],
        length = result.length;

    for (var key in object) {
      if (baseHas(object, key) &&
          !(skipIndexes && (key == 'length' || isIndex(key, length))) &&
          !(isProto && key == 'constructor')) {
        result.push(key);
      }
    }
    return result;
  }

  function iterator(coll) {
      var i = -1;
      var len;
      if (isArrayLike(coll)) {
          len = coll.length;
          return function next() {
              i++;
              return i < len ? { value: coll[i], key: i } : null;
          };
      }

      var iterate = getIterator(coll);
      if (iterate) {
          return function next() {
              var item = iterate.next();
              if (item.done) return null;
              i++;
              return { value: item.value, key: i };
          };
      }

      var okeys = keys(coll);
      len = okeys.length;
      return function next() {
          i++;
          var key = okeys[i];
          return i < len ? { value: coll[key], key: key } : null;
      };
  }

  function onlyOnce(fn) {
      return function () {
          if (fn === null) throw new Error("Callback was already called.");
          var callFn = fn;
          fn = null;
          callFn.apply(this, arguments);
      };
  }

  function _eachOfLimit(limit) {
      return function (obj, iteratee, callback) {
          callback = once(callback || noop);
          obj = obj || [];
          var nextElem = iterator(obj);
          if (limit <= 0) {
              return callback(null);
          }
          var done = false;
          var running = 0;
          var errored = false;

          (function replenish() {
              if (done && running <= 0) {
                  return callback(null);
              }

              while (running < limit && !errored) {
                  var elem = nextElem();
                  if (elem === null) {
                      done = true;
                      if (running <= 0) {
                          callback(null);
                      }
                      return;
                  }
                  running += 1;
                  /* eslint {no-loop-func: 0} */
                  iteratee(elem.value, elem.key, onlyOnce(function (err) {
                      running -= 1;
                      if (err) {
                          callback(err);
                          errored = true;
                      } else {
                          replenish();
                      }
                  }));
              }
          })();
      };
  }

  function doParallelLimit(fn) {
      return function (obj, limit, iteratee, callback) {
          return fn(_eachOfLimit(limit), obj, iteratee, callback);
      };
  }

  function _asyncMap(eachfn, arr, iteratee, callback) {
      callback = once(callback || noop);
      arr = arr || [];
      var results = [];
      var counter = 0;

      eachfn(arr, function (value, _, callback) {
          var index = counter++;
          iteratee(value, function (err, v) {
              results[index] = v;
              callback(err);
          });
      }, function (err) {
          callback(err, results);
      });
  }

  /**
   * The same as [`map`]{@link module:Collections.map} but runs a maximum of `limit` async operations at a time.
   *
   * @name mapLimit
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.map]{@link module:Collections.map}
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} iteratee - A function to apply to each item in `coll`.
   * The iteratee is passed a `callback(err, transformed)` which must be called
   * once it has completed with an error (which can be `null`) and a transformed
   * item. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called when all `iteratee`
   * functions have finished, or an error occurs. Results is an array of the
   * transformed items from the `coll`. Invoked with (err, results).
   */
  var mapLimit = doParallelLimit(_asyncMap);

  function doLimit(fn, limit) {
      return function (iterable, iteratee, callback) {
          return fn(iterable, limit, iteratee, callback);
      };
  }

  /**
   * Produces a new collection of values by mapping each value in `coll` through
   * the `iteratee` function. The `iteratee` is called with an item from `coll`
   * and a callback for when it has finished processing. Each of these callback
   * takes 2 arguments: an `error`, and the transformed item from `coll`. If
   * `iteratee` passes an error to its callback, the main `callback` (for the
   * `map` function) is immediately called with the error.
   *
   * Note, that since this function applies the `iteratee` to each item in
   * parallel, there is no guarantee that the `iteratee` functions will complete
   * in order. However, the results array will be in the same order as the
   * original `coll`.
   *
   * If `map` is passed an Object, the results will be an Array.  The results
   * will roughly be in the order of the original Objects' keys (but this can
   * vary across JavaScript engines)
   *
   * @name map
   * @static
   * @memberOf module:Collections
   * @method
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each item in `coll`.
   * The iteratee is passed a `callback(err, transformed)` which must be called
   * once it has completed with an error (which can be `null`) and a
   * transformed item. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called when all `iteratee`
   * functions have finished, or an error occurs. Results is an Array of the
   * transformed items from the `coll`. Invoked with (err, results).
   * @example
   *
   * async.map(['file1','file2','file3'], fs.stat, function(err, results) {
   *     // results is now an array of stats for each file
   * });
   */
  var map = doLimit(mapLimit, Infinity);

  /**
   * Applies the provided arguments to each function in the array, calling
   * `callback` after all functions have completed. If you only provide the first
   * argument, then it will return a function which lets you pass in the
   * arguments as if it were a single function call.
   *
   * @name applyEach
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {Array|Iterable|Object} fns - A collection of asynchronous functions to all
   * call with the same arguments
   * @param {...*} [args] - any number of separate arguments to pass to the
   * function.
   * @param {Function} [callback] - the final argument should be the callback,
   * called when all functions have completed processing.
   * @returns {Function} - If only the first argument is provided, it will return
   * a function which lets you pass in the arguments as if it were a single
   * function call.
   * @example
   *
   * async.applyEach([enableSearch, updateSchema], 'bucket', callback);
   *
   * // partial application example:
   * async.each(
   *     buckets,
   *     async.applyEach([enableSearch, updateSchema]),
   *     callback
   * );
   */
  var applyEach = applyEach$1(map);

  /**
   * The same as [`map`]{@link module:Collections.map} but runs only a single async operation at a time.
   *
   * @name mapSeries
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.map]{@link module:Collections.map}
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each item in `coll`.
   * The iteratee is passed a `callback(err, transformed)` which must be called
   * once it has completed with an error (which can be `null`) and a
   * transformed item. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called when all `iteratee`
   * functions have finished, or an error occurs. Results is an array of the
   * transformed items from the `coll`. Invoked with (err, results).
   */
  var mapSeries = doLimit(mapLimit, 1);

  /**
   * The same as [`applyEach`]{@link module:ControlFlow.applyEach} but runs only a single async operation at a time.
   *
   * @name applyEachSeries
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.applyEach]{@link module:ControlFlow.applyEach}
   * @category Control Flow
   * @param {Array|Iterable|Object} fns - A collection of asynchronous functions to all
   * call with the same arguments
   * @param {...*} [args] - any number of separate arguments to pass to the
   * function.
   * @param {Function} [callback] - the final argument should be the callback,
   * called when all functions have completed processing.
   * @returns {Function} - If only the first argument is provided, it will return
   * a function which lets you pass in the arguments as if it were a single
   * function call.
   */
  var applyEachSeries = applyEach$1(mapSeries);

  /**
   * Creates a continuation function with some arguments already applied.
   *
   * Useful as a shorthand when combined with other control flow functions. Any
   * arguments passed to the returned function are added to the arguments
   * originally passed to apply.
   *
   * @name apply
   * @static
   * @memberOf module:Utils
   * @method
   * @category Util
   * @param {Function} function - The function you want to eventually apply all
   * arguments to. Invokes with (arguments...).
   * @param {...*} arguments... - Any number of arguments to automatically apply
   * when the continuation is called.
   * @example
   *
   * // using apply
   * async.parallel([
   *     async.apply(fs.writeFile, 'testfile1', 'test1'),
   *     async.apply(fs.writeFile, 'testfile2', 'test2')
   * ]);
   *
   *
   * // the same process without using apply
   * async.parallel([
   *     function(callback) {
   *         fs.writeFile('testfile1', 'test1', callback);
   *     },
   *     function(callback) {
   *         fs.writeFile('testfile2', 'test2', callback);
   *     }
   * ]);
   *
   * // It's possible to pass any number of additional arguments when calling the
   * // continuation:
   *
   * node> var fn = async.apply(sys.puts, 'one');
   * node> fn('two', 'three');
   * one
   * two
   * three
   */
  var apply$1 = rest(function (fn, args) {
      return rest(function (callArgs) {
          return fn.apply(null, args.concat(callArgs));
      });
  });

  /**
   * Take a sync function and make it async, passing its return value to a
   * callback. This is useful for plugging sync functions into a waterfall,
   * series, or other async functions. Any arguments passed to the generated
   * function will be passed to the wrapped function (except for the final
   * callback argument). Errors thrown will be passed to the callback.
   *
   * If the function passed to `asyncify` returns a Promise, that promises's
   * resolved/rejected state will be used to call the callback, rather than simply
   * the synchronous return value.
   *
   * This also means you can asyncify ES2016 `async` functions.
   *
   * @name asyncify
   * @static
   * @memberOf module:Utils
   * @method
   * @alias wrapSync
   * @category Util
   * @param {Function} func - The synchronous function to convert to an
   * asynchronous function.
   * @returns {Function} An asynchronous wrapper of the `func`. To be invoked with
   * (callback).
   * @example
   *
   * // passing a regular synchronous function
   * async.waterfall([
   *     async.apply(fs.readFile, filename, "utf8"),
   *     async.asyncify(JSON.parse),
   *     function (data, next) {
   *         // data is the result of parsing the text.
   *         // If there was a parsing error, it would have been caught.
   *     }
   * ], callback);
   *
   * // passing a function returning a promise
   * async.waterfall([
   *     async.apply(fs.readFile, filename, "utf8"),
   *     async.asyncify(function (contents) {
   *         return db.model.create(contents);
   *     }),
   *     function (model, next) {
   *         // `model` is the instantiated model object.
   *         // If there was an error, this function would be skipped.
   *     }
   * ], callback);
   *
   * // es6 example
   * var q = async.queue(async.asyncify(async function(file) {
   *     var intermediateStep = await processFile(file);
   *     return await somePromise(intermediateStep)
   * }));
   *
   * q.push(files);
   */
  function asyncify(func) {
      return initialParams(function (args, callback) {
          var result;
          try {
              result = func.apply(this, args);
          } catch (e) {
              return callback(e);
          }
          // if result is Promise object
          if (isObject(result) && typeof result.then === 'function') {
              result.then(function (value) {
                  callback(null, value);
              }, function (err) {
                  callback(err.message ? err : new Error(err));
              });
          } else {
              callback(null, result);
          }
      });
  }

  /**
   * A specialized version of `_.forEach` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns `array`.
   */
  function arrayEach(array, iteratee) {
    var index = -1,
        length = array ? array.length : 0;

    while (++index < length) {
      if (iteratee(array[index], index, array) === false) {
        break;
      }
    }
    return array;
  }

  /**
   * Creates a base function for methods like `_.forIn` and `_.forOwn`.
   *
   * @private
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseFor(fromRight) {
    return function(object, iteratee, keysFunc) {
      var index = -1,
          iterable = Object(object),
          props = keysFunc(object),
          length = props.length;

      while (length--) {
        var key = props[fromRight ? length : ++index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object;
    };
  }

  /**
   * The base implementation of `baseForOwn` which iterates over `object`
   * properties returned by `keysFunc` and invokes `iteratee` for each property.
   * Iteratee functions may exit iteration early by explicitly returning `false`.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @returns {Object} Returns `object`.
   */
  var baseFor = createBaseFor();

  /**
   * The base implementation of `_.forOwn` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Object} Returns `object`.
   */
  function baseForOwn(object, iteratee) {
    return object && baseFor(object, iteratee, keys);
  }

  /**
   * Gets the index at which the first occurrence of `NaN` is found in `array`.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {number} fromIndex The index to search from.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {number} Returns the index of the matched `NaN`, else `-1`.
   */
  function indexOfNaN(array, fromIndex, fromRight) {
    var length = array.length,
        index = fromIndex + (fromRight ? 1 : -1);

    while ((fromRight ? index-- : ++index < length)) {
      var other = array[index];
      if (other !== other) {
        return index;
      }
    }
    return -1;
  }

  /**
   * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    if (value !== value) {
      return indexOfNaN(array, fromIndex);
    }
    var index = fromIndex - 1,
        length = array.length;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Determines the best order for running the functions in `tasks`, based on
   * their requirements. Each function can optionally depend on other functions
   * being completed first, and each function is run as soon as its requirements
   * are satisfied.
   *
   * If any of the functions pass an error to their callback, the `auto` sequence
   * will stop. Further tasks will not execute (so any other functions depending
   * on it will not run), and the main `callback` is immediately called with the
   * error.
   *
   * Functions also receive an object containing the results of functions which
   * have completed so far as the first argument, if they have dependencies. If a
   * task function has no dependencies, it will only be passed a callback.
   *
   * @name auto
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {Object} tasks - An object. Each of its properties is either a
   * function or an array of requirements, with the function itself the last item
   * in the array. The object's key of a property serves as the name of the task
   * defined by that property, i.e. can be used when specifying requirements for
   * other tasks. The function receives one or two arguments:
   * * a `results` object, containing the results of the previously executed
   *   functions, only passed if the task has any dependencies,
   * * a `callback(err, result)` function, which must be called when finished,
   *   passing an `error` (which can be `null`) and the result of the function's
   *   execution.
   * @param {number} [concurrency=Infinity] - An optional `integer` for
   * determining the maximum number of tasks that can be run in parallel. By
   * default, as many as possible.
   * @param {Function} [callback] - An optional callback which is called when all
   * the tasks have been completed. It receives the `err` argument if any `tasks`
   * pass an error to their callback. Results are always returned; however, if an
   * error occurs, no further `tasks` will be performed, and the results object
   * will only contain partial results. Invoked with (err, results).
   * @returns undefined
   * @example
   *
   * async.auto({
   *     // this function will just be passed a callback
   *     readData: async.apply(fs.readFile, 'data.txt', 'utf-8'),
   *     showData: ['readData', function(results, cb) {
   *         // results.readData is the file's contents
   *         // ...
   *     }]
   * }, callback);
   *
   * async.auto({
   *     get_data: function(callback) {
   *         console.log('in get_data');
   *         // async code to get some data
   *         callback(null, 'data', 'converted to array');
   *     },
   *     make_folder: function(callback) {
   *         console.log('in make_folder');
   *         // async code to create a directory to store a file in
   *         // this is run at the same time as getting the data
   *         callback(null, 'folder');
   *     },
   *     write_file: ['get_data', 'make_folder', function(results, callback) {
   *         console.log('in write_file', JSON.stringify(results));
   *         // once there is some data and the directory exists,
   *         // write the data to a file in the directory
   *         callback(null, 'filename');
   *     }],
   *     email_link: ['write_file', function(results, callback) {
   *         console.log('in email_link', JSON.stringify(results));
   *         // once the file is written let's email a link to it...
   *         // results.write_file contains the filename returned by write_file.
   *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
   *     }]
   * }, function(err, results) {
   *     console.log('err = ', err);
   *     console.log('results = ', results);
   * });
   */
  function auto (tasks, concurrency, callback) {
      if (typeof concurrency === 'function') {
          // concurrency is optional, shift the args.
          callback = concurrency;
          concurrency = null;
      }
      callback = once(callback || noop);
      var keys$$ = keys(tasks);
      var numTasks = keys$$.length;
      if (!numTasks) {
          return callback(null);
      }
      if (!concurrency) {
          concurrency = numTasks;
      }

      var results = {};
      var runningTasks = 0;
      var hasError = false;

      var listeners = {};

      var readyTasks = [];

      // for cycle detection:
      var readyToCheck = []; // tasks that have been identified as reachable
      // without the possibility of returning to an ancestor task
      var uncheckedDependencies = {};

      baseForOwn(tasks, function (task, key) {
          if (!isArray(task)) {
              // no dependencies
              enqueueTask(key, [task]);
              readyToCheck.push(key);
              return;
          }

          var dependencies = task.slice(0, task.length - 1);
          var remainingDependencies = dependencies.length;
          if (remainingDependencies === 0) {
              enqueueTask(key, task);
              readyToCheck.push(key);
              return;
          }
          uncheckedDependencies[key] = remainingDependencies;

          arrayEach(dependencies, function (dependencyName) {
              if (!tasks[dependencyName]) {
                  throw new Error('async.auto task `' + key + '` has a non-existent dependency in ' + dependencies.join(', '));
              }
              addListener(dependencyName, function () {
                  remainingDependencies--;
                  if (remainingDependencies === 0) {
                      enqueueTask(key, task);
                  }
              });
          });
      });

      checkForDeadlocks();
      processQueue();

      function enqueueTask(key, task) {
          readyTasks.push(function () {
              runTask(key, task);
          });
      }

      function processQueue() {
          if (readyTasks.length === 0 && runningTasks === 0) {
              return callback(null, results);
          }
          while (readyTasks.length && runningTasks < concurrency) {
              var run = readyTasks.shift();
              run();
          }
      }

      function addListener(taskName, fn) {
          var taskListeners = listeners[taskName];
          if (!taskListeners) {
              taskListeners = listeners[taskName] = [];
          }

          taskListeners.push(fn);
      }

      function taskComplete(taskName) {
          var taskListeners = listeners[taskName] || [];
          arrayEach(taskListeners, function (fn) {
              fn();
          });
          processQueue();
      }

      function runTask(key, task) {
          if (hasError) return;

          var taskCallback = onlyOnce(rest(function (err, args) {
              runningTasks--;
              if (args.length <= 1) {
                  args = args[0];
              }
              if (err) {
                  var safeResults = {};
                  baseForOwn(results, function (val, rkey) {
                      safeResults[rkey] = val;
                  });
                  safeResults[key] = args;
                  hasError = true;
                  listeners = [];

                  callback(err, safeResults);
              } else {
                  results[key] = args;
                  taskComplete(key);
              }
          }));

          runningTasks++;
          var taskFn = task[task.length - 1];
          if (task.length > 1) {
              taskFn(results, taskCallback);
          } else {
              taskFn(taskCallback);
          }
      }

      function checkForDeadlocks() {
          // Kahn's algorithm
          // https://en.wikipedia.org/wiki/Topological_sorting#Kahn.27s_algorithm
          // http://connalle.blogspot.com/2013/10/topological-sortingkahn-algorithm.html
          var currentTask;
          var counter = 0;
          while (readyToCheck.length) {
              currentTask = readyToCheck.pop();
              counter++;
              arrayEach(getDependents(currentTask), function (dependent) {
                  if (! --uncheckedDependencies[dependent]) {
                      readyToCheck.push(dependent);
                  }
              });
          }

          if (counter !== numTasks) {
              throw new Error('async.auto cannot execute tasks due to a recursive dependency');
          }
      }

      function getDependents(taskName) {
          var result = [];
          baseForOwn(tasks, function (task, key) {
              if (isArray(task) && baseIndexOf(task, taskName, 0) >= 0) {
                  result.push(key);
              }
          });
          return result;
      }
  }

  /**
   * A specialized version of `_.map` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function arrayMap(array, iteratee) {
    var index = -1,
        length = array ? array.length : 0,
        result = Array(length);

    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }

  /**
   * Copies the values of `source` to `array`.
   *
   * @private
   * @param {Array} source The array to copy values from.
   * @param {Array} [array=[]] The array to copy values to.
   * @returns {Array} Returns `array`.
   */
  function copyArray(source, array) {
    var index = -1,
        length = source.length;

    array || (array = Array(length));
    while (++index < length) {
      array[index] = source[index];
    }
    return array;
  }

  /**
   * Checks if `value` is a global object.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {null|Object} Returns `value` if it's a global object, else `null`.
   */
  function checkGlobal(value) {
    return (value && value.Object === Object) ? value : null;
  }

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = checkGlobal(typeof global == 'object' && global);

  /** Detect free variable `self`. */
  var freeSelf = checkGlobal(typeof self == 'object' && self);

  /** Detect `this` as the global object. */
  var thisGlobal = checkGlobal(typeof this == 'object' && this);

  /** Used as a reference to the global object. */
  var root = freeGlobal || freeSelf || thisGlobal || Function('return this')();

  /** Built-in value references. */
  var Symbol$1 = root.Symbol;

  /** Used as references for various `Number` constants. */
  var INFINITY$1 = 1 / 0;

  /** Used to convert symbols to primitives and strings. */
  var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined;
  var symbolToString = symbolProto ? symbolProto.toString : undefined;
  /**
   * The base implementation of `_.toString` which doesn't convert nullish
   * values to empty strings.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   */
  function baseToString(value) {
    // Exit early for strings to avoid a performance hit in some environments.
    if (typeof value == 'string') {
      return value;
    }
    if (isSymbol(value)) {
      return symbolToString ? symbolToString.call(value) : '';
    }
    var result = (value + '');
    return (result == '0' && (1 / value) == -INFINITY$1) ? '-0' : result;
  }

  /**
   * The base implementation of `_.slice` without an iteratee call guard.
   *
   * @private
   * @param {Array} array The array to slice.
   * @param {number} [start=0] The start position.
   * @param {number} [end=array.length] The end position.
   * @returns {Array} Returns the slice of `array`.
   */
  function baseSlice(array, start, end) {
    var index = -1,
        length = array.length;

    if (start < 0) {
      start = -start > length ? 0 : (length + start);
    }
    end = end > length ? length : end;
    if (end < 0) {
      end += length;
    }
    length = start > end ? 0 : ((end - start) >>> 0);
    start >>>= 0;

    var result = Array(length);
    while (++index < length) {
      result[index] = array[index + start];
    }
    return result;
  }

  /**
   * Casts `array` to a slice if it's needed.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {number} start The start position.
   * @param {number} [end=array.length] The end position.
   * @returns {Array} Returns the cast slice.
   */
  function castSlice(array, start, end) {
    var length = array.length;
    end = end === undefined ? length : end;
    return (!start && end >= length) ? array : baseSlice(array, start, end);
  }

  /**
   * Used by `_.trim` and `_.trimEnd` to get the index of the last string symbol
   * that is not found in the character symbols.
   *
   * @private
   * @param {Array} strSymbols The string symbols to inspect.
   * @param {Array} chrSymbols The character symbols to find.
   * @returns {number} Returns the index of the last unmatched string symbol.
   */
  function charsEndIndex(strSymbols, chrSymbols) {
    var index = strSymbols.length;

    while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
    return index;
  }

  /**
   * Used by `_.trim` and `_.trimStart` to get the index of the first string symbol
   * that is not found in the character symbols.
   *
   * @private
   * @param {Array} strSymbols The string symbols to inspect.
   * @param {Array} chrSymbols The character symbols to find.
   * @returns {number} Returns the index of the first unmatched string symbol.
   */
  function charsStartIndex(strSymbols, chrSymbols) {
    var index = -1,
        length = strSymbols.length;

    while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
    return index;
  }

  /** Used to compose unicode character classes. */
  var rsAstralRange = '\\ud800-\\udfff';
  var rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23';
  var rsComboSymbolsRange = '\\u20d0-\\u20f0';
  var rsVarRange = '\\ufe0e\\ufe0f';
  var rsAstral = '[' + rsAstralRange + ']';
  var rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']';
  var rsFitz = '\\ud83c[\\udffb-\\udfff]';
  var rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')';
  var rsNonAstral = '[^' + rsAstralRange + ']';
  var rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}';
  var rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]';
  var rsZWJ = '\\u200d';
  var reOptMod = rsModifier + '?';
  var rsOptVar = '[' + rsVarRange + ']?';
  var rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*';
  var rsSeq = rsOptVar + reOptMod + rsOptJoin;
  var rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';
  /** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
  var reComplexSymbol = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

  /**
   * Converts `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */
  function stringToArray(string) {
    return string.match(reComplexSymbol);
  }

  /**
   * Converts `value` to a string. An empty string is returned for `null`
   * and `undefined` values. The sign of `-0` is preserved.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   * @example
   *
   * _.toString(null);
   * // => ''
   *
   * _.toString(-0);
   * // => '-0'
   *
   * _.toString([1, 2, 3]);
   * // => '1,2,3'
   */
  function toString(value) {
    return value == null ? '' : baseToString(value);
  }

  /** Used to match leading and trailing whitespace. */
  var reTrim$1 = /^\s+|\s+$/g;

  /**
   * Removes leading and trailing whitespace or specified characters from `string`.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category String
   * @param {string} [string=''] The string to trim.
   * @param {string} [chars=whitespace] The characters to trim.
   * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
   * @returns {string} Returns the trimmed string.
   * @example
   *
   * _.trim('  abc  ');
   * // => 'abc'
   *
   * _.trim('-_-abc-_-', '_-');
   * // => 'abc'
   *
   * _.map(['  foo  ', '  bar  '], _.trim);
   * // => ['foo', 'bar']
   */
  function trim(string, chars, guard) {
    string = toString(string);
    if (string && (guard || chars === undefined)) {
      return string.replace(reTrim$1, '');
    }
    if (!string || !(chars = baseToString(chars))) {
      return string;
    }
    var strSymbols = stringToArray(string),
        chrSymbols = stringToArray(chars),
        start = charsStartIndex(strSymbols, chrSymbols),
        end = charsEndIndex(strSymbols, chrSymbols) + 1;

    return castSlice(strSymbols, start, end).join('');
  }

  var FN_ARGS = /^(function)?\s*[^\(]*\(\s*([^\)]*)\)/m;
  var FN_ARG_SPLIT = /,/;
  var FN_ARG = /(=.+)?(\s*)$/;
  var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

  function parseParams(func) {
      func = func.toString().replace(STRIP_COMMENTS, '');
      func = func.match(FN_ARGS)[2].replace(' ', '');
      func = func ? func.split(FN_ARG_SPLIT) : [];
      func = func.map(function (arg) {
          return trim(arg.replace(FN_ARG, ''));
      });
      return func;
  }

  /**
   * A dependency-injected version of the [async.auto]{@link module:ControlFlow.auto} function. Dependent
   * tasks are specified as parameters to the function, after the usual callback
   * parameter, with the parameter names matching the names of the tasks it
   * depends on. This can provide even more readable task graphs which can be
   * easier to maintain.
   *
   * If a final callback is specified, the task results are similarly injected,
   * specified as named parameters after the initial error parameter.
   *
   * The autoInject function is purely syntactic sugar and its semantics are
   * otherwise equivalent to [async.auto]{@link module:ControlFlow.auto}.
   *
   * @name autoInject
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.auto]{@link module:ControlFlow.auto}
   * @category Control Flow
   * @param {Object} tasks - An object, each of whose properties is a function of
   * the form 'func([dependencies...], callback). The object's key of a property
   * serves as the name of the task defined by that property, i.e. can be used
   * when specifying requirements for other tasks.
   * * The `callback` parameter is a `callback(err, result)` which must be called
   *   when finished, passing an `error` (which can be `null`) and the result of
   *   the function's execution. The remaining parameters name other tasks on
   *   which the task is dependent, and the results from those tasks are the
   *   arguments of those parameters.
   * @param {Function} [callback] - An optional callback which is called when all
   * the tasks have been completed. It receives the `err` argument if any `tasks`
   * pass an error to their callback, and a `results` object with any completed
   * task results, similar to `auto`.
   * @example
   *
   * //  The example from `auto` can be rewritten as follows:
   * async.autoInject({
   *     get_data: function(callback) {
   *         // async code to get some data
   *         callback(null, 'data', 'converted to array');
   *     },
   *     make_folder: function(callback) {
   *         // async code to create a directory to store a file in
   *         // this is run at the same time as getting the data
   *         callback(null, 'folder');
   *     },
   *     write_file: function(get_data, make_folder, callback) {
   *         // once there is some data and the directory exists,
   *         // write the data to a file in the directory
   *         callback(null, 'filename');
   *     },
   *     email_link: function(write_file, callback) {
   *         // once the file is written let's email a link to it...
   *         // write_file contains the filename returned by write_file.
   *         callback(null, {'file':write_file, 'email':'user@example.com'});
   *     }
   * }, function(err, results) {
   *     console.log('err = ', err);
   *     console.log('email_link = ', results.email_link);
   * });
   *
   * // If you are using a JS minifier that mangles parameter names, `autoInject`
   * // will not work with plain functions, since the parameter names will be
   * // collapsed to a single letter identifier.  To work around this, you can
   * // explicitly specify the names of the parameters your task function needs
   * // in an array, similar to Angular.js dependency injection.
   *
   * // This still has an advantage over plain `auto`, since the results a task
   * // depends on are still spread into arguments.
   * async.autoInject({
   *     //...
   *     write_file: ['get_data', 'make_folder', function(get_data, make_folder, callback) {
   *         callback(null, 'filename');
   *     }],
   *     email_link: ['write_file', function(write_file, callback) {
   *         callback(null, {'file':write_file, 'email':'user@example.com'});
   *     }]
   *     //...
   * }, function(err, results) {
   *     console.log('err = ', err);
   *     console.log('email_link = ', results.email_link);
   * });
   */
  function autoInject(tasks, callback) {
      var newTasks = {};

      baseForOwn(tasks, function (taskFn, key) {
          var params;

          if (isArray(taskFn)) {
              params = copyArray(taskFn);
              taskFn = params.pop();

              newTasks[key] = params.concat(params.length > 0 ? newTask : taskFn);
          } else if (taskFn.length === 1) {
              // no dependencies, use the function as-is
              newTasks[key] = taskFn;
          } else {
              params = parseParams(taskFn);
              if (taskFn.length === 0 && params.length === 0) {
                  throw new Error("autoInject task functions require explicit parameters.");
              }

              params.pop();

              newTasks[key] = params.concat(newTask);
          }

          function newTask(results, taskCb) {
              var newArgs = arrayMap(params, function (name) {
                  return results[name];
              });
              newArgs.push(taskCb);
              taskFn.apply(null, newArgs);
          }
      });

      auto(newTasks, callback);
  }

  var hasSetImmediate = typeof setImmediate === 'function' && setImmediate;
  var hasNextTick = typeof process === 'object' && typeof process.nextTick === 'function';

  function fallback(fn) {
      setTimeout(fn, 0);
  }

  function wrap(defer) {
      return rest(function (fn, args) {
          defer(function () {
              fn.apply(null, args);
          });
      });
  }

  var _defer;

  if (hasSetImmediate) {
      _defer = setImmediate;
  } else if (hasNextTick) {
      _defer = process.nextTick;
  } else {
      _defer = fallback;
  }

  var setImmediate$1 = wrap(_defer);

  // Simple doubly linked list (https://en.wikipedia.org/wiki/Doubly_linked_list) implementation
  // used for queues. This implementation assumes that the node provided by the user can be modified
  // to adjust the next and last properties. We implement only the minimal functionality
  // for queue support.
  function DLL() {
      this.head = this.tail = null;
      this.length = 0;
  }

  function setInitial(dll, node) {
      dll.length = 1;
      dll.head = dll.tail = node;
  }

  DLL.prototype.removeLink = function (node) {
      if (node.prev) node.prev.next = node.next;else this.head = node.next;
      if (node.next) node.next.prev = node.prev;else this.tail = node.prev;

      node.prev = node.next = null;
      this.length -= 1;
      return node;
  };

  DLL.prototype.empty = DLL;

  DLL.prototype.insertAfter = function (node, newNode) {
      newNode.prev = node;
      newNode.next = node.next;
      if (node.next) node.next.prev = newNode;else this.tail = newNode;
      node.next = newNode;
      this.length += 1;
  };

  DLL.prototype.insertBefore = function (node, newNode) {
      newNode.prev = node.prev;
      newNode.next = node;
      if (node.prev) node.prev.next = newNode;else this.head = newNode;
      node.prev = newNode;
      this.length += 1;
  };

  DLL.prototype.unshift = function (node) {
      if (this.head) this.insertBefore(this.head, node);else setInitial(this, node);
  };

  DLL.prototype.push = function (node) {
      if (this.tail) this.insertAfter(this.tail, node);else setInitial(this, node);
  };

  DLL.prototype.shift = function () {
      return this.head && this.removeLink(this.head);
  };

  DLL.prototype.pop = function () {
      return this.tail && this.removeLink(this.tail);
  };

  function queue(worker, concurrency, payload) {
      if (concurrency == null) {
          concurrency = 1;
      } else if (concurrency === 0) {
          throw new Error('Concurrency must not be zero');
      }

      function _insert(data, pos, callback) {
          if (callback != null && typeof callback !== 'function') {
              throw new Error('task callback must be a function');
          }
          q.started = true;
          if (!isArray(data)) {
              data = [data];
          }
          if (data.length === 0 && q.idle()) {
              // call drain immediately if there are no tasks
              return setImmediate$1(function () {
                  q.drain();
              });
          }
          arrayEach(data, function (task) {
              var item = {
                  data: task,
                  callback: callback || noop
              };

              if (pos) {
                  q._tasks.unshift(item);
              } else {
                  q._tasks.push(item);
              }
          });
          setImmediate$1(q.process);
      }

      function _next(tasks) {
          return rest(function (args) {
              workers -= 1;

              arrayEach(tasks, function (task) {
                  arrayEach(workersList, function (worker, index) {
                      if (worker === task) {
                          workersList.splice(index, 1);
                          return false;
                      }
                  });

                  task.callback.apply(task, args);

                  if (args[0] != null) {
                      q.error(args[0], task.data);
                  }
              });

              if (workers <= q.concurrency - q.buffer) {
                  q.unsaturated();
              }

              if (q.idle()) {
                  q.drain();
              }
              q.process();
          });
      }

      var workers = 0;
      var workersList = [];
      var q = {
          _tasks: new DLL(),
          concurrency: concurrency,
          payload: payload,
          saturated: noop,
          unsaturated: noop,
          buffer: concurrency / 4,
          empty: noop,
          drain: noop,
          error: noop,
          started: false,
          paused: false,
          push: function (data, callback) {
              _insert(data, false, callback);
          },
          kill: function () {
              q.drain = noop;
              q._tasks.empty();
          },
          unshift: function (data, callback) {
              _insert(data, true, callback);
          },
          process: function () {
              while (!q.paused && workers < q.concurrency && q._tasks.length) {
                  var tasks = [],
                      data = [];
                  var l = q._tasks.length;
                  if (q.payload) l = Math.min(l, q.payload);
                  for (var i = 0; i < l; i++) {
                      var node = q._tasks.shift();
                      tasks.push(node);
                      data.push(node.data);
                  }

                  if (q._tasks.length === 0) {
                      q.empty();
                  }
                  workers += 1;
                  workersList.push(tasks[0]);

                  if (workers === q.concurrency) {
                      q.saturated();
                  }

                  var cb = onlyOnce(_next(tasks));
                  worker(data, cb);
              }
          },
          length: function () {
              return q._tasks.length;
          },
          running: function () {
              return workers;
          },
          workersList: function () {
              return workersList;
          },
          idle: function () {
              return q._tasks.length + workers === 0;
          },
          pause: function () {
              q.paused = true;
          },
          resume: function () {
              if (q.paused === false) {
                  return;
              }
              q.paused = false;
              var resumeCount = Math.min(q.concurrency, q._tasks.length);
              // Need to call q.process once per concurrent
              // worker to preserve full concurrency after pause
              for (var w = 1; w <= resumeCount; w++) {
                  setImmediate$1(q.process);
              }
          }
      };
      return q;
  }

  /**
   * A cargo of tasks for the worker function to complete. Cargo inherits all of
   * the same methods and event callbacks as [`queue`]{@link module:ControlFlow.queue}.
   * @typedef {Object} CargoObject
   * @memberOf module:ControlFlow
   * @property {Function} length - A function returning the number of items
   * waiting to be processed. Invoke like `cargo.length()`.
   * @property {number} payload - An `integer` for determining how many tasks
   * should be process per round. This property can be changed after a `cargo` is
   * created to alter the payload on-the-fly.
   * @property {Function} push - Adds `task` to the `queue`. The callback is
   * called once the `worker` has finished processing the task. Instead of a
   * single task, an array of `tasks` can be submitted. The respective callback is
   * used for every task in the list. Invoke like `cargo.push(task, [callback])`.
   * @property {Function} saturated - A callback that is called when the
   * `queue.length()` hits the concurrency and further tasks will be queued.
   * @property {Function} empty - A callback that is called when the last item
   * from the `queue` is given to a `worker`.
   * @property {Function} drain - A callback that is called when the last item
   * from the `queue` has returned from the `worker`.
   * @property {Function} idle - a function returning false if there are items
   * waiting or being processed, or true if not. Invoke like `cargo.idle()`.
   * @property {Function} pause - a function that pauses the processing of tasks
   * until `resume()` is called. Invoke like `cargo.pause()`.
   * @property {Function} resume - a function that resumes the processing of
   * queued tasks when the queue is paused. Invoke like `cargo.resume()`.
   * @property {Function} kill - a function that removes the `drain` callback and
   * empties remaining tasks from the queue forcing it to go idle. Invoke like `cargo.kill()`.
   */

  /**
   * Creates a `cargo` object with the specified payload. Tasks added to the
   * cargo will be processed altogether (up to the `payload` limit). If the
   * `worker` is in progress, the task is queued until it becomes available. Once
   * the `worker` has completed some tasks, each callback of those tasks is
   * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
   * for how `cargo` and `queue` work.
   *
   * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
   * at a time, cargo passes an array of tasks to a single worker, repeating
   * when the worker is finished.
   *
   * @name cargo
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.queue]{@link module:ControlFlow.queue}
   * @category Control Flow
   * @param {Function} worker - An asynchronous function for processing an array
   * of queued tasks, which must call its `callback(err)` argument when finished,
   * with an optional `err` argument. Invoked with `(tasks, callback)`.
   * @param {number} [payload=Infinity] - An optional `integer` for determining
   * how many tasks should be processed per round; if omitted, the default is
   * unlimited.
   * @returns {module:ControlFlow.CargoObject} A cargo object to manage the tasks. Callbacks can
   * attached as certain properties to listen for specific events during the
   * lifecycle of the cargo and inner queue.
   * @example
   *
   * // create a cargo object with payload 2
   * var cargo = async.cargo(function(tasks, callback) {
   *     for (var i=0; i<tasks.length; i++) {
   *         console.log('hello ' + tasks[i].name);
   *     }
   *     callback();
   * }, 2);
   *
   * // add some items
   * cargo.push({name: 'foo'}, function(err) {
   *     console.log('finished processing foo');
   * });
   * cargo.push({name: 'bar'}, function(err) {
   *     console.log('finished processing bar');
   * });
   * cargo.push({name: 'baz'}, function(err) {
   *     console.log('finished processing baz');
   * });
   */
  function cargo(worker, payload) {
    return queue(worker, 1, payload);
  }

  /**
   * The same as [`eachOf`]{@link module:Collections.eachOf} but runs a maximum of `limit` async operations at a
   * time.
   *
   * @name eachOfLimit
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.eachOf]{@link module:Collections.eachOf}
   * @alias forEachOfLimit
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} iteratee - A function to apply to each
   * item in `coll`. The `key` is the item's key, or index in the case of an
   * array. The iteratee is passed a `callback(err)` which must be called once it
   * has completed. If no error has occurred, the callback should be run without
   * arguments or with an explicit `null` argument. Invoked with
   * (item, key, callback).
   * @param {Function} [callback] - A callback which is called when all
   * `iteratee` functions have finished, or an error occurs. Invoked with (err).
   */
  function eachOfLimit(coll, limit, iteratee, callback) {
    _eachOfLimit(limit)(coll, iteratee, callback);
  }

  /**
   * The same as [`eachOf`]{@link module:Collections.eachOf} but runs only a single async operation at a time.
   *
   * @name eachOfSeries
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.eachOf]{@link module:Collections.eachOf}
   * @alias forEachOfSeries
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each item in `coll`. The
   * `key` is the item's key, or index in the case of an array. The iteratee is
   * passed a `callback(err)` which must be called once it has completed. If no
   * error has occurred, the callback should be run without arguments or with an
   * explicit `null` argument. Invoked with (item, key, callback).
   * @param {Function} [callback] - A callback which is called when all `iteratee`
   * functions have finished, or an error occurs. Invoked with (err).
   */
  var eachOfSeries = doLimit(eachOfLimit, 1);

  /**
   * Reduces `coll` into a single value using an async `iteratee` to return each
   * successive step. `memo` is the initial state of the reduction. This function
   * only operates in series.
   *
   * For performance reasons, it may make sense to split a call to this function
   * into a parallel map, and then use the normal `Array.prototype.reduce` on the
   * results. This function is for situations where each step in the reduction
   * needs to be async; if you can get the data before reducing it, then it's
   * probably a good idea to do so.
   *
   * @name reduce
   * @static
   * @memberOf module:Collections
   * @method
   * @alias inject
   * @alias foldl
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {*} memo - The initial state of the reduction.
   * @param {Function} iteratee - A function applied to each item in the
   * array to produce the next step in the reduction. The `iteratee` is passed a
   * `callback(err, reduction)` which accepts an optional error as its first
   * argument, and the state of the reduction as the second. If an error is
   * passed to the callback, the reduction is stopped and the main `callback` is
   * immediately called with the error. Invoked with (memo, item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Result is the reduced value. Invoked with
   * (err, result).
   * @example
   *
   * async.reduce([1,2,3], 0, function(memo, item, callback) {
   *     // pointless async:
   *     process.nextTick(function() {
   *         callback(null, memo + item)
   *     });
   * }, function(err, result) {
   *     // result is now equal to the last value of memo, which is 6
   * });
   */
  function reduce(coll, memo, iteratee, callback) {
      callback = once(callback || noop);
      eachOfSeries(coll, function (x, i, callback) {
          iteratee(memo, x, function (err, v) {
              memo = v;
              callback(err);
          });
      }, function (err) {
          callback(err, memo);
      });
  }

  /**
   * Version of the compose function that is more natural to read. Each function
   * consumes the return value of the previous function. It is the equivalent of
   * [compose]{@link module:ControlFlow.compose} with the arguments reversed.
   *
   * Each function is executed with the `this` binding of the composed function.
   *
   * @name seq
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.compose]{@link module:ControlFlow.compose}
   * @category Control Flow
   * @param {...Function} functions - the asynchronous functions to compose
   * @returns {Function} a function that composes the `functions` in order
   * @example
   *
   * // Requires lodash (or underscore), express3 and dresende's orm2.
   * // Part of an app, that fetches cats of the logged user.
   * // This example uses `seq` function to avoid overnesting and error
   * // handling clutter.
   * app.get('/cats', function(request, response) {
   *     var User = request.models.User;
   *     async.seq(
   *         _.bind(User.get, User),  // 'User.get' has signature (id, callback(err, data))
   *         function(user, fn) {
   *             user.getCats(fn);      // 'getCats' has signature (callback(err, data))
   *         }
   *     )(req.session.user_id, function (err, cats) {
   *         if (err) {
   *             console.error(err);
   *             response.json({ status: 'error', message: err.message });
   *         } else {
   *             response.json({ status: 'ok', message: 'Cats found', data: cats });
   *         }
   *     });
   * });
   */
  var seq = rest(function seq(functions) {
      return rest(function (args) {
          var that = this;

          var cb = args[args.length - 1];
          if (typeof cb == 'function') {
              args.pop();
          } else {
              cb = noop;
          }

          reduce(functions, args, function (newargs, fn, cb) {
              fn.apply(that, newargs.concat([rest(function (err, nextargs) {
                  cb(err, nextargs);
              })]));
          }, function (err, results) {
              cb.apply(that, [err].concat(results));
          });
      });
  });

  /**
   * Creates a function which is a composition of the passed asynchronous
   * functions. Each function consumes the return value of the function that
   * follows. Composing functions `f()`, `g()`, and `h()` would produce the result
   * of `f(g(h()))`, only this version uses callbacks to obtain the return values.
   *
   * Each function is executed with the `this` binding of the composed function.
   *
   * @name compose
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {...Function} functions - the asynchronous functions to compose
   * @returns {Function} an asynchronous function that is the composed
   * asynchronous `functions`
   * @example
   *
   * function add1(n, callback) {
   *     setTimeout(function () {
   *         callback(null, n + 1);
   *     }, 10);
   * }
   *
   * function mul3(n, callback) {
   *     setTimeout(function () {
   *         callback(null, n * 3);
   *     }, 10);
   * }
   *
   * var add1mul3 = async.compose(mul3, add1);
   * add1mul3(4, function (err, result) {
   *     // result now equals 15
   * });
   */
  var compose = rest(function (args) {
    return seq.apply(null, args.reverse());
  });

  function concat$1(eachfn, arr, fn, callback) {
      var result = [];
      eachfn(arr, function (x, index, cb) {
          fn(x, function (err, y) {
              result = result.concat(y || []);
              cb(err);
          });
      }, function (err) {
          callback(err, result);
      });
  }

  /**
   * Like [`each`]{@link module:Collections.each}, except that it passes the key (or index) as the second argument
   * to the iteratee.
   *
   * @name eachOf
   * @static
   * @memberOf module:Collections
   * @method
   * @alias forEachOf
   * @category Collection
   * @see [async.each]{@link module:Collections.each}
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each
   * item in `coll`. The `key` is the item's key, or index in the case of an
   * array. The iteratee is passed a `callback(err)` which must be called once it
   * has completed. If no error has occurred, the callback should be run without
   * arguments or with an explicit `null` argument. Invoked with
   * (item, key, callback).
   * @param {Function} [callback] - A callback which is called when all
   * `iteratee` functions have finished, or an error occurs. Invoked with (err).
   * @example
   *
   * var obj = {dev: "/dev.json", test: "/test.json", prod: "/prod.json"};
   * var configs = {};
   *
   * async.forEachOf(obj, function (value, key, callback) {
   *     fs.readFile(__dirname + value, "utf8", function (err, data) {
   *         if (err) return callback(err);
   *         try {
   *             configs[key] = JSON.parse(data);
   *         } catch (e) {
   *             return callback(e);
   *         }
   *         callback();
   *     });
   * }, function (err) {
   *     if (err) console.error(err.message);
   *     // configs is now a map of JSON data
   *     doSomethingWith(configs);
   * });
   */
  var eachOf = doLimit(eachOfLimit, Infinity);

  function doParallel(fn) {
      return function (obj, iteratee, callback) {
          return fn(eachOf, obj, iteratee, callback);
      };
  }

  /**
   * Applies `iteratee` to each item in `coll`, concatenating the results. Returns
   * the concatenated list. The `iteratee`s are called in parallel, and the
   * results are concatenated as they return. There is no guarantee that the
   * results array will be returned in the original order of `coll` passed to the
   * `iteratee` function.
   *
   * @name concat
   * @static
   * @memberOf module:Collections
   * @method
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each item in `coll`.
   * The iteratee is passed a `callback(err, results)` which must be called once
   * it has completed with an error (which can be `null`) and an array of results.
   * Invoked with (item, callback).
   * @param {Function} [callback(err)] - A callback which is called after all the
   * `iteratee` functions have finished, or an error occurs. Results is an array
   * containing the concatenated results of the `iteratee` function. Invoked with
   * (err, results).
   * @example
   *
   * async.concat(['dir1','dir2','dir3'], fs.readdir, function(err, files) {
   *     // files is now a list of filenames that exist in the 3 directories
   * });
   */
  var concat = doParallel(concat$1);

  function doSeries(fn) {
      return function (obj, iteratee, callback) {
          return fn(eachOfSeries, obj, iteratee, callback);
      };
  }

  /**
   * The same as [`concat`]{@link module:Collections.concat} but runs only a single async operation at a time.
   *
   * @name concatSeries
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.concat]{@link module:Collections.concat}
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each item in `coll`.
   * The iteratee is passed a `callback(err, results)` which must be called once
   * it has completed with an error (which can be `null`) and an array of results.
   * Invoked with (item, callback).
   * @param {Function} [callback(err)] - A callback which is called after all the
   * `iteratee` functions have finished, or an error occurs. Results is an array
   * containing the concatenated results of the `iteratee` function. Invoked with
   * (err, results).
   */
  var concatSeries = doSeries(concat$1);

  /**
   * Returns a function that when called, calls-back with the values provided.
   * Useful as the first function in a [`waterfall`]{@link module:ControlFlow.waterfall}, or for plugging values in to
   * [`auto`]{@link module:ControlFlow.auto}.
   *
   * @name constant
   * @static
   * @memberOf module:Utils
   * @method
   * @category Util
   * @param {...*} arguments... - Any number of arguments to automatically invoke
   * callback with.
   * @returns {Function} Returns a function that when invoked, automatically
   * invokes the callback with the previous given arguments.
   * @example
   *
   * async.waterfall([
   *     async.constant(42),
   *     function (value, next) {
   *         // value === 42
   *     },
   *     //...
   * ], callback);
   *
   * async.waterfall([
   *     async.constant(filename, "utf8"),
   *     fs.readFile,
   *     function (fileData, next) {
   *         //...
   *     }
   *     //...
   * ], callback);
   *
   * async.auto({
   *     hostname: async.constant("https://server.net/"),
   *     port: findFreePort,
   *     launchServer: ["hostname", "port", function (options, cb) {
   *         startServer(options, cb);
   *     }],
   *     //...
   * }, callback);
   */
  var constant = rest(function (values) {
      var args = [null].concat(values);
      return initialParams(function (ignoredArgs, callback) {
          return callback.apply(this, args);
      });
  });

  /**
   * This method returns the first argument given to it.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {*} value Any value.
   * @returns {*} Returns `value`.
   * @example
   *
   * var object = { 'user': 'fred' };
   *
   * console.log(_.identity(object) === object);
   * // => true
   */
  function identity(value) {
    return value;
  }

  function _createTester(eachfn, check, getResult) {
      return function (arr, limit, iteratee, cb) {
          function done(err) {
              if (cb) {
                  if (err) {
                      cb(err);
                  } else {
                      cb(null, getResult(false));
                  }
              }
          }
          function wrappedIteratee(x, _, callback) {
              if (!cb) return callback();
              iteratee(x, function (err, v) {
                  if (cb) {
                      if (err) {
                          cb(err);
                          cb = iteratee = false;
                      } else if (check(v)) {
                          cb(null, getResult(true, x));
                          cb = iteratee = false;
                      }
                  }
                  callback();
              });
          }
          if (arguments.length > 3) {
              cb = cb || noop;
              eachfn(arr, limit, wrappedIteratee, done);
          } else {
              cb = iteratee;
              cb = cb || noop;
              iteratee = limit;
              eachfn(arr, wrappedIteratee, done);
          }
      };
  }

  function _findGetResult(v, x) {
      return x;
  }

  /**
   * Returns the first value in `coll` that passes an async truth test. The
   * `iteratee` is applied in parallel, meaning the first iteratee to return
   * `true` will fire the detect `callback` with that result. That means the
   * result might not be the first item in the original `coll` (in terms of order)
   * that passes the test.

   * If order within the original `coll` is important, then look at
   * [`detectSeries`]{@link module:Collections.detectSeries}.
   *
   * @name detect
   * @static
   * @memberOf module:Collections
   * @method
   * @alias find
   * @category Collections
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A truth test to apply to each item in `coll`.
   * The iteratee is passed a `callback(err, truthValue)` which must be called
   * with a boolean argument once it has completed. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called as soon as any
   * iteratee returns `true`, or after all the `iteratee` functions have finished.
   * Result will be the first item in the array that passes the truth test
   * (iteratee) or the value `undefined` if none passed. Invoked with
   * (err, result).
   * @example
   *
   * async.detect(['file1','file2','file3'], function(filePath, callback) {
   *     fs.access(filePath, function(err) {
   *         callback(null, !err)
   *     });
   * }, function(err, result) {
   *     // result now equals the first file in the list that exists
   * });
   */
  var detect = _createTester(eachOf, identity, _findGetResult);

  /**
   * The same as [`detect`]{@link module:Collections.detect} but runs a maximum of `limit` async operations at a
   * time.
   *
   * @name detectLimit
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.detect]{@link module:Collections.detect}
   * @alias findLimit
   * @category Collections
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} iteratee - A truth test to apply to each item in `coll`.
   * The iteratee is passed a `callback(err, truthValue)` which must be called
   * with a boolean argument once it has completed. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called as soon as any
   * iteratee returns `true`, or after all the `iteratee` functions have finished.
   * Result will be the first item in the array that passes the truth test
   * (iteratee) or the value `undefined` if none passed. Invoked with
   * (err, result).
   */
  var detectLimit = _createTester(eachOfLimit, identity, _findGetResult);

  /**
   * The same as [`detect`]{@link module:Collections.detect} but runs only a single async operation at a time.
   *
   * @name detectSeries
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.detect]{@link module:Collections.detect}
   * @alias findSeries
   * @category Collections
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A truth test to apply to each item in `coll`.
   * The iteratee is passed a `callback(err, truthValue)` which must be called
   * with a boolean argument once it has completed. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called as soon as any
   * iteratee returns `true`, or after all the `iteratee` functions have finished.
   * Result will be the first item in the array that passes the truth test
   * (iteratee) or the value `undefined` if none passed. Invoked with
   * (err, result).
   */
  var detectSeries = _createTester(eachOfSeries, identity, _findGetResult);

  function consoleFunc(name) {
      return rest(function (fn, args) {
          fn.apply(null, args.concat([rest(function (err, args) {
              if (typeof console === 'object') {
                  if (err) {
                      if (console.error) {
                          console.error(err);
                      }
                  } else if (console[name]) {
                      arrayEach(args, function (x) {
                          console[name](x);
                      });
                  }
              }
          })]));
      });
  }

  /**
   * Logs the result of an `async` function to the `console` using `console.dir`
   * to display the properties of the resulting object. Only works in Node.js or
   * in browsers that support `console.dir` and `console.error` (such as FF and
   * Chrome). If multiple arguments are returned from the async function,
   * `console.dir` is called on each argument in order.
   *
   * @name dir
   * @static
   * @memberOf module:Utils
   * @method
   * @category Util
   * @param {Function} function - The function you want to eventually apply all
   * arguments to.
   * @param {...*} arguments... - Any number of arguments to apply to the function.
   * @example
   *
   * // in a module
   * var hello = function(name, callback) {
   *     setTimeout(function() {
   *         callback(null, {hello: name});
   *     }, 1000);
   * };
   *
   * // in the node repl
   * node> async.dir(hello, 'world');
   * {hello: 'world'}
   */
  var dir = consoleFunc('dir');

  /**
   * The post-check version of [`during`]{@link module:ControlFlow.during}. To reflect the difference in
   * the order of operations, the arguments `test` and `fn` are switched.
   *
   * Also a version of [`doWhilst`]{@link module:ControlFlow.doWhilst} with asynchronous `test` function.
   * @name doDuring
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.during]{@link module:ControlFlow.during}
   * @category Control Flow
   * @param {Function} fn - A function which is called each time `test` passes.
   * The function is passed a `callback(err)`, which must be called once it has
   * completed with an optional `err` argument. Invoked with (callback).
   * @param {Function} test - asynchronous truth test to perform before each
   * execution of `fn`. Invoked with (...args, callback), where `...args` are the
   * non-error args from the previous callback of `fn`.
   * @param {Function} [callback] - A callback which is called after the test
   * function has failed and repeated execution of `fn` has stopped. `callback`
   * will be passed an error if one occured, otherwise `null`.
   */
  function doDuring(fn, test, callback) {
      callback = onlyOnce(callback || noop);

      var next = rest(function (err, args) {
          if (err) return callback(err);
          args.push(check);
          test.apply(this, args);
      });

      function check(err, truth) {
          if (err) return callback(err);
          if (!truth) return callback(null);
          fn(next);
      }

      check(null, true);
  }

  /**
   * The post-check version of [`whilst`]{@link module:ControlFlow.whilst}. To reflect the difference in
   * the order of operations, the arguments `test` and `iteratee` are switched.
   *
   * `doWhilst` is to `whilst` as `do while` is to `while` in plain JavaScript.
   *
   * @name doWhilst
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.whilst]{@link module:ControlFlow.whilst}
   * @category Control Flow
   * @param {Function} iteratee - A function which is called each time `test`
   * passes. The function is passed a `callback(err)`, which must be called once
   * it has completed with an optional `err` argument. Invoked with (callback).
   * @param {Function} test - synchronous truth test to perform after each
   * execution of `iteratee`. Invoked with Invoked with the non-error callback
   * results of `iteratee`.
   * @param {Function} [callback] - A callback which is called after the test
   * function has failed and repeated execution of `iteratee` has stopped.
   * `callback` will be passed an error and any arguments passed to the final
   * `iteratee`'s callback. Invoked with (err, [results]);
   */
  function doWhilst(iteratee, test, callback) {
      callback = onlyOnce(callback || noop);
      var next = rest(function (err, args) {
          if (err) return callback(err);
          if (test.apply(this, args)) return iteratee(next);
          callback.apply(null, [null].concat(args));
      });
      iteratee(next);
  }

  /**
   * Like ['doWhilst']{@link module:ControlFlow.doWhilst}, except the `test` is inverted. Note the
   * argument ordering differs from `until`.
   *
   * @name doUntil
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.doWhilst]{@link module:ControlFlow.doWhilst}
   * @category Control Flow
   * @param {Function} fn - A function which is called each time `test` fails.
   * The function is passed a `callback(err)`, which must be called once it has
   * completed with an optional `err` argument. Invoked with (callback).
   * @param {Function} test - synchronous truth test to perform after each
   * execution of `fn`. Invoked with the non-error callback results of `fn`.
   * @param {Function} [callback] - A callback which is called after the test
   * function has passed and repeated execution of `fn` has stopped. `callback`
   * will be passed an error and any arguments passed to the final `fn`'s
   * callback. Invoked with (err, [results]);
   */
  function doUntil(fn, test, callback) {
      doWhilst(fn, function () {
          return !test.apply(this, arguments);
      }, callback);
  }

  /**
   * Like [`whilst`]{@link module:ControlFlow.whilst}, except the `test` is an asynchronous function that
   * is passed a callback in the form of `function (err, truth)`. If error is
   * passed to `test` or `fn`, the main callback is immediately called with the
   * value of the error.
   *
   * @name during
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.whilst]{@link module:ControlFlow.whilst}
   * @category Control Flow
   * @param {Function} test - asynchronous truth test to perform before each
   * execution of `fn`. Invoked with (callback).
   * @param {Function} fn - A function which is called each time `test` passes.
   * The function is passed a `callback(err)`, which must be called once it has
   * completed with an optional `err` argument. Invoked with (callback).
   * @param {Function} [callback] - A callback which is called after the test
   * function has failed and repeated execution of `fn` has stopped. `callback`
   * will be passed an error, if one occured, otherwise `null`.
   * @example
   *
   * var count = 0;
   *
   * async.during(
   *     function (callback) {
   *         return callback(null, count < 5);
   *     },
   *     function (callback) {
   *         count++;
   *         setTimeout(callback, 1000);
   *     },
   *     function (err) {
   *         // 5 seconds have passed
   *     }
   * );
   */
  function during(test, fn, callback) {
      callback = onlyOnce(callback || noop);

      function next(err) {
          if (err) return callback(err);
          test(check);
      }

      function check(err, truth) {
          if (err) return callback(err);
          if (!truth) return callback(null);
          fn(next);
      }

      test(check);
  }

  function _withoutIndex(iteratee) {
      return function (value, index, callback) {
          return iteratee(value, callback);
      };
  }

  /**
   * The same as [`each`]{@link module:Collections.each} but runs a maximum of `limit` async operations at a time.
   *
   * @name eachLimit
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.each]{@link module:Collections.each}
   * @alias forEachLimit
   * @category Collection
   * @param {Array|Iterable|Object} coll - A colleciton to iterate over.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} iteratee - A function to apply to each item in `coll`. The
   * iteratee is passed a `callback(err)` which must be called once it has
   * completed. If no error has occurred, the `callback` should be run without
   * arguments or with an explicit `null` argument. The array index is not passed
   * to the iteratee. Invoked with (item, callback). If you need the index, use
   * `eachOfLimit`.
   * @param {Function} [callback] - A callback which is called when all
   * `iteratee` functions have finished, or an error occurs. Invoked with (err).
   */
  function eachLimit(coll, limit, iteratee, callback) {
    _eachOfLimit(limit)(coll, _withoutIndex(iteratee), callback);
  }

  /**
   * Applies the function `iteratee` to each item in `coll`, in parallel.
   * The `iteratee` is called with an item from the list, and a callback for when
   * it has finished. If the `iteratee` passes an error to its `callback`, the
   * main `callback` (for the `each` function) is immediately called with the
   * error.
   *
   * Note, that since this function applies `iteratee` to each item in parallel,
   * there is no guarantee that the iteratee functions will complete in order.
   *
   * @name each
   * @static
   * @memberOf module:Collections
   * @method
   * @alias forEach
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each item
   * in `coll`. The iteratee is passed a `callback(err)` which must be called once
   * it has completed. If no error has occurred, the `callback` should be run
   * without arguments or with an explicit `null` argument. The array index is not
   * passed to the iteratee. Invoked with (item, callback). If you need the index,
   * use `eachOf`.
   * @param {Function} [callback] - A callback which is called when all
   * `iteratee` functions have finished, or an error occurs. Invoked with (err).
   * @example
   *
   * // assuming openFiles is an array of file names and saveFile is a function
   * // to save the modified contents of that file:
   *
   * async.each(openFiles, saveFile, function(err){
   *   // if any of the saves produced an error, err would equal that error
   * });
   *
   * // assuming openFiles is an array of file names
   * async.each(openFiles, function(file, callback) {
   *
   *     // Perform operation on file here.
   *     console.log('Processing file ' + file);
   *
   *     if( file.length > 32 ) {
   *       console.log('This file name is too long');
   *       callback('File name too long');
   *     } else {
   *       // Do work to process file here
   *       console.log('File processed');
   *       callback();
   *     }
   * }, function(err) {
   *     // if any of the file processing produced an error, err would equal that error
   *     if( err ) {
   *       // One of the iterations produced an error.
   *       // All processing will now stop.
   *       console.log('A file failed to process');
   *     } else {
   *       console.log('All files have been processed successfully');
   *     }
   * });
   */
  var each = doLimit(eachLimit, Infinity);

  /**
   * The same as [`each`]{@link module:Collections.each} but runs only a single async operation at a time.
   *
   * @name eachSeries
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.each]{@link module:Collections.each}
   * @alias forEachSeries
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each
   * item in `coll`. The iteratee is passed a `callback(err)` which must be called
   * once it has completed. If no error has occurred, the `callback` should be run
   * without arguments or with an explicit `null` argument. The array index is
   * not passed to the iteratee. Invoked with (item, callback). If you need the
   * index, use `eachOfSeries`.
   * @param {Function} [callback] - A callback which is called when all
   * `iteratee` functions have finished, or an error occurs. Invoked with (err).
   */
  var eachSeries = doLimit(eachLimit, 1);

  /**
   * Wrap an async function and ensure it calls its callback on a later tick of
   * the event loop.  If the function already calls its callback on a next tick,
   * no extra deferral is added. This is useful for preventing stack overflows
   * (`RangeError: Maximum call stack size exceeded`) and generally keeping
   * [Zalgo](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony)
   * contained.
   *
   * @name ensureAsync
   * @static
   * @memberOf module:Utils
   * @method
   * @category Util
   * @param {Function} fn - an async function, one that expects a node-style
   * callback as its last argument.
   * @returns {Function} Returns a wrapped function with the exact same call
   * signature as the function passed in.
   * @example
   *
   * function sometimesAsync(arg, callback) {
   *     if (cache[arg]) {
   *         return callback(null, cache[arg]); // this would be synchronous!!
   *     } else {
   *         doSomeIO(arg, callback); // this IO would be asynchronous
   *     }
   * }
   *
   * // this has a risk of stack overflows if many results are cached in a row
   * async.mapSeries(args, sometimesAsync, done);
   *
   * // this will defer sometimesAsync's callback if necessary,
   * // preventing stack overflows
   * async.mapSeries(args, async.ensureAsync(sometimesAsync), done);
   */
  function ensureAsync(fn) {
      return initialParams(function (args, callback) {
          var sync = true;
          args.push(function () {
              var innerArgs = arguments;
              if (sync) {
                  setImmediate$1(function () {
                      callback.apply(null, innerArgs);
                  });
              } else {
                  callback.apply(null, innerArgs);
              }
          });
          fn.apply(this, args);
          sync = false;
      });
  }

  function notId(v) {
      return !v;
  }

  /**
   * The same as [`every`]{@link module:Collections.every} but runs a maximum of `limit` async operations at a time.
   *
   * @name everyLimit
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.every]{@link module:Collections.every}
   * @alias allLimit
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} iteratee - A truth test to apply to each item in the
   * collection in parallel. The iteratee is passed a `callback(err, truthValue)`
   * which must be called with a  boolean argument once it has completed. Invoked
   * with (item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Result will be either `true` or `false`
   * depending on the values of the async tests. Invoked with (err, result).
   */
  var everyLimit = _createTester(eachOfLimit, notId, notId);

  /**
   * Returns `true` if every element in `coll` satisfies an async test. If any
   * iteratee call returns `false`, the main `callback` is immediately called.
   *
   * @name every
   * @static
   * @memberOf module:Collections
   * @method
   * @alias all
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A truth test to apply to each item in the
   * collection in parallel. The iteratee is passed a `callback(err, truthValue)`
   * which must be called with a  boolean argument once it has completed. Invoked
   * with (item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Result will be either `true` or `false`
   * depending on the values of the async tests. Invoked with (err, result).
   * @example
   *
   * async.every(['file1','file2','file3'], function(filePath, callback) {
   *     fs.access(filePath, function(err) {
   *         callback(null, !err)
   *     });
   * }, function(err, result) {
   *     // if result is true then every file exists
   * });
   */
  var every = doLimit(everyLimit, Infinity);

  /**
   * The same as [`every`]{@link module:Collections.every} but runs only a single async operation at a time.
   *
   * @name everySeries
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.every]{@link module:Collections.every}
   * @alias allSeries
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A truth test to apply to each item in the
   * collection in parallel. The iteratee is passed a `callback(err, truthValue)`
   * which must be called with a  boolean argument once it has completed. Invoked
   * with (item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Result will be either `true` or `false`
   * depending on the values of the async tests. Invoked with (err, result).
   */
  var everySeries = doLimit(everyLimit, 1);

  function _filter(eachfn, arr, iteratee, callback) {
      callback = once(callback || noop);
      var results = [];
      eachfn(arr, function (x, index, callback) {
          iteratee(x, function (err, v) {
              if (err) {
                  callback(err);
              } else {
                  if (v) {
                      results.push({ index: index, value: x });
                  }
                  callback();
              }
          });
      }, function (err) {
          if (err) {
              callback(err);
          } else {
              callback(null, arrayMap(results.sort(function (a, b) {
                  return a.index - b.index;
              }), baseProperty('value')));
          }
      });
  }

  /**
   * The same as [`filter`]{@link module:Collections.filter} but runs a maximum of `limit` async operations at a
   * time.
   *
   * @name filterLimit
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.filter]{@link module:Collections.filter}
   * @alias selectLimit
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} iteratee - A truth test to apply to each item in `coll`.
   * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
   * with a boolean argument once it has completed. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Invoked with (err, results).
   */
  var filterLimit = doParallelLimit(_filter);

  /**
   * Returns a new array of all the values in `coll` which pass an async truth
   * test. This operation is performed in parallel, but the results array will be
   * in the same order as the original.
   *
   * @name filter
   * @static
   * @memberOf module:Collections
   * @method
   * @alias select
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A truth test to apply to each item in `coll`.
   * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
   * with a boolean argument once it has completed. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Invoked with (err, results).
   * @example
   *
   * async.filter(['file1','file2','file3'], function(filePath, callback) {
   *     fs.access(filePath, function(err) {
   *         callback(null, !err)
   *     });
   * }, function(err, results) {
   *     // results now equals an array of the existing files
   * });
   */
  var filter = doLimit(filterLimit, Infinity);

  /**
   * The same as [`filter`]{@link module:Collections.filter} but runs only a single async operation at a time.
   *
   * @name filterSeries
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.filter]{@link module:Collections.filter}
   * @alias selectSeries
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A truth test to apply to each item in `coll`.
   * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
   * with a boolean argument once it has completed. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Invoked with (err, results)
   */
  var filterSeries = doLimit(filterLimit, 1);

  /**
   * Calls the asynchronous function `fn` with a callback parameter that allows it
   * to call itself again, in series, indefinitely.

   * If an error is passed to the
   * callback then `errback` is called with the error, and execution stops,
   * otherwise it will never be called.
   *
   * @name forever
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {Function} fn - a function to call repeatedly. Invoked with (next).
   * @param {Function} [errback] - when `fn` passes an error to it's callback,
   * this function will be called, and execution stops. Invoked with (err).
   * @example
   *
   * async.forever(
   *     function(next) {
   *         // next is suitable for passing to things that need a callback(err [, whatever]);
   *         // it will result in this function being called again.
   *     },
   *     function(err) {
   *         // if next is called with a value in its first parameter, it will appear
   *         // in here as 'err', and execution will stop.
   *     }
   * );
   */
  function forever(fn, errback) {
      var done = onlyOnce(errback || noop);
      var task = ensureAsync(fn);

      function next(err) {
          if (err) return done(err);
          task(next);
      }
      next();
  }

  /**
   * Logs the result of an `async` function to the `console`. Only works in
   * Node.js or in browsers that support `console.log` and `console.error` (such
   * as FF and Chrome). If multiple arguments are returned from the async
   * function, `console.log` is called on each argument in order.
   *
   * @name log
   * @static
   * @memberOf module:Utils
   * @method
   * @category Util
   * @param {Function} function - The function you want to eventually apply all
   * arguments to.
   * @param {...*} arguments... - Any number of arguments to apply to the function.
   * @example
   *
   * // in a module
   * var hello = function(name, callback) {
   *     setTimeout(function() {
   *         callback(null, 'hello ' + name);
   *     }, 1000);
   * };
   *
   * // in the node repl
   * node> async.log(hello, 'world');
   * 'hello world'
   */
  var log = consoleFunc('log');

  /**
   * The same as [`mapValues`]{@link module:Collections.mapValues} but runs a maximum of `limit` async operations at a
   * time.
   *
   * @name mapValuesLimit
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.mapValues]{@link module:Collections.mapValues}
   * @category Collection
   * @param {Object} obj - A collection to iterate over.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} iteratee - A function to apply to each value in `obj`.
   * The iteratee is passed a `callback(err, transformed)` which must be called
   * once it has completed with an error (which can be `null`) and a
   * transformed value. Invoked with (value, key, callback).
   * @param {Function} [callback] - A callback which is called when all `iteratee`
   * functions have finished, or an error occurs. Result is an object of the
   * transformed values from the `obj`. Invoked with (err, result).
   */
  function mapValuesLimit(obj, limit, iteratee, callback) {
      callback = once(callback || noop);
      var newObj = {};
      eachOfLimit(obj, limit, function (val, key, next) {
          iteratee(val, key, function (err, result) {
              if (err) return next(err);
              newObj[key] = result;
              next();
          });
      }, function (err) {
          callback(err, newObj);
      });
  }

  /**
   * A relative of [`map`]{@link module:Collections.map}, designed for use with objects.
   *
   * Produces a new Object by mapping each value of `obj` through the `iteratee`
   * function. The `iteratee` is called each `value` and `key` from `obj` and a
   * callback for when it has finished processing. Each of these callbacks takes
   * two arguments: an `error`, and the transformed item from `obj`. If `iteratee`
   * passes an error to its callback, the main `callback` (for the `mapValues`
   * function) is immediately called with the error.
   *
   * Note, the order of the keys in the result is not guaranteed.  The keys will
   * be roughly in the order they complete, (but this is very engine-specific)
   *
   * @name mapValues
   * @static
   * @memberOf module:Collections
   * @method
   * @category Collection
   * @param {Object} obj - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each value and key in
   * `coll`. The iteratee is passed a `callback(err, transformed)` which must be
   * called once it has completed with an error (which can be `null`) and a
   * transformed value. Invoked with (value, key, callback).
   * @param {Function} [callback] - A callback which is called when all `iteratee`
   * functions have finished, or an error occurs. Results is an array of the
   * transformed items from the `obj`. Invoked with (err, result).
   * @example
   *
   * async.mapValues({
   *     f1: 'file1',
   *     f2: 'file2',
   *     f3: 'file3'
   * }, function (file, key, callback) {
   *   fs.stat(file, callback);
   * }, function(err, result) {
   *     // results is now a map of stats for each file, e.g.
   *     // {
   *     //     f1: [stats for file1],
   *     //     f2: [stats for file2],
   *     //     f3: [stats for file3]
   *     // }
   * });
   */

  var mapValues = doLimit(mapValuesLimit, Infinity);

  /**
   * The same as [`mapValues`]{@link module:Collections.mapValues} but runs only a single async operation at a time.
   *
   * @name mapValuesSeries
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.mapValues]{@link module:Collections.mapValues}
   * @category Collection
   * @param {Object} obj - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each value in `obj`.
   * The iteratee is passed a `callback(err, transformed)` which must be called
   * once it has completed with an error (which can be `null`) and a
   * transformed value. Invoked with (value, key, callback).
   * @param {Function} [callback] - A callback which is called when all `iteratee`
   * functions have finished, or an error occurs. Result is an object of the
   * transformed values from the `obj`. Invoked with (err, result).
   */
  var mapValuesSeries = doLimit(mapValuesLimit, 1);

  function has(obj, key) {
      return key in obj;
  }

  /**
   * Caches the results of an `async` function. When creating a hash to store
   * function results against, the callback is omitted from the hash and an
   * optional hash function can be used.
   *
   * If no hash function is specified, the first argument is used as a hash key,
   * which may work reasonably if it is a string or a data type that converts to a
   * distinct string. Note that objects and arrays will not behave reasonably.
   * Neither will cases where the other arguments are significant. In such cases,
   * specify your own hash function.
   *
   * The cache of results is exposed as the `memo` property of the function
   * returned by `memoize`.
   *
   * @name memoize
   * @static
   * @memberOf module:Utils
   * @method
   * @category Util
   * @param {Function} fn - The function to proxy and cache results from.
   * @param {Function} hasher - An optional function for generating a custom hash
   * for storing results. It has all the arguments applied to it apart from the
   * callback, and must be synchronous.
   * @returns {Function} a memoized version of `fn`
   * @example
   *
   * var slow_fn = function(name, callback) {
   *     // do something
   *     callback(null, result);
   * };
   * var fn = async.memoize(slow_fn);
   *
   * // fn can now be used as if it were slow_fn
   * fn('some name', function() {
   *     // callback
   * });
   */
  function memoize(fn, hasher) {
      var memo = Object.create(null);
      var queues = Object.create(null);
      hasher = hasher || identity;
      var memoized = initialParams(function memoized(args, callback) {
          var key = hasher.apply(null, args);
          if (has(memo, key)) {
              setImmediate$1(function () {
                  callback.apply(null, memo[key]);
              });
          } else if (has(queues, key)) {
              queues[key].push(callback);
          } else {
              queues[key] = [callback];
              fn.apply(null, args.concat([rest(function (args) {
                  memo[key] = args;
                  var q = queues[key];
                  delete queues[key];
                  for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, args);
                  }
              })]));
          }
      });
      memoized.memo = memo;
      memoized.unmemoized = fn;
      return memoized;
  }

  /**
   * Calls `callback` on a later loop around the event loop. In Node.js this just
   * calls `setImmediate`.  In the browser it will use `setImmediate` if
   * available, otherwise `setTimeout(callback, 0)`, which means other higher
   * priority events may precede the execution of `callback`.
   *
   * This is used internally for browser-compatibility purposes.
   *
   * @name nextTick
   * @static
   * @memberOf module:Utils
   * @method
   * @alias setImmediate
   * @category Util
   * @param {Function} callback - The function to call on a later loop around
   * the event loop. Invoked with (args...).
   * @param {...*} args... - any number of additional arguments to pass to the
   * callback on the next tick.
   * @example
   *
   * var call_order = [];
   * async.nextTick(function() {
   *     call_order.push('two');
   *     // call_order now equals ['one','two']
   * });
   * call_order.push('one');
   *
   * async.setImmediate(function (a, b, c) {
   *     // a, b, and c equal 1, 2, and 3
   * }, 1, 2, 3);
   */
  var _defer$1;

  if (hasNextTick) {
      _defer$1 = process.nextTick;
  } else if (hasSetImmediate) {
      _defer$1 = setImmediate;
  } else {
      _defer$1 = fallback;
  }

  var nextTick = wrap(_defer$1);

  function _parallel(eachfn, tasks, callback) {
      callback = callback || noop;
      var results = isArrayLike(tasks) ? [] : {};

      eachfn(tasks, function (task, key, callback) {
          task(rest(function (err, args) {
              if (args.length <= 1) {
                  args = args[0];
              }
              results[key] = args;
              callback(err);
          }));
      }, function (err) {
          callback(err, results);
      });
  }

  /**
   * The same as [`parallel`]{@link module:ControlFlow.parallel} but runs a maximum of `limit` async operations at a
   * time.
   *
   * @name parallelLimit
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.parallel]{@link module:ControlFlow.parallel}
   * @category Control Flow
   * @param {Array|Collection} tasks - A collection containing functions to run.
   * Each function is passed a `callback(err, result)` which it must call on
   * completion with an error `err` (which can be `null`) and an optional `result`
   * value.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} [callback] - An optional callback to run once all the
   * functions have completed successfully. This function gets a results array
   * (or object) containing all the result arguments passed to the task callbacks.
   * Invoked with (err, results).
   */
  function parallelLimit(tasks, limit, callback) {
    _parallel(_eachOfLimit(limit), tasks, callback);
  }

  /**
   * Run the `tasks` collection of functions in parallel, without waiting until
   * the previous function has completed. If any of the functions pass an error to
   * its callback, the main `callback` is immediately called with the value of the
   * error. Once the `tasks` have completed, the results are passed to the final
   * `callback` as an array.
   *
   * **Note:** `parallel` is about kicking-off I/O tasks in parallel, not about
   * parallel execution of code.  If your tasks do not use any timers or perform
   * any I/O, they will actually be executed in series.  Any synchronous setup
   * sections for each task will happen one after the other.  JavaScript remains
   * single-threaded.
   *
   * It is also possible to use an object instead of an array. Each property will
   * be run as a function and the results will be passed to the final `callback`
   * as an object instead of an array. This can be a more readable way of handling
   * results from {@link async.parallel}.
   *
   * @name parallel
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {Array|Iterable|Object} tasks - A collection containing functions to run.
   * Each function is passed a `callback(err, result)` which it must call on
   * completion with an error `err` (which can be `null`) and an optional `result`
   * value.
   * @param {Function} [callback] - An optional callback to run once all the
   * functions have completed successfully. This function gets a results array
   * (or object) containing all the result arguments passed to the task callbacks.
   * Invoked with (err, results).
   * @example
   * async.parallel([
   *     function(callback) {
   *         setTimeout(function() {
   *             callback(null, 'one');
   *         }, 200);
   *     },
   *     function(callback) {
   *         setTimeout(function() {
   *             callback(null, 'two');
   *         }, 100);
   *     }
   * ],
   * // optional callback
   * function(err, results) {
   *     // the results array will equal ['one','two'] even though
   *     // the second function had a shorter timeout.
   * });
   *
   * // an example using an object instead of an array
   * async.parallel({
   *     one: function(callback) {
   *         setTimeout(function() {
   *             callback(null, 1);
   *         }, 200);
   *     },
   *     two: function(callback) {
   *         setTimeout(function() {
   *             callback(null, 2);
   *         }, 100);
   *     }
   * }, function(err, results) {
   *     // results is now equals to: {one: 1, two: 2}
   * });
   */
  var parallel = doLimit(parallelLimit, Infinity);

  /**
   * A queue of tasks for the worker function to complete.
   * @typedef {Object} QueueObject
   * @memberOf module:ControlFlow
   * @property {Function} length - a function returning the number of items
   * waiting to be processed. Invoke with `queue.length()`.
   * @property {Function} started - a function returning whether or not any
   * items have been pushed and processed by the queue. Invoke with `queue.started()`.
   * @property {Function} running - a function returning the number of items
   * currently being processed. Invoke with `queue.running()`.
   * @property {Function} workersList - a function returning the array of items
   * currently being processed. Invoke with `queue.workersList()`.
   * @property {Function} idle - a function returning false if there are items
   * waiting or being processed, or true if not. Invoke with `queue.idle()`.
   * @property {number} concurrency - an integer for determining how many `worker`
   * functions should be run in parallel. This property can be changed after a
   * `queue` is created to alter the concurrency on-the-fly.
   * @property {Function} push - add a new task to the `queue`. Calls `callback`
   * once the `worker` has finished processing the task. Instead of a single task,
   * a `tasks` array can be submitted. The respective callback is used for every
   * task in the list. Invoke with `queue.push(task, [callback])`,
   * @property {Function} unshift - add a new task to the front of the `queue`.
   * Invoke with `queue.unshift(task, [callback])`.
   * @property {Function} saturated - a callback that is called when the number of
   * running workers hits the `concurrency` limit, and further tasks will be
   * queued.
   * @property {Function} unsaturated - a callback that is called when the number
   * of running workers is less than the `concurrency` & `buffer` limits, and
   * further tasks will not be queued.
   * @property {number} buffer - A minimum threshold buffer in order to say that
   * the `queue` is `unsaturated`.
   * @property {Function} empty - a callback that is called when the last item
   * from the `queue` is given to a `worker`.
   * @property {Function} drain - a callback that is called when the last item
   * from the `queue` has returned from the `worker`.
   * @property {Function} error - a callback that is called when a task errors.
   * Has the signature `function(error, task)`.
   * @property {boolean} paused - a boolean for determining whether the queue is
   * in a paused state.
   * @property {Function} pause - a function that pauses the processing of tasks
   * until `resume()` is called. Invoke with `queue.pause()`.
   * @property {Function} resume - a function that resumes the processing of
   * queued tasks when the queue is paused. Invoke with `queue.resume()`.
   * @property {Function} kill - a function that removes the `drain` callback and
   * empties remaining tasks from the queue forcing it to go idle. Invoke with `queue.kill()`.
   */

  /**
   * Creates a `queue` object with the specified `concurrency`. Tasks added to the
   * `queue` are processed in parallel (up to the `concurrency` limit). If all
   * `worker`s are in progress, the task is queued until one becomes available.
   * Once a `worker` completes a `task`, that `task`'s callback is called.
   *
   * @name queue
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {Function} worker - An asynchronous function for processing a queued
   * task, which must call its `callback(err)` argument when finished, with an
   * optional `error` as an argument.  If you want to handle errors from an
   * individual task, pass a callback to `q.push()`. Invoked with
   * (task, callback).
   * @param {number} [concurrency=1] - An `integer` for determining how many
   * `worker` functions should be run in parallel.  If omitted, the concurrency
   * defaults to `1`.  If the concurrency is `0`, an error is thrown.
   * @returns {module:ControlFlow.QueueObject} A queue object to manage the tasks. Callbacks can
   * attached as certain properties to listen for specific events during the
   * lifecycle of the queue.
   * @example
   *
   * // create a queue object with concurrency 2
   * var q = async.queue(function(task, callback) {
   *     console.log('hello ' + task.name);
   *     callback();
   * }, 2);
   *
   * // assign a callback
   * q.drain = function() {
   *     console.log('all items have been processed');
   * };
   *
   * // add some items to the queue
   * q.push({name: 'foo'}, function(err) {
   *     console.log('finished processing foo');
   * });
   * q.push({name: 'bar'}, function (err) {
   *     console.log('finished processing bar');
   * });
   *
   * // add some items to the queue (batch-wise)
   * q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
   *     console.log('finished processing item');
   * });
   *
   * // add some items to the front of the queue
   * q.unshift({name: 'bar'}, function (err) {
   *     console.log('finished processing bar');
   * });
   */
  function queue$1 (worker, concurrency) {
    return queue(function (items, cb) {
      worker(items[0], cb);
    }, concurrency, 1);
  }

  /**
   * The same as [async.queue]{@link module:ControlFlow.queue} only tasks are assigned a priority and
   * completed in ascending priority order.
   *
   * @name priorityQueue
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.queue]{@link module:ControlFlow.queue}
   * @category Control Flow
   * @param {Function} worker - An asynchronous function for processing a queued
   * task, which must call its `callback(err)` argument when finished, with an
   * optional `error` as an argument.  If you want to handle errors from an
   * individual task, pass a callback to `q.push()`. Invoked with
   * (task, callback).
   * @param {number} concurrency - An `integer` for determining how many `worker`
   * functions should be run in parallel.  If omitted, the concurrency defaults to
   * `1`.  If the concurrency is `0`, an error is thrown.
   * @returns {module:ControlFlow.QueueObject} A priorityQueue object to manage the tasks. There are two
   * differences between `queue` and `priorityQueue` objects:
   * * `push(task, priority, [callback])` - `priority` should be a number. If an
   *   array of `tasks` is given, all tasks will be assigned the same priority.
   * * The `unshift` method was removed.
   */
  function priorityQueue (worker, concurrency) {
      // Start with a normal queue
      var q = queue$1(worker, concurrency);

      // Override push to accept second parameter representing priority
      q.push = function (data, priority, callback) {
          if (callback == null) callback = noop;
          if (typeof callback !== 'function') {
              throw new Error('task callback must be a function');
          }
          q.started = true;
          if (!isArray(data)) {
              data = [data];
          }
          if (data.length === 0) {
              // call drain immediately if there are no tasks
              return setImmediate$1(function () {
                  q.drain();
              });
          }

          priority = priority || 0;
          var nextNode = q._tasks.head;
          while (nextNode && priority >= nextNode.priority) {
              nextNode = nextNode.next;
          }

          arrayEach(data, function (task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: callback
              };

              if (nextNode) {
                  q._tasks.insertBefore(nextNode, item);
              } else {
                  q._tasks.push(item);
              }
          });
          setImmediate$1(q.process);
      };

      // Remove unshift function
      delete q.unshift;

      return q;
  }

  /**
   * Runs the `tasks` array of functions in parallel, without waiting until the
   * previous function has completed. Once any the `tasks` completed or pass an
   * error to its callback, the main `callback` is immediately called. It's
   * equivalent to `Promise.race()`.
   *
   * @name race
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {Array} tasks - An array containing functions to run. Each function
   * is passed a `callback(err, result)` which it must call on completion with an
   * error `err` (which can be `null`) and an optional `result` value.
   * @param {Function} callback - A callback to run once any of the functions have
   * completed. This function gets an error or result from the first function that
   * completed. Invoked with (err, result).
   * @returns undefined
   * @example
   *
   * async.race([
   *     function(callback) {
   *         setTimeout(function() {
   *             callback(null, 'one');
   *         }, 200);
   *     },
   *     function(callback) {
   *         setTimeout(function() {
   *             callback(null, 'two');
   *         }, 100);
   *     }
   * ],
   * // main callback
   * function(err, result) {
   *     // the result will be equal to 'two' as it finishes earlier
   * });
   */
  function race(tasks, callback) {
      callback = once(callback || noop);
      if (!isArray(tasks)) return callback(new TypeError('First argument to race must be an array of functions'));
      if (!tasks.length) return callback();
      arrayEach(tasks, function (task) {
          task(callback);
      });
  }

  var slice = Array.prototype.slice;

  /**
   * Same as [`reduce`]{@link module:Collections.reduce}, only operates on `array` in reverse order.
   *
   * @name reduceRight
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.reduce]{@link module:Collections.reduce}
   * @alias foldr
   * @category Collection
   * @param {Array} array - A collection to iterate over.
   * @param {*} memo - The initial state of the reduction.
   * @param {Function} iteratee - A function applied to each item in the
   * array to produce the next step in the reduction. The `iteratee` is passed a
   * `callback(err, reduction)` which accepts an optional error as its first
   * argument, and the state of the reduction as the second. If an error is
   * passed to the callback, the reduction is stopped and the main `callback` is
   * immediately called with the error. Invoked with (memo, item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Result is the reduced value. Invoked with
   * (err, result).
   */
  function reduceRight(array, memo, iteratee, callback) {
    var reversed = slice.call(array).reverse();
    reduce(reversed, memo, iteratee, callback);
  }

  /**
   * Wraps the function in another function that always returns data even when it
   * errors.
   *
   * The object returned has either the property `error` or `value`.
   *
   * @name reflect
   * @static
   * @memberOf module:Utils
   * @method
   * @category Util
   * @param {Function} fn - The function you want to wrap
   * @returns {Function} - A function that always passes null to it's callback as
   * the error. The second argument to the callback will be an `object` with
   * either an `error` or a `value` property.
   * @example
   *
   * async.parallel([
   *     async.reflect(function(callback) {
   *         // do some stuff ...
   *         callback(null, 'one');
   *     }),
   *     async.reflect(function(callback) {
   *         // do some more stuff but error ...
   *         callback('bad stuff happened');
   *     }),
   *     async.reflect(function(callback) {
   *         // do some more stuff ...
   *         callback(null, 'two');
   *     })
   * ],
   * // optional callback
   * function(err, results) {
   *     // values
   *     // results[0].value = 'one'
   *     // results[1].error = 'bad stuff happened'
   *     // results[2].value = 'two'
   * });
   */
  function reflect(fn) {
      return initialParams(function reflectOn(args, reflectCallback) {
          args.push(rest(function callback(err, cbArgs) {
              if (err) {
                  reflectCallback(null, {
                      error: err
                  });
              } else {
                  var value = null;
                  if (cbArgs.length === 1) {
                      value = cbArgs[0];
                  } else if (cbArgs.length > 1) {
                      value = cbArgs;
                  }
                  reflectCallback(null, {
                      value: value
                  });
              }
          }));

          return fn.apply(this, args);
      });
  }

  function reject$1(eachfn, arr, iteratee, callback) {
      _filter(eachfn, arr, function (value, cb) {
          iteratee(value, function (err, v) {
              if (err) {
                  cb(err);
              } else {
                  cb(null, !v);
              }
          });
      }, callback);
  }

  /**
   * The same as [`reject`]{@link module:Collections.reject} but runs a maximum of `limit` async operations at a
   * time.
   *
   * @name rejectLimit
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.reject]{@link module:Collections.reject}
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} iteratee - A truth test to apply to each item in `coll`.
   * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
   * with a boolean argument once it has completed. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Invoked with (err, results).
   */
  var rejectLimit = doParallelLimit(reject$1);

  /**
   * The opposite of [`filter`]{@link module:Collections.filter}. Removes values that pass an `async` truth test.
   *
   * @name reject
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.filter]{@link module:Collections.filter}
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A truth test to apply to each item in `coll`.
   * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
   * with a boolean argument once it has completed. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Invoked with (err, results).
   * @example
   *
   * async.reject(['file1','file2','file3'], function(filePath, callback) {
   *     fs.access(filePath, function(err) {
   *         callback(null, !err)
   *     });
   * }, function(err, results) {
   *     // results now equals an array of missing files
   *     createFiles(results);
   * });
   */
  var reject = doLimit(rejectLimit, Infinity);

  /**
   * A helper function that wraps an array or an object of functions with reflect.
   *
   * @name reflectAll
   * @static
   * @memberOf module:Utils
   * @method
   * @see [async.reflect]{@link module:Utils.reflect}
   * @category Util
   * @param {Array} tasks - The array of functions to wrap in `async.reflect`.
   * @returns {Array} Returns an array of functions, each function wrapped in
   * `async.reflect`
   * @example
   *
   * let tasks = [
   *     function(callback) {
   *         setTimeout(function() {
   *             callback(null, 'one');
   *         }, 200);
   *     },
   *     function(callback) {
   *         // do some more stuff but error ...
   *         callback(new Error('bad stuff happened'));
   *     },
   *     function(callback) {
   *         setTimeout(function() {
   *             callback(null, 'two');
   *         }, 100);
   *     }
   * ];
   *
   * async.parallel(async.reflectAll(tasks),
   * // optional callback
   * function(err, results) {
   *     // values
   *     // results[0].value = 'one'
   *     // results[1].error = Error('bad stuff happened')
   *     // results[2].value = 'two'
   * });
   *
   * // an example using an object instead of an array
   * let tasks = {
   *     one: function(callback) {
   *         setTimeout(function() {
   *             callback(null, 'one');
   *         }, 200);
   *     },
   *     two: function(callback) {
   *         callback('two');
   *     },
   *     three: function(callback) {
   *         setTimeout(function() {
   *             callback(null, 'three');
   *         }, 100);
   *     }
   * };
   *
   * async.parallel(async.reflectAll(tasks),
   * // optional callback
   * function(err, results) {
   *     // values
   *     // results.one.value = 'one'
   *     // results.two.error = 'two'
   *     // results.three.value = 'three'
   * });
   */
  function reflectAll(tasks) {
      var results;
      if (isArray(tasks)) {
          results = arrayMap(tasks, reflect);
      } else {
          results = {};
          baseForOwn(tasks, function (task, key) {
              results[key] = reflect.call(this, task);
          });
      }
      return results;
  }

  /**
   * The same as [`reject`]{@link module:Collections.reject} but runs only a single async operation at a time.
   *
   * @name rejectSeries
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.reject]{@link module:Collections.reject}
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A truth test to apply to each item in `coll`.
   * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
   * with a boolean argument once it has completed. Invoked with (item, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Invoked with (err, results).
   */
  var rejectSeries = doLimit(rejectLimit, 1);

  /**
   * Creates a function that returns `value`.
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Util
   * @param {*} value The value to return from the new function.
   * @returns {Function} Returns the new constant function.
   * @example
   *
   * var objects = _.times(2, _.constant({ 'a': 1 }));
   *
   * console.log(objects);
   * // => [{ 'a': 1 }, { 'a': 1 }]
   *
   * console.log(objects[0] === objects[1]);
   * // => true
   */
  function constant$1(value) {
    return function() {
      return value;
    };
  }

  /**
   * Attempts to get a successful response from `task` no more than `times` times
   * before returning an error. If the task is successful, the `callback` will be
   * passed the result of the successful task. If all attempts fail, the callback
   * will be passed the error and result (if any) of the final attempt.
   *
   * @name retry
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - Can be either an
   * object with `times` and `interval` or a number.
   * * `times` - The number of attempts to make before giving up.  The default
   *   is `5`.
   * * `interval` - The time to wait between retries, in milliseconds.  The
   *   default is `0`. The interval may also be specified as a function of the
   *   retry count (see example).
   * * If `opts` is a number, the number specifies the number of times to retry,
   *   with the default interval of `0`.
   * @param {Function} task - A function which receives two arguments: (1) a
   * `callback(err, result)` which must be called when finished, passing `err`
   * (which can be `null`) and the `result` of the function's execution, and (2)
   * a `results` object, containing the results of the previously executed
   * functions (if nested inside another control flow). Invoked with
   * (callback, results).
   * @param {Function} [callback] - An optional callback which is called when the
   * task has succeeded, or after the final failed attempt. It receives the `err`
   * and `result` arguments of the last attempt at completing the `task`. Invoked
   * with (err, results).
   * @example
   *
   * // The `retry` function can be used as a stand-alone control flow by passing
   * // a callback, as shown below:
   *
   * // try calling apiMethod 3 times
   * async.retry(3, apiMethod, function(err, result) {
   *     // do something with the result
   * });
   *
   * // try calling apiMethod 3 times, waiting 200 ms between each retry
   * async.retry({times: 3, interval: 200}, apiMethod, function(err, result) {
   *     // do something with the result
   * });
   *
   * // try calling apiMethod 10 times with exponential backoff
   * // (i.e. intervals of 100, 200, 400, 800, 1600, ... milliseconds)
   * async.retry({
   *   times: 10,
   *   interval: function(retryCount) {
   *     return 50 * Math.pow(2, retryCount);
   *   }
   * }, apiMethod, function(err, result) {
   *     // do something with the result
   * });
   *
   * // try calling apiMethod the default 5 times no delay between each retry
   * async.retry(apiMethod, function(err, result) {
   *     // do something with the result
   * });
   *
   * // It can also be embedded within other control flow functions to retry
   * // individual methods that are not as reliable, like this:
   * async.auto({
   *     users: api.getUsers.bind(api),
   *     payments: async.retry(3, api.getPayments.bind(api))
   * }, function(err, results) {
   *     // do something with the results
   * });
   */
  function retry(opts, task, callback) {
      var DEFAULT_TIMES = 5;
      var DEFAULT_INTERVAL = 0;

      var options = {
          times: DEFAULT_TIMES,
          intervalFunc: constant$1(DEFAULT_INTERVAL)
      };

      function parseTimes(acc, t) {
          if (typeof t === 'object') {
              acc.times = +t.times || DEFAULT_TIMES;

              acc.intervalFunc = typeof t.interval === 'function' ? t.interval : constant$1(+t.interval || DEFAULT_INTERVAL);
          } else if (typeof t === 'number' || typeof t === 'string') {
              acc.times = +t || DEFAULT_TIMES;
          } else {
              throw new Error("Invalid arguments for async.retry");
          }
      }

      if (arguments.length < 3 && typeof opts === 'function') {
          callback = task || noop;
          task = opts;
      } else {
          parseTimes(options, opts);
          callback = callback || noop;
      }

      if (typeof task !== 'function') {
          throw new Error("Invalid arguments for async.retry");
      }

      var attempt = 1;
      function retryAttempt() {
          task(function (err) {
              if (err && attempt++ < options.times) {
                  setTimeout(retryAttempt, options.intervalFunc(attempt));
              } else {
                  callback.apply(null, arguments);
              }
          });
      }

      retryAttempt();
  }

  /**
   * A close relative of [`retry`]{@link module:ControlFlow.retry}.  This method wraps a task and makes it
   * retryable, rather than immediately calling it with retries.
   *
   * @name retryable
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.retry]{@link module:ControlFlow.retry}
   * @category Control Flow
   * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - optional
   * options, exactly the same as from `retry`
   * @param {Function} task - the asynchronous function to wrap
   * @returns {Functions} The wrapped function, which when invoked, will retry on
   * an error, based on the parameters specified in `opts`.
   * @example
   *
   * async.auto({
   *     dep1: async.retryable(3, getFromFlakyService),
   *     process: ["dep1", async.retryable(3, function (results, cb) {
   *         maybeProcessData(results.dep1, cb);
   *     })]
   * }, callback);
   */
  function retryable (opts, task) {
      if (!task) {
          task = opts;
          opts = null;
      }
      return initialParams(function (args, callback) {
          function taskFn(cb) {
              task.apply(null, args.concat([cb]));
          }

          if (opts) retry(opts, taskFn, callback);else retry(taskFn, callback);
      });
  }

  /**
   * Run the functions in the `tasks` collection in series, each one running once
   * the previous function has completed. If any functions in the series pass an
   * error to its callback, no more functions are run, and `callback` is
   * immediately called with the value of the error. Otherwise, `callback`
   * receives an array of results when `tasks` have completed.
   *
   * It is also possible to use an object instead of an array. Each property will
   * be run as a function, and the results will be passed to the final `callback`
   * as an object instead of an array. This can be a more readable way of handling
   *  results from {@link async.series}.
   *
   * **Note** that while many implementations preserve the order of object
   * properties, the [ECMAScript Language Specification](http://www.ecma-international.org/ecma-262/5.1/#sec-8.6)
   * explicitly states that
   *
   * > The mechanics and order of enumerating the properties is not specified.
   *
   * So if you rely on the order in which your series of functions are executed,
   * and want this to work on all platforms, consider using an array.
   *
   * @name series
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {Array|Iterable|Object} tasks - A collection containing functions to run, each
   * function is passed a `callback(err, result)` it must call on completion with
   * an error `err` (which can be `null`) and an optional `result` value.
   * @param {Function} [callback] - An optional callback to run once all the
   * functions have completed. This function gets a results array (or object)
   * containing all the result arguments passed to the `task` callbacks. Invoked
   * with (err, result).
   * @example
   * async.series([
   *     function(callback) {
   *         // do some stuff ...
   *         callback(null, 'one');
   *     },
   *     function(callback) {
   *         // do some more stuff ...
   *         callback(null, 'two');
   *     }
   * ],
   * // optional callback
   * function(err, results) {
   *     // results is now equal to ['one', 'two']
   * });
   *
   * async.series({
   *     one: function(callback) {
   *         setTimeout(function() {
   *             callback(null, 1);
   *         }, 200);
   *     },
   *     two: function(callback){
   *         setTimeout(function() {
   *             callback(null, 2);
   *         }, 100);
   *     }
   * }, function(err, results) {
   *     // results is now equal to: {one: 1, two: 2}
   * });
   */
  function series(tasks, callback) {
    _parallel(eachOfSeries, tasks, callback);
  }

  /**
   * The same as [`some`]{@link module:Collections.some} but runs a maximum of `limit` async operations at a time.
   *
   * @name someLimit
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.some]{@link module:Collections.some}
   * @alias anyLimit
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} iteratee - A truth test to apply to each item in the array
   * in parallel. The iteratee is passed a `callback(err, truthValue)` which must
   * be called with a boolean argument once it has completed. Invoked with
   * (item, callback).
   * @param {Function} [callback] - A callback which is called as soon as any
   * iteratee returns `true`, or after all the iteratee functions have finished.
   * Result will be either `true` or `false` depending on the values of the async
   * tests. Invoked with (err, result).
   */
  var someLimit = _createTester(eachOfLimit, Boolean, identity);

  /**
   * Returns `true` if at least one element in the `coll` satisfies an async test.
   * If any iteratee call returns `true`, the main `callback` is immediately
   * called.
   *
   * @name some
   * @static
   * @memberOf module:Collections
   * @method
   * @alias any
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A truth test to apply to each item in the array
   * in parallel. The iteratee is passed a `callback(err, truthValue)` which must
   * be called with a boolean argument once it has completed. Invoked with
   * (item, callback).
   * @param {Function} [callback] - A callback which is called as soon as any
   * iteratee returns `true`, or after all the iteratee functions have finished.
   * Result will be either `true` or `false` depending on the values of the async
   * tests. Invoked with (err, result).
   * @example
   *
   * async.some(['file1','file2','file3'], function(filePath, callback) {
   *     fs.access(filePath, function(err) {
   *         callback(null, !err)
   *     });
   * }, function(err, result) {
   *     // if result is true then at least one of the files exists
   * });
   */
  var some = doLimit(someLimit, Infinity);

  /**
   * The same as [`some`]{@link module:Collections.some} but runs only a single async operation at a time.
   *
   * @name someSeries
   * @static
   * @memberOf module:Collections
   * @method
   * @see [async.some]{@link module:Collections.some}
   * @alias anySeries
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A truth test to apply to each item in the array
   * in parallel. The iteratee is passed a `callback(err, truthValue)` which must
   * be called with a boolean argument once it has completed. Invoked with
   * (item, callback).
   * @param {Function} [callback] - A callback which is called as soon as any
   * iteratee returns `true`, or after all the iteratee functions have finished.
   * Result will be either `true` or `false` depending on the values of the async
   * tests. Invoked with (err, result).
   */
  var someSeries = doLimit(someLimit, 1);

  /**
   * Sorts a list by the results of running each `coll` value through an async
   * `iteratee`.
   *
   * @name sortBy
   * @static
   * @memberOf module:Collections
   * @method
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {Function} iteratee - A function to apply to each item in `coll`.
   * The iteratee is passed a `callback(err, sortValue)` which must be called once
   * it has completed with an error (which can be `null`) and a value to use as
   * the sort criteria. Invoked with (item, callback).
   * @param {Function} callback - A callback which is called after all the
   * `iteratee` functions have finished, or an error occurs. Results is the items
   * from the original `coll` sorted by the values returned by the `iteratee`
   * calls. Invoked with (err, results).
   * @example
   *
   * async.sortBy(['file1','file2','file3'], function(file, callback) {
   *     fs.stat(file, function(err, stats) {
   *         callback(err, stats.mtime);
   *     });
   * }, function(err, results) {
   *     // results is now the original array of files sorted by
   *     // modified date
   * });
   *
   * // By modifying the callback parameter the
   * // sorting order can be influenced:
   *
   * // ascending order
   * async.sortBy([1,9,3,5], function(x, callback) {
   *     callback(null, x);
   * }, function(err,result) {
   *     // result callback
   * });
   *
   * // descending order
   * async.sortBy([1,9,3,5], function(x, callback) {
   *     callback(null, x*-1);    //<- x*-1 instead of x, turns the order around
   * }, function(err,result) {
   *     // result callback
   * });
   */
  function sortBy(coll, iteratee, callback) {
      map(coll, function (x, callback) {
          iteratee(x, function (err, criteria) {
              if (err) return callback(err);
              callback(null, { value: x, criteria: criteria });
          });
      }, function (err, results) {
          if (err) return callback(err);
          callback(null, arrayMap(results.sort(comparator), baseProperty('value')));
      });

      function comparator(left, right) {
          var a = left.criteria,
              b = right.criteria;
          return a < b ? -1 : a > b ? 1 : 0;
      }
  }

  /**
   * Sets a time limit on an asynchronous function. If the function does not call
   * its callback within the specified milliseconds, it will be called with a
   * timeout error. The code property for the error object will be `'ETIMEDOUT'`.
   *
   * @name timeout
   * @static
   * @memberOf module:Utils
   * @method
   * @category Util
   * @param {Function} asyncFn - The asynchronous function you want to set the
   * time limit.
   * @param {number} milliseconds - The specified time limit.
   * @param {*} [info] - Any variable you want attached (`string`, `object`, etc)
   * to timeout Error for more information..
   * @returns {Function} Returns a wrapped function that can be used with any of
   * the control flow functions.
   * @example
   *
   * async.timeout(function(callback) {
   *     doAsyncTask(callback);
   * }, 1000);
   */
  function timeout(asyncFn, milliseconds, info) {
      var originalCallback, timer;
      var timedOut = false;

      function injectedCallback() {
          if (!timedOut) {
              originalCallback.apply(null, arguments);
              clearTimeout(timer);
          }
      }

      function timeoutCallback() {
          var name = asyncFn.name || 'anonymous';
          var error = new Error('Callback function "' + name + '" timed out.');
          error.code = 'ETIMEDOUT';
          if (info) {
              error.info = info;
          }
          timedOut = true;
          originalCallback(error);
      }

      return initialParams(function (args, origCallback) {
          originalCallback = origCallback;
          // setup timer and call original function
          timer = setTimeout(timeoutCallback, milliseconds);
          asyncFn.apply(null, args.concat(injectedCallback));
      });
  }

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeCeil = Math.ceil;
  var nativeMax$1 = Math.max;
  /**
   * The base implementation of `_.range` and `_.rangeRight` which doesn't
   * coerce arguments to numbers.
   *
   * @private
   * @param {number} start The start of the range.
   * @param {number} end The end of the range.
   * @param {number} step The value to increment or decrement by.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Array} Returns the range of numbers.
   */
  function baseRange(start, end, step, fromRight) {
    var index = -1,
        length = nativeMax$1(nativeCeil((end - start) / (step || 1)), 0),
        result = Array(length);

    while (length--) {
      result[fromRight ? length : ++index] = start;
      start += step;
    }
    return result;
  }

  /**
   * The same as [times]{@link module:ControlFlow.times} but runs a maximum of `limit` async operations at a
   * time.
   *
   * @name timesLimit
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.times]{@link module:ControlFlow.times}
   * @category Control Flow
   * @param {number} count - The number of times to run the function.
   * @param {number} limit - The maximum number of async operations at a time.
   * @param {Function} iteratee - The function to call `n` times. Invoked with the
   * iteration index and a callback (n, next).
   * @param {Function} callback - see [async.map]{@link module:Collections.map}.
   */
  function timeLimit(count, limit, iteratee, callback) {
    mapLimit(baseRange(0, count, 1), limit, iteratee, callback);
  }

  /**
   * Calls the `iteratee` function `n` times, and accumulates results in the same
   * manner you would use with [map]{@link module:Collections.map}.
   *
   * @name times
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.map]{@link module:Collections.map}
   * @category Control Flow
   * @param {number} n - The number of times to run the function.
   * @param {Function} iteratee - The function to call `n` times. Invoked with the
   * iteration index and a callback (n, next).
   * @param {Function} callback - see {@link module:Collections.map}.
   * @example
   *
   * // Pretend this is some complicated async factory
   * var createUser = function(id, callback) {
   *     callback(null, {
   *         id: 'user' + id
   *     });
   * };
   *
   * // generate 5 users
   * async.times(5, function(n, next) {
   *     createUser(n, function(err, user) {
   *         next(err, user);
   *     });
   * }, function(err, users) {
   *     // we should now have 5 users
   * });
   */
  var times = doLimit(timeLimit, Infinity);

  /**
   * The same as [times]{@link module:ControlFlow.times} but runs only a single async operation at a time.
   *
   * @name timesSeries
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.times]{@link module:ControlFlow.times}
   * @category Control Flow
   * @param {number} n - The number of times to run the function.
   * @param {Function} iteratee - The function to call `n` times. Invoked with the
   * iteration index and a callback (n, next).
   * @param {Function} callback - see {@link module:Collections.map}.
   */
  var timesSeries = doLimit(timeLimit, 1);

  /**
   * A relative of `reduce`.  Takes an Object or Array, and iterates over each
   * element in series, each step potentially mutating an `accumulator` value.
   * The type of the accumulator defaults to the type of collection passed in.
   *
   * @name transform
   * @static
   * @memberOf module:Collections
   * @method
   * @category Collection
   * @param {Array|Iterable|Object} coll - A collection to iterate over.
   * @param {*} [accumulator] - The initial state of the transform.  If omitted,
   * it will default to an empty Object or Array, depending on the type of `coll`
   * @param {Function} iteratee - A function applied to each item in the
   * collection that potentially modifies the accumulator. The `iteratee` is
   * passed a `callback(err)` which accepts an optional error as its first
   * argument. If an error is passed to the callback, the transform is stopped
   * and the main `callback` is immediately called with the error.
   * Invoked with (accumulator, item, key, callback).
   * @param {Function} [callback] - A callback which is called after all the
   * `iteratee` functions have finished. Result is the transformed accumulator.
   * Invoked with (err, result).
   * @example
   *
   * async.transform([1,2,3], function(acc, item, index, callback) {
   *     // pointless async:
   *     process.nextTick(function() {
   *         acc.push(item * 2)
   *         callback(null)
   *     });
   * }, function(err, result) {
   *     // result is now equal to [2, 4, 6]
   * });
   *
   * @example
   *
   * async.transform({a: 1, b: 2, c: 3}, function (obj, val, key, callback) {
   *     setImmediate(function () {
   *         obj[key] = val * 2;
   *         callback();
   *     })
   * }, function (err, result) {
   *     // result is equal to {a: 2, b: 4, c: 6}
   * })
   */
  function transform(coll, accumulator, iteratee, callback) {
      if (arguments.length === 3) {
          callback = iteratee;
          iteratee = accumulator;
          accumulator = isArray(coll) ? [] : {};
      }
      callback = once(callback || noop);

      eachOf(coll, function (v, k, cb) {
          iteratee(accumulator, v, k, cb);
      }, function (err) {
          callback(err, accumulator);
      });
  }

  /**
   * Undoes a [memoize]{@link module:Utils.memoize}d function, reverting it to the original,
   * unmemoized form. Handy for testing.
   *
   * @name unmemoize
   * @static
   * @memberOf module:Utils
   * @method
   * @see [async.memoize]{@link module:Utils.memoize}
   * @category Util
   * @param {Function} fn - the memoized function
   * @returns {Function} a function that calls the original unmemoized function
   */
  function unmemoize(fn) {
      return function () {
          return (fn.unmemoized || fn).apply(null, arguments);
      };
  }

  /**
   * Repeatedly call `fn`, while `test` returns `true`. Calls `callback` when
   * stopped, or an error occurs.
   *
   * @name whilst
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {Function} test - synchronous truth test to perform before each
   * execution of `fn`. Invoked with ().
   * @param {Function} iteratee - A function which is called each time `test` passes.
   * The function is passed a `callback(err)`, which must be called once it has
   * completed with an optional `err` argument. Invoked with (callback).
   * @param {Function} [callback] - A callback which is called after the test
   * function has failed and repeated execution of `fn` has stopped. `callback`
   * will be passed an error and any arguments passed to the final `fn`'s
   * callback. Invoked with (err, [results]);
   * @returns undefined
   * @example
   *
   * var count = 0;
   * async.whilst(
   *     function() { return count < 5; },
   *     function(callback) {
   *         count++;
   *         setTimeout(function() {
   *             callback(null, count);
   *         }, 1000);
   *     },
   *     function (err, n) {
   *         // 5 seconds have passed, n = 5
   *     }
   * );
   */
  function whilst(test, iteratee, callback) {
      callback = onlyOnce(callback || noop);
      if (!test()) return callback(null);
      var next = rest(function (err, args) {
          if (err) return callback(err);
          if (test()) return iteratee(next);
          callback.apply(null, [null].concat(args));
      });
      iteratee(next);
  }

  /**
   * Repeatedly call `fn` until `test` returns `true`. Calls `callback` when
   * stopped, or an error occurs. `callback` will be passed an error and any
   * arguments passed to the final `fn`'s callback.
   *
   * The inverse of [whilst]{@link module:ControlFlow.whilst}.
   *
   * @name until
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @see [async.whilst]{@link module:ControlFlow.whilst}
   * @category Control Flow
   * @param {Function} test - synchronous truth test to perform before each
   * execution of `fn`. Invoked with ().
   * @param {Function} fn - A function which is called each time `test` fails.
   * The function is passed a `callback(err)`, which must be called once it has
   * completed with an optional `err` argument. Invoked with (callback).
   * @param {Function} [callback] - A callback which is called after the test
   * function has passed and repeated execution of `fn` has stopped. `callback`
   * will be passed an error and any arguments passed to the final `fn`'s
   * callback. Invoked with (err, [results]);
   */
  function until(test, fn, callback) {
      whilst(function () {
          return !test.apply(this, arguments);
      }, fn, callback);
  }

  /**
   * Runs the `tasks` array of functions in series, each passing their results to
   * the next in the array. However, if any of the `tasks` pass an error to their
   * own callback, the next function is not executed, and the main `callback` is
   * immediately called with the error.
   *
   * @name waterfall
   * @static
   * @memberOf module:ControlFlow
   * @method
   * @category Control Flow
   * @param {Array} tasks - An array of functions to run, each function is passed
   * a `callback(err, result1, result2, ...)` it must call on completion. The
   * first argument is an error (which can be `null`) and any further arguments
   * will be passed as arguments in order to the next task.
   * @param {Function} [callback] - An optional callback to run once all the
   * functions have completed. This will be passed the results of the last task's
   * callback. Invoked with (err, [results]).
   * @returns undefined
   * @example
   *
   * async.waterfall([
   *     function(callback) {
   *         callback(null, 'one', 'two');
   *     },
   *     function(arg1, arg2, callback) {
   *         // arg1 now equals 'one' and arg2 now equals 'two'
   *         callback(null, 'three');
   *     },
   *     function(arg1, callback) {
   *         // arg1 now equals 'three'
   *         callback(null, 'done');
   *     }
   * ], function (err, result) {
   *     // result now equals 'done'
   * });
   *
   * // Or, with named functions:
   * async.waterfall([
   *     myFirstFunction,
   *     mySecondFunction,
   *     myLastFunction,
   * ], function (err, result) {
   *     // result now equals 'done'
   * });
   * function myFirstFunction(callback) {
   *     callback(null, 'one', 'two');
   * }
   * function mySecondFunction(arg1, arg2, callback) {
   *     // arg1 now equals 'one' and arg2 now equals 'two'
   *     callback(null, 'three');
   * }
   * function myLastFunction(arg1, callback) {
   *     // arg1 now equals 'three'
   *     callback(null, 'done');
   * }
   */
  function waterfall (tasks, callback) {
      callback = once(callback || noop);
      if (!isArray(tasks)) return callback(new Error('First argument to waterfall must be an array of functions'));
      if (!tasks.length) return callback();
      var taskIndex = 0;

      function nextTask(args) {
          if (taskIndex === tasks.length) {
              return callback.apply(null, [null].concat(args));
          }

          var taskCallback = onlyOnce(rest(function (err, args) {
              if (err) {
                  return callback.apply(null, [err].concat(args));
              }
              nextTask(args);
          }));

          args.push(taskCallback);

          var task = tasks[taskIndex++];
          task.apply(null, args);
      }

      nextTask([]);
  }

  var index = {
    applyEach: applyEach,
    applyEachSeries: applyEachSeries,
    apply: apply$1,
    asyncify: asyncify,
    auto: auto,
    autoInject: autoInject,
    cargo: cargo,
    compose: compose,
    concat: concat,
    concatSeries: concatSeries,
    constant: constant,
    detect: detect,
    detectLimit: detectLimit,
    detectSeries: detectSeries,
    dir: dir,
    doDuring: doDuring,
    doUntil: doUntil,
    doWhilst: doWhilst,
    during: during,
    each: each,
    eachLimit: eachLimit,
    eachOf: eachOf,
    eachOfLimit: eachOfLimit,
    eachOfSeries: eachOfSeries,
    eachSeries: eachSeries,
    ensureAsync: ensureAsync,
    every: every,
    everyLimit: everyLimit,
    everySeries: everySeries,
    filter: filter,
    filterLimit: filterLimit,
    filterSeries: filterSeries,
    forever: forever,
    log: log,
    map: map,
    mapLimit: mapLimit,
    mapSeries: mapSeries,
    mapValues: mapValues,
    mapValuesLimit: mapValuesLimit,
    mapValuesSeries: mapValuesSeries,
    memoize: memoize,
    nextTick: nextTick,
    parallel: parallel,
    parallelLimit: parallelLimit,
    priorityQueue: priorityQueue,
    queue: queue$1,
    race: race,
    reduce: reduce,
    reduceRight: reduceRight,
    reflect: reflect,
    reflectAll: reflectAll,
    reject: reject,
    rejectLimit: rejectLimit,
    rejectSeries: rejectSeries,
    retry: retry,
    retryable: retryable,
    seq: seq,
    series: series,
    setImmediate: setImmediate$1,
    some: some,
    someLimit: someLimit,
    someSeries: someSeries,
    sortBy: sortBy,
    timeout: timeout,
    times: times,
    timesLimit: timeLimit,
    timesSeries: timesSeries,
    transform: transform,
    unmemoize: unmemoize,
    until: until,
    waterfall: waterfall,
    whilst: whilst,

    // aliases
    all: every,
    any: some,
    forEach: each,
    forEachSeries: eachSeries,
    forEachLimit: eachLimit,
    forEachOf: eachOf,
    forEachOfSeries: eachOfSeries,
    forEachOfLimit: eachOfLimit,
    inject: reduce,
    foldl: reduce,
    foldr: reduceRight,
    select: filter,
    selectLimit: filterLimit,
    selectSeries: filterSeries,
    wrapSync: asyncify
  };

  exports['default'] = index;
  exports.applyEach = applyEach;
  exports.applyEachSeries = applyEachSeries;
  exports.apply = apply$1;
  exports.asyncify = asyncify;
  exports.auto = auto;
  exports.autoInject = autoInject;
  exports.cargo = cargo;
  exports.compose = compose;
  exports.concat = concat;
  exports.concatSeries = concatSeries;
  exports.constant = constant;
  exports.detect = detect;
  exports.detectLimit = detectLimit;
  exports.detectSeries = detectSeries;
  exports.dir = dir;
  exports.doDuring = doDuring;
  exports.doUntil = doUntil;
  exports.doWhilst = doWhilst;
  exports.during = during;
  exports.each = each;
  exports.eachLimit = eachLimit;
  exports.eachOf = eachOf;
  exports.eachOfLimit = eachOfLimit;
  exports.eachOfSeries = eachOfSeries;
  exports.eachSeries = eachSeries;
  exports.ensureAsync = ensureAsync;
  exports.every = every;
  exports.everyLimit = everyLimit;
  exports.everySeries = everySeries;
  exports.filter = filter;
  exports.filterLimit = filterLimit;
  exports.filterSeries = filterSeries;
  exports.forever = forever;
  exports.log = log;
  exports.map = map;
  exports.mapLimit = mapLimit;
  exports.mapSeries = mapSeries;
  exports.mapValues = mapValues;
  exports.mapValuesLimit = mapValuesLimit;
  exports.mapValuesSeries = mapValuesSeries;
  exports.memoize = memoize;
  exports.nextTick = nextTick;
  exports.parallel = parallel;
  exports.parallelLimit = parallelLimit;
  exports.priorityQueue = priorityQueue;
  exports.queue = queue$1;
  exports.race = race;
  exports.reduce = reduce;
  exports.reduceRight = reduceRight;
  exports.reflect = reflect;
  exports.reflectAll = reflectAll;
  exports.reject = reject;
  exports.rejectLimit = rejectLimit;
  exports.rejectSeries = rejectSeries;
  exports.retry = retry;
  exports.retryable = retryable;
  exports.seq = seq;
  exports.series = series;
  exports.setImmediate = setImmediate$1;
  exports.some = some;
  exports.someLimit = someLimit;
  exports.someSeries = someSeries;
  exports.sortBy = sortBy;
  exports.timeout = timeout;
  exports.times = times;
  exports.timesLimit = timeLimit;
  exports.timesSeries = timesSeries;
  exports.transform = transform;
  exports.unmemoize = unmemoize;
  exports.until = until;
  exports.waterfall = waterfall;
  exports.whilst = whilst;
  exports.all = every;
  exports.allLimit = everyLimit;
  exports.allSeries = everySeries;
  exports.any = some;
  exports.anyLimit = someLimit;
  exports.anySeries = someSeries;
  exports.find = detect;
  exports.findLimit = detectLimit;
  exports.findSeries = detectSeries;
  exports.forEach = each;
  exports.forEachSeries = eachSeries;
  exports.forEachLimit = eachLimit;
  exports.forEachOf = eachOf;
  exports.forEachOfSeries = eachOfSeries;
  exports.forEachOfLimit = eachOfLimit;
  exports.inject = reduce;
  exports.foldl = reduce;
  exports.foldr = reduceRight;
  exports.select = filter;
  exports.selectLimit = filterLimit;
  exports.selectSeries = filterSeries;
  exports.wrapSync = asyncify;

}));
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":6}],3:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":8}],4:[function(require,module,exports){

},{}],5:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],6:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
  try {
    cachedSetTimeout = setTimeout;
  } catch (e) {
    cachedSetTimeout = function () {
      throw new Error('setTimeout is not defined');
    }
  }
  try {
    cachedClearTimeout = clearTimeout;
  } catch (e) {
    cachedClearTimeout = function () {
      throw new Error('clearTimeout is not defined');
    }
  }
} ())
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = cachedSetTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    cachedClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        cachedSetTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],8:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":7,"_process":6,"inherits":5}],9:[function(require,module,exports){
'use strict'

var document = require('global/document')

module.exports = document.addEventListener ? ready : noop

function ready (callback) {
  if (document.readyState === 'complete') {
    return setTimeout(callback, 0)
  }

  document.addEventListener('DOMContentLoaded', function onLoad () {
    callback()
  })
}

function noop () {}

},{"global/document":10}],10:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":4}],11:[function(require,module,exports){
'use strict';
var strictUriEncode = require('strict-uri-encode');
var objectAssign = require('object-assign');

function encode(value, opts) {
	if (opts.encode) {
		return opts.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

exports.extract = function (str) {
	return str.split('?')[1] || '';
};

exports.parse = function (str) {
	// Create an object with no prototype
	// https://github.com/sindresorhus/query-string/issues/47
	var ret = Object.create(null);

	if (typeof str !== 'string') {
		return ret;
	}

	str = str.trim().replace(/^(\?|#|&)/, '');

	if (!str) {
		return ret;
	}

	str.split('&').forEach(function (param) {
		var parts = param.replace(/\+/g, ' ').split('=');
		// Firefox (pre 40) decodes `%3D` to `=`
		// https://github.com/sindresorhus/query-string/pull/37
		var key = parts.shift();
		var val = parts.length > 0 ? parts.join('=') : undefined;

		key = decodeURIComponent(key);

		// missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		val = val === undefined ? null : decodeURIComponent(val);

		if (ret[key] === undefined) {
			ret[key] = val;
		} else if (Array.isArray(ret[key])) {
			ret[key].push(val);
		} else {
			ret[key] = [ret[key], val];
		}
	});

	return ret;
};

exports.stringify = function (obj, opts) {
	var defaults = {
		encode: true,
		strict: true
	};

	opts = objectAssign(defaults, opts);

	return obj ? Object.keys(obj).sort().map(function (key) {
		var val = obj[key];

		if (val === undefined) {
			return '';
		}

		if (val === null) {
			return encode(key, opts);
		}

		if (Array.isArray(val)) {
			var result = [];

			val.slice().forEach(function (val2) {
				if (val2 === undefined) {
					return;
				}

				if (val2 === null) {
					result.push(encode(key, opts));
				} else {
					result.push(encode(key, opts) + '=' + encode(val2, opts));
				}
			});

			return result.join('&');
		}

		return encode(key, opts) + '=' + encode(val, opts);
	}).filter(function (x) {
		return x.length > 0;
	}).join('&') : '';
};

},{"object-assign":12,"strict-uri-encode":13}],12:[function(require,module,exports){
'use strict';
/* eslint-disable no-unused-vars */
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (e) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}],13:[function(require,module,exports){
'use strict';
module.exports = function (str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
		return '%' + c.charCodeAt(0).toString(16).toUpperCase();
	});
};

},{}],14:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
var slice = [].slice;

(function(root, factory) {
  if (('function' === typeof define) && (define.amd != null)) {
    return define([], factory);
  } else if (typeof exports !== "undefined" && exports !== null) {
    return module.exports = factory();
  } else {
    return root.UrlPattern = factory();
  }
})(this, function() {
  var P, UrlPattern, astNodeContainsSegmentsForProvidedParams, astNodeToNames, astNodeToRegexString, baseAstNodeToRegexString, concatMap, defaultOptions, escapeForRegex, getParam, keysAndValuesToObject, newParser, regexGroupCount, stringConcatMap, stringify;
  escapeForRegex = function(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  };
  concatMap = function(array, f) {
    var i, length, results;
    results = [];
    i = -1;
    length = array.length;
    while (++i < length) {
      results = results.concat(f(array[i]));
    }
    return results;
  };
  stringConcatMap = function(array, f) {
    var i, length, result;
    result = '';
    i = -1;
    length = array.length;
    while (++i < length) {
      result += f(array[i]);
    }
    return result;
  };
  regexGroupCount = function(regex) {
    return (new RegExp(regex.toString() + '|')).exec('').length - 1;
  };
  keysAndValuesToObject = function(keys, values) {
    var i, key, length, object, value;
    object = {};
    i = -1;
    length = keys.length;
    while (++i < length) {
      key = keys[i];
      value = values[i];
      if (value == null) {
        continue;
      }
      if (object[key] != null) {
        if (!Array.isArray(object[key])) {
          object[key] = [object[key]];
        }
        object[key].push(value);
      } else {
        object[key] = value;
      }
    }
    return object;
  };
  P = {};
  P.Result = function(value, rest) {
    this.value = value;
    this.rest = rest;
  };
  P.Tagged = function(tag, value) {
    this.tag = tag;
    this.value = value;
  };
  P.tag = function(tag, parser) {
    return function(input) {
      var result, tagged;
      result = parser(input);
      if (result == null) {
        return;
      }
      tagged = new P.Tagged(tag, result.value);
      return new P.Result(tagged, result.rest);
    };
  };
  P.regex = function(regex) {
    return function(input) {
      var matches, result;
      matches = regex.exec(input);
      if (matches == null) {
        return;
      }
      result = matches[0];
      return new P.Result(result, input.slice(result.length));
    };
  };
  P.sequence = function() {
    var parsers;
    parsers = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return function(input) {
      var i, length, parser, rest, result, values;
      i = -1;
      length = parsers.length;
      values = [];
      rest = input;
      while (++i < length) {
        parser = parsers[i];
        result = parser(rest);
        if (result == null) {
          return;
        }
        values.push(result.value);
        rest = result.rest;
      }
      return new P.Result(values, rest);
    };
  };
  P.pick = function() {
    var indexes, parsers;
    indexes = arguments[0], parsers = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    return function(input) {
      var array, result;
      result = P.sequence.apply(P, parsers)(input);
      if (result == null) {
        return;
      }
      array = result.value;
      result.value = array[indexes];
      return result;
    };
  };
  P.string = function(string) {
    var length;
    length = string.length;
    return function(input) {
      if (input.slice(0, length) === string) {
        return new P.Result(string, input.slice(length));
      }
    };
  };
  P.lazy = function(fn) {
    var cached;
    cached = null;
    return function(input) {
      if (cached == null) {
        cached = fn();
      }
      return cached(input);
    };
  };
  P.baseMany = function(parser, end, stringResult, atLeastOneResultRequired, input) {
    var endResult, parserResult, rest, results;
    rest = input;
    results = stringResult ? '' : [];
    while (true) {
      if (end != null) {
        endResult = end(rest);
        if (endResult != null) {
          break;
        }
      }
      parserResult = parser(rest);
      if (parserResult == null) {
        break;
      }
      if (stringResult) {
        results += parserResult.value;
      } else {
        results.push(parserResult.value);
      }
      rest = parserResult.rest;
    }
    if (atLeastOneResultRequired && results.length === 0) {
      return;
    }
    return new P.Result(results, rest);
  };
  P.many1 = function(parser) {
    return function(input) {
      return P.baseMany(parser, null, false, true, input);
    };
  };
  P.concatMany1Till = function(parser, end) {
    return function(input) {
      return P.baseMany(parser, end, true, true, input);
    };
  };
  P.firstChoice = function() {
    var parsers;
    parsers = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return function(input) {
      var i, length, parser, result;
      i = -1;
      length = parsers.length;
      while (++i < length) {
        parser = parsers[i];
        result = parser(input);
        if (result != null) {
          return result;
        }
      }
    };
  };
  newParser = function(options) {
    var U;
    U = {};
    U.wildcard = P.tag('wildcard', P.string(options.wildcardChar));
    U.optional = P.tag('optional', P.pick(1, P.string(options.optionalSegmentStartChar), P.lazy(function() {
      return U.pattern;
    }), P.string(options.optionalSegmentEndChar)));
    U.name = P.regex(new RegExp("^[" + options.segmentNameCharset + "]+"));
    U.named = P.tag('named', P.pick(1, P.string(options.segmentNameStartChar), P.lazy(function() {
      return U.name;
    })));
    U.escapedChar = P.pick(1, P.string(options.escapeChar), P.regex(/^./));
    U["static"] = P.tag('static', P.concatMany1Till(P.firstChoice(P.lazy(function() {
      return U.escapedChar;
    }), P.regex(/^./)), P.firstChoice(P.string(options.segmentNameStartChar), P.string(options.optionalSegmentStartChar), P.string(options.optionalSegmentEndChar), U.wildcard)));
    U.token = P.lazy(function() {
      return P.firstChoice(U.wildcard, U.optional, U.named, U["static"]);
    });
    U.pattern = P.many1(P.lazy(function() {
      return U.token;
    }));
    return U;
  };
  defaultOptions = {
    escapeChar: '\\',
    segmentNameStartChar: ':',
    segmentValueCharset: 'a-zA-Z0-9-_~ %',
    segmentNameCharset: 'a-zA-Z0-9',
    optionalSegmentStartChar: '(',
    optionalSegmentEndChar: ')',
    wildcardChar: '*'
  };
  baseAstNodeToRegexString = function(astNode, segmentValueCharset) {
    if (Array.isArray(astNode)) {
      return stringConcatMap(astNode, function(node) {
        return baseAstNodeToRegexString(node, segmentValueCharset);
      });
    }
    switch (astNode.tag) {
      case 'wildcard':
        return '(.*?)';
      case 'named':
        return "([" + segmentValueCharset + "]+)";
      case 'static':
        return escapeForRegex(astNode.value);
      case 'optional':
        return '(?:' + baseAstNodeToRegexString(astNode.value, segmentValueCharset) + ')?';
    }
  };
  astNodeToRegexString = function(astNode, segmentValueCharset) {
    if (segmentValueCharset == null) {
      segmentValueCharset = defaultOptions.segmentValueCharset;
    }
    return '^' + baseAstNodeToRegexString(astNode, segmentValueCharset) + '$';
  };
  astNodeToNames = function(astNode) {
    if (Array.isArray(astNode)) {
      return concatMap(astNode, astNodeToNames);
    }
    switch (astNode.tag) {
      case 'wildcard':
        return ['_'];
      case 'named':
        return [astNode.value];
      case 'static':
        return [];
      case 'optional':
        return astNodeToNames(astNode.value);
    }
  };
  getParam = function(params, key, nextIndexes, sideEffects) {
    var index, maxIndex, result, value;
    if (sideEffects == null) {
      sideEffects = false;
    }
    value = params[key];
    if (value == null) {
      if (sideEffects) {
        throw new Error("no values provided for key `" + key + "`");
      } else {
        return;
      }
    }
    index = nextIndexes[key] || 0;
    maxIndex = Array.isArray(value) ? value.length - 1 : 0;
    if (index > maxIndex) {
      if (sideEffects) {
        throw new Error("too few values provided for key `" + key + "`");
      } else {
        return;
      }
    }
    result = Array.isArray(value) ? value[index] : value;
    if (sideEffects) {
      nextIndexes[key] = index + 1;
    }
    return result;
  };
  astNodeContainsSegmentsForProvidedParams = function(astNode, params, nextIndexes) {
    var i, length;
    if (Array.isArray(astNode)) {
      i = -1;
      length = astNode.length;
      while (++i < length) {
        if (astNodeContainsSegmentsForProvidedParams(astNode[i], params, nextIndexes)) {
          return true;
        }
      }
      return false;
    }
    switch (astNode.tag) {
      case 'wildcard':
        return getParam(params, '_', nextIndexes, false) != null;
      case 'named':
        return getParam(params, astNode.value, nextIndexes, false) != null;
      case 'static':
        return false;
      case 'optional':
        return astNodeContainsSegmentsForProvidedParams(astNode.value, params, nextIndexes);
    }
  };
  stringify = function(astNode, params, nextIndexes) {
    if (Array.isArray(astNode)) {
      return stringConcatMap(astNode, function(node) {
        return stringify(node, params, nextIndexes);
      });
    }
    switch (astNode.tag) {
      case 'wildcard':
        return getParam(params, '_', nextIndexes, true);
      case 'named':
        return getParam(params, astNode.value, nextIndexes, true);
      case 'static':
        return astNode.value;
      case 'optional':
        if (astNodeContainsSegmentsForProvidedParams(astNode.value, params, nextIndexes)) {
          return stringify(astNode.value, params, nextIndexes);
        } else {
          return '';
        }
    }
  };
  UrlPattern = function(arg1, arg2) {
    var groupCount, options, parsed, parser, withoutWhitespace;
    if (arg1 instanceof UrlPattern) {
      this.isRegex = arg1.isRegex;
      this.regex = arg1.regex;
      this.ast = arg1.ast;
      this.names = arg1.names;
      return;
    }
    this.isRegex = arg1 instanceof RegExp;
    if (!(('string' === typeof arg1) || this.isRegex)) {
      throw new TypeError('argument must be a regex or a string');
    }
    if (this.isRegex) {
      this.regex = arg1;
      if (arg2 != null) {
        if (!Array.isArray(arg2)) {
          throw new Error('if first argument is a regex the second argument may be an array of group names but you provided something else');
        }
        groupCount = regexGroupCount(this.regex);
        if (arg2.length !== groupCount) {
          throw new Error("regex contains " + groupCount + " groups but array of group names contains " + arg2.length);
        }
        this.names = arg2;
      }
      return;
    }
    if (arg1 === '') {
      throw new Error('argument must not be the empty string');
    }
    withoutWhitespace = arg1.replace(/\s+/g, '');
    if (withoutWhitespace !== arg1) {
      throw new Error('argument must not contain whitespace');
    }
    options = {
      escapeChar: (arg2 != null ? arg2.escapeChar : void 0) || defaultOptions.escapeChar,
      segmentNameStartChar: (arg2 != null ? arg2.segmentNameStartChar : void 0) || defaultOptions.segmentNameStartChar,
      segmentNameCharset: (arg2 != null ? arg2.segmentNameCharset : void 0) || defaultOptions.segmentNameCharset,
      segmentValueCharset: (arg2 != null ? arg2.segmentValueCharset : void 0) || defaultOptions.segmentValueCharset,
      optionalSegmentStartChar: (arg2 != null ? arg2.optionalSegmentStartChar : void 0) || defaultOptions.optionalSegmentStartChar,
      optionalSegmentEndChar: (arg2 != null ? arg2.optionalSegmentEndChar : void 0) || defaultOptions.optionalSegmentEndChar,
      wildcardChar: (arg2 != null ? arg2.wildcardChar : void 0) || defaultOptions.wildcardChar
    };
    parser = newParser(options);
    parsed = parser.pattern(arg1);
    if (parsed == null) {
      throw new Error("couldn't parse pattern");
    }
    if (parsed.rest !== '') {
      throw new Error("could only partially parse pattern");
    }
    this.ast = parsed.value;
    this.regex = new RegExp(astNodeToRegexString(this.ast, options.segmentValueCharset));
    this.names = astNodeToNames(this.ast);
  };
  UrlPattern.prototype.match = function(url) {
    var groups, match;
    match = this.regex.exec(url);
    if (match == null) {
      return null;
    }
    groups = match.slice(1);
    if (this.names) {
      return keysAndValuesToObject(this.names, groups);
    } else {
      return groups;
    }
  };
  UrlPattern.prototype.stringify = function(params) {
    if (params == null) {
      params = {};
    }
    if (this.isRegex) {
      throw new Error("can't stringify patterns generated from a regex");
    }
    if (params !== Object(params)) {
      throw new Error("argument must be an object or undefined");
    }
    return stringify(this.ast, params, {});
  };
  UrlPattern.escapeForRegex = escapeForRegex;
  UrlPattern.concatMap = concatMap;
  UrlPattern.stringConcatMap = stringConcatMap;
  UrlPattern.regexGroupCount = regexGroupCount;
  UrlPattern.keysAndValuesToObject = keysAndValuesToObject;
  UrlPattern.P = P;
  UrlPattern.newParser = newParser;
  UrlPattern.defaultOptions = defaultOptions;
  UrlPattern.astNodeToRegexString = astNodeToRegexString;
  UrlPattern.astNodeToNames = astNodeToNames;
  UrlPattern.getParam = getParam;
  UrlPattern.astNodeContainsSegmentsForProvidedParams = astNodeContainsSegmentsForProvidedParams;
  UrlPattern.stringify = stringify;
  return UrlPattern;
});

},{}],15:[function(require,module,exports){
var assert              = require('assert')
var viewStack           = require('./')
var addListener         = viewStack.addListener
var addRoute            = viewStack.addRoute
var getComponents       = viewStack.getComponents
var getUrlData          = viewStack.getUrlData
var navigate            = viewStack.navigate
var readListeners       = viewStack.readListeners
var readRoute           = viewStack.readRoute
var readRoutes          = viewStack.readRoutes
var removeTrailingSlash = viewStack.removeTrailingSlash
var register            = viewStack.register
var reset               = viewStack.reset
var resolveComponents   = viewStack.resolveComponents
var testComponentOption = viewStack.testComponentOption
var testListener        = viewStack.testListener
var testOptions         = viewStack.testOptions
var testRoutes          = viewStack.testRoutes
var testRoutesArray     = viewStack.testRoutesArray
var display

if (typeof window !== 'undefined') {
  display = document.getElementById('output')
}

function print(out) {
  if (display) {
    display.innerHTML += out
  }
}

function fail(msg) {
  var out = '  ✘ ' + msg
  console.error(out)
  print('<h4 class="test-fail">'+out+'</h4>')
}

function pass(msg) {
  var out = '  ✔︎ ' + msg
  console.info(out)
  print('<h4 class="test-pass">'+out+'</h4>')
}

function test(label, func) {
  beforeEach()
  var f = false
  label = label || ''
  console.info(label)
  print('<h3 class="test-label">'+label+'</h3>')
  try {
    msg = func()
  }
  catch(e) {
    f = e.message
    fail(f)
  }
  finally {
    if (!f) {
      pass('passed')
    }
  }
  afterEach()
}


function beforeEach() {
  reset()
}

function afterEach() {}

module.exports = function() {

  test('register', function() {
    assert(register, 'register does not exist')
  })

  test('should register multiple routes', function() {
      var routes = []

      register([{
        route: '/',
        layer: 'screens',
        component: function() {},
        props: {}
      }, {
        route: '/',
        layer: 'modals',
        component: function() {},
        props: {}
      }])

      routes = readRoutes()
      assert(routes['/'].screens)
      assert(routes['/'].modals)
  })


  test('navigate', function() {
    assert(navigate)
  })


  test('addListener', function() {
    assert(addListener)
  })

  test('should add a listener', function() {
    assert.equal(addListener(function(){}).length, 1)
  })

  test('addRoute', function() {
    assert(addRoute)
  })

  test('should add default route', function() {
    addRoute({
      route: '/',
      layer: 'screens',
      component: ()=>{},
      props: {}
    })
    assert(readRoute('/').screens)
  })

  test('testRoutes', function() {
    assert(testRoutes)
  })

  test('should throw missing routes error', function() {
      assert.throws(testRoutes, Error, 'Missing required routes Array argument')
  })

  test('testRoutesArray', function() {
    assert(testRoutesArray)
  })

  test('should throw missing routes error', function() {
      assert.throws(testRoutesArray, Error, 'The routes argument needs to be an Array')
   })

  test('getComponents', function() {
    assert(getComponents)
  })

  test('should get correct component when path is passed', function() {
    addRoute({
      route: '/sign-in',
      layer: 'screen',
      component: (cb)=>{
        cb(null, function YO(){})
      },
      props: {}
    }, {})

    var components = getComponents(
      '/sign-in',
      function(component) {
        assert.equal(
          component[0].props.path,
          '/sign-in'
        )
      }
    )
  })

  test('getUrlData', function() {
    assert(getUrlData)
  })
  /*
  //FIXME: Figure out how to run these tests
  test('should get root path', function() {
    window.location.pathname = '/'
    assert.equal(
      getUrlData(),
      {
        path: '/',
        query: {},
        params: {}
      }
    )
  })

  test('should get complex path', function() {
      //Register a id url pattern to
      //  match against for params
      window.location.pathname = '/thing/chill/1234'
      window.location.search = '?priority=1'
      addRoute({
        route: '/thing/:project/:id',
        layer: 'screen',
        component: function(){},
        props: {}
      }, {})
      assert.equal(
        getUrlData(),
        {
          params: {
            project: 'chill',
            id: '1234'
          },
          path: '/thing/chill/1234',
          query: {
            priority: '1'
          }
        }
      )
    })

  test('should allow path to be passed in', function() {
    window.location.pathname = '/'
    assert.equal(
      getUrlData('/tasks'),
      {
        path: '/tasks',
        query: {},
        params: {}
      }
    )
  })
  */

  test('testOptions', function() {
    assert(testOptions)
  })

  test('should throw missing options error', ()=> {
    assert.throws(testOptions, Error, 'Missing required options Object')
  })

  test('testComponentOption', function() {
    assert(testComponentOption)
  })

  test('should throw missing options error', function() {
    assert.throws(testComponentOption, Error, 'Missing component require')
  })

  test('testListener', function() {
    assert(testListener)
  })

  test('should throw missing options error', function() {
    assert.throws(testListener, Error, 'Listener must be a function')
  })

  test('removeTrailingSlash', function() {
    assert(removeTrailingSlash)
  })

  test('should not hose the root path', function() {
    assert.equal(removeTrailingSlash('/'), '/')
  })

  test('should remove a trailing slash', function() {
    assert.equal(
      removeTrailingSlash('/thing/1234/'),
      '/thing/1234'
    )
  })

}()

},{"./":1,"assert":3}]},{},[15]);
