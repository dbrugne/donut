var cloudinary = require('cloudinary');
var configuration = require('../config/app_dev');

cloudinary.config(configuration.cloudinary);

module.exports = cloudinary;
