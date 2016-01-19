var _ = require('underscore');

module.exports = function (user, room, fn) {
  if (!user) {
    return fn('need to received a User model as parameter');
  }
  if (!room) {
    return fn('need to received a Room model as parameter');
  }

  var data = {
    room_id: room.id,
    name: room.name,
    identifier: room.getIdentifier(),
    mode: room.mode,
    avatar: room._avatar()
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

  var isRoomBlocked = room.isUserBlocked(user.id);
  var isUserBlocked = user.isRoomBlocked(room.id);
  if (isRoomBlocked || isUserBlocked) {
    data.blocked = true;
    data.allow_user_request = room.allow_user_request;
    data.hasPassword = !!room.password;
    data.allow_group_member = !!(room.allow_group_member && room.group);
    if (isRoomBlocked === 'groupbanned' || user.isRoomGroupBanned(room.id)) {
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
  }

  if (data.blocked !== true) {
    data.blocked = false;
    data.topic = room.topic;
    data.poster = room._poster();
    data.posterblured = room._poster(true);
    data.users_number = room.numberOfUsers(); // @todo remove obsolete
    data.created_at = room.created_at;
    data.last_event_at = room.last_event_at;
    data.last_event = room.last_event;

    data.op = room.op;
    data.devoices = _.map(room.devoices, function (element) {
      return element.user.toString();
    });

    var firstUnviewed = user.findRoomFirstUnviewed(room);
    data.unviewed = !!(firstUnviewed);
    data.first_unviewed = firstUnviewed;
  }

  fn(null, data);
};
