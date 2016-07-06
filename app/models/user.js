var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function() {
    var self = this; 

    self.on('creating', function(model, attr, options) {
      return new Promise (function(resolve, reject) {
        bcrypt.genSalt(10, function(err, theSalt) {
          self.set('pepper', theSalt);
          bcrypt.hash(self.get('password'), theSalt, null, function(err, theHash) {
            if (err) {
              reject(err);
            }
            self.set('password', theHash);
            resolve(theHash);
          });
        });  
      });
        
    }, self);

  },
  validate: function(pw, callback) {
    bcrypt.compare(pw, this.get('password'), function(err, result) {
      err ? callback(err, null) : callback(null, result);
    });
  }
});

module.exports = User;
