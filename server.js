var express = require('express')
var app = express()
app.set('view engine', 'ejs')
app.set('views', './views')
app.use(express.static('public'))
app.use(function(req, res, next) {
  res.blap = function(state) {
    state = state || {}
    state.initialState = JSON.stringify(state)
    res.render('wrapper', state)
  }
  next()
})

app.get('/', function(req, res) {
  res.blap({title:'view-stack'})
})

app.get('/a', function(req, res) {
  res.blap({title:'A'})
})

app.get('/b', function(req, res) {
  res.blap({title:'B'})
})

app.get('/c', function(req, res) {
  res.blap({title:'C'})
})

app.listen(6661, function() {
  console.log('Open http://localhost:6661 in your browser.')
})
