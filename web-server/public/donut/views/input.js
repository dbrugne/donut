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
      'input .editable'               : 'onInput',
      'keypress .editable'            : 'onKeyPress',
      'click .send'                   : 'sendMessage',
      'click .add-image'              : 'onAddImage',
      'click .remove-image'           : 'onRemoveImage'
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
      this.$preview = this.$el.find('.preview');

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
        // check length (min)
        var imagesCount = _.keys(that.images).length;
        if (message == '' && imagesCount < 1) // empty message and no image
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

        // check length (max)
        var withoutMentions = message.replace(/@\[([^\]]+)\]\(user:[^\)]+\)/gi, '$1');
        if (withoutMentions.length > 512) {
          console.log('message is too long');
          return false;
        }

        // add images
        var images = [];
        if (imagesCount > 0) {
          _.each(that.images, function(i) {
            images.push({
              public_id: i.public_id,
              version: i.version,
              path: i.path
            });
          });
        }

        // @todo: cleanup this code by calling on model... and fix #50
        if (that.model.get('type') == 'room') {
          client.roomMessage(that.model.get('name'), message, images);
        } else if (that.model.get('type') == 'onetoone') {
          client.userMessage(that.model.get('username'), message, images);
        }

        // Empty field
        that.$editable.val('');
        that.$editable.mentionsInput('reset');

        // reset images
        that.images = {};
        that.$preview.find('.image').remove();
        that.hidePreview();
      });

      // Avoid line break addition in field when submitting with "Enter"
      return false;
    },

    imageTemplate: _.template('<a class="image" data-toggle="lightbox" href="<%=data.url%>" data-cloudinary-id="<%=data.public_id%>" style="background-image: url(<%=data.thumbnail_url%>);"><i class="fa fa-times remove-image"></i></a>'),

    images: {}, // @todo to cleanup on post message

    onAddImage: function(event) {
      event.preventDefault();

      // @doc: http://cloudinary.com/documentation/upload_widget#setup
      var options = {
        upload_preset: 'discussion',
        sources: ['local'], // ['local', 'url', 'camera']
        multiple: true,
        client_allowed_formats: ["png","gif", "jpeg"],
        max_file_size: 20000000, // 20Mo
        max_files: 5,
        thumbnail_transformation: { width: 80, height: 80, crop: 'fill' }
      };

      var that = this;
      cloudinary.openUploadWidget(options, function(err, result) {
          if (err) {
            if (err.message && err.message == 'User closed widget')
              return;
            console.log('cloudinary error: ', err);
          }
          if (!result)
            return console.log('cloudinary result is empty!');

          _.each(result, function(uploaded) {
            // render preview
            that.$preview.find('.add-image').before(that.imageTemplate({data: uploaded}));
            // add to collection
            that.images[uploaded.public_id] = uploaded;
            // show preview
            that.showPreview();
          });
        }
      );
    },
    onRemoveImage: function(event) {
      event.preventDefault();
      var cid = $(event.currentTarget).closest('.image').data('cloudinaryId');
      // remove from collection
      if (this.images[cid])
        delete this.images[cid];
      // remove preview
      this.$preview.find('.image[data-cloudinary-id="'+cid+'"]').remove();
      // hide previews
      if (_.keys(this.images).length < 1)
        this.hidePreview();
    },
    showPreview: function() {
      this.$preview.show();
      this.trigger('resize');
    },
    hidePreview: function() {
      this.$preview.hide();
      this.trigger('resize');
    }

  });

  return DiscussionInputView;
});