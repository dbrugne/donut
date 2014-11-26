define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/onetoone-block.html'
], function ($, _, Backbone, blockTemplate) {
  var OneToOneBlockView = Backbone.View.extend({

    el: $("#block-onetoones"),

    template: _.template(blockTemplate),

    events: {},

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onAddRemove);
      this.listenTo(this.collection, 'remove', this.onAddRemove);
      this.listenTo(this.collection, 'change:avatar', this.render);
      this.listenTo(this.collection, 'redraw', this.render);

      this.render();
    },
    onAddRemove: function(model, collection, options) {
      this.render();
    },
    render: function() {
      var listJSON = [];
      _.each(this.collection.models, function(o) {
        var json = o.toJSON();
        json.avatar = $.cd.userAvatar(json.avatar, 20, json.color);
        listJSON.push(json);
      });

      var html = this.template({list: listJSON});
      this.$el.html(html);
      return this;
    }

  });

  return OneToOneBlockView;
});