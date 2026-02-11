import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { studentsApi, homeworkApi } from '../services/api';
import HomeworkList from './HomeworkList';

export default function Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [homework, setHomework] = useState([]);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [linkCode, setLinkCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudentData();
    fetchTelegramStatus();
  }, [id]);

  const fetchStudentData = async () => {
    try {
      const [studentRes, homeworkRes] = await Promise.all([
        studentsApi.getById(id),
        homeworkApi.getByStudent(id)
      ]);

      setStudent(studentRes.data);
      setHomework(homeworkRes.data);
    } catch (err) {
      setError('Fout bij ophalen gegevens');
    } finally {
      setLoading(false);
    }
  };

  const fetchTelegramStatus = async () => {
    try {
      const response = await studentsApi.getTelegramStatus(id);
      setTelegramStatus(response.data);
    } catch (err) {
      console.error('Error fetching Telegram status:', err);
    }
  };

  const generateLinkCode = async () => {
    try {
      const response = await studentsApi.getTelegramLink(id);
      setLinkCode(response.data.linkCode);
      fetchTelegramStatus();
    } catch (err) {
      setError('Fout bij genereren link code');
    }
  };

  const handleToggleComplete = async (homeworkId, completed) => {
    try {
      await homeworkApi.update(homeworkId, { completed: !completed });
      fetchStudentData();
    } catch (err) {
      setError('Fout bij updaten huiswerk');
    }
  };

  const handleDeleteHomework = async (homeworkId) => {
    if (!confirm('Weet je zeker dat je dit huiswerk wilt verwijderen?')) return;

    try {
      await homeworkApi.delete(homeworkId);
      fetchStudentData();
    } catch (err) {
      setError('Fout bij verwijderen huiswerk');
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

  const todayHomework = homework.filter(
    (hw) => new Date(hw.deadline).toDateString() === new Date().toDateString()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link to="/" className="text-sm text-blue-600 hover:text-blue-800 mb-2 block">
                ← Terug naar overzicht
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{student?.name}</h1>
            </div>
            <div className="flex gap-3">
              <Link
                to={`/student/${id}/calendar`}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Kalender
              </Link>
              <Link
                to={`/student/${id}/parse`}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Tekst Plakken
              </Link>
              <Link
                to={`/student/${id}/add`}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Huiswerk
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Today's Homework */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Vandaag</h3>
            <p className="text-3xl font-bold text-gray-900">{todayHomework.length}</p>
            <p className="text-sm text-gray-500 mt-1">
              {todayHomework.filter((hw) => hw.completed).length} afgerond
            </p>
          </div>

          {/* Total Homework */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Totaal Openstaand</h3>
            <p className="text-3xl font-bold text-gray-900">
              {homework.filter((hw) => !hw.completed).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">van {homework.length} totaal</p>
          </div>

          {/* Telegram Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Telegram</h3>
            {telegramStatus?.linked ? (
              <div>
                <p className="text-green-600 font-medium flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Gekoppeld
                </p>
                <p className="text-sm text-gray-500 mt-1">Ontvangt dagelijkse updates</p>
              </div>
            ) : (
              <div>
                <p className="text-orange-600 font-medium mb-2">Niet gekoppeld</p>
                {linkCode || telegramStatus?.linkCode ? (
                  <div className="bg-blue-50 p-3 rounded mt-2">
                    <p className="text-sm text-gray-700 mb-1">Link code:</p>
                    <p className="text-lg font-mono font-bold text-blue-600">
                      {linkCode || telegramStatus.linkCode}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      Stuur op Telegram: /start {linkCode || telegramStatus.linkCode}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={generateLinkCode}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Genereer link code
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Today's Homework */}
        {todayHomework.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Huiswerk voor Vandaag</h2>
            <div className="bg-white rounded-lg shadow">
              {todayHomework.map((hw) => (
                <div
                  key={hw.id}
                  className="p-4 border-b border-gray-200 last:border-b-0 flex items-center justify-between"
                >
                  <div className="flex items-center flex-1">
                    <input
                      type="checkbox"
                      checked={hw.completed === 1}
                      onChange={() => handleToggleComplete(hw.id, hw.completed)}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="ml-4">
                      <h3
                        className={`font-medium ${
                          hw.completed ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {hw.subject}
                      </h3>
                      <p className="text-sm text-gray-600">{hw.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteHomework(hw.id)}
                    className="text-red-600 hover:text-red-800 text-sm ml-4"
                  >
                    Verwijder
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Homework */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Al het Huiswerk</h2>
          <HomeworkList
            homework={homework}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteHomework}
          />
        </div>
      </main>
    </div>
  );
}
