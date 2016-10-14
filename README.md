# ⚡️view stack⚡️
Router for stacking views.

Check out the example here:
https://github.com/kristoferjoseph/view-stack-example

## Install
`npm i view-stack`

## Usage
view stack signature is:

viewStack(routes, path)

routes is an Array of route objects
route is an Object with the keys:
  - path: The url or pattern to match
  - data: Object with the keys:
      - persist: Whether to persist layer between renders
      - layer: Name of layer (Modals, Sheets etc.)
      - callback: function that returns the component to render into the layer

path is a url pathname fragment for use in server side render defaults to location.pathname or '/'

```
var createViewStack = require('view-stack')
var viewStack = createViewStack([
  {
    path: '/',
    data: {
      persist: true,
      layer: 'screens',
      callback: function() {
        return require('./components/a')
      }
    }
  }, {
    path: '/b',
    data: {
      layer: 'sheets',
      callback: function() {
        return require('./components/b')
      }
    }
  }, {
    path: '/c',
    data: {
      layer: 'modals',
      callback: function() {
        return require('./components/c')
      }
    }
  }
])

document.body.appendChild(viewStack.element)
// Initial view will be component `A`
// data passed to components will have a navigate method appended.
// data.navigate('/b') proceeds to next route.

// Static render a path
document.body.appendChild(viewStack.render('/c'))
```

## Test
`npm test`


