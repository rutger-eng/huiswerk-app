import { useState, useEffect, useCallback } from 'react';

/**
 * Generic async handler - vervangt 40+ duplicated useState patterns
 *
 * @param {Function} asyncFunction - Async function to execute
 * @param {boolean} immediate - Execute immediately on mount (default: true)
 * @returns {Object} { loading, error, data, execute }
 */
export function useAsync(asyncFunction, immediate = true) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFunction(...args);
      setData(result.data);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { loading, error, data, execute };
}
