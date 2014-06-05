var conf = module.exports = {
  title: 'roomly chat!',
  mongo: {
    'url' : ''
  },
  sessions: {
    key: 'c.sid',
    secret: 'q4qsd65df45s4d5f45ds5fsf4s'
  },
  facebook: {
    'clientID' 		: '283401498489213', // your App ID
    'clientSecret' 	: '7211182b85110f06e17efce2b4fb004a', // your App Secret
    'callbackURL' 	: ''
  },
  cloudinary: {
    cloud_name: 'roomly',
    api_key: '962274636195222',
    api_secret: 'ayS9zUnK7sDxkme4sLquIPOmNVU'
  },
  google: {
    analytics: {
      uid: ''
    }
  }
};