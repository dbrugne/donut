define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {
  var ModalView = Backbone.View.extend({

    content: null,

    modal: null,

    events: {
    },

    initialize: function (options) {
    },
    setContent: function(view) {
      this.content = view;
    },
    open: function() {
      // @doc: https://github.com/powmedia/backbone.bootstrap-modal
      this.modal = new Backbone.BootstrapModal({
        content: this.content
      });
      this.modal.open();
    }
  });

  return new ModalView();
});