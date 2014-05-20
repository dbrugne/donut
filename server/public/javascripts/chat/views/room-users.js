define([
  'jquery',
  'underscore',
  'backbone',
  'views/users',
  'text!templates/room-users.html'
], function ($, _, Backbone, UsersView, roomUsersTemplate) {
  var RoomUsersView = Backbone.View.extend({

    template: _.template(roomUsersTemplate),

    initialize: function() {
      this.listenTo(this.collection, 'add', this.onAddRemove);
      this.listenTo(this.collection, 'remove', this.onAddRemove);

      this.render();
    },

    render: function() {
      // @todo : sort collection
//      this.sort();

      var listJSON = [];
      _.each(this.collection.models, function(o) {
        listJSON.push(o.toJSON());
      });
console.log(listJSON);
      var html = this.template({list: listJSON});
      this.$el.html(html);
      return this;
    },

//    remove: function() {
//      this.userSubviews.each(function(item) {
//        item.get('view').remove();
//      });
//      Backbone.View.prototype.remove.apply(this, arguments);
//    },

    onAddRemove: function(model, collection, options) {
      this.render();
    }

//    sort: function() {
//      var sorted = _.sortBy(this.userSubviews.toJSON(), 'username');
//      this.$list.empty();
//
//      _.each(sorted, function(item) {
//        this.$list.append(item.view.$el);
//        item.view.delegateEvents();
//      }, this);
//    }

  });

  return RoomUsersView;
});