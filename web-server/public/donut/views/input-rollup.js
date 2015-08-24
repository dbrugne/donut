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

  var RollupView = Backbone.View.extend({

    template: templates['rollup.html'],

    cursorPosition: null,

    events: {
      'mouseover .rollup-container li': 'onRollupHover',
      'click .rollup-container li': 'onRollupClose'
    },

    initialize: function (options) {
      this.listenTo(this.model, 'inputKeyUp', this.onKeyUp);
      this.render();
    },

    render: function () {
      this.$editable = this.$el.find('.editable');
      this.$rollUpCtn = this.$el.find('.rollup-container');
    },

    onKeyUp: function (event) {
      if (event.type != 'keyup')
        return;

      var data = keyboard._getLastKeyCode();
      var message = this.$editable.val();

      // closed
      if (this.$rollUpCtn.html().length == 0) {

        // If different from @, #, /, close rollup & do nothing more
        if (!this._isRollupCallValid(message))
          return this._closeRollup();

        return this._displayRollup();

        // opened
      } else {
        // Cleaned the input
        // On key up, if input is empty or push Esc, close rollup
        if (message.length == 0 || data.key == keyboard.ESC)
          return this._closeRollup();

        // On Return && not Shift && something to select
        if (data.key == keyboard.RETURN && !data.isShift && message.length != 0)
          return this._closeRollup(event.target);

        if (data.key == keyboard.UP || data.key == keyboard.DOWN || data.key == keyboard.TAB)
          return this._rollupNavigate(data.key, event.target);

        if (!this._isRollupCallValid(message))
          return this._closeRollup();

        return this._displayRollup();
      }
    },

    _parseInput: function() {
      var pos = this._getCursorPosition(); // Get current cursor position in textarea

      // If space of nothing found after getCursorPosition, we continue, else return null
      if (this.$editable.val().length > pos && this.$editable.val().substr(pos, 1) !== ' ')
        return '';

      var message = this.$editable.val().substr(0,pos); // Only keep text from start to current cursor position
      return _.last(message.split(' ')); // only keep the last typed command / mention
    },

    _isRollupCallValid: function (val) {
      var message = this._parseInput();
      if (message.length == 0)
        return false;

      return ! (_.indexOf(['#', '@', '/'], message.substr(0, 1)) == -1)
    },

    _rollupNavigate: function (key, target) {
      var currentLi = this.$rollUpCtn.find('li.active');
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
    _getCursorPosition: function() {
      return this.cursorPosition === null ? this.$editable.getCursorPosition() : this.cursorPosition;
    },

    _displayRollup: function () {
      var input = this._parseInput();
      var that = this;

      if (input.length < 2)
        return this._closeRollup();

      var prefix = input.substr(0, 1);
      var search = input.substr(1);

      // @todo store results in view, to avoid multiple call to client ?

      if (prefix === '#')
        client.search(search, true, false, 15, false, function(data) {
          _.each(data.rooms.list, function(d){
            d.avatarUrl = common.cloudinarySize(d.avatar);
          });
          that.$rollUpCtn.html(that.template({ type: 'rooms', results: data.rooms.list }));
        });

      if (prefix === '@')
        client.search(search, false, true, 15, false, function(data) {
          _.each(data.users.list, function(d){
            d.avatarUrl = common.cloudinarySize(d.avatar);
          });
          that.$rollUpCtn.html(that.template({ type: 'users', results: data.users.list }));
        });

      // @todo spd implement command
    },
    _computeNewValue: function(replaceValue) { // @michel
      var oldValue = this.$editable.val(); // #LeagueofLegend @mich #donut
      var currentInput = this._parseInput(); // @mich
      var cursorPosition = this._getCursorPosition();
      var newCursorPosition = (oldValue.substr(0,(cursorPosition - currentInput.length)) + replaceValue).length - 1; // Remove last space
      var newValue = oldValue.substr(0,(cursorPosition - currentInput.length)) + replaceValue + oldValue.substr(cursorPosition, oldValue.length).trim();

      this.$editable.val(newValue);
      this.$editable.setCursorPosition(newCursorPosition, newCursorPosition);
    },
    _closeRollup: function (target) {
      if (target) {
        if (this.$rollUpCtn.find('li.active .value').length == 0)
          return;

        this._computeNewValue(this.$rollUpCtn.find('li.active .value').html() + ' ');
      }

      this.$rollUpCtn.html('');
    },

    onRollupHover: function (event) {
      var li = $(event.currentTarget);
      if (li.hasClass('empty')) // Avoid highlighting empty results on hover
        return;

      var currentLi = this.$rollUpCtn.find('li.active');
      currentLi.removeClass('active');
      li.addClass('active');
      this._computeNewValue(li.find('.value').html() + ' ');
    },
    onRollupClose: function() {
      this._closeRollup();
      this.$editable.setCursorPosition(this.$editable.val().length, this.$editable.val().length);
    }

  });

  return RollupView;
});