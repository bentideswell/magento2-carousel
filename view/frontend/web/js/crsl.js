//
//
//
define([
    
], function() {
    //
    var Crsl = (function() {
        function extend(c,p){for(k in p)if(p.hasOwnProperty(k))c[k]=p[k];return c;}
        function debounce(f,i){var x=null;return function(){var c=this,a=arguments;clearTimeout(x);x=setTimeout(function(){f.apply(c,a);},i);};};
        function createE(t,c,s){var e=document.createElement(t);e.classList.add(c),typeof s==='object'?(s.parentNode.insertBefore(e,s),e.append(s)):!0;return e;};

        // Setup community resize event
        // This optimises multiple carousels on one page as we don't have to debounce window resize for each one
        // Only fires if window width changes
        (function() {
            var resizeEventObject = new Event('fishpig:crsl:resize');
            var windowWidth = window.innerWidth;
            window.addEventListener('resize', debounce(function() {
                if (windowWidth !== window.innerWidth) {
                    windowWidth = window.innerWidth;
                    window.dispatchEvent(resizeEventObject);
                }
            }, 250));
        })();
            
        function Crsl(config, slideParent) {
            if (this.init(config, slideParent)) {
                this.buildElements(slideParent);
                this.rebuildBasedOnView();
                window.addEventListener('fishpig:crsl:resize', this.rebuildBasedOnView.bind(this));
            }
        }

        // Build configs and find slides
        Crsl.prototype.init = function(config, slideParent) {
            this.config = {
                defaults: {
                    slidesToShow: 4,
                    slidesToScroll: 1,
                    resizeInterval: 250,
                    slideClassName: 'slide',
                    injectControls: true,
                    innerClassName: 'crsl-inner',
                    trackClassName: 'crsl-track',
                    containerClassName: 'crsl-cont',
                    ctrlClassName: 'crsl-ctrl',
                    slideParentClassName: 'crsl',
                    scrollType: 'position' // || scrollLeft
                },
                instance: config,
                responsive: typeof config.responsive !== 'undefined' ? config.responsive : [],
                applied: {}
            };

            delete this.config.instance.responsive;
            
            this.config.applied = extend(extend({}, this.config.defaults), this.config.instance);

            this.slides = [];

            [].forEach.call(slideParent.childNodes, function(n) {
                if (n.nodeType === Node.ELEMENT_NODE) {
                    this.slides.push(n);
                    n.classList.add(this.config.applied.slideClassName);
                }
            }.bind(this));
            
            return this.slides.length > 1;
        };

        // Build structural elements and add controls
        Crsl.prototype.buildElements = function(slideParent) {
            this.elements = {
                slideParent: slideParent
            };

            if (this.config.applied.scrollType === 'position') {
                this.elements.wrapper = createE('div',this.config.applied.containerClassName, this.elements.slideParent);
                this.elements.wrapper.style.overflow = 'hidden';
            } else {
                this.elements.track = createE('div',this.config.applied.trackClassName, this.elements.slideParent);
                this.elements.wrapper = createE('div',this.config.applied.containerClassName, this.elements.track);
            }
            
            this.elements.slideParent.classList.add(this.config.applied.slideParentClassName);
            this.elements.slideParent.style.display='block';

            // Controls
            if (this.config.applied.injectControls) {
                ['previous', 'next'].forEach(function(controlAction) {
                    var control = createE('a', this.config.applied.ctrlClassName),
                        controlI = document.createElement('span');
                    control.setAttribute('data-action', controlAction);
                    control.appendChild(controlI);
                    this.elements.wrapper.appendChild(control);
                }.bind(this));
            }
            
            this.elements.controls = this.elements.wrapper.querySelectorAll('.' + this.config.applied.ctrlClassName);
            
            // Apply control click events
            for (var i = 0; i < this.elements.controls.length; i++) {
                this.elements.controls[i].addEventListener('click', this.onControlClickEvent.bind(this));
            }
        };

        // Event for clicking control
        Crsl.prototype.onControlClickEvent = function() {
            var elem = event.target.tagName === 'SPAN' ? event.target.parentNode : event.target;
            var action = elem.getAttribute('data-action');
            var targetIndex = null;

            if (action === 'next') {
                for (var i = 0; i <= this.slides.length; i++) {
                    if ((this.slides[i].getBoundingClientRect().left - this.data.wrapperRect.left) > 0) {
                        targetIndex = i + (this.config.applied.slidesToScroll-1);
                        break;
                    }
                }
            } else if (action === 'previous') {
                for (var i = this.slides.length - 1; i >= 0; i--) {   
                    if ((this.slides[i].getBoundingClientRect().left - this.data.wrapperRect.left) < 0) {
                        targetIndex = i - (this.config.applied.slidesToScroll-1);
                        break;
                    }
                }
            }
            
            if (targetIndex !== null) {
                this.goTo(targetIndex);
            }
        };
        
        // GoTo slide. Includes boundary checks
        Crsl.prototype.goTo = function(index) {
            if (this.data.canSlide && index !== null) {
                index = Math.max(0, Math.min(Number.parseInt(index), this.data.maxIndex));
                var x = this.slides[index].getBoundingClientRect().left - this.data.wrapperRect.left;
                
                if (this.config.applied.scrollType === 'position') {
                    if (this.elements.slideParent.style.left) {
                        x += parseInt(this.elements.slideParent.style.left) * -1;
                    }

                    this.elements.slideParent.style.transition = 'left .25s ease-in-out';
                    this.elements.slideParent.style.position='relative';
                    this.elements.slideParent.style.left = (x*-1)+'px';
                } else {
                    
                    x += this.elements.track.scrollLeft;
                    this.elements.track.scroll({
                        left: x,
                        behavior: 'smooth'
                    });
                }
            }
        };

        // Resets and rebuild
        Crsl.prototype.rebuildBasedOnView = function() {
            // Regenerate config from defauts and user config
            this.config.applied = extend(extend({}, this.config.defaults), this.config.instance);
            
            // Apply breakpoint config
            for (var i in this.config.responsive) {
                if (document.body.clientWidth < this.config.responsive[i].breakpoint) {
                    this.config.applied = extend(this.config.applied, this.config.responsive[i].config);
                    break;
                }
            }

            // Reset scroller
            if (this.config.applied.scrollType === 'position') {
                this.elements.slideParent.style.left = '0';   
            } else {
                this.elements.track.scroll({left: 0});
            }

            // Reset data
            this.data = this.data || {};
            this.data.wrapperRect  = this.elements.wrapper.getBoundingClientRect();
            this.data.itemWidth = Math.round((
                this.elements.wrapper.clientWidth 
                - (
                    parseInt(window.getComputedStyle(this.slides[0]).marginRight) * (this.config.applied.slidesToShow - 1)
                )
            ) / this.config.applied.slidesToShow);
            this.data.canSlide = this.slides.length > this.config.applied.slidesToShow;
            this.data.maxIndex = this.data.canSlide ? this.slides.length - this.config.applied.slidesToShow : 0;

            var totalWidth = this.data.itemWidth * this.slides.length;

            for (var i in this.slides) {
                this.slides[i].style.width=this.data.itemWidth+'px';
                var s = window.getComputedStyle(this.slides[i]);
                totalWidth += parseInt(s.marginLeft) + parseInt(s.marginRight);
            }

            this.elements.slideParent.style.width=totalWidth+'px';
        };

        return Crsl;
    })();

    return function(config, element) {
        return new Crsl(config, element);
    }
});
