var helper = require('./helper');

module.exports = function(io, socket, data) {

  helper.findUser(data.username, retrieveHistory, helper.handleError);

  function retrieveHistory(userWith) {
    helper.userHistory(io, socket, userWith._id.toString(), 30, function(messages) {
      handleSuccess(userWith, messages);
    });
  }

  function handleSuccess(userWith, messages) {
    io.sockets.in('user:'+socket.getUserId()).emit('user:open', {
      user_id: userWith._id,
      username: userWith.username,
      avatar: userWith.avatarUrl(),
      history: messages
    });

    // Activity
    helper.record('user:open', socket, data);
  }

};
