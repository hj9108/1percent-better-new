import React, { useState, useEffect } from 'react';
import { motion } from './Motion';
import { format } from './DateUtils';
import {
  FiCheckSquare,
  FiBookOpen,
  FiTarget,
  FiHeart,
  FiArrowRight,
  FaRegLightbulb,
  FaFire,
} from './Icons';
import { useUser } from '../contexts/UserContext';
import { useToast, useNavigation } from '../App';
import { getQuoteOfTheDay } from '../data/quotes';
import {
  db,
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from '../data/firebase';
import './Dashboard.css';

const Dashboard = () => {
  const { activeProfile, isOwnProfile } = useUser();
  const { navigate } = useNavigation();
  const toast = useToast();
  const quote = getQuoteOfTheDay();
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'EEEE, MMMM d, yyyy');

  const [todayMood, setTodayMood] = useState(null);
  const [habits, setHabits] = useState([]);
  const [habitChecks, setHabitChecks] = useState({});
  const [goals, setGoals] = useState([]);
  const [journalCount, setJournalCount] = useState(0);
  const [ideasCount, setIdeasCount] = useState(0);
  const [gratitudeCount, setGratitudeCount] = useState(0);
  const [recentEntries, setRecentEntries] = useState([]);

  const moods = [
    { emoji: '😊', label: 'Great', value: 'great' },
    { emoji: '🙂', label: 'Good', value: 'good' },
    { emoji: '😐', label: 'Okay', value: 'okay' },
    { emoji: '😔', label: 'Low', value: 'low' },
    { emoji: '😢', label: 'Sad', value: 'sad' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getPlantForStreak = (streak) => {
    if (streak >= 30) return '🌳';
    if (streak >= 14) return '🌿';
    if (streak >= 7) return '🌱';
    if (streak >= 3) return '☘️';
    return '🫘';
  };

  useEffect(() => {
    if (!activeProfile) return;

    const fetchData = async () => {
      try {
        const habitsRef = collection(db, 'users', activeProfile.id, 'habits');
        const habitsSnap = await getDocs(habitsRef);
        const habitsData = habitsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setHabits(habitsData);

        const checksRef = doc(
          db,
          'users',
          activeProfile.id,
          'habitChecks',
          today
        );
        const checksSnap = await getDoc(checksRef);
        if (checksSnap.exists()) {
          setHabitChecks(checksSnap.data().checks || {});
        } else {
          setHabitChecks({});
        }

        const moodRef = doc(db, 'users', activeProfile.id, 'moods', today);
        const moodSnap = await getDoc(moodRef);
        if (moodSnap.exists()) {
          setTodayMood(moodSnap.data().mood);
        } else {
          setTodayMood(null);
        }

        const goalsRef = collection(db, 'users', activeProfile.id, 'goals');
        const goalsSnap = await getDocs(goalsRef);
        const goalsData = goalsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((g) => !g.completed)
          .slice(0, 3);
        setGoals(goalsData);

        const journalRef = collection(
          db,
          'users',
          activeProfile.id,
          'journal'
        );
        const journalSnap = await getDocs(journalRef);
        setJournalCount(journalSnap.size);

        const ideasRef = collection(db, 'users', activeProfile.id, 'ideas');
        const ideasSnap = await getDocs(ideasRef);
        setIdeasCount(ideasSnap.size);

        const gratRef = collection(
          db,
          'users',
          activeProfile.id,
          'gratitude'
        );
        const gratSnap = await getDocs(gratRef);
        setGratitudeCount(gratSnap.size);

        const recent = [];
        journalSnap.docs.forEach((d) => {
          recent.push({ type: 'journal', ...d.data(), id: d.id });
        });
        ideasSnap.docs.forEach((d) => {
          recent.push({ type: 'idea', ...d.data(), id: d.id });
        });
        gratSnap.docs.forEach((d) => {
          recent.push({ type: 'gratitude', ...d.data(), id: d.id });
        });
        recent.sort((a, b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );
        setRecentEntries(recent.slice(0, 5));
      } catch (error) {
        console.log('Dashboard fetch error:', error);
      }
    };

    fetchData();
  }, [activeProfile, today]);

  const handleMoodSelect = async (mood) => {
    if (!isOwnProfile) return;
    setTodayMood(mood.value);

    try {
      const moodRef = doc(db, 'users', activeProfile.id, 'moods', today);
      await setDoc(moodRef, {
        mood: mood.value,
        emoji: mood.emoji,
        label: mood.label,
        date: today,
        createdAt: new Date().toISOString(),
      });
      toast?.addToast(`Mood set to ${mood.emoji} ${mood.label}`, 'success');
    } catch (error) {
      console.log('Mood save error:', error);
    }
  };

  const handleHabitToggle = async (habitId) => {
    if (!isOwnProfile) return;

    const newChecks = { ...habitChecks };
    newChecks[habitId] = !newChecks[habitId];
    setHabitChecks(newChecks);

    try {
      const checksRef = doc(
        db,
        'users',
        activeProfile.id,
        'habitChecks',
        today
      );
      await setDoc(
        checksRef,
        { checks: newChecks, date: today },
        { merge: true }
      );
    } catch (error) {
      console.log('Habit toggle error:', error);
    }
  };

  const completedHabits = Object.values(habitChecks).filter(Boolean).length;
  const totalHabits = habits.length;

  return (
    <motion.div
      className="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dash-greeting">
        <div className="dash-greeting-top">
          <h1 className="dash-hello">
            <span className="dash-hello-emoji">{activeProfile.emoji}</span>
            {getGreeting()}, {activeProfile.displayName}!
          </h1>
          <span className="dash-date">📅 {todayDisplay}</span>
        </div>
      </div>

      <motion.div
        className="dash-quote-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className="dash-quote-label">✨ Quote of the Day</div>
        <p className="dash-quote-text">"{quote.text}"</p>
        <p className="dash-quote-author">— {quote.author}</p>
      </motion.div>

      <div className="dash-stats-grid">
        <motion.div
          className="dash-stat-card"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/habits')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dash-stat-icon-wrapper dash-stat-icon-green">
            <FiCheckSquare />
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-value">
              {completedHabits}/{totalHabits}
            </div>
            <div className="dash-stat-label">Habits Today</div>
          </div>
        </motion.div>

        <motion.div
          className="dash-stat-card"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/journal')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dash-stat-icon-wrapper dash-stat-icon-accent">
            <FiBookOpen />
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-value">{journalCount}</div>
            <div className="dash-stat-label">Journal Entries</div>
          </div>
        </motion.div>

        <motion.div
          className="dash-stat-card"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/ideas')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dash-stat-icon-wrapper dash-stat-icon-gold">
            <FaRegLightbulb />
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-value">{ideasCount}</div>
            <div className="dash-stat-label">Ideas Captured</div>
          </div>
        </motion.div>

        <motion.div
          className="dash-stat-card"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/gratitude')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dash-stat-icon-wrapper dash-stat-icon-info">
            <FiHeart />
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-value">{gratitudeCount}</div>
            <div className="dash-stat-label">Gratitude Entries</div>
          </div>
        </motion.div>
      </div>

      <div className="dash-two-col">
        <motion.div
          className="dash-mood-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="dash-section-title">🎭 How are you feeling?</h3>
          <div className="dash-mood-options">
            {moods.map((mood) => (
              <motion.div
                key={mood.value}
                className={`dash-mood-btn ${
                  todayMood === mood.value ? 'selected' : ''
                }`}
                onClick={() => handleMoodSelect(mood)}
                whileTap={{ scale: 0.95 }}
              >
                <span className="dash-mood-emoji">{mood.emoji}</span>
                <span className="dash-mood-label">{mood.label}</span>
              </motion.div>
            ))}
          </div>
          {todayMood && (
            <div className="dash-mood-saved">✅ Mood logged for today!</div>
          )}
        </motion.div>

        <motion.div
          className="dash-habits-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="dash-section-title">🌱 Today's Habits</h3>
          {habits.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 10px' }}>
              <div className="empty-state-icon">🌱</div>
              <p className="empty-state-text">
                No habits yet. Start planting!
              </p>
              {isOwnProfile && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '12px' }}
                  onClick={() => navigate('/habits')}
                >
                  Add Habit
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="dash-habit-list">
                {habits.slice(0, 5).map((habit) => (
                  <div key={habit.id} className="dash-habit-item">
                    <div
                      className={`dash-habit-check ${
                        habitChecks[habit.id] ? 'checked' : ''
                      }`}
                      onClick={() => handleHabitToggle(habit.id)}
                    >
                      {habitChecks[habit.id] ? '✓' : ''}
                    </div>
                    <span
                      className={`dash-habit-name ${
                        habitChecks[habit.id] ? 'completed' : ''
                      }`}
                    >
                      {habit.name}
                    </span>
                    {habit.streak > 0 && (
                      <span className="dash-habit-streak">
                        <FaFire /> {habit.streak}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {habits.length > 5 && (
                <button
                  className="dash-view-all-btn"
                  onClick={() => navigate('/habits')}
                >
                  View all {habits.length} habits <FiArrowRight />
                </button>
              )}
            </>
          )}
        </motion.div>
      </div>

      <div className="dash-two-col">
        <motion.div
          className="dash-goals-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="dash-section-title">🎯 Goals Progress</h3>
          {goals.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 10px' }}>
              <div className="empty-state-icon">🎯</div>
              <p className="empty-state-text">No active goals yet.</p>
              {isOwnProfile && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '12px' }}
                  onClick={() => navigate('/goals')}
                >
                  Set a Goal
                </button>
              )}
            </div>
          ) : (
            goals.map((goal) => {
              const milestones = goal.milestones || [];
              const completed = milestones.filter((m) => m.completed).length;
              const percent =
                milestones.length > 0
                  ? Math.round((completed / milestones.length) * 100)
                  : 0;

              return (
                <div key={goal.id} className="dash-goal-item">
                  <div className="dash-goal-header">
                    <span className="dash-goal-name">{goal.title}</span>
                    <span className="dash-goal-percent">{percent}%</span>
                  </div>
                  <div className="dash-goal-bar">
                    <motion.div
                      className="dash-goal-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                  {goal.deadline && (
                    <div className="dash-goal-deadline">
                      Due: {format(new Date(goal.deadline), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </motion.div>

        <motion.div
          className="dash-garden-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="dash-section-title">🌳 Your Garden</h3>
          {habits.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 10px' }}>
              <div className="empty-state-icon">🏡</div>
              <p className="empty-state-text">
                Your garden grows with your habits!
              </p>
            </div>
          ) : (
            <>
              <div className="dash-garden">
                {habits.map((habit) => (
                  <motion.div
                    key={habit.id}
                    className="dash-garden-plant"
                    whileHover={{ scale: 1.1 }}
                  >
                    <span className="dash-garden-emoji">
                      {getPlantForStreak(habit.streak || 0)}
                    </span>
                    <span className="dash-garden-name">{habit.name}</span>
                  </motion.div>
                ))}
              </div>
              <p className="dash-garden-hint">
                🫘 Seed → ☘️ 3days → 🌱 7days → 🌿 14days → 🌳 30days
              </p>
            </>
          )}
        </motion.div>
      </div>

      {recentEntries.length > 0 && (
        <motion.div
          className="dash-recent-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="dash-section-title">📝 Recent Entries</h3>
          <div className="dash-recent-list">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="dash-recent-item"
                onClick={() => {
                  if (entry.type === 'journal') navigate('/journal');
                  else if (entry.type === 'idea') navigate('/ideas');
                  else navigate('/gratitude');
                }}
              >
                <div
                  className={`dash-recent-icon dash-recent-icon-${entry.type}`}
                >
                  {entry.type === 'journal'
                    ? '📖'
                    : entry.type === 'idea'
                    ? '💡'
                    : '🙏'}
                </div>
                <div className="dash-recent-info">
                  <div className="dash-recent-title truncate">
                    {entry.title || entry.text || 'Untitled'}
                  </div>
                  <div className="dash-recent-meta">
                    {entry.type} •{' '}
                    {entry.createdAt
                      ? format(new Date(entry.createdAt), 'MMM d')
                      : 'Unknown date'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;