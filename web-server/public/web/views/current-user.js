var $ = require('jquery');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var currentUser = require('../libs/app').user;
var i18next = require('i18next-client');
var MuteView = require('./mute');

var CurrentUserView = Backbone.View.extend({
  template: require('../templates/current-user.html'),

  initialize: function (options) {
    this.listenTo(this.model, 'change', this.render);
    this.$toggle = this.$el.find('#block-current-user');
    this.$message = $('#chat').find('.mail-not-confirmed').hide();
  },
  render: function () {
    if (!currentUser.get('user_id')) {
      return this;
    } // nothing to render if welcome wasn't received

    var data = currentUser.toJSON();

    data.avatar = common.cloudinary.prepare(currentUser.get('avatar'), 60);
    data.realname = currentUser.get('realname');

    if (!data.confirmed) {
      this.$message.html(i18next.t('account.manageemail.mail-notconfirmed')).show();
    } else {
      this.$message.html('').hide();
    }

    var html = this.template(data);
    this.$toggle.html(html);

    this.muteView = new MuteView();

    return this;
  }
});

module.exports = CurrentUserView;
