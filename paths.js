module.exports = {
  'screens': {
    '/': function(store) {
      return require('./components/a')(store)
    },
    '/a': function(store) {
      return require('./components/a')(store)
    },
    '/b': function(store) {
      return require('./components/b')(store)
    }
  },
  'sheets': {
    '/c': function(store) {
      return require('./components/c')(store)
    }
  },
  'modals': {
    '/d': function(store) {
      return require('./components/d')(store)
    }
  }
}
