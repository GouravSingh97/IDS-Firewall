'use strict';

function _interopDefault(ex) {
  return ex && typeof ex === 'object' && 'default' in ex
    ? ex['default']
    : ex;
}
var throttle = _interopDefault(require('lodash.throttle'));
var debounce = _interopDefault(require('lodash.debounce'));

var callback = function() {};

function containsAOSNode(nodes) {
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (n.dataset && n.dataset.aos) return true;
    if (n.children && containsAOSNode(n.children)) return true;
  }
  return false;
}

function check(mutations) {
  if (!mutations) return;
  mutations.forEach(function(m) {
    var added = Array.prototype.slice.call(m.addedNodes);
    var removed = Array.prototype.slice.call(m.removedNodes);
    if (containsAOSNode(added.concat(removed))) callback();
  });
}

function getMO() {
  return (
    window.MutationObserver ||
    window.WebKitMutationObserver ||
    window.MozMutationObserver
  );
}

function isSupported() {
  return !!getMO();
}

function ready(_, fn) {
  var Observer = getMO();
  callback = fn;
  new Observer(check).observe(document.documentElement, {
    childList: true,
    subtree: true,
    removedNodes: true
  });
}

var observer = { isSupported: isSupported, ready: ready };

function classCheck(instance, Constructor) {
  if (!(instance instanceof Constructor))
    throw new TypeError("Cannot call a class as a function");
}

function defineClass(Constructor, protoProps, staticProps) {
  function def(o, props) {
    props.forEach(function(d) {
      d.enumerable = d.enumerable || false;
      d.configurable = true;
      if ('value' in d) d.writable = true;
      Object.defineProperty(o, d.key, d);
    });
  }
  if (protoProps) def(Constructor.prototype, protoProps);
  if (staticProps) def(Constructor, staticProps);
  return Constructor;
}

var _extends = Object.assign || function(t) {
  for (var i = 1; i < arguments.length; i++) {
    var s = arguments[i];
    for (var k in s) {
      if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k];
    }
  }
  return t;
};

var fullNameRe = /(android|bb\d+|meego).+mobile|avantgo|.../i;
var prefixRe = /1207|6310|.../i;
var fullNameMobileRe = /(android|bb\d+|meego).+mobile|.../i;
var prefixMobileRe = /1207|6310|.../i;

function ua() {
  return navigator.userAgent || navigator.vendor || window.opera || '';
}

var Detector = defineClass(
  function Detector() {
    classCheck(this, Detector);
  },
  [
    {
      key: 'phone',
      value: function() {
        var a = ua();
        return !!(fullNameRe.test(a) || prefixRe.test(a.substr(0, 4)));
      }
    },
    {
      key: 'mobile',
      value: function() {
        var a = ua();
        return !!(
          fullNameMobileRe.test(a) || prefixMobileRe.test(a.substr(0, 4))
        );
      }
    },
    {
      key: 'tablet',
      value: function() {
        return this.mobile() && !this.phone();
      }
    },
    {
      key: 'ie11',
      value: function() {
        var s = document.documentElement.style;
        return '-ms-scroll-limit' in s && '-ms-ime-align' in s;
      }
    }
  ]
);

var detect = new Detector();

function addClasses(node, classes) {
  if (classes) classes.forEach(function(c) {
    node.classList.add(c);
  });
}
function removeClasses(node, classes) {
  if (classes) classes.forEach(function(c) {
    node.classList.remove(c);
  });
}

function fireEvent(name, data) {
  var ev;
  if (detect.ie11()) {
    ev = document.createEvent('CustomEvent');
    ev.initCustomEvent(name, true, true, { detail: data });
  } else {
    ev = new CustomEvent(name, { detail: data });
  }
  return document.dispatchEvent(ev);
}

function applyClasses(el, top) {
  var o = el.options,
    pos = el.position,
    node = el.node;

  function hide() {
    if (!el.animated) return;
    removeClasses(node, o.animatedClassNames);
    fireEvent('aos:out', node);
    if (o.id) fireEvent('aos:in:' + o.id, node);
    el.animated = false;
  }
  function show() {
    if (el.animated) return;
    addClasses(node, o.animatedClassNames);
    fireEvent('aos:in', node);
    if (o.id) fireEvent('aos:in:' + o.id, node);
    el.animated = true;
  }

  if (o.mirror && top >= pos.out && !o.once) hide();
  else if (top >= pos.in) show();
  else if (el.animated && !o.once) hide();
}

function handleScroll(elems) {
  elems.forEach(function(el) {
    applyClasses(el, window.pageYOffset);
  });
}

function offset(el) {
  var x = 0,
    y = 0;
  while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
    x += el.offsetLeft - (el.tagName !== 'BODY' ? el.scrollLeft : 0);
    y += el.offsetTop - (el.tagName !== 'BODY' ? el.scrollTop : 0);
    el = el.offsetParent;
  }
  return { top: y, left: x };
}

function getInlineOption(el, key, fb) {
  var v = el.getAttribute('data-aos-' + key);
  if (v !== null) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    return v;
  }
  return fb;
}

