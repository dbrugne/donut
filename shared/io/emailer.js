'use strict';
var logger = require('../util/logger').getLogger('emailer', __filename);
var _ = require('underscore');
var nodemailer = require('nodemailer');
var underscoreTemplate = require('../util/underscore-template');
var i18next = require('../util/i18next');
var conf = require('../../config/index');
var mailgunTransport = require('nodemailer-mailgun-transport');
var urls = require('../util/url');

var emailer = {};
module.exports = emailer;

// setup template engine
var renderer = underscoreTemplate.standard({
  defaultVariables: {
    t: i18next.t,
    fqdn: conf.fqdn,
    email: conf.email.from.email,
    facebook_url: conf.facebook.url,
    twitter_url: conf.twitter.url
  }
});

// setup transporter (only one time for this process)
var transporter = nodemailer.createTransport(mailgunTransport({
  auth: {
    api_key: conf.email.mailgun.api_key,
    domain: conf.email.mailgun.domain
  }
}));

/**
 * Render 'template' with 'data' and send email to 'to'
 * @param to
 * @param template
 * @param data
 * @param callback
 */
function sendEmail (to, template, data, callback) {
  if (!to) {
    return callback('"to" param is mandatory');
  }
  if (!template) {
    return callback('"template" param is mandatory');
  }
  if (!data.subject) {
    return callback('"subject" param is mandatory');
  }
  if (!_.isObject(data)) {
    return callback('Third argument should be an object with email data');
  }

  // stub in non-production environment (@debug)
  if (process.env.NODE_ENV !== 'production') {
    to = conf.email.fake.replace('__name__', to.substr(0, to.indexOf('@')));
  }

  renderer.render(template, data, function (err, html) {
    if (err) {
      return callback(err);
    }

    var options = {
      from: conf.email.from.name + ' <' + conf.email.from.email + '>',
      to: to,
      subject: data.subject,
      html: html
    };
    if (data.text) {
      options.text = data.text;
    }

    process.nextTick(function () {
      transporter.sendMail(options, function (err, info) {
        if (err) {
          logger.error('Error while sending email to "' + options.to + '": ' + err);
          return callback(err);
        }

        logger.debug('Message sent', info);
        return callback(null);
      });
    });
  });
}

/** =================================================================
 *
 * Emails
 *
 * ================================================================== */

emailer.forgot = function (to, token, callback) {
  sendEmail(to, 'emails/forgot.html', {
    token: token,
    title: i18next.t('email.forgot.content.title'),
    subject: i18next.t('email.forgot.subject')
  }, callback);
};

emailer.welcome = function (to, callback) {
  sendEmail(to, 'emails/signup.html', {
    title: i18next.t('email.welcome.content.title'),
    subject: i18next.t('email.welcome.subject')
  }, callback);
};

emailer.passwordChanged = function (to, callback) {
  sendEmail(to, 'emails/password-changed.html', {
    title: i18next.t('email.passwordchanged.content.title'),
    subject: i18next.t('email.passwordchanged.subject')
  }, callback);
};

emailer.emailChanged = function (to, callback) {
  sendEmail(to, 'emails/email-changed.html', {
    title: i18next.t('email.emailchanged.content.title'),
    subject: i18next.t('email.emailchanged.subject')
  }, callback);
};

emailer.roomOp = function (to, data, callback) {
  data.name = data.roomname;
  var roomUrl = urls(data, 'room', 'https', conf.fqdn);
  var userUrl = urls(data, 'user', 'https', conf.fqdn);
  sendEmail(to, 'emails/room-op.html', {
    username: data.username,
    roomname: data.roomname,
    title: i18next.t('email.roomop.content.title', { roomname: data.roomname }),
    email_heading_action: i18next.t('email.roomop.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomop.subject', { roomname: data.roomname }),
    userlink: { url: userUrl.url },
    roomlink: {
      url: roomUrl.url,
      chat: roomUrl.chat
    }
  }, callback);
};

emailer.roomDeop = function (to, data, callback) {
  sendEmail(to, 'emails/room-deop.html', {
    username: data.username,
    roomname: data.roomname,
    title: i18next.t('email.roomdeop.content.title', { roomname: data.roomname }),
    email_heading_action: i18next.t('email.roomdeop.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomdeop.subject', { roomname: data.roomname })
  }, callback);
};

