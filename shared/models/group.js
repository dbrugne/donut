var mongoose = require('../io/mongoose');

var MAX_PASSWORD_TRIES = 5;
var MAX_PASSWORD_TIME = 60 * 1000; // 1mn

var groupSchema = mongoose.Schema({
  name: String,
  group: {type: mongoose.Schema.ObjectId, ref: 'Group'},
  deleted: {type: Boolean, default: false},
  visibility: {type: Boolean, default: false},
  priority: Number,
  owner: {type: mongoose.Schema.ObjectId, ref: 'User'},
  op: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  members: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  members_pending: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    message: String,
    created_at: {type: Date, default: Date.now}
  }],
  allow_group_member: Boolean,
  password: String,
  password_indication: String,
  avatar: String,
  color: String,
  description: String,
  disclaimer: String,
  website: mongoose.Schema.Types.Mixed,
  created_at: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Group', groupSchema);
