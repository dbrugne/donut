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
    identifier: room.getIdentifier(),
    room_id: room.id,
    mode: room.mode,
    hasPassword: !!room.password,
    blocked: false,
    avatar: room._avatar(),
    color: room.color,
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
  }
  if (room.owner) {
    data.owner_id = room.owner.id;
    data.owner_username = room.owner.username;
  }
  if (room.disclaimer) {
    data.disclaimer = room.disclaimer;
  }
  if (room.mode !== 'public') {
    data.allow_user_request = room.allow_user_request;
    data.allow_group_member = (room.group) ? room.allow_group_member : false;
  }

  // kicked user
  if (room.mode === 'private' && room.isAllowed(user.id) && !room.isIn(user.id)) {
    data.blocked = 'kicked';
  }

  var doc;

  // banned user
  if (room.isBanned(user.id)) {
    data.blocked = true;
    doc = room.isInBanned(user.id);
    data.banned_at = doc.banned_at;
    data.blocked = 'banned';
    if (doc.reason) {
      data.reason = doc.reason;
    }
  }

  // group banned user
  if (room.group && room.isGroupBanned(user.id)) {
    data.blocked = true;
    doc = room.isInGroupBanned(user.id);
    data.banned_at = doc.banned_at;
    data.blocked = 'groupbanned';
    if (doc.reason) {
      data.reason = doc.reason;
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

    var firstUnviewed = user.findRoomFirstUnviewed(room);
    data.unviewed = !!(firstUnviewed);
    data.first_unviewed = firstUnviewed;
  }

  fn(null, data);
};
