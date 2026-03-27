import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from './Motion';
import { format } from './DateUtils';
import { FiSearch, FiX } from './Icons';
import { useUser } from '../contexts/UserContext';
import { useNavigation } from '../App';
import {
  db, collection, getDocs
} from '../data/firebase';
import './Search.css';

const FILTER_TYPES = [
  { key: 'all', label: 'All', emoji: '📋' },
  { key: 'journal', label: 'Journal', emoji: '📖' },
  { key: 'idea', label: 'Ideas', emoji: '💡' },
  { key: 'habit', label: 'Habits', emoji: '✅' },
  { key: 'gratitude', label: 'Gratitude', emoji: '🙏' },
  { key: 'goal', label: 'Goals', emoji: '🎯' },
];

const Search = () => {
  const { activeProfile } = useUser();
  const { navigate } = useNavigation();

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [allEntries, setAllEntries] = useState([]);
  const [results, setResults] = useState([]);
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    if (!activeProfile) return;

    const fetchAllData = async () => {
      try {
        const entries = [];
        const tagsSet = new Set();

        const journalRef = collection(db, 'users', activeProfile.id, 'journal');
        const journalSnap = await getDocs(journalRef);
        journalSnap.docs.forEach((d) => {
          const data = d.data();
          entries.push({
            id: d.id, type: 'journal', title: data.title || 'Untitled',
            content: data.content || '', tags: data.tags || [],
            date: data.createdAt || '', icon: '📖', path: '/journal',
          });
          (data.tags || []).forEach((t) => tagsSet.add(t));
        });

        const ideasRef = collection(db, 'users', activeProfile.id, 'ideas');
        const ideasSnap = await getDocs(ideasRef);
        ideasSnap.docs.forEach((d) => {
          const data = d.data();
          entries.push({
            id: d.id, type: 'idea', title: data.title || 'Untitled',
            content: data.description || '', tags: data.tags || [],
            category: data.category || '', date: data.createdAt || '',
            icon: '💡', path: '/ideas',
          });
          (data.tags || []).forEach((t) => tagsSet.add(t));
        });

        const habitsRef = collection(db, 'users', activeProfile.id, 'habits');
        const habitsSnap = await getDocs(habitsRef);
        habitsSnap.docs.forEach((d) => {
          const data = d.data();
          entries.push({
            id: d.id, type: 'habit',
            title: `${data.icon || '💪'} ${data.name || 'Untitled'}`,
            content: `Category: ${data.category || 'None'} | Streak: ${data.streak || 0} days`,
            tags: [], date: data.createdAt || '', icon: '✅', path: '/habits',
          });
        });

        const gratRef = collection(db, 'users', activeProfile.id, 'gratitude');
        const gratSnap = await getDocs(gratRef);
        gratSnap.docs.forEach((d) => {
          const data = d.data();
          entries.push({
            id: d.id, type: 'gratitude',
            title: `Gratitude — ${data.date || ''}`,
            content: (data.items || []).join(' | '), tags: [],
            date: data.createdAt || data.date || '', icon: '🙏', path: '/gratitude',
          });
        });

        const goalsRef = collection(db, 'users', activeProfile.id, 'goals');
        const goalsSnap = await getDocs(goalsRef);
        goalsSnap.docs.forEach((d) => {
          const data = d.data();
          const milestones = (data.milestones || []).map((m) => m.text).join(', ');
          entries.push({
            id: d.id, type: 'goal',
            title: `${data.completed ? '🏆' : '🎯'} ${data.title || 'Untitled'}`,
            content: `${data.description || ''} | Milestones: ${milestones || 'None'}`,
            tags: [], category: data.category || '',
            date: data.createdAt || '', icon: '🎯', path: '/goals',
          });
        });

        entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setAllEntries(entries);
        setAllTags([...tagsSet].slice(0, 15));
      } catch (err) {
        console.log('Search fetch error:', err);
      }
    };

    fetchAllData();
  }, [activeProfile]);

  useEffect(() => {
    if (!query.trim() && activeFilter === 'all') {
      setResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const filtered = allEntries.filter((entry) => {
      if (activeFilter !== 'all' && entry.type !== activeFilter) return false;
      if (!q) return true;
      return (
        (entry.title || '').toLowerCase().includes(q) ||
        (entry.content || '').toLowerCase().includes(q) ||
        (entry.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        (entry.category || '').toLowerCase().includes(q)
      );
    });

    setResults(filtered);
  }, [query, activeFilter, allEntries]);

  const handleTagClick = (tag) => { setQuery(tag); };
  const handleResultClick = (result) => { navigate(result.path); };

  return (
    <motion.div className="search-page" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="search-header">
        <div className="search-header-left">
          <span className="search-title-icon">🔍</span>
          <div>
            <h1 className="search-title">Search</h1>
            <p className="search-subtitle">Find anything across your entire garden</p>
          </div>
        </div>
      </div>

      <div className="search-bar-container">
        <FiSearch className="search-bar-icon" />
        <input type="text" className="search-bar" placeholder="Search entries, ideas, habits, tags..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        {query && (<button className="search-clear-btn" onClick={() => setQuery('')}><FiX /></button>)}
      </div>

      <div className="search-filters">
        {FILTER_TYPES.map((type) => (
          <button key={type.key} className={`search-filter-chip ${activeFilter === type.key ? 'active' : ''}`} onClick={() => setActiveFilter(type.key)}>
            {type.emoji} {type.label}
          </button>
        ))}
      </div>

      {(query || activeFilter !== 'all') ? (
        <>
          <div className="search-results-info">
            Found <span className="search-results-count">{results.length}</span> {results.length === 1 ? 'result' : 'results'}{query && ` for "${query}"`}
          </div>

          {results.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🔍</div><h3 className="empty-state-title">No results found</h3><p className="empty-state-text">Try different keywords or change the filter</p></div>
          ) : (
            <div className="search-results">
              <AnimatePresence>
                {results.map((result, index) => (
                  <motion.div key={`${result.type}-${result.id}`} className="search-result-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: index * 0.03 }} onClick={() => handleResultClick(result)}>
                    <div className={`search-result-icon type-${result.type}`}>{result.icon}</div>
                    <div className="search-result-content">
                      <div className="search-result-title">
                        {result.title}
                        <span className={`search-result-type-badge type-${result.type}`}>{result.type}</span>
                      </div>
                      {result.content && (<p className="search-result-preview">{result.content}</p>)}
                      <div className="search-result-meta">
                        {result.date && (<span className="search-result-date">{(() => { try { return format(new Date(result.date), 'MMM d, yyyy'); } catch { return result.date; }})()}</span>)}
                        {result.tags && result.tags.length > 0 && (<div className="search-result-tags">{result.tags.slice(0, 3).map((tag) => (<span key={tag} className="search-result-tag">#{tag}</span>))}</div>)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      ) : (
        <>
          {allTags.length > 0 && (
            <div className="search-recent"><div className="search-recent-title">🏷️ Your Tags</div><div className="search-recent-tags">{allTags.map((tag) => (<button key={tag} className="search-recent-tag" onClick={() => handleTagClick(tag)}>#{tag}</button>))}</div></div>
          )}
          <div className="search-recent" style={{ marginTop: '24px' }}>
            <div className="search-recent-title">📋 Browse All ({allEntries.length} entries)</div>
            <div className="search-recent-tags">
              {FILTER_TYPES.filter((t) => t.key !== 'all').map((type) => {
                const count = allEntries.filter((e) => e.type === type.key).length;
                return (<button key={type.key} className="search-recent-tag" onClick={() => setActiveFilter(type.key)}>{type.emoji} {type.label} ({count})</button>);
              })}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Search;