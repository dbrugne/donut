'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'models/app',
  'libs/donut-debug',
  'client',
  'models/current-user'
], function ($, _, Backbone, app, donutDebug, client, currentUser) {
  var debug = donutDebug('donut:mute');

  var MuteView = Backbone.View.extend({
    el: $('#mute'),

    events: {
      'click .toggle': 'onToggle'
    },

    initialize: function (options) {
      this.listenTo(client, 'preferences:update', this.render);

      this.$icon = this.$el.find('.icon');
    },

    render: function () {
      if (!currentUser.get('preferences')['browser:sounds']) {
        this.$icon.removeClass('icon-volume-up');
        this.$icon.addClass('icon-volume-off');
      } else {
        this.$icon.removeClass('icon-volume-off');
        this.$icon.addClass('icon-volume-up');
      }
      return this;
    },

    onToggle: function (event) {
      event.preventDefault();
      app.trigger('drawerClose');
      client.userPreferencesUpdate({
        'browser:sounds': !currentUser.shouldPlaySound()
      });
    },

  });

  return MuteView;
});
