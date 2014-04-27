define([
  'jquery',
  'underscore',
  'backbone',
  'collections/onlines',
  'views/users',
  'text!templates/onlines.html'
], function ($, _, Backbone, onlines, UsersView, onlinesTemplate) {
  var OnlinesView = Backbone.View.extend({

    el: $('#block-users'),

    template: _.template(onlinesTemplate),

    userSubviews: '',

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onAdd);
      this.listenTo(this.collection, 'remove', this.onRemove);

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

    onAdd: function(model, collection, options) {
      var view = new UsersView({model: model});
      this.userSubviews.add({
        id: model.get('id'),
        username: model.get('username'),
        view: view
      });
      this.$list.append(view.$el);

      this.sort();
    },

    onRemove: function(model, collection, options) {
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

  var view = new OnlinesView({collection: onlines});
  return view;

});