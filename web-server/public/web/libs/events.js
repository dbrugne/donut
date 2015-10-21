var $ = require('jquery');
var _ = require('underscore');
var common = require('@dbrugne/donut-common/browser');
var date = require('./date');
var EventModel = require('../models/event');

var templates = {
  'hello': require('../templates/event/block-hello.html'),
  'command:help': require('../templates/event/help.html'),
  'ping': require('../templates/event/ping.html'),
  'user:online': require('../templates/event/status.html'),
  'user:offline': require('../templates/event/status.html'),
  'room:out': require('../templates/event/status.html'),
  'room:in': require('../templates/event/status.html'),
  'room:message': require('../templates/event/message.html'),
  'user:message': require('../templates/event/message.html'),
  'room:topic': require('../templates/event/room-topic.html'),
  'room:deop': require('../templates/event/promote.html'),
  'room:kick': require('../templates/event/promote.html'),
  'room:ban': require('../templates/event/promote.html'),
  'room:deban': require('../templates/event/promote.html'),
  'room:voice': require('../templates/event/promote.html'),
  'room:devoice': require('../templates/event/promote.html'),
  'room:op': require('../templates/event/promote.html'),
  'room:groupban': require('../templates/event/group-promote.html'),
  'user:ban': require('../templates/event/promote.html'),
  'user:deban': require('../templates/event/promote.html')
};

var exports = module.exports = function (options) {
  this.discussion = options.model;
  this.$el = options.el; // at this time it's empty
  this.empty = true;
  this.topEvent = '';
  this.bottomEvent = '';
};

exports.prototype.insertBottom = function (event) {
  var id = event.get('id');
  if (!id) {
    return;
  }
  if (this.$el.find('#' + id).length) {
    return console.warn('history and realtime event colision', id);
  }

  var previous = this.bottomEvent;

  var html = '';

  // new date block
  if (!previous || !date.isSameDay(event.get('time'), previous.get('time'))) {
    html += require('../templates/event/block-date.html')({
      time: event.get('time'),
      date: date.block(event.get('time'))
    });
  }

  // new message block
  if (this.block(event, previous)) {
    html += require('../templates/event/block-user.html')({
      user_id: event.get('data').user_id,
      username: event.get('data').username,
      avatar: common.cloudinary.prepare(event.get('data').avatar, 30)
    });
  }

  // render event
  html += this._renderEvent(event.get('type'), this._data(event));

  // previous saving
  if (!this.topEvent && !this.bottomEvent) {
    this.topEvent = this.bottomEvent = event; // first inserted element
  } else {
    this.bottomEvent = event;
  }

  this.empty = false;
  this.$el.append(html);
};

exports.prototype.insertTop = function (events) {
  if (events.length === 0) {
    return;
  }

  var html = '';
  var previous;
  _.each(events, _.bind(function (event) {
    event = new EventModel(event);

    // try to render event (before)
    var _html = this._renderEvent(event.get('type'), this._data(event));
    if (!_html) {
      return;
    }

    // new message block
    if (this.block(event, previous)) {
      _html = require('../templates/event/block-user.html')({
        user_id: event.get('data').user_id,
        username: event.get('data').username,
        avatar: common.cloudinary.prepare(event.get('data').avatar, 30)
      }) + _html;
    }

    // new date block
    if (!previous || !date.isSameDay(event.get('time'), previous.get('time'))) {
      _html = require('../templates/event/block-date.html')({
        time: event.get('time'),
        date: date.block(event.get('time'))
      }) + _html;
    }

    html += _html;
    if (!previous) {
      // first event in events will be the new this.topEvent for next batch
      this.topEvent = event;
    }
    previous = event;
    if (this.empty) {
      // empty DOM, bottom element will be the last of this loop
      this.bottomEvent = event;
    }
  }, this));

  if (!this.empty) {
    // remove systematically first date block in $el
    this.$el.find('.block.date:first').remove();
  }

  this.empty = false;
  this.$el.prepend(html);
};

