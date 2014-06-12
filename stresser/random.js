var _ = require('underscore');

module.exports = {
  chars: '0123456789abcdefghiklmnopqrstuvwxyz', // ABCDEFGHIJKLMNOPQRSTUVWXYZ
  number: function(length) {
    length = length ? length : 7;

    var number = Math.floor((Math.random() * Math.pow(10,length)) + 1);
    return number;
  },
  string: function(length) {
    length = length ? length : 32;

    var string = '';
    for (var i = 0; i < length; i++) {
      var randomNumber = Math.floor(Math.random() * this.chars.length);
      string += this.chars.substring(randomNumber, randomNumber + 1);
    }

    return string;
  },
  email: function() {
    return this.string(10)+'@'+this.string(15)+'.'+this.string(3);
  },
  probability: function(percentage) {
    var r = Math.random(); // returns [0,1]
    return (r < (percentage / 100.0))
      ? true
      : false;
  }
};