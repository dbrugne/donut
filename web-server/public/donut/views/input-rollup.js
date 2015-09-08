'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'client',
  'libs/donut-debug',
  'libs/keyboard',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, common, client, donutDebug, keyboard, currentUser, templates) {
  var debug = donutDebug('donut:input');

  var InputRollupView = Backbone.View.extend({
    template: templates['rollup.html'],

    cursorPosition: null,

    events: {
      'mouseover .rollup-container li': 'onRollupHover',
      'click .rollup-container li': 'onRollupClose'
    },

    initialize: function (options) {
      this.listenTo(this.model, 'inputKeyUp', this.onKeyUp);
      this.listenTo(this.model, 'inputKeyDown', this.onKeyDown);
      this.listenTo(this.model, 'input:clicked', this.onRollupClose);

      var commands = [];
      _.each(options.commands, function (command, key) {
        command.name = key;
        commands.push(command);
      });
      this.commands = commands;

      this.$editable = this.$el.find('.editable');
      this.$rollup = this.$el.find('.rollup-container');
    },

    render: function () {
      return this;
    },

    onKeyDown: function (event) {
      var data = keyboard._getLastKeyCode(event);

      if (!this.isClosed()) {
        // Avoid setting cursor at end or start of tab input when pressing up or down (used to navigate)
        if (data.key === keyboard.DOWN || data.key === keyboard.UP || data.key == keyboard.TAB) {
          this.cursorPosition = this.$editable.getCursorPosition();
          this._rollupNavigate(data.key, event.target);
          event.preventDefault(); // avoid triggering keyUp
          return;
        } else if ( data.key == keyboard.LEFT || data.key == keyboard.RIGHT || data.isCtrl || data.isAlt || data.isMeta) {
          this.cursorPosition = this.$editable.getCursorPosition();
          if (!this.isClosed()) {
            return this._closeRollup();
          }
        }
      }

      this.cursorPosition = null;
    },

    onKeyUp: function (event) {
      if (event.type != 'keyup') {
        return;
      }

      var data = keyboard._getLastKeyCode(event);
      var message = this.$editable.val();

      if (this.isClosed()) {
        // If different from @, #, /, close rollup & do nothing more
        if (!this._isRollupCallValid(message))
          return this._closeRollup();

        return this._displayRollup();

      } else {
        // Cleaned the input
        // On key up, if input is empty or push Esc, close rollup
        if (message.length == 0 || data.key == keyboard.ESC)
          return this._closeRollup();

        // On Return && not Shift && something to select
        if (data.key == keyboard.RETURN && !data.isShift && message.length != 0) {
          this._closeRollup(event.target);
          this.moveCursorToEnd();
        }

        // releasing UP / DOWN / TAB / LEFT / RIGHT : Do Nothing
        if (data.key == keyboard.UP || data.key == keyboard.DOWN || data.key == keyboard.LEFT || data.key == keyboard.RIGHT || data.key == keyboard.TAB || data.isCtrl || data.isAlt || data.isMeta) {
          return;
        }

        if (!this._isRollupCallValid(message))
          return this._closeRollup();

        return this._displayRollup();
      }
    },

    isClosed: function () {
      return (this.$rollup.html().length === 0);
    },

    _parseInput: function () {
      var pos = this._getCursorPosition(); // Get current cursor position in textarea

      // If space of nothing found after getCursorPosition, we continue, else return null
      if (this.$editable.val().length > pos && this.$editable.val().substr(pos, 1) !== ' ')
        return '';

      var message = this.$editable.val().substr(0, pos); // Only keep text from start to current cursor position
      return _.last(message.split(' ')); // only keep the last typed command / mention
    },

    _isRollupCallValid: function (val) {
      var message = this._parseInput();
      if (message.length == 0)
        return false;

      return !(_.indexOf(['#', '@', '/'], message.substr(0, 1)) == -1);
    },

    _isCommandCallable: function () {
      // First caracter is a /
      if (this.$editable.val().trim().substr(0, 1) !== '/')
        return false;

      // no space typed after command
      if (this.$editable.val().split(' ').length > 1)
        return false;

      return true;
    },

    _rollupNavigate: function (key, target) {
      var currentLi = this.$rollup.find('li.active');
      var li = '';
      if (key == keyboard.UP) {
        li = currentLi.prev();
        if (li.length == 0)
          li = currentLi.parent().find('li').last();
      }
      else if (key == keyboard.DOWN || key == keyboard.TAB) {
        li = currentLi.next();
        if (li.length == 0)
          li = currentLi.parent().find('li').first();
      }

      if (li.length != 0) {
        currentLi.removeClass('active');
        li.addClass('active');
        this._computeNewValue(li.find('.value').html() + ' ');
      }
    },
    _getCursorPosition: function () {
      return this.cursorPosition === null ? this.$editable.getCursorPosition() : this.cursorPosition;
    },
    _getCommandList: function () {
      var input = this._parseInput();
      var selectedCommands = [];

      if (input.length === 1) // First call
        selectedCommands = this.commands; else { // next calls
        _.each(this.commands, function (command) {
          if (command.name.indexOf(input.substr(1, input.length)) == 0)
            selectedCommands.push(command);
        });
      }

      return selectedCommands;
    },
    _displayRollup: function () {
      var input = this._parseInput();
      if (this._isCommandCallable()) {
        this.$rollup.html(this.template({
          type: 'commands',
          results: this._getCommandList()
        }));
        return;
      }

      if (input.length < 2)
        return this._closeRollup();

      var prefix = input.substr(0, 1);
      var search = input.substr(1);

      var that = this;

      if (prefix === '#') {
        client.search(search, true, false, 15, 0, false, function (data) {
          _.each(data.rooms.list, function (d) {
            d.avatarUrl = common.cloudinarySize(d.avatar);
          });
          that.$rollup.html(that.template({
            type: 'rooms',
            results: data.rooms.list
          }));
        });
      }

      if (prefix === '@') {
        client.search(search, false, true, 15, 0, false, function (data) {
          _.each(data.users.list, function (d) {
            d.avatarUrl = common.cloudinarySize(d.avatar);
          });
          that.$rollup.html(that.template({
            type: 'users',
            results: data.users.list
          }));
        });
      }
    },
    _computeNewValue: function (replaceValue) { // @michel
      var oldValue = this.$editable.val(); // #LeagueofLegend @mich #donut
      var currentInput = this._parseInput(); // @mich
      var cursorPosition = this._getCursorPosition();
      var newCursorPosition = (oldValue.substr(0, (cursorPosition - currentInput.length)) + replaceValue).length - 1; // Remove last space
      var newValue = oldValue.substr(0, (cursorPosition - currentInput.length)) + replaceValue + oldValue.substr(cursorPosition, oldValue.length).trim();

      this.$editable.val(newValue);
      this.$editable.setCursorPosition(newCursorPosition, newCursorPosition);
    },
    _closeRollup: function (target) {
      if (target) {
        if (this.$rollup.find('li.active .value').length == 0)
          return;

        this._computeNewValue(this.$rollup.find('li.active .value').html() + ' ');
      }

      this.$rollup.html('');
    },

    onRollupHover: function (event) {
      var li = $(event.currentTarget);
      if (li.hasClass('empty')) // Avoid highlighting empty results on hover
        return;

      var currentLi = this.$rollup.find('li.active');
      currentLi.removeClass('active');
      li.addClass('active');
      this._computeNewValue(li.find('.value').html() + ' ');
    },
    onRollupClose: function () {
      this._closeRollup();
      this.moveCursorToEnd();
    },
    moveCursorToEnd: function () {
      this.$editable.setCursorPosition(this.$editable.val().length, this.$editable.val().length);
    }

  });

  return InputRollupView;
});
