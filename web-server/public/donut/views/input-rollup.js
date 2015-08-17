define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'libs/donut-debug',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client, donutDebug, currentUser, templates) {

  var debug = donutDebug('donut:rollup');

  var RollupView = Backbone.View.extend({

    template: templates['rollup.html'],

    KEY: {
      BACKSPACE: 8,
      TAB: 9,
      RETURN: 13,
      ESC: 27,
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      DOWN: 40,
      COMMA: 188,
      SPACE: 32,
      HOME: 36,
      END: 35
    },

    events: {
      'keyup .editable': 'onKeyUp',
      'keydown .editable': 'onKeyDown',
      'hover .rollup-container li': 'onRollupHover'
    },

    initialize: function (options) {
      this.render();
    },

    render: function () {
      this.$editable = this.$el.find('.editable');
      this.$rollUpCtn = this.$el.find('.rollup-container');

      //this.$el.html(this.template({
      //  avatar: $.cd.userAvatar(currentUser.get('avatar'), 80),
      //  bannedMessage: $.t('chat.actions.bannedMessage.__type__'.replace('__type__', this.model.get('type')))
      //}));
      //
      //this.$editable = this.$el.find('.editable');
      //this.$preview = this.$el.find('.preview');
      //this.$rollUpCtn = this.$el.find('.rollup-container');
      //
      //if (!this.model.isInputActive())
      //  this.$el.addClass('inactive');
      //else
      //  this.$el.removeClass('inactive');
    },

    /**
     * Only used to detect keydown on tab and then prevent default to avoid loosing focus
     * on keypress & keyup, it's too late
     *
     * @param event
     */
    onKeyDown: function(event) {
      if (event.type != 'keydown')
        return;
      
      var data = this._getKeyCode();
      var message = this.$editable.val();

      // Avoid loosing focus when tab is pushed
      if (data.key == this.KEY.TAB)
        event.preventDefault();

      // Avoid adding new line on enter press (=submit message)
      if (data.key == this.KEY.RETURN && !data.isShift)
        event.preventDefault();

      // Navigate between editable messages
      if (event.which == this.KEY.UP && message === '')
        this.model.trigger('editPreviousInput');
    },

    onKeyUp: function (event) {
      if (event.type != 'keyup')
        return;

      var data = this._getKeyCode();
      var message = this.$editable.val();

      // Rollup Closed
      if (this.$rollUpCtn.html().length == 0) {

        // Send message on Enter, not shift + Enter, only if there is something to send
        if (data.key == this.KEY.RETURN && !data.isShift && message.length != 0)
          return this.model.trigger('sendMessage');

        // Edit previous message on key Up
        if (data.key == this.KEY.UP && ($(event.currentTarget).val() === ''))
          return this.model.trigger('editPreviousInput');

        // If different from @, #, /, close rollup & do nothing more
        if (!this._isRollupCallValid(message))
          return this._closeRollup();

        return this._displayRollup();

        // Rollup Open
      } else {
        // Cleaned the input
        // On key up, if input is empty or push Esc, close rollup
        if (message.length == 0 || data.key == this.KEY.ESC)
          return this._closeRollup();

        // On Return && not Shift && something to select
        if (data.key == this.KEY.RETURN && !data.isShift && message.length != 0)
          return this._closeRollup(event.target);

        if (data.key == this.KEY.UP || data.key == this.KEY.DOWN || data.key == this.KEY.TAB)
          return this._rollupNavigate(data.key, event.target);

        if (!this._isRollupCallValid(message))
          return this._closeRollup();

        return this._displayRollup();
      }
    },

    _parseInput: function() {
      var pos = this.$editable.getCursorPosition(); // Get current cursor position in textarea
      var message = this.$editable.val().substr(0,pos); // Only keep text from start to current cursor position
      return _.last(message.split(' ')); // only keep the last typed command / mention
    },

    /**
     * @param val
     * @returns {boolean}
     * @private
     */
    _isRollupCallValid: function (val) {
      var message = this._parseInput();
      if (message.length == 0)
        return false;

      return ! (_.indexOf(['#', '@', '/'], message.substr(0, 1)) == -1)
    },

    _rollupNavigate: function (key, target) {
      var currentLi = this.$rollUpCtn.find('li.active');
      var li = '';
      if (key == this.KEY.UP) {
        li = currentLi.prev();
        if (li.length == 0)
          li = currentLi.parent().find('li').last();
      }
      else if (key == this.KEY.DOWN || key == this.KEY.TAB) {
        li = currentLi.next();
        if (li.length == 0)
          li = currentLi.parent().find('li').first();
      }

      if (li.length != 0) {
        currentLi.removeClass('active');
        li.addClass('active');
        target.value = li.find('.value').html() + ' ';
      }
    },

    _getKeyCode: function () {
      if (window.event) {
        return {
          key: window.event.keyCode,
          isShift: !!window.event.shiftKey
        };
      } else {
        return {
          key: event.which,
          isShift: !!event.shiftKey
        };
      }
    },

    // @todo store results in view, to avoid multiple call to client ?

    _displayRollup: function () {
      var input = this._parseInput();
      var that = this;

      if (input.length < 2)
        return this._closeRollup();

      var prefix = input.substr(0, 1);
      var search = input.substr(1);

      if (prefix === '#')
        client.search(search, true, false, 15, false, function(data) {
          _.each(data.rooms.list, function(d){
            d.avatarUrl = $.cd.roomAvatar(d.avatar);
          });
          that.$rollUpCtn.html(that.template({ type: 'rooms', results: data.rooms.list }));
        });

      if (prefix === '@')
        client.search(search, false, true, 15, false, function(data) {
          _.each(data.users.list, function(d){
            d.avatarUrl = $.cd.userAvatar(d.avatar);
          });
          that.$rollUpCtn.html(that.template({ type: 'users', results: data.users.list }));
        });

      // @todo spd implement command
    },
    _closeRollup: function (target) {
      if (target) {
        var fullValue = target.value; // #LeagueofLegend @mich #donut
        var currentInput = this._parseInput(); // @mich
        var replaceValue = this.$rollUpCtn.find('li.active .value').html() + ' '; // @michel
        var cursorPosition = this.$editable.getCursorPosition();

        target.value = fullValue.substr(0,(cursorPosition - currentInput.length)) + replaceValue + fullValue.substr(cursorPosition, fullValue.length).trim();
      }

      this.$rollUpCtn.html('');
    },

    onRollupHover: function () {
      console.log('hover');
    }

  });

  return RollupView;
});