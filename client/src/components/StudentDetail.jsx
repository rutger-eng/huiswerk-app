import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentsApi, schoolsApi } from '../services/api';
import SchoolSelect from './SchoolSelect';
import ScheduleGrid from './ScheduleGrid';
import ScheduleImportWizard from './ScheduleImportWizard';

const LEVELS = [
  { value: 'vmbo-basis', label: 'VMBO Basis' },
  { value: 'vmbo-kader', label: 'VMBO Kader' },
  { value: 'vmbo-tl', label: 'VMBO TL' },
  { value: 'havo', label: 'HAVO' },
  { value: 'vwo', label: 'VWO' },
  { value: 'mbo', label: 'MBO' },
  { value: 'anders', label: 'Anders' }
];

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    year: null,
    level: '',
    birth_date: '',
    school_id: null
  });
  const [saving, setSaving] = useState(false);
  const [scheduleKey, setScheduleKey] = useState(0);

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const response = await studentsApi.getById(id);
      const studentData = response.data;
      setStudent(studentData);

      setFormData({
        name: studentData.name,
        year: studentData.year || null,
        level: studentData.level || '',
        birth_date: studentData.birth_date || '',
        school_id: studentData.school_id || null
      });

      // Load school if assigned
      if (studentData.school_id) {
        try {
          const schoolRes = await schoolsApi.getById(studentData.school_id);
          setSchool(schoolRes.data);
        } catch (error) {
          console.error('Failed to load school:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load student:', error);
      alert('Kon student niet laden');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);
      await studentsApi.update(id, formData);
      await loadStudent();
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update student:', error);
      alert('Kon student niet bijwerken. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Weet je zeker dat je ${student.name} wilt verwijderen? Dit verwijdert ook alle huiswerk en rooster items.`
      )
    )
      return;

    try {
      await studentsApi.delete(id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete student:', error);
      alert('Kon student niet verwijderen. Probeer opnieuw.');
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">Student laden...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">Student niet gevonden</div>
      </div>
    );
  }

  const age = calculateAge(student.birth_date);

  return (
    <div className="container mt-4">
      <button onClick={() => navigate('/dashboard')} className="btn btn-link mb-3">
        ← Terug naar overzicht
      </button>

      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="mb-0">{student.name}</h2>
          <div className="d-flex gap-2">
            {!editMode ? (
              <>
                <button onClick={() => setEditMode(true)} className="btn btn-primary">
                  Bewerken
                </button>
                <button onClick={handleDelete} className="btn btn-danger">
                  Verwijderen
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="card-body">
          {editMode ? (
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Naam *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-control"
                  required
                />
              </div>

              <div className="row">
                <div className="col-md-6 form-group">
                  <label>Leerjaar</label>
                  <select
                    value={formData.year || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        year: e.target.value ? parseInt(e.target.value) : null
                      })
                    }
                    className="form-control"
                  >
                    <option value="">-- Selecteer leerjaar --</option>
                    {[1, 2, 3, 4, 5, 6].map((year) => (
                      <option key={year} value={year}>
                        Leerjaar {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 form-group">
                  <label>Niveau</label>
                  <select
                    value={formData.level || ''}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="form-control"
                  >
                    <option value="">-- Selecteer niveau --</option>
                    {LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Geboortedatum</label>
                <input
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="form-control"
                />
              </div>

              <SchoolSelect
                value={formData.school_id}
                onChange={(schoolId) => setFormData({ ...formData, school_id: schoolId })}
              />

              <div className="d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setFormData({
                      name: student.name,
                      year: student.year || null,
                      level: student.level || '',
                      birth_date: student.birth_date || '',
                      school_id: student.school_id || null
                    });
                  }}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Annuleren
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Leerjaar:</strong>{' '}
                  {student.year ? `Leerjaar ${student.year}` : 'Niet ingesteld'}
                </div>
                <div className="col-md-6">
                  <strong>Niveau:</strong>{' '}
                  {student.level
                    ? LEVELS.find((l) => l.value === student.level)?.label || student.level
                    : 'Niet ingesteld'}
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Geboortedatum:</strong>{' '}
                  {student.birth_date ? (
                    <>
                      {new Date(student.birth_date).toLocaleDateString('nl-NL')}
                      {age && ` (${age} jaar)`}
                    </>
                  ) : (
                    'Niet ingesteld'
                  )}
                </div>
                <div className="col-md-6">
                  <strong>School:</strong>{' '}
                  {school ? (
                    <>
                      {school.name}
                      {school.city && ` (${school.city})`}
                    </>
                  ) : (
                    'Niet ingesteld'
                  )}
                </div>
              </div>

              {student.telegram_linked ? (
                <div className="alert alert-success">
                  ✓ Telegram gekoppeld
                </div>
              ) : (
                <div className="alert alert-warning">
                  Telegram nog niet gekoppeld
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <ScheduleGrid
            key={scheduleKey}
            studentId={parseInt(id)}
            onImportClick={() => setShowImportWizard(true)}
          />
        </div>
      </div>

      {/* Import Wizard Modal */}
      {showImportWizard && (
        <ScheduleImportWizard
          studentId={parseInt(id)}
          onClose={() => setShowImportWizard(false)}
          onSuccess={() => {
            setScheduleKey((prev) => prev + 1); // Force reload schedule
          }}
        />
      )}
    </div>
  );
};

export default StudentDetail;
