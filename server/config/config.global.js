var conf = module.exports = {
  title: 'donut.me | old flavour chat rooms',
  less: {
    force: false
  },
  room: {
    default: {
      avatar: 'room-default.png',
      poster: 'poster-default.png',
      color: '#cdcccc'
    }
  },
  mongo: {
    'url' : ''
  },
  sessions: {
    key: 'c.sid',
    secret: 'q4qsd65df45s4d5f45ds5fsf4s'
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