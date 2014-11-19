var mongoose = require('../mongoose');

var roomSchema = mongoose.Schema({

  _id             : String,
  name            : String,
  owner           : { type: mongoose.Schema.ObjectId, ref: 'User' },
  op              : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  users           : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  permanent       : Boolean,
  priority        : Number,
  bans            : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
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
roomSchema.path('name').set(function (v) {
  if (this.isNew) {
    var salt = Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
    var clean = (v || '').replace(/\s+/g, '').toLocaleLowerCase();
    this._id = 'room'+salt+'_'+ clean;
    console.log('new room _id is: '+this._id+' ('+v+')');
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
  var pattern = /^.{0,200}$/i;
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

module.exports = mongoose.model('Room', roomSchema);