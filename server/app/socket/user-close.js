var handleError = require('./error');
var helper = require('./helper');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  helper.findUser(data.username, handleSuccess, handleError);

  function handleSuccess(userWith) {
    // Push user data to all user devices
    var with_user_id = userWith._id.toString();
    io.sockets.in('user:'+socket.getUserId()).emit('user:close', {
      user_id: with_user_id,
      username: userWith.username
    });

    // Persistence
    User.findOneAndUpdate({_id: socket.getUserId()}, {$pull: {onetoones: userWith._id}}, function(err, userFrom) {
      if (err) handleError('Unable to update user.onetoones: ' + err);
    });

    // Activity
    activityRecorder('user:close', socket.getUserId(), data);
  }

};