emailer.roomKick = function (to, data, callback) {
  data.name = data.roomname;
  var roomUrl = urls(data, 'room', 'https', conf.fqdn);
  sendEmail(to, 'emails/room-kick.html', {
    username: data.username,
    roomname: data.roomname,
    reason: data.reason,
    title: i18next.t('email.roomkick.content.title', { roomname: data.roomname }),
    subject: i18next.t('email.roomkick.subject', { roomname: data.roomname }),
    roomlink: { chat: roomUrl.chat }
  }, callback);
};

emailer.roomBan = function (to, data, callback) {
  sendEmail(to, 'emails/room-ban.html', {
    username: data.username,
    roomname: data.roomname,
    reason: data.reason,
    title: i18next.t('email.roomban.content.title', { roomname: data.roomname }),
    subject: i18next.t('email.roomban.subject', { roomname: data.roomname })
  }, callback);
};

emailer.roomDeban = function (to, data, callback) {
  data.name = data.roomname;
  var roomUrl = urls(data, 'room', 'https', conf.fqdn);
  var userUrl = urls(data, 'user', 'https', conf.fqdn);
  sendEmail(to, 'emails/room-deban.html', {
    username: data.username,
    roomname: data.roomname,
    reason: data.reason,
    title: i18next.t('email.roomdeban.content.title', { roomname: data.roomname }),
    email_heading_action: i18next.t('email.roomdeban.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomdeban.subject', { roomname: data.roomname }),
    userlink: { url: userUrl.url },
    roomlink: {
      url: roomUrl.url,
      chat: roomUrl.chat
    }
  }, callback);
};

emailer.roomVoice = function (to, data, callback) {
  data.name = data.roomname;
  var roomUrl = urls(data, 'room', 'https', conf.fqdn);
  var userUrl = urls(data, 'user', 'https', conf.fqdn);
  sendEmail(to, 'emails/room-voice.html', {
    username: data.username,
    roomname: data.roomname,
    title: i18next.t('email.roomvoice.content.title', { roomname: data.roomname }),
    email_heading_action: i18next.t('email.roomvoice.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomvoice.subject', { roomname: data.roomname }),
    userlink: { url: userUrl.url },
    roomlink: { chat: roomUrl.chat }
  }, callback);
};

emailer.roomDevoice = function (to, data, callback) {
  data.name = data.roomname;
  var roomUrl = urls(data, 'room', 'https', conf.fqdn);
  var userUrl = urls(data, 'user', 'https', conf.fqdn);
  sendEmail(to, 'emails/room-devoice.html', {
    username: data.username,
    roomname: data.roomname,
    reason: data.reason,
    title: i18next.t('email.roomdevoice.content.title', { roomname: data.roomname }),
    email_heading_action: i18next.t('email.roomdevoice.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomdevoice.subject', { roomname: data.roomname }),
    userlink: { url: userUrl.url },
    roomlink: { url: roomUrl.url }
  }, callback);
};

emailer.contactForm = function (data, callback) {
  sendEmail(conf.email.from.email, 'emails/contact.html', {
    subject: i18next.t('email.contact.subject'),
    form: data
  }, callback);
};

emailer.roomJoin = function (to, from, room, callback) {
  var data = { name: room };
  var roomUrl = urls(data, 'room', 'https', conf.fqdn);
  sendEmail(to, 'emails/room-join.html', {
    username: from,
    roomname: room,
    title: i18next.t('email.roomjoin.content.title', {
      username: from,
      roomname: room
    }),
    subject: i18next.t('email.roomjoin.subject', {
      username: from,
      roomname: room
    }),
    roomlink: { chat: roomUrl.chat }
  }, callback);
};

emailer.roomJoinRequest = function (to, data, callback) {
  sendEmail(to, 'emails/room-join-request.html', {
    username: data.username,
    roomname: data.roomname,
    title: i18next.t('email.roomjoinrequest.content.title', { roomname: data.roomname, username: data.username }),
    email_heading_action: i18next.t('email.roomjoinrequest.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomjoinrequest.subject', { roomname: data.roomname })
  }, callback);
};

