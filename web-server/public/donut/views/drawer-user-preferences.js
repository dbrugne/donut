define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/image-uploader',
  'views/color-picker',
  '_templates'
], function ($, _, Backbone, client, currentUser, ImageUploader, ColorPicker, templates) {
  var DrawerUserEditView = Backbone.View.extend({

    template: templates['drawer-user-preferences.html'],

    id: 'user-preferences',

    events  : {
      'submit form.user-form': 'onSubmit'
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.userRead(currentUser.get('username'), function(data) {
        that.onResponse(data);
      });
    },
    render: function() {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    onResponse: function(user) {
      // colorize drawer .opacity
      if (user.color)
        this.trigger('color', user.color);

      var html = this.template({user: user});
      this.$el.html(html);
      return;
    },
    onSubmit: function(event) {
      event.preventDefault();

      var updateData = {
        bio: this.$el.find('textarea[name=bio]').val(),
        location: this.$el.find('input[name=location]').val(),
        website: this.$el.find('input[name=website]').val(),
        color: this.$el.find('input[name=color]').val()
      };

      if (this.avatarUploader.data)
        updateData.avatar = this.avatarUploader.data;

      if (this.posterUploader.data)
        updateData.poster = this.posterUploader.data;

      var that = this;
      client.userUpdate(updateData, function(data) {
        that.$el.find('.errors').hide();
        if (data.err) {
          var message = '';
          _.each(data.errors, function(error) {
            message += error+'<br>';
          });
          that.$el.find('.errors').html(message).show();
          return;
        }
        that.trigger('close');
      });
    }

  });

  return DrawerUserEditView;
});