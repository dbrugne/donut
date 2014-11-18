var async = require('async');
var helper = require('./helper');
var logger = require('../app/models/log');
var retriever = require('../app/models/historyroom').retrieve();
var Room = require('../app/models/room');

module.exports = function(io, socket, data) {

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('name parameter is mandatory for room history');

      return callback(null);
    },

    function retrieveRoom(callback) {

      Room.retrieveRoom(data.name)
        .exec(function(err, room) {
          if (err)
            return callback('Error while retrieving room in room:history '+data.name+': '+err);

          return callback(null, room);
        });

    },

    function history(room, callback) {
      retriever(room.name, socket.getUserId(), data.since, data.until, function(err, history) {
        if (err)
          return callback(err);

        return callback(null, room, history);
      });
    },

    function send(room, history, callback) {
      socket.emit('room:history', {
        name: room.name,
        history: history
      });

      return callback(null);
    }

  ], function(err) {
    if (err)
      return helper.handleError(err);

    logger.log('room:history', socket.getUsername(), data.name);
  });

};
