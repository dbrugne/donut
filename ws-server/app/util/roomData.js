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
    id: room.id,
    mode: room.mode,
    hasPassword: !!room.password,
    owner: {},
    avatar: room._avatar(),
    color: room.color,
    users_number: room.numberOfUsers(),
    created_at: room.created_at
  };
  if (room.owner) {
    data.owner = {
      user_id: room.owner.id,
      username: room.owner.username
    };
  }

  var blocked = false;

  // banned user
  if (room.isBanned(user.id)) {
    blocked = true;
    var doc = room.isInBanned(user.id);
    data.banned_at = doc.banned_at;
    if (doc.reason) {
      data.banned_reason = doc.reason;
    }
  }

  // user can join
  if (!blocked) {
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
