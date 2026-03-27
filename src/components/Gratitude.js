import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from './Motion';
import { format, subDays } from './DateUtils';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiRefreshCw } from './Icons';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../App';
import {
  db, collection, getDocs, doc, setDoc, deleteDoc
} from '../data/firebase';
import './Gratitude.css';

const PROMPTS = [
  "What made you smile today?",
  "Who are you grateful for and why?",
  "What's a small thing that brought you joy?",
  "What's something beautiful you noticed today?",
  "What ability or skill are you thankful for?",
  "What challenge are you grateful for overcoming?",
  "What's a memory you're grateful for?",
  "What in nature are you grateful for today?",
  "What's something you're looking forward to?",
  "What act of kindness did you experience today?",
  "What about your home are you grateful for?",
  "What technology are you thankful to have?",
  "What friend or family member brightened your day?",
  "What's a lesson you learned recently that you're grateful for?",
  "What food did you enjoy today?",
];

const Gratitude = () => {
  const { activeProfile, isOwnProfile } = useUser();
  const toast = useToast();

  const [entries, setEntries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    item1: '',
    item2: '',
    item3: '',
  });
  const [randomEntry, setRandomEntry] = useState(null);
  const [prompt, setPrompt] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  // Random prompt
  useEffect(() => {
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, []);

  // Fetch entries
  useEffect(() => {
    if (!activeProfile) return;

    const fetchEntries = async () => {
      try {
        const ref = collection(db, 'users', activeProfile.id, 'gratitude');
        const snap = await getDocs(ref);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setEntries(data);

        // Set random past entry
        if (data.length > 1) {
          const pastEntries = data.filter((e) => e.date !== today);
          if (pastEntries.length > 0) {
            const rand = pastEntries[Math.floor(Math.random() * pastEntries.length)];
            setRandomEntry(rand);
          }
        }
      } catch (err) {
        console.log('Fetch gratitude error:', err);
      }
    };

    fetchEntries();
  }, [activeProfile, today]);

  // Get new random entry
  const refreshRandom = () => {
    const pastEntries = entries.filter((e) => e.date !== today);
    if (pastEntries.length > 0) {
      const rand = pastEntries[Math.floor(Math.random() * pastEntries.length)];
      setRandomEntry(rand);
    }
  };

  // Refresh prompt
  const refreshPrompt = () => {
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  };

  // Save entry
  const handleSave = async () => {
    if (!formData.item1.trim() && !formData.item2.trim() && !formData.item3.trim()) {
      toast?.addToast('Please write at least one thing you are grateful for', 'warning');
      return;
    }

    try {
      const id = editingEntry ? editingEntry.id : today;
      const items = [formData.item1.trim(), formData.item2.trim(), formData.item3.trim()].filter(Boolean);

      const entryData = {
        items,
        date: editingEntry ? editingEntry.date : today,
        createdAt: editingEntry ? editingEntry.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ref = doc(db, 'users', activeProfile.id, 'gratitude', id);
      await setDoc(ref, entryData);

      if (editingEntry) {
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { id, ...entryData } : e))
        );
        toast?.addToast('Gratitude updated! 🙏', 'success');
      } else {
        setEntries((prev) => {
          const filtered = prev.filter((e) => e.id !== id);
          return [{ id, ...entryData }, ...filtered].sort(
            (a, b) => (b.date || '').localeCompare(a.date || '')
          );
        });
        toast?.addToast('Gratitude logged! 🌿', 'success');
      }

      closeModal();
    } catch (err) {
      console.log('Save error:', err);
      toast?.addToast('Error saving gratitude', 'error');
    }
  };

  // Delete entry
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this gratitude entry?')) return;

    try {
      await deleteDoc(doc(db, 'users', activeProfile.id, 'gratitude', id));
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast?.addToast('Entry deleted', 'warning');
    } catch (err) {
      console.log('Delete error:', err);
    }
  };

  // Open edit
  const openEdit = (entry) => {
    setEditingEntry(entry);
    const items = entry.items || [];
    setFormData({
      item1: items[0] || '',
      item2: items[1] || '',
      item3: items[2] || '',
    });
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingEntry(null);
    setFormData({ item1: '', item2: '', item3: '' });
  };

  // Find today's entry
  const todayEntry = entries.find((e) => e.date === today);

  // Calculate streak
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
    if (entries.find((e) => e.date === d)) {
      streak++;
    } else {
      break;
    }
  }

  // Total gratitude items
  const totalItems = entries.reduce((sum, e) => sum + (e.items?.length || 0), 0);

  return (
    <motion.div
      className="gratitude-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="gratitude-header">
        <div className="gratitude-header-left">
          <span className="gratitude-title-icon">🙏</span>
          <div>
            <h1 className="gratitude-title">Gratitude Log</h1>
            <p className="gratitude-subtitle">
              Count your blessings, not your problems
            </p>
          </div>
        </div>
        {isOwnProfile && (
          <motion.button
            className="gratitude-add-btn"
            onClick={() => {
              if (todayEntry) {
                openEdit(todayEntry);
              } else {
                setShowModal(true);
              }
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiPlus /> {todayEntry ? 'Edit Today' : 'Log Gratitude'}
          </motion.button>
        )}
      </div>

      {/* Stats */}
      <div className="gratitude-stats">
        <div className="gratitude-stat-card">
          <span className="gratitude-stat-emoji">📝</span>
          <div className="gratitude-stat-value">{entries.length}</div>
          <div className="gratitude-stat-label">Days Logged</div>
        </div>
        <div className="gratitude-stat-card">
          <span className="gratitude-stat-emoji">🌟</span>
          <div className="gratitude-stat-value">{totalItems}</div>
          <div className="gratitude-stat-label">Things Grateful For</div>
        </div>
        <div className="gratitude-stat-card">
          <span className="gratitude-stat-emoji">🔥</span>
          <div className="gratitude-stat-value">{streak}</div>
          <div className="gratitude-stat-label">Day Streak</div>
        </div>
      </div>

      {/* Random Past Gratitude */}
      {randomEntry && (
        <motion.div
          className="gratitude-random"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <button className="gratitude-random-btn" onClick={refreshRandom}>
            <FiRefreshCw />
          </button>
          <div className="gratitude-random-label">✨ From Your Past</div>
          <p className="gratitude-random-text">
            "{randomEntry.items?.[0] || ''}"
          </p>
          <p className="gratitude-random-date">
            — {randomEntry.date ? format(new Date(randomEntry.date + 'T12:00:00'), 'MMMM d, yyyy') : ''}
          </p>
        </motion.div>
      )}

      {/* Today's Gratitude */}
      <motion.div
        className="gratitude-today"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="gratitude-today-title">
          🌿 Today — {format(new Date(), 'MMMM d, yyyy')}
        </h3>

        {todayEntry ? (
          <div className="gratitude-today-items">
            {todayEntry.items?.map((item, i) => (
              <motion.div
                key={i}
                className="gratitude-today-item"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <span className="gratitude-today-number">{i + 1}</span>
                <span className="gratitude-today-text">{item}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="gratitude-today-empty">
            🌱 You haven't logged your gratitude today.
            {isOwnProfile && " Take a moment to reflect!"}
          </div>
        )}
      </motion.div>

      {/* Past Entries */}
      <h2 className="gratitude-entries-title">📅 Past Entries</h2>

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🙏</div>
          <h3 className="empty-state-title">Start your gratitude practice</h3>
          <p className="empty-state-text">
            Write 3 things you're grateful for each day. Watch your perspective shift!
          </p>
          {isOwnProfile && (
            <button
              className="btn btn-accent"
              style={{ marginTop: '16px' }}
              onClick={() => setShowModal(true)}
            >
              <FiPlus /> Log First Entry
            </button>
          )}
        </div>
      ) : (
        <div className="gratitude-entries">
          <AnimatePresence>
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                className="gratitude-entry-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="gratitude-entry-header">
                  <div>
                    <div className="gratitude-entry-date">
                      🗓️{' '}
                      {entry.date
                        ? format(new Date(entry.date + 'T12:00:00'), 'MMMM d, yyyy')
                        : ''}
                    </div>
                    <div className="gratitude-entry-day">
                      {entry.date
                        ? format(new Date(entry.date + 'T12:00:00'), 'EEEE')
                        : ''}
                    </div>
                  </div>
                  {isOwnProfile && (
                    <div className="gratitude-entry-actions">
                      <button
                        className="gratitude-entry-action-btn"
                        onClick={() => openEdit(entry)}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="gratitude-entry-action-btn delete"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>

                <div className="gratitude-entry-items">
                  {entry.items?.map((item, i) => (
                    <div key={i} className="gratitude-entry-item">
                      <span className="gratitude-entry-bullet">🌿</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Modal */}
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingEntry ? '✏️ Edit Gratitude' : '🙏 Daily Gratitude'}
                </h2>
                <button className="modal-close" onClick={closeModal}>
                  <FiX />
                </button>
              </div>

              <div className="gratitude-modal-form">
                {/* Prompt */}
                <div className="gratitude-prompt" onClick={refreshPrompt} style={{ cursor: 'pointer' }}>
                  💭 {prompt}
                  <br />
                  <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                    (click for a new prompt)
                  </span>
                </div>

                {/* Item 1 */}
                <div className="gratitude-input-row">
                  <span className="gratitude-input-number">1</span>
                  <textarea
                    className="gratitude-input-field"
                    placeholder="I am grateful for..."
                    value={formData.item1}
                    onChange={(e) =>
                      setFormData({ ...formData, item1: e.target.value })
                    }
                    rows={2}
                    autoFocus
                  />
                </div>

                {/* Item 2 */}
                <div className="gratitude-input-row">
                  <span className="gratitude-input-number">2</span>
                  <textarea
                    className="gratitude-input-field"
                    placeholder="I am grateful for..."
                    value={formData.item2}
                    onChange={(e) =>
                      setFormData({ ...formData, item2: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                {/* Item 3 */}
                <div className="gratitude-input-row">
                  <span className="gratitude-input-number">3</span>
                  <textarea
                    className="gratitude-input-field"
                    placeholder="I am grateful for..."
                    value={formData.item3}
                    onChange={(e) =>
                      setFormData({ ...formData, item3: e.target.value })
                    }
                    rows={2}
                  />
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
                    className="btn btn-accent"
                    onClick={handleSave}
                    style={{ flex: 2 }}
                  >
                    {editingEntry ? '💾 Save Changes' : '🙏 Save Gratitude'}
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

export default Gratitude;