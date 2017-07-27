var test = require('tape')
var html = require('bel')
var ViewStack = require('./')

function strip(str) {
  return str.replace(/\s+/g, '')
}

test('ViewStack', function(t) {
  t.ok(ViewStack, 'ViewStack exists')
  t.end()
})

test('should parse paths', function(t) {
  var stack = ViewStack({
     paths: {
       screens: {
         '/': c=> {c(store=> { return html`<h1>Home</h1>` })}
       },
       sheets: {
         '/a': c=> {c(store=> {html`<h1>A</h1>`})}
       },
       modals: {
         '/b': c=> {c(store=> {html`<h1>B</h1>`})}
       }
     }
  })
  t.ok(stack, 'parses paths')
  t.end()
})

test('should expose navigate method', function(t) {
  var paths = Object.assign({}, require('./paths.js'))
  var stack = ViewStack({paths: paths})
  t.ok(stack.navigate, 'navigate method exists')
  t.end()
})

test('should expose subscribe method', function(t) {
  var paths = Object.assign({}, require('./paths.js'))
  var stack = ViewStack({paths: paths})
  t.ok(stack.subscribe, 'subscribe method exists')
  t.end()
})

test('should render to string from a path', function(t) {
  var paths = Object.assign({}, require('./paths.js'))
  var stack = ViewStack({paths: paths, viewClasses:'stack'})
  var el = stack('/a')
  t.equal(
    strip(el.outerHTML),
    strip(`
      <div class="view-stack">
        <section class="stack">
          <h1>A</h1>
        </section>
        <section class="stack">
        </section>
        <section class="stack">
        </section>
      </div>
    `),
    'Renders to string from path')
  t.end()
})

test('should return element',function(t){
  var paths = Object.assign({}, require('./paths.js'))
  var element = ViewStack({paths: paths}).element
  t.ok(element)
  t.end()
})

test('should create element', function(t) {
  var paths = Object.assign({}, require('./paths.js'))
  var element = ViewStack({paths: paths, viewClasses:'stack'}).element
  var root = document.getElementById('root')
  root.appendChild(element)
  t.equal(
    strip(document.getElementById('root').innerHTML),
    strip(`
      <div class="view-stack">
        <section class="stack">
          <h1>A</h1>
        </section>
        <section class="stack">
        </section>
        <section class="stack">
        </section>
      </div>
    `)
  )
  root.innerHTML = ''
  t.end()
})

test('should always render default screen', function(t) {
  var paths = Object.assign({}, require('./paths.js'))
  var element = ViewStack({paths: paths, viewClasses: 'stacks'})('/d')
  t.equal(
    strip(element.outerHTML),
    strip(`
      <div class="view-stack">
        <section class="stacks">
          <h1>A</h1>
        </section>
        <section class="stacks">
        </section>
        <section class="stacks">
          <h1>D</h1>
        </section>
      </div>
    `)
  )
  t.end()
})

test('should render multiple layers', function(t) {
  var paths = Object.assign({}, require('./paths.js'))
  var stack = ViewStack({paths: paths, viewClasses: 'stacks'})
  t.equal(
    strip(stack('/c').outerHTML),
    strip(`
      <div class="view-stack">
        <section class="stacks">
          <h1>A</h1>
        </section>
        <section class="stacks">
          <h1>C</h1>
        </section>
        <section class="stacks">
        </section>
      </div>
    `)
  )
  t.end()
})

