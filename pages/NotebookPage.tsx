import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { NotebookEntry } from '../types';
import Spinner from '../components/Spinner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function entryDateLabel(iso: string): string {
  const today = todayIso();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  return formatDate(iso);
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const PenIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusSmIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <line x1="8" y1="2" x2="8" y2="14" strokeLinecap="round" />
    <line x1="2" y1="8" x2="14" y2="8" strokeLinecap="round" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M2.5 4.5h11M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M5.5 4.5l.5 8a1 1 0 001 1h3a1 1 0 001-1l.5-8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Tag chip ─────────────────────────────────────────────────────────────────

const TagChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-jtp-md bg-jtp-blue/10 text-jtp-blue text-jtp-xs font-medium select-none">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="text-jtp-blue/60 hover:text-jtp-blue transition-colors leading-none ml-0.5"
      aria-label={`Remove tag ${label}`}
    >
      ×
    </button>
  </span>
);

// ─── Empty editor placeholder ─────────────────────────────────────────────────

const EmptyEditorPlaceholder: React.FC<{ hasEntries: boolean; onNew: () => void }> = ({
  hasEntries,
  onNew,
}) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
    <div className="w-12 h-12 rounded-jtp-panel bg-jtp-active border border-jtp-border flex items-center justify-center">
      <PenIcon className="w-5 h-5 text-jtp-textDim" />
    </div>
    <div>
      <div className="text-jtp-lg font-semibold text-jtp-text mb-1">
        {hasEntries ? 'Select an entry' : 'Start your first journal entry'}
      </div>
      <div className="text-jtp-sm text-jtp-textDim max-w-xs">
        {hasEntries
          ? 'Choose an entry from the list, or create a new one.'
          : 'Capture your daily reflections, trading insights, and lessons learned.'}
      </div>
    </div>
    <button
      type="button"
      onClick={onNew}
      className="flex items-center gap-1.5 px-4 py-2 bg-jtp-blue hover:bg-jtp-blueHover text-white text-jtp-sm font-semibold rounded-jtp-xl transition-colors"
    >
      <PlusSmIcon className="w-3.5 h-3.5" />
      New entry
    </button>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────

