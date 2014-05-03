var mongoose = require('mongoose');

var activitySchema = mongoose.Schema({

  type            : String,
  time            : { type: Date, default: Date.now },
  user_id         : String,
  data            : mongoose.Schema.Types.Mixed

});

module.exports = mongoose.model('Activity', activitySchema);