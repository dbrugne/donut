var Activity = require('./models/activity');

module.exports = function(type, user_id, data) {
  if (data == undefined) {
    data = {};
  }
  var activity = new Activity({
    type: type,
    user_id: user_id,
    data: data
  });
  activity.save();
};