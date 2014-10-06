var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');

module.exports = function(io, socket) {

  // At least an other socket is live for this user or not
  var lastSocket = (helper.userSockets(io, socket.getUserId()).length >= 2)
    ? false
    : true;

  async.waterfall([

    function prepareEvent(callback) {
      var event = {
        user_id   : socket.getUserId(),
        time      : Date.now(),
        username  : socket.getUsername(),
        avatar    : socket.getAvatar(),
        color     : socket.getColor()
      };
      return callback(null, event);
    },

    function informRooms(event, callback) {
      if (!lastSocket)
        return callback(null, event);

      // Inform room clients that this user leave the room
      User.findById(socket.getUserId(), 'rooms', function(err, user) {
        if (err)
          return callback('Unable to retrieve user\'s rooms: '+err);

        if (user.rooms.length < 1)
          return callback(null, event);

        helper._.each(user.rooms, function(name) {
          io.to(name).emit('user:offline', event);
        });
        return callback(null, event);
      });

    },

    function informOnetoones(event, callback) {
      if (!lastSocket)
        return callback(null, event);

      // @todo : same logic as for rooms but with persisted onetoones
      return callback(null, event);
    }

  ], function(err, event) {
    if (err)
      return helper.handleError(err);

    // Activity
    helper.record('disconnect', socket);

    // @todo : record 'event' in discussion log + receivers
  });

};
