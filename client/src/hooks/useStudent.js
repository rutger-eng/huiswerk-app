import { useAsync } from './useAsync';
import { studentsApi } from '../services/api';

/**
 * Hook voor het ophalen van alle students van de ingelogde parent
 */
export function useStudents() {
  return useAsync(() => studentsApi.getAll());
}

/**
 * Hook voor het ophalen van een specifieke student
 * @param {number} studentId - Student ID
 * @param {boolean} immediate - Immediate fetch (default: true)
 */
export function useStudent(studentId, immediate = true) {
  return useAsync(() => studentsApi.getById(studentId), immediate);
}
