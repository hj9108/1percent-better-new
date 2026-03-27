import React, { useState, useEffect } from 'react';
import { motion } from './Motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isSameDay } from './DateUtils';
import { FiChevronLeft, FiChevronRight, FiX } from './Icons';
import { useUser } from '../contexts/UserContext';
import {
  db, collection, getDocs, doc, getDoc
} from '../data/firebase';
import './CalendarView.css';

const ENTRY_TYPES = [
  { key: 'all', label: 'All', emoji: '📋' },
  { key: 'habit', label: 'Habits', emoji: '✅' },
  { key: 'journal', label: 'Journal', emoji: '📖' },
  { key: 'idea', label: 'Ideas', emoji: '💡' },
  { key: 'mood', label: 'Mood', emoji: '🎭' },
  { key: 'gratitude', label: 'Gratitude', emoji: '🙏' },
];

const CalendarView = () => {
  const { activeProfile } = useUser();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);
  const [calendarData, setCalendarData] = useState({});
  const [dayDetail, setDayDetail] = useState(null);

  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch all data for the month
  useEffect(() => {
    if (!activeProfile) return;

    const fetchMonthData = async () => {
      try {
        const data = {};
        const dayKeys = daysInMonth.map((d) => format(d, 'yyyy-MM-dd'));

        // Initialize all days
        dayKeys.forEach((key) => {
          data[key] = {
            habits: { completed: 0, total: 0 },
            journal: [],
            ideas: [],
            mood: null,
            gratitude: null,
          };
        });

        // Fetch habits count
        const habitsRef = collection(db, 'users', activeProfile.id, 'habits');
        const habitsSnap = await getDocs(habitsRef);
        const habitsCount = habitsSnap.size;

        // Fetch habit checks for each day
        for (const dayKey of dayKeys) {
          const checkRef = doc(db, 'users', activeProfile.id, 'habitChecks', dayKey);
          const checkSnap = await getDoc(checkRef);
          if (checkSnap.exists()) {
            const checks = checkSnap.data().checks || {};
            const completed = Object.values(checks).filter(Boolean).length;
            data[dayKey].habits = { completed, total: habitsCount };
          } else {
            data[dayKey].habits = { completed: 0, total: habitsCount };
          }
        }

        // Fetch journal entries
        const journalRef = collection(db, 'users', activeProfile.id, 'journal');
        const journalSnap = await getDocs(journalRef);
        journalSnap.docs.forEach((d) => {
          const entry = d.data();
          if (entry.createdAt) {
            const key = format(new Date(entry.createdAt), 'yyyy-MM-dd');
            if (data[key]) {
              data[key].journal.push({
                title: entry.title || 'Untitled',
                id: d.id,
              });
            }
          }
        });

        // Fetch ideas
        const ideasRef = collection(db, 'users', activeProfile.id, 'ideas');
        const ideasSnap = await getDocs(ideasRef);
        ideasSnap.docs.forEach((d) => {
          const entry = d.data();
          if (entry.createdAt) {
            const key = format(new Date(entry.createdAt), 'yyyy-MM-dd');
            if (data[key]) {
              data[key].ideas.push({
                title: entry.title || 'Untitled',
                id: d.id,
              });
            }
          }
        });

        // Fetch moods
        for (const dayKey of dayKeys) {
          const moodRef = doc(db, 'users', activeProfile.id, 'moods', dayKey);
          const moodSnap = await getDoc(moodRef);
          if (moodSnap.exists()) {
            data[dayKey].mood = moodSnap.data();
          }
        }

        // Fetch gratitude
        for (const dayKey of dayKeys) {
          const gratRef = doc(db, 'users', activeProfile.id, 'gratitude', dayKey);
          const gratSnap = await getDoc(gratRef);
          if (gratSnap.exists()) {
            data[dayKey].gratitude = gratSnap.data();
          }
        }

        setCalendarData(data);
      } catch (err) {
        console.log('Calendar fetch error:', err);
      }
    };

    fetchMonthData();
  }, [activeProfile, currentMonth]);

  // Get entries for a day
  const getDayEntries = (dayKey) => {
    const dayData = calendarData[dayKey];
    if (!dayData) return [];

    const entries = [];

    if (
      (activeFilter === 'all' || activeFilter === 'habit') &&
      dayData.habits.completed > 0
    ) {
      entries.push({
        type: 'habit',
        text: `${dayData.habits.completed}/${dayData.habits.total} habits`,
        emoji: '✅',
      });
    }

    if (activeFilter === 'all' || activeFilter === 'journal') {
      dayData.journal.forEach((j) => {
        entries.push({
          type: 'journal',
          text: j.title,
          emoji: '📖',
        });
      });
    }

    if (activeFilter === 'all' || activeFilter === 'idea') {
      dayData.ideas.forEach((i) => {
        entries.push({
          type: 'idea',
          text: i.title,
          emoji: '💡',
        });
      });
    }

    if (
      (activeFilter === 'all' || activeFilter === 'mood') &&
      dayData.mood
    ) {
      entries.push({
        type: 'mood',
        text: `${dayData.mood.emoji} ${dayData.mood.label}`,
        emoji: dayData.mood.emoji,
      });
    }

    if (
      (activeFilter === 'all' || activeFilter === 'gratitude') &&
      dayData.gratitude
    ) {
      entries.push({
        type: 'gratitude',
        text: `${dayData.gratitude.items?.length || 0} things`,
        emoji: '🙏',
      });
    }

    return entries;
  };

  // Handle day click
  const handleDayClick = (day) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayData = calendarData[dayKey];

    setSelectedDay(day);
    setDayDetail(dayData || null);
  };

  return (
    <motion.div
      className="calendar-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="calendar-header">
        <div className="calendar-header-left">
          <span className="calendar-title-icon">📅</span>
          <div>
            <h1 className="calendar-title">Calendar</h1>
            <p className="calendar-subtitle">
              See all your entries at a glance
            </p>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="calendar-filters">
        {ENTRY_TYPES.map((type) => (
          <button
            key={type.key}
            className={`calendar-filter-chip ${activeFilter === type.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(type.key)}
          >
            {type.emoji} {type.label}
          </button>
        ))}
      </div>

      {/* Month Navigation */}
      <div className="calendar-nav">
        <button
          className="calendar-nav-btn"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <FiChevronLeft />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="calendar-nav-title">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          {!isSameDay(startOfMonth(today), monthStart) && (
            <div
              className="calendar-nav-today"
              onClick={() => setCurrentMonth(new Date())}
            >
              ↩ Go to today
            </div>
          )}
        </div>
        <button
          className="calendar-nav-btn"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <FiChevronRight />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid-container">
        {/* Day Headers */}
        <div className="calendar-day-headers">
          {dayHeaders.map((d) => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {/* Empty cells for days before month starts */}
          {Array(startDay)
            .fill(null)
            .map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty" />
            ))}

          {/* Days */}
          {daysInMonth.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, today);
            const entries = getDayEntries(dayKey);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const hasEntries = entries.length > 0;

            return (
              <motion.div
                key={dayKey}
                className={`calendar-day ${isToday ? 'today' : ''} ${hasEntries ? 'has-entries' : ''}`}
                onClick={() => handleDayClick(day)}
                style={{
                  borderColor: isSelected ? 'var(--gold)' : undefined,
                  borderWidth: isSelected ? '2px' : undefined,
                  borderStyle: isSelected ? 'solid' : undefined,
                }}
                whileHover={{ scale: 1.03 }}
              >
                <div className="calendar-day-number">
                  {format(day, 'd')}
                </div>

                <div className="calendar-day-entries">
                  {entries.slice(0, 3).map((entry, i) => (
                    <div
                      key={i}
                      className={`calendar-day-entry type-${entry.type}`}
                    >
                      {entry.emoji} {entry.text}
                    </div>
                  ))}
                  {entries.length > 3 && (
                    <div className="calendar-day-more">
                      +{entries.length - 3} more
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="calendar-legend">
          <div className="calendar-legend-item">
            <div
              className="calendar-legend-dot"
              style={{ background: 'rgba(45, 90, 61, 0.3)' }}
            />
            Habits
          </div>
          <div className="calendar-legend-item">
            <div
              className="calendar-legend-dot"
              style={{ background: 'rgba(198, 123, 92, 0.3)' }}
            />
            Journal
          </div>
          <div className="calendar-legend-item">
            <div
              className="calendar-legend-dot"
              style={{ background: 'rgba(212, 168, 67, 0.3)' }}
            />
            Ideas
          </div>
          <div className="calendar-legend-item">
            <div
              className="calendar-legend-dot"
              style={{ background: 'rgba(91, 143, 168, 0.3)' }}
            />
            Mood
          </div>
          <div className="calendar-legend-item">
            <div
              className="calendar-legend-dot"
              style={{ background: 'rgba(198, 123, 92, 0.2)' }}
            />
            Gratitude
          </div>
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <motion.div
          className="calendar-detail-panel"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="calendar-detail-header">
            <div className="calendar-detail-date">
              📅 {format(selectedDay, 'EEEE, MMMM d, yyyy')}
            </div>
            <button
              className="calendar-detail-close"
              onClick={() => {
                setSelectedDay(null);
                setDayDetail(null);
              }}
            >
              <FiX />
            </button>
          </div>

          {dayDetail ? (
            <div className="calendar-detail-sections">
              {/* Habits */}
              {dayDetail.habits.total > 0 && (
                <div className="calendar-detail-section">
                  <div className="calendar-detail-section-title">
                    ✅ Habits
                  </div>
                  <div className="calendar-detail-item">
                    <span className="calendar-detail-item-icon">📊</span>
                    <span className="calendar-detail-item-text">
                      {dayDetail.habits.completed} of {dayDetail.habits.total} completed
                    </span>
                    <span className="calendar-detail-item-meta">
                      {dayDetail.habits.total > 0
                        ? Math.round(
                            (dayDetail.habits.completed / dayDetail.habits.total) * 100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              )}

              {/* Mood */}
              {dayDetail.mood && (
                <div className="calendar-detail-section">
                  <div className="calendar-detail-section-title">
                    🎭 Mood
                  </div>
                  <div className="calendar-detail-item">
                    <span className="calendar-detail-item-icon">
                      {dayDetail.mood.emoji}
                    </span>
                    <span className="calendar-detail-item-text">
                      {dayDetail.mood.label}
                    </span>
                  </div>
                  {dayDetail.mood.note && (
                    <div
                      className="calendar-detail-item"
                      style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}
                    >
                      "{dayDetail.mood.note}"
                    </div>
                  )}
                </div>
              )}

              {/* Journal */}
              {dayDetail.journal.length > 0 && (
                <div className="calendar-detail-section">
                  <div className="calendar-detail-section-title">
                    📖 Journal Entries
                  </div>
                  {dayDetail.journal.map((entry, i) => (
                    <div key={i} className="calendar-detail-item">
                      <span className="calendar-detail-item-icon">📝</span>
                      <span className="calendar-detail-item-text">
                        {entry.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Ideas */}
              {dayDetail.ideas.length > 0 && (
                <div className="calendar-detail-section">
                  <div className="calendar-detail-section-title">
                    💡 Ideas
                  </div>
                  {dayDetail.ideas.map((idea, i) => (
                    <div key={i} className="calendar-detail-item">
                      <span className="calendar-detail-item-icon">💡</span>
                      <span className="calendar-detail-item-text">
                        {idea.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Gratitude */}
              {dayDetail.gratitude && (
                <div className="calendar-detail-section">
                  <div className="calendar-detail-section-title">
                    🙏 Gratitude
                  </div>
                  {dayDetail.gratitude.items?.map((item, i) => (
                    <div key={i} className="calendar-detail-item">
                      <span className="calendar-detail-item-icon">🌿</span>
                      <span className="calendar-detail-item-text">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state for day */}
              {dayDetail.habits.completed === 0 &&
                !dayDetail.mood &&
                dayDetail.journal.length === 0 &&
                dayDetail.ideas.length === 0 &&
                !dayDetail.gratitude && (
                  <div className="calendar-detail-empty">
                    🌱 Nothing logged on this day
                  </div>
                )}
            </div>
          ) : (
            <div className="calendar-detail-empty">
              🌱 Nothing logged on this day
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default CalendarView;