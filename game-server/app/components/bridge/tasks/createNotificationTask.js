var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var Notifications = require('../../notifications/index');
var UserModel = require('../../../../../shared/models/user');

module.exports = function(opts) {
  return new Task(opts);
};

var Task = function(options) {
  this.options = options;
  this.app     = options.app;
};

Task.prototype.createNotification = function(data, callback) {
  if (!data || !_.isObject(data))
    return callback('data should be a valid object');
  if (!data.type)
    return callback('data.type should be set on data');
  if (!data.history)
    return callback('data.history should be set');

  var notifier = Notifications(this.app).getType(data.type);
  if (!notifier)
    return callback('Unable to find corresponding type: '+data.type);

  // roommessage  : room, history
  // roomtopic    : room, history
  // roomjoin     : room, history
  // room(promote): user, room, history
  // usermention  : user, room, history
  // usermessage  : user, history
  var args = [];
  if (data.user)
    args.push(data.user);
  if (data.room)
    args.push(data.room);
  args.push(data.history);
  args.push(callback);

  notifier.create.apply(notifier, args);
};