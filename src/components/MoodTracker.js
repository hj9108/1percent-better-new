import React, { useState, useEffect } from 'react';
import { motion } from './Motion';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from './DateUtils';
import { FiChevronLeft, FiChevronRight } from './Icons';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../App';
import {
  db, collection, getDocs, doc, setDoc, getDoc
} from '../data/firebase';
import './MoodTracker.css';

const MOODS = [
  { emoji: '😊', label: 'Happy', value: 'happy', color: '#4CAF50' },
  { emoji: '🥰', label: 'Loved', value: 'loved', color: '#E91E63' },
  { emoji: '😌', label: 'Calm', value: 'calm', color: '#00BCD4' },
  { emoji: '🤩', label: 'Excited', value: 'excited', color: '#FF9800' },
  { emoji: '🙂', label: 'Good', value: 'good', color: '#8BC34A' },
  { emoji: '😐', label: 'Neutral', value: 'neutral', color: '#9E9E9E' },
  { emoji: '😔', label: 'Sad', value: 'sad', color: '#2196F3' },
  { emoji: '😤', label: 'Angry', value: 'angry', color: '#F44336' },
  { emoji: '😰', label: 'Anxious', value: 'anxious', color: '#FF5722' },
  { emoji: '😴', label: 'Tired', value: 'tired', color: '#795548' },
  { emoji: '🤔', label: 'Thoughtful', value: 'thoughtful', color: '#673AB7' },
  { emoji: '😢', label: 'Crying', value: 'crying', color: '#3F51B5' },
];

