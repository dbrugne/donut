var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var common = require('@dbrugne/donut-common/browser');
var rooms = require('../collections/rooms');

module.exports = Backbone.View.extend({
  el: $('#rooms'),

  template: require('../templates/nav-rooms.html'),

  events: {},

  initialize: function (options) {
    this.listenTo(rooms, 'add', this.render);
    this.listenTo(rooms, 'remove', this.render);
    this.listenTo(app, 'redraw-block', this.render);
    this.listenTo(rooms, 'change:avatar', this.render);
    this.$list = this.$('.list');
  },
  render: function () {
    var data = [];
    _.each(rooms.models, function (o) {
      var json = o.toJSON();
      json.avatar = common.cloudinary.prepare(json.avatar, 40);
      json.uri = '#room/' + o.get('name').replace('#', '');
      json.identifier = o.get('id');

      json.group = null;
      // @todo dbr remove that ugly hack
      if (json.name === '#paintball' || json.name === '#DagnirDae' || json.name === '#Shop-Paintball') {
        json.group = '#paintball';
      }
      if (json.name === '#donut' || json.name === '#help') {
        json.group = '#donut';
      }

      data.push(json);
    });

    var html = this.template({list: data});
    this.$list.html(html);
    return this;
  },
  redraw: function () {
    return this.render();
  }
});
