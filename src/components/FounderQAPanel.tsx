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
          <p>Local-only test signals. Nothing leaves this device unless you export it.</p>
        </div>
        <button type="button" className="ghost-button" onClick={onDisable}>
          Disable QA mode
        </button>
      </div>

      <div className="qa-metrics-grid">
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Opens</div>
          <strong>{summary.totalAppOpens}</strong>
          <p>{summary.standaloneOpens} from Home Screen</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Active days</div>
          <strong>{summary.activeDays}</strong>
          <p>Day 2: {summary.returnedOnDay2 ? 'Yes' : 'No'} | Day 3: {summary.returnedOnDay3 ? 'Yes' : 'No'}</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Tasks added</div>
          <strong>{summary.totalTasksCreated}</strong>
          <p>{summary.currentActiveTaskCount} active | {summary.currentCompletedTaskCount} done</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Done clicks</div>
          <strong>{summary.totalDoneClicks}</strong>
          <p>Later: {summary.totalLaterClicks} | Not today: {summary.totalNotTodayClicks}</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Capture saves</div>
          <strong>{summary.captureSavedCount}</strong>
          <p>Capture opened {summary.captureOpenedCount} times</p>
        </article>
      </div>

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
          <span>What felt annoying or unclear?</span>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Example: I understood the card, but I was not sure when to use Later vs Not today."
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
