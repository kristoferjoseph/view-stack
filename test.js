var test = require('tape')
var html = require('yo-yo')
var ViewStack = require('./')

function strip(str) {
  return str.replace(/\s+/g, '')
}

module.exports = function() {
test('ViewStack should exist', function(t) {
  t.ok(ViewStack)
  t.end()
})

test('should expose router', function(t) {
  var routes = require('./routes.js').slice()
  var stack = ViewStack({routes: routes})
  t.ok(stack.router)
  t.end()
})

test('should render to string from a path', function(t) {
  var routes = require('./routes.js').slice()
  var stack = ViewStack({routes: routes})
  var el = stack('/a')
  t.equal(
    strip(el.outerHTML),
    strip(`
      <div class="view-stack">
        <div class="view-stack-screens">
          <h1>A</h1>
        </div>
      </div>
    `),
    'Renders to string from path')
  t.end()
})

test('should add routes as array', function (t) {
  var routes = require('./routes.js').slice()
  t.doesNotThrow(
    function () {
      ViewStack({
        routes: [{
          path: '/',
          data: {
            callback: function() {
              return function(data) {
                console.log('DATA:', data)
              }
            }
          }
        }]
      })
    },
    Error
  )
  t.end()
})

test('should add single route', function (t) {
  var routes = require('./routes.js').slice()
  t.doesNotThrow(
    function () {
      ViewStack({
        routes: [{
          path: '/a',
          data: {
            callback: function () {
              return function(data) {
                console.log('DATA:', data)
              }
            }
          }
        }],
        path: '/a'
      })
    },
    Error
  )
  t.end()
})

test('should return element',function(t){
  var routes = require('./routes.js').slice()
  var element = ViewStack({routes: routes}).element
  t.ok(element)
  t.end()
})

test('should create element', function(t) {
  var routes = require('./routes.js').slice()
  var element = ViewStack({routes: routes}).element
  var root = document.getElementById('root')
  root.appendChild(element)
  t.equal(
    strip(document.getElementById('root').innerHTML),
    strip(`
      <div class="view-stack">
        <div class="view-stack-screens">
          <h1>A</h1>
        </div>
      </div>
    `)
  )
  root.innerHTML = ''
  t.end()
})

test('should always render default screen', function(t) {
  var routes = require('./routes.js').slice()
  var element = ViewStack({routes: routes})('/d')
  t.equal(
    strip(element.outerHTML),
    strip(`
      <div class="view-stack">
        <div class="view-stack-screens">
          <h1>A</h1>
        </div>
        <div class="view-stack-modals">
          <h1>D</h1>
        </div>
      </div>
    `)
  )
  t.end()
})

test('should render multiple layers', function(t) {
  var routes = require('./routes.js').slice()
  var stack = ViewStack({routes: routes})
  t.equal(
    strip(stack('/c').outerHTML),
    strip(`
      <div class="view-stack">
        <div class="view-stack-screens">
          <h1>A</h1>
        </div>
        <div class="view-stack-sheets">
          <h1>C</h1>
        </div>
      </div>
    `)
  )
  t.end()
})

}()
