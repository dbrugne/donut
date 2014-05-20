var cloudinary = require('cloudinary');
var conf = require('../config/index');

cloudinary.config(conf.cloudinary);
module.exports = cloudinary;
