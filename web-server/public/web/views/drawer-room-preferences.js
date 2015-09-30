var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var client = require('../libs/client');

var DrawerUserRoomPreferencesView = Backbone.View.extend({
  template: require('../templates/drawer-room-preferences.html'),

  id: 'room-preferences',

  events: {
    'change .savable': 'onChangeValue',
    'change .disable-others': 'onNothing'
  },

  initialize: function () {
    // show spinner as temp content
    this.render();

    client.userPreferencesRead(this.model.get('id'), _.bind(function (data) {
      this.onResponse(data);
    }, this));
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  onResponse: function (data) {
    var html = this.template({
      room: this.model.toJSON(),
      preferences: data.preferences
    });

    this.$errors = this.$el.find('.errors');
    this.$el.html(html);
    
    this.initializeTooltips();
  },
  onNothing: function (event) {
    var $target = $(event.currentTarget);
    var value = $target.is(':checked');
    this.$el.find('.disableable').prop('disabled', value);
  },
  onChangeValue: function (event) {
    var $target = $(event.currentTarget);
    var key = $target.attr('value');
    var value = $target.is(':checked');

    // Radio button particular handling
    if ($target.attr('type') === 'radio') {
      value = (key.substr(key.lastIndexOf(':') + 1) === 'true');
      key = key.substr(0, key.lastIndexOf(':'));
    }

    // room name (if applicable)
    key = key.replace('__what__', this.model.get('id'));

    var update = {};
    update[key] = value;

    client.userPreferencesUpdate(update, _.bind(function (data) {
      this.$errors.hide();
      if (data.err) {
        this.$errors.html(i18next.t('global.unknownerror')).show();
      }
    }, this));
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }

});

module.exports = DrawerUserRoomPreferencesView;
