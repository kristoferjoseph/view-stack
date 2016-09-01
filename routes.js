module.exports = [
  {
    path: '/',
    data: {
      layer: 'screens',
      callback: function() {
        return require('./components/a')
      }
    }
  }, {
    path: '/a',
    data: {
      layer: 'screens',
      callback: function() {
        return require('./components/a')
      }
    }
  }, {
    path: '/b',
    data: {
      layer: 'screens',
      callback: function() {
        return require('./components/b')
      }
    }
  }, {
    path: '/c',
    data: {
      layer: 'sheets',
      callback: function() {
        return require('./components/c')
      }
    }
  }, {
    path: '/d',
    data: {
      layer: 'modals',
      callback: function() {
        return require('./components/d')
      }
    }
  }
]
