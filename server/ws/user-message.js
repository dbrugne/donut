var helper = require('./helper');
var User = require('../app/models/user');

module.exports = function(io, socket, data) {

  helper.findUser(data.to, handleSuccess, helper.handleError);

  function handleSuccess(userTo) {
    var from = socket.getUserId();
    var to = userTo._id.toString();

    // Input filtering
    data.message = helper.inputFilter(data.message, 512);
    if (data.message == '') return;

    var messageEvent = {
      to_user_id: to,
      user_id: from,
      username: socket.getUsername(),
      avatar: socket.getAvatar(),
      time: Date.now(),
      message: data.message
    };

    // Broadcast message to all 'sender' devices
    io.sockets.in('user:'+from).emit('user:message', messageEvent);

    // (if sender!=receiver) Broadcast message to all 'receiver' devices
    if (from !==  to)
      io.sockets.in('user:'+to).emit('user:message', messageEvent);

    // Persist that "onetoone is open" on both user
    var updated = function(err, userFrom) {
      if (err) handleError('Unable to update onetoones: '+err);
    };
    User.findOneAndUpdate({_id: from}, {$addToSet: {onetoones: to}}, updated);
    if (from !==  to)
      User.findOneAndUpdate({_id: to}, {$addToSet: {onetoones: from}}, updated);

    // Activity
    helper.record('user:message', socket, messageEvent);
  }
};
