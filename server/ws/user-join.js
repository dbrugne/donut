var async = require('async');
var helper = require('./helper');
var logger = require('../app/models/log');
var oneDataHelper = require('./_one-data.js');
var User = require('../app/models/user');

module.exports = function(io, socket, data) {

  async.waterfall([

    function check(callback) {
      if (!data.username)
        return callback('username is mandatory for user:join');

      if (!User.validateUsername(data.username))
        return callback('Invalid user username on user:join: '+data.username);

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
      User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: { onetoones: user._id }}, function(err, userThatJoin) {
        if (err)
          return callback('Unable to persist ($addToSet) onetoones on user: '+err);

        return callback(null, user);
      });
    },

    function getWelcomeData(user, callback) {
      oneDataHelper(io, socket, user.username, function(err, oneData) {
        if (err)
          return callback(err);

        if (oneData == null)
          return callback('oneDataHelper was unable to return excepted one to one data: '+user.username);

        return callback(null, user, oneData);
      });
    },

    function send(user, oneData, callback) {
      io.to('user:'+socket.getUserId()).emit('user:welcome', oneData);
      return callback(null);
    }

  ], function(err) {
    if (err)
      return helper.handleError(err);

    logger.log('user:join', socket.getUsername(), data.username);
  });

};
