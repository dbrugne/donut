var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');

module.exports = function(io, socket, data) {

  async.waterfall([

    function check(callback) {
      if (!data.username)
        return callback('username is mandatory for user:leave');

      if (!User.validateUsername(data.username))
        return callback('Invalid user username on user:leave: '+data.username);

      return callback(null);
    },

    function findUser(callback) {
      var q = User.findByUsername(data.username);
      q.exec(function(err, user) {
        if (err)
          return callback('Error while retrieving user in user:join: '+err);

        if (!user)
          return callback('Unable to find user "'+data.username+'" in user:join');

        return callback(null, user);
      });
    },

    function persist(user, callback) {
      // persist on user (requester only)
      User.findOneAndUpdate({_id: socket.getUserId()}, {$pull: { onetoones: user._id }}, function(err, userThatLeave) {
        if (err)
          return callback('Unable to persist ($pull) onetoones on user: '+err);

        return callback(null, user);
      });
    },

    function send(user, callback) {

      // Inform other devices
      io.to('user:'+socket.getUserId()).emit('user:leave', {
        username: user.username
      });

      return callback(null);

    }

  ], function(err) {
    if (err)
      return helper.handleError(err);
  });

};
