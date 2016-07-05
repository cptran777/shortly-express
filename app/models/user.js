var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function() {
    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(this.get('password'), salt);
    this.set('password', hash);
    this.set('pepper', salt);
  },
  validate: function(pw) {
    return bcrypt.compareSync(pw, this.get('password'));
  }
});

module.exports = User;