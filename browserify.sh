#!/bin/sh

out=web-server/public/web.js
PLUGINS=web-server/public/web/web-plugins.js
START=`date +%s`

grunt jst
grunt i18next

echo '' > $PLUGINS
cat 'web-server/public/vendor/html5-desktop-notifications/desktop-notify.js' >> $PLUGINS
cat 'web-server/public/javascripts/plugins/jquery.insertatcaret.js' >> $PLUGINS
cat 'web-server/public/javascripts/plugins/jquery.maxlength.js' >> $PLUGINS
#cat 'web-server/public/vendor/blueimp-file-upload/js/vendor/jquery.ui.widget.js' >> $PLUGINS
#cat 'web-server/public/vendor/blueimp-file-upload/js/jquery.iframe-transport.js' >> $PLUGINS
#cat 'web-server/public/vendor/blueimp-file-upload/js/jquery.fileupload.js' >> $PLUGINS
#cat 'web-server/public/vendor/cloudinary_js/js/jquery.cloudinary.js' >> $PLUGINS
cat 'web-server/public/javascripts/plugins/jquery.smilify.js' >> $PLUGINS
cat 'web-server/public/javascripts/plugins/jquery.momentify.js' >> $PLUGINS
cat 'web-server/public/javascripts/plugins/jquery.colorify.js' >> $PLUGINS
cat 'web-server/public/javascripts/plugins/jquery.socialify.js' >> $PLUGINS
cat 'web-server/public/javascripts/plugins/jquery.contactform.js' >> $PLUGINS
cat 'web-server/public/vendor/html.sortable/dist/html.sortable.js' >> $PLUGINS

# partially load bootstrap
cat 'node_modules/bootstrap/js/transition.js' >> $PLUGINS
#cat 'node_modules/bootstrap/js/alert.js' >> $PLUGINS;
#cat 'node_modules/bootstrap/js/button.js' >> $PLUGINS);
#cat 'node_modules/bootstrap/js/carousel.js' >> $PLUGINS
#cat 'node_modules/bootstrap/js/collapse.js' >> $PLUGINS
cat 'node_modules/bootstrap/js/dropdown.js' >> $PLUGINS
cat 'node_modules/bootstrap/js/modal.js' >> $PLUGINS
cat 'node_modules/bootstrap/js/tooltip.js' >> $PLUGINS
cat 'node_modules/bootstrap/js/popover.js' >> $PLUGINS
#cat 'node_modules/bootstrap/js/scrollspy.js' >> $PLUGINS
#cat 'node_modules/bootstrap/js/tab.js' >> $PLUGINS
#cat 'node_modules/bootstrap/js/affix.js' >> $PLUGINS

browserify \
 --noparse=jquery \
 --noparse=./web-plugins \
 --noparse='/\.html$/' \
 --transform jstify \
 --transform debowerify \
 --insert-global-vars jQuery,$ \
 --entry web-server/public/web/index.js \
 --outfile $out

END=`date +%s`
diff=$(($END-$START))

FILESIZE=$(stat -f%z "$out")

echo "done in $(($diff % 60)) seconds, $(($FILESIZE/1024)) Kio"
