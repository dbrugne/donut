var helper = require('./helper');

module.exports = function (io, socket) {

  // Home data
  helper.homeData(io, function(homeData) {
    // Online user data
    helper.onlineData(io, 500, function(usersData) {
      homeData.users = usersData;
      // Send data
      socket.emit('home', homeData);
      helper.record('home', socket, {});
    });
  });

};
