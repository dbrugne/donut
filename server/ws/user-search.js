var helper = require('./helper');
var User = require('../app/models/user');

module.exports = function(io, socket, data) {

  // prevent retrieving user without username (not already came in chat)
  var search = {
    $and: [
      {username: {$exists: true}},
      {username: {$ne: ''}}
    ]
  };
  if (data.search != '') {
    search = {username: new RegExp(data.search, "i")};
  }

  User.find(search, 'username avatar', function(err, users) {
    if (err) {
      helper.handleError('Error while searching user "'+data.search+'": '+err);
      socket.emit('user:searcherror');
      return;
    }

    // Prepare results
    var results = [];
    for(var i=0; i<users.length; i++) {
      var status = (helper.userSockets(io, users[i]._id).length)
        ? 1
        : 0;
      results.push({
        user_id: users[i]._id.toString(),
        username: users[i].username,
        avatar: users[i].avatar,
        status: status
      });
    }

    // Send results
    socket.emit('user:searchsuccess', {
      users: results
    });

    // Activity
    helper.record('user:search', socket, {
      data: data,
      count: results.length
    });

  });
};
