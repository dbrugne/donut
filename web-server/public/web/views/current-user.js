var $ = require('jquery');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var currentUser = require('../libs/app').user;
var i18next = require('i18next-client');

module.exports = Backbone.View.extend({
  template: require('../templates/current-user.html'),

  initialize: function (options) {
    this.listenTo(this.model, 'change:status change:realname change:username change:confirmed change:avatar', this.render);

    this.$toggle = this.$('#block-current-user-toggle');
    this.$message = $('#chat').find('.mail-not-confirmed').hide();
    this.$status = this.$('.user-status');
  },
  render: function () {
    if (currentUser.get('status')) {
      this.$status.removeClass().addClass('user-status').addClass(currentUser.get('status'));
    }
    if (!currentUser.get('user_id')) {
      return this;
    } // nothing to render if welcome wasn't received
    var data = currentUser.toJSON();

    data.avatar = common.cloudinary.prepare(currentUser.get('avatar'), 50);
    data.realname = currentUser.get('realname');
    data.status = this.model.get('status');

    if (!data.confirmed) {
      this.$message.html(i18next.t('account.manageemail.mail-notconfirmed')).show();
    } else {
      this.$message.html('').hide();
    }

    var html = this.template(data);
    this.$toggle.html(html);

    return this;
  }
});
