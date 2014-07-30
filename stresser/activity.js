var _ = require('underscore');
var VirtualUser = require('./virtual-user');
var random = require('./random');

var configuration = {
  currentSequence: 0, // first will be '1'
  maxVirtualUsers: 8,
  activities: {
    disconnect  : { percent: 0.1 },
    reconnect   : { percent: 5 },
    message     : { percent: 2 }
  },
  pause: false
};

var users = {};
module.exports = function() {

  if (configuration.pause) return;

  // #1 - Shall we add a user?
  if (_.size(users) < configuration.maxVirtualUsers && random.probability(5)) {
    configuration.currentSequence ++;
    var virtualUser = new VirtualUser(configuration);
    virtualUser.init(function(u) { // we add the user to collection only when database and socket are up and ready
      users[u.model.username] = u;
      console.log('added user '+ u.model.username + ' ok! - actually '+ _.size(users)+' users');
    });
  }

  // #2 - Shall we do something for each user?
  _.each(users, function(user) {
    // #2.1 - Shall we do something or skip?
    if (random.probability(90)) return;

    // #2.2- Evaluate activities
    for (activity in configuration.activities) {
      if (random.probability(configuration.activities[activity].percent)) {
        user[activity]();
      }
    }
  });

};