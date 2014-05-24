var error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  var fromUsername = socket.getUsername();
  var toUsername = data.to;

  var regexp = new RegExp(['^',toUsername,'$'].join(''),'i');
  User.findOne({ username: regexp }, 'username', function(err, userTo) {
    if (err) return error('Unable to retrieve user ' + err);
    if (!userTo)
      return error('Unable to retrieve this user: ' + data.username);

    var from = socket.getUserId();
    var to = userTo._id; // @todo : test that data.to exists in database

    var message = {
      from: fromUsername,
      to: userTo.username,
      time: Date.now(),
      message: data.message,
      user_id: from,
      username: fromUsername
    };

    io.sockets.in('user:' + from).emit('user:message', message);
    if (fromUsername !==  toUsername) { // only if sender is not also the receiver
      io.sockets.in('user:' + to).emit('user:message', message);
    }

    // Activity
    activityRecorder('user:message', socket.getUserId(), data);
  });
};
