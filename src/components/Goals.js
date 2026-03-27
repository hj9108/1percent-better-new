import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from './Motion';
import { format, differenceInDays, isPast } from './DateUtils';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiCalendar,
} from './Icons';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../App';
import {
  db, collection, getDocs, doc, setDoc, deleteDoc, updateDoc
} from '../data/firebase';
import './Goals.css';

const GOAL_CATEGORIES = [
  '🏃 Health',
  '💼 Career',
  '📚 Learning',
  '💰 Finance',
  '🎨 Creative',
  '🧘 Mindfulness',
  '❤️ Relationships',
  '🌍 Travel',
  '📝 Other',
];

const Goals = () => {
  const { activeProfile, isOwnProfile } = useUser();
  const toast = useToast();

  const [goals, setGoals] = useState([]);
  const [filter, setFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    deadline: '',
    milestones: [],
  });
  const [milestoneInput, setMilestoneInput] = useState('');

  // Fetch goals
  useEffect(() => {
    if (!activeProfile) return;

    const fetchGoals = async () => {
      try {
        const ref = collection(db, 'users', activeProfile.id, 'goals');
        const snap = await getDocs(ref);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setGoals(data);
      } catch (err) {
        console.log('Fetch goals error:', err);
      }
    };

    fetchGoals();
  }, [activeProfile]);

  // Filter goals
  const filteredGoals = goals.filter((goal) => {
    if (filter === 'active') return !goal.completed;
    if (filter === 'completed') return goal.completed;
    return true;
  });

  // Calculate progress
  const getProgress = (goal) => {
    const milestones = goal.milestones || [];
    if (milestones.length === 0) return goal.completed ? 100 : 0;
    const completed = milestones.filter((m) => m.completed).length;
    return Math.round((completed / milestones.length) * 100);
  };

  // Get deadline info
  const getDeadlineInfo = (deadline) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const daysLeft = differenceInDays(deadlineDate, new Date());

    if (isPast(deadlineDate) && daysLeft < 0) {
      return {
        text: `${Math.abs(daysLeft)} days overdue`,
        class: 'overdue',
      };
    }
    if (daysLeft <= 7) {
      return {
        text: `${daysLeft} days left`,
        class: 'soon',
      };
    }
    return {
      text: `${daysLeft} days left`,
      class: 'normal',
    };
  };

  // Toggle milestone
  const handleToggleMilestone = async (goalId, milestoneIndex) => {
    if (!isOwnProfile) return;

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedMilestones = [...(goal.milestones || [])];
    updatedMilestones[milestoneIndex] = {
      ...updatedMilestones[milestoneIndex],
      completed: !updatedMilestones[milestoneIndex].completed,
    };

    try {
      const ref = doc(db, 'users', activeProfile.id, 'goals', goalId);
      await updateDoc(ref, { milestones: updatedMilestones });

      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId ? { ...g, milestones: updatedMilestones } : g
        )
      );

      const completed = updatedMilestones.filter((m) => m.completed).length;
      const total = updatedMilestones.length;

      if (completed === total && total > 0) {
        toast?.addToast('🎉 All milestones completed! Goal achieved!', 'success');
      } else {
        toast?.addToast(`Milestone ${completed}/${total} ✓`, 'success');
      }
    } catch (err) {
      console.log('Toggle milestone error:', err);
    }
  };

  // Mark goal complete/incomplete
  const handleToggleGoalComplete = async (goalId) => {
    if (!isOwnProfile) return;

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    try {
      const ref = doc(db, 'users', activeProfile.id, 'goals', goalId);
      await updateDoc(ref, { completed: !goal.completed });

      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId ? { ...g, completed: !g.completed } : g
        )
      );

      if (!goal.completed) {
        toast?.addToast('🎉 Goal completed! Amazing!', 'success');
      } else {
        toast?.addToast('Goal reopened', 'warning');
      }
    } catch (err) {
      console.log('Toggle complete error:', err);
    }
  };

  // Add milestone in modal
  const handleAddMilestone = () => {
    if (!milestoneInput.trim()) return;
    setFormData({
      ...formData,
      milestones: [
        ...formData.milestones,
        { text: milestoneInput.trim(), completed: false },
      ],
    });
    setMilestoneInput('');
  };

  const handleMilestoneKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMilestone();
    }
  };

  // Remove milestone in modal
  const handleRemoveMilestone = (index) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((_, i) => i !== index),
    });
  };

  // Save goal
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast?.addToast('Please enter a goal title', 'warning');
      return;
    }

    try {
      const id = editingGoal ? editingGoal.id : Date.now().toString();
      const goalData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        deadline: formData.deadline || null,
        milestones: formData.milestones,
        completed: editingGoal ? editingGoal.completed : false,
        createdAt: editingGoal
          ? editingGoal.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ref = doc(db, 'users', activeProfile.id, 'goals', id);
      await setDoc(ref, goalData);

      if (editingGoal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === id ? { id, ...goalData } : g))
        );
        toast?.addToast('Goal updated! 🎯', 'success');
      } else {
        setGoals((prev) =>
          [{ id, ...goalData }, ...prev].sort(
            (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
          )
        );
        toast?.addToast('New goal set! 🎯', 'success');
      }

      closeModal();
    } catch (err) {
      console.log('Save goal error:', err);
      toast?.addToast('Error saving goal', 'error');
    }
  };

  // Delete goal
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal? This cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'users', activeProfile.id, 'goals', id));
      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast?.addToast('Goal deleted', 'warning');
    } catch (err) {
      console.log('Delete error:', err);
    }
  };

  // Open edit
  const openEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title || '',
      description: goal.description || '',
      category: goal.category || '',
      deadline: goal.deadline || '',
      milestones: goal.milestones || [],
    });
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      deadline: '',
      milestones: [],
    });
    setMilestoneInput('');
  };

  // Stats
  const activeGoals = goals.filter((g) => !g.completed).length;
  const completedGoals = goals.filter((g) => g.completed).length;
  const totalMilestones = goals.reduce(
    (sum, g) => sum + (g.milestones?.length || 0),
    0
  );
  const completedMilestones = goals.reduce(
    (sum, g) =>
      sum + (g.milestones?.filter((m) => m.completed).length || 0),
    0
  );

  return (
    <motion.div
      className="goals-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="goals-header">
        <div className="goals-header-left">
          <span className="goals-title-icon">🎯</span>
          <div>
            <h1 className="goals-title">Goals & Milestones</h1>
            <p className="goals-subtitle">
              Dream big, plan smart, act now
            </p>
          </div>
        </div>
        {isOwnProfile && (
          <motion.button
            className="goals-add-btn"
            onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiPlus /> Set a Goal
          </motion.button>
        )}
      </div>

      {/* Stats */}
      <div className="goals-stats">
        <div className="goals-stat-card">
          <span className="goals-stat-emoji">🎯</span>
          <div className="goals-stat-value">{activeGoals}</div>
          <div className="goals-stat-label">Active Goals</div>
        </div>
        <div className="goals-stat-card">
          <span className="goals-stat-emoji">🏆</span>
          <div className="goals-stat-value">{completedGoals}</div>
          <div className="goals-stat-label">Completed</div>
        </div>
        <div className="goals-stat-card">
          <span className="goals-stat-emoji">📋</span>
          <div className="goals-stat-value">{completedMilestones}/{totalMilestones}</div>
          <div className="goals-stat-label">Milestones Done</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="goals-filter-tabs">
        {['active', 'completed', 'all'].map((f) => (
          <button
            key={f}
            className={`goals-filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? '🎯 Active' : f === 'completed' ? '🏆 Completed' : '📋 All'}
          </button>
        ))}
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <h3 className="empty-state-title">
            {filter === 'completed'
              ? 'No completed goals yet'
              : filter === 'active'
              ? 'No active goals'
              : 'No goals yet'}
          </h3>
          <p className="empty-state-text">
            {filter === 'active'
              ? 'Set your first goal and break it into milestones!'
              : 'Start setting goals and crushing them!'}
          </p>
          {filter !== 'completed' && isOwnProfile && (
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => setShowModal(true)}
            >
              <FiPlus /> Set First Goal
            </button>
          )}
        </div>
      ) : (
        <div className="goals-list">
          <AnimatePresence>
            {filteredGoals.map((goal, index) => {
              const progress = getProgress(goal);
              const deadlineInfo = getDeadlineInfo(goal.deadline);

              return (
                <motion.div
                  key={goal.id}
                  className={`goal-card ${goal.completed ? 'completed' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  {/* Header */}
                  <div className="goal-card-header">
                    <div className="goal-card-header-left">
                      <h3
                        className={`goal-card-title ${goal.completed ? 'completed-title' : ''}`}
                      >
                        {goal.completed ? '🏆' : '🎯'} {goal.title}
                      </h3>
                      {goal.category && (
                        <span className="goal-card-category">
                          {goal.category}
                        </span>
                      )}
                    </div>

                    {isOwnProfile && (
                      <div className="goal-card-actions">
                        <button
                          className="goal-action-btn complete-btn"
                          onClick={() => handleToggleGoalComplete(goal.id)}
                          title={goal.completed ? 'Reopen' : 'Complete'}
                        >
                          <FiCheck />
                        </button>
                        <button
                          className="goal-action-btn"
                          onClick={() => openEdit(goal)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="goal-action-btn delete"
                          onClick={() => handleDelete(goal.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <p className="goal-card-description">{goal.description}</p>
                  )}

                  {/* Deadline */}
                  {goal.deadline && (
                    <div className={`goal-deadline ${deadlineInfo?.class || ''}`}>
                      <FiCalendar className="goal-deadline-icon" />
                      <span>
                        Due: {format(new Date(goal.deadline), 'MMMM d, yyyy')}
                      </span>
                      {deadlineInfo && !goal.completed && (
                        <span className={`goal-days-left ${deadlineInfo.class}`}>
                          {deadlineInfo.text}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="goal-progress-section">
                    <div className="goal-progress-header">
                      <span className="goal-progress-label">Progress</span>
                      <span className="goal-progress-percent">{progress}%</span>
                    </div>
                    <div className="goal-progress-bar">
                      <motion.div
                        className={`goal-progress-fill ${progress === 100 ? 'complete' : ''}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Milestones */}
                  {goal.milestones && goal.milestones.length > 0 && (
                    <div className="goal-milestones">
                      <div className="goal-milestones-title">
                        📋 Milestones ({goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length})
                      </div>
                      <div className="goal-milestones-list">
                        {goal.milestones.map((milestone, mIndex) => (
                          <div key={mIndex} className="goal-milestone">
                            <div
                              className={`goal-milestone-check ${milestone.completed ? 'checked' : ''}`}
                              onClick={() => handleToggleMilestone(goal.id, mIndex)}
                            >
                              {milestone.completed ? '✓' : ''}
                            </div>
                            <span
                              className={`goal-milestone-text ${milestone.completed ? 'completed' : ''}`}
                            >
                              {milestone.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Celebration */}
                  {goal.completed && (
                    <div className="goal-celebration">
                      <span className="goal-celebration-emoji">🌸</span>
                      <span className="goal-celebration-text">
                        Goal achieved! You're amazing!
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
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
              style={{ maxWidth: '580px' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingGoal ? '✏️ Edit Goal' : '🎯 New Goal'}
                </h2>
                <button className="modal-close" onClick={closeModal}>
                  <FiX />
                </button>
              </div>

              <div className="goal-modal-form">
                {/* Title */}
                <div className="input-group">
                  <label className="input-label">Goal Title *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="What do you want to achieve?"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="input-group">
                  <label className="input-label">Description (optional)</label>
                  <textarea
                    className="textarea"
                    placeholder="Why is this goal important to you?"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                {/* Category */}
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <div className="goal-category-picker">
                    {GOAL_CATEGORIES.map((cat) => (
                      <div
                        key={cat}
                        className={`goal-category-option ${formData.category === cat ? 'selected' : ''}`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            category: formData.category === cat ? '' : cat,
                          })
                        }
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deadline */}
                <div className="input-group">
                  <label className="input-label">Deadline (optional)</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                  />
                </div>

                {/* Milestones */}
                <div className="input-group">
                  <label className="input-label">
                    Milestones (break it down into steps)
                  </label>

                  <div className="goal-milestone-input-row">
                    <input
                      type="text"
                      className="goal-milestone-add-input"
                      placeholder="Add a milestone..."
                      value={milestoneInput}
                      onChange={(e) => setMilestoneInput(e.target.value)}
                      onKeyDown={handleMilestoneKeyDown}
                    />
                    <button
                      className="goal-milestone-add-btn"
                      onClick={handleAddMilestone}
                    >
                      <FiPlus /> Add
                    </button>
                  </div>

                  {formData.milestones.length > 0 && (
                    <div className="goal-modal-milestones">
                      {formData.milestones.map((m, i) => (
                        <div key={i} className="goal-modal-milestone">
                          <span className="goal-modal-milestone-num">
                            {i + 1}
                          </span>
                          <span className="goal-modal-milestone-text">
                            {m.text}
                          </span>
                          <button
                            className="goal-modal-milestone-remove"
                            onClick={() => handleRemoveMilestone(i)}
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
                  >
                    {editingGoal ? '💾 Save Changes' : '🎯 Set Goal'}
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

export default Goals;