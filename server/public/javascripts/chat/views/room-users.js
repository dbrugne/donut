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
      this.listenTo(this.collection, 'add', this.addUser);
      this.listenTo(this.collection, 'remove', this.removeUser);

      this.render();

      this.userSubviews = new Backbone.Collection();
      this.$list = this.$el.find('.list');
    },

    render: function() {
      this.$el.html(this.template());
      return this;
    },

    remove: function() {
      this.userSubviews.each(function(item) {
        item.get('view').remove();
      });
      Backbone.View.prototype.remove.apply(this, arguments);
    },

    addUser: function(model, collection, options) {
      var view = new UsersView({model: model});
      this.userSubviews.add({
        id: model.get('id'),
        username: model.get('username'),
        view: view
      });
      this.$list.append(view.$el);

      this.sort();
    },

    removeUser: function(model, collection, options) {
      var view = this.userSubviews.get(model.get('id')).get('view').remove();
      this.userSubviews.remove(model.get('id'));
    },

    sort: function() {
      var sorted = _.sortBy(this.userSubviews.toJSON(), 'username');
      this.$list.empty();

      _.each(sorted, function(item) {
        this.$list.append(item.view.$el);
        item.view.delegateEvents();
      }, this);
    }

  });

  return RoomUsersView;
});