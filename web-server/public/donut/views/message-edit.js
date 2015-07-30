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

    KEY : { RETURN : 13, ESC : 27 },

    events: {
      'click .message-form .enter' : 'onEditMessage',
      'click .message-form .esc'   : 'onEscEditMessage',
      'keydown .form-message-edit' : 'onKeydown'
    },

    initialize: function (options) {
      this.render();
    },
    render: function () {

      this.$textEdited = this.$el.find('.text-edited');
      this.originalContent = this.$el.find('.text').html();

      if (this.$el.data('edited'))
        this.$textEdited.remove();
      this.$el.find('.message-edit').html(this.template);
      this.$el.find('.text').addClass('hidden');
      this.$el.removeClass('has-hover');

      this.text = this.htmlSmileyToText();
      this.$el.find('.message-form')
        .css('display', 'block')
        .find('.form-message-edit')
        .val(this.text).focus();

      this.updateFormSize();

      // click off
      var that = this;
      $('html').click(function (e) {
        if (!$(e.target).hasClass('form-message-edit') && !$(e.target).hasClass('edited')) {
          that.remove();
          $('html').off('click');
        }
      });
      return this;
    },
    remove: function () {
      this.$el.find('.text')
        .html(this.originalContent)
        .removeClass('hidden');
      this.$el.find('.message-form').remove();
      this.$el.addClass('has-hover');
      this.unbind();
      this.undelegateEvents();
    },

    onEditMessage: function (event) {
      event.preventDefault();
      var messageId = this.$el.attr('id');
      var message = this.$el.find('.form-message-edit').val();
      if (this.text === message) {
        this.remove();
        return;
      }
      message = this.checkMention(message);
      if (this.model.get('type') == 'room') {
        client.roomMessageEdit(this.model.get('name'), messageId, message);
      } else {
        client.userMessageEdit(this.model.get('username'), messageId, message);
      }
      this.remove();
    },
    onEscEditMessage: function (event) {
      event.preventDefault();
      this.remove();
    },
    onKeydown: function (event) {
      this.updateFormSize();
      var data = this._getKeyCode();
      if (event.which == this.KEY.ESC) // escape
        this.onEscEditMessage(event);
      else if (event.which == this.KEY.RETURN && !data.isShift) // enter
        this.onEditMessage(event);
    },
    updateFormSize: function () {
      this.$el.find('.form-message-edit').css('height', '1px');
      this.$el.find('.form-message-edit')
        .css('height',
          (2 + this.$el.find('.form-message-edit').prop('scrollHeight')) + 'px');
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
    },
    _getKeyCode: function() {
      if (window.event) {
        return {
          key: window.event.keyCode,
          isShift: !!window.event.shiftKey
        };
      } else {
        return {
          key: event.which,
          isShift: !!event.shiftKey
        };
      }
    },
  });

  return MessageEditView;
});