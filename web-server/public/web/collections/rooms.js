var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
var RoomModel = require('../models/room');
var UserModel = require('../models/user');
var EventModel = require('../models/event');

var RoomsCollection = Backbone.Collection.extend({
  comparator: 'group_name',
  iwhere: function (key, val) { // insencitive case search
    var matches = this.filter(function (item) {
      return item.get(key).toLocaleLowerCase() === val.toLocaleLowerCase();
    });

    if (matches.length < 1) {
      return undefined;
    }

    return matches[ 0 ];
  },
  getByName: function (name) {
    return this.findWhere({ name: name });
  },

  initialize: function () {
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
  onJoin: function (data) {
    var model;
    if ((model = this.get(data.id)) && model.get('blocked')) {
      var isFocused = model.get('focused');
      this.remove(model);
      this.addModel(data);
      this.trigger('join', {
        model: this.get(data.id),
        wasFocused: isFocused
      }); // focus
    } else {
      // server ask to client to open this room in IHM
      this.addModel(data);
    }
  },
  addModel: function (data, blocked) {
    data.blocked = blocked || false;

    data.identifier = (data.group_id)
      ? '#' + data.group_name + '/' + data.name.replace('#', '')
      : data.name;

    data.uri = data.identifier;

    // update model
    var isNew = (this.get(data.id) === undefined);
    var model;
    if (!isNew) {
      // already exist in IHM (maybe reconnecting)
      model = this.get(data.id);
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

    model.onIn(data);
  },
  onOut: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onOut(data);
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

    model.onOp(data);
  },
  onDeop: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onDeop(data);
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

    model.onUserOnline(data);
  },
  onUserOffline: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onUserOffline(data);
  },
  onKick: function (data) {
    this._kickBanDisallow('kick', data);
  },
  onBan: function (data) {
    this._kickBanDisallow('ban', data);
  },
  onDisallow: function (data) {
    this._kickBanDisallow('disallow', data);
  },
  _kickBanDisallow: function (what, data) {
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
      if (what === 'ban' && data.banned_at) {
        modelTmp.banned_at = data.banned_at;
        if (data.banned_reason) {
          modelTmp.banned_reason = data.banned_reason;
        }
      }
      this.remove(model);
      this.addModel(modelTmp, blocked);
      this.trigger('kickedOrBanned', {
        model: this.get(data.room_id),
        wasFocused: isFocused,
        what: what,
        data: data
      }); // focus + alert
      return;
    }

    // check that target is in model.users
    var user = model.users.get(data.user_id);
    if (!user) {
      return;
    }

    // remove from this.users
    model.users.remove(user);
    model.set('users_number', model.get('users_number') - 1);

    // remove from this.op
    var ops = _.reject(model.get('op'), function (opUserId) {
      return (opUserId === data.user_id);
    });
    model.set('op', ops);

    // remove from this.devoices
    var devoices = model.get('devoices');
    if (devoices.length) {
      model.set('devoices', _.reject(devoices, function (element) {
        return (element === data.user_id);
      }));
    }

    model.users.sort();
    model.users.trigger('users-redraw');

    // trigger event
    model.trigger('freshEvent', new EventModel({
      type: 'room:' + what,
      data: data
    }));
  },
  onAllow: function (data) {
    if (!data || !data.room_id || !(this.get(data.room_id))) {
      return;
    }

    client.roomJoin(data.room_id, null, null, function (data) {
    });
  },
  onDeban: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    if (currentUser.get('user_id') === data.user_id) {
      client.roomJoin(data.room_id, null, null, _.bind(function (response) {
        if (response.room.mode === 'private') {
          var isFocused = model.get('focused');
          var modelTmp = model.attributes;
          this.remove(model);
          this.addModel(modelTmp, true);
          this.trigger('allowed', {
            model: this.get(data.room_id),
            wasFocused: isFocused
          }); // focus + alert
        }
      }, this));
    }

    model.onDeban(data);
  },
  onVoice: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onVoice(data);
  },
  onDevoice: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    model.onDevoice(data);
  },
  onLeave: function (data) {
    // server asks to this client to leave this room
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    this.remove(model);

    if (data.reason && data.reason === 'deleted') {
      this.trigger('deleted', { reason: i18next.t('chat.deletemessage', { name: data.name }) });
    }
  },
  onLeaveBlock: function (data) {
    var model;
    if (!data || !data.room_id || !(model = this.get(data.room_id))) {
      return;
    }

    this.remove(model);
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
