var delegate_error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  if (undefined == data.user_id || '' == data.user_id) {
    delegate_error('Empty user identifier', __dirname+'/'+__filename);
    return;
  } // @todo : check user_id validity

  User.findById(data.user_id, 'username', function(err, user) {
    if (err) {
      delegate_error('Unable to retrieve user ' + err, __dirname + '/' + __filename);
      return;
    }
    if (!user) {
      delegate_error('Unable to retrieve this user: '+data.user_id, __dirname + '/' + __filename);
      return;
    }

    // push user data
    socket.emit('user:open', {
      user_id: user._id,
      username: user.username
    });

    // Activity
    activityRecorder('user:open', socket.getUserId(), data);

  });

};
