var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var desktop = require('../libs/desktop');

var NotificationsView = Backbone.View.extend({
  id: 'notifications',
  events: {},
  initialize: function () {
    this.listenTo(app.user, 'change:unviewedNotification', this.updateIcon, this);
    this.listenTo(app.user, 'change:unviewedDiscussion', this.updateNavigationHandle, this);
    this.listenTo(app.client, 'notification:new', this.onNew);

    this.$badge = $('#notifications').find('.unread-count');
    this.$badgeHover = $('.hover-menu-notifications');
  },
  render: function () {
    return this;
  },
  onNew: function (data) {
    if (!app.user.shouldDisplayDesktopNotif()) {
      return;
    }

    var msg = (data.data.message)
      ? common.markup.toText(data.data.message)
      : '';
    var title = i18next.t('chat.notifications.messages.' + data.type, {
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

    title = title.replace(/<\/*span>/g, '').replace(/<br>/g, '');
    msg = msg.replace(/<\/*span>/g, '').replace(/<br>/g, '');

    var uri;
    var tag = data.id;
    if (data.data.room) {
      uri = data.data.room.name;
      tag = data.data.room.id;
    } else if (data.data.group) {
      uri = '#g/' + data.data.group.name;
      tag = data.data.group.id;
    }

    desktop.notify(tag, title, msg, uri);
  },
  updateIcon: function () {
    var unviewed = app.user.get('unviewedNotification');
    if (unviewed) {
      this.$badge.text(unviewed).addClass('bounce');
      setTimeout(_.bind(function () {
        this.$badge.removeClass('bounce');
      }, this), 1500); // remove class after animation to trigger animation later if needed
    } else {
      this.$badge.text('');
    }
  },
  updateNavigationHandle: function () {
    var unviewed = app.user.get('unviewedDiscussion');
    if (unviewed) {
      this.$badgeHover.removeClass('empty').text(unviewed);
    } else {
      this.$badgeHover.addClass('empty').text('');
    }
  }
});

module.exports = NotificationsView;
