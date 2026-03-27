import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from './Motion';
import { format } from './DateUtils';
import {
  FiPlus, FiSearch, FiGrid, FiList, FiEdit2,
  FiTrash2, FiX, FiBookmark, FaRegLightbulb, FaThumbtack,
} from './Icons';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../App';
import {
  db, collection, getDocs, doc, setDoc, deleteDoc, updateDoc
} from '../data/firebase';
import './Ideas.css';

const CATEGORIES = [
  'All',
  '💼 Business',
  '🎨 Creative',
  '💻 Tech',
  '📚 Learning',
  '🏃 Health',
  '✈️ Travel',
  '🎵 Music',
  '📝 Other',
];

const Ideas = () => {
  const { activeProfile, isOwnProfile } = useUser();
  const toast = useToast();

  const [ideas, setIdeas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: [],
    pinned: false,
  });
  const [tagInput, setTagInput] = useState('');

  // Fetch ideas
  useEffect(() => {
    if (!activeProfile) return;

    const fetchIdeas = async () => {
      try {
        const ref = collection(db, 'users', activeProfile.id, 'ideas');
        const snap = await getDocs(ref);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
          });
        setIdeas(data);
      } catch (err) {
        console.log('Fetch ideas error:', err);
      }
    };

    fetchIdeas();
  }, [activeProfile]);

  // Filter ideas
  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch = !searchQuery || 
      (idea.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (idea.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (idea.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = activeCategory === 'All' || idea.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // Add tag
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tagInput.trim()],
        });
      }
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  // Toggle pin
  const handleTogglePin = async (idea) => {
    if (!isOwnProfile) return;

    try {
      const ref = doc(db, 'users', activeProfile.id, 'ideas', idea.id);
      await updateDoc(ref, { pinned: !idea.pinned });
      setIdeas((prev) =>
        prev
          .map((i) => (i.id === idea.id ? { ...i, pinned: !i.pinned } : i))
          .sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
          })
      );
      toast?.addToast(
        idea.pinned ? 'Idea unpinned' : 'Idea pinned! 📌',
        'success'
      );
    } catch (err) {
      console.log('Pin error:', err);
    }
  };

  // Save idea
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast?.addToast('Please enter an idea title', 'warning');
      return;
    }

    try {
      const id = editingIdea ? editingIdea.id : Date.now().toString();
      const ideaData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        tags: formData.tags,
        pinned: formData.pinned,
        createdAt: editingIdea
          ? editingIdea.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ref = doc(db, 'users', activeProfile.id, 'ideas', id);
      await setDoc(ref, ideaData);

      if (editingIdea) {
        setIdeas((prev) =>
          prev.map((i) => (i.id === id ? { id, ...ideaData } : i))
        );
        toast?.addToast('Idea updated! 💡', 'success');
      } else {
        setIdeas((prev) =>
          [{ id, ...ideaData }, ...prev].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
          })
        );
        toast?.addToast('Idea captured! 💡', 'success');
      }

      closeModal();
    } catch (err) {
      console.log('Save idea error:', err);
      toast?.addToast('Error saving idea', 'error');
    }
  };

  // Delete idea
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this idea?')) return;

    try {
      await deleteDoc(doc(db, 'users', activeProfile.id, 'ideas', id));
      setIdeas((prev) => prev.filter((i) => i.id !== id));
      toast?.addToast('Idea removed', 'warning');
    } catch (err) {
      console.log('Delete error:', err);
    }
  };

  // Open edit
  const openEdit = (idea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title || '',
      description: idea.description || '',
      category: idea.category || '',
      tags: idea.tags || [],
      pinned: idea.pinned || false,
    });
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingIdea(null);
    setFormData({ title: '', description: '', category: '', tags: [], pinned: false });
    setTagInput('');
  };

  const pinnedCount = ideas.filter((i) => i.pinned).length;
  const uniqueCategories = [...new Set(ideas.map((i) => i.category).filter(Boolean))];

  return (
    <motion.div
      className="ideas-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="ideas-header">
        <div className="ideas-header-left">
          <span className="ideas-title-icon">💡</span>
          <div>
            <h1 className="ideas-title">Ideas</h1>
            <p className="ideas-subtitle">
              Capture every spark — {ideas.length} ideas
            </p>
          </div>
        </div>
        {isOwnProfile && (
          <motion.button
            className="ideas-add-btn"
            onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiPlus /> Capture Idea
          </motion.button>
        )}
      </div>

      {/* Stats */}
      <div className="ideas-stats">
        <div className="ideas-stat">
          <span className="ideas-stat-emoji">💡</span>
          <div>
            <div className="ideas-stat-value">{ideas.length}</div>
            <div className="ideas-stat-label">Total Ideas</div>
          </div>
        </div>
        <div className="ideas-stat">
          <span className="ideas-stat-emoji">📌</span>
          <div>
            <div className="ideas-stat-value">{pinnedCount}</div>
            <div className="ideas-stat-label">Pinned</div>
          </div>
        </div>
        <div className="ideas-stat">
          <span className="ideas-stat-emoji">🏷️</span>
          <div>
            <div className="ideas-stat-value">{uniqueCategories.length}</div>
            <div className="ideas-stat-label">Categories</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="ideas-filters">
        <div className="ideas-search-wrapper">
          <FiSearch className="ideas-search-icon" />
          <input
            type="text"
            className="ideas-search"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="ideas-view-toggle">
          <button
            className={`ideas-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <FiGrid />
          </button>
          <button
            className={`ideas-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <FiList />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="ideas-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`ideas-category-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Ideas */}
      {filteredIdeas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💡</div>
          <h3 className="empty-state-title">
            {searchQuery || activeCategory !== 'All'
              ? 'No ideas found'
              : 'No ideas yet'}
          </h3>
          <p className="empty-state-text">
            {searchQuery || activeCategory !== 'All'
              ? 'Try adjusting your filters'
              : 'Every great thing starts with a spark. Capture your first idea!'}
          </p>
          {!searchQuery && activeCategory === 'All' && isOwnProfile && (
            <button
              className="btn btn-gold"
              style={{ marginTop: '16px' }}
              onClick={() => setShowModal(true)}
            >
              <FiPlus /> Capture First Idea
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'ideas-grid' : 'ideas-list'}>
          <AnimatePresence>
            {filteredIdeas.map((idea, index) => (
              <motion.div
                key={idea.id}
                className={`idea-card ${idea.pinned ? 'pinned' : ''}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.04 }}
                layout
              >
                {viewMode === 'list' && (
                  <span className="idea-bulb-icon">💡</span>
                )}

                <div className={viewMode === 'list' ? 'idea-card-content' : ''}>
                  <div className="idea-card-header">
                    <h3 className="idea-card-title truncate">
                      {idea.pinned && <FaThumbtack className="idea-pin-icon" />}
                      {idea.title}
                    </h3>
                    {isOwnProfile && (
                      <div className="idea-card-actions">
                        <button
                          className="idea-action-btn pin-btn"
                          onClick={() => handleTogglePin(idea)}
                          title={idea.pinned ? 'Unpin' : 'Pin'}
                        >
                          <FaThumbtack />
                        </button>
                        <button
                          className="idea-action-btn"
                          onClick={() => openEdit(idea)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="idea-action-btn delete"
                          onClick={() => handleDelete(idea.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>

                  {idea.description && (
                    <p className="idea-card-description">{idea.description}</p>
                  )}

                  <div className="idea-card-footer">
                    <div className="flex gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      {idea.category && (
                        <span className="idea-card-category">{idea.category}</span>
                      )}
                      <div className="idea-card-tags">
                        {(idea.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="idea-tag">#{tag}</span>
                        ))}
                      </div>
                    </div>
                    <span className="idea-card-date">
                      {idea.createdAt
                        ? format(new Date(idea.createdAt), 'MMM d, yyyy')
                        : ''}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingIdea ? '✏️ Edit Idea' : '💡 New Idea'}
                </h2>
                <button className="modal-close" onClick={closeModal}>
                  <FiX />
                </button>
              </div>

              <div className="idea-modal-form">
                {/* Title */}
                <div className="input-group">
                  <label className="input-label">Idea Title *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="What's your idea?"
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
                    placeholder="Describe your idea in more detail..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                {/* Category */}
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <div className="idea-category-select">
                    {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <div
                        key={cat}
                        className={`idea-category-option ${
                          formData.category === cat ? 'selected' : ''
                        }`}
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

                {/* Tags */}
                <div className="input-group">
                  <label className="input-label">Tags (press Enter)</label>
                  <div className="idea-tags-wrapper">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="idea-tag-chip">
                        #{tag}
                        <span
                          className="idea-tag-chip-remove"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          ×
                        </span>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="idea-tag-input"
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                    />
                  </div>
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
                    className="btn btn-gold"
                    onClick={handleSave}
                    style={{ flex: 2 }}
                  >
                    {editingIdea ? '💾 Save Changes' : '💡 Capture Idea'}
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

export default Ideas;