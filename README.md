# 🎊view stack🎉
Router for stacking views.
#🚧Work in progress use at your own risk!👷

## Install
`npm i view-stack`

## Usage
view stack signature is:

viewStack(routes,initialRoute)

routes is an Array of route objects
route is an Object with the keys:
  - path: The url or pattern to match
  - data: Object with the keys:
      - persist: Whether to persist layer between renders
      - layer: Name of layer (Modals, Sheets etc.)
      - callback: function that returns the componen to render into the layer

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
  }],{
    path: '/',
    data: {
      persist: true,
      layer: 'screens',
      callback: function() {
        return require('./components/a')
      }
    }
  }
)

document.body.appendChild(viewStack.view)
//Initial view will be component `A`
viewStack.navigate('/b')
//Navigating to `/b` will load `B` above`A` since `A` is persitent
```

## Test
`npm test`


