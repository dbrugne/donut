var $ = require('jquery');
var client = require('../libs/client');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var currentUser = require('../models/current-user');
var MuteView = require('./mute');

var CurrentUserView = Backbone.View.extend({
  el: $('#block-current-user'),

  template: require('../templates/current-user.html'),

  initialize: function (options) {
    this.listenTo(this.model, 'change', this.render);
    this.listenTo(client, 'user:confirmed', this.userConfirmed);
  },
  render: function () {
    if (!currentUser.get('user_id')) {
      return this;
    } // nothing to render if welcome wasn't received

    var data = currentUser.toJSON();

    data.avatar = common.cloudinary.prepare(currentUser.get('avatar'), 60);
    data.realname = currentUser.get('realname');

    var html = this.template(data);
    this.$el.html(html);

    this.muteView = new MuteView();

    this.initializeTooltips();

    return this;
  },
  userConfirmed: function () {
    this.model.setConfirmed();
    this.render();
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = CurrentUserView;
