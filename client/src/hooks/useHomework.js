import { useAsync } from './useAsync';
import { homeworkApi } from '../services/api';

/**
 * Hook voor het ophalen van alle homework van een student
 * @param {number} studentId - Student ID
 * @param {boolean} immediate - Immediate fetch (default: true)
 */
export function useHomework(studentId, immediate = true) {
  return useAsync(() => homeworkApi.getByStudent(studentId), immediate);
}

/**
 * Hook voor het ophalen van vandaag's homework
 * @param {number} studentId - Student ID
 * @param {boolean} immediate - Immediate fetch (default: true)
 */
export function useHomeworkToday(studentId, immediate = true) {
  return useAsync(() => homeworkApi.getTodayByStudent(studentId), immediate);
}

/**
 * Hook voor het ophalen van deze week's homework
 * @param {number} studentId - Student ID
 * @param {boolean} immediate - Immediate fetch (default: true)
 */
export function useHomeworkWeek(studentId, immediate = true) {
  return useAsync(() => homeworkApi.getWeekByStudent(studentId), immediate);
}
