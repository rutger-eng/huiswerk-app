import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStudent, useHomework, useTelegramStatus, useTelegramLink } from '../hooks';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, SkeletonCard, Badge } from './ui';
import HomeworkList from './HomeworkList';

export default function Dashboard() {
  const { id } = useParams();
  const toast = useToast();

  // Custom hooks voor data fetching
  const { loading: studentLoading, error: studentError, data: student, execute: refetchStudent } = useStudent(id);
  const { loading: homeworkLoading, error: homeworkError, data: homework, execute: refetchHomework } = useHomework(id);
  const { data: telegramStatus, execute: refetchTelegram } = useTelegramStatus(id);
  const { data: linkCodeData, execute: generateLink } = useTelegramLink(id, false);

  // Show error toasts
  useEffect(() => {
    if (studentError) toast.error('Fout bij ophalen student gegevens');
    if (homeworkError) toast.error('Fout bij ophalen huiswerk');
  }, [studentError, homeworkError]);

  const handleGenerateLinkCode = async () => {
    try {
      await generateLink();
      toast.success('Link code gegenereerd');
      refetchTelegram();
    } catch (err) {
      toast.error('Fout bij genereren link code');
    }
  };

  // Callbacks voor HomeworkList (voor refetch na updates)
  const handleToggleComplete = () => {
    refetchHomework();
    refetchStudent();
  };

  const handleDeleteHomework = () => {
    refetchHomework();
    refetchStudent();
  };

  // Loading state met skeleton - BENTO GRID
  if (studentLoading || homeworkLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/" className="text-sm text-blue-600 hover:text-blue-800 mb-2 block">
              ← Terug naar overzicht
            </Link>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <SkeletonCard lines={5} />
        </main>
      </div>
    );
  }

  const todayHomework = (homework || []).filter(
    (hw) => new Date(hw.deadline).toDateString() === new Date().toDateString()
  );

  const pendingHomework = (homework || []).filter((hw) => !hw.completed);

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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.location.href = `/student/${id}/calendar`}
              >
                Kalender
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `/student/${id}/parse`}
              >
                Tekst Plakken
              </Button>
              <Button
                size="sm"
                onClick={() => window.location.href = `/student/${id}/add`}
              >
                + Huiswerk
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Homework */}
          <Card>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Vandaag</h3>
            <p className="text-3xl font-bold text-gray-900">{todayHomework.length}</p>
            <p className="text-sm text-gray-500 mt-1">
              {todayHomework.filter((hw) => hw.completed).length} afgerond
            </p>
          </Card>

          {/* Total Homework */}
          <Card>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Totaal Openstaand</h3>
            <p className="text-3xl font-bold text-gray-900">{pendingHomework.length}</p>
            <p className="text-sm text-gray-500 mt-1">van {(homework || []).length} totaal</p>
          </Card>

          {/* Telegram Status - Larger card */}
          <Card className="md:col-span-2 lg:col-span-1">
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
                <Badge variant="warning" className="mb-2">Niet gekoppeld</Badge>
                {linkCodeData?.linkCode || telegramStatus?.linkCode ? (
                  <div className="bg-blue-50 p-3 rounded mt-2">
                    <p className="text-sm text-gray-700 mb-1">Link code:</p>
                    <p className="text-lg font-mono font-bold text-blue-600">
                      {linkCodeData?.linkCode || telegramStatus.linkCode}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      Stuur op Telegram: <code className="bg-white px-2 py-1 rounded">/start {linkCodeData?.linkCode || telegramStatus.linkCode}</code>
                    </p>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateLinkCode}
                  >
                    Genereer link code
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Today's Homework Card - Full width */}
        {todayHomework.length > 0 && (
          <Card title="Huiswerk voor Vandaag" className="mb-8">
            <div className="divide-y divide-gray-200">
              {todayHomework.map((hw) => (
                <div
                  key={hw.id}
                  className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 -mx-2 rounded transition-colors"
                >
                  <div className="flex items-center flex-1">
                    <input
                      type="checkbox"
                      checked={hw.completed === 1}
                      onChange={() => {
                        handleToggleComplete();
                      }}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
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
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* All Homework */}
        <Card title="Al het Huiswerk">
          <HomeworkList
            homework={homework || []}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteHomework}
          />
        </Card>
      </main>
    </div>
  );
}
