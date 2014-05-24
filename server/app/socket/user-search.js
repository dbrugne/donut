var error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  var search = {};
  if (data.search) {
    search = {username: new RegExp(data.search, "i")};
  }

  User.find(search, 'username', function(err, users) {
    if (err) {
      error('Error while searching user '+data.search);
      socket.emit('user:searcherror');
      return;
    }

    // Prepare results
    var results = [];
    for(var i=0; i<users.length; i++) {
      results.push({
        user_id: users[i]._id,
        username: users[i].username
      });
    }

    // Send results
    socket.emit('user:searchsuccess', {
      users: results
    });

    // Activity
    activityRecorder('user:search', socket.getUserId(), {
      data: data,
      count: results.length
    });

  });
};
