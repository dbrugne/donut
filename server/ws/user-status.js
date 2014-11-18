var helper = require('./helper');
var logger = require('../app/models/log');

module.exports = function(io, socket, data) {

  if (!data.username)
    return helper.handleError('username is mandatory in user:status');

  helper.findUser(data.username, handleSuccess, helper.handleError);

  function handleSuccess(user) {
    var status = (helper.userSockets(io, user._id).length > 0)
      ? true
      : false;

    socket.emit('user:status', {
      username: user.username,
      status: status
    });
  }

};
