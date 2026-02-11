import { useState, useEffect } from 'react';
import { scheduleApi, teachersApi } from '../services/api';

const DAYS = [
  { value: 1, label: 'Maandag' },
  { value: 2, label: 'Dinsdag' },
  { value: 3, label: 'Woensdag' },
  { value: 4, label: 'Donderdag' },
  { value: 5, label: 'Vrijdag' },
  { value: 6, label: 'Zaterdag' },
  { value: 0, label: 'Zondag' }
];

const ScheduleManager = ({ studentId }) => {
  const [schedule, setSchedule] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    day_of_week: 1,
    time_start: '08:00',
    time_end: '08:50',
    subject: '',
    teacher_id: null,
    location: ''
  });
  const [saving, setSaving] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim()) return;

    try {
      setSaving(true);

      const data = {
        ...formData,
        student_id: studentId,
        teacher_id: formData.teacher_id || null
      };

      if (editingId) {
        await scheduleApi.update(editingId, data);
      } else {
        await scheduleApi.create(data);
      }

      // Reload schedule
      const response = await scheduleApi.getByStudent(studentId);
      setSchedule(response.data);

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Failed to save schedule entry:', error);
      alert('Kon rooster niet opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      day_of_week: entry.day_of_week,
      time_start: entry.time_start,
      time_end: entry.time_end,
      subject: entry.subject,
      teacher_id: entry.teacher_id || null,
      location: entry.location || ''
    });
    setEditingId(entry.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Weet je zeker dat je dit rooster item wilt verwijderen?')) return;

    try {
      await scheduleApi.delete(id);
      setSchedule(schedule.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error('Failed to delete schedule entry:', error);
      alert('Kon rooster item niet verwijderen. Probeer opnieuw.');
    }
  };

  const resetForm = () => {
    setFormData({
      day_of_week: 1,
      time_start: '08:00',
      time_end: '08:50',
      subject: '',
      teacher_id: null,
      location: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const groupByDay = () => {
    const grouped = {};
    DAYS.forEach((day) => {
      grouped[day.value] = schedule
        .filter((entry) => entry.day_of_week === day.value)
        .sort((a, b) => a.time_start.localeCompare(b.time_start));
    });
    return grouped;
  };

  if (loading) {
    return <div className="text-center py-4">Rooster laden...</div>;
  }

  const scheduleByDay = groupByDay();

  return (
    <div className="schedule-manager">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Weekrooster</h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            + Les toevoegen
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="card mb-4 p-3 bg-light">
          <h5>{editingId ? 'Les bewerken' : 'Nieuwe les toevoegen'}</h5>
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-4 form-group">
                <label>Dag *</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) =>
                    setFormData({ ...formData, day_of_week: parseInt(e.target.value) })
                  }
                  className="form-control"
                  required
                >
                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4 form-group">
                <label>Start tijd *</label>
                <input
                  type="time"
                  value={formData.time_start}
                  onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
                  className="form-control"
                  required
                />
              </div>

              <div className="col-md-4 form-group">
                <label>Eind tijd *</label>
                <input
                  type="time"
                  value={formData.time_end}
                  onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 form-group">
                <label>Vak *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="form-control"
                  placeholder="Nederlands, Wiskunde, etc."
                  required
                />
              </div>

              <div className="col-md-6 form-group">
                <label>Docent</label>
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
                  <option value="">-- Selecteer docent --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Lokaal</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="form-control"
                placeholder="A102, B203, etc."
              />
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Opslaan...' : editingId ? 'Bijwerken' : 'Toevoegen'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
                disabled={saving}
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {schedule.length === 0 ? (
        <div className="alert alert-info">
          Geen rooster items. Klik op "Les toevoegen" om te beginnen.
        </div>
      ) : (
        <div className="schedule-grid">
          {DAYS.map((day) => (
            <div key={day.value} className="mb-4">
              <h5 className="border-bottom pb-2">{day.label}</h5>
              {scheduleByDay[day.value].length === 0 ? (
                <p className="text-muted">Geen lessen</p>
              ) : (
                <div className="list-group">
                  {scheduleByDay[day.value].map((entry) => (
                    <div
                      key={entry.id}
                      className="list-group-item d-flex justify-content-between align-items-start"
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="badge bg-primary">
                            {entry.time_start} - {entry.time_end}
                          </span>
                          <strong>{entry.subject}</strong>
                          {entry.location && (
                            <span className="badge bg-secondary">{entry.location}</span>
                          )}
                        </div>
                        {entry.teacher_id && (
                          <div className="text-muted small">
                            Docent:{' '}
                            {teachers.find((t) => t.id === entry.teacher_id)?.name ||
                              'Onbekend'}
                          </div>
                        )}
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="btn btn-sm btn-outline-primary"
                        >
                          Bewerken
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="btn btn-sm btn-outline-danger"
                        >
                          Verwijderen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
