'use strict';
var errors = require('../../../util/errors');
var inputUtil = require('../../../util/input');
var emailer = require('../../../../../shared/io/emailer');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.user = function (data, session, next) {
  var target = session.__user__;
  if (!data.user_id) {
    return errors.getHandler('signal:inappropriate', next)('params-user-id');
  }
  if (!target) {
    return errors.getHandler('signal:inappropriate', next)('user-not-found');
  }

  var details = {
    type: 'user',
    target_user_id: target.id,
    target_username: target.username,
    target_email: target.getEmail()
  };

  var inRoom = session.__room__;
  if (inRoom) {
    details.in_room_id = inRoom.id;
    details.in_room = inRoom.getIdentifier();
  }

  this._signal(data, details, session, next);
};

handler.event = function (data, session, next) {
  var target = session.__event__;
  if (!data.event) {
    return errors.getHandler('signal:inappropriate', next)('params-event');
  }
  if (!target) {
    return errors.getHandler('signal:inappropriate', next)('event-not-found');
  }

  var details = {
    type: 'message',

    // content
    target_event_id: target.id,
    target_event_type: target.event,
    target_event_time: target.time,
    target_message: (!target.data.message)
      ? null
      : target.data.message,
    target_files: (!target.data.files || !target.data.files.length)
      ? []
      : target.data.files,

    // user
    target_user_id: target.user.id,
    target_username: target.user.username,
    target_email: target.user.getEmail(),

    // room
    in_room_id: target.room.id,
    in_room: target.room.getIdentifier()
  };

  this._signal(data, details, session, next);
};

handler._signal = function (data, details, session, next) {
  var user = session.__currentUser__;

  details.user_id = user.id;
  details.username = user.username;
  details.email = user.getEmail();

  details.category = (data.category)
    ? data.category
    : 'none';

  details.reason = (data.reason)
    ? inputUtil.filter(data.reason, 2048)
    : null;

  emailer.signal(details, function (err) {
    if (err) {
      return errors.getHandler('signal:inappropriate', next)(err);
    }

    return next(null, {success: true});
  });
};
