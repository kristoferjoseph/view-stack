module.exports = {
  'screens': {
    '/': function(callback) {
      callback(require('./components/a'))
    },
    '/a': function(callback) {
      callback(require('./components/a'))
    },
    '/b': function(callback) {
      callback(require('./components/b'))
    }
  },
  'sheets': {
    '/c': function(callback) {
      callback(require('./components/c'))
    }
  },
  'modals': {
    '/d': function(callback) {
      callback(require('./components/d'))
    }
  }
}
