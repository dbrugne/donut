var helper = require('./helper');
var User = require('../models/user');

var _ = require('underscore');

module.exports = function(io, socket, data) {

  helper.findUser(data.username, handleSuccess, helper.handleError);

  function handleSuccess(user) {
    var status = (helper.userSockets(io, user._id).length > 0)
      ? true
      : false;

    socket.emit('user:status', {
      username: user.username,
      status: status
    });

    // Activity
    helper.record('user:status', socket, data);
  }

};
