define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/input.html'
], function ($, _, Backbone, client, currentUser, InputTemplate) {
  var DiscussionInputView = Backbone.View.extend({

    template: _.template(InputTemplate),

    events: {
      'input .editable'    : 'onInput',
      'keypress .editable' : 'onKeyPress',
      'click .send'        : 'sendMessage'
    },

    initialize: function(options) {
      this.listenTo(currentUser, 'change:avatar', this.onAvatar);
      this.render();
    },

    _remove: function() {
      this.$editable.mentionsInput('reset');
      this.remove();
    },

    render: function() {
      this.$el.html(this.template({
        avatar: $.cd.userAvatar(currentUser.get('avatar'), 80)
      }));

      this.$editable = this.$el.find('.editable');

      var that = this;

      // mentions initialisation
      this.$editable.mentionsInput({
        minChars: 1,
        elastic: false,
        onDataRequest: function (mode, query, callback) {
          if (that.model.get('type') != 'room')
            return [];
          // filter user list
          var data = that.model.users.filter(function(item) {
            return item.get('username').toLowerCase().indexOf(query.toLowerCase()) > -1;
          });
          // decorate user list
          data = _.map(data, function(model, key, list) {
            var avatar = $.cd.userAvatar(model.get('avatar'), 10);
            return {
              id      : model.get('id'),
              name    : model.get('username'),
              avatar  : avatar,
              type    : 'user'
            };
          });

          callback.call(this, data);
        }
      });
    },

    onInput: function(event) {
      // set mention dropdown position
      this.$editable.siblings('.mentions-autocomplete-list')
        .css('bottom', this.$editable.height()+10+'px');
    },

    onAvatar: function(model, value, options) {
      this.$el.find('.avatar').prop('src', $.cd.userAvatar(value, 80));
    },

    onKeyPress: function(event) {
      // Press enter in field handling
      if (event.type == 'keypress') {
        var key;
        var isShift;
        if (window.event) {
          key = window.event.keyCode;
          isShift = window.event.shiftKey ? true : false;
        } else {
          key = event.which;
          isShift = event.shiftKey ? true : false;
        }
        if(event.which == 13 && !isShift) {
          return this.sendMessage();
        }
      }
    },

    sendMessage: function(event) {
      // Get the message
      var that = this;
      this.$editable.mentionsInput('val', function(message) {
        if (message == '')
          return false;
        if (message.length > 512) // @todo: before testing length replace all mention tag with username, report on server side
          return false;

        // Mentions, try to find missed ones
        if (that.model.get('type') == 'room') {
          var potentialMentions = message.match(/@([-a-z0-9\._|^]{3,15})/ig);
          _.each(potentialMentions, function(p) {
            var u = p.replace(/^@/, '');
            var m = that.model.users.iwhere('username', u);
            if (m) {
              message = message.replace(
                new RegExp('@'+u, 'g'),
                  '@['+ m.get('username')+'](user:'+m.get('id')+')'
              );
            }
          });
        }

        // @todo: cleanup this code by calling on model... and fix #50
        if (that.model.get('type') == 'room') {
          client.roomMessage(that.model.get('name'), message);
        } else if (that.model.get('type') == 'onetoone') {
          client.userMessage(that.model.get('username'), message);
        }

        // Empty field
        that.$editable.val('');
        that.$editable.mentionsInput('reset');
      });

      // Avoid line break addition in field when submitting with "Enter"
      return false;
    }
  });

  return DiscussionInputView;
});