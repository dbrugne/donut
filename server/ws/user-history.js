var async = require('async');
var helper = require('./helper');
var retriever = require('../app/models/historyone').retrieve();
var User = require('../app/models/user');

module.exports = function(io, socket, data) {

  async.waterfall([

    function check(callback) {
      if (!data.username)
        return callback('username is mandatory for user:history');

      if (!User.validateUsername(data.username))
        return callback('Invalid user username on user:history: '+data.username);

      return callback(null);
    },

    function findUser(callback) {
      var q = User.findByUsername(data.username);
      q.exec(function(err, user) {
        if (err)
          return callback('Error while retrieving user in user:history: '+err);

        if (!user)
          return callback('Unable to find user "'+data.username+'" in user:history');

        return callback(null, user);
      });
    },

    function history(user, callback) {
      retriever(user._id, socket.getUserId(), data.since, data.until, function(err, history) {
        if (err)
          return callback(err);

        return callback(null, user, history);
      });
    },

    function send(user, history, callback) {
          socket.emit('user:history', {
            username: user.username,
            history: history
          }, function(err) {
            return callback(err);
      });
    }

  ], function(err) {
    if (err)
      return helper.handleError(err);
  });

};
