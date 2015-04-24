var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var debug = require('debug')('donut:server:ws:room-emitter');
var _ = require('underscore');
var async = require('async');
var HistoryRoom = require('../../../shared/models/historyroom');

var recorder = HistoryRoom.record();

/**
 * Store history in MongoDB, emit event in corresponding room and call:
 *
 *   callback(err, sentEvent)
 *
 * @param roomName
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function(app, roomName, eventName, eventData, callback) {

  // always had room name and time to event
  eventData.name = roomName;
  eventData.time = Date.now();
  recorder(eventName, eventData, function(err, history) {
    if (err)
      return fn('Error while emitting room event '+eventName+' in '+roomName+': '+err);

    // emit event to room users
    eventData.id = history._id.toString();
    app.globalChannelService.pushMessage('connector', eventName, eventData, roomName, {}, function(err) {
      if (err)
        return callback('Error while pushing message: '+err);

      return callback(null, eventData);
    });
  });

};
