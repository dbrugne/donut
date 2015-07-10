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
      "click .dropdown-menu .actions" : 'onReadMore',
      'show.bs.dropdown': 'onShow',
      'hide.bs.dropdown': 'onHide'
    },

    markHasRead : null,

    initialize: function(options) {
      this.unread = 0;
      this.undone = 0;
      this.more = false;
      this.mainView = options.mainView;
      this.listenTo(client, 'notification:new', this.onNotificationPushed);

      this.render();
    },
    initializeNotificationState: function(data) {
      if (data.unread)
        this.setUnreadCount(data.unread);
      if (data.undone)
        this.undone = data.undone;
    },
    render: function() {
      this.$dropdown = this.$el.find('.dropdown-toggle');
      this.$badge = this.$el.find('.badge').first();
      this.$count = this.$el.find('.unread-count .nb').first();
      this.$menu = this.$el.find('.dropdown-menu #main-navbar-messages');
      this.$readMore = this.$el.find('.read-more');
      this.$loader = this.$el.find('.loading');
      this.$actions = this.$el.find('.dropdown-menu .messages-list-ctn .actions');

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
      this.unread = count;
      console.log('************'+this.unread+'********');
    },

    // A new Notification is pushed from server
    onNotificationPushed: function(data) {
      // Update Badge & Count
      this.setUnreadCount(this.unread+1);

      // Highlight Badge
      this.$badge.addClass("bounce");
      var that = this;
      setTimeout(function(){ that.$badge.removeClass("bounce"); }, 1500); // Remove class after animation to trigger animation later if needed

      // Insert new notification in dropdown
      this.$menu.html(this.createNotificationFromTemplate(data)+this.$menu.html());

      // Dropdown is opened
      if (this.el.classList.contains('open')) {
        // Set Timeout to clear new notification
        this.markHasRead = setTimeout(function(){ that.clearNotifications(); }, 2000); // Clear notifications after 2 seconds
      }

      this.toggleReadMore();

      this._createDesktopNotify(data);
    },
    _createDesktopNotify: function(data)
    {
      var desktopTitle, desktopBody;

      switch (data.type)
      {
        case 'roomop':
        case 'roomdeop':
        case 'roomkick':
        case 'roomban':
        case 'roomdeban':
        case 'roomtopic':
        case 'roomjoin':
        case 'roommessage':
          desktopTitle = $.t('chat.notifications.desktop.'+data.type).replace('__roomname__', ( data.data.room && data.data.room.name ? ' '+data.data.room.name : ''));
          desktopBody = ( data.data.by_user && data.data.by_user.username ? t('chat.notifications.desktop.by') + ' '+data.data.by_user.username : '');
        break;
        case 'usermention':
          desktopTitle = $.t('chat.notifications.desktop.'+data.type).replace('__username__', ( data.data.by_user && data.data.by_user.username ? ' '+data.data.by_user.username : ''));
          desktopBody = '';
        break;
        default:
        break;
      }

      windowView.desktopNotify(desktopTitle, desktopBody);
    },
    createNotificationFromTemplate: function(notification) {
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
        case 'roomtopic':
          template = templates['notifications/room-topic.html']; break;
        case 'roomjoin':
          template = templates['notifications/room-join.html']; break;
        case 'roommessage':
          template = templates['notifications/room-message.html']; break;
        case 'usermention':
          template = templates['notifications/user-mention.html']; break;
        default:
        break;
      }
      var dateObject = moment(notification.time);

      if (notification.data.room)
        notification.avatar = $.cd.roomAvatar(notification.data.room.avatar, 90);
      else if (notification.data.by_user)
        notification.avatar = $.cd.roomAvatar(notification.data.by_user.avatar, 90);

      return template({data: notification, from_now: dateObject.format("Do MMMM, HH:mm")});
    },
    // User clicks on the notification icon in the header
    onShow: function(event) {
      var lastNotif = this.lastNotifDisplayedTime();
      var that = this;
      // Ask server for last 10 notifications
      if (this.$menu.find('.message').length == 0) {
        client.userNotifications(null, lastNotif, 10, _.bind(function(data) {

          var html = '';
          for (var k in data.notifications)
          {
            html += this.createNotificationFromTemplate(data.notifications[k]);
          }

          this.$menu.html(html);

          this.toggleReadMore();
        }, this));
      }

      this.markHasRead = setTimeout(function(){ that.clearNotifications(); }, 2000); // Clear notifications after 2 seconds
    },

    onHide: function(event) {
      console.log("hide", event.relatedTarget);
      clearTimeout(this.markHasRead);
    },

    clearNotifications: function() {
      var unreadNotifications = this.$menu.find('.message.unread');
      var that = this;
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
        this.setUnreadCount(that.unread - ids.length);
      }, this));
    },

    redraw: function() {
      return this.render();
    },

    // When user clicks on the read more link in the notification dropdown
    onReadMore: function(event) {
      event.stopPropagation(); // Cancel dropdown close behaviour
      this.$readMore.addClass('hidden');
      this.$loader.removeClass('hidden');

      var lastNotif = this.lastNotifDisplayedTime();
      client.userNotifications(null, lastNotif, 10, _.bind(function(data) {
        var previousContent = this.$menu.html();
        var html = '';
        for (var k in data.notifications)
        {
          html += this.createNotificationFromTemplate(data.notifications[k]);
        }

        this.$menu.html(previousContent+html);
        this.$readMore.removeClass('hidden');
        this.$loader.addClass('hidden');

        if (data.notifications.length < 10)
          this.$actions.addClass('hidden');
      }, this));

      var that = this;
      this.markHasRead = setTimeout(function(){ that.clearNotifications(); }, 2000);
    },

    lastNotifDisplayedTime: function() {
      var last = this.$menu.find('.message').last();
      var time = (!last || last.length < 1) ? null : last.data('time');
      return time;
    },

    toggleReadMore: function()
    {
      // Only display if at least 10 messages displayed, and more messages to display on server
      if (this.$menu.find('.message').length < 10)
        return;

      if ((this.undone || 0) < 10)
        this.$actions.addClass('hidden');
      else
        this.$actions.removeClass('hidden');
    }

  });

  return NotificationsView;
});