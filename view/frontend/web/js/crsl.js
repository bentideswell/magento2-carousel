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
                
                if (this.config.applied.autoplaySpeed) {
                    setInterval(this.goToNext.bind(this), this.config.applied.autoplaySpeed);
                }
                
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
                    slideGap: 10,
                    injectControls: true,
                    innerClassName: 'crsl-inner',
                    trackClassName: 'crsl-track',
                    containerClassName: 'crsl-cont',
                    ctrlClassName: 'crsl-ctrl',
                    slideParentClassName: 'crsl',
                    wrapperClassNames: [],
                    scrollType: 'position', // || scrollLeft
                    slideSpeed: '.25s', // Only works if scrollType === position
                    infinite: false,
                    autoplaySpeed: null
                },
                instance: config,
                responsive: typeof config.responsive !== 'undefined' ? config.responsive : [],
                applied: {}
            };

            delete this.config.instance.responsive;
            
            this.config.applied = extend(extend({}, this.config.defaults), this.config.instance);

            this.slides = [];

            var slideContents = [];
            [].forEach.call(slideParent.childNodes, function(n) {
                if (n.nodeType === Node.ELEMENT_NODE) {
                    slideContents.push(n);
                }
            }.bind(this));
            
            [].forEach.call(slideContents, function(n) {
                if (true) {
                    var slide = document.createElement('div');
                        slide.classList.add(this.config.applied.slideClassName);                
                    n.parentNode.insertBefore(slide, n);
                    slide.appendChild(n);
                    this.slides.push(slide);
                } else {
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
                this.elements.track.style.overflowY='scroll';
            }

            if (this.config.applied.wrapperClassNames.length > 0) {
                for (var c in this.config.applied.wrapperClassNames) {
                    this.elements.wrapper.classList.add(this.config.applied.wrapperClassNames[c]);
                }
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
            var action = (event.target.tagName === 'SPAN' ? event.target.parentNode : event.target).getAttribute('data-action');
            if (action === 'next') {
                return this.goToNext();
            } else if (action === 'previous') {
                return this.goToPrevious();
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

                    this.elements.slideParent.style.transition = 'left ' + this.config.applied.slideSpeed + ' ease-in-out';
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

        // Go to the next slide.
        // If infinite and at the end, go back to start
        Crsl.prototype.goToNext = function() {
            for (var i = 0; i < this.slides.length; i++) {
                if ((this.slides[i].getBoundingClientRect().left - this.data.wrapperRect.left) > 0) {
                    return this.goTo(i + (this.config.applied.slidesToScroll-1));
                }
            }

            if (this.config.applied.infinite === true) {
                return this.goToStart();
            }
        };
        
        // Go to the previous slide
        // If already on first slide, do nothing
        Crsl.prototype.goToPrevious = function() {
            for (var i = this.slides.length - 1; i >= 0; i--) {   
                if ((this.slides[i].getBoundingClientRect().left - this.data.wrapperRect.left) < 0) {
                    return this.goTo(i - (this.config.applied.slidesToScroll-1));
                }
            }
        };

        // Go to the start, directly, do not pass go.
        Crsl.prototype.goToStart = function() {
            // Reset scroller
            if (this.config.applied.scrollType === 'position') {
                this.elements.slideParent.style.left = '0';   
            } else {
                this.elements.track.scroll({left: 0});
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
            if (this.config.applied.scrollType !== 'position') {
                // No infinity if manual scrolling allowed
                this.config.applied.infinite = false;
            }
                
            this.goToStart();

            // Reset data
            this.data = this.data || {};
            this.data.wrapperRect  = this.elements.wrapper.getBoundingClientRect();
            
            /*
            this.data.itemWidth = Math.round((
                this.elements.wrapper.clientWidth 
                - (
                    parseInt(window.getComputedStyle(this.slides[0]).marginRight) * (this.config.applied.slidesToShow - 1)
                )
            ) / this.config.applied.slidesToShow);*/
            
            if (this.config.applied.slidesToShow > 1) {
                this.data.itemWidth = Math.round(((this.elements.wrapper.clientWidth 
                                      - (
                                            this.config.applied.slideGap * (this.config.applied.slidesToShow - 1)
                                        )) / this.config.applied.slidesToShow) * 100) / 100;
            } else {
                this.data.itemWidth = this.elements.wrapper.clientWidth;
                this.config.applied.slideGap = 0;
            }
            
            this.data.canSlide = this.slides.length > this.config.applied.slidesToShow;
            this.data.maxIndex = this.data.canSlide ? this.slides.length - this.config.applied.slidesToShow : 0;

            var totalWidth = this.data.itemWidth * this.slides.length;

            for (var i in this.slides) {
                this.slides[i].style.width=this.data.itemWidth+'px';
                this.slides[i].style.marginRight=this.config.applied.slideGap+'px';
                totalWidth += this.config.applied.slideGap;
            }

            this.slides[this.slides.length-1].style.marginRight=null;
            this.elements.slideParent.style.width=Math.round(totalWidth-this.config.applied.slideGap + 0.4)+'px';
        };

        return Crsl;
    })();

    return function(config, element) {
        return new Crsl(config, element);
    }
});
