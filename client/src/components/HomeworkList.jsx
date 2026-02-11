import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function HomeworkList({ homework, onToggleComplete, onDelete }) {
  const [filter, setFilter] = useState('all'); // all, completed, incomplete
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('deadline'); // deadline, subject

  // Get unique subjects
  const subjects = [...new Set(homework.map((hw) => hw.subject))].sort();

  // Filter homework
  let filteredHomework = homework.filter((hw) => {
    if (filter === 'completed' && !hw.completed) return false;
    if (filter === 'incomplete' && hw.completed) return false;
    if (subjectFilter !== 'all' && hw.subject !== subjectFilter) return false;
    return true;
  });

  // Sort homework
  filteredHomework.sort((a, b) => {
    if (sortBy === 'deadline') {
      return new Date(a.deadline) - new Date(b.deadline);
    } else {
      return a.subject.localeCompare(b.subject);
    }
  });

  // Group by date
  const groupedByDate = filteredHomework.reduce((groups, hw) => {
    const date = new Date(hw.deadline).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(hw);
    return groups;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm text-gray-600 mr-2">Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Alles</option>
              <option value="incomplete">Nog te doen</option>
              <option value="completed">Afgerond</option>
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="text-sm text-gray-600 mr-2">Vak:</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Alle vakken</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="text-sm text-gray-600 mr-2">Sorteer op:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="deadline">Deadline</option>
              <option value="subject">Vak</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {filteredHomework.length} van {homework.length} items
        </div>
      </div>

      {/* Homework List */}
      {filteredHomework.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2">Geen huiswerk gevonden</p>
        </div>
      ) : sortBy === 'deadline' ? (
        // Grouped by date view
        <div>
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="border-b border-gray-200 last:border-b-0">
              <div className="bg-gray-50 px-4 py-2">
                <h3 className="text-sm font-medium text-gray-700">
                  {format(parseISO(items[0].deadline), 'EEEE d MMMM yyyy', { locale: nl })}
                </h3>
              </div>
              {items.map((hw) => (
                <HomeworkItem
                  key={hw.id}
                  homework={hw}
                  onToggleComplete={onToggleComplete}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        // Simple list view
        <div>
          {filteredHomework.map((hw) => (
            <HomeworkItem
              key={hw.id}
              homework={hw}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              showDate
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HomeworkItem({ homework, onToggleComplete, onDelete, showDate = false }) {
  const isOverdue = new Date(homework.deadline) < new Date() && !homework.completed;

  return (
    <div className="p-4 border-b border-gray-200 last:border-b-0 flex items-center justify-between hover:bg-gray-50">
      <div className="flex items-center flex-1">
        <input
          type="checkbox"
          checked={homework.completed === 1}
          onChange={() => onToggleComplete(homework.id, homework.completed)}
          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
        />
        <div className="ml-4 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={`font-medium ${
                homework.completed ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {homework.subject}
            </h3>
            {isOverdue && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Achterstallig</span>
            )}
          </div>
          <p className="text-sm text-gray-600">{homework.description}</p>
          {showDate && (
            <p className="text-xs text-gray-500 mt-1">
              {format(parseISO(homework.deadline), 'EEEE d MMMM', { locale: nl })}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(homework.id)}
        className="text-red-600 hover:text-red-800 text-sm ml-4"
      >
        Verwijder
      </button>
    </div>
  );
}
