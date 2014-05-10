var cloudinary = require('cloudinary');

// @todo : move config in configuration file
cloudinary.config({
  cloud_name: 'roomly',
  api_key: '962274636195222',
  api_secret: 'ayS9zUnK7sDxkme4sLquIPOmNVU'
});

module.exports = {

  cloudinary: cloudinary,

  uploadTag: function(req, name) {
    var cloudinary_cors = "http://" + req.headers.host + "/javascripts/vendor/cloudinary_js/html/cloudinary_cors.html";
    return cloudinary.uploader.image_upload_tag(name, {
      callback: cloudinary_cors,
      tags: "user-avatar",
      crop: "limit", width: 1000, height: 1000,
      eager: { crop: "fill", width: 150, height: 100 },
      html: { style: "" }
    });
  }

};