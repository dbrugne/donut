var helper = require('./helper');
var User = require('../models/user');

module.exports = function(io, socket, data) {

  helper.findUser(data.username, handleSuccess, helper.handleError);

  function handleSuccess(userWith) {
    // Push user data to all user devices
    io.sockets.in('user:'+socket.getUserId()).emit('user:open', {
      user_id: userWith._id,
      username: userWith.username,
      avatar: userWith.avatarUrl()
    });

    // Activity
    helper.record('user:open', socket, data);
  }

};
