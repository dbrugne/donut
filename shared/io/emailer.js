var debug = require('debug')('donut:emailer');
var nodemailer = require('nodemailer');
var i18next = require('../util/i18next');
var conf = require('../config/index');
var mailgunTransport = require('nodemailer-mailgun-transport');

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

emailer.welcome = function(to, callback) {
    send({
      to: to,
      subject: i18next.t("email.welcome.subject"),
      text: i18next.t("email.welcome.text", {fqdn: conf.fqdn, email: conf.email.from.email}),
      html: i18next.t("email.welcome.html", {fqdn: conf.fqdn, email: conf.email.from.email}),
    },callback);
  };

emailer.forgot = function(to, token, callback) {
  send({
    to: to,
    subject: i18next.t("email.forgot.subject"),
    text: i18next.t("email.forgot.text", {fqdn: conf.fqdn, email: conf.email.from.email, token: token}),
    html: i18next.t("email.forgot.html", {fqdn: conf.fqdn, email: conf.email.from.email, token: token})
  },callback);
};

emailer.passwordChanged = function(to, callback) {
  send({
    to: to,
    subject: i18next.t("email.passwordchanged.subject"),
    text: i18next.t("email.passwordchanged.text", {fqdn: conf.fqdn, email: conf.email.from.email}),
    html: i18next.t("email.passwordchanged.html", {fqdn: conf.fqdn, email: conf.email.from.email})
  },callback);
};

emailer.emailChanged = function(to, callback) {
  send({
    to: to,
    subject: i18next.t("email.emailchanged.subject"),
    text: i18next.t("email.emailchanged.text", {fqdn: conf.fqdn, email: conf.email.from.email}),
    html: i18next.t("email.emailchanged.html", {fqdn: conf.fqdn, email: conf.email.from.email})
  },callback);
};


