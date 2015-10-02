var Backbone = require('backbone');
var GroupModel = require('../models/group');

var GroupsCollection = Backbone.Collection.extend({
  iwhere: function (key, val) { // insencitive case search
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
  },
  addModel: function (data, blocked) {
    data.identifier = '#' + data.name;
    data.uri = '#g/' + data.name;

    // update model
    var isNew = (this.get(data.id) === undefined);
    var model;
    if (!isNew) {
      // already exist in IHM (maybe reconnecting)
      model = this.get(data.id);
      model.set(data);
    } else {
      // add in IHM (by mainView)
      model = new GroupModel(data);
      this.add(model);
    }

    return model;
  }
});

module.exports = new GroupsCollection();
