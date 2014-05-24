var error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {
  if (undefined == data.user_id || '' == data.user_id)
    return error('Invalid user id '+data.user_id);

  User.findById(data.user_id, 'username bio location website', function(err, user) {
    if (err) return error('Unable to retrieve user: '+err);

    var userData = user.toJSON();
    userData.user_id = userData._id;
    delete userData._id;
    socket.emit('user:profile', {
      user: userData
    });

    // Activity
    activityRecorder('user:profile', socket.getUserId(), data);

  });

};