exports.prototype.replaceLastDisconnectBlock = function ($lastDisconnectBlock, $previousEventDiv, history) {
  if (!history.length) {
    $lastDisconnectBlock.replaceWith('');
    return;
  }

  history = history.reverse();

  var html = '';
  var previous;
  _.each(history, _.bind(function (event) {
    event = new EventModel(event);

    // try to render event (before)
    var _html = this._renderEvent(event.get('type'), this._data(event));
    if (!_html) {
      return;
    }

    // new message block
    if ((previous && this.block(event, previous)) || (!previous && event.get('data').user_id !== $previousEventDiv.data('userId'))) {
      _html = require('../templates/event/block-user.html')({
        user_id: event.get('data').user_id,
        username: event.get('data').username,
        avatar: common.cloudinary.prepare(event.get('data').avatar, 30)
      }) + _html;
    }

    // new date block
    if ((!previous && !date.isSameDay(event.get('time'), $previousEventDiv.data('time'))) ||
      (previous && !date.isSameDay(event.get('time'), previous.get('time')))) {
      _html = require('../templates/event/block-date.html')({
        time: event.get('time'),
        date: date.block(event.get('time'))
      }) + _html;
    }

    previous = event;
    html += _html;
  }, this));

  this.empty = false;
  $lastDisconnectBlock.replaceWith(html);
};

exports.prototype.block = function (event, previous) {
  var messagesTypes = [ 'room:message', 'user:message' ];
  if (messagesTypes.indexOf(event.get('type')) === -1) {
    return false;
  }
  if (!previous) {
    return true;
  }
  if (messagesTypes.indexOf(previous.get('type')) === -1) {
    return true;
  }
  if (!date.isSameDay(event.get('time'), previous.get('time'))) {
    return true;
  }
  if (event.get('data').user_id !== previous.get('data').user_id) {
    return true;
  }
  return false;
};

exports.prototype._data = function (event) {
  var data = event.toJSON();
  data.data = _.clone(event.get('data'));

  data.stype = data.type.replace('room:', '').replace('user:', '');
  data.type = data.type.replace(':', '');

  // room
  if (this.discussion.get('type') === 'room') {
    data.identifier = this.discussion.get('identifier');
    data.mode = this.discussion.get('mode');
    data.allow_user_request = this.discussion.get('allow_user_request');
    data.group_name = this.discussion.get('group_name');
    data.group_id = this.discussion.get('group_id');
    data.owner_username = this.discussion.get('owner_username');
    data.owner_id = this.discussion.get('owner_id');
  }

  // unviewed & spammed & edited
  data.unviewed = (event.get('unviewed') === true);
  data.spammed = (event.get('spammed') === true);
  data.edited = (event.get('edited') === true);

  // avatar
  if (event.get('data').avatar) {
    data.data.avatar = common.cloudinary.prepare(event.get('data').avatar, 30);
  }
  if (event.get('data').by_avatar) {
    data.data.by_avatar = common.cloudinary.prepare(event.get('data').by_avatar, 30);
  }

  if (data.data.message || data.data.topic) {
    var subject = data.data.message || data.data.topic;
    subject = common.markup.toHtml(subject, {
      template: require('../templates/markup.html'),
      style: 'color: ' + this.discussion.get('color')
    });

    subject = $.smilify(subject);

    if (data.data.message) {
      data.data.message = subject;
    } else {
      data.data.topic = subject;
    }
  }

  // files
  if (data.data.files) {
    var files = [];
    _.each(data.data.files, function (f) {
      if (f.type !== 'raw') {
        f.href = common.cloudinary.prepare(f.url, 1500, 'limit');
        f.thumbnail = common.cloudinary.prepare(f.url, 100, 'fill');
      }
      files.push(f);
    });

    if (files && files.length > 0) {
      data.data.files = files;
    }
  }

  // date
  var time = event.get('time');
  data.data.dateshort = date.shortTime(time);
  data.data.datefull = date.longDateTime(time);

  return data;
};

exports.prototype._renderEvent = function (type, data) {
  try {
    var template = templates[type];
    if (!template) {
      console.warn('render was unable to find template: ' + type);
      return ''; // avoid 'undefined'
    }
    return template(data);
  } catch (e) {
    console.error('render exception, see below: ' + type, e);
    return ''; // avoid 'undefined'
  }
};
