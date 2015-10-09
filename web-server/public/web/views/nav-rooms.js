var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var common = require('@dbrugne/donut-common/browser');
var rooms = require('../collections/rooms');

module.exports = Backbone.View.extend({
  el: $('#rooms'),

  template: require('../templates/nav-rooms.html'),

  events: {
    'click .more': 'onToggleMore',
    'click .less': 'onToggleLess'
  },

  initialize: function (options) {
    this.listenTo(app, 'redraw-block', this.render);
    this.listenTo(rooms, 'redraw-block', this.render);

    this.listenTo(app, 'nav-active', this.highlightFocused);
    this.listenTo(app, 'nav-active-group', this.highlightGroup);

    this.$list = this.$('.list');
    this.$empty = this.$('.empty');
  },
  render: function () {
    console.log('render rooms');
    if (!rooms.models.length) {
      this.$list.empty();
      return this.$empty.show();
    } else {
      this.$empty.hide();
    }
    var data = [];
    _.each(rooms.models, function (o) {
      var json = o.toJSON();
      json.avatar = common.cloudinary.prepare(json.avatar, 40);
      data.push(json);
    });

    var html = this.template({list: data, toggleCount: 4});
    this.$list.html(html);

    this.initializeCollapse();
    return this;
  },
  redraw: function () {
    return this.render();
  },
  initializeCollapse: function () {
    this.$('[data-toggle="collapse"]').collapse();
  },
  onToggleMore: function (event) {
    $(event.currentTarget).hide();
  },
  onToggleLess: function (event) {
    $(event.currentTarget).prevAll('.more:first').show();
  },
  highlightFocused: function () {
    this.$list.find('.active').each(function (item) {
      $(this).removeClass('active');
    });
    var that = this;
    _.find(rooms.models, function (room) {
      if (room.get('focused') === true) {
        that.$list.find('[data-room-id="' + room.get('id') + '"]').addClass('active');
        return true;
      }
    });
  },
  highlightGroup: function(groupId) {
    var that = this;
    _.find(rooms.models, function (room) {
      if (room.get('group_id') === groupId) {
        that.$list.find('[data-type="group"][data-group-id="' + groupId + '"]').addClass('active');
        return true;
      }
    });
  }
});
