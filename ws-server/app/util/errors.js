var logger = require('../../../shared/util/logger').getLogger('donut');

var errors = {
  // WRONG PARAMS (400)
  'params-room-id': 400,          // room_id params not set
  'params-user-id': 400,          // user_id params not set
  'params-id': 400,               // id params not set
  'params-ids': 400,              // ids params not set
  'params-username': 400,         // username params not set
  'params-username-user-id': 400, // username and user_id params not set
  'params-name': 400,             // name params not set
  'params-events': 400,           // events params not set
  'wrong-format': 400,            // params are not well formatted
  'params': 400,                  // == GENERAL TAG ==

  // NOT ALLOWED ERROR (403)
  'no-op': 403,                   // User not op
  'no-owner': 403,                // User not owner
  'no-op-owner': 403,             // User not op and owner
  'no-op-owner-admin': 403,       // User not op, owner and admin
  'no-allow': 403,                // User not in allowed list (private room)
  'no-admin': 403,                // User not admin
  'no-in': 403,                   // User not in the room
  'no-right-user': 403,           // User not the right user to acces the data
  'banned': 403,                  // User is banned from the room or the 1&1
  'devoiced': 403,                // User is devoiced in the room
  'not-allowed': 403,             // == GENERAL TAG ==

  // NOT FOUND ERROR (404)
  'room-not-found': 404,          // Room not found
  'user-not-found': 404,          // User not found
  'event-not-found': 404,         // Event not found
  'history-not-found': 404,       // History not found
  'notification-not-found': 404,  // Notification not found
  'not-found': 404,               // == GENERAL TAG ==

  // CONFLICT (409)
  'mail-already-exist': 409,      // Mail already used by an other user
  'same-mail': 409,               // Same mail as before

  // UNPROCESSABLE ENTITY (422)
  'wrong-password': 422           // User type a wrong password
};

module.exports = {
  errors: errors,
  getHandler: function (handlerName, callback) {
    return function (err) {
      if (!errors[err]) {
        logger.error('[' + handlerName + '] ' + err);
        return callback(null, { code: 500, err: 'internal' });
      }

      logger.warn('[' + handlerName + '] ' + err);
      callback(null, { code: errors[err], err: err });
    };
  }
};
