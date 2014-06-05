define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/modal.html',
  'text!templates/modal-iframe.html'
], function ($, _, Backbone, modalTemplate, iframeTemplate) {
  var ModalView = Backbone.View.extend({

    tagName: 'div',
    className: 'modal fade',

    modalTemplate: _.template(modalTemplate),
    iframeTemplate: _.template(iframeTemplate),

    events: {
      'hidden.bs.modal': 'teardown'
    },

    // to override
    _initialize: function(options) {
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      // Render and add modal to the DOM
      this.modalRender(options);

      // Modal could be an iframe
      if (this.url) this.iframeRender(options);

      // Child object initializer
      this._initialize(options);
    },
    modalRender: function(options) {
      var html = this.modalTemplate({
        title: options.title || this.title
      });

      this.$el.html(html);
      this.$el.appendTo('#modals');
    },
    iframeRender: function(options) {
      this.$el.addClass('modal-iframe');
      var html = this.iframeTemplate({
        url: this.url
      });

      this.$el.find('.modal-body').html(html);
    },
    show: function() {
      this.$el.modal('show');
    },
    hide: function() {
      this.$el.modal('hide');
    },
    teardown: function() {
      this.$el.data('modal', null);
    }

  });

  return ModalView;
});