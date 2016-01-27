var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var currentUser = require('../libs/app').user;
var desktop = require('../libs/desktop');

var DrawerUserPreferencesView = Backbone.View.extend({
  template: require('../templates/drawer-user-preferences.html'),

  id: 'user-preferences',

  events: {
    'click .play-sound-test': 'onPlaySound',
    'click .desktop-notification-test': 'onTestDesktopNotify',
    'change .savable': 'onChangeValue'
  },

  initialize: function (options) {
    this.listenTo(app, 'userDeban', this.onDeban);

    // show spinner as temp content
    this.render();

    // ask for data
    var that = this;
    app.client.userPreferencesRead(null, function (data) {
      that.onResponse(data);
    });
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  onResponse: function (data) {
    _.each(data.bannedUsers, function (element, index, list) {
      list[index].avatarUrl = common.cloudinary.prepare(element.avatar, 30);
    });

    var html = this.template({
      username: currentUser.get('username'),
      preferences: data.preferences,
      bannedUsers: data.bannedUsers,
      desktopNeedsPermission: desktop.needsPermission()
    });
    this.$el.html(html);

    // Contact form
    this.$('[data-toggle="contactform"]').contactform({});
    this.initializeTooltips();
  },
  onPlaySound: function (event) {
    event.preventDefault();
    app.trigger('playSoundForce');
  },
  onTestDesktopNotify: function (event) {
    event.preventDefault();
    desktop.notify('test', i18next.t('preferences.notif.channels.desktop-notify-test'));
  },
  onChangeValue: function (event) {
    var $target = $(event.currentTarget);
    var key = $target.attr('value');
    var value = $target.is(':checked');

    // Radio button particular handling
    if ($target.attr('type') === 'radio') {
      value = (key.substr(key.lastIndexOf(':') + 1) === 'true');
      key = key.substr(0, key.lastIndexOf(':'));
    }

    var update = {};
    update[key] = value;

    var that = this;
    app.client.userPreferencesUpdate(update, function (data) {
      that.$('.errors').hide();
      if (data.err) {
        that.$('.errors').html(i18next.t('global.unknownerror')).show();
      }
    });
  },
  onDeban: function (data) {
    this.render();

    var that = this;
    app.client.userPreferencesRead(null, function (data) {
      that.onResponse(data);
    });
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = DrawerUserPreferencesView;
