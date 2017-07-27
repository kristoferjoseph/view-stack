# ⚡️view stack⚡️
Router for stacking views.

## Install
`npm i view-stack --save`

## Usage
view stack signature is:

```
ViewStack({
  paths: Object,
  path: String,
  store: Function
})
```

paths: An object that looks like this
```
{
  // name of layer
  screens: {
   // WARN: root route '/' must be defined
   '/': callback=> {callback(html`<h1>A</h1>`)},
   // path : function that returns an HTML Element to a callback
   '/a': callback=> {callback(html`<h1>A</h1>`)}
  },
  sheets: {
   '/b': callback=> {callback(html`<h1>B</h1>`)}
  },
  modals: {
   '/c': callback=> {callback(html`<h1>C</h1>`)}
  }
}
```

path: `'/a'` the initial url to render

store see [redeux](https://github.com/kristoferjoseph/redeux)

```
var render = require('view-stack')({
  path: '/a',
  paths: {
    // name of layer
    screens: {
     // WARN: root route '/' must be defined
     '/': callback=> {callback(html`<h1>A</h1>`)},
     // path : function that returns an HTML Element to a callback
     '/a': callback=> {callback(html`<h1>A</h1>`)}
    },
    sheets: {
     '/b': callback=> {callback(html`<h1>B</h1>`)}
    },
    modals: {
     '/c': callback=> {callback(html`<h1>C</h1>`)}
    }
  },
  store: {}
})

document.body.appendChild(viewStack.element)
// Initial view will be component `A`
// data passed to components will have a navigate method appended.
// data.navigate('/b') proceeds to next route.

// Static render a path
document.body.appendChild(render('/c'))
```

## Test
`npm it`


