var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var schedule = require('pomelo-scheduler');
var featuredRooms = require('../util/featuredRooms');

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
  var frequency = 60000; // 60s
  this.featuredRoomsId = schedule.scheduleJob(
      { start: Date.now() + frequency, period: frequency },
      function(data) {
        featuredRooms(data.app, function(err, roomsData) {
          if (err)
            return logger.error('Schedule featuredRoomsId: '+err);
          logger.debug('Schedule featuredRoomsId ('+roomsData.length+')');
        });
      },
      { app: this.app }
  );

  process.nextTick(cb);
}

DonutScheduler.prototype.stop = function(force, cb) {
  schedule.cancel(this.featuredRoomsId);

  process.nextTick(cb);
}
