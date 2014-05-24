var error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  if (undefined == data.username || '' == data.username) {
    error('Empty username');
    return;
  } // @todo : check user_id validity

  var regexp = new RegExp(['^',data.username,'$'].join(''),'i');
  User.findOne({ username: regexp }, function(err, userTo) {
    if (err) return error('Unable to retrieve user ' + err);
    if (!userTo) return error('Unable to retrieve this user: '+data.username);

    // Push user data to all user devices
    var with_user_id = userTo._id.toString();
    io.sockets.in('user:'+socket.getUserId()).emit('user:close', {
      user_id: with_user_id,
      username: userTo.username
    });

    // Persistence
    User.findOneAndUpdate({_id: socket.getUserId()}, {$pull: { onetoones: userTo._id }}, function(err, userFrom) {
      if (err) error('Unable to update user.onetoones: ' + err);
    });

    // Activity
    activityRecorder('user:close', socket.getUserId(), data);
  });

};
