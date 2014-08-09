var _ = require('underscore');

var lyrics = [
  // Louis Amstrong (Hello, Dolly)
  "Hello, Dolly",
  "Well, hello, Dolly",
  "It's so nice to have you back",// where you belong",
  "You're lookin' swell, Dolly",
  "I can tell, Dolly",
  "You're still glowin', you're still crowin'",
  "You're still goin' strong",
  "We feel the room swayin'",
  "While the band's playin'",
//  "One of your old favourite songs from way back when",
  "So, take her wrap, fellas",
  "Find her an empty lap, fellas",
  "Dolly'll never go away again",
  "Hello, Dolly",
  "Well, hello, Dolly",
  "It's so nice to have you back",// where you belong",
  "You're lookin' swell, Dolly",
  "I can tell, Dolly",
  "You're still glowin', you're still crowin'",
  "You're still goin' strong",
  "We feel the room swayin'",
  "While the band's playin'",
//  "One of your old favourite songs from way back when",
  "Golly, gee, fellas",
  "Find her a vacant knee, fellas",
  "Dolly'll never go away",
  "Dolly'll never go away",
  "Dolly'll never go away again",
  // Pharell Williams (Happy)
  "It might seem crazy what I'm about to say",
  "Sunshine she's here, you can take a break",
  "I'm a hot air balloon that could go to space",
  "With the air, like I don't care baby by the way",
  "Uh,",
  "Hey,",
  "Go,",
  "Clap along if you feel like a room without a roof",
  "Clap along if you feel like happiness is the truth",
  "Clap along if you know what happiness is to you",
  "Clap along if you feel like that's what you wanna do",
  "Here come bad news talking this and that, yeah,",
  "Well, give me all you got, and don't hold it back, yeah,",
  "Well, I should probably warn you I'll be just fine, yeah,",
  "No offense to you, don't waste your time"
];

module.exports = function() {

  return _.sample(lyrics);

};