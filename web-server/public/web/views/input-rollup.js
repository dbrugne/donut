var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var keyboard = require('../libs/keyboard');

module.exports = Backbone.View.extend({
  template: require('../templates/rollup.html'),
  templateEmojione: require('../templates/rollup-emojione.html'),
  cursorPosition: null,
  isOpen: false,
  events: {
    'mouseover .rollup-container li': 'onRollupHover',
    'click .rollup-container li': 'onRollupClick',
    'click .close-rollup': 'onClose',
    'click .add-emoji': 'openEmojis',
    'click .emojione-category': 'onEmojioneCategory',
    'click .emojione-pick': 'onEmojionePick'
  },
  initialize: function (options) {
    this.listenTo(this.model, 'messageSent', this.close);
    this.listenTo(this.model, 'inputKeyUp', this.onKeyUp);
    this.listenTo(this.model, 'inputKeyDown', this.onKeyDown);
    this.listenTo(this.model, 'input:clicked', this.onRollupClose);

    var commands = [];
    _.each(options.commands, function (command, key) {
      command.name = key;
      commands.push(command);
    });
    this.commands = commands;

    this.$editable = this.$('.editable');
    this.$rollup = this.$('.rollup-container');
  },
  render: function () {
    return this;
  },
  onKeyDown: function (event) {
    var data = keyboard.getLastKeyCode(event);
    this.cursorPosition = null;

    if (this.isOpen) {
      // Avoid setting cursor at end or start of tab input when pressing up or down (used to navigate)
      if (data.key === keyboard.DOWN || data.key === keyboard.UP || data.key === keyboard.TAB) {
        this.cursorPosition = this.$editable.getCursorPosition();
        this._rollupNavigate(data.key);
        event.preventDefault(); // avoid triggering keyUp
      } else if (data.key === keyboard.LEFT || data.key === keyboard.RIGHT || data.isCtrl || data.isAlt || data.isMeta) {
        this.cursorPosition = this.$editable.getCursorPosition();
        this.close();
      }
    }
  },
  onKeyUp: function (event) {
    if (event.type !== 'keyup') {
      return;
    }

    var pressedKey = keyboard.getLastKeyCode(event);
    var inputValue = this.$editable.val();

    // rollup is opened, handle navigation
    if (this.isOpen) {
      if (inputValue.length === 0 || pressedKey.key === keyboard.ESC) {
        // empty input or esc pressed
        return this.close();
      }

      // select something (with enter)
      if (pressedKey.key === keyboard.RETURN && !pressedKey.isShift && inputValue.length !== 0) {
        var $targets = this.$rollup.find('li.active .value');
        if ($targets.length && event.target) {
          var value = $targets.html().trim();
          if (value.slice(-1) !== '/') {
            value += ' ';
          }
          this._computeNewValue(value);
          this.close();
          this.moveCursorToEnd();
          return;
        }
      }

      // release UP/DOWN/TAB/LEFT/RIGHT
      if (pressedKey.key === keyboard.UP || pressedKey.key === keyboard.DOWN || pressedKey.key === keyboard.LEFT || pressedKey.key === keyboard.RIGHT || pressedKey.key === keyboard.TAB || pressedKey.isCtrl || pressedKey.isAlt || pressedKey.isMeta) {
        return;
      }
    }

    var subject = this._parseInput();
    if (!subject) {
      return this.close();
    }
    if (['#', '@', ':', '/'].indexOf(subject.substr(0, 1)) === -1) {
      return this.close();
    }

    var prefix = subject.substr(0, 1);
    var text = subject.substr(1);

    // command
    var firstCharacterIsSlash = (inputValue.trim().substr(0, 1) === '/');
    var hasSpace = (inputValue.indexOf(' ') !== -1);
    if (firstCharacterIsSlash && !hasSpace) {
      return this.openCommand(text);
    }

    if (prefix === '#') {
      // rooms/group
      this.openRooms(text);
    } else if (prefix === '@') {
      this.openUsers(text);
    } else if (prefix === ':') {
      this.openEmojis(text);
    }
  },
  openCommand: function (subject) {
    var list = [];
    if (!subject.length) {
      list = this.commands;
    } else {
      list = _.filter(this.commands, function (c) {
        if (c.name.indexOf(subject) === 0) {
          return true;
        }
      });
    }

    this.$rollup.html(this.template({
      type: 'commands',
      results: list
    }));
    this.open();
  },
  openRooms: function (subject) {
    if (!subject) {
      // only prefix was typed
      this.$rollup.html(this.template({
        type: 'rooms',
        results: 'empty'
      }));
      this.open();
      return;
    }

    var options = {
      rooms: true,
      starts: true,
      limit: {
        groups: 15,
        rooms: 15
      }
    };

    // @todo : filter by group if in group or search only for non group and group if not
    var search;
    if (subject.indexOf('/') === -1) {
      search = subject;
      options.groups = true;
    } else {
      search = subject.split('/')[1]
        ? subject.split('/')[1]
        : '';
      options.group_name = subject.split('/')[0];
    }

    app.client.search(search, options, _.bind(function (data) {
      var list = [];
      if (data.rooms && data.rooms.list) {
        list = _.union(data.rooms.list, list);
      }
      if (data.groups && data.groups.list) {
        list = _.union(data.groups.list, list);
      }
      _.each(list, function (i) {
        i.avatarUrl = common.cloudinary.prepare(i.avatar);
      });

      this.$rollup.html(this.template({
        type: 'rooms',
        results: list
      }));
      this.open();
    }, this));
  },
  openUsers: function (subject) {
    if (!subject) {
      // only prefix was typed
      this.$rollup.html(this.template({
        type: 'users',
        results: 'empty'
      }));
      this.open();
      return;
    }

    var options = {
      users: true,
      starts: true,
      limit: {
        users: 10
      }
    };

    // @todo : filter by room (or group ?)
    app.client.search(subject, options, _.bind(function (data) {
      _.each(data.users.list, function (d) {
        d.avatarUrl = common.cloudinary.prepare(d.avatar);
      });
      this.$rollup.html(this.template({
        type: 'users',
        results: data.users.list
      }));
      this.open();
    }, this));
  },
  openEmojis: function (subject) {
    this.$rollup.html(this.templateEmojione({
      list: false,
      spinner: require('../templates/spinner.html')()
    }));
    this.open();
    this.loadEmojione('people');
  },
  loadEmojione: function (category) {
    $.ajax('/emojione/' + category, {
      dataType: 'json',
      success: _.bind(function (list) {
        this.$rollup.html(this.templateEmojione({
          list: list
        }));
        this.$rollup.find('.emojione-category[data-category="' + category + '"]').addClass('active');
      }, this)
    });
  },
  onEmojioneCategory: function (event) {
    event.preventDefault();

    var category = $(event.currentTarget).data('category');
    if (!category) {
      return;
    }

    this.loadEmojione(category);
  },
  onEmojionePick: function (event) {
    event.preventDefault();

    var shortname = $(event.currentTarget).data('shortname');
    if (!shortname) {
      return;
    }

    this._computeNewValue(shortname + ' ');
//    this.close();
    this.moveCursorToEnd();
  },
  _parseInput: function () {
    var pos = this._getCursorPosition(); // Get current cursor position in textarea

    // If space of nothing found after getCursorPosition, we continue, else return null
    if (this.$editable.val().length > pos && this.$editable.val().substr(pos, 1) !== ' ') {
      return '';
    }

    var message = this.$editable.val().substr(0, pos); // Only keep text from start to current cursor position
    return _.last(message.split(' ')); // only keep the last typed command / mention
  },
  _rollupNavigate: function (key) {
    var currentLi = this.$rollup.find('li.active');
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
      this._computeNewValue(li.find('.value').html().trim() + ' ');
    }
  },
  _getCursorPosition: function () {
    return this.cursorPosition === null
      ? this.$editable.getCursorPosition()
      : this.cursorPosition;
  },
  _computeNewValue: function (replaceValue) {
    var oldValue = this.$editable.val();
    var currentInput = this._parseInput();
    var cursorPosition = this._getCursorPosition();
    var newCursorPosition = (oldValue.substr(0, (cursorPosition - currentInput.length)) + replaceValue).length - 1; // Remove last space
    var newValue = oldValue.substr(0, (cursorPosition - currentInput.length)) + replaceValue + oldValue.substr(cursorPosition, oldValue.length).trim();

    this.$editable.val(newValue);
    this.$editable.setCursorPosition(newCursorPosition, newCursorPosition);
  },
  open: function () {
    this.$el.addClass('open');
    this.opened = true;
  },
  close: function () {
    this.$rollup.html('');
    this.$el.removeClass('open');
    this.opened = false;
  },
  onClose: function (event) {
    event.preventDefault();
    this.close();
  },
  onRollupHover: function (event) {
    var li = $(event.currentTarget);
    if (li.hasClass('empty')) { // Avoid highlighting empty results on hover
      return;
    }

    var currentLi = this.$rollup.find('li.active');
    currentLi.removeClass('active');
    li.addClass('active');
  },
  onRollupClick: function (event) {
    var li = $(event.currentTarget);
    if (li.hasClass('empty')) { // Avoid highlighting empty results on hover
      return;
    }

    if (li.find('.value').html().trim().slice(-1) !== '/') {
      this._computeNewValue(li.find('.value').html().trim() + ' ');
    } else {
      this._computeNewValue(li.find('.value').html().trim());
    }
    this.close();
    this.moveCursorToEnd();
  },
  onRollupClose: function () {
    if (this.isOpen) {
      this.close();
      this.moveCursorToEnd();
    }
  },
  moveCursorToEnd: function () {
    this.$editable.setCursorPosition(this.$editable.val().length, this.$editable.val().length);
  }
});
