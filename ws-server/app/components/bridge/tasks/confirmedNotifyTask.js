'use strict';
module.exports = function (opts) {
  return new Task(opts);
};

var Task = function (options) {
  this.options = options;
  this.app = options.app;
};

Task.prototype.notify = function (data, callback) {
  // serverType, route, data, channelName, opts, cb
  this.app.get('globalChannelService').pushMessage('connector', 'user:confirmed', {}, 'user:' + data.user_id, {}, callback);
};

