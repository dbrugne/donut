define([
  'jquery',
  'underscore',
  'backbone',
  'moment',
  'text!templates/message.html',
  'text!templates/notification.html'
], function ($, _, Backbone, moment, messageTemplate, notificationTemplate) {
  var DiscussionMessagesView = Backbone.View.extend({

    template: _.template(messageTemplate),

    events: {},

    lastEvent: '',

    lastMessageUser: '',

    lastNotificationWasInOut: '',

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.message);
      this.listenTo(this.model, 'notification', this.notification);
      this.listenTo(this.model, 'change:focused', this.updateMoment);

      this.render();

      // Regularly update moment times
      var that = this;
      setInterval(function() { that.updateMoment(); }, 45*1000); // every 45s
    },

    render: function() {
      this.$el.scroller();
      this.$scroller = this.$el.find('.scroller-content');
        // Scroller will automatically move content in div.scroller-content
      return this;
    },

    // Update all .moment of the discussion panel
    updateMoment: function() {
      if (!this.model.get('focused')) return;
      this.$el.find('.moment').momentify();
    },

    message: function(message) {
     this.lastEvent = 'message';
     var sameUser = (message.get('user_id') == this.lastMessageUser)
       ? true
       : false;

     this.lastMessageUser = message.get('user_id');

     if (sameUser) { // we had span.text to the last p.message
       var $last = this.$el.find('p.message').last();
       var html = $('<span class="text"></span>')
         .text(message.get('message')+"")
         .smilify()
         .linkify({
           linkAttributes: {
             'data-colorify': this.model.get('color'),
             'data-colorify-text': 'color'
           }
         });
       var el = $(html).appendTo($last);
       el.colorify();
       $last.find('.data .moment')
         .attr('data-time', message.get('time'))
         .momentify();
     } else { // render a full p.message
       var html = this.template({
         user_id: message.get('user_id'),
         avatar: $.c.userAvatar(message.get('avatar'), 'user-medium'),
         username: message.get('username'),
         time: message.get('time'),
         sameUser: sameUser
       });
       var el = $(html).appendTo(this.$scroller);

       el.find('.text')
         .text(message.get('message')+"")
         .smilify()
         .linkify({
           linkAttributes: {
             'data-colorify': this.model.get('color'),
             'data-colorify-text': 'color'
           }
         });

       el.colorify();

       el.find('.moment')
         .momentify();
     }

      this.scrollDown();
      return this;
    },

    /**
     * Notifications
     */
    notificationTemplate: _.template(notificationTemplate),
    notification: function(notification) {
      if (notification.type == undefined || notification.type == '')
        return;

      var shouldAggregated = ((notification.type == 'in' || notification.type == 'out')
        && this.lastNotificationWasInOut && this.lastEvent == 'notification')
        ? true
        : false;

      this.lastEvent = 'notification';

      if (notification.type == 'in' || notification.type == 'out') {
        this.lastNotificationWasInOut = true;
        notification.subtype = notification.type;
        notification.type = 'inout';
      } else {
        this.lastNotificationWasInOut = false;
      }

      // e.g. : hello
      if (!notification.time) {
        notification.time = Number(new Date());
      }

      if (notification.avatar)
        notification.avatar = $.c.userAvatar(notification.avatar, 'user-medium');

      if (notification.by_avatar)
        notification.by_avatar = $.c.userAvatar(notification.by_avatar, 'user-medium');

      var html = this.notificationTemplate(notification);

      if (!shouldAggregated) {
        var el = $(html).appendTo(this.$scroller);
      } else {
        var $last = this.$el.find('.notification-inout').last();
        var el = $(html).find('.item').appendTo($last);
      }

      el.find('.notification')
        .smilify()
        .linkify({
          linkAttributes: {
            'data-colorify': this.model.get('color'),
            'data-colorify-text': 'color'
          }
        });

      el.colorify();

      el.find('.moment')
        .momentify();

      this.scrollDown();
    },

    scrollDown: function() {
      this.$el
        .scroller('reset')
        .scroller('scroll', this.$scroller.prop('scrollHeight'));
    }

  });

  return DiscussionMessagesView;
});