var mongoose = require('mongoose');

var activitySchema = mongoose.Schema({

  type            : String,
  user_id         : mongoose.Schema.ObjectId,
  data            : Mixed

});

module.exports = mongoose.model('Activity', activitySchema);