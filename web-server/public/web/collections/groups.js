var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var GroupModel = require('../models/group');
var client = require('../libs/client');
var app = require('../models/app');
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
  },
  addModel: function (data) {
    data.id = data.group_id;
    data.identifier = '#' + data.name;
    data.uri = urls(data, 'group', null, null, 'uri');

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

    this.remove(model);
    var message = i18next.t('chat.alert.groupban', {name: data.group_name});
    if (data.reason) {
      message += ' ' + i18next.t('chat.reason', {reason: _.escape(data.reason)});
    }
    app.trigger('alert', 'warning', message);
    app.trigger('refreshRoomsList'); // sort & redraw navigation
  }
});

module.exports = new GroupsCollection();
