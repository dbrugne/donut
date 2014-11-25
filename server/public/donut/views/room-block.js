define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/room-block.html'
], function ($, _, Backbone, blockTemplate) {
  var RoomBlockView = Backbone.View.extend({

    el: $("#block-rooms"),

    template: _.template(blockTemplate),

    events: {},

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onAddRemove);
      this.listenTo(this.collection, 'remove', this.onAddRemove);
      this.listenTo(this.collection, 'newMessage', this.render); // @todo : nasty event
      this.listenTo(this.collection, 'inOut', this.render); // @todo : nasty event
      this.listenTo(this.collection, 'redraw', this.render);

      this.render();
    },

    onAddRemove: function(model, collection, options) {
      this.render();
    },

    render: function() {
      var listJSON = [];
      _.each(this.collection.models, function(o) {
        var userCount = o.users.length;
        var json = o.toJSON();
        json.avatar = $.cd.roomAvatar(json.avatar, 20, json.color);
        json.count = userCount; // users are not an "attribute", but an object properties
        listJSON.push(json);
      });

      var html = this.template({list: listJSON});
      this.$el.html(html);
      return this;
    }

  });

  return RoomBlockView;
});