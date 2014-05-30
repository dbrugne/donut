define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/message.html',
  'text!templates/notification.html'
], function ($, _, Backbone, messageTemplate, notificationTemplate) {
  var DiscussionMessagesView = Backbone.View.extend({

    template: _.template(messageTemplate),

    timeFormat: "HH:mm",

    events: {},

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.message);
      this.listenTo(this.model, 'notification', this.notification);
      this.render();
    },

    message: function(message) {
      // Date
      var dateText = $.format.date(new Date(message.get('time')), this.timeFormat);

      var html = this.template({
        user_id: message.get('user_id'),
        avatar: message.get('avatar'),
        username: message.get('username'),
        date: dateText
      });
      $(html).appendTo(this.$el)
              .find('.message')
              .text(message.get('message')+"")
              .smilify()
              .linkify();

      this.scrollDown();
      return this;
    },

    /**
     * Notifications:
     *
     * All notifications should have: { type, date }
     *
     * And by 'type' should also received:
     * - hello: You enter in #room : {}
     * - in: @user has joined : {user_id, username}
     * - out: @user has left : {user_id, username}
     * - disconnect @user quit (reason) : {user_id, username, reason}
     * - topic: @user changed topic for 'topic' : {user_id, username, topic}
     * - kick: : @user was kicked by @user 'reason' : {user_id, username, by_user_id, by_username, reason}
     * - ban: @user was banned by @user (time) 'reason' : {user_id, username, by_user_id, by_username, reason}
     * - op: @user was oped by @user : {user_id, username, by_user_id, by_username}
     * - deop: @user was deoped by @user : {user_id, username, by_user_id, by_username}
     */
    notificationTemplate: _.template(notificationTemplate),
    notification: function(data) {
      if (data.type == undefined || data.type == '') {
        return;
      }

      data.date = $.format.date(Number(new Date()), this.timeFormat);

      var html = this.notificationTemplate(data);
      $(html).appendTo(this.$el)
        .smilify()
        .linkify();
      this.scrollDown();
    },

    scrollDown: function() {
      this.$el.scrollTop(100000);
    }

  });

  return DiscussionMessagesView;
});