var html = require('yo-yo')

module.exports = function Layer (store) {
  var component = store.component
  var layer = store.layer
  var path = store.path
  var identifier = 'view-stack-' + layer

  return html`
    <div
      id=${identifier}
      class=${identifier}
     >
      ${component(store)}
    </div>
  `
}
