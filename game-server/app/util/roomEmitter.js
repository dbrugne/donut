var debug = require('debug')('donut:server:ws:room-emitter');
var _ = require('underscore');
var async = require('async');
var HistoryRoom = require('../../../shared/models/historyroom');

var recorder = HistoryRoom.record();

/**
 * Store history in MongoDB, emit event in corresponding room and call callback
 *
 * @param roomName String|[String]
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function(app, roomName, eventName, eventData, callback) {

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
      app.globalChannelService.getMembersByChannelName('connector', roomName, function(err, members) {
        if (err)
          return fn(err);

        recorder(eventName, ed, members, function(err, history) {
          if (err)
            return fn('Error while emitting room event '+eventName+' in '+room+': '+err);

          // emit event to room users
          ed.id = history._id.toString();
          app.globalChannelService.pushMessage('connector', eventName, ed, roomName, {}, function(err) {
            if (err)
              return console.log('Error while pushing message: '+err);

            return fn(null);
          });
        });
      });
    });
  });

  // run tasks
  async.parallel(parallels, function(err, results) {
    return callback(err);
  });

};
