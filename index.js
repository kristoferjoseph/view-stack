var html = require('bel')
var morph = require('nanomorph')
var router = require('thataway')()
var inWindow = require('in-window')
var joinClasses = require('join-classes')
var Stack = require('stack-view')
var isFunction = function (f) { return typeof f === 'function' }

module.exports = function ViewStack (opts) {
  opts = opts || {}
  var store = opts.store || {}
  var paths = opts.paths || {}
  var classes = joinClasses(opts.classes, 'view-stack')
  var viewClasses = opts.viewClasses
  var layers = {}
  var routes
  var element

  function keys (o, f) {
    var i = 0
    var keys = Object.keys(o)
    var l = keys.length
    for (i; i < l; i++) {
      f(keys[i])
    }
  }

  keys(paths, function (layer) {
    routes = paths[layer]
    keys(routes, function (path) {
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
    // Navigate added to store so that subcomponents can use it
    store.navigate = navigate
    layers[layer] = Stack({
      store: store,
      classes: viewClasses
    })
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

  function navigate (args) {
    args = args || {}
    var path = args.path
    var data = args.data
    var title = args.title

    router.navigate(path, data, title)
  }

  router.subscribe(update)

  function create () {
    return html`
      <div class=${classes}>
        ${Object.keys(layers).map(
            function (l) {
              return layers[l]()
            }
        )}
      </div>
    `
  }

  function update (state) {
    var action = state.action || 'replace'
    var layer = state.layer || Object.keys(layers)[0]
    var component = state.component || ''
    var stack = layers[layer]

    function load (component) {
      stack[action](component)
      return render()
    }

    return isFunction(component)
    ? component(load)
    : load(component)
  }

  function render (path) {
    path && navigate({path: path})
    element = inWindow && element
      ? morph(element, create())
      : create()

    return element
  }

  render.navigate = navigate
  render.update = update
  render.register = register
  render.subscribe = router.subscribe

  return render
}
