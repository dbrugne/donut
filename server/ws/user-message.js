var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');

module.exports = function(io, socket, data) {

  if (!data.username)
    return helper.handleError('user:message require username param');

  async.waterfall([

    function retrieve(callback) {

      helper.retrieveUser(data.username, function (err, user) {
        if (err)
          return callback('Error while retrieving user in user:message: '+err);

        if (!user)
          return callback('Unable to retrieve user in user:message: '+data.username);

        return callback(null, user);
      });

    },

    function prepare(user, callback) {

      // Input filtering
      var message = helper.inputFilter(data.message, 512);
      if (!message)
        return callback('Can not send an empty message in user:message');

      var event = {
        from_user_id  : socket.getUserId(),
        from_username : socket.getUsername(),
        from_avatar   : socket.getAvatar(),
        from_poster   : socket.getPoster(),
        from_color    : socket.getColor(),
        to_user_id    : user._id.toString(),
        to_username   : user.username,
        to_avatar     : user.avatar,
        to_poster     : user.poster,
        to_color      : user.color,
        time          : Date.now(),
        message       : message
      };

      return callback(null, user, event);

    },

    function send(user, event, callback) {

      var from = socket.getUserId();
      var to = user._id.toString();

      // Broadcast message to all 'sender' devices
      io.to('user:'+from).emit('user:message', event);

      // (if sender!=receiver) Broadcast message to all 'receiver' devices
      if (from !==  to)
        io.to('user:'+to).emit('user:message', event);

    }

  ], function(err, user, event) {
    if (err)
      return helper.handleError(err);

    // Activity
    helper.record('user:message', socket, event);
  });

};
