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
  whichOpen: null,
  events: {
    'mouseover .rollup-container li': 'onRollupHover',
    'click .rollup-container li': 'onRollupClick',
    'click .close-rollup': 'onClose',
    'click .add-emoji': 'toggleEmojis',
    'click .pick-emoji-category': 'onEmojioneCategory',
    'click .pick-emoji': 'onEmojionePick'
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

    var data = this.computeState(event);

    // rollup is opened, handle navigation
    if (this.isOpen) {
      if (data.input.length === 0 || data.pressedKey.key === keyboard.ESC) {
        // empty input or esc pressed
        return this.close();
      }

      // select something (with enter)
      if (data.pressedKey.key === keyboard.RETURN && !data.pressedKey.isShift && data.input.length !== 0) {
        var $targets = this.$rollup.find('li.active .value');
        if ($targets.length && event.target) {
          var value = $targets.html().trim();
          if (value.slice(-1) !== '/') {
            value += ' ';
          }
          this.insertInInput(value);
          this.close();
//          this.moveCursorToEnd();
          return;
        }
      }

      // release UP/DOWN/TAB/LEFT/RIGHT
      if (data.pressedKey.key === keyboard.UP || data.pressedKey.key === keyboard.DOWN || data.pressedKey.key === keyboard.LEFT || data.pressedKey.key === keyboard.RIGHT || data.pressedKey.key === keyboard.TAB || data.pressedKey.isCtrl || data.pressedKey.isAlt || data.pressedKey.isMeta) {
        return;
      }
    }

    if (!data.subject) {
      return this.close();
    }
    if (['#', '@', ':', '/'].indexOf(data.prefix) === -1) {
      return this.close();
    }

    // command
    var firstCharacterIsSlash = (data.input.trim().substr(0, 1) === '/');
    var hasSpace = (data.input.indexOf(' ') !== -1);
    if (firstCharacterIsSlash && !hasSpace) {
      return this.openCommand(data.text);
    }

    if (data.prefix === '#') {
      // rooms/group
      this.openRooms(data.text);
    } else if (data.prefix === '@') {
      this.openUsers(data.text);
    } else if (data.prefix === ':') {
      this.openEmojis(data.text);
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
    })).fadeIn();
    this.open();
    this.whichOpen = 'commands';
  },
  openRooms: function (subject) {
    if (!subject) {
      // only prefix was typed
      this.$rollup.html(this.template({
        type: 'rooms',
        results: 'empty'
      })).fadeIn();
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
      })).fadeIn();
      this.open();
      this.whichOpen = 'rooms';
    }, this));
  },
  openUsers: function (subject) {
    if (!subject) {
      // only prefix was typed
      this.$rollup.html(this.template({
        type: 'users',
        results: 'empty'
      })).fadeIn();
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
      })).fadeIn();
      this.open();
      this.whichOpen = 'users';
    }, this));
  },
  openEmojis: function (subject) {
    this.$rollup.html(this.templateEmojione({
      list: false,
      spinner: require('../templates/spinner.html')()
    })).fadeIn();
    this.open();
    this.whichOpen = 'emojis';
    this.loadEmojione('people');
  },
  loadEmojione: function (category) {
    $.ajax('/emojione/' + category, {
      dataType: 'json',
      success: _.bind(function (list) {
        this.$rollup.html(this.templateEmojione({
          list: list
        })).fadeIn();
        this.$rollup.find('.pick-emoji-category[data-category="' + category + '"]').addClass('active');
      }, this)
    });
  },
  toggleEmojis: function (event) {
    if (this.isOpen) {
      this.close();
    } else {
      this.openEmojis();
    }
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

    this.insertInInput(shortname + ' ');
    this.close();
    this.moveCursorToEnd();
  },
  computeState: function (event) {
    var data = {
      input: this.$editable.val(),
      position: this._getCursorPosition(),
      pressedKey: (event)
        ? keyboard.getLastKeyCode(event)
        : null,
      subject: '',
      prefix: '',
      text: '',
      subjectPosition: 0,
      beforeSubject: ''
    };

    // if space or nothing found after position we continue, else return
    if (data.input.length > data.position && data.input.substr(data.position, 1) !== ' ') {
      return data;
    }

    // only keep text from start to current cursor position
    var before = data.input.substr(0, data.position);

    // only keep the last typed command / mention
    var subject = _.last(before.split(' '));

    // determine if subject should be handled
    var prefix = subject.substr(0, 1);
    if (prefix !== ':' && prefix !== '@' && prefix !== '#') {
      return data;
    }

    data.subject = subject;
    data.prefix = prefix;
    data.text = data.subject.substr(1);
    data.subjectPosition = (data.position - data.subject.length);
    data.beforeSubject = data.input.substr(0, data.subjectPosition);

    return data;
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
      //this.insertInInput(li.find('.value').html().trim() + ' ');
    }
  },
  _getCursorPosition: function () {
    return this.cursorPosition === null
      ? this.$editable.getCursorPosition()
      : this.cursorPosition;
  },
  insertInInput: function (string) {
    var data = this.computeState();
    var after = data.input.substr(data.position).trim();

    if (!data.prefix) {
      // particular case of emoji direct picking
      this.$editable.val(data.input.substr(0, data.position) + string + after);
      this.$editable.setCursorPosition(data.position, data.position);
    } else {
      // input content
      this.$editable.val(data.beforeSubject + string + after);

      // cursor position
      var newPosition = (data.beforeSubject + string).length - 1; // @important remove last space
      this.$editable.setCursorPosition(newPosition, newPosition);
    }
  },
  open: function () {
    this.$el.addClass('open');
    this.isOpen = true;
  },
  close: function () {
    this.$rollup.fadeOut(_.bind(function () {
      this.$rollup.html('');
      this.$el.removeClass('open');
      this.isOpen = false;
      this.whichOpen = null;
    }, this));
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
      this.insertInInput(li.find('.value').html().trim() + ' ');
    } else {
      this.insertInInput(li.find('.value').html().trim());
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
