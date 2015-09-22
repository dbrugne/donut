var mongoose = require('../io/mongoose');

var groupSchema = mongoose.Schema({
  name: String,
  deleted: {type: Boolean, default: false},
  visibility: {type: Boolean, default: false},
  priority: Number,
  owner: {type: mongoose.Schema.ObjectId, ref: 'User'},
  users: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  avatar: String,
  color: String,
  description: String,
  website: mongoose.Schema.Types.Mixed,
  created_at: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Group', groupSchema);
