var _ = require('underscore');
var Backbone = require('backbone');
var app = require('./models/app');
var client = require('./client');

var DonutRouter = Backbone.Router.extend({
  routes: {
    '': 'root',
    'room/:name': 'focusRoom',
    'user/:user': 'focusOneToOne',
    '*default': 'default'
  },

  clientOnline: false,

  initialize: function (options) {
    var that = this;
    this.listenTo(app, 'readyToRoute', _.bind(function () {
      that.clientOnline = true;
      Backbone.history.start();
    }, this));
    this.listenTo(client, 'disconnect', _.bind(function () {
      that.clientOnline = false;
      Backbone.history.stop();
    }, this));
  },

  root: function () {
    app.trigger('focusHome');
  },

  focusRoom: function (name) {
    app.trigger('focusRoom', '#' + name);
  },

  focusOneToOne: function (username) {
    app.trigger('focusOneToOne', username);
  },

  default: function () {
    Backbone.history.navigate('#', {trigger: true}); // redirect on home
  }
});


module.exports = new DonutRouter();