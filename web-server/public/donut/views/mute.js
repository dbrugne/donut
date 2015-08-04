define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  'client',
  'models/current-user'
], function ($, _, Backbone, donutDebug, client, currentUser) {

  var debug = donutDebug('donut:mute');

  var MuteView = Backbone.View.extend({

    el: $('#mute'),

    events: {
      "click .toggle" : 'onToggle'
    },

    initialize: function (options) {
      this.mainView = options.mainView;
      this.listenTo(client, 'user:preferences', this.render);

      this.$icon = this.$el.find('.icon');
    },

    render: function () {
      if (!currentUser.get('preferences')['browser:sounds']) {
        this.$icon.removeClass('icon-volume-up');
        this.$icon.addClass('icon-volume-off');
      }
      else {
        this.$icon.removeClass('icon-volume-off');
        this.$icon.addClass('icon-volume-up');
      }
      return this;
    },

    onToggle: function (event) {
      event.preventDefault();
      this.mainView.drawerView.close();
      client.userPreferencesUpdate({
        'browser:sounds': !currentUser.shouldPlaySound()
      });
    },

  });

  return MuteView;
});