const MoodTracker = () => {
  const { activeProfile, isOwnProfile } = useUser();
  const toast = useToast();

  const [selectedMood, setSelectedMood] = useState(null);
  const [moodNote, setMoodNote] = useState('');
  const [todayMood, setTodayMood] = useState(null);
  const [moodHistory, setMoodHistory] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [moodStats, setMoodStats] = useState({ total: 0, streak: 0 });

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch mood data
  useEffect(() => {
    if (!activeProfile) return;

    const fetchMoods = async () => {
      try {
        // Fetch today's mood
        const todayRef = doc(db, 'users', activeProfile.id, 'moods', today);
        const todaySnap = await getDoc(todayRef);
        if (todaySnap.exists()) {
          setTodayMood(todaySnap.data());
          setSelectedMood(MOODS.find((m) => m.value === todaySnap.data().mood) || null);
          setMoodNote(todaySnap.data().note || '');
        }

        // Fetch all moods
        const ref = collection(db, 'users', activeProfile.id, 'moods');
        const snap = await getDocs(ref);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setMoodHistory(data);

        // Calculate streak
        let streak = 0;
        for (let i = 0; i < 365; i++) {
          const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
          if (data.find((m) => m.date === d)) {
            streak++;
          } else {
            break;
          }
        }
        setMoodStats({ total: data.length, streak });
      } catch (err) {
        console.log('Fetch moods error:', err);
      }
    };

    fetchMoods();
  }, [activeProfile, today]);

  // Save mood
  const handleSaveMood = async () => {
    if (!selectedMood) {
      toast?.addToast('Please select a mood first', 'warning');
      return;
    }
    if (!isOwnProfile) return;

    try {
      const moodData = {
        mood: selectedMood.value,
        emoji: selectedMood.emoji,
        label: selectedMood.label,
        color: selectedMood.color,
        note: moodNote.trim(),
        date: today,
        createdAt: new Date().toISOString(),
      };

      const ref = doc(db, 'users', activeProfile.id, 'moods', today);
      await setDoc(ref, moodData);

      setTodayMood(moodData);

      // Update history
      setMoodHistory((prev) => {
        const filtered = prev.filter((m) => m.date !== today);
        return [{ id: today, ...moodData }, ...filtered].sort(
          (a, b) => (b.date || '').localeCompare(a.date || '')
        );
      });

      toast?.addToast(`Mood logged: ${selectedMood.emoji} ${selectedMood.label}`, 'success');
    } catch (err) {
      console.log('Save mood error:', err);
      toast?.addToast('Error saving mood', 'error');
    }
  };

  // Wheel positions
  const getWheelPosition = (index, total, radius) => {
    const angle = (index * 360) / total - 90;
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    return { x, y };
  };

  // Calendar rendering
  const renderCalendar = () => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart);
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const emptyCells = Array(startDay).fill(null);

    return (
      <div className="mood-calendar">
        <div className="mood-calendar-header">
          <h3 className="mood-calendar-title">
            {format(calendarMonth, 'MMMM yyyy')}
          </h3>
          <div className="mood-calendar-nav">
            <button
              className="mood-calendar-nav-btn"
              onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
            >
              <FiChevronLeft />
            </button>
            <button
              className="mood-calendar-nav-btn"
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        <div className="mood-calendar-grid">
          {dayHeaders.map((d) => (
            <div key={d} className="mood-calendar-day-header">{d}</div>
          ))}

          {emptyCells.map((_, i) => (
            <div key={`empty-${i}`} className="mood-calendar-day empty" />
          ))}

          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const moodEntry = moodHistory.find((m) => m.date === dateKey);
            const isToday = dateKey === today;

            return (
              <div
                key={dateKey}
                className={`mood-calendar-day ${moodEntry ? 'has-mood' : ''} ${isToday ? 'today' : ''}`}
                title={moodEntry ? `${moodEntry.label}: ${moodEntry.note || ''}` : format(day, 'MMM d')}
              >
                {moodEntry ? (
                  <>
                    <span className="mood-calendar-day-emoji">{moodEntry.emoji}</span>
                    <span className="mood-calendar-day-num">{format(day, 'd')}</span>
                  </>
                ) : (
                  <span className="mood-calendar-day-num">{format(day, 'd')}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Mood distribution chart
  const renderMoodChart = () => {
    const moodCounts = {};
    MOODS.forEach((m) => { moodCounts[m.value] = 0; });
    moodHistory.forEach((entry) => {
      if (moodCounts[entry.mood] !== undefined) {
        moodCounts[entry.mood]++;
      }
    });

    const maxCount = Math.max(...Object.values(moodCounts), 1);

    return (
      <div className="mood-chart-card">
        <h3 className="mood-chart-title">📊 Mood Distribution</h3>
        <div className="mood-chart-container">
          {MOODS.map((mood) => {
            const count = moodCounts[mood.value] || 0;
            const height = (count / maxCount) * 160;

            return (
              <div key={mood.value} className="mood-chart-bar-wrapper">
                <span className="mood-chart-count">{count > 0 ? count : ''}</span>
                <motion.div
                  className="mood-chart-bar"
                  style={{ background: mood.color }}
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(height, 4) }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                />
                <span className="mood-chart-label">{mood.emoji}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Wheel radius based on screen
  const wheelRadius = 100;

  return (
    <motion.div
      className="mood-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="mood-header">
        <div className="mood-header-left">
          <span className="mood-title-icon">🎭</span>
          <div>
            <h1 className="mood-title">Mood Tracker</h1>
            <p className="mood-subtitle">How are you feeling today?</p>
          </div>
        </div>
      </div>

      {/* Mood Wheel + Today Section */}
      <div className="mood-wheel-section">
        {/* Wheel Card */}
        <div className="mood-wheel-card">
          <h3 className="mood-wheel-title">Select Your Mood</h3>
          <p className="mood-wheel-date">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>

          {/* The Wheel */}
          <div className="mood-wheel-container">
            <div className="mood-wheel">
              {MOODS.map((mood, index) => {
                const pos = getWheelPosition(index, MOODS.length, wheelRadius);
                return (
                  <motion.button
                    key={mood.value}
                    className={`mood-wheel-emoji-btn ${selectedMood?.value === mood.value ? 'selected' : ''}`}
                    style={{
                      left: `calc(50% + ${pos.x}px - 30px)`,
                      top: `calc(50% + ${pos.y}px - 30px)`,
                      borderColor: selectedMood?.value === mood.value ? mood.color : undefined,
                    }}
                    onClick={() => setSelectedMood(mood)}
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.95 }}
                    title={mood.label}
                  >
                    {mood.emoji}
                  </motion.button>
                );
              })}

              {/* Center */}
              <div className="mood-wheel-center">
                <span className="mood-wheel-center-emoji">
                  {selectedMood ? selectedMood.emoji : '🌿'}
                </span>
                <span className="mood-wheel-center-label">
                  {selectedMood ? selectedMood.label : 'Pick'}
                </span>
              </div>
            </div>
          </div>

          {/* Note */}
          {isOwnProfile && (
            <div className="mood-note-section">
              <textarea
                className="mood-note-input"
                placeholder="Add a note about how you're feeling... (optional)"
                value={moodNote}
                onChange={(e) => setMoodNote(e.target.value)}
                rows={2}
              />

              <motion.button
                className="mood-save-btn"
                onClick={handleSaveMood}
                disabled={!selectedMood}
                whileTap={{ scale: 0.97 }}
              >
                {todayMood ? '🔄 Update Mood' : '🌿 Log Mood'}
              </motion.button>

              {todayMood && (
                <div className="mood-saved-message">
                  ✅ Mood logged for today!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Today Summary */}
        <div className="mood-today-card">
          <h3 className="mood-today-title">📋 Today's Summary</h3>

          {todayMood ? (
            <>
              <div className="mood-today-display">
                <span className="mood-today-emoji">{todayMood.emoji}</span>
                <div className="mood-today-label">{todayMood.label}</div>
                <div className="mood-today-time">
                  Logged at{' '}
                  {todayMood.createdAt
                    ? format(new Date(todayMood.createdAt), 'h:mm a')
                    : '—'}
                </div>
              </div>

              {todayMood.note && (
                <div className="mood-today-note">"{todayMood.note}"</div>
              )}
            </>
          ) : (
            <div className="mood-today-display">
              <span className="mood-today-emoji">🌿</span>
              <div className="mood-today-label">Not logged yet</div>
              <div className="mood-today-time">
                Use the mood wheel to log
              </div>
            </div>
          )}

          <div className="mood-streak-info">
            <div className="mood-streak-item">
              <div className="mood-streak-value">{moodStats.streak}</div>
              <div className="mood-streak-label">Day Streak 🔥</div>
            </div>
            <div className="mood-streak-item">
              <div className="mood-streak-value">{moodStats.total}</div>
              <div className="mood-streak-label">Total Logs 📊</div>
            </div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="mood-history">
        <h2 className="mood-history-title">📅 Mood History</h2>

        {/* Calendar */}
        {renderCalendar()}

        {/* Chart */}
        {moodHistory.length > 0 && renderMoodChart()}

        {/* Timeline */}
        <div className="mood-timeline">
          <h3 className="mood-timeline-title">🕐 Recent Moods</h3>

          {moodHistory.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px' }}>
              <div className="empty-state-icon">🎭</div>
              <p className="empty-state-text">No mood entries yet. Start tracking!</p>
            </div>
          ) : (
            <div className="mood-timeline-list">
              {moodHistory.slice(0, 14).map((entry, index) => (
                <motion.div
                  key={entry.id || entry.date}
                  className="mood-timeline-item"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <span className="mood-timeline-emoji">{entry.emoji}</span>
                  <div className="mood-timeline-info">
                    <div className="mood-timeline-label">{entry.label}</div>
                    <div className="mood-timeline-date">
                      {entry.date
                        ? format(new Date(entry.date + 'T12:00:00'), 'EEEE, MMM d, yyyy')
                        : ''}
                    </div>
                    {entry.note && (
                      <div className="mood-timeline-note">"{entry.note}"</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MoodTracker;