var helper = require('./helper');
var Room = require('../app/models/room');

module.exports = function (io, socket, data) {

  var search = {};
  if (data.search) {
    search = {name: new RegExp(data.search, "i")};
  }

  // Search
  Room.find(search, 'name topic users', function (err, rooms) {
    if (err) {
      helper.handleError('Error while searching rooms "'+data.search+'": '+err);
      socket.emit('room:searcherror');
      return;
    }

    // Prepare results
    var results = [];
    for (var i=0; i<rooms.length; i++) {
      results.push({
        name: rooms[i].name,
        topic: rooms[i].topic,
        count: helper.roomUsers(io, rooms[i].name).length
      });
    }

    // Send results
    socket.emit('room:searchsuccess', {
      rooms: results
    });

    // Activity
    helper.record('room:search', socket, {
      data: data,
      count: results.length
    });

  });

};
