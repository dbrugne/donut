var _ = require('underscore');
var VirtualUser = require('./virtual-user');
var random = require('./random');

var sequence = 0; // first will be '1'
var max = 8;
var users = {};
var activities = {
//  join: { percent: 5.0 },
//  leave: { percent: 0.1 },
  disconnect: { percent: 0.1 },
  reconnect: { percent: 15 },
  message: { percent: 1.5 }
};

module.exports = function() {

  // #1 - Shall we add a user?
  if (_.size(users) < max && random.probability(5)) {
    sequence ++;
    var virtualUser = new VirtualUser(sequence);
    virtualUser.init(function(u) { // we add the user to collection only when database and socket are up and ready
      users[u.model.username] = u;
      console.log('added user '+ u.model.username + ' ok! - actually '+ _.size(users)+' users');
    });
  }

  // #2 - Shall we do something for each user?
  _.each(users, function(user) {

    // #2.1 - Shall we do something or skip?
    if (random.probability(75)) return;

    // #2.2- Evaluate activities
    for (activity in activities) {
      if (random.probability(activities[activity].percent)) {
        user[activity]();
      }
    }
  });

};