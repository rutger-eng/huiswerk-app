import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { homeworkApi } from '../services/api';

export default function TextParser() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [text, setText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) {
      setError('Plak eerst wat tekst');
      return;
    }

    setParsing(true);
    setError('');

    try {
      const response = await homeworkApi.parse(text);
      setParsedItems(response.data.items);

      if (response.data.items.length === 0) {
        setError('Geen huiswerk gevonden in de tekst. Probeer het opnieuw met een andere tekst.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Fout bij parsen van tekst');
    } finally {
      setParsing(false);
    }
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...parsedItems];
    updated[index][field] = value;
    setParsedItems(updated);
  };

  const handleRemoveItem = (index) => {
    setParsedItems(parsedItems.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (parsedItems.length === 0) return;

    setSaving(true);
    setError('');

    try {
      await homeworkApi.createBatch(id, parsedItems);
      navigate(`/student/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Fout bij opslaan huiswerk');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to={`/student/${id}`} className="text-sm text-blue-600 hover:text-blue-800 mb-2 block">
            ← Terug
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Tekst Plakken & Parsen</h1>
          <p className="text-sm text-gray-600 mt-1">
            Plak huiswerk tekst van Magister of leraren en laat de app het automatisch herkennen
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Text Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stap 1: Plak je huiswerk tekst</h2>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Plak hier je huiswerk tekst...

Bijvoorbeeld:
- Engels: Werkblad 5 maken - morgen
- Wiskunde: Opdrachten 12 t/m 20 - vrijdag
- Nederlands: Boek lezen tot pagina 50 - volgende week maandag"
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleParse}
              disabled={parsing || !text.trim()}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {parsing ? 'Bezig met parsen...' : 'Parse Tekst'}
            </button>
            <button
              onClick={() => {
                setText('');
                setParsedItems([]);
                setError('');
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Wissen
            </button>
          </div>
        </div>

        {/* Parsed Results */}
        {parsedItems.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Stap 2: Controleer en bewerk ({parsedItems.length} items gevonden)
              </h2>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : 'Alles Opslaan'}
              </button>
            </div>

            <div className="space-y-4">
              {parsedItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-500">Item {index + 1}</span>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Verwijder
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vak</label>
                      <input
                        type="text"
                        value={item.subject}
                        onChange={(e) => handleUpdateItem(index, 'subject', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* Deadline */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                      <input
                        type="date"
                        value={item.deadline}
                        onChange={(e) => handleUpdateItem(index, 'deadline', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Beschrijving
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Optioneel"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : `${parsedItems.length} Items Opslaan`}
              </button>
              <Link
                to={`/student/${id}`}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-center"
              >
                Annuleren
              </Link>
            </div>
          </div>
        )}

        {/* Examples */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Voorbeelden van tekst formaten</h3>
          <div className="space-y-4 text-sm text-blue-800">
            <div>
              <p className="font-medium mb-1">Simpele lijst:</p>
              <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`Engels: Werkblad 5 maken - morgen
Wiskunde: Hoofdstuk 3 lezen - vrijdag
Nederlands: Opstel schrijven - volgende week`}
              </pre>
            </div>

            <div>
              <p className="font-medium mb-1">Met bullets:</p>
              <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`• Biologie - Paragraaf 2.3 leren voor woensdag
• Geschiedenis - Opdrachten 1-5 maken tegen donderdag
• Frans - Woordjes leren voor de toets morgen`}
              </pre>
            </div>

            <div>
              <p className="font-medium mb-1">Magister stijl:</p>
              <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`WISK: Les 3 t/m 5, opgaven 1-10 - 15 maart
NED: Boek uitlezen + samenvatting - 18-03
ENG: Study vocabulary unit 4 - Friday`}
              </pre>
            </div>
          </div>

          <p className="text-xs text-blue-700 mt-4">
            💡 De parser herkent automatisch vakken, datums (morgen, vrijdag, 15 maart, etc.) en
            beschrijvingen. Pas de resultaten altijd even na!
          </p>
        </div>
      </main>
    </div>
  );
}
