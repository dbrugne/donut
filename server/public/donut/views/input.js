define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/input.html'
], function ($, _, Backbone, client, currentUser, InputTemplate) {
  var DiscussionMessageBoxView = Backbone.View.extend({

    template: _.template(InputTemplate),

    events: {
      'keypress .input-message' : 'message',
      'click .send'             : 'message',
      'input .input-message'    : 'onInput'
    },

    initialize: function(options) {
      this.listenTo(currentUser, 'change:avatar', this.onAvatar);

      this.render();
    },

    render: function() {
      this.$el.html(this.template({
        avatar: $.cd.userAvatar(currentUser.get('avatar'), 80, currentUser.get('color'))
      }));

      this.$editable = this.$el.find('.input-message');

      var that = this;

//      // realtime caret position
//      this.$editable.textareaCaretPosition('init', {
//        callback: function(coordinates) {
//          console.log(coordinates);
//        }
//      });

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
            var avatar = $.cd.userAvatar(model.get('avatar'), 10, model.get('color'));
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
      this.$el.find('.avatar').prop('src', $.cd.userAvatar(value, 80, model.get('color')));
    },

    message: function(event) {
      // Press-enter in field handling
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
        if(isShift || event.which != 13) {
          return;
        }
      }

      // Get the message
      var that = this;
      this.$editable.mentionsInput('val', function(message) {
        if (message == '') return false;
        if (message.length > 512) return false;

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

        // @todo: cleanup this code...
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

  return DiscussionMessageBoxView;
});