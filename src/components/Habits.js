import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from './Motion';
import { format, addDays, subDays, startOfWeek, subWeeks } from './DateUtils';
import {
  FiPlus, FiChevronLeft, FiChevronRight, FiEdit2, FiTrash2, FiX, FaFire,
} from './Icons';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../App';
import {
  db, collection, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc
} from '../data/firebase';
import './Habits.css';

const HABIT_ICONS = ['💪', '📚', '🧘', '🏃', '💧', '🎨', '✍️', '🎵', '🍎', '😴', '🧹', '💊', '🌿', '🙏', '💻', '📝'];

const HABIT_COLORS = [
  '#2D5A3D', '#4A8C5E', '#C67B5C', '#D4A843',
  '#5B8FA8', '#8B6BAE', '#C75B7A', '#4AADAD',
];

const Habits = () => {
  const { activeProfile, isOwnProfile } = useUser();
  const toast = useToast();

  const [habits, setHabits] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habitChecks, setHabitChecks] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    icon: '💪',
    color: '#2D5A3D',
  });
  const [heatmapData, setHeatmapData] = useState({});

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const isToday = dateKey === todayKey;

  const getPlantForStreak = (streak) => {
    if (streak >= 30) return '🌳';
    if (streak >= 14) return '🌿';
    if (streak >= 7) return '🌱';
    if (streak >= 3) return '☘️';
    return '🫘';
  };

  // Fetch habits
  useEffect(() => {
    if (!activeProfile) return;
    const fetchHabits = async () => {
      try {
        const habitsRef = collection(db, 'users', activeProfile.id, 'habits');
        const snap = await getDocs(habitsRef);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHabits(data);
      } catch (err) {
        console.log('Fetch habits error:', err);
      }
    };
    fetchHabits();
  }, [activeProfile]);

  // Fetch checks for selected date
  useEffect(() => {
    if (!activeProfile) return;
    const fetchChecks = async () => {
      try {
        const checksRef = doc(db, 'users', activeProfile.id, 'habitChecks', dateKey);
        const snap = await getDoc(checksRef);
        if (snap.exists()) {
          setHabitChecks(snap.data().checks || {});
        } else {
          setHabitChecks({});
        }
      } catch (err) {
        console.log('Fetch checks error:', err);
      }
    };
    fetchChecks();
  }, [activeProfile, dateKey]);

  // Fetch heatmap data (last 28 days)
  useEffect(() => {
    if (!activeProfile) return;
    const fetchHeatmap = async () => {
      try {
        const heatmap = {};
        for (let i = 0; i < 28; i++) {
          const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
          const ref = doc(db, 'users', activeProfile.id, 'habitChecks', d);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const checks = snap.data().checks || {};
            const count = Object.values(checks).filter(Boolean).length;
            heatmap[d] = count;
          }
        }
        setHeatmapData(heatmap);
      } catch (err) {
        console.log('Heatmap error:', err);
      }
    };
    fetchHeatmap();
  }, [activeProfile, habits]);

  // Toggle habit check
  const toggleHabit = async (habitId) => {
    if (!isOwnProfile) return;

    const newChecks = { ...habitChecks };
    const wasChecked = newChecks[habitId];
    newChecks[habitId] = !wasChecked;
    setHabitChecks(newChecks);

    try {
      const checksRef = doc(db, 'users', activeProfile.id, 'habitChecks', dateKey);
      await setDoc(checksRef, { checks: newChecks, date: dateKey }, { merge: true });

      // Update streak if toggling today
      if (isToday) {
        const habitRef = doc(db, 'users', activeProfile.id, 'habits', habitId);
        const habit = habits.find((h) => h.id === habitId);
        if (habit) {
          const currentStreak = habit.streak || 0;
          const bestStreak = habit.bestStreak || 0;
          let newStreak;

          if (!wasChecked) {
            newStreak = currentStreak + 1;
            toast?.addToast(`${habit.icon || '🌿'} ${habit.name} — Day ${newStreak}!`, 'success');
          } else {
            newStreak = Math.max(0, currentStreak - 1);
          }

          const newBest = Math.max(bestStreak, newStreak);
          await updateDoc(habitRef, { streak: newStreak, bestStreak: newBest });

          setHabits((prev) =>
            prev.map((h) =>
              h.id === habitId ? { ...h, streak: newStreak, bestStreak: newBest } : h
            )
          );
        }
      }
    } catch (err) {
      console.log('Toggle error:', err);
    }
  };

  // Add / Edit habit
  const handleSaveHabit = async () => {
    if (!formData.name.trim()) {
      toast?.addToast('Please enter a habit name', 'warning');
      return;
    }

    try {
      if (editingHabit) {
        const habitRef = doc(db, 'users', activeProfile.id, 'habits', editingHabit.id);
        await updateDoc(habitRef, {
          name: formData.name.trim(),
          category: formData.category.trim(),
          icon: formData.icon,
          color: formData.color,
        });

        setHabits((prev) =>
          prev.map((h) =>
            h.id === editingHabit.id
              ? { ...h, name: formData.name.trim(), category: formData.category.trim(), icon: formData.icon, color: formData.color }
              : h
          )
        );
        toast?.addToast('Habit updated! 🌿', 'success');
      } else {
        const id = Date.now().toString();
        const newHabit = {
          name: formData.name.trim(),
          category: formData.category.trim(),
          icon: formData.icon,
          color: formData.color,
          streak: 0,
          bestStreak: 0,
          createdAt: new Date().toISOString(),
        };

        const habitRef = doc(db, 'users', activeProfile.id, 'habits', id);
        await setDoc(habitRef, newHabit);

        setHabits((prev) => [...prev, { id, ...newHabit }]);
        toast?.addToast('New habit planted! 🌱', 'success');
      }

      closeModal();
    } catch (err) {
      console.log('Save habit error:', err);
      toast?.addToast('Error saving habit', 'error');
    }
  };

  // Delete habit
  const handleDeleteHabit = async (habitId) => {
    if (!window.confirm('Delete this habit? This cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'users', activeProfile.id, 'habits', habitId));
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      toast?.addToast('Habit removed', 'warning');
    } catch (err) {
      console.log('Delete error:', err);
    }
  };

  const openEditModal = (habit) => {
    setEditingHabit(habit);
    setFormData({
      name: habit.name,
      category: habit.category || '',
      icon: habit.icon || '💪',
      color: habit.color || '#2D5A3D',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingHabit(null);
    setFormData({ name: '', category: '', icon: '💪', color: '#2D5A3D' });
  };

  const completedCount = Object.values(habitChecks).filter(Boolean).length;
  const totalCount = habits.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalStreaks = habits.reduce((sum, h) => sum + (h.streak || 0), 0);
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.bestStreak || 0), 0);

  // Heatmap rendering
  const renderHeatmap = () => {
    const days = [];
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 27; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const count = heatmapData[d] || 0;
      let level = '';
      if (totalCount > 0) {
        const pct = count / totalCount;
        if (pct >= 0.9) level = 'level-4';
        else if (pct >= 0.6) level = 'level-3';
        else if (pct >= 0.3) level = 'level-2';
        else if (pct > 0) level = 'level-1';
      }

      days.push(
        <div
          key={d}
          className={`heatmap-cell ${level} ${d === todayKey ? 'today' : ''}`}
          title={`${d}: ${count}/${totalCount} habits`}
        />
      );
    }

    return (
      <div className="habits-heatmap">
        <h3 className="heatmap-title">📊 Last 28 Days</h3>
        <div className="heatmap-grid">
          {dayLabels.map((label, i) => (
            <div key={i} className="heatmap-day-label">{label}</div>
          ))}
          {days}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="heatmap-legend-cell" style={{ background: 'var(--bg-secondary)' }} />
          <div className="heatmap-legend-cell" style={{ background: 'rgba(45,90,61,0.2)' }} />
          <div className="heatmap-legend-cell" style={{ background: 'rgba(45,90,61,0.4)' }} />
          <div className="heatmap-legend-cell" style={{ background: 'rgba(45,90,61,0.6)' }} />
          <div className="heatmap-legend-cell" style={{ background: 'rgba(45,90,61,0.85)' }} />
          <span>More</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="habits-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="habits-header">
        <div className="habits-header-left">
          <span className="habits-title-icon">🌱</span>
          <div>
            <h1 className="habits-title">Habit Tracker</h1>
            <p className="habits-subtitle">Build your garden, one day at a time</p>
          </div>
        </div>
        {isOwnProfile && (
          <motion.button
            className="habits-add-btn"
            onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiPlus /> Add Habit
          </motion.button>
        )}
      </div>

      {/* Overview Stats */}
      <div className="habits-overview">
        <div className="habits-overview-card">
          <span className="habits-overview-emoji">✅</span>
          <div className="habits-overview-value">{completedCount}/{totalCount}</div>
          <div className="habits-overview-label">Completed Today</div>
        </div>
        <div className="habits-overview-card">
          <span className="habits-overview-emoji">📈</span>
          <div className="habits-overview-value">{completionRate}%</div>
          <div className="habits-overview-label">Completion Rate</div>
        </div>
        <div className="habits-overview-card">
          <span className="habits-overview-emoji">🔥</span>
          <div className="habits-overview-value">{totalStreaks}</div>
          <div className="habits-overview-label">Total Streak Days</div>
        </div>
        <div className="habits-overview-card">
          <span className="habits-overview-emoji">🏆</span>
          <div className="habits-overview-value">{bestStreak}</div>
          <div className="habits-overview-label">Best Streak</div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="habits-date-nav">
        <button
          className="habits-date-btn"
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
        >
          <FiChevronLeft />
        </button>
        <div>
          <div className="habits-date-display">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </div>
          {!isToday && (
            <div
              className="habits-date-today"
              onClick={() => setSelectedDate(new Date())}
            >
              ↩ Back to today
            </div>
          )}
        </div>
        <button
          className="habits-date-btn"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
        >
          <FiChevronRight />
        </button>
      </div>

      {/* Habits List */}
      {habits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🌱</div>
          <h3 className="empty-state-title">No habits yet</h3>
          <p className="empty-state-text">
            Plant your first habit and watch your garden grow!
          </p>
          {isOwnProfile && (
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => setShowModal(true)}
            >
              <FiPlus /> Plant a Habit
            </button>
          )}
        </div>
      ) : (
        <div className="habits-list">
          <AnimatePresence>
            {habits.map((habit, index) => (
              <motion.div
                key={habit.id}
                className={`habit-card ${habitChecks[habit.id] ? 'checked' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                {/* Checkbox */}
                <motion.div
                  className={`habit-checkbox ${habitChecks[habit.id] ? 'checked' : ''}`}
                  onClick={() => toggleHabit(habit.id)}
                  whileTap={{ scale: 0.85 }}
                  style={{
                    borderColor: habitChecks[habit.id] ? habit.color : undefined,
                    background: habitChecks[habit.id]
                      ? `linear-gradient(135deg, ${habit.color || 'var(--primary)'}, ${habit.color || 'var(--primary)'}dd)`
                      : undefined,
                  }}
                >
                  {habitChecks[habit.id] ? '✓' : ''}
                </motion.div>

                {/* Info */}
                <div className="habit-info">
                  <div className={`habit-name ${habitChecks[habit.id] ? 'completed' : ''}`}>
                    {habit.icon} {habit.name}
                  </div>
                  {habit.category && (
                    <div className="habit-category">{habit.category}</div>
                  )}
                </div>

                {/* Streak */}
                <div className="habit-streak-section">
                  <motion.span
                    className="habit-plant"
                    whileHover={{ scale: 1.3, rotate: -10 }}
                  >
                    {getPlantForStreak(habit.streak || 0)}
                  </motion.span>
                  <div className="habit-streak-info">
                    <div className="habit-streak-count">
                      <FaFire /> {habit.streak || 0}
                    </div>
                    <div className="habit-streak-label">streak</div>
                    {(habit.bestStreak || 0) > 0 && (
                      <div className="habit-best-streak">
                        Best: {habit.bestStreak}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isOwnProfile && (
                  <div className="habit-actions">
                    <button
                      className="habit-action-btn"
                      onClick={() => openEditModal(habit)}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className="habit-action-btn delete"
                      onClick={() => handleDeleteHabit(habit.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Heatmap */}
      {habits.length > 0 && renderHeatmap()}

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
                  {editingHabit ? '✏️ Edit Habit' : '🌱 New Habit'}
                </h2>
                <button className="modal-close" onClick={closeModal}>
                  <FiX />
                </button>
              </div>

              <div className="habit-modal-form">
                {/* Name */}
                <div className="input-group">
                  <label className="input-label">Habit Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Read for 20 minutes"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    autoFocus
                  />
                </div>

                {/* Category */}
                <div className="input-group">
                  <label className="input-label">Category (optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Health, Learning, Mindfulness"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  />
                </div>

                {/* Icon Picker */}
                <div className="input-group">
                  <label className="input-label">Icon</label>
                  <div className="habit-icon-picker">
                    {HABIT_ICONS.map((icon) => (
                      <div
                        key={icon}
                        className={`habit-icon-option ${formData.icon === icon ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, icon })}
                      >
                        {icon}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div className="input-group">
                  <label className="input-label">Color</label>
                  <div className="habit-color-picker">
                    {HABIT_COLORS.map((color) => (
                      <div
                        key={color}
                        className={`habit-color-option ${formData.color === color ? 'selected' : ''}`}
                        style={{ background: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-12" style={{ marginTop: '8px' }}>
                  <button className="btn btn-secondary" onClick={closeModal} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveHabit}
                    style={{ flex: 2 }}
                  >
                    {editingHabit ? '💾 Save Changes' : '🌱 Plant Habit'}
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

export default Habits;