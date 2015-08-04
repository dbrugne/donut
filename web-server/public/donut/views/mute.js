define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  'client',
  'models/current-user'
], function ($, _, Backbone, donutDebug, client, currentUser) {

  var debug = donutDebug('donut:navbar');

  var MuteView = Backbone.View.extend({

    el: $('#mute'),

    events: {
      "click .sound" : 'onClickSound'
    },

    initialize: function (options) {
      this.listenTo(client, 'user:preferences', this.updateIcon);
      this.$iconesound = this.$el.find('.icon');
      this.mainView = options.mainView;
      this.render();
    },

    render: function () {
      this.updateIcon();
      return this;
    },

    updateIcon: function () {
      if (!currentUser.get('preferences')['browser:sounds']) {
        this.$iconesound.removeClass('icon-volume-up');
        this.$iconesound.addClass('icon-volume-off');
      }
      else {
        this.$iconesound.removeClass('icon-volume-off');
        this.$iconesound.addClass('icon-volume-up');
      }
    },

    onClickSound: function (event) {
      event.preventDefault();
      var update = {};
      update['browser:sounds'] = currentUser.shouldPlaySound() ? false : true;
      client.userPreferencesUpdate(update, function (data) {
          if (data.err) {
            return;
          }
        }
      );
      this.mainView.drawerView.close();
    },

  });

  return MuteView;
});