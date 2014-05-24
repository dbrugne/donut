define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/room-block.html'
], function ($, _, Backbone, blockTemplate) {
  var RoomBlockView = Backbone.View.extend({

    el: $("#block-rooms"),

    template: _.template(blockTemplate),

    events: {
      "click .close": "closeThis"
    },

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onAddRemove);
      this.listenTo(this.collection, 'remove', this.onAddRemove);
      this.listenTo(this.collection, 'newMessage', this.render); // @todo : nasty event

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
        json.users = userCount; // users are not an "attribute", but an object properties
        listJSON.push(json);
      });

      var html = this.template({list: listJSON});
      this.$el.html(html);
      return this;
    }

  });

  return RoomBlockView;
});