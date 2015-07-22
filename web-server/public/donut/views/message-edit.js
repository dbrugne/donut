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
      'click .message-form .enter': 'onEditMessage',
      'click .message-form .esc': 'onEscEditMessage',
      'keyup .form-control': 'onKeyup',
      'keydown .form-control': 'onKeydown'
    },

    initialize: function (options) {
      this.render();
    },
    htmlToText: function() {
      var text = this.$el.find('.text');

      // Replace Smileys
      _.each(text.find('.smilify'), function(e){
        $(e).replaceWith($.smilifyGetSymbolFromCode($(e).data('smilify-code')))
      });

      // @todo process images also

      // @todo process user mentions

      // @todo process room mentions --> Functionnality is not implemented at that time


      return text.text();
    },
    render: function () {

      this.$textEdited = this.$el.find('.text-edited');
      if (this.$el.data('edited'))
        this.$textEdited.remove();
      this.$el.find('.message-edit').html(this.template);
      this.$el.find('.text').hide();
      this.$el.removeClass('has-hover');
      var $form = this.$el.find('.message-form');

      var text = this.htmlToText();

      $form.css('display', 'block');
      $form.find('.form-control').val(text).focus();

      var that = this;
      $('html').click(function (e) {
        if (!$(e.target).hasClass('form-control') && !$(e.target).hasClass('edited')) {
          that.closeFormEditMessage(that);
          $('html').off('click');
        }
      });
      return this;
    },
    remove: function () {
      this.undelegateEvents();
      this.$el.removeData().unbind();
      this.$el.find('.message-form').remove();
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
        .css('height', (2 + $(event.currentTarget)
          .prop('scrollHeight')) + 'px');
    },
    onKeydown: function (event) {
      if (event.which == 27) // escape
        this.onEscEditMessage(event);
      if (event.which == 13) // enter
        this.onEditMessage(event);
    },
    closeFormEditMessage: function () {
      if (this.$el.data('edited'))
        this.$el.find('.text').append(this.$textEdited);
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
    }

  });

  return MessageEditView;
});