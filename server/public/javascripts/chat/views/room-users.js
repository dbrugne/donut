define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/room-users.html'
], function ($, _, Backbone, roomUsersTemplate) {
  var RoomUsersView = Backbone.View.extend({

    template: _.template(roomUsersTemplate),

    initialize: function() {
      this.listenTo(this.collection, 'add', this.onAddRemove);
      this.listenTo(this.collection, 'remove', this.onAddRemove);

      this.render();
    },

    render: function() {
      var listJSON = [];
      _.each(this.collection.models, function(o) {
        listJSON.push(o.toJSON());
      });

      var html = this.template({list: listJSON});
      this.$el.html(html);
      return this;
    },

    onAddRemove: function(model, collection, options) {
      this.render();
    }

  });

  return RoomUsersView;
});