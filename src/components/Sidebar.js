import React from 'react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '../App';
import './Sidebar.css';

const Sidebar = () => {
  const { loggedInUser, activeProfile, switchProfile, logout, isOwnProfile } = useUser();
  const { isDark, toggleTheme } = useTheme();
  const { currentPage, navigate } = useNavigation();

  const navItems = [
    { path: '/', icon: '⌂', label: 'Dashboard' },
    { path: '/habits', icon: '☑', label: 'Habit Tracker' },
    { path: '/journal', icon: '📖', label: 'Journal' },
    { path: '/ideas', icon: '💡', label: 'Idea Capture' },
    { path: '/mood', icon: '🎭', label: 'Mood Wheel' },
    { path: '/gratitude', icon: '🙏', label: 'Gratitude Log' },
    { path: '/goals', icon: '◎', label: 'Goals' },
    { path: '/reviews', icon: '📊', label: 'Reviews' },
    { path: '/calendar', icon: '📅', label: 'Calendar' },
    { path: '/search', icon: '🔍', label: 'Search' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo-section">
        <div className="sidebar-logo-icon">🌿</div>
        <h1 className="sidebar-logo-text">1%Better</h1>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.path}
            className={`sidebar-link ${currentPage === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="sidebar-user-section">
        {/* Theme Toggle */}
        <div className="theme-toggle-container">
          <span className="theme-label">
            {isDark ? '🌙 Dark' : '☀️ Light'}
          </span>
          <div
            className={`theme-switch ${isDark ? 'dark' : ''}`}
            onClick={toggleTheme}
          >
            <div className="theme-knob">
              {isDark ? '☾' : '☀'}
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="sidebar-profile-card">
          <div className="sidebar-avatar">{activeProfile.emoji}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-username truncate">
              {activeProfile.displayName}
            </span>
            <span className="sidebar-user-role">
              {isOwnProfile ? 'Your Garden' : "Friend's Garden"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="sidebar-actions">
          <button className="sidebar-btn" onClick={switchProfile}>
            ⇄ Switch Profile
          </button>

          <button
            className="sidebar-btn"
            onClick={() => navigate('/settings')}
          >
            ⚙ Settings
          </button>

          <button
            className="sidebar-btn sidebar-btn-logout"
            onClick={handleLogout}
          >
            ↩ Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;