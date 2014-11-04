var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');
var oneEmitter = require('./_one-emitter');

module.exports = function(io, socket, data) {

  async.waterfall([

    function check(callback) {
      if (!data.username)
        return callback('username is mandatory for user:message');

      if (!User.validateUsername(data.username))
        return callback('Invalid user username on user:message: '+data.username);

      return callback(null);
    },

    function findFromUser(callback) {
      var q = User.findByUsername(socket.getUsername());
      q.exec(function(err, user) {
        if (err)
          return callback('Error while retrieving "from" user in user:join: '+err);

        if (!user)
          return callback('Unable to find "from" user "'+socket.getUsername()+'" in user:join');

        return callback(null, user);
      });
    },

    function findToUser(from, callback) {
      var q = User.findByUsername(data.username);
      q.exec(function(err, user) {
        if (err)
          return callback('Error while retrieving "to" user in user:join: '+err);

        if (!user)
          return callback('Unable to find "to" user "'+data.username+'" in user:join');

        return callback(null, from, user);
      });
    },

    function persist(from, to, callback) {
      User.findOneAndUpdate({_id: from._id}, {$addToSet: { onetoones: to._id }}, function(err, userFrom) {
        if (err)
          return callback('Unable to persist ($addToSet) onetoones on "from" user: '+err);

        User.findOneAndUpdate({_id: to._id}, {$addToSet: { onetoones: from._id }}, function(err, userTo) {
          if (err)
            return callback('Unable to persist ($addToSet) onetoones on "to" user: '+err);

          return callback(null, from, to);
        });
      });
    },

    function prepare(from, to, callback) {
      // Input filtering
      var message = helper.inputFilter(data.message, 512);
      if (!message)
        return callback('Can not send an empty message in user:message');

      var event = {
        from_user_id  : socket.getUserId(),
        from_username : socket.getUsername(),
        from_avatar   : socket.getAvatar(),
        from_color    : socket.getColor(),
        to_user_id    : to._id.toString(),
        to_username   : to.username,
        time          : Date.now(),
        message       : message
      };

      return callback(null, from, to, event);
    },

    function send(from, to, event, callback) {
      oneEmitter(io, {from: from._id, to: to._id}, 'user:message', event, function(err) {
        if (err)
          return callback('Error while emitting user:message: '+err);

        return callback(null);
      });
    }

  ], function(err) {
    if (err)
      return helper.handleError(err);
  });

};
