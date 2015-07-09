define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/window',
  'views/modal-confirmation',
  '_templates'
], function ($, _, Backbone, client, currentUser, windowView, confirmationView, templates) {
  var DrawerUserPreferencesView = Backbone.View.extend({

    template: templates['drawer-user-preferences.html'],

    id: 'user-preferences',

    events: {
      'click .play-sound-test': 'onPlaySound',
      'click .desktop-notification-test': 'onTestDesktopNotify',
      'change .savable': 'onChangeValue',
      'click .deban-user': 'onDeban'
    },

    initialize: function (options) {
      this.mainView = options.mainView;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.userPreferencesRead(null, function (data) {
        that.onResponse(data);
      });
    },
    render: function () {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    onResponse: function (data) {
      var color = currentUser.get('color');
      // colorize drawer .opacity
      if (color)
        this.trigger('color', color);

      var html = this.template({
        username: currentUser.get('username'),
        color: color,
        preferences: data.preferences,
        bannedUsers: data.bannedUsers
      });
      this.$el.html(html);
    },
    onPlaySound: function (event) {
      event.preventDefault();
      windowView._play();
    },
    onTestDesktopNotify: function (event) {
      event.preventDefault();
      windowView._desktopNotify($.t('preferences.notif.channels.desktop-notify-test'), '');
    },
    onChangeValue: function (event) {
      var $target = $(event.currentTarget);
      var key = $target.attr('value');
      var value = $target.is(":checked");

      // Radio button particular handling
      if ($target.attr('type') == 'radio') {
        value = (key.substr(key.lastIndexOf(':') + 1) == 'true');
        key = key.substr(0, key.lastIndexOf(':'));
      }

      var update = {};
      update[key] = value;

      var that = this;
      client.userPreferencesUpdate(update, function (data) {
        that.$el.find('.errors').hide();
        if (data.err) {
          that.$el.find('.errors').html($.t('global.unknownerror')).show();
          return;
        }
      })
    },
    onBannedChange: function(model, value, options) {
      console.log(model);
      console.log(value);
      console.log(options);
    },
    onDeban: function (event) {
      event.preventDefault();

      var uid = $(event.currentTarget).data('uid');
      if (!uid)
        return;

      confirmationView.open({}, function () {
        client.userDeban(uid);
        var group = $(event.currentTarget).parents('.users');
        $(event.currentTarget).parents('tr').remove();
        if (group.find('tr').length == 0)
          group.remove();
      });
    }

  });

  return DrawerUserPreferencesView;
});