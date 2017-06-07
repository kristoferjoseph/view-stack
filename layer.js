var html = require('yo-yo')

module.exports = function Layer (store) {
  var component = store.component
  var layer = store.layer
  delete store.callback
  delete store.component
  delete store.layer
  return html`
    <div class='view-stack-${layer}'>
      ${component(store)}
    </div>
  `
}
