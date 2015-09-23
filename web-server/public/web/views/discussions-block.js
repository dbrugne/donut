var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../models/app');
var common = require('@dbrugne/donut-common/browser');
var rooms = require('../collections/rooms');
var onetoones = require('../collections/onetoones');
var currentUser = require('../models/current-user');

var DiscussionBlockView = Backbone.View.extend({
  el: $('#block-discussions'),

  template: require('../templates/discussion-block.html'),

  events: {},

  initialize: function (options) {
    this.listenTo(app, 'redraw-block', this.render);
    this.listenTo(onetoones, 'change:avatar', this.render);
    this.listenTo(rooms, 'change:avatar', this.render);
    this.listenTo(currentUser, 'change:positions', this.onPositionsChange);

    this.initialRender();
  },
  initialRender: function () {
    this.$list = this.$('.list');

    // @doc: https://github.com/voidberg/html5sortable
    this.$list.sortable({
      forcePlaceholderSize: true, // if true, forces the placeholder to have a height
      placeholder: '<div class="placeholder">' + i18next.t('chat.placeholder') + '</div>'
    });

    var that = this;
    this.$list.sortable().bind('sortupdate', function (event, ui) {
      /*
       ui.item contains the current dragged element.
       ui.item.index() contains the new index of the dragged element
       ui.oldindex contains the old index of the dragged element
       */
      app.trigger('persistPositions', true); // silently
    });
  },
  render: function () {
    var positions = (_.isArray(currentUser.get('positions'))) ? currentUser.get('positions') : [];

    // prepare data
    var data = [];
    function prepareItems (o) {
      var json = o.toJSON();
      if (o.get('type') == 'room') {
        json.avatar = common.cloudinary.prepare(json.avatar, 40);
        json.uri = '#room/' + o.get('name').replace('#', '');
        json.identifier = o.get('id');
      } else {
        json.avatar = common.cloudinary.prepare(json.avatar, 40);
        json.uri = '#user/' + o.get('username');
        json.identifier = o.get('user_id');
      }
      json.position = positions.indexOf(json.identifier);
      data.push(json);
    }
    _.each(rooms.models, prepareItems);
    _.each(onetoones.models, prepareItems);

    // sort discussions
    data = _.sortBy(data, 'position');

    var html = this.template({list: data});
    this.$list.html(html);
    this.$list.sortable('reload');
    return this;
  },
  redraw: function () {
    return this.render();
  },
  onPositionsChange: function (model, value, options) {
    this.render();
  }

});


module.exports = DiscussionBlockView;