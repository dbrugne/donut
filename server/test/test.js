casper.echo('an error message', 'ERROR');
var x = require('casper').selectXPath
casper.on('capture.saved', function(targetFile) {
  this.echo('screen properly done at ' + targetFile);
});
casper.test.on('fail', function() {
  casper.capture('screenshots/fail.png');
});
casper.test.begin('Testing Homepage',  2, function(test) {
  // Open web login page
  casper.start('http://localhost:3000/');

  // Now page is opened,
  casper.then(function() {
    test.assertTitle('donut.me', 'Check title');
    test.assertExists('#login .input[type=submit]', 'login form is available');
  });

  // valid submition
  casper.then(function() {
    this.fillSelectors('#login', {
      'input[name="login"]': 'damien@yangs.net',
      'input[name="password"]': 'password'
    }, true); // true : will submit form

    this.then(function(){
      test.assertEquals('http://localhost:3000/!', this.getCurrentUrl(), 'login successfully redirect to chat home');
      test.assertExists('#home', 'Home content is present');
//      test.assertEquals(this.getHTML('.user_top_header .left label.bold'), 'Yann LASTAPIS', 'Username is correct');
    });
  });

  casper.run();
});
