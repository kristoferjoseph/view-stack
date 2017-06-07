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
    return html`
      <div class=${classes}>
        ${layers.screens ? Layer(format(layers.screens)) : null}
        ${layers.sheets ? Layer(format(layers.sheets)) : null}
        ${layers.modals ? Layer(format(layers.modals)) : null}
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
  render.router = router
  return render
}

