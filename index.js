var router = require('thataway')()
var yo = require('yo-yo')

module.exports = function viewStack(routes, data) {
  var view
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

  function create(data) {
    if(!data) { return }
    if (data.persist) {
      persistentLayers[data.layer] = data.callback
    }
    return yo`
      <div>
        ${Object.keys(persistentLayers)
          .map(function(p) {
            return (
              Layer({
                layer:p,
                callback:persistentLayers[p]
              })
            )
          })
        }
        ${!persistentLayers[data.layer]? Layer(data): null}
      </div>
    `
  }

  function update(newState) {
    return yo.update(view, create(newState))
  }

  view = create(data)

  return {
    view: view,
    navigate: router.navigate,
    addRoute: router.addRoute
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
