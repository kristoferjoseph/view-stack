var router = require('thataway')()
var yo = require('yo-yo')

module.exports = function viewStack(routes, path) {
  path = path || location.pathname || '/'
  var view
  var data
  var persist = {}
  if (Array.isArray(routes)) {
    routes.forEach(function(route){
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
        ${layers.menu? Layer(layers.menu): null}
        ${layers.screens? Layer(layers.screens): null}
        ${layers.sheets? Layer(layers.sheets): null}
        ${layers.modals? Layer(layers.modals): null}
      </div>
    `
  }

  function update(newState) {
    newState.navigate = router.navigate
    return yo.update(view, create(newState))
  }

  function renderPath(path) {
    return create(
      router.getRouteData(path)
    ).outerHTML
  }

  return {
    view: create(data),
    renderPath: renderPath
  }
}

function Layer(data) {
  var component = data.callback()
  return yo`
    <div class=${data.layer}>
      ${component(data)}
    </div>
  `
}
