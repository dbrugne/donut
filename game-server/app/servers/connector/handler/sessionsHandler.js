var _ = require('underscore');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

Handler.prototype.list = function(msg, session, next) {
  var sessions = this.app.get('sessionService').getByUid(session.uid);
  var list = _.map(sessions, function(s) {
    return {
      id        : s.id,
      uid       : s.uid,
      frontendId: s.frontendId,
      socketId  : s.__socket__.socket.id
    };
  });
  next(null, list);
};
