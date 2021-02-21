import { describe, expect, beforeEach, afterEach, test, } from '@jest/globals';
import { cleanDocumentKeys } from '../../src/lib/utils';

import ops from '../data/ops.json';
import bpp from '../data/bpp.json';

describe('cleanDocumentKeys', () => {
  test('cleanDocumentKeys simple', () => {
    const cleanDoc = cleanDocumentKeys({
      '0.02': 123123,
    });
    expect(typeof cleanDoc).toBe('object');
    expect(cleanDoc['0-02']).toBe(123123);
  });

  test('cleanDocumentKeys not so simple', () => {
    const cleanDoc = cleanDocumentKeys({
      '0.02': 123123,
      '0.32': {
        '0.42': '0.34',
        '0.77': {
          '0.234': 'test',
        }
      }
    });
    expect(typeof cleanDoc).toBe('object');
    expect(cleanDoc['0-02']).toBe(123123);
    expect(typeof cleanDoc['0-32']).toBe('object');
    expect(cleanDoc['0-32']['0-42']).toBe('0.34');
    expect(typeof cleanDoc['0-32']['0-77']).toBe('object');
    expect(cleanDoc['0-32']['0-77']['0-234']).toBe('test');
  });

  test('cleanDocumentKeys bpp', () => {
    bpp.forEach((b) => {
      const cleanDoc = cleanDocumentKeys(b);
      expect(typeof cleanDoc).toBe('object');
      expect(cleanDoc).toEqual(b);
    });
  });

  test('cleanDocumentKeys ops', () => {
    ops.forEach((o) => {
      const cleanDoc = cleanDocumentKeys(o);
      expect(typeof cleanDoc).toBe('object');
      expect(cleanDoc).toEqual(o);
    });
  });
});
