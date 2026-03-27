import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from './Motion';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from './DateUtils';
import { FiPlus, FiTrash2, FiX } from './Icons';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../App';
import {
  db, collection, getDocs, doc, setDoc, deleteDoc, getDoc
} from '../data/firebase';
import './Reviews.css';

const Reviews = () => {
  const { activeProfile, isOwnProfile } = useUser();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('weekly');
  const [reviews, setReviews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [reflection, setReflection] = useState('');
  const [periodStats, setPeriodStats] = useState({
    habitsCompleted: 0,
    habitsTotal: 0,
    journalEntries: 0,
    ideasCaptured: 0,
    gratitudeEntries: 0,
    moodsLogged: 0,
    goalsProgress: 0,
    topMoods: [],
    dailyHabits: [],
  });

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const periodStart = activeTab === 'weekly' ? weekStart : monthStart;
  const periodEnd = activeTab === 'weekly' ? weekEnd : monthEnd;
  const periodLabel = activeTab === 'weekly'
    ? `${format(weekStart, 'MMM d')} — ${format(weekEnd, 'MMM d, yyyy')}`
    : format(today, 'MMMM yyyy');

  // Fetch reviews
  useEffect(() => {
    if (!activeProfile) return;

    const fetchReviews = async () => {
      try {
        const ref = collection(db, 'users', activeProfile.id, 'reviews');
        const snap = await getDocs(ref);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setReviews(data);
      } catch (err) {
        console.log('Fetch reviews error:', err);
      }
    };

    fetchReviews();
  }, [activeProfile]);

  // Calculate period stats
  useEffect(() => {
    if (!activeProfile) return;

    const calculateStats = async () => {
      try {
        const days = eachDayOfInterval({ start: periodStart, end: periodEnd > today ? today : periodEnd });
        const dayKeys = days.map((d) => format(d, 'yyyy-MM-dd'));

        // Habits
        let habitsCompleted = 0;
        let habitsTotal = 0;
        const dailyHabits = [];

        const habitsRef = collection(db, 'users', activeProfile.id, 'habits');
        const habitsSnap = await getDocs(habitsRef);
        const habitsCount = habitsSnap.size;

        for (const dayKey of dayKeys) {
          const checkRef = doc(db, 'users', activeProfile.id, 'habitChecks', dayKey);
          const checkSnap = await getDoc(checkRef);
          let dayCompleted = 0;
          if (checkSnap.exists()) {
            const checks = checkSnap.data().checks || {};
            dayCompleted = Object.values(checks).filter(Boolean).length;
          }
          habitsCompleted += dayCompleted;
          habitsTotal += habitsCount;
          dailyHabits.push({
            day: format(new Date(dayKey + 'T12:00:00'), 'EEE'),
            completed: dayCompleted,
            total: habitsCount,
          });
        }

        // Journal
        const journalRef = collection(db, 'users', activeProfile.id, 'journal');
        const journalSnap = await getDocs(journalRef);
        const journalEntries = journalSnap.docs.filter((d) => {
          const data = d.data();
          if (!data.createdAt) return false;
          const entryDate = new Date(data.createdAt);
          return isWithinInterval(entryDate, { start: periodStart, end: periodEnd });
        }).length;

        // Ideas
        const ideasRef = collection(db, 'users', activeProfile.id, 'ideas');
        const ideasSnap = await getDocs(ideasRef);
        const ideasCaptured = ideasSnap.docs.filter((d) => {
          const data = d.data();
          if (!data.createdAt) return false;
          const entryDate = new Date(data.createdAt);
          return isWithinInterval(entryDate, { start: periodStart, end: periodEnd });
        }).length;

        // Gratitude
        const gratRef = collection(db, 'users', activeProfile.id, 'gratitude');
        const gratSnap = await getDocs(gratRef);
        const gratitudeEntries = gratSnap.docs.filter((d) => {
          const data = d.data();
          return data.date && dayKeys.includes(data.date);
        }).length;

        // Moods
        const moodCounts = {};
        let moodsLogged = 0;

        for (const dayKey of dayKeys) {
          const moodRef = doc(db, 'users', activeProfile.id, 'moods', dayKey);
          const moodSnap = await getDoc(moodRef);
          if (moodSnap.exists()) {
            moodsLogged++;
            const data = moodSnap.data();
            const emoji = data.emoji || '😐';
            const label = data.label || 'Unknown';
            const key = `${emoji} ${label}`;
            moodCounts[key] = (moodCounts[key] || 0) + 1;
          }
        }

        const topMoods = Object.entries(moodCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([mood, count]) => {
            const parts = mood.split(' ');
            return {
              emoji: parts[0],
              label: parts.slice(1).join(' '),
              count,
            };
          });

        // Goals progress
        const goalsRef = collection(db, 'users', activeProfile.id, 'goals');
        const goalsSnap = await getDocs(goalsRef);
        const activeGoals = goalsSnap.docs
          .map((d) => d.data())
          .filter((g) => !g.completed);
        let goalsProgress = 0;
        if (activeGoals.length > 0) {
          const totalProgress = activeGoals.reduce((sum, g) => {
            const milestones = g.milestones || [];
            if (milestones.length === 0) return sum;
            const completed = milestones.filter((m) => m.completed).length;
            return sum + (completed / milestones.length) * 100;
          }, 0);
          goalsProgress = Math.round(totalProgress / activeGoals.length);
        }

        setPeriodStats({
          habitsCompleted,
          habitsTotal,
          journalEntries,
          ideasCaptured,
          gratitudeEntries,
          moodsLogged,
          goalsProgress,
          topMoods,
          dailyHabits,
        });
      } catch (err) {
        console.log('Calculate stats error:', err);
      }
    };

    calculateStats();
  }, [activeProfile, activeTab, periodStart, periodEnd, today]);

  // Save review
  const handleSaveReview = async () => {
    try {
      const id = `${activeTab}-${format(today, 'yyyy-MM-dd')}`;
      const reviewData = {
        type: activeTab,
        period: periodLabel,
        reflection: reflection.trim(),
        stats: {
          habitsCompleted: periodStats.habitsCompleted,
          habitsTotal: periodStats.habitsTotal,
          journalEntries: periodStats.journalEntries,
          ideasCaptured: periodStats.ideasCaptured,
          gratitudeEntries: periodStats.gratitudeEntries,
          moodsLogged: periodStats.moodsLogged,
          goalsProgress: periodStats.goalsProgress,
        },
        createdAt: new Date().toISOString(),
      };

      const ref = doc(db, 'users', activeProfile.id, 'reviews', id);
      await setDoc(ref, reviewData);

      setReviews((prev) => {
        const filtered = prev.filter((r) => r.id !== id);
        return [{ id, ...reviewData }, ...filtered].sort(
          (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
        );
      });

      toast?.addToast(
        `${activeTab === 'weekly' ? 'Weekly' : 'Monthly'} review saved! 📊`,
        'success'
      );
      setShowModal(false);
      setReflection('');
    } catch (err) {
      console.log('Save review error:', err);
      toast?.addToast('Error saving review', 'error');
    }
  };

  // Delete review
  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return;

    try {
      await deleteDoc(doc(db, 'users', activeProfile.id, 'reviews', id));
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast?.addToast('Review deleted', 'warning');
    } catch (err) {
      console.log('Delete error:', err);
    }
  };

  const habitRate = periodStats.habitsTotal > 0
    ? Math.round((periodStats.habitsCompleted / periodStats.habitsTotal) * 100)
    : 0;

  const filteredReviews = reviews.filter((r) => r.type === activeTab);

  return (
    <motion.div
      className="reviews-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="reviews-header">
        <div className="reviews-header-left">
          <span className="reviews-title-icon">📊</span>
          <div>
            <h1 className="reviews-title">Reviews</h1>
            <p className="reviews-subtitle">
              Reflect, learn, and grow
            </p>
          </div>
        </div>
        {isOwnProfile && (
          <motion.button
            className="reviews-add-btn"
            onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiPlus /> Write Review
          </motion.button>
        )}
      </div>

      {/* Tabs */}
      <div className="reviews-tabs">
        <button
          className={`reviews-tab ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          📅 Weekly Review
        </button>
        <button
          className={`reviews-tab ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          📆 Monthly Review
        </button>
      </div>

      {/* Auto Stats */}
      <div className="reviews-auto-stats">
        <div className="reviews-auto-stats-title">
          📈 {activeTab === 'weekly' ? 'This Week' : 'This Month'} at a Glance
          <span className="reviews-auto-stats-period">{periodLabel}</span>
        </div>

        {/* Stats Grid */}
        <div className="reviews-stats-grid">
          <div className="reviews-stat-item">
            <span className="reviews-stat-emoji">✅</span>
            <div className="reviews-stat-value">{periodStats.habitsCompleted}</div>
            <div className="reviews-stat-label">Habits Completed</div>
          </div>
          <div className="reviews-stat-item">
            <span className="reviews-stat-emoji">📈</span>
            <div className="reviews-stat-value">{habitRate}%</div>
            <div className="reviews-stat-label">Habit Rate</div>
          </div>
          <div className="reviews-stat-item">
            <span className="reviews-stat-emoji">📖</span>
            <div className="reviews-stat-value">{periodStats.journalEntries}</div>
            <div className="reviews-stat-label">Journal Entries</div>
          </div>
          <div className="reviews-stat-item">
            <span className="reviews-stat-emoji">💡</span>
            <div className="reviews-stat-value">{periodStats.ideasCaptured}</div>
            <div className="reviews-stat-label">Ideas Captured</div>
          </div>
          <div className="reviews-stat-item">
            <span className="reviews-stat-emoji">🙏</span>
            <div className="reviews-stat-value">{periodStats.gratitudeEntries}</div>
            <div className="reviews-stat-label">Gratitude Days</div>
          </div>
          <div className="reviews-stat-item">
            <span className="reviews-stat-emoji">🎭</span>
            <div className="reviews-stat-value">{periodStats.moodsLogged}</div>
            <div className="reviews-stat-label">Moods Logged</div>
          </div>
          <div className="reviews-stat-item">
            <span className="reviews-stat-emoji">🎯</span>
            <div className="reviews-stat-value">{periodStats.goalsProgress}%</div>
            <div className="reviews-stat-label">Goals Progress</div>
          </div>
        </div>

        {/* Mood Summary */}
        {periodStats.topMoods.length > 0 && (
          <>
            <div className="reviews-reflection-title">🎭 Mood Summary</div>
            <div className="reviews-mood-summary">
              {periodStats.topMoods.map((mood, i) => (
                <div key={i} className="reviews-mood-item">
                  <span className="reviews-mood-emoji">{mood.emoji}</span>
                  <span className="reviews-mood-count">{mood.count}x</span>
                  <span className="reviews-mood-label">{mood.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Habits Chart */}
        {periodStats.dailyHabits.length > 0 && (
          <div className="reviews-chart-card">
            <div className="reviews-chart-title">📊 Daily Habit Completion</div>
            <div className="reviews-mini-chart">
              {periodStats.dailyHabits.map((day, i) => {
                const height = day.total > 0
                  ? (day.completed / day.total) * 80
                  : 0;
                return (
                  <div key={i} className="reviews-chart-bar-wrapper">
                    <motion.div
                      className="reviews-chart-bar"
                      style={{
                        background: height > 60
                          ? 'var(--primary)'
                          : height > 30
                          ? 'var(--gold)'
                          : 'var(--accent)',
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: Math.max(height, 2) }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                    />
                    <span className="reviews-chart-day">{day.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Past Reviews */}
      <div className="reviews-list">
        <h2 className="reviews-list-title">
          📋 Past {activeTab === 'weekly' ? 'Weekly' : 'Monthly'} Reviews
        </h2>

        {filteredReviews.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-state-icon">📊</div>
            <h3 className="empty-state-title">No reviews yet</h3>
            <p className="empty-state-text">
              Write your first {activeTab} review to track your progress!
            </p>
            {isOwnProfile && (
              <button
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
                onClick={() => setShowModal(true)}
              >
                <FiPlus /> Write First Review
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filteredReviews.map((review, index) => (
              <motion.div
                key={review.id}
                className="review-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="review-card-header">
                  <div className="flex gap-12" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`review-card-type ${review.type}`}>
                      {review.type === 'weekly' ? '📅 Weekly' : '📆 Monthly'}
                    </span>
                    <span className="review-card-date">{review.period}</span>
                  </div>

                  {isOwnProfile && (
                    <div className="review-card-actions">
                      <button
                        className="review-action-btn delete"
                        onClick={() => handleDeleteReview(review.id)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats */}
                {review.stats && (
                  <div className="review-card-stats">
                    <div className="review-card-stat">
                      ✅ Habits: <span className="review-card-stat-value">
                        {review.stats.habitsCompleted}/{review.stats.habitsTotal}
                      </span>
                    </div>
                    <div className="review-card-stat">
                      📖 Journal: <span className="review-card-stat-value">
                        {review.stats.journalEntries}
                      </span>
                    </div>
                    <div className="review-card-stat">
                      💡 Ideas: <span className="review-card-stat-value">
                        {review.stats.ideasCaptured}
                      </span>
                    </div>
                    <div className="review-card-stat">
                      🎯 Goals: <span className="review-card-stat-value">
                        {review.stats.goalsProgress}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Reflection */}
                {review.reflection && (
                  <div className="review-card-reflection">
                    {review.reflection}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Write Review Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal"
              style={{ maxWidth: '600px' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  📝 {activeTab === 'weekly' ? 'Weekly' : 'Monthly'} Review
                </h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <FiX />
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span className="reviews-auto-stats-period">{periodLabel}</span>
              </div>

              {/* Quick Stats Summary */}
              <div className="reviews-stats-grid" style={{ marginBottom: '20px' }}>
                <div className="reviews-stat-item">
                  <span className="reviews-stat-emoji">✅</span>
                  <div className="reviews-stat-value">{habitRate}%</div>
                  <div className="reviews-stat-label">Habit Rate</div>
                </div>
                <div className="reviews-stat-item">
                  <span className="reviews-stat-emoji">📖</span>
                  <div className="reviews-stat-value">{periodStats.journalEntries}</div>
                  <div className="reviews-stat-label">Entries</div>
                </div>
                <div className="reviews-stat-item">
                  <span className="reviews-stat-emoji">🎯</span>
                  <div className="reviews-stat-value">{periodStats.goalsProgress}%</div>
                  <div className="reviews-stat-label">Goals</div>
                </div>
              </div>

              {/* Reflection */}
              <div className="reviews-reflection">
                <div className="reviews-reflection-title">
                  ✍️ Your Reflection
                </div>
                <textarea
                  className="reviews-reflection-textarea"
                  placeholder={
                    activeTab === 'weekly'
                      ? "How was your week? What went well? What could be better?\n\nWhat are you proud of?\nWhat will you focus on next week?"
                      : "How was your month? What were the highlights?\n\nWhat did you learn?\nWhat are your intentions for next month?"
                  }
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={6}
                  autoFocus
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-12" style={{ marginTop: '20px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveReview}
                  style={{ flex: 2 }}
                >
                  📊 Save Review
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Reviews;