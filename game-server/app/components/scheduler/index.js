var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var schedule = require('pomelo-scheduler');
var conf = require('../../../../config');

// tasks
var featuredRooms = require('./tasks/featuredRoomsTask');
var cleanupLogs = require('./tasks/cleanupLogsTask');
var notificationTask = require('./tasks/notificationsTask');

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

  // notifications by email/mobile
  var notificationFrequency = conf.notifications.scheduler * 1000;
  this.notificationSending = schedule.scheduleJob(
      { start: Date.now() + notificationFrequency, period: notificationFrequency },
      notificationTask.send,
      { app: this.app }
  );

  // notifications done
  this.notificationDone = schedule.scheduleJob("0 30 2 * * *", notificationTask.cleanup, { app: this.app }); // every days at 02:30

  process.nextTick(cb);
}

DonutScheduler.prototype.stop = function(force, cb) {
  schedule.cancel(this.featuredRoomsId);
  schedule.cancel(this.cleanupLogsId);
  schedule.cancel(this.notificationSending);
  schedule.cancel(this.notificationDone);

  process.nextTick(cb);
}
