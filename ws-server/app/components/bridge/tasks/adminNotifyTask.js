module.exports = function(opts) {
  return new Task(opts);
};

var Task = function(options) {
  this.options = options;
  this.app     = options.app;
};

Task.prototype.notifyReload = function(data, callback) {
  // serverType, route, data, channelName, opts, cb
  this.app.get('globalChannelService').pushMessage('connector', 'admin:reload', {}, 'global', {}, callback);
};
Task.prototype.notifyExit = function(data, callback) {
  // serverType, route, data, channelName, opts, cb
  this.app.get('globalChannelService').pushMessage('connector', 'admin:exit', {}, 'user:'+data.user_id, {}, callback);
};
Task.prototype.notifyMessage = function(data, callback) {
  // serverType, route, data, channelName, opts, cb
  this.app.get('globalChannelService').pushMessage('connector', 'admin:message', { message: data.message }, 'global', {}, callback);
};