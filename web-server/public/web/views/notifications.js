var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var client = require('../libs/client');
var date = require('../libs/date');

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
    if (data.unread) {
      this.setUnreadCount(data.unread);
    }
  },
  render: function () {
    this.$dropdown = this.$('.dropdown-toggle');
    this.$badge = this.$('.badge').first();
    this.$count = this.$('.unread-count .nb').first();
    this.$menu = this.$('.dropdown-menu #main-navbar-messages');
    this.$scrollable = this.$('.dropdown-menu .messages-list-ctn');
    this.$actions = this.$('.dropdown-menu .messages-list-ctn .actions');
    this.$readMore = this.$actions.find('.read-more');
    this.$loader = this.$actions.find('.loading');

    this.$dropdown.dropdown();

    return this;
  },
  scrollTop: function () {
    if (this.dropdownIsShown || this.shouldScrollTopOnNextShow) {
      this.$scrollable.scrollTop(0);
    } else {
      this.shouldScrollTopOnNextShow = true;
    }
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
    this.$menu.html(this.renderNotification(data) + this.$menu.html());

    // Dropdown is opened
    if (this.el.classList.contains('open')) {
      // Set Timeout to clear new notification
      this.markHasRead = setTimeout(function () {
        that.clearNotifications();
      }, this.timeToMarkAsRead);
    }

    // if more than 10 notifications in notification center
    this.isThereMoreNotifications = true;

    this.toggleReadMore();
    this.scrollTop();
    this._createDesktopNotify(data);
  },
  _createDesktopNotify: function (data) {
    var msg = (data.data.message)
      ? common.markup.toText(data.data.message)
      : '';
    var message = i18next.t('chat.notifications.messages.' + data.type, {
      name: (data.data.room)
        ? data.data.room.name
        : (data.data.group)
        ? data.data.group.name
        : '',
      username: (data.data.by_user)
        ? data.data.by_user.username
        : data.data.user.username,
      message: msg,
      topic: (data.data.topic)
        ? common.markup.toText(data.data.topic)
        : ''
    });

    message = message.replace(/<\/*span>/g, '');
    message = message.replace(/<\/*br>/g, '');
    app.trigger('desktopNotification', message, '');
  },
  renderNotification: function (n) {
    n.css = '';
    n.href = '';
    n.name = '';
    n.html = '';
    if (n.data.room) {
      n.avatar = common.cloudinary.prepare(n.data.room.avatar, 90);
      n.title = n.data.room.name;
      n.name = n.data.room.name;
      n.href = n.name;
    } else if (n.data.group) {
      n.avatar = common.cloudinary.prepare(n.data.group.avatar, 90);
      n.title = n.data.group.name;
      n.name = n.data.group.name;
      n.href = '#g/' + n.name;
    } else if (n.data.by_user) {
      n.avatar = common.cloudinary.prepare(n.data.by_user.avatar, 90);
      n.title = n.data.by_user.username;
    }

    n.username = (n.data.by_user) ? n.data.by_user.username : n.data.user.username;
    var message = (n.data.message)
      ? common.markup.toText(n.data.message)
      : '';
    n.message = i18next.t('chat.notifications.messages.' + n.type, {
      name: n.name,
      username: n.username,
      message: message,
      topic: (n.data.topic) ? common.markup.toText(n.data.topic) : ''
    });

    if (n.type === 'roomjoinrequest') {
      n.href = '';
      n.css += 'open-room-access';
      var roomId = (n.data.room._id) ? n.data.room._id : n.data.room.id;
      n.html += 'data-room-id="' + roomId + '"';
      n.username = null;
    } else if (n.type === 'groupjoinrequest') {
      n.href = '';
      n.css += 'open-group-access';
      var groupId = (n.data.group._id) ? n.data.group._id : n.data.group.id;
      n.html += 'data-group-id="' + groupId + '"';
      n.username = null;
    } else if (n.type === 'roomdelete') {
      n.href = '';
    }

    if (n.viewed === false) {
      n.css += ' unread';
    }

    return require('../templates/notification.html')({
      data: n,
      from_now: date.dayMonthTime(n.time),
      from_now_short: date.shortDayMonthTime(n.time)
    });
  },
  // User clicks on the notification icon in the header
  onShow: function (event) {
    this.scrollTop();
    if (this.countNotificationsInDropdown()) {
      this.markHasRead = setTimeout(_.bind(function () {
        this.clearNotifications();
      }, this), this.timeToMarkAsRead);
    }

    if (this.countNotificationsInDropdown() >= 10) {
      return;
    }

    client.notificationRead(null, this.lastNotifDisplayedTime(), 10, _.bind(function (data) {
      this.isThereMoreNotifications = data.more;
      var html = '';
      _.each(data.notifications, _.bind(function (element) {
        html += this.renderNotification(element);
      }, this));
      this.$menu.html(this.$menu.html() + html);
      this.toggleReadMore();
    }, this));

    if (!this.countNotificationsInDropdown()) {
      this.markHasRead = setTimeout(_.bind(function () {
        this.clearNotifications();
      }, this), this.timeToMarkAsRead);
    }
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
    if (ids.length === 0) {
      this.setUnreadCount(0);
      return;
    }

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
      _.each(data.notifications, _.bind(function (element) {
        html += this.renderNotification(element);
      }, this));

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
    var time = (!last || last.length < 1)
      ? null
      : last.data('time');
    return time;
  },

  toggleReadMore: function () {
    // Only display if at least 10 messages displayed, and more messages to display on server
    if (this.countNotificationsInDropdown() < 10) {
      return this.$actions.addClass('hidden');
    }

    if (!this.isThereMoreNotifications) {
      this.$actions.addClass('hidden');
    } else {
      this.$actions.removeClass('hidden');
    }
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
    client.notificationDone(message.data('notification-id'), true);
    return false;
  },

  // A Notification is tagged as done on the server
  onDoneNotification: function (data) {
    clearTimeout(this.markHasRead);

    var message = $('.message[data-notification-id=' + data.notification + ']');

    if (message.hasClass('unread')) {
      this.unread--;
    }

    message.fadeOut(500, function () {
      $(this).remove();
    });

    var that = this;
    this.markHasRead = setTimeout(function () {
      that.clearNotifications();
    }, this.timeToMarkAsRead);

    this.toggleReadMore();
  },
  countNotificationsInDropdown: function () {
    return this.$menu.find('.message').length;
  }
});

module.exports = NotificationsView;
