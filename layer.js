var html = require('yo-yo')

module.exports = function Layer (opts) {
  opts = opts || {}
  var component = opts.component
  var layer = opts.layer
  var store = opts.store
  return html`
    <div class='view-stack-${layer}'>
      ${component && component(store)}
    </div>
  `
}
