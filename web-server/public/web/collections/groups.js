var _ = require('underscore');
var Backbone = require('backbone');
var GroupModel = require('../models/group');
var client = require('../libs/client');
var app = require('../libs/app');
var currentUser = require('../models/current-user');
var rooms = require('./rooms');

var GroupsCollection = Backbone.Collection.extend({
  iwhere: function (key, val) { // insensitive case search
    var matches = this.filter(function (item) {
      return item.get(key).toLocaleLowerCase() === val.toLocaleLowerCase();
    });

    if (matches.length < 1) {
      return undefined;
    }

    return matches[0];
  },
  getByName: function (name) {
    return this.findWhere({name: name});
  },

  initialize: function () {
    this.listenTo(client, 'group:updated', this.onUpdated);
    this.listenTo(client, 'group:ban', this.onGroupBan);
    this.listenTo(client, 'group:deban', this.onGroupDeban);
    this.listenTo(client, 'group:op', this.onOp);
    this.listenTo(client, 'group:deop', this.onDeop);
    this.listenTo(client, 'group:leave', this.onGroupLeave);
    this.listenTo(client, 'group:refresh', this.onGroupResfresh);
  },
  addModel: function (data) {
    data.id = data.group_id;
    data.identifier = '#' + data.name;

    // update model
    var isNew = (typeof this.get(data.group_id) === 'undefined');
    var model;
    if (!isNew) {
      // already exist in IHM (maybe reconnecting)
      model = this.get(data.group_id);
      model.set(data);
    } else {
      // add in IHM (by mainView)
      model = new GroupModel(data);
      this.add(model);
    }

    return model;
  },
  onUpdated: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }

    model.onUpdated(data);
  },
  onGroupBan: function (data) {
    data.id = data.group_id;
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }

    if (currentUser.get('user_id') !== data.user_id) {
      return;
    }

    model.onBan(data);
    this.remove(model);
  },
  onGroupDeban: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }
    model.onRefresh();
  },
  onOp: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }
    model.onOp(data); // need to refresh group users list
  },
  onDeop: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }

    model.onDeop(data); // need to refresh group users list
  },
  onGroupLeave: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }

    if (data.reason === 'deleted') {
      this.remove(model);
    } else {
      _.each(data.rooms_ids, function (room_id) {
        data.room_id = room_id;
        rooms.onLeave(data);
      })
      model.onRefresh();
    }
    app.trigger('redrawNavigationRooms');
  },
  onGroupResfresh: function (data) {
    var model;

    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }
    model.onRefresh();
  },
  isMemberOwnerAdmin: function (groupId) {
    var model;
    if (!groupId || !(model = this.get(groupId))) {
      return false;
    }

    return (model.currentUserIsMember() || model.currentUserIsAdmin() || model.currentUserIsOwner());
  },
  isMemberBanned: function (groupId) {
    var model;
    if (!groupId || !(model = this.get(groupId))) {
      return false;
    }

    return (model.currentUserIsBanned());
  }

});

module.exports = new GroupsCollection();
