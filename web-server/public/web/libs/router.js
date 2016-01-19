var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('./app');
var i18next = require('i18next-client');
var HomeView = require('../views/home');
var SearchView = require('../views/search');
var GroupView = require('../views/group');
var RoomView = require('../views/discussion-room');
var OneView = require('../views/discussion-onetoone');

var debug = require('./donut-debug')('donut:discussions');

var DonutRouter = Backbone.Router.extend({
  routes: {
    '': 'root',
    '_=_': 'root', // workaround for facebook redirect uri bug https://github.com/jaredhanson/passport-facebook/issues/12#issuecomment-5913711
    'search': 'search',
    'u/:user': 'focusOne',
    'g/:group': 'focusGroup',
    ':group(/:room)': 'focusRoom',
    '*default': 'default'
  },

  $discussionsPanelsContainer: $('#center'), // router is reponsible to add views in DOM

  clientOnline: false,

  views: {},

  nextFocus: null,

  homeView: null,
  searchView: null,

  initialize: function (options) {
    // on connection/reconnection
    this.listenTo(app, 'readyToRoute', _.bind(function () {
      this.clientOnline = true;
      Backbone.history.start();
    }, this));
    // on disconnection
    this.listenTo(app.client, 'disconnect', _.bind(function () {
      this.clientOnline = false;
      Backbone.history.stop();
    }, this));
    this.listenTo(app, 'discussionAdded', this.onDiscussionAdded);
    this.listenTo(app, 'discussionRemoved', this.onDiscussionRemoved);
    this.listenTo(app, 'joinRoom', this._focusRoom);
    this.listenTo(app, 'joinOnetoone', this.focusOne);
    this.listenTo(app, 'joinGroup', this._focusGroup);
    this.listenTo(app, 'goToSearch', this.goToSearch);
    this.listenTo(app, 'updateSearch', this.search);

    // static views
    this.homeView = new HomeView({});
    this.searchView = new SearchView({});
  },

  root: function () {
    app.setFocusedModel();
    this.unfocusStatics();
    app.trigger('redrawNavigation');
    this.homeView.focus();
    Backbone.history.navigate('#'); // just change URI, not run route action
  },

  goToSearch: function (event) {
    if (event) {
      var elt = $(event.currentTarget);
      if (elt && elt.data('search') && elt.data('type')) {
        return this.search(elt.data('search'), elt.data('type'));
      }
    }

    app.setFocusedModel();
    this.unfocusStatics();
    app.trigger('redrawNavigation');
    this.homeView.focus();
    Backbone.history.navigate('#'); // just change URI, not run route action
    this.searchView.focusSearch();
  },

  search: function (search, type) {
    if (!search || !type) {
      return this.root();
    }

    var data = {
      search: search,
      skip: null,
      what: {
        users: type === 'users',
        groups: type === 'groups',
        rooms: type === 'rooms'
      }
    };

    app.setFocusedModel();
    this.unfocusStatics();
    app.trigger('redrawNavigation');
    app.trigger('drawerClose');
    this.searchView.render(data);
    Backbone.history.navigate('search'); // just change URI, not run route action
  },

  focusGroup: function (name) {
    this._focusGroup({name: name, popin: false});
  },

  _focusGroup: function (data) {
    var name = data.name;
    var model = app.groups.iwhere('name', name);
    if (model) {
      this.focus(model);
      return app.trigger('nav-active-group', {
        group_id: model.get('group_id'),
        group_name: model.get('name'),
        popin: data.popin
      });
    }

    app.client.groupId(name, _.bind(function (response) {
      if (response.code === 404) {
        return app.trigger('alert', 'error', i18next.t('chat.groupnotexists', {name: name}));
      } else if (response.code === 500) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
      var groupId = response.group_id;
      app.client.groupJoin(groupId, _.bind(function (response) {
        if (!response.err) {
          app.client.groupRead(groupId, {users: true, rooms: true}, _.bind(function (response) {
            if (!response.err) {
              model = app.groups.addModel(response);
              model.trigger('redraw');
              this.focus(model);
              app.trigger('nav-active-group', {
                group_id: response.group_id,
                group_name: name,
                popin: data.popin
              });
              app.trigger('redrawNavigationGroups');
            }
          }, this));
        }
      }, this));
    }, this));
  },

  focusRoom: function () {
    var identifier;
    if (!arguments[1]) {
      identifier = '#' + arguments[0];
    } else {
      identifier = '#' + arguments[0] + '/' + arguments[1];
    }
    this._focusRoom(identifier);
  },

  _focusRoom: function (identifier) {
    // already joined
    var model = app.rooms.iwhere('identifier', identifier);
    if (typeof model !== 'undefined') {
      return this.focus(model);
    }

    // not already joined
    this.nextFocus = identifier;
    app.client.roomId(identifier, function (responseRoom) {
      if (responseRoom.code === 500) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
      if (responseRoom.code === 404) {
        return app.trigger('alert', 'error', i18next.t('chat.roomnotexists', {name: identifier}));
      }
      app.client.roomJoin(responseRoom.room_id, null, function (response) {
        if (response.code === 500) {
          return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
        }
        if (response.code === 404) {
          return app.trigger('alert', 'error', i18next.t('chat.roomnotexists', {name: identifier}));
        }
      });
    });
  },

  focusOne: function (username) {
    var model = app.ones.iwhere('username', username);
    if (typeof model !== 'undefined') {
      return this.focus(model);
    }

    // not already open
    this.nextFocus = '@' + username;
    app.client.userId(username, function (response) {
      if (response.err && response !== 500) {
        return app.trigger('alert', 'error', i18next.t('chat.users.usernotexist'));
      } else if (response.code === 500) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
      if (!response.user_id) {
        return;
      }
      app.client.userJoin(response.user_id, function (response) {
        if (response.err && response !== 500) {
          return app.trigger('alert', 'error', i18next.t('chat.users.usernotexist'));
        } else if (response.code === 500) {
          return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
        }
      });
    });
  },

  default: function () {
    Backbone.history.navigate('#', {trigger: true}); // redirect on home
  },

  unfocusStatics: function () {
    this.homeView.$el.hide();
    this.searchView.$el.hide();
  },

  focus: function (model) {
    // No opened discussion, display default
    if (app.rooms.length < 1 && app.ones.length < 1 && app.groups.length < 1) {
      return this.focusHome();
    }

    // No discussion provided, take first
    if (typeof model === 'undefined') {
      model = app.rooms.first();
      if (typeof model === 'undefined') {
        model = app.ones.first();
        if (typeof model === 'undefined') {
          model = app.groups.first();
          if (typeof model === 'undefined') {
            return this.focusHome();
          }
        }
      }
    }

    // delegate model updating to donut-client
    // (if model is null every model will be unfocused)
    app.setFocusedModel(model);
    this.unfocusStatics();

    if (!this.views[model.get('id')]) {
      this.addView(model);
    }

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

  addView: function (model) {
    var constructor;
    if (model.get('type') === 'room') {
      constructor = RoomView;
    } else if (model.get('type') === 'group') {
      constructor = GroupView;
    } else {
      constructor = OneView;
    }

    debug('add view', model.get('identifier'));

    // create view
    var view = new constructor({ model: model });

    // add to views list
    // @todo : store view on model, check for cyclic ref problems
    this.views[model.get('id')] = view;

    // append to DOM
    this.$discussionsPanelsContainer.append(view.$el);
  },
  onDiscussionAdded: function (model) {
    if (!model) {
      return;
    }

    // focus after join
    if (this.nextFocus === model.get('identifier')) {
      this.focus(model); // implicit navigation updating
      this.nextFocus = null;
    }
  },
  onDiscussionRemoved: function (model) {
    if (!model) {
      return;
    }
    var view = this.views[model.get('id')];
    if (!view) {
      return;
    }

    debug('remove view', model.get('identifier'));

    var wasFocused = model.get('focused');
    view.removeView();
    delete this.views[model.get('id')];

    if (wasFocused) {
      // focus default (home)
      Backbone.history.navigate('#', {trigger: true});
    }
  }
});

module.exports = new DonutRouter();
