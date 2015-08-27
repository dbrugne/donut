var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function(data, session, next) {
  return next (null);
};
