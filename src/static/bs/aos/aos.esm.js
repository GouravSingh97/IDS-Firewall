import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';

let callback = () => {};

function containsAOSNode(nodes) {
  for (let n of nodes) {
    if (n.dataset?.aos) return true;
    if (n.children && containsAOSNode(n.children)) return true;
  }
  return false;
}

function check(mutations) {
  if (!mutations) return;
  for (let m of mutations) {
    const added = Array.from(m.addedNodes);
    const removed = Array.from(m.removedNodes);
    if (containsAOSNode(added.concat(removed))) callback();
  }
}

function getMO() {
  return window.MutationObserver ||
         window.WebKitMutationObserver ||
         window.MozMutationObserver;
}

function isSupported() {
  return !!getMO();
}

function ready(_, fn) {
  callback = fn;
  new (getMO())(check).observe(document.documentElement, {
    childList: true,
    subtree: true,
    removedNodes: true
  });
}

const observer = { isSupported, ready };

function classCheck(inst, C) {
  if (!(inst instanceof C)) throw new TypeError("Cannot call a class as a function");
}

function defineClass(C, protoProps) {
  if (protoProps) {
    for (let d of protoProps) {
      d.enumerable = d.enumerable || false;
      d.configurable = true;
      if ('value' in d) d.writable = true;
      Object.defineProperty(C.prototype, d.key, d);
    }
  }
  return C;
}

const _extends = Object.assign;

const fullNameRe = /(android|bb\d+|meego).+mobile|.../i;
const prefixRe = /1207|6310|.../i;
const fullNameMobileRe = /(android|bb\d+|meego).+mobile|.../i;
const prefixMobileRe = /1207|6310|.../i;

function ua() {
  return navigator.userAgent || navigator.vendor || window.opera || '';
}

const Detector = defineClass(
  function Detector() { classCheck(this, Detector); },
  [
    {
      key: 'phone',
      value() {
        const a = ua();
        return fullNameRe.test(a) || prefixRe.test(a.slice(0, 4));
      }
    },
    {
      key: 'mobile',
      value() {
        const a = ua();
        return fullNameMobileRe.test(a) || prefixMobileRe.test(a.slice(0, 4));
      }
    },
    {
      key: 'tablet',
      value() {
        return this.mobile() && !this.phone();
      }
    },
    {
      key: 'ie11',
      value() {
        const s = document.documentElement.style;
        return '-ms-scroll-limit' in s && '-ms-ime-align' in s;
      }
    }
  ]
);

const detect = new Detector();

function addClasses(el, cl) { cl?.forEach(c => el.classList.add(c)); }
function removeClasses(el, cl) { cl?.forEach(c => el.classList.remove(c)); }

function fireEvent(name, data) {
  const ev = detect.ie11()
    ? (() => {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(name, true, true, { detail: data });
        return e;
      })()
    : new CustomEvent(name, { detail: data });
  return document.dispatchEvent(ev);
}

function applyClasses(el, top) {
  const { options: o, position: p, node: n } = el;

  function hide() {
    if (!el.animated) return;
    removeClasses(n, o.animatedClassNames);
    fireEvent('aos:out', n);
    o.id && fireEvent('aos:in:' + o.id, n);
    el.animated = false;
  }

  function show() {
    if (el.animated) return;
    addClasses(n, o.animatedClassNames);
    fireEvent('aos:in', n);
    o.id && fireEvent('aos:in:' + o.id, n);
    el.animated = true;
  }

  if (o.mirror && top >= p.out && !o.once) hide();
  else if (top >= p.in) show();
  else if (el.animated && !o.once) hide();
}

function handleScroll(list) {
  list.forEach(el => applyClasses(el, window.pageYOffset));
}

function offset(el) {
  let x = 0, y = 0;
  while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
    x += el.offsetLeft - (el.tagName !== 'BODY' ? el.scrollLeft : 0);
    y += el.offsetTop - (el.tagName !== 'BODY' ? el.scrollTop : 0);
    el = el.offsetParent;
  }
  return { top: y, left: x };
}

function getInlineOption(el, key, fb) {
  const v = el.getAttribute('data-aos-' + key);
  if (v !== null) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    return v;
  }
  return fb;
}

