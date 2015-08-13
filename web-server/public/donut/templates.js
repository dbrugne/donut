define([
  'underscore',
  'text!./templates/color-picker.html',
  'text!./templates/current-user.html',
  'text!./templates/discussion-block.html',
  'text!./templates/discussion-onetoone.html',
  'text!./templates/discussion-room.html',
  'text!./templates/drawer-room-create.html',
  'text!./templates/drawer-room-delete.html',
  'text!./templates/drawer-room-edit.html',
  'text!./templates/drawer-room-users.html',
  'text!./templates/drawer-room-profile.html',
  'text!./templates/drawer-room-preferences.html',
  'text!./templates/drawer-user-account.html',
  'text!./templates/drawer-user-edit.html',
  'text!./templates/drawer-user-preferences.html',
  'text!./templates/drawer-user-profile.html',
  'text!./templates/events-dropdown.html',
  'text!./templates/event/date.html',
  'text!./templates/event/disconnected.html',
  'text!./templates/event/in-out-on-off.html',
  'text!./templates/event/message.html',
  'text!./templates/event/me.html',
  'text!./templates/event/reconnected.html',
  'text!./templates/event/room-deop.html',
  'text!./templates/event/room-kick.html',
  'text!./templates/event/room-ban.html',
  'text!./templates/event/room-deban.html',
  'text!./templates/event/room-op.html',
  'text!./templates/event/room-topic.html',
  'text!./templates/event/room-voice.html',
  'text!./templates/event/room-devoice.html',
  'text!./templates/event/user-ban.html',
  'text!./templates/event/user-deban.html',
  'text!./templates/events.html',
  'text!./templates/home-rooms.html',
  'text!./templates/home-users.html',
  'text!./templates/home.html',
  'text!./templates/image-uploader.html',
  'text!./templates/input.html',
  'text!./templates/input-image.html',
  'text!./templates/room-topic.html',
  'text!./templates/room-users-list.html',
  'text!./templates/room-users.html',
  'text!./templates/spinner.html',
  'text!./templates/welcome.html',
  'text!./templates/message-edit.html',
  'text!./templates/notification/room-op.html',
  'text!./templates/notification/room-deop.html',
  'text!./templates/notification/room-kick.html',
  'text!./templates/notification/room-ban.html',
  'text!./templates/notification/room-deban.html',
  'text!./templates/notification/room-voice.html',
  'text!./templates/notification/room-devoice.html',
  'text!./templates/notification/room-topic.html',
  'text!./templates/notification/room-join.html',
  'text!./templates/notification/user-mention.html',
  'text!./templates/notification/room-message.html',
  'text!./templates/notification/user-message.html',
  'text!./templates/mention.html'
], function (_,
  color_picker,
  current_user,
  discussion_block,
  discussion_onetoone,
  discussion_room,
  drawer_room_create,
  drawer_room_delete,
  drawer_room_edit,
  drawer_room_users,
  drawer_room_profile,
  drawer_room_preferences,
  drawer_user_account,
  drawer_user_edit,
  drawer_user_preferences,
  drawer_user_profile,
  dropdown,
  event_date,
  event_disconnected,
  event_in_out_on_off,
  event_message,
  event_me,
  event_reconnected,
  event_room_deop,
  event_room_kick,
  event_room_ban,
  event_room_deban,
  event_room_op,
  event_room_topic,
  event_room_voice,
  event_room_devoice,
  event_user_ban,
  event_user_deban,
  events,
  home_rooms,
  home_users,
  home,
  image_uploader,
  input,
  input_image,
  room_topic,
  room_users_list,
  room_users,
  spinner,
  welcome,
  message_edit,
  notification_room_op,
  notification_room_deop,
  notification_room_kick,
  notification_room_ban,
  notification_room_deban,
  notification_room_voice,
  notification_room_devoice,
  notification_room_topic,
  notification_room_join,
  notification_user_mention,
  notification_room_message,
  notification_user_message,
  mention) {

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

  var JST={};

  JST['color-picker.html']                  = _.template(color_picker);
  JST['current-user.html']                  = _.template(current_user);
  JST['discussion-block.html']              = _.template(discussion_block);
  JST['discussion-onetoone.html']           = _.template(discussion_onetoone);
  JST['discussion-room.html']               = _.template(discussion_room);
  JST['drawer-room-create.html']            = _.template(drawer_room_create);
  JST['drawer-room-delete.html']            = _.template(drawer_room_delete);
  JST['drawer-room-edit.html']              = _.template(drawer_room_edit);
  JST['drawer-room-users.html']             = _.template(drawer_room_users);
  JST['drawer-room-profile.html']           = _.template(drawer_room_profile);
  JST['drawer-room-preferences.html']       = _.template(drawer_room_preferences);
  JST['drawer-user-account.html']           = _.template(drawer_user_account);
  JST['drawer-user-edit.html']              = _.template(drawer_user_edit);
  JST['drawer-user-preferences.html']       = _.template(drawer_user_preferences);
  JST['drawer-user-profile.html']           = _.template(drawer_user_profile);
  JST['events-dropdown.html']               = _.template(dropdown);
  JST['event/date.html']                    = _.template(event_date);
  JST['event/disconnected.html']            = _.template(event_disconnected);
  JST['event/in-out-on-off.html']           = _.template(event_in_out_on_off);
  JST['event/message.html']                 = _.template(event_message);
  JST['event/me.html']                      = _.template(event_me);
  JST['event/reconnected.html']             = _.template(event_reconnected);
  JST['event/room-deop.html']               = _.template(event_room_deop);
  JST['event/room-kick.html']               = _.template(event_room_kick);
  JST['event/room-ban.html']                = _.template(event_room_ban);
  JST['event/room-deban.html']              = _.template(event_room_deban);
  JST['event/room-op.html']                 = _.template(event_room_op);
  JST['event/room-topic.html']              = _.template(event_room_topic);
  JST['event/room-voice.html']              = _.template(event_room_voice);
  JST['event/room-devoice.html']            = _.template(event_room_devoice);
  JST['event/user-ban.html']                = _.template(event_user_ban);
  JST['event/user-deban.html']              = _.template(event_user_deban);
  JST['events.html']                        = _.template(events);
  JST['home-rooms.html']                    = _.template(home_rooms);
  JST['home-users.html']                    = _.template(home_users);
  JST['home.html']                          = _.template(home);
  JST['image-uploader.html']                = _.template(image_uploader);
  JST['input.html']                         = _.template(input);
  JST['input-image.html']                   = _.template(input_image);
  JST['room-topic.html']                    = _.template(room_topic);
  JST['room-users-list.html']               = _.template(room_users_list);
  JST['room-users.html']                    = _.template(room_users);
  JST['spinner.html']                       = _.template(spinner);
  JST['welcome.html']                       = _.template(welcome);
  JST['message-edit.html']                  = _.template(message_edit);
  JST['notification/room-op.html']         = _.template(notification_room_op);
  JST['notification/room-deop.html']       = _.template(notification_room_deop);
  JST['notification/room-kick.html']       = _.template(notification_room_kick);
  JST['notification/room-ban.html']        = _.template(notification_room_ban);
  JST['notification/room-deban.html']      = _.template(notification_room_deban);
  JST['notification/room-voice.html']      = _.template(notification_room_voice);
  JST['notification/room-devoice.html']    = _.template(notification_room_devoice);
  JST['notification/room-topic.html']      = _.template(notification_room_topic);
  JST['notification/room-join.html']       = _.template(notification_room_join);
  JST['notification/user-mention.html']    = _.template(notification_user_mention);
  JST['notification/room-message.html']    = _.template(notification_room_message);
  JST['notification/user-message.html']    = _.template(notification_user_message);
  JST['mention.html']    = _.template(mention);

  return JST;
});