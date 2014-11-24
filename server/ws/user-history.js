var async = require('async');
var helper = require('./helper');
var logger = require('../app/models/log');
var retriever = require('../app/models/historyone').retrieve();
var User = require('../app/models/user');

module.exports = function(io, socket, data) {

  var start = logger.start();

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
      retriever(socket.getUserId(), user._id, {since: data.since}, function(err, history) {
        if (err)
          return callback(err);

        return callback(null, user, history);
      });
    },

    function send(user, history, callback) {
      socket.emit('user:history', {
        username  : user.username,
        history   : history.history,
        more      : history.more
      });

      return callback(null);
    }

  ], function(err) {
    if (err)
      return helper.handleError(err);

    logger.log('user:history', socket.getUsername(), data.username, start);
  });

};
