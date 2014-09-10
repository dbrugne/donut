var conf = module.exports = {
  less: {
    force: false
  },
  room: {
    general: '#donut',
    default: {
      color: '#fc2063'
    }
  },
  mongo: {
    'url' : ''
  },
  sessions: {
    key: 'donut.sid',
    secret: 'q4qsd65df45s4d5f45ds5fsf4s'
  },
  email: {
    from: {
      name: "DONUT.me",
      email: "hello@donut.me"
    }
  },
  facebook: {
    'clientID' 		: '328600083963864', // your App ID
    'clientSecret' 	: '89a61eab36ab0971e0400f9f3934addb', // your App Secret
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