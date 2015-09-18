'use strict';
var logger = require('../util/logger').getLogger('emailer', __filename);
var _ = require('underscore');
var nodemailer = require('nodemailer');
var underscoreTemplate = require('../util/underscoreTemplate');
var i18next = require('../util/i18next');
var conf = require('../../config/index');
var mailgunTransport = require('nodemailer-mailgun-transport');

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
  sendEmail(to, 'emails/room-op.html', {
    username: data.username,
    roomname: data.roomname.replace('#', ''),
    title: i18next.t('email.roomop.content.title', { roomname: data.roomname.replace('#', '') }),
    email_heading_action: i18next.t('email.roomop.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomop.subject', { roomname: data.roomname.replace('#', '') })
  }, callback);
};

emailer.roomDeop = function (to, data, callback) {
  sendEmail(to, 'emails/room-deop.html', {
    username: data.username,
    roomname: data.roomname.replace('#', ''),
    title: i18next.t('email.roomdeop.content.title', { roomname: data.roomname.replace('#', '') }),
    email_heading_action: i18next.t('email.roomdeop.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomdeop.subject', { roomname: data.roomname.replace('#', '') })
  }, callback);
};

emailer.roomKick = function (to, data, callback) {
  sendEmail(to, 'emails/room-kick.html', {
    username: data.username,
    roomname: data.roomname.replace('#', ''),
    reason: data.reason,
    title: i18next.t('email.roomkick.content.title', { roomname: data.roomname.replace('#', '') }),
    subject: i18next.t('email.roomkick.subject', { roomname: data.roomname.replace('#', '') })
  }, callback);
};

emailer.roomBan = function (to, data, callback) {
  sendEmail(to, 'emails/room-ban.html', {
    username: data.username,
    roomname: data.roomname.replace('#', ''),
    reason: data.reason,
    title: i18next.t('email.roomban.content.title', { roomname: data.roomname.replace('#', '') }),
    subject: i18next.t('email.roomban.subject', { roomname: data.roomname.replace('#', '') })
  }, callback);
};

emailer.roomDeban = function (to, data, callback) {
  sendEmail(to, 'emails/room-deban.html', {
    username: data.username,
    roomname: data.roomname.replace('#', ''),
    reason: data.reason,
    title: i18next.t('email.roomdeban.content.title', { roomname: data.roomname.replace('#', '') }),
    email_heading_action: i18next.t('email.roomdeban.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomdeban.subject', { roomname: data.roomname.replace('#', '') })
  }, callback);
};

emailer.roomVoice = function (to, data, callback) {
  sendEmail(to, 'emails/room-voice.html', {
    username: data.username,
    roomname: data.roomname.replace('#', ''),
    title: i18next.t('email.roomvoice.content.title', { roomname: data.roomname.replace('#', '') }),
    email_heading_action: i18next.t('email.roomvoice.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomvoice.subject', { roomname: data.roomname.replace('#', '') })
  }, callback);
};

emailer.roomDevoice = function (to, data, callback) {
  sendEmail(to, 'emails/room-devoice.html', {
    username: data.username,
    roomname: data.roomname.replace('#', ''),
    reason: data.reason,
    title: i18next.t('email.roomdevoice.content.title', { roomname: data.roomname.replace('#', '') }),
    email_heading_action: i18next.t('email.roomdevoice.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomdevoice.subject', { roomname: data.roomname.replace('#', '') })
  }, callback);
};

emailer.contactForm = function (data, callback) {
  sendEmail(conf.email.from.email, 'emails/contact.html', {
    subject: i18next.t('email.contact.subject'),
    form: data
  }, callback);
};

emailer.roomJoin = function (to, from, room, callback) {
  sendEmail(to, 'emails/room-join.html', {
    username: from,
    roomname: room.replace('#', ''),
    title: i18next.t('email.roomjoin.content.title', {
      username: from,
      roomname: room.replace('#', '')
    }),
    subject: i18next.t('email.roomjoin.subject', {
      username: from,
      roomname: room.replace('#', '')
    })
  }, callback);
};

emailer.roomJoinRequest = function (to, data, callback) {
  sendEmail(to, 'emails/room-join-request.html', {
    username: data.username,
    roomname: data.roomname.replace('#', ''),
    title: i18next.t('email.roomjoinrequest.content.title', { roomname: data.roomname.replace('#', ''), username: data.username }),
    email_heading_action: i18next.t('email.roomjoinrequest.content.action', {
      fqdn: conf.fqdn,
      username: data.username
    }),
    subject: i18next.t('email.roomjoinrequest.subject', { roomname: data.roomname.replace('#', '') })
  }, callback);
};

emailer.roomTopic = function (to, from, room, topic, callback) {
  sendEmail(to, 'emails/room-topic.html', {
    username: from,
    roomname: room.replace('#', ''),
    title: i18next.t('email.roomtopic.content.title', {
      topic: topic,
      username: from,
      fqdn: conf.fqdn,
      roomname: room.replace('#', '')
    }),
    topic: topic,
    subject: i18next.t('email.roomtopic.subject', {
      username: from,
      roomname: room.replace('#', '')
    })
  }, callback);
};

emailer.userMention = function (to, events, from, room, callback) {
  sendEmail(to, 'emails/user-mention.html', {
    events: events,
    username: from,
    roomname: room.replace('#', ''),
    title: i18next.t('email.usermention.content.title', {
      username: from,
      roomname: room.replace('#', '')
    }),
    subject: i18next.t('email.usermention.subject', {
      username: from,
      roomname: room.replace('#', '')
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
    roomname: roomName.replace('#', ''),
    roomavatar: roomAvatar,
    title: i18next.t('email.roommessage.content.title', { roomname: roomName.replace('#', '') }),
    subject: i18next.t('email.roommessage.subject', { roomname: roomName.replace('#', '') })
  }, callback);
};
