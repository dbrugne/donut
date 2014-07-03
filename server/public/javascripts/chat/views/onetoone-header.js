define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'text!templates/onetoone-header.html'
], function ($, _, Backbone, client, oneToOneHeaderTemplate) {
  var OneToOneHeaderView = Backbone.View.extend({

    template: _.template(oneToOneHeaderTemplate),

    initialize: function() {
      this.listenTo(this.model, 'change:status', this.updateStatus);
      this.listenTo(this.model, 'change', this.onChange);

      this.render();
    },
    render: function() {
      var data = this.model.toJSON();
      var html = this.template(data);
      this.$el.html(html);
      return this;
    },
    onChange: function(model, options) {
      this.render();
    }

  });

  return OneToOneHeaderView;
});