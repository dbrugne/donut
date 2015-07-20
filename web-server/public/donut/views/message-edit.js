define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, donutDebug, client, currentUser, templates) {

  var debug = donutDebug('donut:message-edit');

  var MessageEditView = Backbone.View.extend({

    template: templates['message-edit.html'],

    events: {
      'click .message-form .enter'     : 'onEditMessage',
      'click .message-form .esc'       : 'onEscEditMessage',
      'keyup .form-control'            : 'onKeyup',
      'keydown .form-control'          : 'onKeydown'
    },

    initialize: function(options) {
      this.listenTo(this.model, 'messageEdit', this.onMessageEdited);
      this.render();
    },
    render: function() {

      this.$el.find('.message-edit').html(this.template);
      this.$el.find('.text').hide();
      this.$el.removeClass('has-hover');
      var $form = this.$el.find('.message-form');
      var text = this.$el.find('.text').text();
      $form.css('display', 'block');
      $form.find('.form-control').val(text).focus();

      var that = this;
      $('html').click(function(e) {
        if (!$(e.target).hasClass('form-control') && !$(e.target).hasClass('edited')) {
          that.closeFormEditMessage(that);
          $('html').off('click');
        }
      });
      return this;
    },

    onEditMessage: function (event) {
      event.preventDefault();
      var roomName = this.model.get('name');
      var messageId = this.$el.attr('id');
      var message = this.$el.find('.form-control').val();
      client.roomMessageEdit(roomName, messageId, message);

      this.closeFormEditMessage();
    },
    onEscEditMessage: function (event) {
      event.preventDefault();
      this.closeFormEditMessage();
    },
    onKeyup: function (event) {
      $(event.currentTarget).css('height', '1px');
      $(event.currentTarget)
        .css('height', (2+$(event.currentTarget)
          .prop('scrollHeight'))+'px');
    },
    onKeydown: function (event) {
      if (event.which == 27) // escape
        this.onEscEditMessage(event);
      if (event.which == 13) // enter
        this.onEditMessage(event);
    },
    closeFormEditMessage: function () {
      this.$el.find('.message-form').hide();
      this.$el.find('.text').css('display', 'block');
      this.$el.addClass('has-hover');
    },
    isEditableMessage: function () {
      var username = this.$el.closest('[data-username]').data('username');
      var time = this.$el.data('time');
      var isMessageCurrentUser = (currentUser.get('username') === username);
      var isEdit = ((Date.now() - new Date(time)) < (3600 * 1000)); // 1 hours

      return ((isMessageCurrentUser && isEdit));
    },
    onMessageEdited: function (event) {
      $('#'+event.event).find('.text').html(event.message);
    },

  });

  return MessageEditView;
});