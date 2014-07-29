var mongoose = require('mongoose');
var random = require('./random');

var userSchema = mongoose.Schema({

  username       : String,
  name           : String,
  roles          : [String],
  bio            : String,
  location       : String,
  website        : String,
  avatar         : String,
  color          : String,
  local            : {
    email         : String,
    password      : String,
    resetToken    : String,
    resetExpires  : Date
  },
  facebook         : {
    id         : String,
    token      : String,
    email      : String,
    name       : String
  },
  rooms            : [{ type: String, ref: 'Room' }],
  onetoones        : [{ type: mongoose.Schema.ObjectId, ref: 'User' }]

});

userSchema.statics.findOrCreate = function(username, fn) {
  var model = this;
  // Find ...
  model.findOne({username: username}, function(err, user) {
    if (err) return console.log('Error in User.getOne/findOne: '+err);
    if (user) {
      console.log('user '+user._id+' found');
      return fn(user);
    }

    // ... or Create
    model.create({
      username: username,
      avatar: username+'.jpg',
      color: '#e2e2e2',
      local: {
        email: random.email(),
        password: random.string(10)
      },
      rooms: ['#General'],
      bio: username+' life is cool',
      location: 'Toulouse, FRANCE',
      website: 'http://www.overblog.com/'+username
    }, function(err, user) {
      if (err) return console.log('Error in User.getOne/create: '+err);
      console.log('user '+user._id+' created');
      return fn(user);
    });
  });
};

module.exports = mongoose.model('User', userSchema);