emailer.roomAllow = function (to, data, callback) {
  sendEmail(to, 'emails/room-allow.html', {
    username: data.username,
    roomname: data.roomname,
    title: i18next.t('email.roomallow.content.title', { roomname: data.roomname, username: data.username }),
    email_heading_action: i18next.t('email.roomallow.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomallow.subject', { roomname: data.roomname })
  }, callback);
};

emailer.roomRefuse = function (to, data, callback) {
  sendEmail(to, 'emails/room-refuse.html', {
    username: data.username,
    roomname: data.roomname,
    title: i18next.t('email.roomrefuse.content.title', { roomname: data.roomname, username: data.username }),
    email_heading_action: i18next.t('email.roomrefuse.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomrefuse.subject', { roomname: data.roomname })
  }, callback);
};

emailer.roomInvite = function (to, data, callback) {
  sendEmail(to, 'emails/room-invite.html', {
    username: data.username,
    roomname: data.roomname,
    title: i18next.t('email.roominvite.content.title', { roomname: data.roomname, username: data.username }),
    subject: i18next.t('email.roominvite.subject', { roomname: data.roomname, username: data.username })
  }, callback);
};

emailer.roomTopic = function (to, from, room, topic, callback) {
  sendEmail(to, 'emails/room-topic.html', {
    username: from,
    roomname: room,
    title: i18next.t('email.roomtopic.content.title', {
      topic: topic,
      username: from,
      fqdn: conf.fqdn,
      roomname: room
    }),
    topic: topic,
    subject: i18next.t('email.roomtopic.subject', {
      username: from,
      roomname: room
    })
  }, callback);
};

emailer.userMention = function (to, events, from, room, callback) {
  sendEmail(to, 'emails/user-mention.html', {
    events: events,
    username: from,
    roomname: room,
    title: i18next.t('email.usermention.content.title', {
      username: from,
      roomname: room
    }),
    subject: i18next.t('email.usermention.subject', {
      username: from,
      roomname: room
    })
  }, callback);
};

emailer.userMessage = function (to, username, events, callback) {
  sendEmail(to, 'emails/user-message.html', {
    events: events,
    username: username,
    title: i18next.t('email.usermessage.content.title', { username: username }),
    subject: i18next.t('email.usermessage.subject', { username: username })
  }, callback);
};

emailer.roomMessage = function (to, events, roomName, roomAvatar, callback) {
  sendEmail(to, 'emails/room-message.html', {
    events: events,
    roomname: roomName,
    roomavatar: roomAvatar,
    title: i18next.t('email.roommessage.content.title', { roomname: roomName }),
    subject: i18next.t('email.roommessage.subject', { roomname: roomName })
  }, callback);
};

emailer.groupJoinRequest = function (to, data, callback) {
  sendEmail(to, 'emails/group-join-request.html', {
    username: data.username,
    groupname: data.groupname.replace('#', ''),
    title: i18next.t('email.groupjoinrequest.content.title', { groupname: data.groupname.replace('#', ''), username: data.username }),
    email_heading_action: i18next.t('email.groupjoinrequest.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.groupjoinrequest.subject', { groupname: data.groupname.replace('#', '') })
  }, callback);
};

emailer.groupAllow = function (to, data, callback) {
  sendEmail(to, 'emails/group-allow.html', {
    username: data.username,
    groupname: data.groupname.replace('#', ''),
    title: i18next.t('email.groupallow.content.title', { groupname: data.groupname, username: data.username }),
    email_heading_action: i18next.t('email.groupallow.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.allow.subject', { groupname: data.groupname })
  }, callback);
};

emailer.groupInvite = function (to, data, callback) {
  sendEmail(to, 'emails/group-invite.html', {
    username: data.username,
    groupname: data.groupname.replace('#', ''),
    title: i18next.t('email.groupinvite.content.title', { groupname: data.groupname, username: data.username }),
    email_heading_action: i18next.t('email.groupinvite.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.groupinvite.subject', { groupname: data.groupname, username: data.username })
  }, callback);
};

emailer.groupRefuse = function (to, data, callback) {
  sendEmail(to, 'emails/group-refuse.html', {
    username: data.username,
    groupname: data.groupname.replace('#', ''),
    title: i18next.t('email.grouprefuse.content.title', { groupname: data.groupname, username: data.username }),
    email_heading_action: i18next.t('email.grouprefuse.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.grouprefuse.subject', { groupname: data.groupname, username: data.username })
  }, callback);
};
