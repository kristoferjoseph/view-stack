var router = require('thataway')()
var html = require('yo-yo')
var assign = require('object-assign')

var location
if (typeof window === 'undefined') {
  location = {
    pathname: '/'
  }
}
else {
  location = window.location
}

module.exports = function viewStack(routes, store, path) {
  store = store || {}
  path  = path || location.pathname
  var element
  var data
  if (Array.isArray(routes)) {
    routes.forEach(function(route) {
      router.addRoute(route.path, route.data)
    })
  }
  else if (routes === Object(routes)) {
    router.addRoute(routes.path, routes.data)
  }

  router.addListener(update)
  data = router.getRouteData(path)
  data.navigate = router.navigate

  var layers = {}
  function create(data) {
    if(!data) { return }
    layers['sheets'] = null
    layers['modals'] = null
    layers[data.layer] = data
    return html`
      <div class='view-stack'>
        ${layers.screens? Layer(layers.screens, store): null}
        ${layers.sheets? Layer(layers.sheets, store): null}
        ${layers.modals? Layer(layers.modals, store): null}
      </div>
    `
  }

  function update(newData) {
    if (newData) {
      html.update(element, create(newData))
    }
  }

  function render(path) {
    var data = router.getRouteData(path)
    data.navigate = router.navigate
    return create(data)
  }

  return {
    element: create(data),
    navigate: router.navigate,
    render: render
  }
}

function Layer(data, store) {
  var component = data.callback()
  var layer = data.layer
  store = assign(store, data)
  delete store.callback
  delete store.layer
  return html`
    <div class="view-stack-${layer}">
      ${component(store)}
    </div>
  `
}
