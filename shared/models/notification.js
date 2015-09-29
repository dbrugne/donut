'use strict';
var _ = require('underscore');
var mongoose = require('../io/mongoose');

var notificationSchema = mongoose.Schema({
  type: String,
  user: { type: mongoose.Schema.ObjectId, ref: 'User' },
  data: mongoose.Schema.Types.Mixed,
  time: { type: Date, default: Date.now },

  done: { type: Boolean, default: false }, // avoid totally sending of this
                                           // notification

  to_browser: { type: Boolean, default: false },
  sent_to_browser: { type: Boolean, default: false },
  sent_to_browser_at: { type: Date },

  viewed: { type: Boolean, default: false },
  viewed_at: { type: Date },

  to_email: { type: Boolean, default: false },
  sent_to_email: { type: Boolean, default: false },
  sent_to_email_at: { type: Date },

  to_mobile: { type: Boolean, default: false },
  sent_to_mobile: { type: Boolean, default: false },
  sent_to_mobile_at: { type: Date }

});

/**
 * Return new Notification instance with some attributes pre-filled with
 * default values
 *
 * @param type
 * @param user
 * @param data
 * @returns {Notification}
 */
notificationSchema.statics.getNewModel = function (type, user, data) {
  var model = new this();

  model.type = type;
  model.user = user;
  model.data = data;

  return model;
};

/**
 * Return the Event type associated to current notification, depending of its
 * type
 *
 * @returns historyroom || historyone || undefined
 */
notificationSchema.methods.getEventType = function () {
  switch (this.type) {
    case 'roomop':
    case 'roomdeop':
    case 'roomkick':
    case 'roomban':
    case 'roomdeban':
    case 'roomvoice':
    case 'roomdevoice':
    case 'roomtopic':
    case 'roommessage':
    case 'roomjoin':
    case 'usermention':
      return 'historyroom';
    case 'userban':
    case 'userdeban':
    case 'usermessage':
      return 'historyone';
  }

  return undefined;
};

/**
 * Bulk insert (in one operation) an array of models in collection
 *
 * @source: http://stackoverflow.com/questions/25285232/bulk-upsert-in-mongodb-using-mongoose
 *
 * @param models [{Notification}]
 * @param fn(err, [{Notification}])
 */
notificationSchema.statics.bulkInsert = function (models, fn) {
  if (!models || !models.length) {
    return fn(null, models);
  }

  var bulk = this.collection.initializeOrderedBulkOp();
  if (!bulk) {
    return fn('bulkInsertModels: MongoDb connection is not yet established');
  }

  _.each(models, function (model) {
    bulk.insert(model.toJSON());
  });

  bulk.execute(function (err, results) {
    if (err) {
      return fn(err);
    }

    _.each(models, function (model, index, list) {
      list[ index ].isNew = false;
    });

    fn(null, models);
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
