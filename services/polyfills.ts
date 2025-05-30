/**
 * Polyfills for modern JavaScript features not available in all environments
 * This file should be imported early in the app initialization process
 */

// Polyfill for Array.prototype.findLast
// This is needed for React Navigation v7 on older Android devices
if (!Array.prototype.findLast) {
  Array.prototype.findLast = function<T>(
    predicate: (value: T, index: number, array: T[]) => boolean,
    thisArg?: any
  ): T | undefined {
    if (this == null) {
      throw new TypeError('Array.prototype.findLast called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }

    const array = Object(this);
    const length = array.length >>> 0;

    for (let i = length - 1; i >= 0; i--) {
      const value = array[i];
      if (predicate.call(thisArg, value, i, array)) {
        return value;
      }
    }

    return undefined;
  };
}

// Polyfill for Array.prototype.findLastIndex
if (!Array.prototype.findLastIndex) {
  Array.prototype.findLastIndex = function<T>(
    predicate: (value: T, index: number, array: T[]) => boolean,
    thisArg?: any
  ): number {
    if (this == null) {
      throw new TypeError('Array.prototype.findLastIndex called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }

    const array = Object(this);
    const length = array.length >>> 0;

    for (let i = length - 1; i >= 0; i--) {
      const value = array[i];
      if (predicate.call(thisArg, value, i, array)) {
        return i;
      }
    }

    return -1;
  };
}
