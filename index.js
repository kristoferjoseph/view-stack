var router = require('thataway')()
var yo = require('yo-yo')

module.exports = function viewStack(routes) {
  var view
  var data
  var persistentLayers = {}
  if (Array.isArray(routes)) {
    routes.forEach(function(route){
      router.addRoute(route.path, route.data)
    })
  }
  else if (routes === Object(routes)) {
    router.addRoute(routes.path, routes.data)
  }

  router.addListener(update)
  data = router.getRouteData(location.pathname)
  data.navigate = router.navigate

  function create(data) {
    if(!data) { return }
    if (data.persist) {
      persistentLayers[data.layer] = data
    }
    return yo`
      <div>
        ${Object.keys(persistentLayers)
          .map(function(p) {
            return (
              Layer(persistentLayers[p])
            )
          })
        }
        ${!persistentLayers[data.layer]? Layer(data): null}
      </div>
    `
  }

  function update(newState) {
    newState.navigate = router.navigate
    return yo.update(view, create(newState))
  }

  return view = create(data)
}

function Layer(data) {
  var component = data.callback()
  return yo`
    <div class=${data.layer}>
      ${component(data)}
    </div>
  `
}
