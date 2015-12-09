var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../libs/app');
var currentUser = require('../models/current-user');
var OneToOneModel = require('../models/onetoone');

var OnetoonesCollection = Backbone.Collection.extend({
  comparator: function (a, b) {
    var aName = a.get('username');
    var bName = b.get('username');

    aName = aName.toLocaleLowerCase();
    bName = bName.toLocaleLowerCase();

    if (!a.get('last') && !b.get('last')) {
      return (aName > bName) ? 1 : -1;
    }

    if (a.get('last') > b.get('last')) {
      return -1;
    } else {
      return 1;
    }
  },
  iwhere: function (key, val) { // insensitive case search
    var matches = this.filter(function (item) {
      return item.get(key).toLocaleLowerCase() === val.toLocaleLowerCase();
    });

    if (matches.length < 1) {
      return undefined;
    }

    return matches[0];
  },

  initialize: function () {
    this.listenTo(client, 'user:message', this.onMessage);
    this.listenTo(client, 'user:updated', this.onUpdated);
    this.listenTo(client, 'user:online', this.onUserOnline);
    this.listenTo(client, 'user:offline', this.onUserOffline);
    this.listenTo(client, 'user:join', this.onJoin);
    this.listenTo(client, 'user:leave', this.onLeave);
    this.listenTo(client, 'user:viewed', this.onViewed);
    this.listenTo(client, 'user:ban', this.onBan);
    this.listenTo(client, 'user:deban', this.onDeban);
    this.listenTo(client, 'user:message:edit', this.onMessageEdited);
    this.listenTo(client, 'user:typing', this.onTyping);
  },
  onWelcome: function (data) {
    _.each(data.onetoones, _.bind(function (one) {
      this.addModel(one);
    }, this));

    // remove when user no more in
    var modelsIds = _.map(this.models, 'id');
    var ids = _.map(data.onetoones, 'user_id');
    _.each(modelsIds, _.bind(function (modelId) {
      if (ids.indexOf(modelId) === -1) {
        this.remove(modelId);
      }
    }, this));

    app.trigger('redrawNavigationOnes');
  },
  onJoin: function (data) {
    // server ask to client to open this one to one in IHM
    this.addModel(data);
    app.trigger('redrawNavigationOnes');
  },
  addModel: function (data) {
    data.last = (data.lastactivity_at)
      ? new Date(data.lastactivity_at).getTime()
      : '';
    delete data.lastactivity_at;

    data.identifier = '@' + data.username;

    data.uri = '#u/' + data.username;

    var isNew = (this.get(data.user_id) === undefined);
    var model;
    if (!isNew) {
      // already exist in IHM (maybe reconnecting)
      model = this.get(data.user_id);
      model.set(data);
    } else {
      // add in IHM (by mainView)
      data.id = data.user_id;
      data.key = this._key(data.user_id, currentUser.get('user_id'));
      model = new OneToOneModel(data);
      this.add(model);
    }

    return model;
  },
  getModelFromEvent: function (event, autoCreate) {
    var key = this._key(event.user_id, event.to_user_id);

    // already opened?
    var model = this.findWhere({key: key});
    if (!model && !autoCreate) {
      return;
    }

    // create a new one
    if (!model) {
      // determine if i'm sender
      var iam = (currentUser.get('user_id') === event.user_id);
      var withUser = {
        key: key,
        user_id: (iam) ? event.to_user_id : event.user_id,
        username: (iam) ? event.to_username : event.username,
        realname: (iam) ? event.to_realname : event.realname,
        avatar: (iam) ? event.to_avatar : event.avatar,
        color: (iam) ? event.to_color : event.color
      };

      if (!iam) {
        // if i received a message from this user he is online
        withUser.status = 'online';
      }

      model = this.addModel(withUser);
      app.trigger('redrawNavigationOnes');
      client.userRead(withUser.user_id, {more: true}, function (data) {
        if (!data.err) {
          model.set(data);
        }
      });
    }

    return model;
  },
  _key: function (c1, c2) {
    return (c1 < c2)
      ? c1 + '-' + c2
      : c2 + '-' + c1;
  },

  onLeave: function (data) {
    var model = this.get(data.user_id);
    if (!model) {
      return;
    }

    this.remove(model);
    app.trigger('redrawNavigationOnes');
  },
  onMessage: function (data) {
    var model = this.getModelFromEvent(data, true);
    _.defer(function () { // cause view will be really added only on next tick
      model.onMessage(data);
    });
  },
  onUpdated: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.onUpdated(data);
  },
  onUserOnline: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.onUserOnline(data);
  },
  onUserOffline: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.onUserOffline(data);
  },
  onViewed: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.onViewed(data);
  },
  onBan: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.onBan(data);
  },
  onDeban: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.onDeban(data);
  },
  onMessageEdited: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.trigger('messageEdit', data);
  },
  onTyping: function (data) {
    var model = this.getModelFromEvent(data, false);
    if (!model) {
      return;
    }

    model.trigger('typing', data);
  }

});
module.exports = new OnetoonesCollection();
