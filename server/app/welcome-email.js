var nodemailer = require('nodemailer');
var i18next = require('./i18next');

module.exports = function(user) {
  if (!user || !user.local.email) return;

  // asynchronous, non blocking for use case, the email could fail without impact
  process.nextTick(function() {
    var smtpTransport = nodemailer.createTransport('SMTP', {
      ignoreTLS: true // TLS not work on smtp4dev Windows 8
    });
    var mailOptions = {
      to: user.local.email,
      from: 'contact@chatworldcup.com',
      subject: 'Donut account created',
      text: 'You are receiving this because you created an account on Donut. Welcome !\n\n' +
        'If you did not request this, please ignore this email.\n'
    };
    smtpTransport.sendMail(mailOptions, function(err) {
      console.log('Error while sending email to "'+user.local.email+'": '+err);
    });
  });
};
