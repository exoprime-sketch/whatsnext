import { useState } from 'react';
import type { QAFeedback, QARating, QASummary } from '../types';

const RATING_OPTIONS: QARating[] = ['Clear', 'Useful', 'Annoying', 'Confusing', 'Worth keeping'];

interface FounderQAPanelProps {
  summary: QASummary;
  feedback: QAFeedback[];
  onCopySummary: () => void;
  onDownloadJson: () => void;
  onClearLog: () => void;
  onDisable: () => void;
  onSubmitFeedback: (note: string, rating: QARating | '') => void;
}

export function FounderQAPanel({
  summary,
  feedback,
  onCopySummary,
  onDownloadJson,
  onClearLog,
  onDisable,
  onSubmitFeedback
}: FounderQAPanelProps) {
  const [note, setNote] = useState('');
  const [rating, setRating] = useState<QARating | ''>('');

  return (
    <section className="panel panel--quiet qa-panel">
      <div className="section-heading">
        <div>
          <h2>Founder QA</h2>
          <p>Local-only test signals for input reduction. Exports exclude pasted text and task titles by default.</p>
        </div>
        <button type="button" className="ghost-button" onClick={onDisable}>
          Disable QA mode
        </button>
      </div>

      <div className="qa-metrics-grid">
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Extraction runs</div>
          <strong>{summary.extractionRuns}</strong>
          <p>Capture opened {summary.captureOpenedCount} times</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Detected items</div>
          <strong>{summary.detectedItemsCount}</strong>
          <p>{summary.savedDetectedItemsCount} saved from capture</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Typing saved</div>
          <strong>{summary.manualEntriesAvoidedApprox}</strong>
          <p>Approx manual entries avoided</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Manual adds</div>
          <strong>{summary.manualTaskCreatedCount}</strong>
          <p>Capture vs manual: {summary.captureVsManualRatio}</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Events</div>
          <strong>{summary.eventDetections}</strong>
          <p>{summary.captureSavedEventCount} saved locally</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Reminders</div>
          <strong>{summary.reminderDetections}</strong>
          <p>{summary.captureSavedReminderCount} saved locally</p>
        </article>
      </div>

      <section className="panel panel--nested">
        <div className="section-heading">
          <div>
            <h2>Retention and follow-through</h2>
            <p>These still matter after capture becomes the front door.</p>
          </div>
        </div>
        <div className="qa-inline-metrics">
          <span>Opens: {summary.totalAppOpens}</span>
          <span>Home Screen: {summary.standaloneOpens}</span>
          <span>Day 2: {summary.returnedOnDay2 ? 'Yes' : 'No'}</span>
          <span>Day 3: {summary.returnedOnDay3 ? 'Yes' : 'No'}</span>
          <span>Done: {summary.totalDoneClicks}</span>
          <span>Later: {summary.totalLaterClicks}</span>
          <span>Not today: {summary.totalNotTodayClicks}</span>
          <span>Manual after capture: {summary.usedManualAddAfterCaptureCount}</span>
        </div>
      </section>

      <div className="qa-actions">
        <button type="button" className="secondary-button" onClick={onCopySummary}>
          Copy QA summary
        </button>
        <button type="button" className="ghost-button" onClick={onDownloadJson}>
          Download QA JSON
        </button>
        <button type="button" className="ghost-button danger-text" onClick={onClearLog}>
          Clear QA log
        </button>
      </div>

      <div className="stack">
        <label className="field">
          <span>What still felt too manual?</span>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Example: Extraction found the meeting, but I still wished I could share directly from Messages."
          />
        </label>

        <div className="field">
          <span>Optional rating</span>
          <div className="chip-group">
            {RATING_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`chip ${rating === option ? 'is-selected' : ''}`}
                onClick={() => setRating((current) => (current === option ? '' : option))}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={!note.trim()}
          onClick={() => {
            onSubmitFeedback(note, rating);
            setNote('');
            setRating('');
          }}
        >
          Save QA note
        </button>
      </div>

      {feedback.length > 0 ? (
        <div className="qa-feedback-list">
          <div className="section-heading">
            <div>
              <h2>Recent notes</h2>
              <p>Saved only on this device.</p>
            </div>
          </div>
          <div className="stack">
            {feedback.slice(0, 3).map((item) => (
              <article key={item.id} className="qa-feedback-item">
                {item.rating ? <div className="eyebrow">{item.rating}</div> : null}
                <p>{item.note}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
