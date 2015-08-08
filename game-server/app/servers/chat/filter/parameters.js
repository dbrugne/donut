var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var RoomModel = require('../../../../../shared/models/room');
var UserModel = require('../../../../../shared/models/user');
var HistoryRoomModel = require('../../../../../shared/models/historyroom');
var HistoryOneModel = require('../../../../../shared/models/historyone');

var Filter = function() {
};

module.exports = function() {
  return new Filter();
};

/**
 * Detect expected parameters in 'data', search corresponding models and put in 'session'.
 * Search for: data.name, data.username, data.event and session.uid
 *
 * Route is available in:  data.__route__ = 'chat.roomHistoryHandler.history'
 *
 * @param data
 * @param session
 * @param next
 * @returns {*}
 */
Filter.prototype.before = function(data, session, next) {
  if (!data)
    return next();

  async.parallel({

    currentUser: function (callback) {
      UserModel.findOne({_id: session.uid}).exec(callback);
    },

    room: function (callback) {
      if (!data.name || data.__route__ === 'chat.roomCreateHandler.create')
        return callback(null);

      var q = RoomModel.findByName(data.name);

      if (data.__route__ === 'chat.roomJoinHandler.join')
        q.populate('owner', 'username avatar color facebook');

      if (data.__route__ === 'chat.roomReadHandler.read')
        q.populate('owner', 'username avatar color facebook')
         .populate('op', 'username avatar color facebook')
         .populate('users', 'username avatar color facebook')
         .populate('bans.user', 'username avatar color facebook')
         .populate('devoices.user', 'username avatar color facebook');

      if (data.__route__ === 'chat.roomUsersHandler.users')
        q.populate('users', 'username avatar color facebook');

      q.exec(callback);
    },

    user: function (callback) {
      if (!data.username)
        return callback(null);

      UserModel.findByUsername(data.username).exec(callback);
    },

    event: function (callback) {
      if (!data.event)
        return callback(null);

      switch (data.__route__) {
        case 'chat.userMessageEditHandler.edit':
          HistoryOneModel.findOne({_id: data.event}).exec(callback);
          break;

        case 'chat.roomMessageEditHandler.edit':
        case 'chat.roomMessageSpamHandler.spam':
        case 'chat.roomMessageUnspamHandler.unspam':
          HistoryRoomModel.findOne({_id: data.event}).exec(callback);
          break;

        default:
          return callback(null);
      }
    }

  }, function(err, results) {
    if (err)
      return next(err);

    if (results.currentUser)
      session.__currentUser__ = results.currentUser;
    if (results.room)
      session.__room__ = results.room;
    if (results.user)
      session.__user__ = results.user;
    if (results.event)
      session.__event__ = results.event;

    return next();
  });

};

Filter.prototype.after = function (err, msg, session, resp, next) {
  next(err);
}