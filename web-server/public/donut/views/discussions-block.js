define([
  'jquery',
  'underscore',
  'backbone',
  'collections/rooms',
  'collections/onetoones',
  'text!templates/discussions-block.html'
], function ($, _, Backbone, rooms, onetoones, blockTemplate) {
  var DiscussionsBlockView = Backbone.View.extend({

    el: $("#block-discussions"),

    template: _.template(blockTemplate),

    events: {},

    initialize: function(options) {
      this.mainView = options.mainView;

      this.listenTo(rooms, 'redraw', this.render);
      this.listenTo(onetoones, 'redraw', this.render);
      this.listenTo(onetoones, 'change:avatar', this.render);
    },
    render: function() {
      window.debug.log('render discussions block');
      var listJSON = [];
      function prepare(o) {
        var json = o.toJSON();
        if (o.type == 'room')
          json.avatar = $.cd.roomAvatar(json.avatar, 20);
        else
          json.avatar = $.cd.userAvatar(json.avatar, 20);
        listJSON.push(json);
      }
      _.each(rooms.models, prepare);
      _.each(onetoones.models, prepare);

      var html = this.template({list: listJSON});
      this.$el.html(html);
      return this;
    },
    redraw: function() {
      return this.render();
    }

  });

  return DiscussionsBlockView;
});