var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var roomEmitter = require('../../../util/roomEmitter');
var Notifications = require('../../../components/notifications');

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function(data, session, next) {

  var user = session.__currentUser__;
  var devoicedUser = session.__user__;
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.room_id)
        return callback('room id is mandatory');

      if (!data.user_id)
        return callback('user id is mandatory');

      if (!room)
        return callback('unable to retrieve room ' + data.room_id);

      if (!user)
        return callback('unable to retrieve user ' + data.user_id);

      if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true)
        return callback('this user ' + user.id + ' isn\'t able to voice another user in ' + room.name);

      if (!devoicedUser)
        return callback('unable to retrieve devoicedUser: ' + user.id);

      if (room.isOwner(devoicedUser))
        return callback(devoicedUser.username + ' is owner and can not be voiced in '+room.name);

      if (!room.isDevoice(devoicedUser.id))
        return callback('user '+devoicedUser.username+' is already voiced in '+room.name);

      return callback(null);
    },

    function persist(callback) {
      if (!room.devoices || !room.devoices.length)
        return callback('there is no user to devoice in this room: '+room.name);

      var subDocument = _.find(room.devoices, function(devoice) {
        if (devoice.user.toString() == devoicedUser.id)
          return true;
      });
      room.devoices.id(subDocument._id).remove();
      room.save(function(err) {
        return callback(err);
      });
    },

    function broadcast(callback) {
      var event = {
        by_user_id : user.id,
        by_username: user.username,
        by_avatar  : user._avatar(),
        user_id: devoicedUser.id,
        username: devoicedUser.username,
        avatar: devoicedUser._avatar()
      };

      roomEmitter(that.app, user, room, 'room:voice', event, callback);
    },

    function notification(sentEvent, callback) {
      Notifications(that.app).getType('roomvoice').create(devoicedUser, room, sentEvent.id, callback);
    }

  ], function(err) {
    if (err) {
      logger.error('[room:voice] ' + err);
      return next(null, {code: 500, err: err});
    }

    next(null, { success: true });
  });

};
