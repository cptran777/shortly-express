var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function() {
    console.log('initalized');
    var hash = bcrypt.hashSync(this.get('password'));
    this.set('password', hash);
  }
});

module.exports = User;