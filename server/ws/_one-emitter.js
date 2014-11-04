var debug = require('debug')('chat-server:room-emitter');
var _ = require('underscore');
var async = require('async');
var HistoryOne = require('../app/models/historyone');

var recorder = HistoryOne.record();

/**
 * Store history in MongoDB, emit event in corresponding one to one and call callback
 *
 * @param from User
 * @param to User
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function(io, from, to, eventName, eventData, callback) {

  async.waterfall([

    function persist(fn) {
      eventData.from = eventData.from_user_id;
      eventData.to = eventData.to_user_id;
      eventData.time = Date.now();
      recorder(eventName, eventData, function(err, history) {
        if (err)
          return fn('Error while emitting one to one event '+eventName+' '+eventData.from+'=>'+eventData.to+': '+err);

        eventData.id = history._id.toString();
        return fn(null, eventData);
      });
    },

    function send(event, fn) {
      // Broadcast message to all 'sender' devices
      io.to('user:'+event.from).emit('user:message', event);

      // (if sender!=receiver) Broadcast message to all 'receiver' devices
      if (event.from !==  event.to)
        io.to('user:'+event.to).emit('user:message', event);

      return fn(null);
    }

  ], function(err) {
    if (err)
      return callback(err);

    return callback(null);
  });

};
