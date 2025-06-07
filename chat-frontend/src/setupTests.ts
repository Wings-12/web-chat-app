import '@testing-library/jest-dom'

Object.defineProperty(window.Element.prototype, 'scrollIntoView', {
  writable: true,
  value: function() {
    return true;
  },
});

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: function() {
    return true;
  },
});

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
