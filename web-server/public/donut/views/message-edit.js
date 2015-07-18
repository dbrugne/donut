define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  '_templates'
], function ($, _, Backbone, donutDebug, templates) {

  var debug = donutDebug('donut:message-edit');

  var MessageEditView = Backbone.View.extend({

    template: templates['message.html'], // @todo : move in another dedicated file

    events: {

    },

    initialize: function(options) {

    },

    render: function() {
      return this;
    },

    closeFormEditMessage: function ($event) {
      $event.find('.message-form').hide();
      $event.find('.text').css('display', 'block');
      $event.addClass('has-hover');
    },

  });

  return MessageEditView;
});