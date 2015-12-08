var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');

var DropdownUsersView = Backbone.View.extend({
  template: require('../templates/dropdown-users.html'),
  templateContent: require('../templates/dropdown-users-content.html'),

  events: {
    'keyup input[type=text]': 'onSearch', // @todo implement navigation up down enter hover
    'click i.icon-search': 'onSearch',
    'click .dropdown-menu>li': 'onClickLi'
  },

  initialize: function (options) {
    this.roomId = options.room_id;
    this.render();
  },

  render: function () {
    this.$el.html(this.template());
    this.$search = this.$('input[type=text]');
    this.$dropdown = this.$('.dropdown');
    this.$dropdownMenu = this.$('.dropdown-menu');
    return this;
  },
  onResults: function (list) {
    this.$dropdownMenu.html(this.templateContent({users: list}));
  },
  onSearch: function (event) {
    event.preventDefault();

    clearTimeout(this.timeout);

    if (this.$search.val() === '') {
      this.$dropdown.removeClass('open');
      return;
    }
    var key = keyboard._getLastKeyCode(event);
    if (event.type === 'click' || key.key === keyboard.RETURN) { // instant search when user click on icon or press enter
      this.trigger('onSearch', this.$search.val());
      return;
    }

    this.timeout = setTimeout(_.bind(function () {
      this.trigger('onSearch', this.$search.val());
    }, this), this.timeBufferBeforeSearch);
  },
  onClickLi: function (event) {
    event.preventDefault();
    this.trigger('onClickLi', event);
  },
  close: function () {
    this.$dropdown.removeClass('open');
    this.$search.val('');
  },
  open: function () {
    this.$dropdown.addClass('open');
    this.$dropdownMenu.html(require('../templates/spinner.html'));
  }
});

module.exports = DropdownUsersView;
