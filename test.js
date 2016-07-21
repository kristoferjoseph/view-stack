var assert              = require('assert')
var viewStack           = require('./')
var addListener         = viewStack.addListener
var addRoute            = viewStack.addRoute
var getComponents       = viewStack.getComponents
var getPersistentLayers = viewStack.getPersistentLayers
var getUrlData          = viewStack.getUrlData
var navigate            = viewStack.navigate
var readListeners       = viewStack.readListeners
var readRoute           = viewStack.readRoute
var readRoutes          = viewStack.readRoutes
var removeTrailingSlash = viewStack.removeTrailingSlash
var register            = viewStack.register
var reset               = viewStack.reset
var resolveComponents   = viewStack.resolveComponents
var testComponentOption = viewStack.testComponentOption
var testListener        = viewStack.testListener
var testOptions         = viewStack.testOptions
var testRoutes          = viewStack.testRoutes
var testRoutesArray     = viewStack.testRoutesArray

function fail(msg) {
  console.error('  ✘ ' + msg)
}

function pass(msg) {
  console.info('  ✔︎ ' + msg)
}

function test(label, func) {
  beforeEach()
  var f = false
  console.info(label || '')
  try {
    msg = func()
  }
  catch(e) {
    f = e.message
    fail(f)
  }
  finally {
    if (!f) {
      pass('passed')
    }
  }
  afterEach()
}

function beforeEach() {
  reset()
}

function afterEach() {
}

module.exports = function() {

  test('register', function() {
    assert(register, 'register does not exist')
  })

  test('should register multiple routes', function() {
      var routes

      register([{
        route: '/',
        layer: 'screens',
        component: function() {},
        props: {}
      }, {
        route: '/',
        layer: 'modals',
        component: function() {},
        props: {}
      }])

      routes = readRoutes()
      assert(routes['/'].screens)
      assert(routes['/'].modals)
  })


  test('navigate', function() {
    assert(navigate)
  })


  test('addListener', function() {
    assert(addListener)
  })

  test('should add a listener', function() {
    assert.equal(addListener(function(){}).length, 1)
  })

  test('addRoute', function() {
    assert(addRoute)
  })

  test('should add default route', function() {
    addRoute({
      route: '/',
      layer: 'screens',
      component: ()=>{},
      props: {}
    })
    assert(readRoute('/').screens)
  })

  test('testRoutes', function() {
    assert(testRoutes)
  })

  test('should throw missing routes error', function() {
      assert.throws(testRoutes, Error, 'Missing required routes Array argument')
  })

  test('testRoutesArray', function() {
    assert(testRoutesArray)
  })

  test('should throw missing routes error', function() {
      assert.throws(testRoutesArray, Error, 'The routes argument needs to be an Array')
   })

  test('getComponents', function() {
    assert(getComponents)
  })

  test('should get correct component when path is passed', function() {
    addRoute({
      route: '/sign-in',
      layer: 'screen',
      component: (cb)=>{
        cb(null, function YO(){})
      },
      props: {}
    }, {})

    var components = getComponents(
      '/sign-in',
      function(component) {
        assert.equal(
          component[0].props.path,
          '/sign-in'
        )
      }
    )
  })

  test('getUrlData', function() {
    assert(getUrlData)
  })
  /*
  //FIXME: Figure out how to run these tests
  test('should get root path', function() {
    window.location.pathname = '/'
    assert.equal(
      getUrlData(),
      {
        path: '/',
        query: {},
        params: {}
      }
    )
  })

  test('should get complex path', function() {
      //Register a id url pattern to
      //  match against for params
      window.location.pathname = '/thing/chill/1234'
      window.location.search = '?priority=1'
      addRoute({
        route: '/thing/:project/:id',
        layer: 'screen',
        component: function(){},
        props: {}
      }, {})
      assert.equal(
        getUrlData(),
        {
          params: {
            project: 'chill',
            id: '1234'
          },
          path: '/thing/chill/1234',
          query: {
            priority: '1'
          }
        }
      )
    })

  test('should allow path to be passed in', function() {
    window.location.pathname = '/'
    assert.equal(
      getUrlData('/tasks'),
      {
        path: '/tasks',
        query: {},
        params: {}
      }
    )
  })
  */

  test('testOptions', function() {
    assert(testOptions)
  })

  test('should throw missing options error', ()=> {
    assert.throws(testOptions, Error, 'Missing required options Object')
  })

  test('testComponentOption', function() {
    assert(testComponentOption)
  })

  test('should throw missing options error', function() {
    assert.throws(testComponentOption, Error, 'Missing component require')
  })

  test('testListener', function() {
    assert(testListener)
  })

  test('should throw missing options error', function() {
    assert.throws(testListener, Error, 'Listener must be a function')
  })

  test('removeTrailingSlash', function() {
    assert(removeTrailingSlash)
  })

  test('should not hose the root path', function() {
    assert.equal(removeTrailingSlash('/'), '/')
  })

  test('should remove a trailing slash', function() {
    assert.equal(
      removeTrailingSlash('/thing/1234/'),
      '/thing/1234'
    )
  })

}()
