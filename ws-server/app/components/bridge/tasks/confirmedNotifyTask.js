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
  var event = {
    email: data.email
  };
  if (data.group_id) {
    event.now_is_member_of = data.group_id;
  }
  this.app.get('globalChannelService').pushMessage('connector', 'user:confirmed', event, 'user:' + data.user_id, {}, callback);
};

