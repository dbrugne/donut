'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'models/app',
  'common',
  'collections/rooms',
  'collections/onetoones',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, app, common, rooms, onetoones, currentUser, templates) {
  var DiscussionBlockView = Backbone.View.extend({
    el: $('#block-discussions'),

    template: templates['discussion-block.html'],

    events: {},

    initialize: function (options) {
      this.listenTo(app, 'redraw-block', this.render);
      this.listenTo(onetoones, 'change:avatar', this.render);
      this.listenTo(rooms, 'change:avatar', this.render);
      this.listenTo(currentUser, 'change:positions', this.onPositionsChange);

      this.initialRender();
    },
    initialRender: function () {
      this.$list = this.$el.find('.list');

      // @doc: https://github.com/voidberg/html5sortable
      this.$list.sortable({
        forcePlaceholderSize: true, // if true, forces the placeholder to have a height
        placeholder: '<div class="placeholder">' + $.t('chat.placeholder') + '</div>'
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
          json.avatar = common.cloudinarySize(json.avatar, 40);
          json.uri = '#room/' + o.get('name').replace('#', '');
          json.identifier = o.get('id');
        } else {
          json.avatar = common.cloudinarySize(json.avatar, 40);
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

  return DiscussionBlockView;
});
