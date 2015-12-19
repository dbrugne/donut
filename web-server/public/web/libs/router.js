var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('./app');
var i18next = require('i18next-client');
var HomeView = require('../views/home');
var SearchView = require('../views/search');

var DonutRouter = Backbone.Router.extend({
  routes: {
    '': 'root',
    '_=_': 'root', // workaround for facebook redirect uri bug https://github.com/jaredhanson/passport-facebook/issues/12#issuecomment-5913711
    'u/:user': 'focusOne',
    'g/:group': 'focusGroup',
    'search': 'search',
    ':group(/:room)': 'identifierRoom',
    '*default': 'default'
  },

  clientOnline: false,

  nextFocus: null,

  homeView: null,
  searchView: null,

  initialize: function (options) {
    var that = this;
    this.listenTo(app, 'readyToRoute', _.bind(function () {
      that.clientOnline = true;
      Backbone.history.start();
    }, this));
    this.listenTo(app.client, 'disconnect', _.bind(function () {
      that.clientOnline = false;
      Backbone.history.stop();
    }, this));
    this.listenTo(app, 'focus', this.focus);
    this.listenTo(app, 'joinRoom', this.focusRoom);
    this.listenTo(app, 'joinOnetoone', this.focusOne);
    this.listenTo(app, 'joinGroup', this.joinGroup);
    this.listenTo(app, 'viewAdded', this.viewAdded);
    this.listenTo(app, 'goToSearch', this.goToSearch);
    this.listenTo(app, 'updateSearch', this.search);

    // static views
    this.homeView = new HomeView({});
    this.searchView = new SearchView({});
  },

  root: function () {
    this.unfocusAll();
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

    this.unfocusAll();
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

    this.unfocusAll();
    app.trigger('redrawNavigation');
    app.trigger('drawerClose');
    this.searchView.render(data);
    Backbone.history.navigate('search'); // just change URI, not run route action
  },

  focusGroup: function (name) {
    this.joinGroup({name: name, popin: false});
  },

  joinGroup: function (data) {
    var name = data.name;
    var model = app.groups.iwhere('name', name);
    if (model) {
      model.onRefresh();
      return this.focus(model);
    }

    app.client.groupId(name, _.bind(function (response) {
      if (response.code === 404) {
        return app.trigger('alert', 'error', i18next.t('chat.groupnotexists', {name: name}));
      } else if (response.code === 500) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
      app.client.groupRead(response.group_id, {users: true, rooms: true}, _.bind(function (response) {
        if (!response.err) {
          model = app.groups.addModel(response);
          model.trigger('redraw');
          app.trigger('redrawNavigationRooms');
          this.focus(model);
          app.trigger('nav-active-group', {
            group_id: response.group_id,
            group_name: name,
            popin: data.popin
          });
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

  focusRoom: function (identifier, forceRedraw) {
    var model = app.rooms.iwhere('identifier', identifier);
    if (typeof model !== 'undefined' && !forceRedraw) {
      return this.focus(model);
    }

    // not already open or force redraw
    this.nextFocus = identifier;
    var that = this;
    app.client.roomId(identifier, function (responseRoom) {
      if (responseRoom.code === 404) {
        return app.trigger('alert', 'error', i18next.t('chat.roomnotexists', {name: identifier}));
      } else if (responseRoom.code === 500) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
      app.client.roomJoin(responseRoom.room_id, null, _.bind(function (response) {
        if (response.err === 'group-members-only') {
          return app.trigger('alert', 'error', i18next.t('chat.groupmembersonly', {
            name: identifier,
            group_name: responseRoom.group.name
          }));
        } else if (response.code === 404) {
          return app.trigger('alert', 'error', i18next.t('chat.roomnotexists', {name: identifier}));
        } else if (response.code === 403) {
          if (model) {
            var isFocused = model.get('focused');
            model.unbindUsers();
            app.rooms.remove(model);
          }
          app.rooms.addModel(response.room, response.err);
          app.trigger('redrawNavigationRooms'); // also trigger a redraw when displaying a room blocked

          if (model && isFocused) {
            that.focus(model);
          }
          return;
        } else if (response.code === 500) {
          return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
        }
        return app.trigger('redrawNavigationRooms');
      }, this));
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

  unfocusAll: function () {
    app.groups.each(function (o) {
      o.set('focused', false);
    });
    app.rooms.each(function (o) {
      o.set('focused', false);
    });
    app.ones.each(function (o) {
      o.set('focused', false);
    });

    // static pages
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
