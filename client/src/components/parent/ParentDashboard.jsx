import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { studentsApi, authApi } from '../../services/api';
import { useStudents, useTelegramStatus, useTelegramLink, useOptimistic } from '../../hooks';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, SkeletonCard, Badge, EmptyState } from '../ui';

export default function ParentDashboard() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();

  // Custom hooks voor data fetching
  const { loading, error, data: students, execute: refetchStudents } = useStudents();
  const { data: telegramStatus, execute: refetchTelegram } = useTelegramStatus(null);
  const { data: linkCodeData, execute: generateLink } = useTelegramLink(null, false);

  // Optimistic updates voor students
  const { data: optimisticStudents, performUpdate } = useOptimistic(students);

  // Show error toasts
  useEffect(() => {
    if (error) toast.error('Fout bij ophalen studenten');
  }, [error]);

  const handleGenerateLinkCode = async () => {
    try {
      await generateLink();
      toast.success('Link code gegenereerd');
      refetchTelegram();
    } catch (err) {
      toast.error('Fout bij genereren link code');
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    setAddingStudent(true);
    try {
      await performUpdate(
        [...(optimisticStudents || []), { id: Date.now(), name: newStudentName, todayHomework: { total: 0, completed: 0, remaining: 0 } }],
        async () => {
          await studentsApi.create({ name: newStudentName });
          const result = await studentsApi.getAll();
          return result.data;
        }
      );
      setNewStudentName('');
      setShowAddForm(false);
      toast.success(`${newStudentName} toegevoegd`);
    } catch (err) {
      toast.error('Fout bij toevoegen student');
    } finally {
      setAddingStudent(false);
    }
  };

  // Loading state met skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Huiswerk App</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
        </main>
      </div>
    );
  }

  const displayStudents = optimisticStudents || students || [];

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
            <Button variant="secondary" onClick={logout}>
              Uitloggen
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    {linkCodeData?.linkCode || telegramStatus.linkCode ? (
                      <div className="bg-white p-4 rounded border border-blue-300">
                        <p className="text-sm text-gray-700 mb-1 font-medium">Link code:</p>
                        <p className="text-2xl font-mono font-bold text-blue-600 mb-2">
                          {linkCodeData?.linkCode || telegramStatus.linkCode}
                        </p>
                        <p className="text-sm text-gray-600">
                          Stuur op Telegram naar je bot: <code className="bg-gray-100 px-2 py-1 rounded">/link {linkCodeData?.linkCode || telegramStatus.linkCode}</code>
                        </p>
                      </div>
                    ) : (
                      <Button onClick={handleGenerateLinkCode}>
                        Genereer Link Code
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Mijn Kinderen</h2>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Annuleren' : '+ Voeg Kind Toe'}
          </Button>
        </div>

        {/* Add Student Form */}
        {showAddForm && (
          <Card className="mb-6">
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
              <Button
                type="submit"
                variant="success"
                loading={addingStudent}
                disabled={addingStudent}
              >
                Toevoegen
              </Button>
            </form>
          </Card>
        )}

        {/* Students Grid - BENTO GRID */}
        {displayStudents.length === 0 ? (
          <EmptyState
            title="Geen kinderen toegevoegd"
            description="Voeg je eerste kind toe om te beginnen."
            icon={
              <svg
                className="h-12 w-12 text-gray-400"
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
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min">
            {displayStudents.map((student, index) => {
              // Eerste student (meeste huiswerk) krijgt 2 columns
              const isLarge = index === 0 && displayStudents.length > 2;
              const hasOverdue = student.todayHomework.remaining > 0;
              const allDone = student.todayHomework.total > 0 && student.todayHomework.remaining === 0;

              let borderColor = '';
              if (hasOverdue) borderColor = 'border-l-4 border-orange-500';
              else if (allDone) borderColor = 'border-l-4 border-green-500';

              return (
                <Card
                  key={student.id}
                  className={`${isLarge ? 'lg:col-span-2 lg:row-span-2' : ''} ${borderColor}`}
                  hoverable
                  onClick={() => navigate(`/student/${student.id}`)}
                >
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
                      <Badge variant="success">Telegram</Badge>
                    ) : (
                      <Badge variant="default">Geen Telegram</Badge>
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
                      <p className="text-sm text-orange-600 font-medium">
                        {student.todayHomework.remaining} nog te doen
                      </p>
                    ) : student.todayHomework.total > 0 ? (
                      <p className="text-sm text-green-600 font-medium">Alles af!</p>
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
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
