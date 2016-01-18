var _ = require('underscore');

module.exports = function (user, room, fn) {
  if (!user) {
    return fn('need to received a User model as parameter');
  }
  if (!room) {
    return fn('need to received a Room model as parameter');
  }

  var data = {
    name: room.name,
    identifier: room.getIdentifier(),
    room_id: room.id,
    mode: room.mode,
    hasPassword: !!room.password,
    avatar: room._avatar(),
    users_number: room.numberOfUsers(),
    created_at: room.created_at,
    last_event_at: room.last_event_at,
    last_event: room.last_event
  };
  if (room.group) {
    data.group_id = room.group.id;
    data.group_name = room.group.name;
    data.group_owner = room.group.owner;
    data.group_default = room.group.default;
    data.group_avatar = room.group._avatar();
  }
  if (room.owner) {
    data.owner_id = room.owner.id;
    data.owner_username = room.owner.username;
  }
  if (room.disclaimer) {
    data.disclaimer = room.disclaimer;
  }
  if (room.mode !== 'public') {
    data.allow_user_request = room.allow_user_request; // @todo remove obsolete
    data.allow_group_member = (room.group) ? room.allow_group_member : false; // @todo remove obsolete
  }

  var isRoomBlocked = room.isUserBlocked(user.id);
  var isUserBlocked = user.isRoomBlocked(room.id);
  if (isRoomBlocked || isUserBlocked) {
    data.blocked = true;
    if (isRoomBlocked === 'groupbanned') {
      data.blocked_why = 'groupban';
    } else if (isRoomBlocked === 'banned') {
      data.blocked_why = 'ban';
    } else if (isRoomBlocked === 'group-members-only' || isRoomBlocked === 'notallowed') {
      data.blocked_why = 'disallow';
    } else if (isRoomBlocked === false) {
      data.blocked_why = 'kick';
    } else {
      data.blocked_why = 'other';
    }
  } else {
    data.blocked = false;
    data.op = room.op;
    data.devoices = _.map(room.devoices, function (element) {
      return element.user.toString();
    });
    data.topic = room.topic;
    data.poster = room._poster();
    data.posterblured = room._poster(true);

    var firstUnviewed = user.findRoomFirstUnviewed(room);
    data.unviewed = !!(firstUnviewed);
    data.first_unviewed = firstUnviewed;
  }

  fn(null, data);
};
