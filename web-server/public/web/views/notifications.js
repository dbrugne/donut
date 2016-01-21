var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');

var NotificationsView = Backbone.View.extend({
  id: 'notifications',

  unread: 0,

  events: {},

  initialize: function () {
    this.listenTo(app, 'viewedEvent', this.updateHandle);
    this.listenTo(app, 'unviewedEvent', this.updateHandle);

    this.listenTo(app.client, 'notification:new', this.onNewNotification);
    this.listenTo(app.user, 'change:unviewedNotification', _.bind(function (model, value) {
      this.updateCount(value);
    }, this));

    this.$badge = $('#notifications').find('.unread-count');
    this.$badgeHover = $('.hover-menu-notifications');
  },
  render: function () {
    return this;
  },
  // A new Notification is pushed from server
  onNewNotification: function (data) {
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
  updateCount: function (count) {
    if (_.isNaN(count)) {
      count = 0;
    }

    this.unread = count;
    this.$badge.text('');
    if (count > 0) {
      this.$badge.text(count).addClass('bounce');
      setTimeout(_.bind(function () {
        this.$badge.removeClass('bounce');
      }, this), 1500); // Remove class after animation to trigger animation later if needed
    }
  },
  updateHandle: function () {
    var unviewed = app.user.get('unviewedDiscussion');

    if (unviewed) {
      this.$badgeHover.removeClass('empty');
      this.$badgeHover.text(unviewed);
    } else {
      this.$badgeHover.addClass('empty');
      this.$badgeHover.text('');
    }
  },
  readAll: function () {
    this.updateCount(0);
  }
});

module.exports = NotificationsView;
