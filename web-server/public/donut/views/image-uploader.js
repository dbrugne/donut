define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  '_templates'
], function ($, _, Backbone, donutDebug, templates) {

  var debug = donutDebug('donut:image-uploader');

  var ImageUploaderView = Backbone.View.extend({

    template: templates['image-uploader.html'],

    data: {}, // will be filled here and read in form view

    events: {
      'click .change': 'onChange',
      'click .cancel': 'onCancel',
      'click .remove': 'onRemove'
    },

    initialize: function(options) {
      delete options.el; // already saved by Backbone.View, now should be removed from cloudinary options
      this.options = _.extend({
        success: _.noop,
        current: '',
        field_name: 'image',
        tags: '',
        upload_preset: 'uxfd2ikf',
        sources: ['local'], // ['local', 'url', 'camera']
        multiple: false,
        cropping: 'server',
        client_allowed_formats: ["png","gif", "jpeg"],
        max_file_size: 20000000 // 20Mo
      }, options);

      // current == v1401656005/avatar-537b98832244d66015d7692f.jpg

      this.render();
    },
    render: function() {
      var options = _.extend({ }, this.options);

      options.imgTag = '';
      if (options.current)
        options.imgTag = this._getImageTag(options.current);
      if (this.data.public_id)
        options.imgTag = this._getImageTag(this.data.public_id, this.data.version);
      var html = this.template(options);
      this.$el.html(html);

      this.options.error = ''; // display error only once
      return this;
    },
    onCancel: function(event) {
      event.preventDefault();
      this.render();
    },
    onRemove: function(event) {
      this.options.current = '';
      this.data = {remove: true};
      this.render();
    },
    onChange: function(event) {
      event.preventDefault();
      var that = this;
      // @doc: http://cloudinary.com/documentation/upload_widget#setup
      cloudinary.openUploadWidget(this.options, function(err, result) {
          if (err) {
            if (err.message && err.message == 'User closed widget')
              return;

            debug('cloudinary error: ', err);
            that.options.error = err.message;
            return that.render();
          }
          if (!result || !result[0])
            return debug('cloudinary result is empty!!');

          that.data = {
            public_id: result[0].public_id,
            version: result[0].version,
            path: result[0].path
          };

          that.options.success(that.data);
          that.render();
        }
      );
    },
    /**
     * Return image tag (30*30) for the given imageId[, version]
     *
     * @param imageId cloudinary ID or donut image token
     * @param version cloudinary version (optional)
     * @returns string
     */
    _getImageTag: function(imageId, version){
      var identifier = (version)
        ? {id: imageId, version: version}
        : imageId;
      var url = $.cd.noDefault(identifier, 30, 30);
      if (!url)
        return '';
      return "<img src='"+url+"' alt='current image thumbnail'>";
    }

  });

  return ImageUploaderView;
});