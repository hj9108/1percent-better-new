import React, { useState, createContext, useContext } from 'react';
import { AnimatePresence } from './components/Motion';
import { useUser } from './contexts/UserContext';
import { useTheme } from './contexts/ThemeContext';

import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Habits from './components/Habits';
import Journal from './components/Journal';
import Ideas from './components/Ideas';
import MoodTracker from './components/MoodTracker';
import Gratitude from './components/Gratitude';
import Goals from './components/Goals';
import Reviews from './components/Reviews';
import CalendarView from './components/CalendarView';
import Search from './components/Search';
import Settings from './components/Settings';

import './App.css';

// ==================== NAVIGATION CONTEXT ====================
const NavigationContext = createContext();

export const useNavigation = () => useContext(NavigationContext);

const NavigationProvider = ({ children }) => {
  const [currentPage, setCurrentPage] = useState('/');

  const navigate = (path) => {
    setCurrentPage(path);
    window.scrollTo(0, 0);
  };

  return (
    <NavigationContext.Provider value={{ currentPage, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
};

// ==================== TOAST SYSTEM ====================
export const ToastContext = createContext();

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type) => {
    if (type === 'success') return '🌿';
    if (type === 'warning') return '⚠️';
    if (type === 'error') return '❌';
    return '🌿';
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">{getIcon(toast.type)}</span>
            <span>{toast.message}</span>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

// ==================== FLOATING LEAVES ====================
const FloatingLeaves = () => {
  const leaves = ['🍃', '🌿', '☘️', '🍀', '🌱', '🍃', '🌿', '☘️'];
  return (
    <div className="leaves-bg">
      {leaves.map((leaf, i) => (
        <span key={i} className="leaf">
          {leaf}
        </span>
      ))}
    </div>
  );
};

// ==================== PAGE RENDERER ====================
const PageRenderer = () => {
  const { currentPage } = useNavigation();

  switch (currentPage) {
    case '/': return <Dashboard />;
    case '/habits': return <Habits />;
    case '/journal': return <Journal />;
    case '/ideas': return <Ideas />;
    case '/mood': return <MoodTracker />;
    case '/gratitude': return <Gratitude />;
    case '/goals': return <Goals />;
    case '/reviews': return <Reviews />;
    case '/calendar': return <CalendarView />;
    case '/search': return <Search />;
    case '/settings': return <Settings />;
    default: return <Dashboard />;
  }
};

// ==================== MOBILE BOTTOM NAV ====================
const MobileNav = () => {
  const { currentPage, navigate } = useNavigation();
  const { logout, activeProfile, switchProfile, isOwnProfile } = useUser();
  const [showMore, setShowMore] = useState(false);

  const mainItems = [
    { path: '/', icon: '⌂', label: 'Home' },
    { path: '/habits', icon: '☑', label: 'Habits' },
    { path: '/journal', icon: '📖', label: 'Journal' },
    { path: '/goals', icon: '◎', label: 'Goals' },
  ];

  const moreItems = [
    { path: '/ideas', icon: '💡', label: 'Ideas' },
    { path: '/mood', icon: '🎭', label: 'Mood' },
    { path: '/gratitude', icon: '🙏', label: 'Gratitude' },
    { path: '/reviews', icon: '📊', label: 'Reviews' },
    { path: '/calendar', icon: '📅', label: 'Calendar' },
    { path: '/search', icon: '🔍', label: 'Search' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
  ];

  const handleMoreItemClick = (path) => {
    navigate(path);
    setShowMore(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowMore(false);
  };

  const handleSwitchProfile = () => {
    switchProfile();
    setShowMore(false);
  };

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 899,
              background: 'rgba(0,0,0,0.3)',
            }}
            onClick={() => setShowMore(false)}
          />

          {/* More Menu */}
          <div
            style={{
              position: 'fixed',
              bottom: '70px',
              left: '12px',
              right: '12px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
              zIndex: 950,
              animation: 'fadeInUp 0.2s ease',
            }}
          >
            {/* Profile Section at top of menu */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'var(--bg)',
                borderRadius: '12px',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{activeProfile.emoji}</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    color: 'var(--text)',
                  }}
                >
                  {activeProfile.displayName}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  {isOwnProfile ? 'Your Garden 🌿' : "Viewing Friend's Garden"}
                </div>
              </div>
            </div>

            {/* Regular nav items grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              {moreItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleMoreItemClick(item.path)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '10px 4px',
                    background:
                      currentPage === item.path
                        ? 'rgba(45,90,61,0.1)'
                        : 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    color:
                      currentPage === item.path
                        ? 'var(--primary)'
                        : 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: '600' }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div
              style={{
                height: '1px',
                background: 'var(--border)',
                margin: '4px 0 12px',
              }}
            />

            {/* Switch Profile & Logout */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSwitchProfile}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'var(--bg)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                }}
              >
                <span>⇄</span>
                <span>Switch Profile</span>
              </button>

              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'rgba(198,123,92,0.08)',
                  border: '1.5px solid var(--accent)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                }}
              >
                <span>↩</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom Nav Bar */}
      <nav
        className="mobile-nav"
        style={{
          display: 'flex',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--card)',
          borderTop: '1px solid var(--border)',
          padding: '8px 0',
          zIndex: 900,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div className="mobile-nav-items">
          {mainItems.map((item) => (
            <button
              key={item.path}
              className={`mobile-nav-item ${
                currentPage === item.path ? 'active' : ''
              }`}
              onClick={() => navigate(item.path)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            className={`mobile-nav-item ${showMore ? 'active' : ''}`}
            onClick={() => setShowMore(!showMore)}
          >
            <span className="mobile-nav-icon">⋯</span>
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
};

// ==================== MAIN APP ====================
function AppContent() {
  const { loggedInUser, activeProfile, isOwnProfile, switchProfile } =
    useUser();
  const { isDark } = useTheme();

  if (!loggedInUser) {
    return <Login />;
  }

  return (
    <div className={`app ${isDark ? 'dark' : 'light'}`}>
      <FloatingLeaves />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          {!isOwnProfile && (
            <div className="profile-banner">
              <div className="profile-banner-info">
                <span className="profile-banner-emoji">
                  {activeProfile.emoji}
                </span>
                <span>Viewing {activeProfile.displayName}'s space</span>
              </div>
              <button
                className="profile-banner-btn"
                onClick={switchProfile}
              >
                Back to my space
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <PageRenderer />
          </AnimatePresence>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

function App() {
  return (
    <NavigationProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </NavigationProvider>
  );
}

export default App;