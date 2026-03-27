import React, { useState, useEffect } from 'react';
import { motion } from './Motion';
import { FiSun, FiMoon, FiDownload } from './Icons';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../App';
import {
  db, collection, getDocs
} from '../data/firebase';
import './Settings.css';

const Settings = () => {
  const { loggedInUser, activeProfile, isOwnProfile } = useUser();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();

  const [dataCounts, setDataCounts] = useState({
    habits: 0,
    journal: 0,
    ideas: 0,
    moods: 0,
    gratitude: 0,
    goals: 0,
    reviews: 0,
  });

  // Fetch data counts
  useEffect(() => {
    if (!activeProfile) return;

    const fetchCounts = async () => {
      try {
        const collections = ['habits', 'journal', 'ideas', 'moods', 'gratitude', 'goals', 'reviews'];
        const counts = {};

        for (const col of collections) {
          const ref = collection(db, 'users', activeProfile.id, col);
          const snap = await getDocs(ref);
          counts[col] = snap.size;
        }

        setDataCounts(counts);
      } catch (err) {
        console.log('Fetch counts error:', err);
      }
    };

    fetchCounts();
  }, [activeProfile]);

  // Export data
  const handleExport = async () => {
    try {
      const exportData = {};
      const collections = ['habits', 'journal', 'ideas', 'moods', 'gratitude', 'goals', 'reviews'];

      for (const col of collections) {
        const ref = collection(db, 'users', activeProfile.id, col);
        const snap = await getDocs(ref);
        exportData[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `1percent-better-${activeProfile.displayName}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast?.addToast('Data exported successfully! 📁', 'success');
    } catch (err) {
      console.log('Export error:', err);
      toast?.addToast('Error exporting data', 'error');
    }
  };

  const totalEntries = Object.values(dataCounts).reduce((sum, c) => sum + c, 0);

  return (
    <motion.div
      className="settings-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="settings-header">
        <span className="settings-title-icon">⚙️</span>
        <div>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Customize your experience</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="settings-section">
        <h2 className="settings-section-title">👤 Profile</h2>

        <div className="settings-profile-card">
          <div className="settings-profile-avatar">
            {activeProfile.emoji}
          </div>
          <div className="settings-profile-info">
            <div className="settings-profile-name">
              {activeProfile.displayName}
            </div>
            <div className="settings-profile-username">
              @{activeProfile.username}
            </div>
          </div>
          <span className="settings-profile-badge">
            {isOwnProfile ? '🌿 Your Garden' : "👀 Viewing"}
          </span>
        </div>

        {loggedInUser && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Logged in as: <strong>{loggedInUser.displayName}</strong>
          </div>
        )}
      </div>

      {/* Appearance Section */}
      <div className="settings-section">
        <h2 className="settings-section-title">🎨 Appearance</h2>

        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">
              {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </div>
            <div className="settings-row-desc">
              {isDark
                ? 'Easy on the eyes for night owls'
                : 'Bright and warm like morning sun'}
            </div>
          </div>
          <div
            className={`settings-theme-toggle ${isDark ? 'dark' : ''}`}
            onClick={toggleTheme}
          >
            <div className="settings-theme-knob">
              {isDark ? <FiMoon /> : <FiSun />}
            </div>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">🌿 Theme</div>
            <div className="settings-row-desc">
              Forest Green, Warm Beige, Terracotta & Gold
            </div>
          </div>
          <span
            style={{
              display: 'flex',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#2D5A3D',
              }}
            />
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#F5E6D3',
                border: '1px solid #DDD0C0',
              }}
            />
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#C67B5C',
              }}
            />
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#D4A843',
              }}
            />
          </span>
        </div>
      </div>

      {/* Data Section */}
      <div className="settings-section">
        <h2 className="settings-section-title">📊 Your Data</h2>

        <div className="settings-data-grid">
          <div className="settings-data-card">
            <span className="settings-data-emoji">✅</span>
            <div className="settings-data-value">{dataCounts.habits}</div>
            <div className="settings-data-label">Habits</div>
          </div>
          <div className="settings-data-card">
            <span className="settings-data-emoji">📖</span>
            <div className="settings-data-value">{dataCounts.journal}</div>
            <div className="settings-data-label">Journal</div>
          </div>
          <div className="settings-data-card">
            <span className="settings-data-emoji">💡</span>
            <div className="settings-data-value">{dataCounts.ideas}</div>
            <div className="settings-data-label">Ideas</div>
          </div>
          <div className="settings-data-card">
            <span className="settings-data-emoji">🎭</span>
            <div className="settings-data-value">{dataCounts.moods}</div>
            <div className="settings-data-label">Moods</div>
          </div>
          <div className="settings-data-card">
            <span className="settings-data-emoji">🙏</span>
            <div className="settings-data-value">{dataCounts.gratitude}</div>
            <div className="settings-data-label">Gratitude</div>
          </div>
          <div className="settings-data-card">
            <span className="settings-data-emoji">🎯</span>
            <div className="settings-data-value">{dataCounts.goals}</div>
            <div className="settings-data-label">Goals</div>
          </div>
          <div className="settings-data-card">
            <span className="settings-data-emoji">📊</span>
            <div className="settings-data-value">{dataCounts.reviews}</div>
            <div className="settings-data-label">Reviews</div>
          </div>
          <div className="settings-data-card">
            <span className="settings-data-emoji">🌿</span>
            <div className="settings-data-value">{totalEntries}</div>
            <div className="settings-data-label">Total</div>
          </div>
        </div>

        <button className="settings-export-btn" onClick={handleExport}>
          <FiDownload /> Export All Data (JSON)
        </button>
      </div>

      {/* About Section */}
      <div className="settings-section">
        <div className="settings-about">
          <div className="settings-about-logo">🌿</div>
          <div className="settings-about-name">1%Better</div>
          <div className="settings-about-tagline">
            Grow a little every day
          </div>
          <div className="settings-about-version">Version 1.0.0</div>
          <div className="settings-about-heart">
            Made with 💚 for personal growth
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;