function getPositionIn(el, defOffset, defAnchor) {
  var h = window.innerHeight;
  var anchor = getInlineOption(el, 'anchor');
  var anchorPlace = getInlineOption(el, 'anchor-placement', defAnchor);
  var offsetVal = Number(getInlineOption(el, 'offset', anchorPlace ? 0 : defOffset));
  var target = el;
  if (anchor) target = document.querySelector(anchor) || target;
  var tp = offset(target).top - h;
  switch (anchorPlace) {
    case 'center-bottom': tp += target.offsetHeight / 2; break;
    case 'bottom-bottom': tp += target.offsetHeight; break;
    case 'top-center': tp += h / 2; break;
    case 'center-center': tp += h / 2 + target.offsetHeight / 2; break;
    case 'bottom-center': tp += h / 2 + target.offsetHeight; break;
    case 'top-top': tp += h; break;
    case 'bottom-top': tp += h + target.offsetHeight; break;
    case 'center-top': tp += h + target.offsetHeight / 2; break;
  }
  return tp + offsetVal;
}

function getPositionOut(el, defOffset) {
  var anchor = getInlineOption(el, 'anchor');
  var offsetVal = getInlineOption(el, 'offset', defOffset);
  var target = anchor ? document.querySelector(anchor) || el : el;
  return offset(target).top + target.offsetHeight - offsetVal;
}

function prepare(elems, opt) {
  elems.forEach(function(el) {
    var n = el.node;
    var m = getInlineOption(n, 'mirror', opt.mirror);
    var o = getInlineOption(n, 'once', opt.once);
    var id = getInlineOption(n, 'id');
    var cls = opt.useClassNames && n.getAttribute('data-aos');
    var animated = [opt.animatedClassName]
      .concat(cls ? cls.split(' ') : [])
      .filter(function(c) { return typeof c === 'string'; });

    if (opt.initClassName) n.classList.add(opt.initClassName);

    el.position = {
      in: getPositionIn(n, opt.offset, opt.anchorPlacement),
      out: m && getPositionOut(n, opt.offset)
    };
    el.options = { once: o, mirror: m, animatedClassNames: animated, id: id };
  });
  return elems;
}

function getElements() {
  var list = document.querySelectorAll('[data-aos]');
  return Array.prototype.map.call(list, function(n) {
    return { node: n };
  });
}

var $aos = [];
var initialized = false;
var defaults = {
  offset: 120,
  delay: 0,
  easing: 'ease',
  duration: 400,
  disable: false,
  once: false,
  mirror: false,
  anchorPlacement: 'top-bottom',
  startEvent: 'DOMContentLoaded',
  animatedClassName: 'aos-animate',
  initClassName: 'aos-init',
  useClassNames: false,
  disableMutationObserver: false,
  throttleDelay: 99,
  debounceDelay: 50
};

function isBrowserNotSupported() {
  return document.all && !window.atob;
}

function initializeScroll() {
  $aos = prepare($aos, defaults);
  handleScroll($aos);
  window.addEventListener('scroll', throttle(function() {
    handleScroll($aos);
  }, defaults.throttleDelay));
  return $aos;
}

function refresh(initFlag) {
  if (initFlag) initialized = true;
  if (initialized) initializeScroll();
}

function refreshHard() {
  $aos = getElements();
  if (isDisabled(defaults.disable) || isBrowserNotSupported()) {
    return disable();
  }
  refresh();
}

function disable() {
  $aos.forEach(function(el) {
    var n = el.node;
    n.removeAttribute('data-aos');
    n.removeAttribute('data-aos-easing');
    n.removeAttribute('data-aos-duration');
    n.removeAttribute('data-aos-delay');
    if (defaults.initClassName) n.classList.remove(defaults.initClassName);
    if (defaults.animatedClassName)
      n.classList.remove(defaults.animatedClassName);
  });
}

function isDisabled(opt) {
  return (
    opt === true ||
    (opt === 'mobile' && detect.mobile()) ||
    (opt === 'phone' && detect.phone()) ||
    (opt === 'tablet' && detect.tablet()) ||
    (typeof opt === 'function' && opt() === true)
  );
}

function init(settings) {
  defaults = _extends(defaults, settings);
  $aos = getElements();

  if (
    !defaults.disableMutationObserver &&
    !observer.isSupported()
  ) {
    console.info('aos: MutationObserver not supported, disabled.');
    defaults.disableMutationObserver = true;
  }

  if (!defaults.disableMutationObserver) {
    observer.ready('[data-aos]', refreshHard);
  }

  if (isDisabled(defaults.disable) || isBrowserNotSupported()) {
    return disable();
  }

  var body = document.querySelector('body');
  body.setAttribute('data-aos-easing', defaults.easing);
  body.setAttribute('data-aos-duration', defaults.duration);
  body.setAttribute('data-aos-delay', defaults.delay);

  if (['DOMContentLoaded', 'load'].indexOf(defaults.startEvent) === -1) {
    document.addEventListener(defaults.startEvent, function() {
      refresh(true);
    });
  } else {
    window.addEventListener('load', function() {
      refresh(true);
    });
  }

  if (
    defaults.startEvent === 'DOMContentLoaded' &&
    ['complete', 'interactive'].indexOf(document.readyState) > -1
  ) {
    refresh(true);
  }

  window.addEventListener(
    'resize',
    debounce(refresh, defaults.debounceDelay, true)
  );
  window.addEventListener(
    'orientationchange',
    debounce(refresh, defaults.debounceDelay, true)
  );

  return $aos;
}

module.exports = { init: init, refresh: refresh, refreshHard: refreshHard };
