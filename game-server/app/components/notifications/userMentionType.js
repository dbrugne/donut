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

var FREQUENCY_LIMITER = 0; // 0mn

module.exports = function (facade) {
    return new Notification(facade);
};

var Notification = function (facade) {
    this.facade = facade;
};

Notification.prototype.type = 'usermention';

Notification.prototype.shouldBeCreated = function (type, user, data) {

    var that = this;
    async.waterfall([

        function checkOwn(callback) {
            if (data.event.user_id == user._id.toString())
                return callback('no notification due to my own message');
            else
                return callback(null);
        },

        utils.checkPreferences(user, data.room.name, type),

        // Do not check repetitive cause we always want to be notified of someone talking about us
        //utils.checkRepetitive(type, user, { 'data.user': data.user }, FREQUENCY_LIMITER),

        function checkStatus(callback) {
            that.facade.app.statusService.getStatusByUid(user._id.toString(), function (err, status) {
                if (err)
                    return callback('Error while retrieving user status: ' + err);

                return callback(null, status);
            });
        },

        function prepare(users, status, callback) {

            var wet = _.clone(data.event);
            var dry = _.omit(wet, [
                'avatar',
                'message',
                'name',
                'time',
                'username',
                'user_id'
            ]);

            dry.by_user = wet.user_id;
            dry.user = user._id.toString();
            if (data.room)
                dry.room = data.room.id;

            var model = NotificationModel.getNewModel(type, user, dry);

            model.to_browser = user.preferencesValue("notif:channels:desktop");
            model.to_email = (status ? false : user.preferencesValue("notif:channels:email"));
            model.to_mobile = (status ? false : user.preferencesValue("notif:channels:mobile"));

            model.save(function(err) {
                if (err)
                    return callback(err);

                logger.info('notification created: '+type+' for '+user.username);

                if (!model.sent_to_browser)
                    that.sendToBrowser(model);
            });
        }

    ], function (err) {
        if (err)
            return logger.error('Error happened in userMessageType|shouldBeCreated : ' + err);
    });

};

Notification.prototype.sendToBrowser = function (model) {

    var userId = model.data.user;
    var byUserId = model.data.by_user;
    var roomId = model.data.room;
    var that = this;

    async.waterfall([

        utils.retrieveRoom(roomId),

        utils.retrieveUser(userId),

        utils.retrieveUser(byUserId),

        function prepare(room, user, by_user, callback) {

            var notification = {
                id: model.id,
                time: model.time,
                type: model.type,
                viewed: false,
                data: {
                    by_user: {
                        avatar: by_user._avatar(),
                        id: by_user.id,
                        username: by_user.username
                    },
                    user: {
                        avatar: user._avatar(),
                        id: user.id,
                        username: user.username
                    },
                    room: {
                        id: room.id,
                        name: room.name,
                        avatar: room._avatar()
                    }
                }
            };

            return callback(null, notification);
        },

        utils.retrieveUnreadNotificationsCount(userId),

        function push(notification, count, callback) {
            notification.unviewed = count || 0;

            that.facade.app.globalChannelService.pushMessage('connector', 'notification:new', notification, 'user:'+userId, {}, function(err) {
                if (err)
                    logger.error('Error while sending notification:new message to user clients: '+err);

                logger.debug('notification sent: '+notification);
            });
        }

    ], function(err, notification) {
        if (err)
            return logger.error('Error happened in userMentionType|sendToBrowser : '+err);
    });
};

Notification.prototype.sendEmail = function (model) {

    var to = model.data.user.local.email;
    var from = model.data.by_user.username;

    async.waterfall([

        function retrieveEvents(callback) {
            HistoryRoomModel.retrieveEventWithContext(model.data.id, model.data.user.id, 5, 10, true, callback);
        },

        function mentionize(events, callback) {
            var reg = conf.regex.usermention;

            _.each(events, function(event, index, list) {
                if (!event.data.message)
                    return;

                list[index].data.message = list[index].data.message.replace(reg, "<strong><a style=\"color:"+conf.room.default.color+";\"href=\""+conf.url+"/user/$1\">@$1</a></strong>");
            });

            callback(null, events);
        },

        function prepare(events, callback) {
            var messages = [];
            _.each(events, function (event) {
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
            emailer.userMention(to, messages, roomName, roomAvatar, callback);
        },

        function saveOnUser(callback) {
            model.sent_to_email = true;
            model.sent_to_email_at = new Date();
            model.save(callback);
        }

    ], function (err) {
        if (err)
            return logger.error('Error happened in userMessageType|sendEmail : ' + err);
    });

};

Notification.prototype.sendMobile = function () {

};