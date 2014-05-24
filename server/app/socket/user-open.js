var error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  if (undefined == data.username || '' == data.username) {
    error('Empty user username');
    return;
  } // @todo : check user_id validity

  var regexp = new RegExp(['^',data.username,'$'].join(''),'i');
  User.findOne({ username: regexp }, 'username', function(err, userTo) {
    if (err) {
      error('Unable to retrieve user ' + err);
      return;
    }
    if (!userTo) {
      error('Unable to retrieve this user: '+data.username);
      return;
    }

    // Push user data to all user devices
    io.sockets.in('user:'+socket.getUserId()).emit('user:open', {
      user_id: userTo._id,
      username: userTo.username
    });

    User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: { onetoones: userTo._id }}, function(err, userFrom) {
      if (err) error('Unable to update onetoones: '+err);
    });

    // Activity
    activityRecorder('user:open', socket.getUserId(), data);
  });

};
