import { useState } from 'react';
import { scheduleApi } from '../services/api';

const DAYS_MAP = {
  maandag: 1,
  dinsdag: 2,
  woensdag: 3,
  donderdag: 4,
  vrijdag: 5,
  zaterdag: 6,
  zondag: 0,
  ma: 1,
  di: 2,
  wo: 3,
  do: 4,
  vr: 5,
  za: 6,
  zo: 0
};

const ScheduleImportWizard = ({ studentId, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Input, 2: Parse, 3: Preview, 4: Import
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [parsedSchedule, setParsedSchedule] = useState([]);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);

  // Parse schedule text
  const parseScheduleText = (text) => {
    const schedule = [];
    const lines = text.split('\n').filter((line) => line.trim());

    let currentDay = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if line is a day name
      const dayMatch = trimmedLine.toLowerCase().match(/^(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr|za|zo)/);

      if (dayMatch) {
        const dayName = dayMatch[1];
        currentDay = DAYS_MAP[dayName];
        continue;
      }

      // Parse lesson entry
      // Format: "08:00-08:50 Nederlands (Jansen) A102"
      // or: "08:00 - 08:50 | Nederlands | Jansen | A102"
      // or: "1. 08:00-08:50 Nederlands"

      if (!currentDay) continue;

      // Try multiple patterns
      const patterns = [
        // Pattern 1: "08:00-08:50 Nederlands (Jansen) A102"
        /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s+([^(]+?)(?:\s*\(([^)]+)\))?\s*(.*)$/,

        // Pattern 2: "08:00 - 08:50 | Nederlands | Jansen | A102"
        /(\d{1,2}):(\d{2})\s*[-–|]\s*(\d{1,2}):(\d{2})\s*[|]\s*([^|]+?)\s*(?:[|]\s*([^|]+?))?\s*(?:[|]\s*(.+))?$/,

        // Pattern 3: "1. 08:00-08:50 Nederlands"
        /^\d+\.\s*(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s+(.+)$/
      ];

      for (const pattern of patterns) {
        const match = trimmedLine.match(pattern);

        if (match) {
          const [_, startHour, startMin, endHour, endMin, subject, teacher, location] = match;

          schedule.push({
            day_of_week: currentDay,
            time_start: `${startHour.padStart(2, '0')}:${startMin}`,
            time_end: `${endHour.padStart(2, '0')}:${endMin}`,
            subject: subject.trim(),
            teacher_name: teacher?.trim() || null,
            location: location?.trim() || null
          });

          break;
        }
      }
    }

    return schedule;
  };

  const handleParse = () => {
    if (!textInput.trim()) {
      setParseError('Voer rooster tekst in');
      return;
    }

    try {
      const parsed = parseScheduleText(textInput);

      if (parsed.length === 0) {
        setParseError('Geen lessen gevonden. Controleer het formaat.');
        return;
      }

      setParsedSchedule(parsed);
      setParseError('');
      setStep(3); // Go to preview
    } catch (error) {
      console.error('Parse error:', error);
      setParseError('Fout bij het parsen van de tekst. Controleer het formaat.');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    // For now, show instructions to use ChatGPT
    // In future, could integrate OpenAI Vision API directly
  };

  const handleImport = async () => {
    if (parsedSchedule.length === 0) return;

    try {
      setImporting(true);

      // Delete existing schedule if replacing
      if (replaceExisting) {
        await scheduleApi.deleteAll(studentId);
      }

      // Import new schedule
      for (const lesson of parsedSchedule) {
        await scheduleApi.create({
          student_id: studentId,
          ...lesson,
          teacher_id: null // TODO: Match teacher by name if exists
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      alert('Er ging iets mis bij het importeren. Probeer opnieuw.');
    } finally {
      setImporting(false);
    }
  };

  const getDayName = (dayOfWeek) => {
    const days = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
    return days[dayOfWeek];
  };

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">📸 Rooster Importeren</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Step 1: Input Method */}
            {step === 1 && (
              <div>
                <h6 className="mb-3">Stap 1: Kies invoer methode</h6>

                <div className="alert alert-info">
                  <strong>💡 Tip:</strong> Maak een screenshot van je Magister rooster en laat
                  ChatGPT deze omzetten naar tekst in het juiste formaat.
                </div>

                <div className="mb-4">
                  <h6>Optie 1: Screenshot uploaden</h6>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="form-control mb-2"
                  />
                  {imageFile && (
                    <div className="alert alert-warning">
                      <p className="mb-2">
                        <strong>Screenshot geüpload!</strong> Volg deze stappen:
                      </p>
                      <ol className="mb-0">
                        <li>Open ChatGPT</li>
                        <li>Upload deze screenshot</li>
                        <li>
                          Vraag: "Converteer dit rooster naar het volgende formaat:
                          <br />
                          <code>
                            Maandag<br />
                            08:00-08:50 Nederlands (Docent) Lokaal<br />
                            09:00-09:50 Wiskunde (Docent) Lokaal<br />
                            etc.
                          </code>
                        </li>
                        <li>Kopieer de output en plak hieronder</li>
                      </ol>
                    </div>
                  )}
                </div>

                <div>
                  <h6>Optie 2: Tekst direct plakken</h6>
                  <button
                    onClick={() => setStep(2)}
                    className="btn btn-primary"
                  >
                    Ga verder met tekst invoer
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Text Input */}
            {step === 2 && (
              <div>
                <h6 className="mb-3">Stap 2: Plak rooster tekst</h6>

                <div className="alert alert-info">
                  <strong>Formaat voorbeelden:</strong>
                  <pre className="mb-0 mt-2" style={{ fontSize: '0.85rem' }}>
{`Maandag
08:00-08:50 Nederlands (Jansen) A102
09:00-09:50 Wiskunde (De Vries) B205

Dinsdag
08:00-08:50 Engels (Smith) A103
10:00-10:50 Biologie (Bakker) C301`}
                  </pre>
                </div>

                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="form-control"
                  rows="12"
                  placeholder="Plak hier je rooster tekst..."
                />

                {parseError && (
                  <div className="alert alert-danger mt-2">{parseError}</div>
                )}

                <div className="d-flex gap-2 mt-3">
                  <button onClick={() => setStep(1)} className="btn btn-secondary">
                    Terug
                  </button>
                  <button onClick={handleParse} className="btn btn-primary">
                    Parseren →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {step === 3 && (
              <div>
                <h6 className="mb-3">Stap 3: Preview & Bevestigen</h6>

                <div className="alert alert-success">
                  ✅ {parsedSchedule.length} lessen gevonden
                </div>

                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="replaceExisting"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="replaceExisting">
                    Vervang bestaand rooster (verwijder alle oude lessen eerst)
                  </label>
                </div>

                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Dag</th>
                        <th>Tijd</th>
                        <th>Vak</th>
                        <th>Docent</th>
                        <th>Lokaal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedSchedule.map((lesson, index) => (
                        <tr key={index}>
                          <td>{getDayName(lesson.day_of_week)}</td>
                          <td>
                            {lesson.time_start} - {lesson.time_end}
                          </td>
                          <td>{lesson.subject}</td>
                          <td>{lesson.teacher_name || '-'}</td>
                          <td>{lesson.location || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex gap-2 mt-3">
                  <button onClick={() => setStep(2)} className="btn btn-secondary">
                    Terug
                  </button>
                  <button
                    onClick={handleImport}
                    className="btn btn-success"
                    disabled={importing}
                  >
                    {importing ? 'Importeren...' : '✓ Importeren'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleImportWizard;
