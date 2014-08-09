define([
  'jquery',
  'underscore',
  'backbone',
  'collections/onlines',
  'text!templates/home-onlines.html'
], function ($, _, Backbone, onlines, onlinesTemplate) {
  var OnlinesView = Backbone.View.extend({

    el: $('#onlines'),

    template: _.template(onlinesTemplate),

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.render);
      this.listenTo(this.collection, 'remove', this.render);
    },
    render: function() {
      var listJSON = [];
      _.each(this.collection.models, function(o) {
        var json = o.toJSON();
        json.avatar = $.c.userAvatar(json.avatar, 'user-medium');
        listJSON.push(json);
      });

      this.$el.html(this.template({list: listJSON}));
      this.$el.find('.website').linkify();
      return this;
    }
  });

  var view = new OnlinesView({collection: onlines});
  return view;
});