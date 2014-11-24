var debug = require('debug')('donut:server:ws:room-emitter');
var _ = require('underscore');
var async = require('async');
var HistoryOne = require('../app/models/historyone');
var helper = require('./helper');

var recorder = HistoryOne.record();

/**
 * Store history in MongoDB, emit event in corresponding one to one and call callback
 *
 * @param io
 * @param onetoone {from: String, to: String}|[{from: String, to: String}]
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function(io, onetoone, eventName, eventData, callback) {

  var ed = _.clone(eventData);// avoid modification on the object reference

  var onetoones = [];
  if (Array.isArray(onetoone))
    onetoones = onetoone;
  else
    onetoones.push(onetoone);

  var parallels = [];
  _.each(onetoones, function(one) {
    parallels.push(function(fn) {
      ed.from = one.from;
      ed.to = one.to;
      ed.time = Date.now();
      var toIsOnline = helper.isUserOnline(io, one.to);
      recorder(eventName, ed, toIsOnline, function(err, history) {
        if (err)
          return fn('Error while emitting user onetoone event '+eventName+': '+err);

        ed.id = history._id.toString();

        // Broadcast message to all 'sender' devices (not needed for user status events
        if (eventName != 'user:online' && eventName != 'user:offline')
          io.to('user:'+one.from).emit(eventName, ed);

        // (if sender!=receiver) Broadcast message to all 'receiver' devices
        if (one.from.toString() !=  one.to.toString())
          io.to('user:'+one.to).emit(eventName, ed);

        return fn(null);
      });
    });
  });

  // run tasks
  async.parallel(parallels, function(err, results) {
    return callback(err);
  });

};
