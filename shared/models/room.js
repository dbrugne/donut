var debug = require('debug')('shared:models:room');
var mongoose = require('../io/mongoose');

var roomSchema = mongoose.Schema({

  _id             : String, // @todo : remove
  name            : String,
  permanent       : Boolean,
  visibility      : { type: Boolean, default: false },
  priority        : Number,
  owner           : { type: mongoose.Schema.ObjectId, ref: 'User' },
  op              : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  users           : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  bans            : [{
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    reason: String,
    banned_at: { type: Date, default: Date.now }
  }],
  avatar          : String,
  poster          : String,
  color           : String,
  topic           : String,
  description     : String,
  website         : String,
  created_at      : { type: Date, default: Date.now },
  lastjoin_at     : { type: Date }

});

/**
 * Custom setter to set '_id' on 'name' set
 * @source: Custom String _id doc: https://gist.github.com/aheckmann/3658511
 */
// @todo : remove and update existing documents (http://stackoverflow.com/questions/11763384/duplicate-a-document-in-mongodb-using-a-new-id#24034189)
roomSchema.path('name').set(function (v) {
  if (this.isNew) {
    var salt = Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
    var clean = (v || '').replace(/\s+/g, '').toLocaleLowerCase();
    this._id = 'room'+salt+'_'+ clean;
    debug('new room _id is: '+this._id+' ('+v+')');
  }
  return v;
});

roomSchema.statics.validateName = function (name) {
  var pattern = /^#[-a-z0-9\._|[\]^]{3,24}$/i;
  if (pattern.test(name)) {
    return true;
  }
  return false;
}

roomSchema.statics.validateTopic = function (topic) {
  var pattern = /^.{0,512}$/i;
  if (pattern.test(topic)) {
    return true;
  }
  return false;
};

roomSchema.statics.findByName = function (name) {
  var pattern = name.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp('^'+pattern+'$','i');
  return this.findOne({ name: regexp });
};

/**
 * Retrieve and return an hydrated room instance
 * @param name
 * @returns {Query}
 */
roomSchema.statics.retrieveRoom = function (name) {
  var pattern = name.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp('^'+pattern+'$','i');
  return this.findOne({ name: regexp })
    .populate('owner', 'username avatar color facebook')
    .populate('op', 'username avatar color facebook');
};

/**
 * Method to get the avatar/poster token used to generated the avatar URL on IHM
 *
 * cloudinary={CLOUDINARY_ID}#!#color={COLOR}[#!#facebook={FACEBOOK_TOKEN}]
 */
roomSchema.methods._avatar = function() {
  var token = [];

  if (this.avatar)
    token.push('cloudinary='+this.avatar);

  if (this.color)
    token.push('color='+this.color);

  return token.join('#!#');
};
roomSchema.methods._poster = function() {
  var token = [];

  if (this.poster)
    token.push('cloudinary='+this.poster);

  if (this.color)
    token.push('color='+this.color);

  return token.join('#!#');
};

roomSchema.methods.avatarId = function() {
  if (!this.avatar) return '';
  var data = this.avatar.split('/');
  if (!data[1]) return '';
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};

roomSchema.methods.posterId = function() {
  if (!this.poster) return '';
  var data = this.poster.split('/');
  if (!data[1]) return '';
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};

roomSchema.methods.isOwner = function(user_id) {
  if (!this.owner)
    return false;

  if (
    (typeof this.owner.toString == 'function' && this.owner.toString() == user_id) // dry
    || (this.owner._id && this.owner._id.toString() == user_id) // hydrated
  ) return true;

  return false;
};

roomSchema.methods.isOp = function(user_id) {
  if (!this.op)
    return false;

  for (var i=0; i<this.op.length; i++) {
    var u = this.op[i];
    if (
      (typeof u.toString == 'function' && u.toString() == user_id) // dry
      || (u._id && u._id.toString() == user_id) // hydrated
    ) return true;
  }

  return false;
};

roomSchema.methods.isOwnerOrOp = function(user_id) {
  if (this.isOwner(user_id) || this.isOp(user_id))
    return true;

  return false;
};

module.exports = mongoose.model('Room', roomSchema);