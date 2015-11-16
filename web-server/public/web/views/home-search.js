var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var keyboard = require('../libs/keyboard');

var SearchView = Backbone.View.extend({
  timeout: 0,
  timeBufferBeforeSearch: 100,
  limit: 100,
  resultsTemplate: require('../templates/dropdown-search.html'),
  events: {
    'keyup input[type=text]': 'onKeyup',
    'click .icon.icon-search': 'updateSearch',
    'change .checkbox-search': 'onKeyup',
    'blur input[type=text]': 'closeResults',
    'click .results': 'closeResults'
  },

  initialize: function (options) {
    this.$search = this.$('input[type=text]').first();
    this.$dropdownResults = $('#results-search');
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
        if (current.length === 0) {
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
        if (current.length === 0) {
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

    if (key.key === keyboard.LEFT ||key.key === keyboard.RIGHT || key.key === keyboard.TAB) {
      return;
    }

    if (key.key === keyboard.RETURN) {
      current = this.$dropdownResults.find('.result.active');
      if (current.length !== 0) {
        current.click();
        this.closeResults();
        return;
      } else {
        if (this.getValue() !== '') {
          this.updateSearch();
          this.closeResults();
          return;
        }
      }
    }

    clearTimeout(this.timeout);
    this.timeout = setTimeout(_.bind(function () {
      this.search();
    }, this), this.timeBufferBeforeSearch);
  },
  updateSearch: function () {
    app.trigger('updateSearch', this.$search.val(), 'default');
  },
  search: function () {
    var s = this.$search.val();
    if (!s || s.length < 1) {
      this.closeResults();
      return;
    }

    this.$dropdownResults.html(require('../templates/spinner.html'));
    this.$el.addClass('open');

    var options = {
      users: true,
      rooms: true, // by default, search on rooms
      groups: true,
      limit: {
        users: 4,
        groups: 4,
        rooms: 4
      }
    };
    client.search(s, options, _.bind(function (data) {
      var total = (data.groups && data.groups.list
          ? data.groups.list.length
          : 0) +
        (data.rooms && data.rooms.list
          ? data.rooms.list.length
          : 0) +
        (data.users && data.users.list
          ? data.users.list.length
          : 0);
      if (total === 0) {
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
      this.$dropdownResults.html(this.resultsTemplate({
        search: this.getValue(),
        results: data
      }));
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
    clearTimeout(this.timeout);
  },
  getValue: function () {
    return this.$search.val();
  }
});

module.exports = SearchView;
