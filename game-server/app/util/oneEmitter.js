var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var debug = require('debug')('donut:server:ws:room-emitter');
var _ = require('underscore');
var async = require('async');
var recorder = require('../../../shared/models/historyone').record();

/**
 * Store history in MongoDB, emit event in corresponding one to one and call callback
 *
 * @param app
 * @param onetoone {from: String, to: String}|[{from: String, to: String}]
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function(app, onetoone, eventName, eventData, callback) {

  var onetoones = [];
  if (Array.isArray(onetoone))
    onetoones = onetoone;
  else
    onetoones.push(onetoone);

  var parallels = [];
  _.each(onetoones, function(one) {
    parallels.push(function(fn) {
      var ed = _.clone(eventData);// avoid modification on the object reference
      ed.from = one.from;
      ed.to = one.to;
      ed.time = Date.now();
      app.statusService.getStatusByUid(ed.to, function(err, toIsOnline) {
        if (err)
          return fn(err);

        recorder(eventName, ed, toIsOnline, function(err, history) {
          if (err)
            return fn('Error while emitting user onetoone event '+eventName+': '+err);

          ed.id = history._id.toString();

          // Broadcast message to all 'sender' devices (not needed for user status events)
          if (eventName != 'user:online' && eventName != 'user:offline')
            app.globalChannelService.pushMessage('connector', eventName, ed, 'user:'+one.from.toString(), {}, function(err) {
              if (err)
                return logger.error('Error while pushing message: '+err);
            });

          // (if sender!=receiver) Broadcast message to all 'receiver' devices
          if (one.from.toString() !=  one.to.toString())
            app.globalChannelService.pushMessage('connector', eventName, ed, 'user:'+one.to.toString(), {}, function(err) {
              if (err)
                return logger.error('Error while pushing message: '+err);
            });

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