function getPositionIn(el, defOffset, defAnchor) {
  const h = window.innerHeight;
  const anchor = getInlineOption(el, 'anchor');
  const ap = getInlineOption(el, 'anchor-placement', defAnchor);
  const off = Number(getInlineOption(el, 'offset', ap ? 0 : defOffset));
  const tgt = anchor ? document.querySelector(anchor) || el : el;
  let tp = offset(tgt).top - h;

  switch (ap) {
    case 'center-bottom': tp += tgt.offsetHeight / 2; break;
    case 'bottom-bottom': tp += tgt.offsetHeight; break;
    case 'top-center': tp += h / 2; break;
    case 'center-center': tp += h / 2 + tgt.offsetHeight / 2; break;
    case 'bottom-center': tp += h / 2 + tgt.offsetHeight; break;
    case 'top-top': tp += h; break;
    case 'bottom-top': tp += h + tgt.offsetHeight; break;
    case 'center-top': tp += h + tgt.offsetHeight / 2; break;
  }

  return tp + off;
}

function getPositionOut(el, defOffset) {
  const anchor = getInlineOption(el, 'anchor');
  const off = getInlineOption(el, 'offset', defOffset);
  const tgt = anchor ? document.querySelector(anchor) || el : el;
  return offset(tgt).top + tgt.offsetHeight - off;
}

function prepare(list, opt) {
  list.forEach(el => {
    const n = el.node;
    const m = getInlineOption(n, 'mirror', opt.mirror);
    const o = getInlineOption(n, 'once', opt.once);
    const id = getInlineOption(n, 'id');
    const names = opt.useClassNames && n.getAttribute('data-aos');
    const animated = [
      opt.animatedClassName,
      ...(names ? names.split(' ') : [])
    ].filter(c => typeof c === 'string');
    opt.initClassName && n.classList.add(opt.initClassName);

    el.position = {
      in: getPositionIn(n, opt.offset, opt.anchorPlacement),
      out: m && getPositionOut(n, opt.offset)
    };
    el.options = { once: o, mirror: m, animatedClassNames: animated, id };
  });
  return list;
}

function getElements() {
  return Array.from(document.querySelectorAll('[data-aos]'), node => ({ node }));
}

let aosList = [];
let initialized = false;

let defaults = {
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
  aosList = prepare(aosList, defaults);
  handleScroll(aosList);
  window.addEventListener('scroll',
    throttle(() => handleScroll(aosList), defaults.throttleDelay)
  );
  return aosList;
}

function refresh(init = false) {
  if (init) initialized = true;
  if (initialized) initializeScroll();
}

function refreshHard() {
  aosList = getElements();
  if (isDisabled(defaults.disable) || isBrowserNotSupported()) {
    return disable();
  }
  refresh();
}

function disable() {
  aosList.forEach(el => {
    const n = el.node;
    ['data-aos', 'data-aos-easing', 'data-aos-duration', 'data-aos-delay']
      .forEach(attr => n.removeAttribute(attr));
    defaults.initClassName && n.classList.remove(defaults.initClassName);
    defaults.animatedClassName && n.classList.remove(defaults.animatedClassName);
  });
}

function isDisabled(opt) {
  return opt === true ||
    (opt === 'mobile' && detect.mobile()) ||
    (opt === 'phone' && detect.phone()) ||
    (opt === 'tablet' && detect.tablet()) ||
    (typeof opt === 'function' && opt());
}

export function init(settings = {}) {
  defaults = _extends({}, defaults, settings);
  aosList = getElements();

  if (!defaults.disableMutationObserver && !observer.isSupported()) {
    console.info('aos: MO not supported, disabled.');
    defaults.disableMutationObserver = true;
  }

  if (!defaults.disableMutationObserver) observer.ready('', refreshHard);
  if (isDisabled(defaults.disable) || isBrowserNotSupported()) return disable();

  const body = document.body;
  body.dataset.aosEasing = defaults.easing;
  body.dataset.aosDuration = defaults.duration;
  body.dataset.aosDelay = defaults.delay;

  const evt = defaults.startEvent;
  if (!['DOMContentLoaded','load'].includes(evt)) {
    document.addEventListener(evt, () => refresh(true));
  } else {
    window.addEventListener('load', () => refresh(true));
    if (evt === 'DOMContentLoaded' && ['interactive','complete'].includes(document.readyState)) {
      refresh(true);
    }
  }

  window.addEventListener('resize', debounce(refresh, defaults.debounceDelay, true));
  window.addEventListener('orientationchange', debounce(refresh, defaults.debounceDelay, true));

  return aosList;
}

export { refresh, refreshHard };
