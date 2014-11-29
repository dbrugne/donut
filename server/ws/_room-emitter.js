var debug = require('debug')('donut:server:ws:room-emitter');
var _ = require('underscore');
var async = require('async');
var HistoryRoom = require('../app/models/historyroom');
var helper = require('./helper');

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
      var ed = _.clone(eventData);// avoid modification on the object reference
      // always had room name and time to event
      ed.name = room;
      ed.time = Date.now();
      var onlines = helper.roomUsersId(io, roomName);
      recorder(eventName, ed, onlines, function(err, history) {
        if (err)
          return fn('Error while emitting room event '+eventName+' in '+room+': '+err);

        // emit event to room sockets
        ed.id = history._id.toString();
        io.to(room).emit(eventName, ed);

        return fn(null);
      });
    });
  });

  // run tasks
  async.parallel(parallels, function(err, results) {
    return callback(err);
  });

};
