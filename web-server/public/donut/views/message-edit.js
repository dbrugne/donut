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
      'click .message-form .enter' : 'onEditMessage',
      'click .message-form .esc'   : 'onEscEditMessage',
      'keydown .form-control'      : 'onKeydown'
    },

    initialize: function (options) {
      this.render();
    },
    render: function () {

      this.$textEdited = this.$el.find('.text-edited');
      this.$htmlContentText = this.$el.find('.text').html();

      if (this.$el.data('edited'))
        this.$textEdited.remove();
      this.$el.find('.message-edit').html(this.template);
      this.$el.find('.text').hide();
      this.$el.find('.images').hide();
      this.$el.removeClass('has-hover');

      var text = this.htmlSmileyToText();
      this.$el.find('.message-form')
        .css('display', 'block')
        .find('.form-control')
        .val(text).focus();

      this.updateFormSize();

      // click off
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
      this.$el.find('.message-form').remove();
      this.undelegateEvents();
      this.$el.removeData().unbind();
    },

    onEditMessage: function (event) {
      event.preventDefault();
      var roomName = this.model.get('name');
      var username = this.model.get('username');
      var messageId = this.$el.attr('id');
      var message = this.$el.find('.form-control').val();
      message = this.checkMention(message);
      if (roomName)
        client.roomMessageEdit(roomName, messageId, message);
      if (username)
        client.userMessageEdit(username, messageId, message);
      this.closeFormEditMessage();
    },
    onEscEditMessage: function (event) {
      event.preventDefault();
      this.closeFormEditMessage();
    },
    onKeydown: function (event) {
      this.updateFormSize();
      if (event.which == 27) // escape
        this.onEscEditMessage(event);
      if (event.which == 13) // enter
        this.onEditMessage(event);
    },
    updateFormSize: function () {
      this.$el.find('.form-control').css('height', '1px');
      this.$el.find('.form-control')
        .css('height', (2 + this.$el.find('.form-control')
          .prop('scrollHeight')) + 'px');
    },
    closeFormEditMessage: function () {
      this.$el.find('.text').html(this.$htmlContentText);
      this.$el.find('.message-form').hide();
      this.$el.find('.text').css('display', 'block');
      this.$el.find('.images').css('display', 'block');
      this.$el.addClass('has-hover');
    },
    isEditableMessage: function () {
      var username = this.$el.closest('[data-username]').data('username');
      var time = this.$el.data('time');
      var isMessageCurrentUser = (currentUser.get('username') === username);
      var isEdit = ((Date.now() - new Date(time)) < (3600 * 1000)); // 1 hours

      return ((isMessageCurrentUser && isEdit));
    },
    checkMention: function(text) {
      var that = this;
      if (this.model.get('type') == 'room') {
        var potentialMentions = text.match(/@([-a-z0-9\._|^]{3,15})/ig);
        _.each(potentialMentions, function(p) {
          var u = p.replace(/^@/, '');
          var m = that.model.users.iwhere('username', u);
          if (m) {
            text = text.replace(
              new RegExp('@'+u, 'g'),
              '@['+ m.get('username')+'](user:'+m.get('id')+')'
            );
          }
        });
      }
      return text;
    },
    htmlSmileyToText: function() {
      var text = this.$el.find('.text');

      // Replace Smileys
      _.each(text.find('.smilify'), function(e){
        $(e).replaceWith($.smilifyGetSymbolFromCode($(e).data('smilify-code')));
      });

      return text.text();
    }
  });

  return MessageEditView;
});