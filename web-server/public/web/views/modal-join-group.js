var $ = require('jquery');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var JoinGroupOptionsView = require('./join-group-options');

var JoinGroupModalView = Backbone.View.extend({
  el: $('#join-group'),

  initialize: function (options) {
    this.model = options.model;
    this.$el.modal({
      show: false
    });
    this.joinGroupOptionsView = new JoinGroupOptionsView({
      el: $('.join-group-options'),
      model: this.model
    });
  },

  render: function (response) {
    this.$('.title-join').text(i18next.t('chat.joingroup.title', {name: this.model.get('name')}));
    if (this.model.get('disclaimer')) {
      this.$('.disclaimer').html(i18next.t('chat.joingroup.disclaimer', {
        username: this.model.get('owner_username'),
        disclaimer: this.model.get('disclaimer')
      }));
    }

    this.joinGroupOptionsView.render(response);
    return this;
  },

  show: function () {
    this.$el.modal('show');
  },
  hide: function () {
    this.$el.modal('hide');
  }
});

module.exports = JoinGroupModalView;
