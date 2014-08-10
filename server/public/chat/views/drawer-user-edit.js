define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'views/image-uploader',
  'views/color-picker',
  'text!templates/user-edit.html',
  'text!templates/spinner.html'
], function ($, _, Backbone, client, currentUser, ImageUploader, ColorPicker, userEditTemplate, spinnerTemplate) {
  var DrawerUserEditView = Backbone.View.extend({

    template: _.template(userEditTemplate),

    id: 'user-edit',

    events  : {
      'submit form.user-form': 'onSubmit'
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      // show spinner as temp content
      this.render();

      // ask for data
      client.userRead();

      // on response show form
      this.listenTo(client, 'user:read', this.onRead);

      // on user:update callback
      this.listenTo(client, 'user:update', this.onUpdate);
    },
    render: function() {
      // render spinner only
      this.$el.html(_.template(spinnerTemplate)());
      return this;
    },
    onRead: function(user) {
      // colorize drawer .opacity
      if (user.color)
        this.trigger('color', user.color);

      var currentAvatar = user.avatar;
//      user.avatar = $.c.userAvatar(user.avatar, 'user-medium');

      var html = this.template({user: user});
      this.$el.html(html);

      // color form
      this.$el.find('.user').colorify();

      // description
      this.$el.find('#userBio').maxlength({
        counterContainer: this.$el.find('#userBio').siblings('.help-block').find('.counter'),
        text: '<strong>%left</strong> left'
      });

      // color
      var colorPicker = new ColorPicker({
        color: user.color,
        name: 'color',
        el: this.$el.find('.user-color').first()
      });

      // avatar
      this.avatarUploader = new ImageUploader({
        el: this.$el.find('.user-avatar').first(),
        current: currentAvatar,
        tags: 'user,avatar',
        field_name: 'avatar'
      });

      // poster
      this.posterUploader = new ImageUploader({
        el: this.$el.find('.user-poster').first(),
        current: user.poster,
        tags: 'user,poster',
        field_name: 'poster'
      });
    },
    onSubmit: function(event) {
      event.preventDefault();

      var updateData = {
        bio: this.$el.find('textarea[name=bio]').val(),
        location: this.$el.find('input[name=location]').val(),
        website: this.$el.find('input[name=website]').val(),
        color: this.$el.find('input[name=color]').val(),
        general: this.$el.find('input[type=checkbox].general').prop('checked')
      };

      if (this.avatarUploader.data)
        updateData.avatar = this.avatarUploader.data;

      if (this.posterUploader.data)
        updateData.poster = this.posterUploader.data;

      client.userUpdate(updateData);
    },
    onUpdate: function(data) {
      this.$el.find('.errors').hide();

      if (!data.success) {
        var message = '';
        _.each(data.errors, function(error) {
          message += error+'<br>';
        });
        this.$el.find('.errors').html(message).show();
        return;
      }

      this.trigger('close');
    }

  });

  return DrawerUserEditView;
});