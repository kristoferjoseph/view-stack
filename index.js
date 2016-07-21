var queryString = require('query-string')
var Pattern     = require('url-pattern')
var parallel    = require('async').parallel
//Object to store keyed routes in
var routes = {}
//Array of stored patterns for url param matching
var patterns = []
//Array of functions to call when the url updates
var listeners = []
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
  if (window) {
    window.history.pushState(state, title, path)
  }
  //Notify listeners
  listeners.forEach(function(listener) {
    listener(path, title, state)
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
  routes.forEach(function(route) {
    addRoute(route)
  })
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
  testRoutesArray:testRoutesArray
}
