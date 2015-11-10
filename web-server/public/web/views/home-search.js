var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var keyboard = require('../libs/keyboard');

var SearchView = Backbone.View.extend({
  timeout: 0,
  timeBufferBeforeSearch: 500,
  limit: 100,
  resultsTemplate: require('../templates/dropdown-search.html'),
  events: {
    'keyup input[type=text]': 'onKeyup',
    'change .checkbox-search': 'onKeyup',
    'blur input[type=text]': 'closeResults',
    'click .results': 'closeResults'
  },

  initialize: function (options) {
    this.$search = this.$('input[type=text]').first();
    this.$dropdownResults = this.$('.results');
    this.listenTo(app, 'goToSearch', this.closeResults);
  },
  render: function (data) {
    return this;
  },
  onKeyup: function (event) {
    event.preventDefault();

    var key = keyboard._getLastKeyCode(event);
    var current;
    if (key.key === keyboard.ESC) {
      return this.closeResults();
    }

    // Handle navigation
    if (key.key === keyboard.UP || key.key === keyboard.DOWN) {
      current = this.$dropdownResults.find('.result.active');
      if (key.key === keyboard.UP) {
        if (!current) {
          this.$dropdownResults.find('.result').last().addClass('active');
        } else {
          if (current.prevAll('.result').length === 0) { // current is first
            this.$dropdownResults.find('.result').last().addClass('active');
          } else {
            current.prevAll('.result').first().addClass('active');
          }
          current.removeClass('active');
        }
      }
      if (key.key === keyboard.DOWN) {
        if (!current) {
          this.$dropdownResults.find('.result').first().addClass('active');
        } else {
          if (current.nextAll('.result').length === 0) { // current is last
            this.$dropdownResults.find('.result').first().addClass('active');
          } else {
            current.nextAll('.result').first().addClass('active');
          }
          current.removeClass('active');
        }
      }
      return;
    }

    if (key.key === keyboard.RETURN) {
      current = this.$dropdownResults.find('.result.active');
      if (!current) {
        return;
      }
      current.click();
      this.closeResults();
      return;
    }

    clearTimeout(this.timeout);
    this.timeout = setTimeout(_.bind(function () {
      this.search();
    }, this), this.timeBufferBeforeSearch);
  },
  search: function () {
    this.$dropdownResults.html(require('../templates/spinner.html'));
    this.$el.addClass('open');
    var s = this.$search.val();
    if (!s || s.length < 1) {
      return this.onEmptyResults();
    }

    var options = {
      users: true,
      rooms: true,
      groups: true,
      limit: {
        users: 4,
        groups: 4,
        rooms: 4
      }
    };
    client.search(s, options, _.bind(function (data) {
      if (data.groups.list.length + data.users.list.length + data.rooms.list.length === 0) {
        return this.onEmptyResults();
      }
      _.each(_.union(
        data.rooms
          ? data.rooms.list
          : [],
        data.groups
          ? data.groups.list
          : [],
        data.users
          ? data.users.list
          : []
      ), function (card) {
        card.avatar = common.cloudinary.prepare(card.avatar, 90);
      });
      this.$dropdownResults.html(this.resultsTemplate({search: this.getValue(), results: data}));
      this.$dropdownResults.fadeIn();
    }, this));
  },
  onEmptyResults: function () {
    this.$dropdownResults.html(this.resultsTemplate());
    this.$dropdownResults.fadeIn();
  },
  closeResults: function () {
    this.$el.removeClass('open');
    this.$dropdownResults.fadeOut();
  },
  getValue: function () {
    return this.$search.val();
  }
});

module.exports = SearchView;
