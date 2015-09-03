var _ = require('underscore');
var color_picker = require('./text!./templates/color-picker.html');
var current_user = require('./text!./templates/current-user.html');
var discussion_block = require('./text!./templates/discussion-block.html');
var discussion_onetoone = require('./text!./templates/discussion-onetoone.html');
var discussion_room = require('./text!./templates/discussion-room.html');
var drawer_room_create = require('./text!./templates/drawer-room-create.html');
var drawer_room_delete = require('./text!./templates/drawer-room-delete.html');
var drawer_room_edit = require('./text!./templates/drawer-room-edit.html');
var drawer_room_users = require('./text!./templates/drawer-room-users.html');
var drawer_room_profile = require('./text!./templates/drawer-room-profile.html');
var drawer_room_preferences = require('./text!./templates/drawer-room-preferences.html');
var drawer_account = require('./text!./templates/drawer-account.html');
var drawer_user_account_password = require('./text!./templates/drawer-account-password.html');
var drawer_user_account_email = require('./text!./templates/drawer-account-email.html');
var drawer_user_edit = require('./text!./templates/drawer-user-edit.html');
var drawer_user_preferences = require('./text!./templates/drawer-user-preferences.html');
var drawer_user_profile = require('./text!./templates/drawer-user-profile.html');
var dropdown_room_actions = require('./text!./templates/dropdown-room-actions.html');
var dropdown_one_actions = require('./text!./templates/dropdown-one-actions.html');
var dropdown = require('./text!./templates/events-dropdown.html');
var event_date = require('./text!./templates/event/date.html');
var event_disconnected = require('./text!./templates/event/disconnected.html');
var event_in_out_on_off = require('./text!./templates/event/in-out-on-off.html');
var event_message = require('./text!./templates/event/message.html');
var event_ping = require('./text!./templates/event/ping.html');
var event_reconnected = require('./text!./templates/event/reconnected.html');
var event_room_deop = require('./text!./templates/event/room-deop.html');
var event_room_kick = require('./text!./templates/event/room-kick.html');
var event_room_ban = require('./text!./templates/event/room-ban.html');
var event_room_deban = require('./text!./templates/event/room-deban.html');
var event_room_op = require('./text!./templates/event/room-op.html');
var event_room_topic = require('./text!./templates/event/room-topic.html');
var event_room_voice = require('./text!./templates/event/room-voice.html');
var event_room_devoice = require('./text!./templates/event/room-devoice.html');
var event_user_ban = require('./text!./templates/event/user-ban.html');
var event_user_deban = require('./text!./templates/event/user-deban.html');
var event_help = require('./text!./templates/event/help.html');
var events = require('./text!./templates/events.html');
var home_users = require('./text!./templates/home-users.html');
var home = require('./text!./templates/home.html');
var image_uploader = require('./text!./templates/image-uploader.html');
var input = require('./text!./templates/input.html');
var input_typing = require('./text!./templates/input-typing.html');
var input_images = require('./text!./templates/input-images.html');
var rollup = require('./text!./templates/rollup.html');
var room_topic = require('./text!./templates/room-topic.html');
var room_users_list = require('./text!./templates/room-users-list.html');
var room_users = require('./text!./templates/room-users.html');
var spinner = require('./text!./templates/spinner.html');
var message_edit = require('./text!./templates/message-edit.html');
var notification_room_op = require('./text!./templates/notification/room-op.html');
var notification_room_deop = require('./text!./templates/notification/room-deop.html');
var notification_room_kick = require('./text!./templates/notification/room-kick.html');
var notification_room_ban = require('./text!./templates/notification/room-ban.html');
var notification_room_deban = require('./text!./templates/notification/room-deban.html');
var notification_room_voice = require('./text!./templates/notification/room-voice.html');
var notification_room_devoice = require('./text!./templates/notification/room-devoice.html');
var notification_room_topic = require('./text!./templates/notification/room-topic.html');
var notification_room_join = require('./text!./templates/notification/room-join.html');
var notification_user_mention = require('./text!./templates/notification/user-mention.html');
var notification_room_message = require('./text!./templates/notification/room-message.html');
var notification_user_message = require('./text!./templates/notification/user-message.html');
var rooms_cards = require('./text!./templates/rooms-cards.html');
var markup = require('./text!./templates/markup.html');

