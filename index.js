var router = require('thataway')()
var html = require('yo-yo')
var assign = require('object-assign')
var Layer = require('./layer')
var inWindow = require('in-window')
var joinClasses = require('join-classes')
var location = inWindow ? window.location : { pathname: '/' }

module.exports = function ViewStack (opts) {
  opts = opts || {}
  var routes = opts.routes
  var store = opts.store || {}
  var path = opts.path || location.pathname
  var classes = joinClasses(opts.classes, 'view-stack')
  var layers = {}
  var element
  var data
  if (Array.isArray(routes)) {
    routes.forEach(function (route) {
      router.register(route.path, route.data)
    })
  } else if (routes === Object(routes)) {
    router.register(routes.path, routes.data)
  }
  router.subscribe(update)
  render(path)

  function format (data) {
    var component = data.callback()
    var options = assign(
        store,
        data,
        {
          navigate: router.navigate,
          component: component
        }
      )
    return options
  }

  function create (data) {
    data = data || {}
    layers['sheets'] = null
    layers['modals'] = null
    layers[data.layer] = data
    var screens = layers.screens
    var sheets = layers.sheets
    var modals = layers.modals

    return html`
      <div class=${classes}>
        ${screens ? Layer(format(screens)) : null}
        ${sheets ? Layer(format(sheets)) : null}
        ${modals ? Layer(format(modals)) : null}
      </div>
    `
  }

  function update (state) {
    state && html.update(element, create(state))
  }

  function render (path) {
    var data = router(path)
    element = create(data)
    return element
  }

  render.element = element
  render.navigate = router.navigate
  render.subscribe = router.subscribe
  return render
}

