var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');
var retriever = require('../app/models/historyroom').retrieve();

/**
 * Helper to retrieve/prepare all the one to one data needed for 'welcome' and
 * 'user:welcome' events:
 *   [- user entity]
 *   - history
 */
module.exports = function(io, socket, username, fn) {

  async.waterfall([

    function findUser(callback) {
      var q = User.findByUsername(username)
        .exec(function(err, user) {
        if (err)
          return callback('Error while retrieving user: '+err);

        if (!user) {
          helper.handleError('Unable to find this one to one user, we skip: '+username);
          return fn(null, null);
        }

        return callback(null, user);
      });
    },

    function history(user, callback) {
      // current day history only
      var history = [];
//      retriever(room.name, socket.getUserId(), 0, 0, function(err, history) {
//        if (err)
//          return callback(err);

        return callback(null, user, history);
//      });
    },

    function prepare(user, history, callback) {
      var oneData = {
        user_id: user._id.toString(),
        username: user.username,
        avatar: user._avatar(),
        poster: user.poster,
        color: user.color,
        location: user.location,
        website: user.website,
        history: history
      };

      return callback(null, oneData);
    }

  ], function(err, oneData) {
    if (err)
      return fn(err);

    return fn(null, oneData);
  });

};