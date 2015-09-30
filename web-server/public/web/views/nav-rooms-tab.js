var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var common = require('@dbrugne/donut-common/browser');

module.exports = Backbone.View.extend({
  tagName: 'div',

  className: 'room',

  template: require('../templates/nav-rooms-tab.html'),

  events: {},

  initialize: function (options) {
    this.listenTo(this.model, 'change:avatar', this.render);
    this.listenTo(this.model, 'change:focus', this.render);
    this.render();
  },
  render: function () {
    var json = this.model.toJSON();
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
    var html = this.template({data: json});
    console.log(html);
    this.$list.html(html);
    return this;
  }
});
