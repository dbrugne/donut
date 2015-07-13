define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client, currentUser, templates) {
  var DrawerUserRoomPreferencesView = Backbone.View.extend({

    template: templates['drawer-room-preferences.html'],

    id: 'room-preferences',

    events  : {
      'change .savable': 'onChangeValue',
      'change .disable-others': 'onNothing'
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.userPreferencesRead(this.model.get('name'), function(data) {
        that.onResponse(data);
      });
    },
    render: function() {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    onResponse: function(data) {
      var color = this.model.get('color');
      // colorize drawer .opacity
      if (color)
        this.trigger('color', color);

      var html = this.template({
        username: currentUser.get('username'),
        name: this.model.get('name'),
        color: color,
        preferences: data.preferences
      });
      this.$el.html(html);
      return;
    },
    onNothing: function(event) {
      var $target = $(event.currentTarget);
      var value = $target.is(":checked");
      this.$el.find('.disableable').prop("disabled", value);
    },
    onChangeValue: function(event) {
      var $target = $(event.currentTarget);
      var key = $target.attr('value');
      var value = $target.is(":checked");

      // Radio button particular handling
      if ($target.attr('type') == 'radio') {
        value = (key.substr(key.lastIndexOf(':')+1) == 'true');
        key = key.substr(0, key.lastIndexOf(':'));
      }

      // room name (if applicable)
      key = key.replace('__what__', this.model.get('name'));

      var update = {};
      update[key] = value;

      var that = this;
      client.userPreferencesUpdate(update, function(data) {
        that.$el.find('.errors').hide();
        if (data.err) {
          that.$el.find('.errors').html($.t('global.unknownerror')).show();
          return;
        }
      })
    }

  });

  return DrawerUserRoomPreferencesView;
});