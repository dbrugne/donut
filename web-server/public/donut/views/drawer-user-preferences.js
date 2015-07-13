define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/window',
  '_templates'
], function ($, _, Backbone, client, currentUser, windowView, templates) {
  var DrawerUserPreferencesView = Backbone.View.extend({

    template: templates['drawer-user-preferences.html'],

    id: 'user-preferences',

    events  : {
      'click .play-sound-test': 'onPlaySound',
      'click .desktop-notification-test': 'onTestDesktopNotify',
      'change .savable': 'onChangeValue'
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.userPreferencesRead(null, function(data) {
        that.onResponse(data);
      });
    },
    render: function() {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    onResponse: function(preferences) {
      var color = currentUser.get('color');
      // colorize drawer .opacity
      if (color)
        this.trigger('color', color);

      var html = this.template({
        username: currentUser.get('username'),
        color: color,
        preferences: preferences
      });
      this.$el.html(html);

      // Contact form
      this.$('[data-toggle="contactform"]').contactform({});
    },
    onPlaySound: function(event) {
      event.preventDefault();
      windowView._play();
    },
    onTestDesktopNotify: function(event) {
      event.preventDefault();
      windowView._desktopNotify($.t('preferences.notif.channels.desktop-notify-test'),'');
    },
    onChangeValue: function(event) {
      var $target = $(event.currentTarget);
      var key = $target.attr('value');
      var value = $target.is(":checked");

      // Radio button particular handling
      if ($target.attr('type') == 'radio') {
        value = (key.substr(key.lastIndexOf(':')+1) == 'true');
        key = key.substr(0, key.lastIndexOf(':'));
      }

      var update = {};
      update[key] = value;

      var that = this;
      client.userPreferencesUpdate(update, function(data) {
        that.$el.find('.errors').hide();
        if (data.err) {
          that.$el.find('.errors').html($.t('global.unknownerror')).show();
          return;
        }
      })
    }

  });

  return DrawerUserPreferencesView;
});