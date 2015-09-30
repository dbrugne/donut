var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var common = require('@dbrugne/donut-common/browser');
var rooms = require('../collections/rooms');
var onetoones = require('../collections/onetoones');

module.exports = Backbone.View.extend({
  el: $('#block-discussions'),

  template: require('../templates/discussion-block.html'),

  events: {},

  initialize: function (options) {
    this.listenTo(app, 'redraw-block', this.render);
    this.listenTo(onetoones, 'change:avatar', this.render);
    this.listenTo(rooms, 'change:avatar', this.render);
    this.$list = this.$('.discussion-list');
  },
  render: function () {
    // prepare data
    var data = {
      onetoones: [],
      rooms: []
    };

    function prepareItems (o) {
      var json = o.toJSON();
      if (o.get('type') === 'room') {
        json.avatar = common.cloudinary.prepare(json.avatar, 40); // required on responsive
        json.uri = '#room/' + o.get('name').replace('#', '');
        json.identifier = o.get('id');
        json.group = null;

        // @todo dbr remove that ugly hack
        if (json.name === '#paintball' || json.name === '#DagnirDae') {
          json.group = '#paintball';
        }
        if (json.name === '#donut' || json.name === '#help') {
          json.group = '#donut';
        }

        data.rooms.push(json);
      } else {
        json.avatar = common.cloudinary.prepare(json.avatar, 40);
        json.uri = '#user/' + o.get('username');
        json.identifier = o.get('user_id');
        data.onetoones.push(json);
      }
    }

    _.each(rooms.models, prepareItems);
    _.each(onetoones.models, prepareItems);

    var html = this.template({list: data});
    this.$list.html(html);
    return this;
  },
  redraw: function () {
    return this.render();
  }
});
