var html = require('bel')
var morph = require('nanomorph')
var router = require('thataway')()
var assign = require('object-assign')
var inWindow = require('in-window')
var joinClasses = require('join-classes')
var location = inWindow ? window.location : { pathname: '/' }
var Stack = require('stack-view')
var REPLACE = 'replace'
var REMOVE = 'remove'
var PUSH = 'push'

module.exports = function ViewStack (opts) {
  opts = opts || {}
  var store = opts.store || {}
  var path = opts.path || location.pathname
  var paths = opts.paths || {}
  var classes = joinClasses(opts.classes, 'view-stack')
  var viewClasses = opts.viewClasses
  var layers = {}
  var routes
  var element
  var data

  function keys (o, f) {
    var i = 0
    var keys = Object.keys(o)
    var l = keys.length
    for (i; i<l; i++) {
      f(keys[i])
    }
  }

  keys(paths, function(layer) {
    routes = paths[layer]
    keys(routes, function(path) {
      register({
        path: path,
        layer: layer,
        component: routes[path]
      })
    })
  })

  function register (opts) {
    opts = opts || {}
    var path = opts.path
    var layer = opts.layer
    var component = opts.component
    layers[layer] = Stack({store: store, classes: viewClasses})
    path &&
    layer &&
    component &&
    router.register(
      path,
      {
        layer: layer,
        component: component
      }
    )
  }

  function navigate (opts) {
    opts = opts || {}
    var action = opts.action
    var path = opts.path
    var data = opts.data
    var title = opts.title
    var layer = opts.layer
    var component = opts.component
    update({
      action: action,
      layer: layer,
      component: component
    })
    router.navigate(path, data, title)
  }

  navigate.REMOVE = REMOVE
  navigate.REPLACE = REPLACE
  navigate.PUSH = PUSH

  router.subscribe(update)

  function create () {
    return html`
      <div class=${classes}>
        ${Object.keys(layers).map(
            function (l) {
              return layers[l].element
            }
        )}
      </div>
    `
  }

  function update (state) {
    var back = state.back
    var action = state.action || REPLACE
    var stack = layers[state.layer] || layers[0]
    var component = state.component && state.component(
      function load (view) {
        stack[action](view)
      }
    )
  }

  function render (path) {
    var data = router(path)
    data && update(data)
    return inWindow && element ?
      morph(element, create()) :
      create()
  }

  render.element = render(path)
  render.navigate = navigate
  render.register = register
  render.subscribe = router.subscribe
  return render
}
