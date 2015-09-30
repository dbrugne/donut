var _ = require('underscore');

module.exports = function (user, room, fn) {
  if (!user) {
    return fn('need to received a valid User model as parameter');
  }
  if (!room) {
    return fn('need to received a valid Room model as parameter');
  }

  var data = {
    name: room.name,
    room_id: room.id,
    id: room.id,
    mode: room.mode,
    hasPassword: !!room.password,
    blocked: false,
    avatar: room._avatar(),
    color: room.color,
    users_number: room.numberOfUsers(),
    created_at: room.created_at
  };
  if (room.group) {
    data.group_id = room.group.id;
    data.group_name = room.group.name;
  }
  if (room.owner) {
    data.owner_id = room.owner.id;
    data.owner_username = room.owner.username;
  }

  // kicked user
  if (room.mode === 'private' && room.isAllowed(user.id) && !room.isIn(user.id)) {
    data.blocked = 'kicked';
  }

  // banned user
  if (room.isBanned(user.id)) {
    data.blocked = true;
    var doc = room.isInBanned(user.id);
    data.banned_at = doc.banned_at;
    data.blocked = 'banned';
    if (doc.reason) {
      data.banned_reason = doc.reason;
    }
  }

  // user can join
  if (!data.blocked) {
    data.op = room.op;
    data.devoices = _.map(room.devoices, function (element) {
      return element.user.toString();
    });
    data.topic = room.topic;
    data.poster = room._poster();
    data.posterblured = room._poster(true);
    data.unviewed = user.hasUnviewedRoomMessage(room);
  }

  fn(null, data);
};
