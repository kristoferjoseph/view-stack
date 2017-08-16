var test = require('tape')
var ViewStack = require('./')

test('ViewStack', t=> {
  t.ok(ViewStack, 'exists')
  t.end()
})

test('should render to string from a path', function(t) {
  var paths = Object.assign({}, require('./paths.js'))
  var stack = ViewStack({
    path: '/a',
    paths: paths,
    viewClasses:'stack'
  })
  t.ok(stack.element, stack.element)
  t.end()
})
