var handleError = require('./error');
var helper = require('./helper');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  helper.findUser(data.username, handleSuccess, handleError);

  function handleSuccess(userWith) {
    // Push user data to all user devices
    io.sockets.in('user:'+socket.getUserId()).emit('user:open', {
      user_id: userWith._id,
      username: userWith.username
    });

    // Persistence
    User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: {onetoones: userWith._id}}, function(err, userFrom) {
      if (err) handleError('Unable to update onetoones: '+err);
    });

    // Activity
    activityRecorder('user:open', socket.getUserId(), data);
  }

};
