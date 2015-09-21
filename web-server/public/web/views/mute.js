var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var donutDebug = require('../libs/donut-debug');
var client = require('../client');
var currentUser = require('../models/current-user');

var debug = donutDebug('donut:mute');

var MuteView = Backbone.View.extend({
  el: $('#mute'),

  events: {
    'click .toggle': 'onToggle'
  },

  initialize: function (options) {
    this.listenTo(client, 'preferences:update', this.render);

    this.$icon = this.$('.icon');
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


module.exports = MuteView;