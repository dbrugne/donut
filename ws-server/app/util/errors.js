var logger = require('pomelo-logger').getLogger('donut');

var errors = {
  // WRONG PARAMS (400)
  'params-group-id': 400,             // group_id params not set
  'params-group-name': 400,
  'params-room-id': 400,              // room_id params not set
  'params-room-identifier': 400,
  'params-room-id-name': 400,         // room_id and name params not set
  'params-user-id': 400,              // user_id params not set
  'params-id': 400,                   // id params not set
  'params-ids': 400,                  // ids params not set
  'params-username': 400,             // username params not set
  'params-username-user-id': 400,     // username and user_id params not set
  'params-name': 400,                 // name params not set
  'params-event': 400,
  'params-events': 400,               // events params not set or not good
  'params-data': 400,                 // data params not set
  'params-mode': 400,                 // mode params not set
  'params-message': 400,              // message params not set or not good
  'params-email': 400,
  'params-password': 400,             // password params not set
  'wrong-format': 400,                // params are not well formatted
  'name-wrong-format': 400,           // name params are not well formatted
  'group-name-wrong-format': 400,     // group name params are not well formatted
  'mode-wrong-format': 400,           // mode params are not well formatted
  'message-wrong-format': 400,        // message params are not well formatted
  'params': 400,                      // == GENERAL TAG ==

  // NOT ALLOWED ERROR (403)
  'not-op': 403,                      // User not op
  'not-member': 403,                  // User not member
  'not-admin-owner': 403,             // User not admin or owner
  'not-admin-owner-groupowner': 403,  // User not admin, owner and group owner
  'not-op-owner-admin': 403,          // User not op, owner and admin
  'no-allow-pending': 403,            // User not in allowed pending list (private room)
  'not-in': 403,                      // User not in the room
  'wrong-user': 403,                  // User not the right user to acces the data
  'not-banned': 403,                  // User is not banned from the room
  'banned': 403,                      // User is banned from the room or the 1&1
  'group-banned': 403,                // User is banned from the group
  'devoiced': 403,                    // User is devoiced in the room
  'private': 403,                     // Room is private
  'permanent': 403,                   // Room is permanent can\'t set private
  'voiced': 403,                      // User is voiced in the room
  'already-allowed': 403,             // User is allowed in the room or group
  'already-member': 403,              // User is member in the group
  'owner': 403,                       // User is owner in the room
  'oped': 403,                        // User is op in the room
  'allow-pending': 403,               // User is in allowed pending list (private room)
  'group-members-only': 403,          // Donut is accessible only for group members
  'not-confirmed': 403,               // User is not confirmed
  'not-allowed': 403,                 // == GENERAL TAG ==

  // NOT FOUND ERROR (404)
  'group-not-found': 404,             // Group not found
  'default-room-not-found': 404,      // Default room of group not found
  'current-user-not-found': 404,      // Current user not found
  'room-not-found': 404,              // Room not found
  'user-not-found': 404,              // User not found
  'event-not-found': 404,             // Event not found
  'notification-not-found': 404,      // Notification not found
  'not-found': 404,                   // == GENERAL TAG ==

  // CONFLICT (409)
  'not-available': 409,               // Username already used by an other user
  'mail-already-exist': 409,          // Mail already used by an other user
  'room-already-exist': 409,          // room name already used by an other room/group
  'group-name-already-exist': 409,    // group name already used by an other group/room
  'same-mail': 409,                   // Same mail as before
  'same-preferences': 409,            // Same preferences as before

  // UNPROCESSABLE ENTITY (422)
  'wrong-password': 422,              // User type a wrong password
  'expired-time': 422,                // Expired time
  'domain': 422                       // Email domain is garbage
};

module.exports = {
  errors: errors,
  getHandler: function (handlerName, callback) {
    // log and return error object to client
    return function (err) {
      if (!errors[err]) {
        logger.error('[' + handlerName + '] ' + err);
        return callback(null, { code: 500, err: 'internal' });
      }

      logger.warn('[' + handlerName + '] ' + err);
      callback(null, { code: errors[err], err: err });
    };
  },
  getFilterHandler: function (handlerName, callback) {
    // log, bypass handler and return error object to client
    return function (err) {
      if (!errors[err]) {
        logger.error('[' + handlerName + '] ' + err);
        return callback(err, { code: 500, err: 'internal' });
      }

      logger.warn('[' + handlerName + '] ' + err);
      callback(err, { code: errors[err], err: err });
    };
  }
};
