/**
 * Tests for polyfills.ts
 * These tests ensure that polyfills work correctly and handle edge cases
 */

describe('Polyfills Tests', () => {
  let originalFindLast: typeof Array.prototype.findLast | undefined;
  let originalFindLastIndex: typeof Array.prototype.findLastIndex | undefined;

  beforeEach(() => {
    // Store original implementations
    originalFindLast = Array.prototype.findLast;
    originalFindLastIndex = Array.prototype.findLastIndex;
    
    // Clear the implementations to test polyfill behavior
    delete (Array.prototype as any).findLast;
    delete (Array.prototype as any).findLastIndex;
    
    // Import polyfills after clearing
    jest.resetModules();
    require('@/services/polyfills');
  });

  afterEach(() => {
    // Restore original implementations
    if (originalFindLast) {
      Array.prototype.findLast = originalFindLast;
    }
    if (originalFindLastIndex) {
      Array.prototype.findLastIndex = originalFindLastIndex;
    }
  });

  describe('Array.prototype.findLast polyfill', () => {
    const testArray = [1, 2, 3, 4, 5, 4, 3, 2, 1];

    it('should find the last element matching the predicate', () => {
      const result = testArray.findLast(x => x === 2);
      expect(result).toBe(2);
    });

    it('should find the last occurrence of a value', () => {
      const result = testArray.findLast(x => x === 4);
      expect(result).toBe(4);
    });

    it('should return undefined when no element matches', () => {
      const result = testArray.findLast(x => x === 10);
      expect(result).toBeUndefined();
    });

    it('should work with complex predicates', () => {
      const objects = [
        { id: 1, type: 'A' },
        { id: 2, type: 'B' },
        { id: 3, type: 'A' },
        { id: 4, type: 'C' }
      ];
      
      const result = objects.findLast(obj => obj.type === 'A');
      expect(result).toEqual({ id: 3, type: 'A' });
    });

    it('should handle empty arrays', () => {
      const result = [].findLast(x => x === 1);
      expect(result).toBeUndefined();
    });

    it('should work with thisArg parameter', () => {
      const context = { threshold: 3 };
      const result = testArray.findLast(function(this: { threshold: number }, x) {
        return x > this.threshold;
      }, context);
      expect(result).toBe(4);
    });

    it('should throw TypeError when predicate is not a function', () => {
      expect(() => {
        testArray.findLast('not a function' as any);
      }).toThrow(TypeError);
    });

    it('should work with array-like objects', () => {
      const arrayLike = { 0: 'a', 1: 'b', 2: 'a', length: 3 };
      const result = Array.prototype.findLast.call(arrayLike, x => x === 'a');
      expect(result).toBe('a');
    });
  });

  describe('Array.prototype.findLastIndex polyfill', () => {
    const testArray = [1, 2, 3, 4, 5, 4, 3, 2, 1];

    it('should find the last index of element matching the predicate', () => {
      const result = testArray.findLastIndex(x => x === 2);
      expect(result).toBe(7); // Last occurrence of 2 is at index 7
    });

    it('should find the last index of a value', () => {
      const result = testArray.findLastIndex(x => x === 4);
      expect(result).toBe(5); // Last occurrence of 4 is at index 5
    });

    it('should return -1 when no element matches', () => {
      const result = testArray.findLastIndex(x => x === 10);
      expect(result).toBe(-1);
    });

    it('should work with complex predicates', () => {
      const objects = [
        { id: 1, type: 'A' },
        { id: 2, type: 'B' },
        { id: 3, type: 'A' },
        { id: 4, type: 'C' }
      ];
      
      const result = objects.findLastIndex(obj => obj.type === 'A');
      expect(result).toBe(2); // Last 'A' type is at index 2
    });

    it('should handle empty arrays', () => {
      const result = [].findLastIndex(x => x === 1);
      expect(result).toBe(-1);
    });

    it('should work with thisArg parameter', () => {
      const context = { threshold: 3 };
      const result = testArray.findLastIndex(function(this: { threshold: number }, x) {
        return x > this.threshold;
      }, context);
      expect(result).toBe(5); // Last element > 3 is 4 at index 5
    });

    it('should throw TypeError when predicate is not a function', () => {
      expect(() => {
        testArray.findLastIndex('not a function' as any);
      }).toThrow(TypeError);
    });

    it('should work with array-like objects', () => {
      const arrayLike = { 0: 'a', 1: 'b', 2: 'a', length: 3 };
      const result = Array.prototype.findLastIndex.call(arrayLike, x => x === 'a');
      expect(result).toBe(2); // Last 'a' is at index 2
    });
  });

  describe('Polyfill behavior', () => {
    it('should ensure findLast and findLastIndex methods exist', () => {
      // Import polyfills to ensure methods exist
      require('@/services/polyfills');
      
      // Methods should be available
      expect(typeof Array.prototype.findLast).toBe('function');
      expect(typeof Array.prototype.findLastIndex).toBe('function');
    });

    it('should handle edge case with zero length arrays', () => {
      const emptyArray: number[] = [];
      
      const findLastResult = emptyArray.findLast(x => true);
      const findLastIndexResult = emptyArray.findLastIndex(x => true);
      
      expect(findLastResult).toBeUndefined();
      expect(findLastIndexResult).toBe(-1);
    });

    it('should handle arrays with undefined values', () => {
      const sparseArray = [1, undefined, 3, undefined, 5];
      
      const findLastResult = sparseArray.findLast(x => x === undefined);
      const findLastIndexResult = sparseArray.findLastIndex(x => x === undefined);
      
      expect(findLastResult).toBeUndefined();
      expect(findLastIndexResult).toBe(3); // Last undefined is at index 3
    });

    it('should handle predicate that throws', () => {
      const throwingPredicate = () => {
        throw new Error('Predicate error');
      };
      
      expect(() => {
        [1, 2, 3].findLast(throwingPredicate);
      }).toThrow('Predicate error');
      
      expect(() => {
        [1, 2, 3].findLastIndex(throwingPredicate);
      }).toThrow('Predicate error');
    });

    it('should test polyfill implementation when methods are missing', () => {
      // Store current implementations
      const originalFindLast = Array.prototype.findLast;
      const originalFindLastIndex = Array.prototype.findLastIndex;
      
      try {
        // Remove implementations
        delete (Array.prototype as any).findLast;
        delete (Array.prototype as any).findLastIndex;
        
        // Re-import polyfills
        jest.resetModules();
        require('@/services/polyfills');
        
        // Test error conditions that should hit uncovered lines
        const testArray = [1, 2, 3];
        
        // Test TypeError for non-function predicate (should hit lines 14 and 41)
        expect(() => {
          testArray.findLast('not a function' as any);
        }).toThrow('predicate must be a function');
        
        expect(() => {
          testArray.findLastIndex('not a function' as any);
        }).toThrow('predicate must be a function');
        
      } finally {
        // Restore original implementations
        if (originalFindLast) Array.prototype.findLast = originalFindLast;
        if (originalFindLastIndex) Array.prototype.findLastIndex = originalFindLastIndex;
      }
    });
  });
});
