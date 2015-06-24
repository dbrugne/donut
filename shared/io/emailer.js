var debug = require('debug')('donut:emailer');
var _ = require('underscore');
var nodemailer = require('nodemailer');
var i18next = require('../util/i18next');
var conf = require('../../config/index');
var mailgunTransport = require('nodemailer-mailgun-transport');
var path = require('path');

/**
 * @hack the hogan-express module to avoid loading another rendering module just for email templating
 * add .lookup() method and i18next template helper
 */
var hoganExpress = require('hogan-express');
var _options = {
  settings: {
    layout: path.join(__dirname, '/../../web-server/views/emails/layout.html'),
    "view engine": "html"
  },
  cache: false,
  i: function() {
    return function(text) {
      return i18next.t(text);
    };
  }
};
var _defaultOptions = {
  fqdn: conf.fqdn,
  email: conf.email.from.email,
  facebook_url: conf.facebook.url,
  twitter_url: conf.twitter.url
};
var _render = _.bind(hoganExpress, {
  lookup: function(name) {
    return name;
  },
  i: function(text) {
    return i18next.t(text);
  }
});
var hoganRender = function(view, data, fn) {
  var options = _.extend(_options, data);
  _render(path.join(__dirname, '/../../web-server/views/emails/', view), options, fn);
};

var emailer = {};
module.exports = emailer;

// initiate a transporter, only one time for this process
var transporter = nodemailer.createTransport(mailgunTransport({
  auth: {
    api_key: conf.email.mailgun.api_key,
    domain: conf.email.mailgun.domain
  }
}));

function send(data, fn) {
  var err = false;

  // check
  if (!data) return fn('First argument should be an array with email data');
  if (!data.to) return fn('"to" is mandatory');
  if (!data.subject) return fn('"subject" is mandatory');
  if (!data.text && !data.html) return fn('"text" or "html" are mandatory');

  // prepare
  var options = {
    from: conf.email.from.name+' <'+conf.email.from.email+'>',
    to: data.to,
    subject: data.subject
  };
  if (data.text)
    options.text = data.text;
  if (data.html)
    options.html = data.html;

  // send
  process.nextTick(function() {
    transporter.sendMail(options, function(err, info) {
      if (err) {
        debug('Error while sending email to "'+options.to+'": '+err);
        return fn(err);
      } else {
        debug('Message sent', info);
        return fn();
      }
    });
  });
}

/**
 * Sent to a User when he process to /forgot page to retrieve his password
 *
 * @param to
 * @param token
 * @param callback
 */
emailer.forgot = function(to, token, callback) {
  hoganRender('forgot.html', _.extend(_defaultOptions, {token: token}), function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.forgot.subject"),
      html: text
    },callback);

  });
};

/**
 * Sent to a user when et creates an account
 *
 * @param to
 * @param callback
 */
emailer.welcome = function(to, callback) {
  hoganRender('signup.html', _defaultOptions, function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.welcome.subject"),
      html: text
    },callback);

  });

};

/**
 * Sent to a user when he renews his password
 *
 * @param to
 * @param callback
 */
emailer.passwordChanged = function(to, callback) {
  hoganRender('password-changed.html', _defaultOptions, function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.passwordchanged.subject"),
      html: text
    },callback);

  });
};

/**
 * Sent to a user when et renews his email
 *
 * @param to
 * @param callback
 */
emailer.emailChanged = function(to, callback) {
  hoganRender('email-changed.html', _defaultOptions, function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.emailchanged.subject"),
      html: text
    },callback);

  });

};

/**
 * Sent to a User when he send some messages to another User
 *
 * @param to
 * @param from
 * @param avatar
 * @param messages
 * @param callback
 */
emailer.userMessage = function(to, from, avatar, messages, callback) {
  hoganRender('user-message.html', _.extend(_defaultOptions, {username: from, avatar: avatar, messages: messages}), function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.usermessage.subject"),
      html: text
    },callback);

  });
};

/**
 * Sent to a User when he has been promoted moderator of a room
 *
 * @param to
 * @param from
 * @param room
 * @param callback
 */
emailer.roomOp = function(to, from, room, callback) {
  hoganRender('room-op.html', _.extend(_defaultOptions, { username: from, roomname: room.name }), function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.roomop.subject")+' '+room.name,
      html: text
    },callback);

  });
};

/**
 * Sent to a User when has been excluded from moderators of a room
 *
 * @param to
 * @param from
 * @param room
 * @param callback
 */
emailer.roomDeop = function(to, from, room, callback) {
  hoganRender('room-deop.html', _.extend(_defaultOptions, { username: from, roomname: room.name }), function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.roomdeop.subject")+' '+room.name,
      html: text
    },callback);

  });
};

/**
 * Sent to a User has been kicked from a room
 *
 * @param to
 * @param from
 * @param room
 * @param callback
 */
emailer.roomKick = function(to, from, room, callback) {
  hoganRender('room-kick.html', _.extend(_defaultOptions, { username: from, roomname: room.name }), function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.roomkick.subject")+' '+room.name,
      html: text
    },callback);

  });
};

/**
 * Sent to a User when he has been banned from a room
 *
 * @param to
 * @param from
 * @param room
 * @param callback
 */
emailer.roomBan = function(to, from, room, callback) {
  hoganRender('room-ban.html', _.extend(_defaultOptions, { username: from, roomname: room.name }), function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.roomban.subject")+' '+room.name,
      html: text
    },callback);

  });
};

/**
 * Sent to a User when he has been unbanned from a room
 *
 * @param to
 * @param from
 * @param room
 * @param callback
 */
emailer.roomDeban = function(to, from, room, callback) {
  var options = _.extend(_defaultOptions, {
    username: from,
    roomname: room.name
  });

  hoganRender('room-deban.html', options, function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.roomdeban.subject")+' '+room.name,
      html: text
    },callback);

  });
};

emailer.contactForm = function(data, callback) {
  send({
    to: conf.email.from.email,
    subject: i18next.t("email.contact.subject"),
    text: i18next.t("email.contact.text", data),
    html: i18next.t("email.contact.html", data)
  },callback);
};

/**
 * Sent to a User when The topic changed in a Room in which he wants to be warned
 *
 * @param to
 * @param from
 * @param room
 * @param callback
 */
emailer.roomTopic = function(to, from, room, callback) {
  hoganRender('room-topic.html', _.extend(_defaultOptions, { username: from, roomname: room.name }), function (err, text) {
    // @todo yls log errors

    send({
      to: to,
      subject: i18next.t("email.roomtopic.subject")+' '+room.name,
      html: text
    },callback);

  });
};