const NotebookPage: React.FC = () => {
  const { getToken } = useAuth();

  // ── List state
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Editor state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [edDate, setEdDate] = useState(todayIso());
  const [edTitle, setEdTitle] = useState('');
  const [edContent, setEdContent] = useState('');
  const [edTags, setEdTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // ── Load entries ──────────────────────────────────────────────────────────

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const token = await getToken();
      const data = await api.getNotebookEntries(token!);
      setEntries(data.slice().sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e: any) {
      setListError(e.message || 'Failed to load notebook entries.');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Dismiss "Saved" flash after 2 s
  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 2000);
    return () => clearTimeout(t);
  }, [savedFlash]);

  // ── Editor interactions ───────────────────────────────────────────────────

  const openEntry = (entry: NotebookEntry) => {
    setSelectedId(entry.id);
    setIsNew(false);
    setEdDate(entry.date);
    setEdTitle(entry.title ?? '');
    setEdContent(entry.content);
    setEdTags(entry.tags ?? []);
    setTagInput('');
    setSaveError(null);
    setSavedFlash(false);
  };

  const openNew = () => {
    setSelectedId(null);
    setIsNew(true);
    setEdDate(todayIso());
    setEdTitle('');
    setEdContent('');
    setEdTags([]);
    setTagInput('');
    setSaveError(null);
    setSavedFlash(false);
    // Focus title after state settles
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  const handleSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const token = await getToken();
      const body = {
        date: edDate,
        title: edTitle.trim() || undefined,
        content: edContent,
        tags: edTags,
      };

      if (isNew) {
        const created = await api.createNotebookEntry(body, token!);
        setEntries(prev =>
          [created, ...prev].sort((a, b) => b.date.localeCompare(a.date))
        );
        setSelectedId(created.id);
        setIsNew(false);
      } else if (selectedId) {
        const updated = await api.updateNotebookEntry(selectedId, body, token!);
        setEntries(prev =>
          prev
            .map(e => (e.id === selectedId ? updated : e))
            .sort((a, b) => b.date.localeCompare(a.date))
        );
      }

      setSavedFlash(true);
    } catch (e: any) {
      setSaveError(e.message || 'Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;

    setIsDeleting(true);
    setSaveError(null);
    try {
      const token = await getToken();
      await api.deleteNotebookEntry(selectedId, token!);
      setEntries(prev => prev.filter(e => e.id !== selectedId));
      setSelectedId(null);
      setIsNew(false);
    } catch (e: any) {
      setSaveError(e.message || 'Delete failed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Tag chip input ────────────────────────────────────────────────────────

  const commitTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !edTags.includes(t)) {
      setEdTags(prev => [...prev, t]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag();
    } else if (e.key === 'Backspace' && tagInput === '' && edTags.length > 0) {
      setEdTags(prev => prev.slice(0, -1));
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const showEditor = isNew || selectedId !== null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    /*
     * Negative margins cancel the parent DashboardPage padding (px-5 py-[18px])
     * so the two panes sit flush against the top/sides of the content area.
     * Height accounts for: topbar (52px) + parent top-padding (18px) = 70px.
     */
    <div
      className="-mx-5 -mt-[18px] flex overflow-hidden"
      style={{ height: 'calc(100vh - 52px)' }}
    >
      {/* ── Left pane: entry list ─────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-jtp-border bg-jtp-shell overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-jtp-border">
          <span className="text-jtp-md font-semibold text-jtp-text">Entries</span>
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1 text-jtp-xs text-jtp-textMuted hover:text-jtp-blue transition-colors px-2 py-1 rounded-jtp-lg hover:bg-jtp-hover"
            title="New entry"
          >
            <PlusSmIcon className="w-3 h-3" />
            New
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : listError ? (
            <div className="px-4 py-6 text-jtp-xs text-jtp-loss text-center">
              {listError}
              <br />
              <button
                type="button"
                onClick={loadEntries}
                className="mt-2 text-jtp-blue hover:underline"
              >
                Retry
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-jtp-sm text-jtp-textDim mb-3">No entries yet.</div>
              <button
                type="button"
                onClick={openNew}
                className="text-jtp-xs text-jtp-blue hover:underline"
              >
                Start your first journal entry
              </button>
            </div>
          ) : (
            <ul role="list">
              {entries.map(entry => {
                const isActive = entry.id === selectedId;
                const label = entry.title?.trim() || entry.content.split('\n')[0].trim() || '(no content)';
                const snippet = entry.content.trim().slice(0, 55);

                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => openEntry(entry)}
                      className={`w-full text-left px-4 py-3 border-b border-jtp-borderSubtle transition-colors ${
                        isActive
                          ? 'bg-[rgba(91,141,239,0.08)] border-l-2 border-l-jtp-blue'
                          : 'border-l-2 border-l-transparent hover:bg-jtp-hover'
                      }`}
                    >
                      <div className="text-jtp-xs text-jtp-textDim mb-0.5 font-medium">
                        {entryDateLabel(entry.date)}
                      </div>
                      <div
                        className={`text-jtp-sm font-medium truncate ${
                          isActive ? 'text-jtp-text' : 'text-jtp-textMuted'
                        }`}
                      >
                        {label}
                      </div>
                      {snippet && (
                        <div className="text-jtp-xs text-jtp-textDim truncate mt-0.5">
                          {snippet}
                        </div>
                      )}
                      {entry.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {entry.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-jtp-2xs px-1.5 py-px rounded-jtp-sm bg-jtp-active text-jtp-textFaint"
                            >
                              {tag}
                            </span>
                          ))}
                          {entry.tags.length > 3 && (
                            <span className="text-jtp-2xs text-jtp-textFaint">
                              +{entry.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Right pane: editor ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-jtp-bg overflow-hidden">
        {!showEditor ? (
          <EmptyEditorPlaceholder hasEntries={entries.length > 0} onNew={openNew} />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Editor toolbar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-6 py-2.5 border-b border-jtp-border bg-jtp-shell">
              {/* Date picker */}
              <input
                type="date"
                value={edDate}
                onChange={e => setEdDate(e.target.value)}
                aria-label="Entry date"
                className="bg-jtp-active border border-jtp-borderStrong rounded-jtp-lg px-2.5 py-1 text-jtp-xs text-jtp-textMuted focus:outline-none focus:border-jtp-borderFocus transition-colors"
              />

              <div className="flex-1" />

              {/* Saved flash */}
              {savedFlash && (
                <span className="text-jtp-xs text-jtp-profit animate-jtp-fade-in select-none">
                  Saved
                </span>
              )}

              {/* Save error */}
              {saveError && !savedFlash && (
                <span className="text-jtp-xs text-jtp-loss max-w-[200px] truncate" title={saveError}>
                  {saveError}
                </span>
              )}

              {/* Delete button (existing entries only) */}
              {selectedId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                  title="Delete entry"
                  className="flex items-center gap-1 text-jtp-xs text-jtp-textDim hover:text-jtp-loss transition-colors disabled:opacity-40 px-2 py-1 rounded-jtp-lg hover:bg-jtp-hover"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              )}

              {/* Save button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isDeleting}
                className="px-3 py-1.5 bg-jtp-blue hover:bg-jtp-blueHover text-white text-jtp-xs font-semibold rounded-jtp-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {/* Title input */}
            <div className="flex-shrink-0 px-7 pt-6 pb-1">
              <input
                ref={titleRef}
                type="text"
                value={edTitle}
                onChange={e => setEdTitle(e.target.value)}
                placeholder="Title (optional)"
                aria-label="Entry title"
                className="w-full bg-transparent text-jtp-3xl font-semibold text-jtp-text placeholder:text-jtp-borderHover focus:outline-none"
                style={{ letterSpacing: '-0.4px' }}
              />
            </div>

            {/* Content textarea — grows to fill remaining space */}
            <div className="flex-1 px-7 py-3 overflow-hidden flex flex-col min-h-0">
              <textarea
                ref={contentRef}
                value={edContent}
                onChange={e => setEdContent(e.target.value)}
                placeholder="Write your thoughts, reflections, and trading insights…"
                aria-label="Entry content"
                className="flex-1 w-full bg-transparent text-jtp-md text-jtp-textSoft placeholder:text-jtp-textDisabled focus:outline-none resize-none"
                style={{ lineHeight: '1.75' }}
              />
            </div>

            {/* Tags row */}
            <div className="flex-shrink-0 border-t border-jtp-border px-7 py-3">
              <div
                className="flex flex-wrap items-center gap-1.5 min-h-[26px]"
                role="group"
                aria-label="Entry tags"
              >
                <span className="text-jtp-xs text-jtp-textDim mr-0.5 select-none">Tags</span>
                {edTags.map(tag => (
                  <TagChip
                    key={tag}
                    label={tag}
                    onRemove={() => setEdTags(prev => prev.filter(t => t !== tag))}
                  />
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => tagInput.trim() && commitTag()}
                  placeholder={edTags.length === 0 ? 'Add tag, press Enter…' : '+tag'}
                  aria-label="Add tag"
                  className="bg-transparent text-jtp-xs text-jtp-textMuted placeholder:text-jtp-textDisabled focus:outline-none min-w-[72px] flex-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotebookPage;
