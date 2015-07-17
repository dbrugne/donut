var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
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
  if (!data.to)
    return callback('data.to should be a valid user _id');
  if (!data.event)
    return callback('data.event should be set');

  var that = this;
  async.waterfall([

    function(fn) {
      UserModel.findOne({ _id: data.to }, fn);
    },

    function(userTo, fn) {
      Notifications.getType(data.type).shouldBeCreated(data.type, event, data);
    },

    function(fn) {
      Notifications(that.app).create(data.type, toUser, data.event, fn);
    }

  ], callback);

  UserModel.findOne({ _id: data.to }, _.bind(function(err, toUser) {
    if (err)
      return callback(err);

    Notifications(this.app).create(data.type, toUser, data.event, function() {
      logger.info('Notification '+data.type+' created');
      return callback(null);
    });
  }, this));
};