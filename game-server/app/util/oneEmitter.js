var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var debug = require('debug')('donut:server:ws:room-emitter');
var _ = require('underscore');
var async = require('async');
var recorder = require('../../../shared/models/historyone').record();

/**
 * Store history in MongoDB, emit event in corresponding onetoone and call:
 *
 *   callback(err, sentEvent)
 *
 * @param app
 * @param onetoone // {from: String, to: String}
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function(app, onetoone, eventName, eventData, callback) {

  var ed = _.clone(eventData);// avoid modification on the object reference
  ed.from = onetoone.from;
  ed.to = onetoone.to;
  ed.time = Date.now();
  recorder(eventName, ed, function(err, history) {
    if (err)
      return fn('Error while saving event while emitting in onetoone '+eventName+': '+err);

    ed.id = history._id.toString();

    async.parallel([

        function sendToSender(fn) {
          // Broadcast message to all 'sender' devices
          app.globalChannelService.pushMessage('connector', eventName, ed, 'user:'+onetoone.from.toString(), {}, function(err) {
            if (err)
              return fn('Error while pushing message to sender: '+err);
            else
              return fn(null);
          });
        },

        function sendToReceiver(fn) {
          // (if sender!=receiver) Broadcast message to all 'receiver' devices
          if (onetoone.from.toString() ==  onetoone.to.toString())
            return fn(null);

          app.globalChannelService.pushMessage('connector', eventName, ed, 'user:'+onetoone.to.toString(), {}, function(err) {
            if (err)
              return fn('Error while pushing message to receiver: '+err);
            else
              return fn(null);
          });
        }

    ], function(err, results) {
      return callback(err, ed);
    });

  });

};
