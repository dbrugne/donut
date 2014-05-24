var handleError = require('./error');
var helper = require('./helper');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

//  helper.findUser(data.username, handleSuccess, handleError);

  var fromUsername = socket.getUsername();
  var toUsername = data.to;

  var regexp = new RegExp(['^',toUsername,'$'].join(''),'i');
  User.findOne({ username: regexp }, 'username', function(err, userTo) {
    if (err) return handleError('Unable to retrieve user ' + err);
    if (!userTo)
      return handleError('Unable to retrieve this user: ' + data.username);

    var from = socket.getUserId();
    var to = userTo._id.toString(); // @todo : test that data.to exists in database

    var message = {
      from: fromUsername,
      to: userTo.username,
      time: Date.now(),
      message: data.message,
      user_id: from,
      username: fromUsername
    };

    // Broadcast message to all 'sender' devices
    io.sockets.in('user:'+from).emit('user:message', message);

    // (if sender!=receiver) Broadcast message to all 'receiver' devices
    if (fromUsername !==  toUsername)
      io.sockets.in('user:'+to).emit('user:message', message);

    // Activity
    activityRecorder('user:message', socket.getUserId(), data);
  });
};
