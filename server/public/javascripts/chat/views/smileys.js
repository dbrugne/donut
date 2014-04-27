define([
  'jquery',
  'underscore',
  'backbone',
  'collections/smileys',
  'text!templates/smileys.html'
], function ($, _, Backbone, smileysCollection, smileysTemplate) {
  var SmileysView = Backbone.View.extend({

    tag: 'div',

    className: 'popover top smileys-popover',

    template: _.template(smileysTemplate),

    events: {
      'click li': 'pick'
    },

    initialize: function(options) {
      this.collection = smileysCollection;
      this.onPick= options.onPick;
      this.render();
    },

    render: function() {
      var html = this.template({ smileys: this.collection.toJSON() });
      this.$el.html(html);
      this.$el.hide();
      $('body').append(this.$el);
      return this;
    },

    pick: function(event) {
      this.$el.hide();
      this.trigger('pick', {
        symbol: $(event.currentTarget).data('symbol'),
        cssclass: $(event.currentTarget).data('sclass')
      });
      return false; // stop propagation
    }

  });

  return SmileysView;
});