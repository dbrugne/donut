var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var emailer = require('../../../../../shared/io/emailer');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {

  var user = session.__currentUser__;

  async.waterfall([

    function check(callback) {
      if(!data.password || data.password.length < 6 || data.password.length > 50)
        return callback('length');

      return callback(null);
    },

    function save(callback) {
      user.local.password = user.generateHash(data.password);
      user.save(function (err) {
        if (err)
          return callback(err);

        emailer.passwordChanged(user.local.email, callback);
      });
    }

  ], function(err) {
    if (err) {
      logger.error('[account:password] ' + err);

      err = (['length'].indexOf(err) !== -1)
        ? err
        : 'internal';
      return next(null, { code: 500, err: err });
    }
    return next(null, { success: true });
  });
};