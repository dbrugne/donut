var _ = require('underscore');
var Backbone = require('backbone');
var app = require('./../models/app');
var client = require('./client');
var groups = require('../collections/groups');
var rooms = require('../collections/rooms');
var onetoones = require('../collections/onetoones');
var i18next = require('i18next-client');
var HomeView = require('../views/home');

var DonutRouter = Backbone.Router.extend({

  routes: {
    '': 'root',
    '_=_': 'root', // workaround for facebook redirect uri bug https://github.com/jaredhanson/passport-facebook/issues/12#issuecomment-5913711
    'u/:user': 'focusOne',
    'g/:group': 'focusGroup',
    ':group(/:room)': 'identifierRoom',
    '*default': 'default'
  },

  clientOnline: false,

  nextFocus: null,

  homeView: null,

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
    this.listenTo(app, 'focus', this.focus);
    this.listenTo(app, 'joinRoom', this.focusRoom);
    this.listenTo(app, 'joinOnetoone', this.focusOne);
    this.listenTo(app, 'joinGroup', this.focusGroup);
    this.listenTo(app, 'viewAdded', this.viewAdded);
    this.listenTo(app, 'goToSearch', this.focusOnSearch);

    // static views
    this.homeView = new HomeView({});
  },

  root: function () {
    this.unfocusAll();
    app.trigger('redrawNavigation');
    this.homeView.focus();
    Backbone.history.navigate('#'); // just change URI, not run route action
  },

  focusGroup: function (name) {
    var model = groups.iwhere('name', name);

    client.groupId(name, _.bind(function (response) {
      if (response.code === 404) {
        return app.trigger('alert', 'error', i18next.t('chat.groupnotexists', { name: name }));
      } else if (response.code === 500) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
      var what = {
        users: true,
        admin: true,
        rooms: true
      };
      client.groupRead(response.group_id, what, _.bind(function (response) {
        if (!response.err) {
          model = groups.addModel(response);
          this.focus(model);
          model.trigger('redraw');
          app.trigger('nav-active-group', response.group_id);
        }
      }, this));
    }, this));
  },

  identifierRoom: function () {
    var identifier;
    if (!arguments[1]) {
      identifier = '#' + arguments[0];
    } else {
      identifier = '#' + arguments[0] + '/' + arguments[1];
    }
    this.focusRoom(identifier);
  },

  focusRoom: function (identifier) {
    var model = rooms.iwhere('identifier', identifier);
    if (typeof model !== 'undefined') {
      return this.focus(model);
    }

    // not already open
    this.nextFocus = identifier;
    client.roomId(identifier, function (response) {
      if (response.code === 404) {
        return app.trigger('alert', 'error', i18next.t('chat.roomnotexists', { name: identifier }));
      } else if (response.code === 500) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
      client.roomJoin(response.room_id, null, _.bind(function (response) {
        if (response.code === 404) {
          return app.trigger('alert', 'error', i18next.t('chat.roomnotexists', { name: identifier }));
        } else if (response.code === 403) {
          rooms.addModel(response.room, response.err);
          app.trigger('redrawNavigationRooms'); // also trigger a redraw when displaying a room blocked
          return;
        } else if (response.code === 500) {
          return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
        }
        return app.trigger('redrawNavigationRooms');
      }, this));
    });
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
    this.homeView.searchView.$search.focus();
    app.trigger('drawerClose');
  },

  unfocusAll: function () {
    groups.each(function (o) {
      o.set('focused', false);
    });
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
    if (rooms.length < 1 && onetoones.length < 1 && groups.length < 1) {
      return this.focusHome();
    }

    // No discussion provided, take first
    if (typeof model === 'undefined') {
      model = rooms.first();
      if (typeof model === 'undefined') {
        model = onetoones.first();
        if (typeof model === 'undefined') {
          model = groups.first();
          if (typeof model === 'undefined') {
            return this.focusHome();
          }
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
    app.trigger('nav-active');

    // Update URL (always!) and page title
    app.trigger('setTitle', model.get('identifier'));
    // just change URI, not run route action
    Backbone.history.navigate(model.get('uri'));

    app.trigger('drawerClose');
  },
  viewAdded: function (model, collection) {
    if (this.nextFocus === model.get('identifier')) {
      this.focus(model); // implicit navigation updating
      this.thisDiscussionShouldBeFocusedOnSuccess = null;
    }
  }
});

module.exports = new DonutRouter();
