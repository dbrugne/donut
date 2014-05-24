var handleError = require('./error');
var activityRecorder = require('../activity-recorder');
var Room = require('../models/room');

module.exports = function (io, socket) {

  Room.find({}, 'name', function (err, rooms) {
    if (err) return handleError('Unable to retrieve room list: '+err);

    handleSuccess(rooms);
  });

  function handleSuccess(rooms) {
    var roomsList = [];
    for (var i=0; i<rooms.length; i++) {
      roomsList.push(rooms[i].name);
    }

    socket.emit('home', {
      welcome: "Vous trouverez sur cette page une liste des rooms existantes et des utilisateurs en ligne. N'hésitez pas à rejoindre notre chat de support #Aide pour toute question, remarque ou demande de fonctionnalité ...",
      rooms: roomsList
    });

    activityRecorder('home', socket.getUserId(), {});
  }

};
