var helper = require('./helper');
var Room = require('../models/room');

module.exports = function (io, socket) {

  var handleSuccess = function(homeData) {
    socket.emit('home', homeData);
    helper.record('home', socket, {});
  }

  helper.homeData(handleSuccess);

};
