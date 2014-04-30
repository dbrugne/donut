module.exports = {
    title: '...',
    mongo: {
        'url' : 'mongodb://localhost:27017/chat'
    },
    sessions: {
      key: 'express.sid',
      secret: 'q4qsd65df45s4d5f45ds5fsf4s'
    },
    facebook: {
        'clientID' 		: '283401498489213', // your App ID
        'clientSecret' 	: '7211182b85110f06e17efce2b4fb004a', // your App Secret
        'callbackURL' 	: 'http://chat.local/login/facebook/callback'
    },
    pictures: {
      format: ".jpg",
      user: {
        avatar: {
          small: "20x20",
          medium: "50x50",
          large: "150x150"
        },
        background: {
          medium: "100x100",
          large: "1024x500"
        }
      },
      room: {
        avatar: {
          small: "20x20",
          medium: "50x50",
          large: "150x150"
        },
        background: {
          medium: "100x100",
          large: "1024x500"
        }
      }
    }
};