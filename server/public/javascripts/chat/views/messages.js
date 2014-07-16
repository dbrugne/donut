define([
  'jquery',
  'underscore',
  'backbone',
  'moment',
  'text!templates/message.html',
  'text!templates/notification.html',
  'text!templates/separator.html'
], function ($, _, Backbone, moment, messageTemplate, notificationTemplate, separatorTemplate) {
  var DiscussionMessagesView = Backbone.View.extend({

    template: _.template(messageTemplate),

    events: {},

    lastMessageUser: '',

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.message);
      this.listenTo(this.model, 'notification', this.notification);
      this.listenTo(this.model, 'separator', this.separator);
      this.listenTo(this.model, 'change:focused', this.updateMoment);
      this.render();

      // Regularly update moment times
      var that = this;
      setInterval(function() { that.updateMoment(); }, 60*1000); // any minutes
    },

    // Update all .moment of the discussion panel
    updateMoment: function() {
      if (!this.model.get('focused')) return;
      this.$el.find('.moment').momentify();
    },

    message: function(message) {
     var sameUser = (message.get('user_id') == this.lastMessageUser)
       ? true
       : false;
    this.lastMessageUser = message.get('user_id');

     if (sameUser) { // we had span.text to the last p.message
       var $last = this.$el.find('p.message').last();
       var html = $('<span class="text"></span>')
         .text(message.get('message')+"")
         .smilify()
         .linkify();
       var el = $(html).appendTo($last);
       $last.find('.data .moment')
         .attr('data-time', message.get('time'))
         .momentify();
     } else { // render a full p.message
       var html = this.template({
         user_id: message.get('user_id'),
         avatar: message.get('avatar'),
         username: message.get('username'),
         time: message.get('time'),
         sameUser: sameUser
       });
       var el = $(html).appendTo(this.$el);

       el.find('.text')
         .text(message.get('message')+"")
         .smilify()
         .linkify();

       el.find('.moment')
         .momentify();
     }

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
    notification: function(notification) {
      if (notification.type == undefined || notification.type == '') {
        return;
      }

      // e.g. : hello
      if (!notification.time) {
        notification.time = Number(new Date());
      }

      var html = this.notificationTemplate(notification);
      var el = $(html).appendTo(this.$el);

      el.smilify()
        .linkify();

      el.find('.moment')
        .momentify();

      this.scrollDown();
    },

    /**
     * Separator, to indicated limit with message history
     */
    separatorTemplate: _.template(separatorTemplate),
    separator: function(msg) {
      if (!msg) msg = ' ';
      var html = this.separatorTemplate({message: msg});
      $(html).appendTo(this.$el);
      this.scrollDown();
    },

    scrollDown: function() {
      this.$el.scrollTop(100000);
    }

  });

  return DiscussionMessagesView;
});