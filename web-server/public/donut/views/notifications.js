'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'models/app',
  'common',
  'client',
  'collections/rooms',
  'collections/onetoones',
  'models/current-user',
  'moment',
  '_templates'
], function ($, _, Backbone, i18next, app, common, client, rooms, onetoones, currentUser, moment, templates) {
  var NotificationsView = Backbone.View.extend({
    el: $('#notifications'),

    dropdownIsShown: false,

    shouldScrollTopOnNextShow: false,

    isThereMoreNotifications: false,

    events: {
      'click .dropdown-menu .actions': 'onReadMore',
      'click .action-tag-as-read': 'onTagAsRead',
      'click .action-tag-as-done': 'onTagAsDone',
      'show.bs.dropdown': 'onShow',
      'shown.bs.dropdown': 'onShown',
      'hide.bs.dropdown': 'onHide'
    },

    timeToMarkAsRead: 1500, // mark notifications as read after n seconds

    markHasRead: null,

    initialize: function (options) {
      this.listenTo(client, 'notification:new', this.onNewNotification);
      this.listenTo(client, 'notification:done', this.onDoneNotification);

      this.unread = 0;
      this.more = false;
      this.render();
    },
    initializeNotificationState: function (data) {
      this.$menu.html('');
      this.$dropdown.parent().removeClass('open');
      if (data.unread)
        this.setUnreadCount(data.unread);
    },
    render: function () {
      this.$dropdown = this.$el.find('.dropdown-toggle');
      this.$badge = this.$el.find('.badge').first();
      this.$count = this.$el.find('.unread-count .nb').first();
      this.$menu = this.$el.find('.dropdown-menu #main-navbar-messages');
      this.$scrollable = this.$el.find('.dropdown-menu .messages-list-ctn');
      this.$actions = this.$el.find('.dropdown-menu .messages-list-ctn .actions');
      this.$readMore = this.$actions.find('.read-more');
      this.$loader = this.$actions.find('.loading');

      this.$dropdown.dropdown();

      return this;
    },
    scrollTop: function () {
      if (this.dropdownIsShown || this.shouldScrollTopOnNextShow)
        this.$scrollable.scrollTop(0);
      else
        this.shouldScrollTopOnNextShow = true;
    },
    setUnreadCount: function (count) {
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
    },

    // A new Notification is pushed from server
    onNewNotification: function (data) {
      // Update Badge & Count
      this.setUnreadCount(this.unread + 1);

      // Highlight Badge
      this.$badge.addClass('bounce');
      var that = this;
      setTimeout(function () {
        that.$badge.removeClass('bounce');
      }, 1500); // Remove class after animation to trigger animation later if needed

      // Insert new notification in dropdown
      this.$menu.html(this.createNotificationFromTemplate(data) + this.$menu.html());

      // Dropdown is opened
      if (this.el.classList.contains('open')) {
        // Set Timeout to clear new notification
        this.markHasRead = setTimeout(function () {
          that.clearNotifications();
        }, this.timeToMarkAsRead);
      }

      this.toggleReadMore();
      this.scrollTop();
      this._createDesktopNotify(data);
    },
    _createDesktopNotify: function (data) {
      var desktopTitle = i18next.t('chat.notifications.desktop.' + data.type, {
        'roomname': ( data.data.room && data.data.room.name
          ? data.data.room.name
          : ''),
        'username': ( data.data.by_user && data.data.by_user.username
          ? data.data.by_user.username
          : ( data.data.user && data.data.user.username
            ? data.data.user.username
            : '')),
        'topic': ( data.data.topic
          ? data.data.topic
          : ''),
        'message': ( data.data.message
          ? data.data.message
          : '')
      });

      app.trigger('desktopNotification', desktopTitle, '');
    },
    createNotificationFromTemplate: function (notification) {
      var template;

      switch (notification.type) {
        case 'usermessage':
          template = templates['notification/user-message.html'];
          break;
        case 'roomop':
          template = templates['notification/room-op.html'];
          break;
        case 'roomdeop':
          template = templates['notification/room-deop.html'];
          break;
        case 'roomkick':
          template = templates['notification/room-kick.html'];
          break;
        case 'roomban':
          template = templates['notification/room-ban.html'];
          break;
        case 'roomdeban':
          template = templates['notification/room-deban.html'];
          break;
        case 'roomvoice':
          template = templates['notification/room-voice.html'];
          break;
        case 'roomdevoice':
          template = templates['notification/room-devoice.html'];
          break;
        case 'roomtopic':
          template = templates['notification/room-topic.html'];
          break;
        case 'roomjoin':
          template = templates['notification/room-join.html'];
          break;
        case 'roomjoinrequest':
          template = templates['notification/room-join-request.html'];
          break;
        case 'roomallowed':
          template = templates['notification/room-allowed.html'];
          break;
        case 'roomrefuse':
          template = templates['notification/room-allow-refuse.html'];
          break;
        case 'roommessage':
          template = templates['notification/room-message.html'];
          break;
        case 'usermention':
          template = templates['notification/user-mention.html'];
          break;
        default:
          return '';
          break;
      }
      var dateObject = moment(notification.time);

      if (notification.data.room)
        notification.avatar = common.cloudinarySize(notification.data.room.avatar, 90);
      else if (notification.data.by_user)
        notification.avatar = common.cloudinarySize(notification.data.by_user.avatar, 90);

      return template({data: notification, from_now: dateObject.format('Do MMMM, HH:mm'), from_now_short: dateObject.format('D/MM, HH:mm')});
    },
    // User clicks on the notification icon in the header
    onShow: function (event) {
      if (this.$menu.find('.message').length) {
        this.markHasRead = setTimeout(_.bind(function () {
          this.clearNotifications();
        }, this), this.timeToMarkAsRead);
        return;
      }

      client.notificationRead(null, this.lastNotifDisplayedTime(), 10, _.bind(function (data) {
        this.isThereMoreNotifications = data.more;
        var html = '';
        for (var k in data.notifications) {
          html += this.createNotificationFromTemplate(data.notifications[k]);
        }
        this.$menu.html(html);
        this.toggleReadMore();
      }, this));

      this.markHasRead = setTimeout(_.bind(function () {
        this.clearNotifications();
      }, this), this.timeToMarkAsRead);
    },
    onShown: function (event) {
      this.dropdownIsShown = false;
      if (this.shouldScrollTopOnNextShow) {
        this.scrollTop();
        this.shouldScrollTopOnNextShow = false;
      }
    },

    onHide: function (event) {
      this.dropdownIsShown = false;
      clearTimeout(this.markHasRead);
    },

    clearNotifications: function () {
      var unreadNotifications = this.$menu.find('.message.unread');
      var that = this;
      var ids = [];
      _.each(unreadNotifications, function (elt) {
        ids.push(elt.dataset.notificationId);
      });

      // Only call Client if at least something to tag as viewed
      if (ids.length == 0)
        return;

      client.notificationViewed(ids, false, _.bind(function (data) {
        // For each notification in the list, tag them as read
        _.each(unreadNotifications, function (notification) {
          notification.classList.remove('unread');
        });

        // Update Badge & Count
        this.setUnreadCount(that.unread - ids.length);

        that.markHasRead = null;
      }, this));
    },

    redraw: function () {
      return this.render();
    },

    // When user clicks on the read more link in the notification dropdown
    onReadMore: function (event) {
      event.stopPropagation(); // Cancel dropdown close behaviour
      this.$readMore.addClass('hidden');
      this.$loader.removeClass('hidden');

      client.notificationRead(null, this.lastNotifDisplayedTime(), 10, _.bind(function (data) {
        this.isThereMoreNotifications = data.more;
        var previousContent = this.$menu.html();
        var html = '';
        for (var k in data.notifications) {
          html += this.createNotificationFromTemplate(data.notifications[k]);
        }

        this.$menu.html(previousContent + html);
        this.$readMore.removeClass('hidden');
        this.$loader.addClass('hidden');

        var that = this;
        this.markHasRead = setTimeout(function () {
          that.clearNotifications();
        }, this.timeToMarkAsRead);

        this.toggleReadMore();

      }, this));
    },

    lastNotifDisplayedTime: function () {
      var last = this.$menu.find('.message').last();
      var time = (!last || last.length < 1) ? null : last.data('time');
      return time;
    },

    toggleReadMore: function () {
      // Only display if at least 10 messages displayed, and more messages to display on server
      if (this.$menu.find('.message').length < 10)
        return this.$actions.addClass('hidden');

      if (!this.isThereMoreNotifications)
        this.$actions.addClass('hidden');
      else
        this.$actions.removeClass('hidden');
    },

    onTagAsRead: function (event) {
      // Ask server to set notifications as viewed, and wait for response to set them likewise
      client.notificationViewed([], true, _.bind(function (data) {
        // For each notification in the list, tag them as read
        _.each(this.$menu.find('.message.unread'), function (notification) {
          notification.classList.remove('unread');
        });

        // Update Badge & Count
        this.setUnreadCount(0);
      }, this));
    },

    onTagAsDone: function (event) {
      event.preventDefault();
      var message = $(event.currentTarget).parents('.message');
      // Ask server to set notification as done, and wait for response to set them likewise
      client.notificationDone(message.data('notification-id'), true);
      return false;
    },

    // A Notification is tagged as done on the server
    onDoneNotification: function (data) {
      clearTimeout(this.markHasRead);

      var message = $('.message[data-notification-id=' + data.notification + ']');

      if (message.hasClass('unread'))
        this.unread--;

      message.fadeOut(500, function () {
        $(this).remove();
      });

      var that = this;
      this.markHasRead = setTimeout(function () {
        that.clearNotifications();
      }, this.timeToMarkAsRead);

      this.toggleReadMore();
    }
  });

  return NotificationsView;
});
