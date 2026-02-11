import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { studentsApi, authApi } from '../../services/api';

export default function ParentDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [parentLinkCode, setParentLinkCode] = useState(null);

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
    fetchTelegramStatus();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await studentsApi.getAll();
      setStudents(response.data);
    } catch (err) {
      setError('Fout bij ophalen studenten');
    } finally {
      setLoading(false);
    }
  };

  const fetchTelegramStatus = async () => {
    try {
      const response = await authApi.getTelegramStatus();
      setTelegramStatus(response.data);
    } catch (err) {
      console.error('Error fetching Telegram status:', err);
    }
  };

  const generateParentLinkCode = async () => {
    try {
      const response = await authApi.getTelegramLink();
      setParentLinkCode(response.data.linkCode);
      fetchTelegramStatus();
    } catch (err) {
      setError('Fout bij genereren link code');
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    setAddingStudent(true);
    try {
      await studentsApi.create({ name: newStudentName });
      setNewStudentName('');
      setShowAddForm(false);
      fetchStudents();
    } catch (err) {
      setError('Fout bij toevoegen student');
    } finally {
      setAddingStudent(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Huiswerk App</h1>
              <p className="text-sm text-gray-600">Welkom, {user.name}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Parent Telegram Section */}
        {telegramStatus && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🤖 Telegram voor Ouders
                </h3>
                {telegramStatus.linked ? (
                  <div>
                    <p className="text-green-700 font-medium flex items-center mb-2">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Gekoppeld aan Telegram
                    </p>
                    <p className="text-sm text-gray-600">
                      Je kunt nu via Telegram huiswerk toevoegen en status checken!
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Commands: /status, /today, /add, /help
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 mb-3">
                      Koppel je Telegram om snel huiswerk toe te voegen en status te checken via de bot!
                    </p>
                    {parentLinkCode || telegramStatus.linkCode ? (
                      <div className="bg-white p-4 rounded border border-blue-300">
                        <p className="text-sm text-gray-700 mb-1 font-medium">Link code:</p>
                        <p className="text-2xl font-mono font-bold text-blue-600 mb-2">
                          {parentLinkCode || telegramStatus.linkCode}
                        </p>
                        <p className="text-sm text-gray-600">
                          Stuur op Telegram naar je bot: <code className="bg-gray-100 px-2 py-1 rounded">/link {parentLinkCode || telegramStatus.linkCode}</code>
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={generateParentLinkCode}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Genereer Link Code
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Mijn Kinderen</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showAddForm ? 'Annuleren' : '+ Voeg Kind Toe'}
          </button>
        </div>

        {/* Add Student Form */}
        {showAddForm && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nieuw Kind Toevoegen</h3>
            <form onSubmit={handleAddStudent} className="flex gap-4">
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Naam van kind"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <button
                type="submit"
                disabled={addingStudent}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {addingStudent ? 'Toevoegen...' : 'Toevoegen'}
              </button>
            </form>
          </div>
        )}

        {/* Students Grid */}
        {students.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Geen kinderen toegevoegd</h3>
            <p className="mt-1 text-sm text-gray-500">Voeg je eerste kind toe om te beginnen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <div
                key={student.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/student/${student.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                      {(student.year || student.level) && (
                        <p className="text-sm text-gray-500 mt-1">
                          {student.year && `Leerjaar ${student.year}`}
                          {student.year && student.level && ' • '}
                          {student.level && student.level.toUpperCase()}
                        </p>
                      )}
                    </div>
                    {student.telegram_linked ? (
                      <span className="flex items-center text-green-600 text-sm">
                        <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Telegram
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Geen Telegram</span>
                    )}
                  </div>

                  {/* Homework Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Vandaag:</span>
                      <span className="text-sm font-medium">
                        {student.todayHomework.completed} / {student.todayHomework.total}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            student.todayHomework.total > 0
                              ? (student.todayHomework.completed / student.todayHomework.total) * 100
                              : 0
                          }%`
                        }}
                      ></div>
                    </div>

                    {student.todayHomework.remaining > 0 ? (
                      <p className="text-sm text-orange-600">
                        {student.todayHomework.remaining} nog te doen
                      </p>
                    ) : student.todayHomework.total > 0 ? (
                      <p className="text-sm text-green-600">Alles af!</p>
                    ) : (
                      <p className="text-sm text-gray-500">Geen huiswerk vandaag</p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student/${student.id}`);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Bekijk details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
