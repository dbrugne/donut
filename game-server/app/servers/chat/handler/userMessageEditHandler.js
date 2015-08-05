var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var User = require('../../../../../shared/models/user');
var inputUtil = require('../../../util/input');
var HistoryOne = require('../../../../../shared/models/historyone');
var conf = require('../../../../../config');
var common = require('donut-common');

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

      if (!common.validateUsername(data.username))
        return callback('Invalid username in user:message:edit: '+data.username);

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

    function retrieveEvent(from, to, callback) {
      HistoryOne.findOne({_id: data.event}, function (err, editedEvent) {
        if (err)
          return callback('Error while retrieving event in user:mesage:edit: ' + err);

        if (!editedEvent)
          return callback('Unable to retrieve event in user:message:edit: ' + data.event);

        if (editedEvent.event !== 'user:message')
          return callback('editedEvent should be user:message for: ' + data.event);

        if (session.uid !== editedEvent.from.toString())
          return callback('User ' + session.uid + ' tries to modify a message from another user: '
            + data.event + ' (' + editedEvent.from.toString() + ')');

        return callback(null, from, to, editedEvent);
      });
    },

    function checkMessage(from, to, editedEvent, callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);

      if (!message)
        return callback('Empty message (no text)');

      if (editedEvent.data.message === message)
        return callback('Posted message has not been changed');

      // Is younger than...
      if ((Date.now() - editedEvent.time) > conf.chat.message.maxedittime * 60 * 1000)
        return callback('User ' + session.uid + ' tries to edit an old message: ' + editedEvent.id);

      return callback(null, from, to, editedEvent, message);
    },

    function persist(from, to, editedEvent, message, callback) {
      editedEvent.update({ $set: { edited : true,  edited_at: new Date(), 'data.message': message } }, function(err) {
        if (err)
          return callback('Unable to persist message edition of ' + editedEvent.id + ': ' + err);

        return callback(null, from, to, editedEvent, message);
      });
    },

    function prepareEvent(from, to, editedEvent, message, callback) {
      var event = {
        from_id: from._id,
        from_username: from.username,
        to_id: to._id,
        to_username: to.username,
        event: editedEvent.id,
        message: message
      };

      return callback(null, from, to, event);
    },

    function broadcastFrom(from, to, event, callback) {
      that.app.globalChannelService.pushMessage('connector', 'user:message:edit', event, 'user:'+from._id.toString(), {}, function (err) {
        if (err)
          logger.error('Error while emitting user:message:edit in user:' + from.id + ': ' + err); // not 'return', we delete even if error happen

        return callback(null, from, to, event);
      });
    },

    function broadcastTo(from, to, event, callback) {
      if (from.id === to.id)
        return callback(null);

      that.app.globalChannelService.pushMessage('connector', 'user:message:edit', event, 'user:'+to._id.toString(), {}, function (err) {
        if (err)
          logger.error('Error while emitting user:message:edit in user:' + to.id + ': ' + err); // not 'return', we delete even if error happen

        return callback(null);
      });
    }

  ], function(err) {
    if (err)
      logger.error(err);

    next(null); // even for .notify
  });

};