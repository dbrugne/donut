var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../libs/app');
var currentUser = require('../models/current-user');
var RoomModel = require('../models/room');

var RoomsCollection = Backbone.Collection.extend({
  comparator: function (a, b) {
    var aGroup = a.get('group_name');
    var bGroup = b.get('group_name');

    var aName = a.get('name');
    var bName = b.get('name');

    aName = aName.toLocaleLowerCase();
    bName = bName.toLocaleLowerCase();

    if (!aGroup && bGroup) {
      return 1;
    } else if (aGroup && !bGroup) {
      return -1;
    } else if (!aGroup && !bGroup) {
      if (!a.get('last') && !b.get('last')) {
        return (aName > bName) ? 1 : -1;
      }

      if (a.get('last') > b.get('last')) {
        return -1;
      } else {
        return 1;
      }
    }

    aGroup = aGroup.toLocaleLowerCase();
    bGroup = bGroup.toLocaleLowerCase();
    if (aGroup === bGroup) {
      if (!a.get('last') && !b.get('last')) {
        return (aName > bName) ? 1 : -1;
      }

      if (a.get('last') > b.get('last')) {
        return -1;
      } else {
        return 1;
      }
    }
    if (aGroup < bGroup) {
      return -1;
    } else {
      return 1;
    }
  },
  iwhere: function (key, val) { // insencitive case search
    var matches = this.filter(function (item) {
      return item.get(key).toLocaleLowerCase() === val.toLocaleLowerCase();
    });

    if (matches.length < 1) {
      return undefined;
    }

    return matches[0];
  },
  getByGroup: function (group_id) {
    return this.findWhere({group_id: group_id});
  },
  getByNameAndGroup: function (name, group) {
    if (!group) {
      var models = this.where({name: name});
      return _.find(models, function (m) {
        return (typeof m.get('group_name') === 'undefined');
      });
    } else {
      return this.findWhere({name: name, group_name: group});
    }
  },

  initialize: function () {
    this.listenTo(client, 'welcome', this.onWelcome);
    this.listenTo(client, 'room:in', this.onIn);
    this.listenTo(client, 'room:out', this.onOut);
    this.listenTo(client, 'room:topic', this.onTopic);
    this.listenTo(client, 'room:message', this.onMessage);
    this.listenTo(client, 'room:op', this.onOp);
    this.listenTo(client, 'room:deop', this.onDeop);
    this.listenTo(client, 'room:updated', this.onUpdated);
    this.listenTo(client, 'user:online', this.onUserOnline);
    this.listenTo(client, 'user:offline', this.onUserOffline);
    this.listenTo(client, 'room:kick', this.onKick);
    this.listenTo(client, 'room:ban', this.onBan);
    this.listenTo(client, 'room:disallow', this.onDisallow);
    this.listenTo(client, 'room:groupban', this.onGroupBan);
    this.listenTo(client, 'room:groupdisallow', this.onGroupDisallow);
    this.listenTo(client, 'room:allow', this.onAllow);
    this.listenTo(client, 'room:deban', this.onDeban);
    this.listenTo(client, 'room:voice', this.onVoice);
    this.listenTo(client, 'room:devoice', this.onDevoice);
    this.listenTo(client, 'room:join', this.onJoin);
    this.listenTo(client, 'room:leave', this.onLeave);
    this.listenTo(client, 'room:leave:block', this.onLeaveBlock);
    this.listenTo(client, 'room:viewed', this.onViewed);
    this.listenTo(client, 'room:set:private', this.onSetPrivate);
    this.listenTo(client, 'room:message:spam', this.onMessageSpam);
    this.listenTo(client, 'room:message:unspam', this.onMessageUnspam);
    this.listenTo(client, 'room:message:edit', this.onMessageEdited);
    this.listenTo(client, 'room:typing', this.onTyping);
  },
  onWelcome: function (data) {
    currentUser.set(data.user, {silent: true});
    currentUser.setPreferences(data.preferences, {silent: true});
    // regular
    _.each(data.rooms, _.bind(function (room) {
      this.addModel(room);
    }, this));

    // blocked
    _.each(data.blocked, _.bind(function (room) {
      this.addModel(room, room.blocked
        ? room.blocked
        : true);
    }, this));

    // remove when user no more in
    var modelsIds = _.map(this.models, 'id');
    var ids = _.map(data.rooms, 'id').concat(_.map(data.blocked, 'id'));
    _.each(modelsIds, _.bind(function (modelId) {
      if (ids.indexOf(modelId) === -1) {
        this.remove(modelId);
      }
    }, this));

    app.trigger('redrawNavigationRooms');
  },
  onJoin: function (data) {
    var model;
    if ((model = this.get(data.room_id)) && model.get('blocked')) {
      var isFocused = model.get('focused');
      this.remove(model);
      this.addModel(data);
      this.trigger('join', {
        model: this.get(data.room_id),
        wasFocused: isFocused
      }); // focus
    } else {
      // server ask to client to open this room in IHM
      this.addModel(data);
    }

    // both case re-render navigation
    app.trigger('redrawNavigationRooms');
  },
  addModel: function (data, blocked) {
    data.id = data.room_id;
    data.blocked = blocked || false;

    data.last = (data.lastactivity_at)
      ? new Date(data.lastactivity_at).getTime()
      : '';
    delete data.lastactivity_at;

    data.identifier = (data.group_id)
      ? '#' + data.group_name + '/' + data.name
      : '#' + data.name;

    data.uri = data.identifier;

    // update model
    var isNew = (!this.get(data.room_id));
    var model;
    if (!isNew) {
      // already exist in IHM (maybe reconnecting)
      model = this.get(data.room_id);
      model.set(data);
    } else {
      // add in IHM (by mainView)
      model = new RoomModel(data);
      this.add(model);
    }
  },
  onIn: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onIn(data);
  },
  onOut: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onOut(data);
  },
  onTopic: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onTopic(data);
  },
  onMessage: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onMessage(data);
  },
  onOp: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onOp(data);
  },
  onDeop: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onDeop(data);
  },
  onUpdated: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onUpdated(data);
  },
  onUserOnline: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onUserOnline(data);
  },
  onUserOffline: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onUserOffline(data);
  },
  onKick: function (data) {
    this._onExpulsion('kick', data);
  },
  onBan: function (data) {
    this._onExpulsion('ban', data);
  },
  onDisallow: function (data) {
    this._onExpulsion('allowed', data);
  },
  onGroupBan: function (data) {
    this._onExpulsion('groupban', data);
  },
  onGroupDisallow: function (data) {
    this._onExpulsion('groupdisallow', data);
  },
  _onExpulsion: function (what, data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    // if i'm the "targeted user" destroy the model/view
    if (currentUser.get('user_id') === data.user_id) {
      var isFocused = model.get('focused');
      var blocked = (what === 'ban')
        ? 'banned'
        : (what === 'kick')
        ? 'kicked'
        : true;
      var modelTmp = model.attributes;
      if (data.banned_at) {
        modelTmp.banned_at = data.banned_at;
      }
      if (data.reason) {
        modelTmp.reason = data.reason;
      }
      this.remove(model); // remove existing view
      this.addModel(modelTmp, blocked);
      app.trigger('redrawNavigationRooms');
      if (isFocused) {
        app.trigger('focus', this.get(data.room_id));
      }
      return;
    }

    model.users.onExpulsion(what, data);
  },
  onAllow: function (data) {
    if (!data || !data.room_id || !(this.get(data.room_id))) {
      return;
    }

    client.roomJoin(data.room_id); // @todo : anti-pattern!
  },
  onDeban: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    if (currentUser.get('user_id') === data.user_id) {
      // @todo : anti-pattern!
      client.roomJoin(data.room_id, null, _.bind(function () {
        if (data.room_mode === 'private') {
          var isFocused = model.get('focused');
          var modelTmp = model.attributes;
          this.remove(model);
          this.addModel(modelTmp, true);
          app.trigger('redrawNavigationRooms');
          this.trigger('allowed', {
            model: this.get(data.room_id),
            wasFocused: isFocused
          }); // focus + alert
        }
      }, this));
    }

    model.users.onDeban(data);
  },
  onVoice: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onVoice(data);
  },
  onDevoice: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.users.onDevoice(data);
  },
  onLeave: function (data) {
    // server asks to this client to leave this room
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    var roomWasFocused = model.get('focused');
    var groupId = model.get('group_id');
    var roomId = model.get('id');
    var roomName = model.get('name');

    this.remove(model);
    app.trigger('redrawNavigationRooms');

    if (data.reason && data.reason === 'deleted') {
      this.trigger('deleted', {
        name: roomName,
        was_focused: roomWasFocused,
        group_id: groupId,
        room_id: roomId
      });
    }
  },
  onLeaveBlock: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    this.remove(model);
    app.trigger('redrawNavigationRooms');
  },
  onViewed: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onViewed(data);
  },
  onSetPrivate: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.trigger('setPrivate', data);
  },
  onMessageSpam: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.trigger('messageSpam', data);
  },
  onMessageUnspam: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.trigger('messageUnspam', data);
  },
  onMessageEdited: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.trigger('messageEdit', data);
  },
  onTyping: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.trigger('typing', data);
  }
});

module.exports = new RoomsCollection();
