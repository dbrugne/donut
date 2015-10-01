var _ = require('underscore');
var Backbone = require('backbone');
var app = require('./../models/app');
var client = require('./client');
var rooms = require('../collections/rooms');
var onetoones = require('../collections/onetoones');
var i18next = require('i18next-client');
var HomeView = require('../views/home');

var DonutRouter = Backbone.Router.extend({

  routes: {
    '': 'root',
    'u/:user': 'focusOne',
    'g/:group': 'focusGroup',
    ':group(/:room)': 'focusRoom',
    '*default': 'default'
  },

  clientOnline: false,

  nextFocus: '',

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
    this.listenTo(app, 'joinRoom', this.focusRoom);
    this.listenTo(app, 'joinOnetoone', this.focusOne);
    this.listenTo(app, 'viewAdded', this.viewAdded);

    // static views
    this.homeView = new HomeView({});
  },

  root: function () {
    this.unfocusAll();
    onetoones.trigger('redraw-block');
    rooms.trigger('redraw-block');
    this.homeView.focus();
    Backbone.history.navigate('#'); // just change URI, not run route action
  },

  focusGroup: function (group) {
    // @todo dbr
    client.groupRead(null, group, _.bind(function (response) {
      console.log('show', response);
    }, this));
  },

  focusRoom: function () {
    var identifier;
    if (!arguments[1]) {
      identifier = '#' + arguments[0];
    } else {
      identifier = '#' + arguments[0] + '/' + arguments[1];
    }

    var model = rooms.iwhere('identifier', identifier);
    if (typeof model !== 'undefined') {
      model.resetNew();
      return this.focus(model);
    }

    // not already open
    this.nextFocus = identifier;
    client.roomJoin(null, identifier, null, _.bind(function (response) {
      if (response.code === 404) {
        return app.trigger('alert', 'error', i18next.t('chat.roomnotexists', { name: identifier }));
      } else if (response.code === 403) {
        return rooms.addModel(response.room, response.err);
      } else if (response.code === 500) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
    }, this));
  },

  focusOne: function (username) {
    var model = onetoones.iwhere('username', username);
    if (typeof model === 'undefined') {
      // Not already open
      this.nextFocus = '@' + username;
      onetoones.join(username);
    } else {
      this.focus(model);
    }
  },

  default: function () {
    Backbone.history.navigate('#', {trigger: true}); // redirect on home
  },

  focusOnSearch: function () {
    this.root();
    this.homeView.searchView.$search
      .focus();
    app.trigger('drawerClose');
  },

  unfocusAll: function () {
    rooms.each(function (o) {
      o.set('focused', false);
    });
    onetoones.each(function (o) {
      o.set('focused', false);
    });

    // static pages
    this.homeView.$el.hide();
  },

  focus: function (model) {
    // No opened discussion, display default
    if (rooms.length < 1 && onetoones.length < 1) {
      return this.focusHome();
    }

    // No discussion provided, take first
    if (typeof model === 'undefined') {
      model = rooms.first();
      if (typeof model === 'undefined') {
        model = onetoones.first();
        if (typeof model === 'undefined') {
          return this.focusHome();
        }
      }
    }

    // unfocus every model
    this.unfocusAll();

    // Focus the one we want
    model.set('focused', true);

    // color
    if (model.get('color')) {
      app.trigger('changeColor', model.get('color'));
    } else {
      app.trigger('changeColor', this.defaultColor);
    }

    // nav
    onetoones.trigger('redraw-block');
    rooms.trigger('redraw-block');

    // Update URL (always!) and page title
    app.trigger('setTitle', model.get('identifier'));
    // just change URI, not run route action
    Backbone.history.navigate(model.get('uri'));

    app.trigger('drawerClose');
  },

  viewAdded: function (model, collection) {
    if (this.nextFocus === model.get('identifier')) {
      this.focus(model); // implicit redraw-block
      this.thisDiscussionShouldBeFocusedOnSuccess = null;
    } else {
      collection.trigger('redraw-block');
    }
  }
});

module.exports = new DonutRouter();
