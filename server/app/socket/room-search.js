var delegate_error = require('./error');
var Room = require('../models/room');
var activityRecorder = require('../activity-recorder');

module.exports = function (io, socket, data) {

  var search = {};
  if (data.search) {
    search = {_id: new RegExp(data.search, "i")};
  }

  // Search
  Room.find(search, 'name topic users', function (err, rooms) {
    if (err) {
      delegate_error('Error while searching room '+data.search, __dirname+'/'+__filename);
      socket.emit('room:searcherror');
      return;
    }

    // Prepare results
    var results = [];
    for (var i=0; i<rooms.length; i++) {
      results.push({
        name: rooms[i].name,
        topic: rooms[i].topic,
        count: rooms[i].users.length
      });
    }

    // Send results
    socket.emit('room:searchsuccess', {
      rooms: results
    });

    // Activity
    activityRecorder('room:search', socket.getUserId(), {
      data: data,
      count: results.length
    });

  });

};