/**
 * Stub class to load compiled templates dynamically (in development for example)
 *
 * Compiled templates could be found in:
 *
 *   ../build/templates.js
 *
 * Grunt task to build:
 *
 *   >$ grunt jst
 */

var JST = { };

JST['color-picker.html'] = _.template(color_picker);
JST['current-user.html'] = _.template(current_user);
JST['discussion-block.html'] = _.template(discussion_block);
JST['discussion-onetoone.html'] = _.template(discussion_onetoone);
JST['discussion-room.html'] = _.template(discussion_room);
JST['drawer-room-create.html'] = _.template(drawer_room_create);
JST['drawer-room-delete.html'] = _.template(drawer_room_delete);
JST['drawer-room-edit.html'] = _.template(drawer_room_edit);
JST['drawer-room-users.html'] = _.template(drawer_room_users);
JST['drawer-room-profile.html'] = _.template(drawer_room_profile);
JST['drawer-room-preferences.html'] = _.template(drawer_room_preferences);
JST['drawer-account.html'] = _.template(drawer_account);
JST['drawer-account-password.html'] = _.template(drawer_user_account_password);
JST['drawer-account-email.html'] = _.template(drawer_user_account_email);
JST['drawer-user-edit.html'] = _.template(drawer_user_edit);
JST['drawer-user-preferences.html'] = _.template(drawer_user_preferences);
JST['drawer-user-profile.html'] = _.template(drawer_user_profile);
JST['dropdown-room-actions.html'] = _.template(dropdown_room_actions);
JST['dropdown-one-actions.html'] = _.template(dropdown_one_actions);
JST['events-dropdown.html'] = _.template(dropdown);
JST['event/date.html'] = _.template(event_date);
JST['event/disconnected.html'] = _.template(event_disconnected);
JST['event/in-out-on-off.html'] = _.template(event_in_out_on_off);
JST['event/message.html'] = _.template(event_message);
JST['event/ping.html'] = _.template(event_ping);
JST['event/reconnected.html'] = _.template(event_reconnected);
JST['event/room-deop.html'] = _.template(event_room_deop);
JST['event/room-kick.html'] = _.template(event_room_kick);
JST['event/room-ban.html'] = _.template(event_room_ban);
JST['event/room-deban.html'] = _.template(event_room_deban);
JST['event/room-op.html'] = _.template(event_room_op);
JST['event/room-topic.html'] = _.template(event_room_topic);
JST['event/room-voice.html'] = _.template(event_room_voice);
JST['event/room-devoice.html'] = _.template(event_room_devoice);
JST['event/user-ban.html'] = _.template(event_user_ban);
JST['event/user-deban.html'] = _.template(event_user_deban);
JST['event/help.html'] = _.template(event_help);
JST['events.html'] = _.template(events);
JST['home-users.html'] = _.template(home_users);
JST['home.html'] = _.template(home);
JST['image-uploader.html'] = _.template(image_uploader);
JST['input.html'] = _.template(input);
JST['input-typing.html'] = _.template(input_typing);
JST['input-images.html'] = _.template(input_images);
JST['rollup.html'] = _.template(rollup);
JST['room-topic.html'] = _.template(room_topic);
JST['room-users-list.html'] = _.template(room_users_list);
JST['room-users.html'] = _.template(room_users);
JST['spinner.html'] = _.template(spinner);
JST['message-edit.html'] = _.template(message_edit);
JST['notification/room-op.html'] = _.template(notification_room_op);
JST['notification/room-deop.html'] = _.template(notification_room_deop);
JST['notification/room-kick.html'] = _.template(notification_room_kick);
JST['notification/room-ban.html'] = _.template(notification_room_ban);
JST['notification/room-deban.html'] = _.template(notification_room_deban);
JST['notification/room-voice.html'] = _.template(notification_room_voice);
JST['notification/room-devoice.html'] = _.template(notification_room_devoice);
JST['notification/room-topic.html'] = _.template(notification_room_topic);
JST['notification/room-join.html'] = _.template(notification_room_join);
JST['notification/user-mention.html'] = _.template(notification_user_mention);
JST['notification/room-message.html'] = _.template(notification_room_message);
JST['notification/user-message.html'] = _.template(notification_user_message);
JST['rooms-cards.html'] = _.template(rooms_cards);
JST['markup.html'] = _.template(markup);


module.exports = JST;