var delegate_error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  if (undefined == data.username || '' == data.username) {
    delegate_error('Empty user username', __dirname+'/'+__filename);
    return;
  } // @todo : check user_id validity

  var regexp = new RegExp(['^',data.username,'$'].join(''),'i');
  User.findOne({ username: regexp }, function(err, userTo) {
    if (err) {
      delegate_error('Unable to retrieve user ' + err, __dirname + '/' + __filename);
      return;
    }
    if (!userTo) {
      delegate_error('Unable to retrieve this user: '+data.username, __dirname + '/' + __filename);
      return;
    }

    User.findOneAndUpdate({_id: socket.getUserId()}, {$pull: { onetoones: userTo._id }}, function(err, userFrom) {
      if (err) return console.log('User.findOneAndUpdate: ' + err);

      // Activity
      activityRecorder('user:close', socket.getUserId(), data);
    });
  });

};
