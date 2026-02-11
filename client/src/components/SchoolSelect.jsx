import { useState, useEffect } from 'react';
import { schoolsApi } from '../services/api';

const SchoolSelect = ({ value, onChange, required = false }) => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchool, setNewSchool] = useState({
    name: '',
    address: '',
    postal_code: '',
    city: '',
    website: ''
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const response = await schoolsApi.getAll();
      setSchools(response.data);
    } catch (error) {
      console.error('Failed to load schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    if (!newSchool.name.trim()) return;

    try {
      setAdding(true);
      const response = await schoolsApi.create(newSchool);
      const addedSchool = response.data.school;

      // Add to list and select it
      setSchools([...schools, addedSchool]);
      onChange(addedSchool.id);

      // Reset form
      setNewSchool({
        name: '',
        address: '',
        postal_code: '',
        city: '',
        website: ''
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add school:', error);
      alert('Kon school niet toevoegen. Probeer opnieuw.');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="form-group">
        <label>School</label>
        <select disabled className="form-control">
          <option>Laden...</option>
        </select>
      </div>
    );
  }

  return (
    <div className="form-group">
      <label>
        School {required && <span className="text-danger">*</span>}
      </label>

      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className="form-control mb-2"
        required={required}
      >
        <option value="">-- Selecteer school --</option>
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name} {school.city && `(${school.city})`}
          </option>
        ))}
      </select>

      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="btn btn-sm btn-outline-secondary"
        >
          + Nieuwe school toevoegen
        </button>
      ) : (
        <div className="card mt-2 p-3">
          <form onSubmit={handleAddSchool}>
            <div className="form-group">
              <label>Schoolnaam *</label>
              <input
                type="text"
                value={newSchool.name}
                onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                className="form-control form-control-sm"
                required
                autoFocus
              />
            </div>

            <div className="row">
              <div className="col-md-8 form-group">
                <label>Adres</label>
                <input
                  type="text"
                  value={newSchool.address}
                  onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                  className="form-control form-control-sm"
                />
              </div>
              <div className="col-md-4 form-group">
                <label>Postcode</label>
                <input
                  type="text"
                  value={newSchool.postal_code}
                  onChange={(e) => setNewSchool({ ...newSchool, postal_code: e.target.value })}
                  className="form-control form-control-sm"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Plaats</label>
              <input
                type="text"
                value={newSchool.city}
                onChange={(e) => setNewSchool({ ...newSchool, city: e.target.value })}
                className="form-control form-control-sm"
              />
            </div>

            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                value={newSchool.website}
                onChange={(e) => setNewSchool({ ...newSchool, website: e.target.value })}
                className="form-control form-control-sm"
                placeholder="https://"
              />
            </div>

            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-sm btn-primary"
                disabled={adding || !newSchool.name.trim()}
              >
                {adding ? 'Toevoegen...' : 'School toevoegen'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSchool({
                    name: '',
                    address: '',
                    postal_code: '',
                    city: '',
                    website: ''
                  });
                }}
                className="btn btn-sm btn-secondary"
                disabled={adding}
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SchoolSelect;
