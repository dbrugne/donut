var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var schedule = require('pomelo-scheduler');
var conf = require('../../../../config');

// tasks
var featuredRooms = require('./tasks/featuredRoomsTask');
var cleanupLogs = require('./tasks/cleanupLogsTask');
var notifConsumer = require('./tasks/notificationsTask');

module.exports = function(app, opts) {
  return new DonutScheduler(app, opts);
};

var DonutScheduler = function(app, opts) {
  this.app = app;
  this.interval = opts.interval | 1000;
  this.timerId = null;
};

DonutScheduler.name = '__DonutSchedule__';

DonutScheduler.prototype.start = function(cb) {
  process.nextTick(cb);
}

DonutScheduler.prototype.afterStart = function(cb) {

  // featured rooms list
  var featuredFrequency = 60000; // every 60s, start in 60s
  this.featuredRoomsId = schedule.scheduleJob(
      { start: Date.now() + featuredFrequency, period: featuredFrequency },
      featuredRooms,
      { app: this.app }
  );

  // cleanup logs
  this.cleanupLogsId = schedule.scheduleJob("0 0 0/6 * * *", cleanupLogs, {}); // every 6 hours

  // notifications
  var notificationFrequency = conf.notifications.scheduler * 1000;
  this.notifId = schedule.scheduleJob(
      { start: Date.now() + notificationFrequency, period: notificationFrequency },
      notifConsumer,
      { app: this.app }
  );

  process.nextTick(cb);
}

DonutScheduler.prototype.stop = function(force, cb) {
  schedule.cancel(this.featuredRoomsId);
  schedule.cancel(this.cleanupLogsId);
  schedule.cancel(this.notifId);

  process.nextTick(cb);
}
