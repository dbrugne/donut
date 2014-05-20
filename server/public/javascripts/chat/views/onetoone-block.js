define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/onetoone-block.html'
], function ($, _, Backbone, blockTemplate) {
  var OneToOneBlockView = Backbone.View.extend({

    el: $("#block-onetoones"),

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
      // @todo : sort collection
      var listJSON = [];
      _.each(this.collection.models, function(o) {
        listJSON.push(o.toJSON());
      });

      var html = this.template({list: listJSON});
      this.$el.html(html);
      return this;
    }

  });

  return OneToOneBlockView;
});