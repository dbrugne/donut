var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var NotificationModel = require('../../../../shared/models/notification');
var UserModel = require('../../../../shared/models/user');
var RoomModel = require('../../../../shared/models/room');

module.exports = {

    checkRepetitive: function(type, user, what, frequency) {

        return function() {
            var args = _.toArray(arguments);
            var callback = args.pop();
            if (!_.isFunction(callback))
                return logger.error('Wrong parameters count, missing callback');

            var delay = Date.now() - 1000*60*frequency;

            var criteria = {
                type: type,
                time: {$gte: new Date(delay) }
            };

            if (user !== null) {
                criteria['user'] = user;
            }
            _.each(what, function(val,key){
                criteria[key] = val;
            });

            NotificationModel.find(criteria).count(function(err, count) {
                if (!err && count > 0)
                    err = 'no notification due to repetitive';

                args.unshift(err);
                callback.apply(undefined, args);
            });
        };

    },

    retrieveUser: function(userId) {
        return function() {
            var args = _.toArray(arguments);
            var callback = args.pop();
            if (!_.isFunction(callback))
                return logger.error('Wrong parameters count, missing callback');

            UserModel.findByUid(userId).exec(function(err, user) {
                args.unshift(err);
                args.push(user);
                callback.apply(undefined, args);
            });
        };
    },

    retrieveRoom: function(roomId) {
        return function() {
            var args = _.toArray(arguments);
            var callback = args.pop();
            if (!_.isFunction(callback))
                return logger.error('Wrong parameters count, missing callback');

            RoomModel.findByUid(roomId).exec(function(err, user) {
                args.unshift(err);
                args.push(user);
                callback.apply(undefined, args);
            });
        };
    },

    retrieveUnreadNotificationsCount: function(userId) {
        return function() {
            var args = _.toArray(arguments);
            var callback = args.pop();
            if (!_.isFunction(callback))
                return logger.error('Wrong parameters count, missing callback');

            NotificationModel.find({
                user: userId,
                done: false,
                viewed: false
            }).count().exec(function(err, count) {
                args.unshift(err);
                args.push(count);
                callback.apply(undefined, args);
            });
        };
    }
};