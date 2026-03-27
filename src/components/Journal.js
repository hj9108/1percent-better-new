import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from './Motion';
import { format } from './DateUtils';
import {
  FiPlus, FiSearch, FiGrid, FiList, FiEdit2,
  FiTrash2, FiX, FiCalendar, FiTag, FiArrowLeft,
} from './Icons';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../App';
import {
  db, collection, getDocs, doc, setDoc, deleteDoc
} from '../data/firebase';
import { uploadFile, getFileIcon, formatFileSize } from '../data/cloudinary';
import './Journal.css';

const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😔', label: 'Sad' },
  { emoji: '😤', label: 'Angry' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '🤔', label: 'Thoughtful' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🎉', label: 'Excited' },
];

const Journal = () => {
  const { activeProfile, isOwnProfile } = useUser();
  const toast = useToast();

  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [readingEntry, setReadingEntry] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mood: '',
    tags: [],
    attachments: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Fetch entries
  useEffect(() => {
    if (!activeProfile) return;

    const fetchEntries = async () => {
      try {
        const ref = collection(db, 'users', activeProfile.id, 'journal');
        const snap = await getDocs(ref);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setEntries(data);
      } catch (err) {
        console.log('Fetch journal error:', err);
      }
    };

    fetchEntries();
  }, [activeProfile]);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (entry.title || '').toLowerCase().includes(q) ||
      (entry.content || '').toLowerCase().includes(q) ||
      (entry.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  // Add tag
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tagInput.trim()],
        });
      }
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const uploaded = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${file.name}... (${i + 1}/${files.length})`);
      try {
        const result = await uploadFile(file);
        uploaded.push(result);
      } catch (err) {
        toast?.addToast(`Failed to upload ${file.name}`, 'error');
      }
    }

    setFormData((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...uploaded],
    }));
    setUploading(false);
    setUploadProgress('');

    if (uploaded.length > 0) {
      toast?.addToast(`${uploaded.length} file(s) uploaded! 📎`, 'success');
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  // Save entry
  const handleSave = async () => {
    if (!formData.title.trim() && !formData.content.trim()) {
      toast?.addToast('Please write something before saving', 'warning');
      return;
    }

    try {
      const id = editingEntry ? editingEntry.id : Date.now().toString();
      const entryData = {
        title: formData.title.trim() || 'Untitled Entry',
        content: formData.content.trim(),
        mood: formData.mood,
        tags: formData.tags,
        attachments: formData.attachments || [],
        createdAt: editingEntry
          ? editingEntry.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ref = doc(db, 'users', activeProfile.id, 'journal', id);
      await setDoc(ref, entryData);

      if (editingEntry) {
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { id, ...entryData } : e))
        );
        toast?.addToast('Entry updated! 📖', 'success');
      } else {
        setEntries((prev) =>
          [{ id, ...entryData }, ...prev].sort(
            (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
          )
        );
        toast?.addToast('New entry saved! 📝', 'success');
      }

      closeModal();
    } catch (err) {
      console.log('Save error:', err);
      toast?.addToast('Error saving entry', 'error');
    }
  };

  // Delete entry
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this journal entry?')) return;

    try {
      await deleteDoc(doc(db, 'users', activeProfile.id, 'journal', id));
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast?.addToast('Entry deleted', 'warning');
      if (readingEntry && readingEntry.id === id) {
        setReadingEntry(null);
      }
    } catch (err) {
      console.log('Delete error:', err);
    }
  };

  // Open edit modal
  const openEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title || '',
      content: entry.content || '',
      mood: entry.mood || '',
      tags: entry.tags || [],
      attachments: entry.attachments || [],
    });
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingEntry(null);
    setFormData({
      title: '',
      content: '',
      mood: '',
      tags: [],
      attachments: [],
    });
    setTagInput('');
    setUploading(false);
    setUploadProgress('');
  };

  // Word count
  const wordCount = formData.content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  // ==================== READING VIEW ====================
  if (readingEntry) {
    return (
      <motion.div
        className="journal-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <button
          className="btn btn-ghost"
          onClick={() => setReadingEntry(null)}
          style={{ marginBottom: '16px' }}
        >
          <FiArrowLeft /> Back to Journal
        </button>

        <div className="card">
          <div className="journal-read-header">
            <h1 className="journal-read-title">{readingEntry.title}</h1>
            <div className="journal-read-meta">
              <span className="journal-read-meta-item">
                <FiCalendar />
                {readingEntry.createdAt
                  ? format(new Date(readingEntry.createdAt), 'MMMM d, yyyy')
                  : ''}
              </span>
              {readingEntry.mood && (
                <span className="journal-read-meta-item">
                  Mood: {readingEntry.mood}
                </span>
              )}
              {readingEntry.tags && readingEntry.tags.length > 0 && (
                <span className="journal-read-meta-item">
                  <FiTag />
                  {readingEntry.tags.join(', ')}
                </span>
              )}
            </div>
          </div>

          <div className="journal-read-content">{readingEntry.content}</div>

          {/* Attachments */}
          {readingEntry.attachments && readingEntry.attachments.length > 0 && (
            <div style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
            }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: '700',
                color: 'var(--text-secondary)',
                marginBottom: '12px',
              }}>
                📎 Attachments ({readingEntry.attachments.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {readingEntry.attachments.map((file, i) => (
                  <a
                    key={i}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      color: 'var(--text)',
                      textDecoration: 'none',
                    }}
                  >
                    {file.format &&
                    ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
                      file.format.toLowerCase()
                    ) ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.6rem' }}>
                        {getFileIcon(file.format)}
                      </span>
                    )}
                    <div>
                      <div style={{
                        fontWeight: '600',
                        maxWidth: '140px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {isOwnProfile && (
            <div
              className="flex gap-12"
              style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={() => {
                  openEdit(readingEntry);
                  setReadingEntry(null);
                }}
              >
                <FiEdit2 /> Edit
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(readingEntry.id)}
              >
                <FiTrash2 /> Delete
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ==================== MAIN VIEW ====================
  return (
    <motion.div
      className="journal-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="journal-header">
        <div className="journal-header-left">
          <span className="journal-title-icon">📖</span>
          <div>
            <h1 className="journal-title">Journal</h1>
            <p className="journal-subtitle">
              Your thoughts, your space — {entries.length} entries
            </p>
          </div>
        </div>
        {isOwnProfile && (
          <motion.button
            className="journal-add-btn"
            onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiPlus /> Write Entry
          </motion.button>
        )}
      </div>

      {/* Filters */}
      <div className="journal-filters">
        <div className="journal-search-wrapper">
          <FiSearch className="journal-search-icon" />
          <input
            type="text"
            className="journal-search"
            placeholder="Search entries, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="journal-view-toggle">
          <button
            className={`journal-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <FiList />
          </button>
          <button
            className={`journal-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <FiGrid />
          </button>
        </div>
      </div>

      {/* Entries */}
      {filteredEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3 className="empty-state-title">
            {searchQuery ? 'No entries found' : 'Your journal awaits'}
          </h3>
          <p className="empty-state-text">
            {searchQuery
              ? 'Try a different search term'
              : 'Start writing your first entry and let your thoughts bloom.'}
          </p>
          {!searchQuery && isOwnProfile && (
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => setShowModal(true)}
            >
              <FiPlus /> Write First Entry
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid' ? 'journal-entries-grid' : 'journal-entries'
          }
        >
          <AnimatePresence>
            {filteredEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                className="journal-entry-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => setReadingEntry(entry)}
              >
                <div className="journal-entry-header">
                  <h3 className="journal-entry-title truncate">
                    {entry.title || 'Untitled'}
                  </h3>
                  <span className="journal-entry-date">
                    {entry.createdAt
                      ? format(new Date(entry.createdAt), 'MMM d, yyyy')
                      : ''}
                  </span>
                </div>

                <p className="journal-entry-preview">
                  {entry.content || 'No content...'}
                </p>

                <div className="journal-entry-footer">
                  <div className="journal-entry-tags">
                    {(entry.tags || []).slice(0, 3).map((tag) => (
                      <span key={tag} className="journal-entry-tag">
                        #{tag}
                      </span>
                    ))}
                    {(entry.tags || []).length > 3 && (
                      <span className="journal-entry-tag">
                        +{entry.tags.length - 3}
                      </span>
                    )}
                    {entry.attachments && entry.attachments.length > 0 && (
                      <span className="journal-entry-tag">
                        📎 {entry.attachments.length}
                      </span>
                    )}
                  </div>

                  <div
                    className="flex gap-8"
                    style={{ alignItems: 'center' }}
                  >
                    {entry.mood && (
                      <span className="journal-entry-mood">{entry.mood}</span>
                    )}
                    {isOwnProfile && (
                      <div
                        className="journal-entry-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="journal-entry-action-btn"
                          onClick={() => openEdit(entry)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="journal-entry-action-btn delete"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Write/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="modal"
              style={{ maxWidth: '640px' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingEntry ? '✏️ Edit Entry' : '📝 New Journal Entry'}
                </h2>
                <button className="modal-close" onClick={closeModal}>
                  <FiX />
                </button>
              </div>

              <div className="journal-modal-form">

                {/* Title */}
                <div className="input-group">
                  <label className="input-label">Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Give your entry a title..."
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    autoFocus
                  />
                </div>

                {/* Content */}
                <div className="input-group">
                  <label className="input-label">What's on your mind?</label>
                  <textarea
                    className="journal-editor"
                    placeholder="Dear diary... &#10;&#10;Write freely, this is your safe space 🌿"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    rows={8}
                  />
                  <div className="journal-word-count">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                  </div>
                </div>

                {/* Mood */}
                <div className="input-group">
                  <label className="input-label">Mood (optional)</label>
                  <div className="journal-mood-selector">
                    {MOOD_OPTIONS.map((mood) => (
                      <div
                        key={mood.emoji}
                        className={`journal-mood-option ${
                          formData.mood === mood.emoji ? 'selected' : ''
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            mood:
                              formData.mood === mood.emoji ? '' : mood.emoji,
                          })
                        }
                        title={mood.label}
                      >
                        {mood.emoji}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="input-group">
                  <label className="input-label">
                    Tags (press Enter to add)
                  </label>
                  <div className="journal-tags-input-wrapper">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="journal-tag-chip">
                        #{tag}
                        <span
                          className="journal-tag-remove"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          ×
                        </span>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="journal-tags-input"
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                    />
                  </div>
                </div>

                {/* File Attachments */}
                <div className="input-group">
                  <label className="input-label">📎 Attachments</label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    background: 'var(--bg)',
                    border: '1.5px dashed var(--border)',
                    borderRadius: '12px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: '0.88rem',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s',
                    opacity: uploading ? 0.7 : 1,
                  }}>
                    <span>📎</span>
                    <span>
                      {uploading
                        ? uploadProgress
                        : 'Click to attach files (images, PDFs, docs...)'}
                    </span>
                    <input
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                      disabled={uploading}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.mov"
                    />
                  </label>

                  {/* Attached files list */}
                  {formData.attachments && formData.attachments.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      marginTop: '8px',
                    }}>
                      {formData.attachments.map((file, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: 'var(--bg)',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          border: '1px solid var(--border)',
                        }}>
                          {file.format &&
                          ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
                            file.format.toLowerCase()
                          ) ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              style={{
                                width: '32px',
                                height: '32px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '1.2rem' }}>
                              {getFileIcon(file.format)}
                            </span>
                          )}
                          <span style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--text)',
                          }}>
                            {file.name}
                          </span>
                          <span style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.72rem',
                            whiteSpace: 'nowrap',
                          }}>
                            {formatFileSize(file.size)}
                          </span>
                          <button
                            onClick={() => handleRemoveAttachment(i)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--danger)',
                              fontSize: '1.1rem',
                              padding: '2px 4px',
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-12" style={{ marginTop: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={closeModal}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    style={{ flex: 2 }}
                    disabled={uploading}
                  >
                    {uploading
                      ? '⏳ Uploading...'
                      : editingEntry
                      ? '💾 Save Changes'
                      : '📖 Save Entry'}
                  </button>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Journal;