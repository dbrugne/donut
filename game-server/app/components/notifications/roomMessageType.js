var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var cloudinary = require('../../../../shared/cloudinary/cloudinary');
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var NotificationModel = require('../../../../shared/models/notification');
var HistoryRoomModel = require('../../../../shared/models/historyroom');
var emailer = require('../../../../shared/io/emailer');
var utils = require('./utils');
var moment = require('../../../../shared/util/moment');
var conf = require('../../../../config');

var FREQUENCY_LIMITER = 15; // 15mn

module.exports = function(facade) {
  return new Notification(facade);
};

var Notification = function(facade) {
  this.facade = facade;
};

Notification.prototype.type = 'roommessage';

Notification.prototype.shouldBeCreated = function(type, room, data) {

  var that = this;
  async.waterfall([

    function retrieveUserList(callback) {
      User.findRoomUsersHavingPreference(room, that.type, data.event.user_id, callback);
    },

    utils.checkRepetitive(type, null, { 'data.from_user_id': data.from_user_id }, FREQUENCY_LIMITER),

    function checkStatus(users, callback) {
      that.facade.app.statusService.getStatusByUids(_.map(users, 'id'), function(err, statuses) {
        if (err)
          return callback('Error while retrieving users statuses: '+err);

        return callback(null, users, statuses);
      });
    },

    function prepare(users, statuses, callback) {

      var notificationsToCreate = [];

      // cleanup data
      var wet = _.clone(data.event);
      var dry = _.omit(wet, [
        'time',
        'avatar',
        'username',
        'user_id',
        'name',
        'message'
      ]);

      dry.by_user = wet.user_id;
      dry.room = room._id.toString() ;

      _.each(users, function(user){
        // Do not create the notification id the user is online
        if (statuses[user.id])
          return;

        dry.user = user._id.toString() ;

        var model = NotificationModel.getNewModel(that.type, user, dry);

        model.to_browser = false;
        model.to_email = user.preferencesValue("notif:channels:email");
        model.to_email =  ( !user.getEmail() ? false : user.preferencesValue("notif:channels:email")) ;
        model.to_mobile = user.preferencesValue("notif:channels:mobile");

        notificationsToCreate.push(model);
      });

      return callback(null, notificationsToCreate);
    },

    function createNotifications(notificationsToCreate, callback) {
      NotificationModel.bulkInsert(notificationsToCreate, callback);
    }
  ], function(err) {
    if (err)
      return logger.error('Error happened in roomMessageType|shouldBeCreated : '+err);
  });

};

Notification.prototype.sendEmail = function(model) {

  var to = model.data.user.getEmail();

  async.waterfall([

    function retrieveEvents(callback) {
      HistoryRoomModel.retrieveEventWithContext(model.data.id, model.data.user.id, 5, 10, true, callback);
    },

    function mentionize(events, callback) {
      var reg = /@\[([^\]]+)\]\(user:[^)]+\)/g;

      _.each(events, function(event, index, list) {
        if (!event.data.message)
          return;

        list[index].data.message = list[index].data.message.replace(reg, "<strong><a style=\"color:"+conf.room.default.color+";\"href=\""+conf.url+"/user/$1\">@$1</a></strong>");
      });

      callback(null, events);
    },

    function prepare(events, callback) {
      var messages = [];
      _.each (events, function(event){
        messages.push({
          current: (model.data.id === event.data.id),
          user_avatar: cloudinary.userAvatar(event.data.avatar, 90),
          username: event.data.username,
          message: event.data.message,
          time_short: moment(event.data.time).format('Do MMMM, HH:mm'),
          time_full: moment(event.data.time).format('dddd Do MMMM YYYY à HH:mm:ss')
        });
      });

      return callback(null, messages, events[0]['data']['name'], cloudinary.roomAvatar(events[0]['data']['room_avatar'], 90));
    },

    function send(messages, roomName, roomAvatar, callback) {
      emailer.roomMessage(to, messages, roomName, roomAvatar, callback);
    },

    function saveOnUser(callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], function(err) {
    if (err)
      return logger.error('Error happened in roomMessageType|sendEmail : '+err);
  });

};

Notification.prototype.sendMobile = function() {

};