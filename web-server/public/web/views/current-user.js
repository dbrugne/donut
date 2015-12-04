var $ = require('jquery');
var client = require('../libs/client');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var currentUser = require('../models/current-user');
var MuteView = require('./mute');

var CurrentUserView = Backbone.View.extend({
  template: require('../templates/current-user.html'),

  initialize: function (options) {
    this.listenTo(this.model, 'change', this.render);
    this.listenTo(client, 'user:confirmed', this.userConfirmed);
    this.$toggle = this.$el.find('#block-current-user-toggle');
  },
  render: function () {
    if (!currentUser.get('user_id')) {
      return this;
    } // nothing to render if welcome wasn't received

    var data = currentUser.toJSON();

    data.avatar = common.cloudinary.prepare(currentUser.get('avatar'), 60);
    data.realname = currentUser.get('realname');

    var html = this.template(data);
    this.$toggle.html(html);

    this.muteView = new MuteView();

    return this;
  },
  userConfirmed: function () {
    if (this.model.get('confirmed') !== true) {
      this.model.setConfirmed();
      this.render();
    }
  }
});

module.exports = CurrentUserView;
