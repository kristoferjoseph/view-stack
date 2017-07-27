var html = require('bel')
var morph = require('nanomorph')
var router = require('thataway')()
var assign = require('object-assign')
var inWindow = require('in-window')
var joinClasses = require('join-classes')
var location = inWindow ? window.location : { pathname: '/' }
var Stack = require('stack-view')

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

  /*
   * paths: {
   *   screens: {
   *     // WARN: root route '/' must be defined
   *     '/': c=> {c(html`<h1>A</h1>`)},
   *     '/a': c=> {c(html`<h1>A</h1>`)}
   *   },
   *   sheets: {
   *     '/b': c=> {c(html`<h1>B</h1>`)}
   *   },
   *   modals: {
   *     '/c': c=> {c(html`<h1>C</h1>`)}
   *   }
   * }
   *
   */

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
    var stack = layers[state.layer]
    var component = state.component(
      function load (view) {
        back ? stack.pop() : stack.replace(view)
      }
    )
  }

  function render (path) {
    var data = router(path)
    data && update(data)
    morph(element, create())
    return element
  }

  element = create()
  render(path)

  render.element = element
  render.navigate = router.navigate
  render.register = register
  render.subscribe = router.subscribe
  return render
}
