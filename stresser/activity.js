var _ = require('underscore');
var VirtualUser = require('./virtual-user');
var random = require('./random');

var sequence = 0; // first will be '1'
var max = 10;
var users = {};
var activities = {
  join: { percent: 5.0 },
  leave: { percent: 2.5 },
  message: { percent: 3 }
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

//  // #2 - Shall we remove a user?
//  if (random.probability(activities.leave.percent)) {
//    console.log('remove user @todo');
//  }

//  // #3 - Shall we do something for each user?
//  _.each(users, function(user) {
//    // #3.1 - Shall we do or skip?
//    if (random.probability(25)) return;
//
//    // #3.1 - Choose an activity
//    var l = _.shuffle(Object.keys(activities));
//    var a = _.first(l);
//    console.log(a);
//  });

};