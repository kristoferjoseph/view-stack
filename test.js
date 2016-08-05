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

test('should add routes as array', function(t) {
  var routes = require('./routes.js').slice()
  t.doesNotThrow(
    function(){
      viewStack(
        [{
          path: '/a',
          data: {}
        }],
        routes[0].data
      )
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
          data: {}
        },
        routes[0].data
      )
    },
    Error
  )
  t.end()
})

test.skip('should have navigate method',function(t){
  var routes = require('./routes.js').slice()
  var vs = viewStack(routes, routes[0].data)
  t.ok(vs.navigate)
  t.end()
})

test('should have addRoute method',function(t){
  var routes = require('./routes.js').slice()
  var vs = viewStack(routes, routes[0].data)
  t.ok(vs.addRoute)
  t.end()
})

test('should create view', function(t) {
  var routes = require('./routes.js').slice()
  var vs = viewStack(routes, routes[0].data)
  var root = document.getElementById('root')
  root.appendChild(vs.view)
  t.equal(
    strip(document.getElementById('root').innerHTML),
    strip(`
      <div>
        <div class="screens">
          <h1>A</h1>
        </div>
      </div>
    `)
  )
  root.innerHTML = ''
  t.end()
})

test('should render multiple layers', function(t) {
  var routes = require('./routes.js').slice()
  var vs = viewStack(routes, routes[0].data)
  var root = document.getElementById('root')
  root.appendChild(vs.view)
  vs.navigate('/c')
  t.equal(
    strip(document.getElementById('root').innerHTML),
    strip(`
      <div>
        <div class="screens">
          <h1>A</h1>
        </div>
        <div class="sheets">
          <h1>C</h1>
        </div>
      </div>
    `)
  )
  root.innerHTML = ''
  t.end()
})

}()
