var delegate_error = require('./error');
var Room = require('../models/room');

// @todo : load validator and escape topic
// @todo : test ACL

module.exports = function(io, socket, data) {
  if (!Room.validateName(data.name)) {
    delegate_error('Invalid room name '+data.name, __dirname+'/'+__filename);
    return;
  }
  if (!Room.validateTopic(data.topic)) {
    delegate_error('Invalid room topic '+data.topic, __dirname+'/'+__filename);
    return;
  }

  // Save
  Room.update({name: data.name}, {topic: data.topic}, function(err, numberAffected) {
    if (err) {
      delegate_error('Unable to change room '+data.name+' topic '+data.topic, __dirname+'/'+__filename);
      return;
    }

    io.sockets.in(data.name).emit('room:topic', {
      name: data.name,
      topic: data.topic
    });

    // @todo: activity

  });
};
