var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');

var DropdownUsersView = Backbone.View.extend({
  template: require('../templates/dropdown-users.html'),
  templateContent: require('../templates/dropdown-users-content.html'),

  events: {
    'keyup input[type=text]': 'onKeyUp',
    'mouseover .dropdown-menu>li': 'onHover',
    'click i.icon-search': 'onSearch',
    'click .dropdown-menu>li': 'onClickLi'
  },

  initialize: function () {
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
  onKeyUp: function (event) {
    var data = keyboard.getLastKeyCode(event);

    if (data.key === keyboard.DOWN || data.key === keyboard.UP || data.key === keyboard.TAB) {
      event.preventDefault(); // avoid triggering keyUp
      return this._navigate(data.key);
    }

    if (data.key === keyboard.RETURN) {
      var currentLi = this.$dropdownMenu.find('li.active');
      if (currentLi) {
        currentLi.click();
      }
    }

    this.onSearch(event);
  },
  _navigate: function (key) {
    var currentLi = this.$dropdownMenu.find('li.active');
    var li = '';
    if (key === keyboard.UP) {
      li = currentLi.prev();
      if (li.length === 0) {
        li = currentLi.parent().find('li').last();
      }
    } else if (key === keyboard.DOWN || key === keyboard.TAB) {
      li = currentLi.next();
      if (li.length === 0) {
        li = currentLi.parent().find('li').first();
      }
    }

    if (li.length !== 0) {
      currentLi.removeClass('active');
      li.addClass('active');
    }
  },
  onHover: function (event) {
    var li = $(event.currentTarget);
    var currentLi = this.$dropdownMenu.find('li.active');
    currentLi.removeClass('active');
    li.addClass('active');
  },
  onSearch: function (event) {
    event.preventDefault();

    clearTimeout(this.timeout);

    if (this.$search.val() === '') {
      this.$dropdown.removeClass('open');
      return;
    }
    var key = keyboard.getLastKeyCode(event);
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
