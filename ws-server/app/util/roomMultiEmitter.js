var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var debug = require('debug')('donut:server:ws:room-emitter');
var _ = require('underscore');
var async = require('async');
var HistoryRoom = require('../../../shared/models/historyroom');

var recorder = HistoryRoom.record();

/**
 * Store history in MongoDB, emit event in corresponding room and call callback
 *
 * @param rooms [{id: String, name: String}]
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function(app, rooms, eventName, eventData, callback) {

  if (!Array.isArray(rooms))
    return callback("roomMultiEmitter need to received an array as 'rooms' parameter");

  var parallels = [];
  _.each(rooms, function(room) {
    if (!_.isObject(room) || !room.name || !room.id)
      return logger.error("roomMultiEmitter was called with a room without 'name' and/or 'id'");

    parallels.push(function(fn) {
      var ed = _.clone(eventData);// avoid modification on the object reference
      // always had room name and time to event
      ed.name = room.name;
      ed.id = room.id;
      ed.time = Date.now();
      recorder(eventName, ed, function(err, history) {
        if (err)
          return fn('Error while emitting room event '+eventName+' in '+room.name+': '+err);

        // emit event to room users
        ed.id = history.id;
        app.globalChannelService.pushMessage('connector', eventName, ed, room.name, {}, function(err) {
          if (err)
            return logger.error('Error while pushing message: '+err);

          return fn(null);
        });
      });
    });
  });

  // run tasks
  async.parallel(parallels, function(err, results) {
    return callback(err);
  });

};
