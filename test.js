var test = require('tape')
var viewStack = require('./')

function strip(str) {
  return str.replace(/\s+/g, '')
}

module.exports = function() {
test('viewStack should exist', function(t) {
  t.ok(viewStack)
  t.end()
})

test('should render to string from a path', function(t) {
  var routes = require('./routes.js').slice()
  var vs = viewStack(routes)
  t.equal(
    strip(vs.renderStatic('/a')),
    strip(`
      <div class="view-stack">
        <div class="screens">
          <h1>A</h1>
        </div>
      </div>
    `),
    'Renders to string from path')
  t.end()
})

test('should add routes as array', function(t) {
  var routes = require('./routes.js').slice()
  t.doesNotThrow(
    function(){
      viewStack([{
          path: '/',
          data: {
            callback: function() {
              return function(data) {
                console.log('DATA:', data)
              }
            }
          }
        }])
    },
    Error
  )
  t.end()
})

test('should add single route', function(t) {
  var routes = require('./routes.js').slice()
  t.doesNotThrow(
    function() {
      viewStack(
        {
          path: '/a',
          data: {
            callback: function() {
              return function(data) {
                console.log('DATA:', data)
              }
            }
          }
        },
      '/a')
    },
    Error
  )
  t.end()
})

test('should return view',function(t){
  var routes = require('./routes.js').slice()
  var vs = viewStack(routes).element
  t.ok(vs)
  t.end()
})

test('should create view', function(t) {
  var routes = require('./routes.js').slice()
  var vs = viewStack(routes).element
  var root = document.getElementById('root')
  root.appendChild(vs)
  t.equal(
    strip(document.getElementById('root').innerHTML),
    strip(`
      <div class="view-stack">
        <div class="screens">
          <h1>A</h1>
        </div>
      </div>
    `)
  )
  root.innerHTML = ''
  t.end()
})

test('should not blow up when no persistent layer present', function(t) {
  var routes = require('./routes.js').slice()
  var vs = viewStack(routes[4], '/d').element
  var root = document.getElementById('root')
  root.appendChild(vs)
  t.equal(
    strip(document.getElementById('root').innerHTML),
    strip(`
      <div class="view-stack">
        <div class="modals">
          <h1>D</h1>
        </div>
      </div>
    `)
  )
  root.innerHTML = ''
  t.end()
})
//This works, just REALLY hard to test because th viewStack is no longer exposing a global navigate method
test('should render multiple layers', function(t) {
  var routes = require('./routes.js').slice()
  var vs = viewStack(routes, '/a')
  root.appendChild(vs.element)
  t.equal(
    strip(vs.renderStatic('/c')),
    strip(`
      <div class="view-stack">
        <div class="screens">
          <h1>A</h1>
        </div>
        <div class="sheets">
          <h1>C</h1>
        </div>
      </div>
    `)
  )
  t.end()
})

}()
