var mongoose = require('../mongoose');
var cloudinary = require('../cloudinary');

var roomSchema = mongoose.Schema({

  name          : String,
  owner         : { type: mongoose.Schema.ObjectId, ref: 'User' },
  op            : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  permanent     : Boolean,
  bans          : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  avatar        : String,
  poster        : String,
  color         : String,
  topic         : String,
  description   : String,
  website       : String

});

roomSchema.statics.validateName = function (name) {
  var pattern = /^#[-a-z0-9_\\|[\]{}@^`]{2,30}$/i;
  if (pattern.test(name)) {
    return true;
  }
  return false;
}

roomSchema.statics.validateTopic = function (topic) {
  var pattern = /^.{0,200}$/i;
  if (pattern.test(topic)) {
    return true;
  }
  return false;
}

roomSchema.statics.findByName = function (name) {
  var regexp = new RegExp(['^',name,'$'].join(''),'i');
  return this.findOne({ name: regexp });
}

roomSchema.methods.avatarId = function() {
  if (!this.avatar) return '';
  var data = this.avatar.split('/');
  if (!data[1]) return '';
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};

/**
 * Return avatar URL for the current room
 * @param format (large|xlarge)
 * @returns {*}
 */
roomSchema.methods.avatarUrl = function(format) {
  if (!format) format = 'large';
  var options = {};
  options.transformation = 'room-'+format;

  var cloudinaryId = (this.avatar) ?
    this.avatar
    : this._id.toString();

  return cloudinary.url(cloudinaryId, options);
  // cloudinary handle default image
};

/**
 * Return poster URL for the current room
 * @returns {*}
 */
roomSchema.methods.posterUrl = function() {
  var cloudinaryId = (this.poster) ?
    this.poster
    : this._id.toString()+'-poster';

  return cloudinary.url(cloudinaryId, {transformation: 'room-poster'});
  // cloudinary handle default image
};

module.exports = mongoose.model('Room', roomSchema);