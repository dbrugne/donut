var Backbone = require('backbone');
var GroupModel = require('../models/group');
var client = require('../libs/client');

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
  },
  addModel: function (data, blocked) {
    data.identifier = '#' + data.name;
    data.uri = '#g/' + data.name;

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
  }
});

module.exports = new GroupsCollection();
