(function() {
    "use strict";

    /**
     * Easy selector helper function
     */
    const select = (el, all = false) => {
        el = el.trim()
        if (all) {
            return [...document.querySelectorAll(el)]
        } else {
            return document.querySelector(el)
        }
    }

    /**
     * Easy event listener function
     */
    const on = (type, el, listener, all = false) => {
        let selectEl = select(el, all)
        if (selectEl) {
            if (all) {
                selectEl.forEach(e => e.addEventListener(type, listener))
            } else {
                selectEl.addEventListener(type, listener)
            }
        }
    }

    /**
     * Easy on scroll event listener 
     */
    const onscroll = (el, listener) => {
        el.addEventListener('scroll', listener)
    }

    /**
     * Scrolls to an element with header offset
     */
    const scrollto = (el) => {
        let header = select('#header')
        let offset = header.offsetHeight

        if (!header.classList.contains('header-scrolled')) {
            offset -= 16
        }

        let elementPos = select(el).offsetTop
        window.scrollTo({
            top: elementPos - offset,
            behavior: 'smooth'
        })
    }

    /**
     * Toggle .header-scrolled class to #header when page is scrolled
     */
    let selectHeader = select('#header')
    if (selectHeader) {
        const headerScrolled = () => {
            if (window.scrollY > 100) {
                selectHeader.classList.add('header-scrolled')
            } else {
                selectHeader.classList.remove('header-scrolled')
            }
        }
        window.addEventListener('load', headerScrolled)
        onscroll(document, headerScrolled)
    }

    /**
     * Scrool with ofset on links with a class name .scrollto
     */
    on('click', '.scrollto', function(e) {
        if (select(this.hash)) {
            e.preventDefault()

            let navbar = select('#navbar')
            if (navbar.classList.contains('navbar-mobile')) {
                navbar.classList.remove('navbar-mobile')
                let navbarToggle = select('.mobile-nav-toggle')
                navbarToggle.classList.toggle('bi-list')
                navbarToggle.classList.toggle('bi-x')
            }
            scrollto(this.hash)
        }
    }, true)

    /**
     * Scroll with ofset on page load with hash links in the url
     */
    window.addEventListener('load', () => {
        if (window.location.hash) {
            if (select(window.location.hash)) {
                scrollto(window.location.hash)
            }
        }
    });

    /**
     * Preloader
     */
    let preloader = select('#preloader');
    if (preloader) {
        window.addEventListener('load', () => {
            preloader.remove()
        });
    }

    /**
     * Learning information slider
     */
    var swiper = new Swiper('.info-slider', {
        speed: 600,
        loop: true,
        slidesPerView: 'auto',
        pagination: {
            el: '.swiper-pagination',
            type: 'bullets',
            clickable: true
        },
        breakpoints: {
            320: {
                slidesPerView: 1,
                spaceBetween: 40
            },

            1200: {
                slidesPerView: 3,
                spaceBetween: 40
            }
        },
        on: {
            slideChange: function() {

                // remove blur class from all slides
                this.slides.forEach(function(slide) {
                    slide.classList.remove('blur');
                });

                // add blur class to all slides except active one
                this.slides
                    .filter(function(slide) {
                        return slide !== this.slides[this.activeIndex];
                    }, this)
                    .forEach(function(slide) {
                        slide.classList.add('blur');
                    });
            }
        }
    });

    // Get all swiper-slide elements
    var swiperSlides = document.querySelectorAll('.swiper-slide');

    // Add mouse enter event listener to each swiper-slide
    swiperSlides.forEach(function(slide) {
        slide.addEventListener('mouseenter', function() {
            // Check if the mouse is over the active slide
            if (slide.classList.contains('swiper-slide-active')) {
                // Set slidesPerView to 1
                swiper.params.slidesPerView = 1;
                // Update Swiper
                swiper.update();
            }
        });
    });

    // Add mouse leave event listener to swiper container
    document.querySelector('.info-slider').addEventListener('mouseleave', function() {
        // Check if viewport width is less than 320px
        if (window.innerWidth < 320) {
            // Set slidesPerView to 1
            swiper.params.slidesPerView = 1;
        } else {
            // Set slidesPerView to 3
            swiper.params.slidesPerView = 3;
        }
        // Update Swiper
        swiper.update();
    });


    /**
     * Animation on scroll
     */
    window.addEventListener('load', () => {
        AOS.init({
            duration: 1000,
            easing: 'ease-in-out',
            once: true,
            mirror: false
        })
    });

    /**
     * Initiate Pure Counter 
     */
    new PureCounter();  

})()