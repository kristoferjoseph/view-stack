var router = require('thataway')()
var yo = require('yo-yo')
var location
if (typeof window === 'undefined') {
  location = {
    pathname: '/'
  }
}
else {
  location = window.location
}

module.exports = function viewStack(routes, store) {
  store = store || {}
  path  = location.pathname
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
    return yo`
      <div class='view-stack'>
        ${layers.screens? Layer(layers.screens, store): null}
        ${layers.sheets? Layer(layers.sheets, store): null}
        ${layers.modals? Layer(layers.modals, store): null}
      </div>
    `
  }

  function update(newState) {
    return yo.update(element, create(newState))
  }

  function renderStatic(path) {
    return create(
      router.getRouteData(path)
    ).outerHTML
  }
  element = create(data)
  return {
    element: element,
    renderStatic: renderStatic,
    navigate: router.navigate
  }
}

function Layer(data, store) {
  var component = data.callback()
  var layer = data.layer
  store = Object.assign(store, data)
  delete store.callback
  delete store.layer
  return yo`
    <div class="view-stack-${layer}">
      ${component(store)}
    </div>
  `
}
