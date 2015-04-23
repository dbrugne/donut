var debug = require('debug')('donut:notifications');
var mongoose = require('../io/mongoose');
var User = require('./user');

var notificationSchema = mongoose.Schema({

  type         : String,
  user         : { type: mongoose.Schema.ObjectId, ref: 'User' },
  data         : mongoose.Schema.Types.Mixed,
  time         : { type: Date, default: Date.now },

  done         : { type: Boolean, default: false }, // avoid totally sending of this notification

  to_browser         : { type: Boolean, default: false },
  sent_to_browser    : { type: Boolean, default: false },
  sent_to_browser_at : { type: Date },

  viewed       : { type: Boolean, default: false },
  viewed_at    : { type: Date },

  to_email          : { type: Boolean, default: false },
  sent_to_email     : { type: Boolean, default: false },
  sent_to_email_at  : { type: Date },

  to_mobile         : { type: Boolean, default: false },
  sent_to_mobile    : { type: Boolean, default: false },
  sent_to_mobile_at : { type: Date }

});

/**
 * Return new Notification instance with some attributes pre-filled with default values
 *
 * @param String
 * @param {User}
 * @param {Object}
 * @returns {Notification}
 */
notificationSchema.statics.getNewModel = function (type, user, data) {
  var model = new this();
  model.type  = type;
  model.user  = user;
  model.data  = data;

  // should be send on email or mobile
  model.to_browser = true;
  if (user.preferencesValue('notif:channels:email'))
    model.to_email = true;
  if (user.preferencesValue('notif:channels:mobile'))
    model.to_mobile = true;

  return model;
};

module.exports = mongoose.model('Notification', notificationSchema);