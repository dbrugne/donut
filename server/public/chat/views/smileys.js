define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/smileys.html'
], function ($, _, Backbone, smileysTemplate) {
  var SmileysView = Backbone.View.extend({

    tag: 'div',

    className: 'popover top smileys-popover',

    template: _.template(smileysTemplate),

    events: {
      'click span.smilify': 'pick'
    },

    initialize: function(options) {
      this.onPick= options.onPick;
      this.render();
    },

    render: function() {
      var html = this.template();
      this.$el.html(html)
        .hide();
      this.$el.find('.smileys')
        .smilify('list')
        .smilify();
      $('body').append(this.$el);
      return this;
    },

    pick: function(event) {
      this.$el.hide();
      this.trigger('pick', $(event.currentTarget).data('smilifyCode'));
      return false; // stop propagation
    }

  });

  return SmileysView;
});