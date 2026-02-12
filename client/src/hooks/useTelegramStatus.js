import { useAsync } from './useAsync';
import { studentsApi, authApi } from '../services/api';

/**
 * Hook voor het ophalen van Telegram status van een student
 * @param {number} studentId - Student ID (optional - voor parent status laat leeg)
 * @param {boolean} immediate - Immediate fetch (default: true)
 */
export function useTelegramStatus(studentId = null, immediate = true) {
  const fetchFn = studentId
    ? () => studentsApi.getTelegramStatus(studentId)
    : () => authApi.getTelegramStatus();

  return useAsync(fetchFn, immediate);
}

/**
 * Hook voor het genereren van een Telegram link code
 * @param {number} studentId - Student ID (optional - voor parent link laat leeg)
 * @param {boolean} immediate - Immediate fetch (default: false)
 */
export function useTelegramLink(studentId = null, immediate = false) {
  const fetchFn = studentId
    ? () => studentsApi.getTelegramLink(studentId)
    : () => authApi.getTelegramLink();

  return useAsync(fetchFn, immediate);
}
