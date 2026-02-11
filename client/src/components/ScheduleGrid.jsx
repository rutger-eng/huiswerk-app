import { useState, useEffect } from 'react';
import { scheduleApi, teachersApi } from '../services/api';

const DAYS = [
  { value: 1, label: 'Ma', fullLabel: 'Maandag' },
  { value: 2, label: 'Di', fullLabel: 'Dinsdag' },
  { value: 3, label: 'Wo', fullLabel: 'Woensdag' },
  { value: 4, label: 'Do', fullLabel: 'Donderdag' },
  { value: 5, label: 'Vr', fullLabel: 'Vrijdag' }
];

// Generate time slots (8:00 - 17:00)
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour < 17; hour++) {
    slots.push({
      start: `${hour.toString().padStart(2, '0')}:00`,
      end: `${hour.toString().padStart(2, '0')}:50`
    });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const ScheduleGrid = ({ studentId, onImportClick }) => {
  const [schedule, setSchedule] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [scheduleRes, teachersRes] = await Promise.all([
        scheduleApi.getByStudent(studentId),
        teachersApi.getByStudent(studentId)
      ]);
      setSchedule(scheduleRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  // Find lesson for specific day and time slot
  const findLesson = (dayOfWeek, timeSlot) => {
    return schedule.find(
      (lesson) =>
        lesson.day_of_week === dayOfWeek &&
        lesson.time_start === timeSlot.start &&
        lesson.time_end === timeSlot.end
    );
  };

  const handleCellClick = (day, timeSlot) => {
    const lesson = findLesson(day.value, timeSlot);
    if (lesson) {
      setEditingCell({ lesson, day, timeSlot });
    } else {
      // Create new lesson
      setEditingCell({ lesson: null, day, timeSlot });
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!confirm('Weet je zeker dat je deze les wilt verwijderen?')) return;

    try {
      await scheduleApi.delete(lessonId);
      await loadData();
      setEditingCell(null);
    } catch (error) {
      console.error('Failed to delete lesson:', error);
      alert('Kon les niet verwijderen. Probeer opnieuw.');
    }
  };

  const handleSaveLesson = async (lessonData) => {
    try {
      if (editingCell.lesson) {
        // Update existing
        await scheduleApi.update(editingCell.lesson.id, lessonData);
      } else {
        // Create new
        await scheduleApi.create({
          student_id: studentId,
          day_of_week: editingCell.day.value,
          time_start: editingCell.timeSlot.start,
          time_end: editingCell.timeSlot.end,
          ...lessonData
        });
      }
      await loadData();
      setEditingCell(null);
    } catch (error) {
      console.error('Failed to save lesson:', error);
      alert('Kon les niet opslaan. Probeer opnieuw.');
    }
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? teacher.name : '';
  };

  if (loading) {
    return <div className="text-center py-4">Rooster laden...</div>;
  }

  return (
    <div className="schedule-grid-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Weekrooster</h3>
        <button onClick={onImportClick} className="btn btn-primary">
          📸 Rooster Importeren
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered schedule-grid">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Tijd</th>
              {DAYS.map((day) => (
                <th key={day.value} className="text-center">
                  {day.fullLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((timeSlot, index) => (
              <tr key={index}>
                <td className="time-slot">
                  <small>
                    {timeSlot.start}
                    <br />
                    {timeSlot.end}
                  </small>
                </td>
                {DAYS.map((day) => {
                  const lesson = findLesson(day.value, timeSlot);
                  const cellKey = `${day.value}-${timeSlot.start}`;
                  const isHovered = hoveredCell === cellKey;

                  return (
                    <td
                      key={day.value}
                      className={`schedule-cell ${lesson ? 'has-lesson' : 'empty-cell'} ${
                        isHovered ? 'hovered' : ''
                      }`}
                      onClick={() => handleCellClick(day, timeSlot)}
                      onMouseEnter={() => setHoveredCell(cellKey)}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {lesson ? (
                        <div className="lesson-content">
                          <div className="lesson-subject">
                            <strong>{lesson.subject}</strong>
                          </div>
                          {lesson.teacher_id && (
                            <div className="lesson-teacher text-muted small">
                              {getTeacherName(lesson.teacher_id)}
                            </div>
                          )}
                          {lesson.location && (
                            <div className="lesson-location text-muted small">
                              📍 {lesson.location}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="empty-cell-hint text-muted">
                          {isHovered && <small>+ Klik om toe te voegen</small>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingCell && (
        <LessonEditModal
          lesson={editingCell.lesson}
          day={editingCell.day}
          timeSlot={editingCell.timeSlot}
          teachers={teachers}
          onSave={handleSaveLesson}
          onDelete={handleDeleteLesson}
          onClose={() => setEditingCell(null)}
        />
      )}

      <style jsx>{`
        .schedule-grid {
          font-size: 0.9rem;
        }

        .schedule-grid th {
          background-color: #f8f9fa;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .time-slot {
          background-color: #f8f9fa;
          text-align: center;
          vertical-align: middle;
          font-weight: 500;
        }

        .schedule-cell {
          height: 70px;
          vertical-align: middle;
          position: relative;
          transition: all 0.2s;
        }

        .schedule-cell.has-lesson {
          background-color: #e3f2fd;
        }

        .schedule-cell.has-lesson:hover {
          background-color: #bbdefb;
        }

        .schedule-cell.empty-cell:hover {
          background-color: #f5f5f5;
        }

        .lesson-content {
          padding: 4px;
        }

        .lesson-subject {
          font-size: 0.85rem;
          margin-bottom: 2px;
        }

        .lesson-teacher,
        .lesson-location {
          font-size: 0.75rem;
          line-height: 1.2;
        }

        .empty-cell-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

// Lesson Edit Modal Component
const LessonEditModal = ({ lesson, day, timeSlot, teachers, onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState({
    subject: lesson?.subject || '',
    teacher_id: lesson?.teacher_id || null,
    location: lesson?.location || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim()) return;

    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {lesson ? 'Les Bewerken' : 'Nieuwe Les'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">
                  <strong>{day.fullLabel}</strong> • {timeSlot.start} - {timeSlot.end}
                </label>
              </div>

              <div className="mb-3">
                <label className="form-label">Vak *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="form-control"
                  placeholder="Nederlands, Wiskunde, etc."
                  required
                  autoFocus
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Docent</label>
                <select
                  value={formData.teacher_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      teacher_id: e.target.value ? parseInt(e.target.value) : null
                    })
                  }
                  className="form-control"
                >
                  <option value="">-- Geen docent --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Lokaal</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="form-control"
                  placeholder="A102, B203, etc."
                />
              </div>
            </div>

            <div className="modal-footer">
              {lesson && (
                <button
                  type="button"
                  onClick={() => onDelete(lesson.id)}
                  className="btn btn-danger me-auto"
                >
                  Verwijderen
                </button>
              )}
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuleren
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;
