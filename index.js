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

  function create(data) {
    if(!data) { return }
    if (data.persist) {
      persist[data.layer] = data
    }
    return yo`
      <div class='view-stack'>
        ${Object.keys(persist)
          .map(function(p) {
            return (
              Layer(persist[p])
            )
          })
        }
        ${!data.persist[data.layer]? Layer(data): null}
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
