var debug = require('debug')('donut:emailer');
var _ = require('underscore');
var nodemailer = require('nodemailer');
var underscoreTemplate = require('../util/underscoreTemplate');
var i18next = require('../util/i18next');
var conf = require('../../config/index');
var mailgunTransport = require('nodemailer-mailgun-transport');
var path = require('path');

// template renderer
var renderer = underscoreTemplate.standard({
  defaultVariables: {
    t: i18next.t,
    fqdn: conf.fqdn,
    email: conf.email.from.email,
    facebook_url: conf.facebook.url,
    twitter_url: conf.twitter.url
  }
});

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

  var to = data.to;

  // stub to email in non-production environment
  if (process.env.NODE_ENV !== 'production' ) {
    to = conf.email.fake.replace('__name__', to.substr(0, to.indexOf('@')));
  }

  // prepare
  var options = {
    from: conf.email.from.name+' <'+conf.email.from.email+'>',
    to: to,
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
  renderer.render('emails/forgot.html', {
      token: token,
      title: i18next.t("email.forgot.title")
  }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.forgot.subject"),
      html: html
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
  renderer.render('emails/signup.html', {
      title: i18next.t("email.welcome.title")
    }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.welcome.subject"),
      html: html
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
  renderer.render('emails/password-changed.html', {
      title: i18next.t("email.passwordchanged.title")
}, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.passwordchanged.subject"),
      html: html
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
  renderer.render('emails/email-changed.html', {
      title: i18next.t("email.emailchanged.title")
    }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.emailchanged.subject"),
      html: html
    },callback);

  });

};

/**
 * Sent to a User when he send some messages to another User
 *
 * @param toEmail
 * @param username
 * @param events
 * @param callback
 */
emailer.userMessage = function(toEmail, username, events, callback) {
  renderer.render('emails/user-message.html', {
      username: username,
      events: events,
      title: i18next.t("email.usermessage.title")
  }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: toEmail,
      subject: i18next.t("email.usermessage.subject"),
      html: html
    }, callback);
  });
};

/**
 * Sent to a User when he send some messages to another User
 *
 * @param toEmail
 * @param events
 * @param roomName
 * @param roomAvatar
 * @param callback
 */
emailer.roomMessage = function(toEmail, events, roomName, roomAvatar, callback) {
  renderer.render('emails/room-message.html', {
      events: events,
      room_name: roomName,
      room_avatar: roomAvatar,
      title: i18next.t("email.roommessage.title")
  }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: toEmail,
      subject: i18next.t("email.roommessage.subject"),
      html: html
    }, callback);
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
  renderer.render('emails/room-op.html', {
      username: from,
      roomname: room.name,
      title: i18next.t("email.roomop.title")
  }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.roomop.subject")+' '+room.name,
      html: html
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
  renderer.render('emails/room-deop.html', {
      username: from,
      roomname: room.name,
      title: i18next.t("email.roomdeop.title")
  }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.roomdeop.subject")+' '+room.name,
      html: html
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
  renderer.render('emails/room-kick.html', {
      username: from,
      roomname: room.name,
      title: i18next.t("email.roomkick.title")
  }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.roomkick.subject")+' '+room.name,
      html: html
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
  renderer.render('emails/room-ban.html', {
      username: from,
      roomname: room.name,
      title: i18next.t("email.roomban.title")
  }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.roomban.subject")+' '+room.name,
      html: html
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
  var options = {
    username: from,
    roomname: room.name,
  title: i18next.t("email.roomdeban.title")
  };

  renderer.render('emails/room-deban.html', options, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.roomdeban.subject")+' '+room.name,
      html: html
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
  renderer.render('emails/room-topic.html', {
      username: from,
      roomname: room.name,
      title: i18next.t("email.roomtopic.title")
  }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.roomtopic.subject")+' '+room.name,
      html: html
    },callback);

  });
};

/**
 * Sent to a User when The topic changed in a Room in which he wants to be warned
 *
 * @param to
 * @param from
 * @param room
 * @param callback
 */
emailer.roomJoin = function(to, from, room, callback) {
  renderer.render('emails/room-join.html', {
      username: from,
      roomname: room.name,
      title: i18next.t("email.roomjoin.title")
  }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: to,
      subject: i18next.t("email.roomjoin.subject")+' '+room.name,
      html: html
    },callback);

  });
};

/**
 * Sent to a User when he send some messages to another User
 *
 * @param toEmail
 * @param events
 * @param roomName
 * @param roomAvatar
 * @param callback
 */
emailer.userMention = function(toEmail, events, roomName, roomAvatar, callback) {
  renderer.render('emails/user-mention.html', {
      events: events,
      room_name: roomName,
      room_avatar: roomAvatar,
      title: i18next.t("email.usermention.title").replace('__name__', roomName)
  }, function (err, html) {
    if (err)
      return callback(err);

    send({
      to: toEmail,
      subject: i18next.t("email.usermention.subject"),
      html: html
    }, callback);
  });
};