var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var common = require('@dbrugne/donut-common/browser');
var onetoones = require('../collections/onetoones');

module.exports = Backbone.View.extend({
  el: $('#ones'),

  template: require('../templates/nav-ones.html'),

  events: {},

  initialize: function (options) {
    this.listenTo(onetoones, 'add', this.render);
    this.listenTo(onetoones, 'remove', this.render);

    this.listenTo(app, 'redraw-block', this.render);
    this.listenTo(onetoones, 'redraw-block', this.render);
    this.listenTo(onetoones, 'change:avatar', this.render);
    this.$list = this.$('.list');
  },
  render: function () {
    var data = [];
    _.each(onetoones.models, function (o) {
      var json = o.toJSON();
      json.avatar = common.cloudinary.prepare(json.avatar, 40);
      json.uri = '#user/' + o.get('username');
      json.identifier = o.get('user_id');
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
