var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var GroupModel = require('../models/group');
var client = require('../libs/client');
var app = require('../libs/app');
var currentUser = require('../models/current-user');
var urls = require('../../../../shared/util/url');

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
    this.listenTo(client, 'group:op', this.onOp);
    this.listenTo(client, 'group:deop', this.onDeop);
    this.listenTo(client, 'group:allow', this.onAllow);
    this.listenTo(client, 'group:disallow', this.onDisallow);
    this.listenTo(client, 'group:leave', this.onGroupLeave);
  },
  addModel: function (data) {
    data.id = data.group_id;
    data.identifier = '#' + data.name;
    data.uri = urls(data, 'group', 'uri');
    data.url = urls(data, 'group', 'url');

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
  onAllow: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }

    if (data.pending) {
      model.onAllow(data);
    }
  },
  onDisallow: function (data) {
    var model;
    if (!data || !data.group_id || !(model = this.get(data.group_id))) {
      return;
    }

    model.onDisallow(data);
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
    var message = i18next.t('chat.alert.groupban', {name: data.group_name});
    if (data.reason) {
      message += ' ' + i18next.t('chat.reason', {reason: _.escape(data.reason)});
    }
    app.trigger('alert', 'warning', message);
    app.trigger('refreshRoomsList'); // sort & redraw navigation
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

    if (currentUser.get('user_id') !== data.user_id) {
      return;
    }
    this.remove(model);
    app.trigger('refreshRoomsList');
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
