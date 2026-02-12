import { useState } from 'react';

/**
 * Optimistic updates hook - immediate UI feedback met automatic rollback
 *
 * @param {any} initialData - Initial data state
 * @returns {Object} { data, performUpdate }
 */
export function useOptimistic(initialData) {
  const [data, setData] = useState(initialData);
  const [optimisticData, setOptimisticData] = useState(null);

  const performUpdate = async (optimisticValue, serverUpdate) => {
    // Set optimistic state immediately
    setOptimisticData(optimisticValue);

    try {
      // Try server update
      const result = await serverUpdate();
      // Success: update real data and clear optimistic
      setData(result);
      setOptimisticData(null);
      return result;
    } catch (error) {
      // Failure: rollback (clear optimistic data)
      setOptimisticData(null);
      throw error;
    }
  };

  return {
    data: optimisticData ?? data,
    performUpdate,
    setData
  };
}
