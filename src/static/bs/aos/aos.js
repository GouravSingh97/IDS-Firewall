(function(global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
      define(factory);
    } else {
      global.AOS = factory();
    }
  })(this, function() {
    'use strict';
  
    const root = (typeof window !== 'undefined' && window) ||
                 (typeof global !== 'undefined' && global) ||
                 (typeof self !== 'undefined' && self) || {};
  
    const NOOP = () => {};
  
    // lodash/throttle simplified
    function throttle(func, wait, opts = {}) {
      let timeout, context, args, result;
      let previous = 0;
      let { leading = true, trailing = true, maxWait } = opts;
      let lastCallTime, lastInvokeTime = 0;
  
      function invoke(now) {
        previous = now;
        lastInvokeTime = now;
        result = func.apply(context, args);
        context = args = null;
        return result;
      }
  
      function shouldInvoke(now) {
        const timeSinceLastCall = now - previous;
        const timeSinceLastInvoke = now - lastInvokeTime;
        return previous === 0 || timeSinceLastCall >= wait ||
               timeSinceLastCall < 0 ||
               (maxWait !== undefined && timeSinceLastInvoke >= maxWait);
      }
  
      function timerExpired() {
        const now = Date.now();
        if (shouldInvoke(now)) {
          invoke(now);
        } else {
          timeout = setTimeout(timerExpired, wait - (now - previous));
        }
      }
  
      function throttled(...argsList) {
        const now = Date.now();
        const isInvoking = shouldInvoke(now);
        context = this;
        args = argsList;
        if (isInvoking) {
          if (!timeout) {
            previous = now;
            result = func.apply(context, args);
            context = args = null;
          }
          if (maxWait !== undefined) {
            clearTimeout(timeout);
            timeout = setTimeout(timerExpired, wait);
          }
        } else if (!timeout && trailing) {
          timeout = setTimeout(timerExpired, wait);
        }
        return result;
      }
  
      throttled.cancel = function() {
        clearTimeout(timeout);
        previous = 0;
        timeout = context = args = null;
      };
  
      return throttled;
    }
  
    // lodash/debounce simplified
    function debounce(func, wait, immediate = false) {
      let timeout, result;
      function later(context, args) {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
        }
      }
      function debounced(...args) {
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        const laterContext = this;
        const laterArgs = args;
        timeout = setTimeout(() => later(laterContext, laterArgs), wait);
        if (callNow) {
          result = func.apply(this, args);
        }
        return result;
      }
      debounced.cancel = () => clearTimeout(timeout);
      return debounced;
    }
  
    function containsAOSNode(nodes) {
      return nodes.some(node =>
        node.dataset?.aos ||
        (node.children && containsAOSNode(Array.from(node.children)))
      );
    }
  
    let mutationCallback = NOOP;
  
    function mutationObserverCallback(mutations) {
      if (!mutations) return;
      for (let m of mutations) {
        const all = [...m.addedNodes, ...m.removedNodes];
        if (containsAOSNode(all)) {
          mutationCallback();
          return;
        }
      }
    }
  
    function getMutationObserverClass() {
      return window.MutationObserver ||
             window.WebKitMutationObserver ||
             window.MozMutationObserver;
    }
  
    const observer = {
      isSupported() {
        return !!getMutationObserverClass();
      },
      ready(_, fn) {
        mutationCallback = fn;
        const Observer = getMutationObserverClass();
        new Observer(mutationObserverCallback).observe(document.documentElement, {
          childList: true,
          subtree: true,
          removedNodes: true
        });
      }
    };
  
    // device detection
    const fullNameRe = /...(android|blackberry|...)/i;
    const prefixRe   = /^(1207|6310|...)/i;
    const fullNameMobileRe = /...(android|ipad|...)/i;
    const prefixMobileRe   = /^(1207|6310|...)/i;
  
    function getUA() {
      return navigator.userAgent || navigator.vendor || window.opera || '';
    }
  
    class Detector {
      phone() {
        const ua = getUA();
        return fullNameRe.test(ua) || prefixRe.test(ua.slice(0, 4));
      }
      mobile() {
        const ua = getUA();
        return fullNameMobileRe.test(ua) || prefixMobileRe.test(ua.slice(0, 4));
      }
      tablet() {
        return this.mobile() && !this.phone();
      }
      ie11() {
        const s = document.documentElement.style;
        return '-ms-scroll-limit' in s && '-ms-ime-align' in s;
      }
    }
  
    const detect = new Detector();
  
    function fireEvent(name, detail) {
      const ev = detect.ie11()
        ? (() => {
            const e = document.createEvent('CustomEvent');
            e.initCustomEvent(name, true, true, { detail });
            return e;
          })()
        : new CustomEvent(name, { detail });
      return document.dispatchEvent(ev);
    }
  
    function applyClasses(el, scrollTop) {
      const { options: o, position: p, node } = el;
  
      function hide() {
        if (!el.animated) return;
        node.classList.remove(...o.animatedClassNames);
        fireEvent('aos:out', node);
        if (o.id) fireEvent(`aos:in:${o.id}`, node);
        el.animated = false;
      }
  
      function show() {
        if (el.animated) return;
        node.classList.add(...o.animatedClassNames);
        fireEvent('aos:in', node);
        if (o.id) fireEvent(`aos:in:${o.id}`, node);
        el.animated = true;
      }
  
      if (o.mirror && scrollTop >= p.out && !o.once) hide();
      else if (scrollTop >= p.in) show();
      else if (el.animated && !o.once) hide();
    }
  
    function handleScroll(elements) {
      elements.forEach(el => applyClasses(el, window.pageYOffset));
    }
  
    function offset(el) {
      let x = 0, y = 0;
      while (el) {
        x += el.offsetLeft - (el.tagName !== 'BODY' ? el.scrollLeft : 0);
        y += el.offsetTop - (el.tagName !== 'BODY' ? el.scrollTop : 0);
        el = el.offsetParent;
      }
      return { top: y, left: x };
    }
  
    function getInline(el, key, fallback) {
      const attr = el.getAttribute(`data-aos-${key}`);
      if (attr !== null) {
        if (attr === 'true') return true;
        if (attr === 'false') return false;
        return attr;
      }
      return fallback;
    }
  
    function getPositionIn(el, offsetVal, anchorPlacement) {
      const h = window.innerHeight;
      const anchor = getInline(el, 'anchor');
      const ap = getInline(el, 'anchor-placement', anchorPlacement);
      const extraOffset = Number(getInline(el, 'offset', ap ? 0 : offsetVal));
      const target = anchor ? document.querySelector(anchor) || el : el;
  
      let top = offset(target).top - h;
      switch (ap) {
        case 'center-bottom': top += target.offsetHeight / 2; break;
        case 'bottom-bottom': top += target.offsetHeight; break;
        case 'top-center': top += h / 2; break;
        case 'center-center': top += h / 2 + target.offsetHeight / 2; break;
        case 'bottom-center': top += h / 2 + target.offsetHeight; break;
        case 'top-top': top += h; break;
        case 'bottom-top': top += h + target.offsetHeight; break;
        case 'center-top': top += h + target.offsetHeight / 2; break;
      }
      return top + extraOffset;
    }
  
    function getPositionOut(el, offsetVal) {
      const anchor = getInline(el, 'anchor');
      const off = getInline(el, 'offset', offsetVal);
      const target = anchor ? document.querySelector(anchor) || el : el;
      return offset(target).top + target.offsetHeight - off;
    }
  
    function prepare(elements, opt) {
      elements.forEach(el => {
        const node = el.node;
        const mirror = getInline(node, 'mirror', opt.mirror);
        const once = getInline(node, 'once', opt.once);
        const id = getInline(node, 'id');
        const clsNames = opt.useClassNames && node.getAttribute('data-aos');
        const animated = [opt.animatedClassName, ...(clsNames ? clsNames.split(' ') : [])];
  
        if (opt.initClassName) node.classList.add(opt.initClassName);
  
        el.position = {
          in: getPositionIn(node, opt.offset, opt.anchorPlacement),
          out: mirror ? getPositionOut(node, opt.offset) : null
        };
        el.options = { once, mirror, animatedClassNames: animated, id };
      });
      return elements;
    }
  
    function getElements() {
      return Array.from(document.querySelectorAll('[data-aos]'),
        node => ({ node }));
    }
  
    let aosElements = [];
    let initialized = false;
  
    const defaultOptions = {
      offset: 120, delay: 0, easing: 'ease', duration: 400,
      disable: false, once: false, mirror: false,
      anchorPlacement: 'top-bottom', startEvent: 'DOMContentLoaded',
      animatedClassName: 'aos-animate', initClassName: 'aos-init',
      useClassNames: false, disableMutationObserver: false,
      throttleDelay: 99, debounceDelay: 50
    };
  
    function isBrowserNotSupported() {
      return document.all && !window.atob;
    }
  
    function initializeScroll() {
      aosElements = prepare(aosElements, options);
      handleScroll(aosElements);
  
      window.addEventListener('scroll',
        throttle(() => handleScroll(aosElements), options.throttleDelay)
      );
      return aosElements;
    }
  
    function refresh(init = false) {
      if (init) initialized = true;
      if (initialized) initializeScroll();
    }
  
    function refreshHard() {
      aosElements = getElements();
      if (isDisabled(options.disable) || isBrowserNotSupported()) {
        return disableAll();
      }
      refresh();
    }
  
    function disableAll() {
      aosElements.forEach(el => {
        const n = el.node;
        ['data-aos','data-aos-easing','data-aos-duration','data-aos-delay']
          .forEach(a => n.removeAttribute(a));
        if (options.initClassName) n.classList.remove(options.initClassName);
        if (options.animatedClassName) n.classList.remove(options.animatedClassName);
      });
    }
  
    function isDisabled(opt) {
      if (opt === true) return true;
      if (opt === 'mobile' && detect.mobile()) return true;
      if (opt === 'phone' && detect.phone()) return true;
      if (opt === 'tablet' && detect.tablet()) return true;
      if (typeof opt === 'function' && opt()) return true;
      return false;
    }
  
    let options = { ...defaultOptions };
  
    function init(userSettings = {}) {
      options = { ...options, ...userSettings };
      aosElements = getElements();
  
      if (!options.disableMutationObserver && !observer.isSupported()) {
        console.info('aos: MutationObserver not supported; code mutations disabled.');
        options.disableMutationObserver = true;
      }
  
      if (!options.disableMutationObserver) {
        observer.ready('[data-aos]', refreshHard);
      }
  
      if (isDisabled(options.disable) || isBrowserNotSupported()) {
        return disableAll();
      }
  
      const body = document.body;
      body.dataset.aosEasing = options.easing;
      body.dataset.aosDuration = options.duration;
      body.dataset.aosDelay = options.delay;
  
      const startEvt = options.startEvent;
      if (!['DOMContentLoaded', 'load'].includes(startEvt)) {
        document.addEventListener(startEvt, () => refresh(true));
      } else {
        window.addEventListener('load', () => refresh(true));
        if (startEvt === 'DOMContentLoaded' && ['interactive', 'complete'].includes(document.readyState)) {
          refresh(true);
        }
      }
  
      window.addEventListener(
        'resize',
        debounce(() => refresh(), options.debounceDelay)
      );
      window.addEventListener(
        'orientationchange',
        debounce(() => refresh(), options.debounceDelay)
      );
  
      return aosElements;
    }
  
    return {
      init,
      refresh,
      refreshHard
    };
  });
  