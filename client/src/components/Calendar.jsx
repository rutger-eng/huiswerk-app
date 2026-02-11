import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { studentsApi, homeworkApi } from '../services/api';

const locales = {
  nl: nl
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

// Subject colors for calendar
const subjectColors = {
  nederlands: '#EF4444',
  engels: '#3B82F6',
  wiskunde: '#8B5CF6',
  natuurkunde: '#10B981',
  scheikunde: '#F59E0B',
  biologie: '#14B8A6',
  geschiedenis: '#6366F1',
  aardrijkskunde: '#EC4899',
  economie: '#F97316',
  default: '#6B7280'
};

function getSubjectColor(subject) {
  const normalized = subject.toLowerCase();
  return subjectColors[normalized] || subjectColors.default;
}

export default function Calendar() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [homework, setHomework] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
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

  const handleToggleComplete = async (homeworkId, completed) => {
    try {
      await homeworkApi.update(homeworkId, { completed: !completed });
      fetchData();
      setSelectedEvent(null);
    } catch (err) {
      setError('Fout bij updaten huiswerk');
    }
  };

  const handleDeleteHomework = async (homeworkId) => {
    if (!confirm('Weet je zeker dat je dit huiswerk wilt verwijderen?')) return;

    try {
      await homeworkApi.delete(homeworkId);
      fetchData();
      setSelectedEvent(null);
    } catch (err) {
      setError('Fout bij verwijderen huiswerk');
    }
  };

  // Convert homework to calendar events
  const events = homework.map((hw) => ({
    id: hw.id,
    title: hw.subject,
    start: new Date(hw.deadline),
    end: new Date(hw.deadline),
    resource: hw
  }));

  // Custom event style
  const eventStyleGetter = (event) => {
    const homework = event.resource;
    const backgroundColor = getSubjectColor(homework.subject);
    const opacity = homework.completed ? 0.5 : 1;

    return {
      style: {
        backgroundColor,
        opacity,
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        fontSize: '0.875rem',
        padding: '2px 4px'
      }
    };
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
              <Link to={`/student/${id}`} className="text-sm text-blue-600 hover:text-blue-800 mb-2 block">
                ← Terug
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Kalender - {student?.name}</h1>
            </div>
            <div className="flex gap-3">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div style={{ height: '600px' }}>
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                culture="nl"
                messages={{
                  today: 'Vandaag',
                  previous: 'Vorige',
                  next: 'Volgende',
                  month: 'Maand',
                  week: 'Week',
                  day: 'Dag',
                  agenda: 'Agenda',
                  date: 'Datum',
                  time: 'Tijd',
                  event: 'Huiswerk',
                  noEventsInRange: 'Geen huiswerk in deze periode'
                }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event) => setSelectedEvent(event.resource)}
              />
            </div>
          </div>

          {/* Event Details Sidebar */}
          <div className="lg:col-span-1">
            {selectedEvent ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Details</h3>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: getSubjectColor(selectedEvent.subject) }}
                      ></div>
                      <h4 className="font-medium text-gray-900">{selectedEvent.subject}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{selectedEvent.description || 'Geen beschrijving'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Deadline:</span>{' '}
                      {format(new Date(selectedEvent.deadline), 'EEEE d MMMM yyyy', { locale: nl })}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Status:</span>{' '}
                      {selectedEvent.completed ? (
                        <span className="text-green-600">Afgerond</span>
                      ) : (
                        <span className="text-orange-600">Nog te doen</span>
                      )}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <button
                      onClick={() => handleToggleComplete(selectedEvent.id, selectedEvent.completed)}
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {selectedEvent.completed ? 'Markeer als nog te doen' : 'Markeer als afgerond'}
                    </button>
                    <button
                      onClick={() => handleDeleteHomework(selectedEvent.id)}
                      className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Legenda</h3>
                <div className="space-y-2">
                  {Object.entries(subjectColors)
                    .filter(([key]) => key !== 'default')
                    .map(([subject, color]) => (
                      <div key={subject} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
                        <span className="text-sm text-gray-700 capitalize">{subject}</span>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Klik op een huiswerk item om details te zien en te bewerken.
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Overzicht</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Totaal:</span>
                  <span className="text-sm font-medium">{homework.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Afgerond:</span>
                  <span className="text-sm font-medium text-green-600">
                    {homework.filter((hw) => hw.completed).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Nog te doen:</span>
                  <span className="text-sm font-medium text-orange-600">
                    {homework.filter((hw) => !hw.completed).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
