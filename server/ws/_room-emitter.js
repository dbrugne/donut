var debug = require('debug')('chat-server:room-emitter');
var _ = require('underscore');
var async = require('async');
var HistoryRoom = require('../app/models/historyroom');

var recorder = HistoryRoom.record();

/**
 * Store history in MongoDB, emit event in corresponding room and call callback
 *
 * @param roomName String|[String]
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function(io, roomName, eventName, eventData, callback) {

  var rooms = [];
  if (Array.isArray(roomName))
    rooms = roomName;
  else
    rooms.push(roomName);

  var parallels = [];
  _.each(rooms, function(room) {
    parallels.push(function(fn) {
      // always had room name and time to event
      eventData.name = room;
      eventData.time = Date.now();
      recorder(eventName, eventData, function(err, history) {
        if (err)
          return fn('Error while emitting room event '+eventName+' in '+room+': '+err);

        // emit event to room sockets
        eventData.id = history._id.toString();
        io.to(room).emit(eventName, eventData);

        return fn(null);
      });
    });
  });

  // run tasks
  async.parallel(parallels, function(err, results) {
    // @todo TEMP TEMP TEMP
    if (callback)
    return callback(err);
  });

};
