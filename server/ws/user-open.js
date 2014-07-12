var helper = require('./helper');

module.exports = function(io, socket, data) {

  helper.findUser(data.username, retrieveHistory, helper.handleError);

  function retrieveHistory(userWith) {
    helper.userHistory(io, socket, userWith._id.toString(), 30, function(messages) {
      handleSuccess(userWith, messages);
    });
  }

  function handleSuccess(userWith, messages) {
    var status = (helper.userSockets(io, userWith._id).length > 0)
      ? true
      : false;

    io.to('user:'+socket.getUserId()).emit('user:open', {
      user_id: userWith._id,
      username: userWith.username,
      avatar: userWith.avatarUrl('medium'),
      status: status,
      history: messages
    });

    // Activity
    helper.record('user:open', socket, data);
  }

};
