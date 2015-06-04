define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'collections/rooms',
  'collections/onetoones',
  'models/current-user',
  'moment',
  'views/window',
  '_templates'
], function ($, _, Backbone, client, rooms, onetoones, currentUser, moment, windowView, templates) {
  var NotificationsView = Backbone.View.extend({

    el: $("#notifications"),

    events: {
      "click .dropdown-menu .actions" : 'readMore',
      'show.bs.dropdown': 'onShow',
      'hide.bs.dropdown': 'onHide'
    },

    markHasRead : null,

    initialize: function(options) {
      this.mainView = options.mainView;

      this.render();
    },
    render: function() {
      this.$dropdown = this.$el.find('.dropdown-toggle');
      this.$badge = this.$el.find('.badge').first();
      this.$count = this.$el.find('.unread-count .nb').first();
      this.$menu = this.$el.find('.dropdown-menu #main-navbar-messages');
      this.$readMore = this.$el.find('.read-more');
      this.$loader = this.$el.find('.loading');

      this.$dropdown.dropdown();

      return this;
    },
    setUnreadCount: function(count) {
      if (count > 0) {
        this.$badge.text(count);
        this.$count.html(count);
        this.el.classList.remove('empty');
        this.el.classList.add('full');
      } else {
        this.el.classList.add('empty');
        this.el.classList.remove('full');
      }
    },
    onNewEvent: function(notification) {
      var template;

      switch (notification.type)
      {
        case 'roomop':
          template = templates['notifications/room-op.html']; break;
        case 'roomdeop':
          template = templates['notifications/room-deop.html']; break;
        case 'roomkick':
          template = templates['notifications/room-kick.html']; break;
        case 'roomban':
          template = templates['notifications/room-ban.html']; break;
        case 'roomdeban':
          template = templates['notifications/room-deban.html']; break;
        default:
        break;
      }
      var dateObject = moment(notification.data.time);

      if (notification.data.by_user)
        notification.avatar = $.cd.roomAvatar(notification.data.by_user.avatar, 90); // @todo add room avatar instead of by_user avatar

      return template({data: notification, from_now: dateObject.format("Do MMMM, HH:mm")});
    },
    onShow: function(event) {
      console.log("show", event.relatedTarget);

      // Ask server for last 10 unread notifications // @todo yls put that in parameters
      client.userNotifications(10, _.bind(function(data) {

        var html = '';
        for (var k in data.notifications)
        {
          html += this.onNewEvent(data.notifications[k]);
        }

        this.$menu.html(html);
      }, this));

      var that = this;
      this.markHasRead = setTimeout(function(){ that.clearNotifications(); }, 2000); // Clear notifications after 2 seconds
    },
    onHide: function(event) {
      console.log("hide", event.relatedTarget);
      clearTimeout(this.markHasRead);
    },
    clearNotifications: function() {
      var unreadNotifications = this.$menu.find('.message.unread');

      var ids = [];
      _.each(unreadNotifications, function(elt){
        ids.push(elt.dataset.notificationId);
      });

      // Only call Client if at least something to tag as viewed
      if (ids.length == 0)
        return;

      // Ask server to set notifications as viewed, and wait for response to set them likewise
      client.userNotificationsViewed(ids, _.bind(function(data){
        // For each notification in the list, tag them as read
        _.each(unreadNotifications, function(notification){
          notification.classList.remove('unread');
        });

        // Update Badge & Count
        this.setUnreadCount(data.unviewed);
      }, this));
    },

    redraw: function() {
      return this.render();
    },

    // When user clicks on the read more link in the notification dropdown
    readMore: function(event) {
      event.stopPropagation();
      this.$readMore.addClass('hidden');
      this.$loader.removeClass('hidden');

      client.userNotifications(10, _.bind(function(data) {
        var previousContent = this.$menu.html();
        var html = '';
        for (var k in data.notifications)
        {
          html += this.onNewEvent(data.notifications[k]);
        }

        this.$menu.html(previousContent+html);
        this.$readMore.removeClass('hidden');
        this.$loader.addClass('hidden');
      }, this));

      var that = this;
      this.markHasRead = setTimeout(function(){ that.clearNotifications(); }, 2000); // Clear notifications after 2 seconds
    }

  });

  return NotificationsView;
});