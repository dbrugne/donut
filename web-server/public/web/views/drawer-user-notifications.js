var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var date = require('../libs/date');
var currentUser = require('../libs/app').user;

var DrawerUserNotificationsView = Backbone.View.extend({
  template: require('../templates/drawer-user-notifications.html'),
  templateSpinner: require('../templates/spinner.html'),

  id: 'user-notifications',

  shouldScrollTopOnNextShow: false,

  isThereMoreNotifications: false,

  timeToMarkAsRead: 1500, // mark notifications as read after n seconds

  events: {
    'click .actions .read-more': 'onReadMore',
    'click .action-tag-as-read': 'onTagAsRead',
    'click .action-tag-as-done': 'onTagAsDone',
    'click a.message': 'onMessageClick',
    'change .browser-sounds': 'onChangeBrowserSounds'
  },

  more: false,

  initialize: function (options) {
    this.userId = options.user_id;

    this.listenTo(app.client, 'notification:new', this.onNewNotification);
    this.listenTo(app.client, 'notification:done', this.onDoneNotification);
    this.listenTo(currentUser, 'change:unviewedNotification', this.setUnreadCount);

    this.$badge = $('#notifications').find('.unread-count').first();

    this.render(); // show spinner as temp content

    app.client.notificationRead(null, null, 10, _.bind(function (data) {
      app.client.userPreferencesRead(null, _.bind(function (response) { // @todo fetch preferences into notificationRead, avoid two calls. required to display notification sound toggle
        this.isThereMoreNotifications = data.more;
        var spinner = this.templateSpinner({});
        this.$el.html(this.template({user_id: this.userId, spinner: spinner, preferences: response.preferences}));
        if (!response.preferences['browser:sounds']) {
          this.$el.addClass('nothing');
        }

        this.$unreadCount = this.$('.unread-count');
        this.$count = this.$unreadCount.find('.nb');
        this.$menu = this.$('#main-navbar-messages');
        this.$scrollable = this.$('.messages-list-ctn');
        this.$actions = this.$scrollable.find('.actions');
        this.$readMore = this.$actions.find('.read-more');
        this.$errors = this.$el.find('.error');

        this.setUnreadCount();

        var html = '';
        _.each(data.notifications, _.bind(function (element) {
          html += this.renderNotification(element);
        }, this));

        this.$menu.html(this.$menu.html() + html);

        this.markHasRead = setTimeout(_.bind(function () {
          this.clearNotifications();
        }, this), this.timeToMarkAsRead);

        this.toggleReadMore();
      }, this));
    }, this));
  },
  render: function () {
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  onChangeBrowserSounds: function(event) {
    var $target = $(event.currentTarget);
    var value = $target.is(':checked');
    this.$el.toggleClass('nothing');
    var update = { 'browser:sounds': value };
    app.client.userPreferencesUpdate(update, _.bind(function (data) {
      this.$errors.hide();
      if (data.err) {
        this.$errors.html(i18next.t('global.unknownerror')).show();
      }
    }, this));
  },
  setUnreadCount: function () {
    var unviewed = app.user.get('unviewedNotification');
    if (unviewed) {
      this.$count.html(unviewed);
      this.$unreadCount.removeClass('empty').addClass('full');
    } else {
      this.$unreadCount.addClass('empty').removeClass('full');
    }
  },
  // A new Notification is pushed from server
  onNewNotification: function (data) {
    this.$menu.html(this.renderNotification(data) + this.$menu.html());
    this.$scrollable.scrollTop(0);
  },
  renderNotification: function (n) {
    n.css = '';
    n.href = '';
    n.name = '';
    n.html = '';
    n.avatarCircle = false;
    if (n.data.room) {
      n.avatar = common.cloudinary.prepare(n.data.room.avatar, 90);
      n.avatarCircle = true;
      n.title = n.data.room.name;
      n.name = n.data.room.name;
      n.href = n.name;
    } else if (n.data.group) {
      n.avatar = common.cloudinary.prepare(n.data.group.avatar, 90);
      n.avatarCircle = true;
      n.title = n.data.group.name;
      n.name = n.data.group.name;
      n.href = '#g/' + n.name;
    } else if (n.data.by_user) {
      n.avatar = common.cloudinary.prepare(n.data.by_user.avatar, 90);
      n.title = n.data.by_user.username;
    }

    n.username = (n.data.by_user)
      ? n.data.by_user.username
      : (n.data.user)
        ? n.data.user.username
        : '';
    var message = (n.data.message)
      ? common.markup.toText(n.data.message)
      : '';
    n.message = i18next.t('chat.notifications.messages.' + n.type, {
      name: n.name,
      username: n.username,
      message: message,
      topic: (n.data.topic)
        ? common.markup.toText(n.data.topic)
        : ''
    });

    if (['roomjoinrequest', 'groupjoinrequest', 'usermention'].indexOf(n.type) !== -1) {
      var avatar = (n.data.by_user)
        ? n.data.by_user.avatar
        : n.data.user.avatar;
      n.avatar = common.cloudinary.prepare(avatar, 90);
      n.avatarCircle = false;
    }
    if (n.type === 'roomjoinrequest') {
      n.href = '';
      n.css += 'open-room-users-allowed';
      var roomId = (n.data.room._id)
        ? n.data.room._id
        : n.data.room.id;
      n.html += 'data-room-id="' + roomId + '"';
      n.username = null;
    } else if (n.type === 'groupjoinrequest') {
      n.href = '';
      n.css += 'open-group-users-allowed';
      var groupId = (n.data.group._id)
        ? n.data.group._id
        : n.data.group.id;
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
  clearNotifications: function () {
    var _targets = this.$menu.find('.message.unread');
    var that = this;
    var ids = [];
    _.each(_targets, function (elt) {
      ids.push(elt.dataset.notificationId);
    });

    // Only call Client if at least something to tag as viewed
    if (ids.length === 0) {
      return;
    }

    app.client.notificationViewed(ids, false, _.bind(function () {
      // For each notification in the list, tag them as read
      _.each(_targets, function (notification) {
        notification.classList.remove('unread');
      });

      that.markHasRead = null;
    }, this));
  },
  // When user clicks on the read more link in the notification dropdown
  onReadMore: function (event) {
    event.stopPropagation(); // Cancel dropdown close behaviour
    this.$readMore.addClass('loading');
    app.client.notificationRead(null, this.lastNotifDisplayedTime(), 10, _.bind(function (data) {
      this.$readMore.removeClass('loading');
      this.isThereMoreNotifications = data.more;
      var previousContent = this.$menu.html();
      var html = '';
      _.each(data.notifications, _.bind(function (element) {
        html += this.renderNotification(element);
      }, this));

      this.$menu.html(previousContent + html);

      var that = this;
      this.markHasRead = setTimeout(function () {
        that.clearNotifications();
      }, this.timeToMarkAsRead);

      if (data.more) {
        this.$actions.removeClass('hidden');
      } else {
        this.$actions.addClass('hidden');
      }
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
    app.client.notificationViewed([], true, _.bind(function () {
      // For each notification in the list, tag them as read
      _.each(this.$menu.find('.message.unread'), function (notification) {
        notification.classList.remove('unread');
      });
    }, this));
  },
  onTagAsDone: function (event) {
    event.preventDefault();
    var message = $(event.currentTarget).parents('.message');
    var list = [message.data('notification-id')];
    app.client.notificationDone(list, false);
    return false;
  },
  // some notifications are tagged as done on the server
  onDoneNotification: function (data) {
    clearTimeout(this.markHasRead);

    _.each(data.notifications, function (elt) {
      $('.message[data-notification-id=' + elt + ']').fadeOut(500, function () {
        $(this).remove();
      });
    });

    var that = this;
    this.markHasRead = setTimeout(function () {
      that.clearNotifications();
    }, this.timeToMarkAsRead);

    this.toggleReadMore();
  },
  countNotificationsInDropdown: function () {
    return this.$menu.find('.message').length;
  },
  onMessageClick: function (event) {
    if (!$(event.currentTarget).hasClass('open-group-users-allowed') && !$(event.currentTarget).hasClass('open-room-users-allowed')) {
      this.trigger('close');
    }
  }
});

module.exports = DrawerUserNotificationsView;
