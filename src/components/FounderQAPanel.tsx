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
          <p>Local-only signals for capture, review, and calendar usefulness. Exports exclude pasted text and task titles by default.</p>
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
          <div className="eyebrow">Typing saved</div>
          <strong>{summary.manualEntriesAvoidedApprox}</strong>
          <p>{summary.savedDetectedItemsCount} saved from capture</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Calendar-ready</div>
          <strong>{summary.calendarReadyItems}</strong>
          <p>{summary.calendarExports} calendar files downloaded</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Copied details</div>
          <strong>{summary.copiedEventDetails}</strong>
          <p>Useful when export is not ready</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Needs review</div>
          <strong>{summary.itemsNeedingDateReview + summary.itemsNeedingTimeReview}</strong>
          <p>{summary.itemsNeedingDateReview} date, {summary.itemsNeedingTimeReview} time</p>
        </article>
        <article className="summary-card summary-card--quiet qa-metric-card">
          <div className="eyebrow">Alarms</div>
          <strong>{summary.alarmSelections}</strong>
          <p>Upcoming viewed {summary.upcomingViewedCount} times</p>
        </article>
      </div>

      <section className="panel panel--nested">
        <div className="section-heading">
          <div>
            <h2>Retention and follow-through</h2>
            <p>Capture matters most, but repeated use still decides whether this is good enough.</p>
          </div>
        </div>
        <div className="qa-inline-metrics">
          <span>Opens: {summary.totalAppOpens}</span>
          <span>Home Screen: {summary.standaloneOpens}</span>
          <span>Day 2: {summary.returnedOnDay2 ? 'Yes' : 'No'}</span>
          <span>Day 3: {summary.returnedOnDay3 ? 'Yes' : 'No'}</span>
          <span>Manual adds: {summary.manualTaskCreatedCount}</span>
          <span>Capture vs manual: {summary.captureVsManualRatio}</span>
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
            placeholder="Example: The alarm choices were useful, but I still wanted one-tap native Calendar save."
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
