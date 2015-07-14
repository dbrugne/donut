var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var User = require('../../../../../shared/models/user');
var Notifications = require('../../../components/notifications');
var inputUtil = require('../../../util/input');
var keenio = require('../../../../../shared/io/keenio');
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
 * @param {Object} data messageId, message from client
 * @param {Object} session
 * @param {Function} next stemp callback
 *
 */
handler.edit = function(data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.event)
        return callback('user:message:edit require event param');
      if (!data.message)
        return callback('user:message:edit require message param');

      return callback(null);
    },

    function retrieveOneEvent(callback) {
      HistoryOne.findOne({_id: data.event}, function (err, editEvent) {
        if (err)
          return callback('Error while retrieving event in user:mesage:edit: ' + err);

        if (!editEvent)
          return callback('Unable to retrieve event in user:message:edit: ' + data.event);

        if (session.uid !== editEvent.from.toString())
          return callback(session.uid + 'should be :' + editEvent.from.toString());

        if (editEvent.event !== 'user:message')
          return callback('editEvent should be user:message for: ' + data.event);

        return callback(null, editEvent);
      });
    },

    function checkMessage(editEvent, callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);

      if (!message)
        return callback('Empty message no text)');

      return callback(null, editEvent, message);
    },

    function persist(editEvent, message, callback) {
      editEvent.update({ edited : true, data: { message: message } }, function(err) {
        if (err)
          return callback('Unable to persist edited of ' + editEvent.id);
        return callback(null, editEvent, message);
      });
    },

  ], function(err) {
    if (err)
      logger.error(err);

    next(null); // even for .notify
  });

};