var delegate_error = require('./error');
var Room = require('../models/room');
var User = require('../models/user');

// @todo test ACL
// @todo broadcast other devices
// @todo persist room.users => no! replace with list of current socket/user: io.sockets.clients('room')

module.exports = function(io, socket, data) {

  if (!Room.validateName(data.name)) {
    delegate_error('Invalid room name '+data.name, __dirname+'/'+__filename);
    return;
  }

  Room.findOne({'name': data.name}, 'name topic users', function(err, room) {
    if (err) {
      delegate_error('Unable to retrieve room '+err, __dirname+'/'+__filename);
      return;
    }

    // Create room if needed
    if (!room) {
      // @todo activity
      room = new Room({name: data.name});
      room.save(function (err, product, numberAffected) {
        onSuccess(room);
      });
    } else {
      onSuccess(room);
    }
  });

  function onSuccess(room) {
    User.update({
      _id: socket.getUserId()
    },{
      $addToSet: { rooms: room.name }
    }, function(err, numberAffected) {
      if (err) {
        console.log('room:join '+err);
        return;
      }
      // socket subscription
      socket.join(data.name);

      // Room welcome
      socket.emit('room:welcome', {
        name: room.name,
        topic: room.topic,
        users: room.users
      }); // @todo : bug! room users are not sent

      // Inform other room users
      // @todo : only on first socket join for this user (multi-device)
      io.sockets.in(data.name).emit('room:in', {
        name: data.name,
        user_id: socket.getUserId(),
        username: socket.getUsername(),
        avatar: '/'+socket.getAvatar()
      });

      // @todo : activity
    });
  };

};
