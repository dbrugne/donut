define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug'
], function ($, _, Backbone, donutDebug) {

  var debug = donutDebug('donut:input');

  var InputSmileysView = Backbone.View.extend({

    events: {
      'click .add-smiley'       : 'onOpenSmiley',
      'click .smileys .smilify' : 'onPickSmiley'
    },

    initialize: function(options) {
      this.$editable = this.$('.editable');
    },

    render: function() {
      return this;
    },

    onOpenSmiley: function (event) {
      event.preventDefault();

      if (!this.$smileyButton) {
        this.$smileyButton = $(event.currentTarget);

        this.$smileyButton.popover({
          animation: false,
          container: this.$el,
          content: $.smilifyHtmlList(),
          html: true,
          placement: 'top'
        });

        this.$smileyButton.popover('show'); // show manually on first click, then popover has bound a click event on popover toggle action
      }
    },
    onPickSmiley: function (event) {
      event.preventDefault();

      var symbol = $.smilifyGetSymbolFromCode($(event.currentTarget).data('smilifyCode'));
      this.$editable.insertAtCaret(symbol);
      this.$smileyButton.popover('hide');
    },

  });

  return InputSmileysView;
});
