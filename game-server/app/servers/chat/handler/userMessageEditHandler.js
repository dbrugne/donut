var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var User = require('../../../../../shared/models/user');
var inputUtil = require('../../../util/input');
var HistoryOne = require('../../../../../shared/models/historyone');


module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle user message edit logic
 *
 * @param {Object} data username, messageId, message from client
 * @param {Object} session
 * @param {Function} next stemp callback
 *
 */
handler.edit = function(data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.username)
        return callback('username is mandatory for user:message:edit');

      if (!User.validateUsername(data.username))
        return callback('Invalid user username on user:message:edit: '+data.username);

      if (!data.event)
        return callback('user:message:edit require event param');

      if (!data.message)
        return callback('user:message:edit require message param');

      return callback(null);
    },

    function retrieveFromUser(callback) {
      User.findByUid(session.uid).exec(function (err, from) {
        if (err)
          return callback('Error while retrieving user '+session.uid+' in user:message:edit: '+err);

        if (!from)
          return callback('Unable to retrieve user in user:message:edit: '+session.uid);

        return callback(null, from);
      });
    },

    function retrieveToUser(from, callback) {
      User.findByUsername(data.username).exec(function (err, to) {
        if (err)
          return callback('Error while retrieving user '+data.username+' in user:message:edit: '+err);

        if (!to)
          return callback('Unable to retrieve user in user:message:edit: '+data.username);

        return callback(null, from, to);
      });
    },

    function retrieveOneEvent(from, to, callback) {
      HistoryOne.findOne({_id: data.event}, function (err, editEvent) {
        if (err)
          return callback('Error while retrieving event in user:mesage:edit: ' + err);

        if (!editEvent)
          return callback('Unable to retrieve event in user:message:edit: ' + data.event);

        if (session.uid !== editEvent.from.toString())
          return callback(session.uid + ' should be :' + editEvent.from.toString());

        if (from.onetoones.toString() !== editEvent.to.toString())
          return callback(from.onetoones.toString() + ' should be :' + editEvent.to.toString());

        if (editEvent.event !== 'user:message')
          return callback('editEvent should be user:message for: ' + data.event);

        return callback(null, from, to, editEvent);
      });
    },

    function checkMessage(from, to, editEvent, callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);
      if (!message)
        return callback('Empty message no text)');

      var time = 3600 * 1000; // 1 hours.
      var diff = Date.now() - editEvent.time;

      if (diff > time)
        return callback('Message too old : ' + (diff / 1000) + ' > ' + (time / 1000));

      return callback(null, from, to, editEvent, message);
    },

    function persist(from, to, editEvent, message, callback) {
      editEvent.update({ edited : true, data: { message: message },  edited_at: new Date() }, function(err) {
        if (err)
          return callback('Unable to persist edited of ' + editEvent.id);
        return callback(null, from, to, editEvent);
      });
    },

    function prepareEvent(from, to, editEvent, callback) {
      var event = {
        name_from: from.username,
        name_to: to.username,
        event: editEvent.id
      };

      return callback(null, from, to, event);
    },

    function broadcastFrom(from, to, event, callback) {
      that.app.globalChannelService.pushMessage('connector', 'user:message:edit', event, 'user:'+from.username, {}, function (err) {
        if (err)
          logger.error('Error while emitting user:message:edit in ' + 'user:'+from.username + ': ' + err); // not 'return', we delete even if error happen
        return callback(null, from, to, event);
      });
    },

    function broadcastTo(from, to, event, callback) {
      if (from.username === to.username)
        return callback(null, from, to, event);
      that.app.globalChannelService.pushMessage('connector', 'user:message:edit', event, 'user:'+to.username, {}, function (err) {
        if (err)
          logger.error('Error while emitting user:message:edit in ' + 'user:'+to.username + ': ' + err); // not 'return', we delete even if error happen
        return callback(null, from, to, event);
      });
    }

  ], function(err) {
    if (err)
      logger.error(err);

    next(null); // even for .notify
  });

};