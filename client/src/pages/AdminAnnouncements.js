import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AdminAnnouncements.css';

import { API_BASE_URL } from '../config';

const TYPE_OPTIONS = [
  { value: 'info', label: 'Info', color: '#2563eb' },
  { value: 'priority', label: 'Priority', color: '#dc2626' },
  { value: 'event', label: 'Event', color: '#b45309' },
];

const emptyForm = { title: '', message: '', type: 'info', expiresAt: '' };

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const toDateInputValue = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
};

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
};

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/admin/announcements`, authHeaders());
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const startEdit = (ann) => {
    setEditingId(ann._id);
    setForm({
      title: ann.title,
      message: ann.message,
      type: ann.type || 'info',
      expiresAt: toDateInputValue(ann.expiresAt),
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      };

      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/admin/announcements/${editingId}`, payload, authHeaders());
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/announcements`, payload, authHeaders());
      }

      cancelEdit();
      fetchAnnouncements();
    } catch (err) {
      console.error('Error saving announcement:', err);
      setError('Failed to save announcement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/announcements/${id}`, authHeaders());
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      if (editingId === id) cancelEdit();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      alert('Failed to delete announcement. Please try again.');
    }
  };

  const typeMeta = (type) => TYPE_OPTIONS.find((t) => t.value === type) || TYPE_OPTIONS[0];

  return (
    <div className="admann-page">
      <div className="admann-header">
        <h1>Announcements</h1>
        <p className="admann-subtitle">Publish and manage platform-wide announcements shown on the home page.</p>
      </div>

      {/* ── Create / Edit Form ── */}
      <section className="admann-section">
        <div className="admann-section-title-row">
          <h2>{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
        </div>

        <form className="admann-form" onSubmit={handleSubmit}>
          <div className="admann-form-row">
            <label htmlFor="admann-title">Title</label>
            <input
              id="admann-title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Scheduled Maintenance"
              maxLength={120}
              required
            />
          </div>

          <div className="admann-form-row">
            <label htmlFor="admann-message">Message</label>
            <textarea
              id="admann-message"
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="What do you want readers and writers to know?"
              rows={4}
              required
            />
          </div>

          <div className="admann-form-grid">
            <div className="admann-form-row">
              <label htmlFor="admann-type">Type</label>
              <select id="admann-type" name="type" value={form.type} onChange={handleChange}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="admann-form-row">
              <label htmlFor="admann-expires">Expires (optional)</label>
              <input
                id="admann-expires"
                name="expiresAt"
                type="datetime-local"
                value={form.expiresAt}
                onChange={handleChange}
              />
              <span className="admann-hint">Defaults to 7 days from now if left blank.</span>
            </div>
          </div>

          {error && <p className="admann-error">{error}</p>}

          <div className="admann-form-actions">
            {editingId && (
              <button type="button" className="admann-btn-secondary" onClick={cancelEdit}>
                Cancel
              </button>
            )}
            <button type="submit" className="admann-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Existing Announcements ── */}
      <section className="admann-section">
        <div className="admann-section-title-row">
          <h2>All Announcements</h2>
          {!loading && <span className="admann-count">{announcements.length}</span>}
        </div>

        {loading ? (
          <div className="admann-empty">
            <p>Loading announcements…</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="admann-empty">
            <span className="admann-empty-icon">📢</span>
            <p>No announcements yet. Publish one above to broadcast it platform-wide.</p>
          </div>
        ) : (
          <ul className="admann-list">
            {announcements.map((ann) => {
              const meta = typeMeta(ann.type);
              const expired = ann.expiresAt && new Date(ann.expiresAt) < new Date();
              return (
                <li key={ann._id} className="admann-item">
                  <div className="admann-item-top">
                    <span className="admann-type-pill" style={{ '--pill-color': meta.color }}>
                      {meta.label}
                    </span>
                    <span className="admann-item-title">{ann.title}</span>
                    {expired && <span className="admann-expired-pill">Expired</span>}
                  </div>
                  <p className="admann-item-message">{ann.message}</p>
                  <div className="admann-item-footer">
                    <span className="admann-item-time">
                      Posted {timeAgo(ann.createdAt)}
                      {ann.expiresAt && ` • Expires ${new Date(ann.expiresAt).toLocaleDateString()}`}
                    </span>
                    <div className="admann-item-actions">
                      <button type="button" className="admann-edit-btn" onClick={() => startEdit(ann)}>
                        ✏️ Edit
                      </button>
                      <button type="button" className="admann-delete-btn" onClick={() => handleDelete(ann._id)}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminAnnouncements;
