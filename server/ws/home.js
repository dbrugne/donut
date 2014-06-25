var helper = require('./helper');

module.exports = function (io, socket) {

  // Home data
  helper.homeData(io, function(homeData) {
    // Online user data
    helper.onlineData(io, 5, function(usersData) {
      homeData.onlines = usersData;
      // Send data
      socket.emit('home', homeData);
      helper.record('home', socket, {});
    });
  });

};
