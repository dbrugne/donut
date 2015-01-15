/**
 * historyroom:
 * - add user (<- data.user_id)
 * - add by_user (<- data.by_user_id)
 * - dry data.time
 *           .name
 *           .user_id
 *           .username
 *           .avatar
 *           .by_user_id
 *           .by_username
 *           .by_avatar
 *
 * historyone:
 * - add user (<- data.user_id)
 * - add by_user (<- data.by_user_id)
 * - dry data.time
 *           .to
 *           .from
 *           .from_username
 *           .from_user_id
 *           .from_avatar
 *           .to_user_id
 *           .to_username
 */

/**
 * Process:
 * - iterate thru all models
 * - set model by rules
 * - save model
 * - output
 */


/**
 * historyroom
 */
db['history-room'].update(
  { 'data.user_id': { $exists: true } },
  { $set: {'data.to_username': 'Liliane'} },
  { multi: true }
)
db['history-room'].update(
  { 'data.by_user_id': { $exists: true } },
  { $set: {'by_user': 'Liliane'} },
  { multi: true }
)
db['history-room'].find({ 'data.user_id': { $exists: true } })
db['history-room'].find({ 'data.by_user_id': { $exists: true } })
