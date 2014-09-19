var async = require('async');
var helper = require('./helper');
var cloudinary = require('../app/cloudinary');
var i18next = require('../app/i18next');

module.exports = function(io, socket, data) {

  if (!data.name)
    return helper.handleError('room:delete require room name param');

  async.waterfall([

    function retrieveRoom(callback) {

      helper.retrieveRoom(data.name, function (err, room) {
        if (err)
          return callback('Unable to find room: ' + err, null);

        if (!room)
          return callback('Unable to retrieve room in room:delete: '+data.name);

        return callback(null, room);
      });

    },

    function permissions(room, callback) {

      if (!helper.isOwner(io, room, socket.getUserId()))
        return callback('Current user "'+socket.getUsername()+'" is not allowed'
          +' to delete this room "'+data.name);

      if (room.permanent == true) {
        var err = i18next.t("edit.room.delete.error.permanent");
        socket.emit('room:delete', {
          name: room.name,
          success: false,
          errors: [err]
        });
        return callback(err);
      }

      return callback(null, room);

    },

    function images(room, callback) {

      // remove pictures from cloudinary
      var images = [];

      if (room.avatarId())
        images.push(room.avatarId());

      if (room.posterId())
        images.push(room.posterId());

      if (images.length > 0) {
        cloudinary.api.delete_resources(images, function(result){
          console.log(result.deleted);
        });
      }

      return callback(null, room);

    },

    function kickThemAll(room, callback) {

      // make them leave room
      var event = {
        name: room.name,
        reason: 'deleted'
      };
      io.to(data.name).emit('room:leave', event);

      // remove them from socket.io room
      var sockets = helper.roomSockets(io, room.name);
      helper._.each(sockets, function (socket) {
        socket.leave(room.name);
      });

      return callback(null, room);

    },

    function deleteRedis(room, callback) {

      // @todo

      return callback(null, room);

    },

    function deleteMongo(room, callback) {

      var _room = { name: room.name };
      room.remove(function(err) {
        if (err)
          return callback('Error while delete room '+room.name+' in Mongo: '+err);

        return callback(null, _room); // Javascript object instead Mongoose model
      });

    },

    function confirm(room, callback) {

      var event = {
        name: room.name,
        success: true
      };
      socket.emit('room:delete', event);

      return callback(null, room, event);

    },

  ], function (err, room, event) {
    if (err)
      return helper.handleError(err);

    // activity
    // helper.record('room:delete', socket, event);
    // @todo : specific event log, no in room/message history
  });

};
