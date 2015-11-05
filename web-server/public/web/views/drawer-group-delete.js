var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var i18next = require('i18next-client');
var app = require('../libs/app');
var client = require('../libs/client');
var currentUser = require('../models/current-user');

var DrawerGroupDeleteView = Backbone.View.extend({
  template: require('../templates/drawer-group-delete.html'),

  id: 'group-delete',

  events: {
    'keyup input[name=input-delete]': 'onKeyup',
    'click .submit': 'onSubmit',
    'click .cancel-lnk': 'onClose'
  },

  initialize: function (options) {
    this.groupId = options.group_id;

    // show spinner as temp content
    this.render();

    client.groupRead(this.groupId, null, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));

    // on group:delete callback
    this.listenTo(client, 'group:delete', this.onDelete);
  },
  setError: function (error) {
    this.$errors.html(error).show();
  },
  reset: function () {
    this.$errors.html('').hide();
    this.$el.removeClass('has-error').removeClass('has-success').val('');
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  onResponse: function (group) {
    if (group.owner_id !== currentUser.get('user_id') && !currentUser.isAdmin()) {
      return;
    }

    this.groupNameConfirmation = group.name.toLocaleLowerCase();

    var html = this.template({group: group});
    this.$el.html(html);
    this.$input = this.$el.find('input[name=input-delete]');
    this.$errors = this.$el.find('.errors');
  },
  onSubmit: function (event) {
    event.preventDefault();
    this.reset();
    if (!this._valid()) {
      return this.setError(i18next.t('chat.form.errors.name-wrong-format'));
    }

    client.groupDelete(this.groupId);
  },
  onDelete: function (data) {
    if (!data.name || data.name.toLocaleLowerCase() !== this.groupNameConfirmation) {
      return;
    }

    this.$el.find('.errors').hide();

    if (!data.success) {
      var message = '';
      _.each(data.errors, function (error) {
        message += error + '<br>';
      });
      this.$el.find('.errors').html(message).show();
      return;
    }

    app.trigger('alert', 'info', i18next.t('edit.room.delete.success'));
    this.trigger('close');
  },
  onKeyup: function (event) {
    this._cleanupState();

    if (this._valid()) {
      this.$el.addClass('has-success');
    } else {
      this.$el.removeClass('has-success');
    }

    // Enter in field handling
    var key = keyboard._getLastKeyCode(event);
    if (event.type === 'keyup' && key.key === keyboard.RETURN) {
      return this.onSubmit(event);
    }
  },
  onClose: function (event) {
    event.preventDefault();
    this.trigger('close');
  },
  _valid: function () {
    var name = this.$input.val();
    var pattern = new RegExp('^' + this.groupNameConfirmation + '$', 'i');
    return pattern.test(name);
  },
  _cleanupState: function () {
    this.$el.removeClass(function (index, css) {
      return (css.match(/(has-(success|error))+/g) || []).join(' ');
    });
  }
});

module.exports = DrawerGroupDeleteView;
