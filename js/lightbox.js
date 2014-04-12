/*
  Lightbox v2.6
  by Lokesh Dhakar - http://www.lokeshdhakar.com

  For more information, visit:
  http://lokeshdhakar.com/projects/lightbox2/

  Licensed under the Creative Commons Attribution 2.5 License - http://creativecommons.org/licenses/by/2.5/
  - free for use in both personal and commercial projects
  - attribution requires leaving author name, author link, and the license info intact
*/

// jshint quotmark: single

(function(window) {
  'use strict';
  // Use local alias
  var $ = window.jQuery;
  var document = window.document;
  var HammerImageSwipe;

  var LightboxOptions = (function() {
    function LightboxOptions() {
      this.fadeDuration = 80;
      this.fitImagesInViewport = true;
      this.resizeDuration = 80;
      this.showImageNumberLabel = true;
      this.wrapAround = true;
      this.albumMidsizeURLs = window.rd_lightbox_midsize_urls || {};
      this.imageClassSelector = 'lightbox-image';
    }
    
    // Change to localize to non-english language
    LightboxOptions.prototype.albumLabel = function(curImageNum, albumSize) {
      return 'Image ' + curImageNum + ' of ' + albumSize;
    };

    return LightboxOptions;
  })();


  var Lightbox = (function() {
    function Lightbox(options) {
      this.options           = options;
      this.album             = [];
      this.currentImageIndex = void 0;
      this.init();
    }

    Lightbox.prototype.init = function() {
      this.enable();
      this.build();
      this.initHammerImageSwipe();
    };

    // Loop through anchors and areamaps looking for either data-lightbox attributes or rel attributes
    // that contain 'lightbox'. When these are clicked, start lightbox.
    Lightbox.prototype.enable = function() {
      var selector = this.options.imageClassSelector;
      var _this = this;
      return $('body').on('click', 'a[rel^=lightbox], area[rel^=lightbox], a[data-lightbox], area[data-lightbox], a.' + selector, function(e) {
        _this.start($(e.currentTarget));
        return false;
      });
    };

    // Build html for the lightbox and the overlay.
    // Attach event handlers to the new DOM elements. click click click
    Lightbox.prototype.build = function() {
      var _this = this;
      $("<div id='lightboxOverlay'></div><div id='lightboxContainer'><div class='lb-outerContainer'><div class='lb-container'><img class='lb-image' src='' /><div class='lb-nav'><a class='lb-prev' href='#' ></a><a class='lb-next' href='#' ></a></div><div class='lb-loader'><a class='lb-cancel'></a></div></div></div><div class='lb-data'><div class='lb-details'><span class='lb-caption'></span><span class='lb-number'></span></div><a class='lb-close' href='#' title='Close image preview'></a> <a class='lb-zoom' href='#' title='Zoom image'></a></div></div>").appendTo($('body'));
      
      // Cache jQuery objects
      this.$lightbox       = $('#lightboxContainer');
      this.$overlay        = $('#lightboxOverlay');
      this.$outerContainer = this.$lightbox.find('.lb-outerContainer');
      this.$container      = this.$lightbox.find('.lb-container');

      // Store css values for future lookup
      this.containerTopPadding = parseInt(this.$container.css('padding-top'), 10);
      this.containerRightPadding = parseInt(this.$container.css('padding-right'), 10);
      this.containerBottomPadding = parseInt(this.$container.css('padding-bottom'), 10);
      this.containerLeftPadding = parseInt(this.$container.css('padding-left'), 10);

      // Attach event handlers to the newly minted DOM elements
      this.$overlay.hide().on('click', function() {
        if (_this.hammerImageSwipe.dragging) {
          return;
        }
        _this.end();
        return false;
      });

      this.$lightbox.hide().on('click', function(e) {
        if (_this.hammerImageSwipe.dragging) {
          return;
        }
        if ($(e.target).attr('id') === 'lightboxContainer') {
          _this.end();
          return false;
        }
      });

      this.$outerContainer.on('click', function(e) {
        if (_this.hammerImageSwipe.dragging) {
          return;
        }
        if ($(e.target).attr('id') === 'lightboxContainer') {
          _this.end();
          return false;
        }
      });

      this.$lightbox.find('.lb-prev').on('click', function() {
        if (_this.currentImageIndex === 0) {
          _this.changeImage(_this.album.length - 1);
        } else {
          _this.changeImage(_this.currentImageIndex - 1);
        }
        return false;
      });

      this.$lightbox.find('.lb-next').on('click', function() {
        if (_this.currentImageIndex === _this.album.length - 1) {
          _this.changeImage(0);
        } else {
          _this.changeImage(_this.currentImageIndex + 1);
        }
        return false;
      });

      this.$lightbox.find('.lb-loader, .lb-close, .lb-image').on('click', function() {
        if (_this.hammerImageSwipe.dragging) {
          return;
        }
        _this.end();
        return false;
      });
    };

    // Show overlay and lightbox. If the image is part of a set, add siblings to album array.
    Lightbox.prototype.start = function($link) {
      var $window = $(window);
      var _this = this;

      this._sizeOverlay = function() {
        _this.sizeOverlay();
      };

      $window.on('resize', this._sizeOverlay);

      $('select, object, embed').css({
        visibility: 'hidden'
      });

      this.$overlay.fadeIn(this.options.fadeDuration);

      this.album = [];
      var imageNumber = 0;
      function addImages(images, albumLabel) {
        for (var a, i = 0; i < images.length; i++) {
          a = $(images[i]);
          addImage(a, albumLabel);
          if (a.attr('href') === $link.attr('href')) {
            imageNumber = i;
          }
        }
      }

      function addImage($image, albumLabel) {
        var midsize = $image.attr('data-midsize');
        var link = $image.attr('href');
        var title = $image.attr('data-title') || $image.attr('title');

        if (!midsize && $image.hasClass('midsize')) {
          var from = /\/originals?\//g, to = '/midsize/';
          if (albumLabel && albumLabel in _this.options.albumMidsizeURLs) {
            from = _this.options.albumMidsizeURLs[albumLabel][0];
            to = _this.options.albumMidsizeURLs[albumLabel][1];
          }
          midsize = link.replace(from, to);
        }

        if (!title) {
          var img = $image.find('img');
          title = img.attr('title') || img.attr('alt');
        }

        if (!title) {
          title = link.substr(link.lastIndexOf('/') + 1);
        }

        _this.album.push({
          link: link,
          title: title,
          midsize: midsize,
        });
      }

      // Support both data-lightbox attribute and rel attribute implementations
      var dataLightboxValue = $link.attr('data-lightbox');
      var ref;
      if (dataLightboxValue) {
        ref = $($link.prop('tagName') + '[data-lightbox="' + dataLightboxValue + '"]');
        addImages(ref, dataLightboxValue);
      } else {
        var selector = this.options.imageClassSelector;
        if ($link.hasClass(selector)) {
          var albumLabel = null, classList = $link.attr('class').split(/\s+/g);
          for (var i = 0; i < classList.length; i++) {
            var className = classList[i];
            if (className && className != selector && className != 'midsize') {
              albumLabel = className;
              break;
            }
          }

          if (albumLabel) {
            ref = $($link.prop('tagName') + '.' + selector + '.' + albumLabel);
            addImages(ref, albumLabel);
          } else {
            addImage($link);
          }
        } else if ($link.attr('rel') === 'lightbox') {
          // If image is not part of a set
          addImage($link);
        } else {
          // If image is part of a set
          ref = $($link.prop('tagName') + '[rel="' + $link.attr('rel') + '"]');
          addImages(ref);
        }
      }

      this.$lightbox.fadeIn(this.options.fadeDuration);
      this.changeImage(imageNumber);
    };

    Lightbox.prototype.initHammerImageSwipe = function() {
      if (this.hammerImageSwipe) {
        this.hammerImageSwipe.destroy();
      }

      var _self = this;
      this.hammerImageSwipe = new HammerImageSwipe({
        element: this.$outerContainer[0],
        overrideTouchCallout: false,

        performAction: function(direction) {
          var index;

          switch (direction) {
            case 'left':
              if (_self.currentImageIndex !== _self.album.length - 1) {
                index = _self.currentImageIndex + 1;
              } else {
                index = 0;
              }
              break;
            case 'right':
              if (_self.currentImageIndex !== 0) {
                index = _self.currentImageIndex - 1;
              } else {
                index = _self.album.length - 1;
              }
              break;
            default:
              return;
          }

          _self.changeImage(index);
        },
      }).enable();
    };

    // Hide most UI elements in preparation for the animated resizing of the lightbox.
    Lightbox.prototype.changeImage = function(imageNumber) {
      var _this = this;
      this.disableKeyboardNav();
      var $image = this.$lightbox.find('.lb-image');

      this.$overlay.fadeIn(this.options.fadeDuration);

      $('.lb-loader').fadeIn(this.options.fadeDuration);

      this.$lightbox.find('.lb-image, .lb-nav, .lb-prev, .lb-next, .lb-data, .lb-numbers, .lb-caption').hide();

      this.$outerContainer.addClass('animating');

      var imgInfo = this.album[imageNumber];
      var zoom = this.$lightbox.find('.lb-zoom');
      zoom.attr('href', imgInfo.link);

      var nextImgN = this.album.length - 1 == imageNumber ? 0 : imageNumber + 1;
      var nextImgInfo = this.album[nextImgN];
      var nextElem = this.$lightbox.find('.lb-next');
      nextElem.attr('href', nextImgInfo.link);
      nextElem.attr('title', nextImgInfo.title || '');

      var prevImgN = imageNumber === 0 ? this.album.length - 1 : imageNumber - 1;
      var prevImgInfo = this.album[prevImgN];
      var prevElem = this.$lightbox.find('.lb-prev');
      prevElem.attr('href', prevImgInfo.link);
      prevElem.attr('title', prevImgInfo.title || '');

      // When image to show is preloaded, we send the width and height to sizeContainer()
      var preloader = new Image();
      var src = imgInfo.midsize || imgInfo.link;
      preloader.onload = function() {
        $image.attr('src', src);

        if (!('width' in imgInfo)) {
          imgInfo.width = preloader.width;
          imgInfo.height = preloader.height;
        }

        _this.sizeOverlay(true);
      };

      preloader.onerror = function() {
        window.location = src;
      };

      preloader.src = src;
      this.currentImageIndex = imageNumber;
    };

    // Stretch overlay to fit the document
    Lightbox.prototype.sizeOverlay = function(shouldAnimate) {
      var windowWidth = $(window).width();
      var windowHeight = $(window).height();
      var dataHeight = this.$lightbox.find('.lb-data').outerHeight(true);
      var maxImageWidth = windowWidth - this.containerLeftPadding -
                          this.containerRightPadding - 20;
      var maxImageHeight = windowHeight - this.containerTopPadding -
                           this.containerBottomPadding - dataHeight;

      var imgInfo = this.album[this.currentImageIndex];
      var imageWidth = imgInfo.width, imageHeight = imgInfo.height;
      if ((imgInfo.width > maxImageWidth) || (imgInfo.height > maxImageHeight)) {
        if ((imgInfo.width / maxImageWidth) > (imgInfo.height / maxImageHeight)) {
          imageWidth = maxImageWidth;
          imageHeight = parseInt(imgInfo.height / (imgInfo.width / imageWidth), 10);
        } else {
          imageHeight = maxImageHeight;
          imageWidth = parseInt(imgInfo.width / (imgInfo.height / imageHeight), 10);
        }
      }

      var $image = this.$lightbox.find('.lb-image');
      $image.width(imageWidth);
      $image.height(imageHeight);

      var _this = this;

      var newWidth  = imageWidth + this.containerLeftPadding + this.containerRightPadding;
      var newHeight = imageHeight + this.containerTopPadding + this.containerBottomPadding;

      var top = Math.round(maxImageHeight / 2 - imageHeight / 2);

      if (shouldAnimate === true) {
        this.$outerContainer.animate({
          width: newWidth + 'px',
          height: newHeight + 'px',
          top: top + 'px',
        }, {
          duration: this.options.resizeDuration,
          always: function() {
            _this.showImage();
          },
        });
      } else {
        this.$outerContainer.css({
          width: newWidth + 'px',
          height: newHeight + 'px',
          top: top + 'px',
        });
      }
    };

    // Display the image and it's details and begin preload neighboring images.
    Lightbox.prototype.showImage = function() {
      this.$lightbox.find('.lb-loader').hide();
      this.$lightbox.find('.lb-image').fadeIn(this.options.fadeDuration);
      this.updateNav();
      this.updateDetails();
      this.preloadNeighboringImages();
      this.enableKeyboardNav();
    };

    // Display previous and next navigation if appropriate.
    Lightbox.prototype.updateNav = function() {
      this.$lightbox.find('.lb-nav').show();
      if (this.album.length > 1) {
        if (this.options.wrapAround) {
          this.$lightbox.find('.lb-prev, .lb-next').show();
        } else {
          if (this.currentImageIndex > 0) {
            this.$lightbox.find('.lb-prev').show();
          }
          if (this.currentImageIndex < this.album.length - 1) {
            this.$lightbox.find('.lb-next').show();
          }
        }
      }
    };

    // Display caption, image number, and closing button.
    Lightbox.prototype.updateDetails = function() {
      var _this = this;
      if (typeof this.album[this.currentImageIndex].title !== 'undefined' && this.album[this.currentImageIndex].title !== '') {
        this.$lightbox.find('.lb-caption').html(this.album[this.currentImageIndex].title).fadeIn(this.options.fadeDuration);
      }
      if (this.album.length > 1 && this.options.showImageNumberLabel) {
        this.$lightbox.find('.lb-number').text(this.options.albumLabel(this.currentImageIndex + 1, this.album.length)).fadeIn(this.options.fadeDuration);
      } else {
        this.$lightbox.find('.lb-number').hide();
      }
      this.$outerContainer.removeClass('animating');
      this.$lightbox.find('.lb-data').fadeIn(this.resizeDuration);
    };

    // Preload previous and next images in set.
    Lightbox.prototype.preloadNeighboringImages = function() {
      var preloadNext, preloadPrev;
      if (this.album.length > this.currentImageIndex + 1) {
        preloadNext = new Image();
        preloadNext.src = this.album[this.currentImageIndex + 1].link;
      }
      if (this.currentImageIndex > 0) {
        preloadPrev = new Image();
        preloadPrev.src = this.album[this.currentImageIndex - 1].link;
      }
    };

    Lightbox.prototype.enableKeyboardNav = function() {
      $(document).on('keyup.keyboard', $.proxy(this.keyboardAction, this));
    };

    Lightbox.prototype.disableKeyboardNav = function() {
      $(document).off('.keyboard');
    };

    Lightbox.prototype.keyboardAction = function(event) {
      var KEYCODE_ESC        = 27;
      var KEYCODE_LEFTARROW  = 37;
      var KEYCODE_RIGHTARROW = 39;

      var keycode = event.keyCode;
      var key     = String.fromCharCode(keycode).toLowerCase();

      if (keycode === KEYCODE_ESC || key.match(/x|o|c/)) {
        this.end();
      } else if (key === 'p' || keycode === KEYCODE_LEFTARROW) {
        if (this.currentImageIndex !== 0) {
          this.changeImage(this.currentImageIndex - 1);
        } else if (this.options.wrapAround && this.album.length > 1) {
          this.changeImage(this.album.length - 1);
        }
      } else if (key === 'n' || keycode === KEYCODE_RIGHTARROW) {
        if (this.currentImageIndex !== this.album.length - 1) {
          this.changeImage(this.currentImageIndex + 1);
        } else if (this.options.wrapAround && this.album.length > 1) {
          this.changeImage(0);
        }
      }
    };

    // Closing time. :-(
    Lightbox.prototype.end = function() {
      this.disableKeyboardNav();
      $(window).off('resize', this._sizeOverlay);
      this._sizeOverlay = null;
      this.$lightbox.fadeOut(this.options.fadeDuration);
      this.$overlay.fadeOut(this.options.fadeDuration);
      return $('select, object, embed').css({
        visibility: 'visible'
      });
    };

    return Lightbox;

  })();

  $(function() {
    HammerImageSwipe = window.HammerImageSwipe;
    var options = new LightboxOptions();
    return new Lightbox(options);
  });
})(window);
