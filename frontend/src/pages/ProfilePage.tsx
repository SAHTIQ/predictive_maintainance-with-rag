import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';
import { api } from '../services/api';
import {
  UserProfileUpdateInput,
  UserPreferencesUpdateInput,
  ChangePasswordInput,
} from '../types';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser, updateUserPreferences, refreshCurrentUser } = useFleet();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');

  // Edit mode toggle
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Form states
  const [profileForm, setProfileForm] = useState<UserProfileUpdateInput>({
    full_name: '',
    display_name: '',
    email: '',
    phone_number: '',
    job_title: '',
    department: '',
    plant_assignment: '',
    preferred_language: 'en',
    avatar_url: '',
  });

  const [preferencesForm, setPreferencesForm] = useState<UserPreferencesUpdateInput>({
    theme: 'dark',
    preferred_dashboard: '/overview',
    language: 'en',
    timezone: 'UTC+05:30 (Asia/Kolkata)',
    email_alerts: true,
    sms_alerts: false,
    critical_push: true,
    sound_effects: true,
  });

  const [passwordForm, setPasswordForm] = useState<ChangePasswordInput>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Async submission states
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [preferencesSuccess, setPreferencesSuccess] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Hydrate state from context
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        full_name: currentUser.full_name || '',
        display_name: currentUser.display_name || '',
        email: currentUser.email || '',
        phone_number: currentUser.phone_number || '',
        job_title: currentUser.job_title || '',
        department: currentUser.department || '',
        plant_assignment: currentUser.plant_assignment || '',
        preferred_language: currentUser.preferred_language || 'en',
        avatar_url: currentUser.avatar_url || '',
      });

      if (currentUser.preferences) {
        setPreferencesForm({
          theme: currentUser.preferences.theme || 'dark',
          preferred_dashboard: currentUser.preferences.preferred_dashboard || '/overview',
          language: currentUser.preferences.language || 'en',
          timezone: currentUser.preferences.timezone || 'UTC+05:30 (Asia/Kolkata)',
          email_alerts: currentUser.preferences.email_alerts ?? true,
          sms_alerts: currentUser.preferences.sms_alerts ?? false,
          critical_push: currentUser.preferences.critical_push ?? true,
          sound_effects: currentUser.preferences.sound_effects ?? true,
        });
      }
    }
  }, [currentUser]);

  // Compute initials fallback
  const getInitials = (name: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isProfileDirty = () => {
    return (
      profileForm.full_name !== (currentUser.full_name || '') ||
      profileForm.display_name !== (currentUser.display_name || '') ||
      profileForm.email !== (currentUser.email || '') ||
      profileForm.phone_number !== (currentUser.phone_number || '') ||
      profileForm.job_title !== (currentUser.job_title || '') ||
      profileForm.department !== (currentUser.department || '') ||
      profileForm.plant_assignment !== (currentUser.plant_assignment || '') ||
      profileForm.preferred_language !== (currentUser.preferred_language || 'en') ||
      profileForm.avatar_url !== (currentUser.avatar_url || '')
    );
  };

  const handleCancelEdit = () => {
    if (isProfileDirty()) {
      const confirmDiscard = window.confirm('You have unsaved changes. Discard changes?');
      if (!confirmDiscard) return;
    }
    setProfileForm({
      full_name: currentUser.full_name || '',
      display_name: currentUser.display_name || '',
      email: currentUser.email || '',
      phone_number: currentUser.phone_number || '',
      job_title: currentUser.job_title || '',
      department: currentUser.department || '',
      plant_assignment: currentUser.plant_assignment || '',
      preferred_language: currentUser.preferred_language || 'en',
      avatar_url: currentUser.avatar_url || '',
    });
    setIsEditing(false);
    setProfileError(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!profileForm.full_name?.trim()) {
      setProfileError('Full Name is required.');
      return;
    }
    if (!profileForm.email?.trim() || !profileForm.email.includes('@')) {
      setProfileError('A valid email address is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateCurrentUser(profileForm);
      setProfileSuccess('Profile details updated successfully.');
      setIsEditing(false);
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update user profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPreferencesError(null);
    setPreferencesSuccess(null);

    setIsSavingPreferences(true);
    try {
      await updateUserPreferences(preferencesForm);
      setPreferencesSuccess('Account preferences saved and synchronized.');
      setTimeout(() => setPreferencesSuccess(null), 4000);
    } catch (err: any) {
      setPreferencesError(err?.message || 'Failed to save account preferences.');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordForm.current_password) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!passwordForm.new_password || passwordForm.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword(passwordForm);
      setPasswordSuccess('Password changed successfully. Your session remains authenticated.');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password. Please verify current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="profile-page-wrapper">
      {/* 1. HERO IDENTITY CARD */}
      <section className="profile-hero-card">
        <div className="profile-hero-top">
          {/* Identity Group */}
          <div className="profile-identity-cluster">
            <div className="profile-avatar-giant">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span>{getInitials(currentUser.full_name)}</span>
              )}
            </div>

            <div>
              <div className="profile-title-row">
                <h1 className="profile-user-fullname">{currentUser.full_name}</h1>
                <span
                  className="profile-status-badge"
                  style={{
                    backgroundColor:
                      currentUser.account_status === 'ACTIVE'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(234, 179, 8, 0.15)',
                    color: currentUser.account_status === 'ACTIVE' ? '#22C55E' : '#EAB308',
                    border: `1px solid ${
                      currentUser.account_status === 'ACTIVE'
                        ? 'rgba(34, 197, 94, 0.3)'
                        : 'rgba(234, 179, 8, 0.3)'
                    }`,
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor:
                        currentUser.account_status === 'ACTIVE' ? '#22C55E' : '#EAB308',
                    }}
                  />
                  {currentUser.account_status}
                </span>
              </div>

              <div className="profile-meta-pills">
                <span className="profile-meta-item">
                  <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">badge</span>
                  <span>{currentUser.job_title} ({currentUser.role})</span>
                </span>
                <span className="profile-meta-divider" />
                <span className="profile-meta-item">
                  <span className="material-symbols-outlined text-[16px] text-[#94A3B8]">domain</span>
                  <span>{currentUser.department} • {currentUser.plant_assignment}</span>
                </span>
                <span className="profile-meta-divider" />
                <span className="profile-meta-item">
                  <span className="material-symbols-outlined text-[16px] text-[#94A3B8]">mail</span>
                  <span>{currentUser.email}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="stitch-btn-secondary"
              onClick={() => navigate('/overview')}
              title="Return to Factory Overview"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Overview</span>
            </button>
            <button
              type="button"
              className="stitch-btn-secondary"
              onClick={() => refreshCurrentUser()}
              title="Reload account data from server"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Sync</span>
            </button>
            {!isEditing && (
              <button
                type="button"
                className="stitch-btn-primary"
                onClick={() => {
                  setIsEditing(true);
                  setActiveTab('profile');
                }}
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="profile-nav-tabs" aria-label="Profile Sections">
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>Personal & Work Info</span>
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Preferences & Alerts</span>
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <span>Security & Authentication</span>
          </button>
        </nav>
      </section>

      {/* 2. MAIN WORKSPACE GRID */}
      <main className="profile-grid-layout">
        {/* LEFT COLUMN: ACTIVE TAB WORKSPACE */}
        <div>
          {/* TAB 1: PERSONAL & WORK INFO */}
          {activeTab === 'profile' && (
            <div className="profile-card-clean">
              <header className="profile-card-header-clean">
                <div>
                  <h2 className="profile-card-title-clean">
                    <span className="material-symbols-outlined text-[#06B6D4] text-[20px]">person</span>
                    Operator Profile Information
                  </h2>
                  <p className="profile-card-subtitle-clean">
                    Your personal identity, shift title, and contact details stored in the Resonex platform.
                  </p>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-[#06B6D4] hover:underline flex items-center gap-1.5 font-semibold"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    Modify
                  </button>
                )}
              </header>

              {profileSuccess && (
                <div style={{ padding: '14px 16px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div style={{ padding: '14px 16px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="profile-form-grid">
                  {/* Full Name */}
                  <div className="profile-form-field">
                    <label className="profile-field-label">Full Legal Name *</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      className="profile-spacious-input"
                      placeholder="e.g. Mark A. Jenkins"
                      required
                    />
                  </div>

                  {/* Display Name */}
                  <div className="profile-form-field">
                    <label className="profile-field-label">Display / Badge Name</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profileForm.display_name}
                      onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                      className="profile-spacious-input"
                      placeholder="e.g. Shift Lead Mark"
                    />
                  </div>

                  {/* Email */}
                  <div className="profile-form-field">
                    <label className="profile-field-label">Email Address *</label>
                    <input
                      type="email"
                      disabled={!isEditing}
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="profile-spacious-input"
                      placeholder="e.g. mark.jenkins@resonex.internal"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="profile-form-field">
                    <label className="profile-field-label">Phone / Internal Extension</label>
                    <input
                      type="tel"
                      disabled={!isEditing}
                      value={profileForm.phone_number}
                      onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                      className="profile-spacious-input"
                      placeholder="e.g. +1 (555) 999-4321"
                    />
                  </div>

                  {/* Job Title */}
                  <div className="profile-form-field">
                    <label className="profile-field-label">Job Title</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profileForm.job_title}
                      onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                      className="profile-spacious-input"
                      placeholder="e.g. Senior Reliability Engineer"
                    />
                  </div>

                  {/* Department */}
                  <div className="profile-form-field">
                    <label className="profile-field-label">Department</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                      className="profile-spacious-input"
                      placeholder="e.g. Plant Reliability & AI Diagnostics"
                    />
                  </div>

                  {/* Plant Assignment */}
                  <div className="profile-form-field">
                    <label className="profile-field-label">Plant Assignment</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profileForm.plant_assignment}
                      onChange={(e) => setProfileForm({ ...profileForm, plant_assignment: e.target.value })}
                      className="profile-spacious-input"
                      placeholder="e.g. Facility Alpha - Advanced Spinning"
                    />
                  </div>

                  {/* Preferred Language */}
                  <div className="profile-form-field">
                    <label className="profile-field-label">UI Language</label>
                    <select
                      disabled={!isEditing}
                      value={profileForm.preferred_language}
                      onChange={(e) => setProfileForm({ ...profileForm, preferred_language: e.target.value })}
                      className="profile-spacious-input"
                    >
                      <option value="en">English (US / UK)</option>
                      <option value="ta">Tamil (தமிழ்)</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                      <option value="de">German (Deutsch)</option>
                    </select>
                  </div>
                </div>

                {/* Avatar URL / Path */}
                <div className="profile-form-field">
                  <label className="profile-field-label">Avatar Image URL / Asset Path</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileForm.avatar_url}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                    className="profile-spacious-input font-mono text-xs"
                    placeholder="/operations_manager_avatar.png or https://..."
                  />
                </div>

                {/* Edit Controls */}
                {isEditing && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      disabled={isSavingProfile}
                      onClick={handleCancelEdit}
                      className="stitch-btn-secondary"
                      style={{ padding: '9px 18px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="stitch-btn-primary"
                      style={{ padding: '9px 20px' }}
                    >
                      {isSavingProfile ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">save</span>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 2: PREFERENCES & ALERTS */}
          {activeTab === 'preferences' && (
            <div className="profile-card-clean">
              <header className="profile-card-header-clean">
                <div>
                  <h2 className="profile-card-title-clean">
                    <span className="material-symbols-outlined text-[#06B6D4] text-[20px]">tune</span>
                    Workspace & Notification Preferences
                  </h2>
                  <p className="profile-card-subtitle-clean">
                    Customize your default dashboard view, theme palette, and industrial alert delivery channels.
                  </p>
                </div>
              </header>

              {preferencesSuccess && (
                <div style={{ padding: '14px 16px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{preferencesSuccess}</span>
                </div>
              )}

              {preferencesError && (
                <div style={{ padding: '14px 16px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{preferencesError}</span>
                </div>
              )}

              <form onSubmit={handlePreferencesSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Interface Customization */}
                <div>
                  <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Interface Customization
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                    <div className="profile-form-field">
                      <label className="profile-field-label">Theme Mode</label>
                      <select
                        value={preferencesForm.theme}
                        onChange={(e) =>
                          setPreferencesForm({
                            ...preferencesForm,
                            theme: e.target.value as 'light' | 'dark',
                          })
                        }
                        className="profile-spacious-input"
                      >
                        <option value="dark">Dark Navy Industrial (Default)</option>
                        <option value="light">Light Industrial</option>
                      </select>
                    </div>

                    <div className="profile-form-field">
                      <label className="profile-field-label">Default Home Route</label>
                      <select
                        value={preferencesForm.preferred_dashboard}
                        onChange={(e) =>
                          setPreferencesForm({
                            ...preferencesForm,
                            preferred_dashboard: e.target.value,
                          })
                        }
                        className="profile-spacious-input"
                      >
                        <option value="/overview">Factory Overview (/overview)</option>
                        <option value="/machines">All Machines Grid (/machines)</option>
                        <option value="/alerts">Active Alerts Center (/alerts)</option>
                        <option value="/assistant">Resonex AI Workspace (/assistant)</option>
                      </select>
                    </div>

                    <div className="profile-form-field">
                      <label className="profile-field-label">Display Timezone</label>
                      <select
                        value={preferencesForm.timezone}
                        onChange={(e) =>
                          setPreferencesForm({
                            ...preferencesForm,
                            timezone: e.target.value,
                          })
                        }
                        className="profile-spacious-input"
                      >
                        <option value="UTC+05:30 (Asia/Kolkata)">UTC+05:30 (Asia/Kolkata)</option>
                        <option value="UTC+00:00 (UTC)">UTC+00:00 (Universal Coordinated Time)</option>
                        <option value="UTC-05:00 (America/New_York)">UTC-05:00 (America/New York)</option>
                        <option value="UTC+01:00 (Europe/Berlin)">UTC+01:00 (Europe/Berlin)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dispatch Settings */}
                <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Alert Dispatch Settings
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    <label className="profile-pref-card">
                      <input
                        type="checkbox"
                        checked={preferencesForm.email_alerts}
                        onChange={(e) =>
                          setPreferencesForm({ ...preferencesForm, email_alerts: e.target.checked })
                        }
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>Email Notifications</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Receive daily digest and warning escalation emails.
                        </div>
                      </div>
                    </label>

                    <label className="profile-pref-card">
                      <input
                        type="checkbox"
                        checked={preferencesForm.critical_push}
                        onChange={(e) =>
                          setPreferencesForm({ ...preferencesForm, critical_push: e.target.checked })
                        }
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>Critical Push Alerts</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          High-priority browser push notifications for ISO-10816 vibration breaches.
                        </div>
                      </div>
                    </label>

                    <label className="profile-pref-card">
                      <input
                        type="checkbox"
                        checked={preferencesForm.sound_effects}
                        onChange={(e) =>
                          setPreferencesForm({ ...preferencesForm, sound_effects: e.target.checked })
                        }
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>Audio Alarm Chimes</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Play industrial audible alarm chime on critical state transition.
                        </div>
                      </div>
                    </label>

                    <label className="profile-pref-card">
                      <input
                        type="checkbox"
                        checked={preferencesForm.sms_alerts}
                        onChange={(e) =>
                          setPreferencesForm({ ...preferencesForm, sms_alerts: e.target.checked })
                        }
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>SMS Emergency Dispatch</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Send SMS dispatch to on-duty plant manager phone.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    type="submit"
                    disabled={isSavingPreferences}
                    className="stitch-btn-primary"
                    style={{ padding: '9px 20px' }}
                  >
                    {isSavingPreferences ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        <span>Save Preferences</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SECURITY & PASSWORD */}
          {activeTab === 'security' && (
            <div className="profile-card-clean">
              <header className="profile-card-header-clean">
                <div>
                  <h2 className="profile-card-title-clean">
                    <span className="material-symbols-outlined text-[#06B6D4] text-[20px]">lock</span>
                    Password & Security Management
                  </h2>
                  <p className="profile-card-subtitle-clean">
                    Update your authentication credentials. Resonex validates salted PBKDF2 cryptography on the backend.
                  </p>
                </div>
              </header>

              {passwordSuccess && (
                <div style={{ padding: '14px 16px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div style={{ padding: '14px 16px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px' }}>
                <div className="profile-form-field">
                  <label className="profile-field-label">Current Password *</label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, current_password: e.target.value })
                    }
                    className="profile-spacious-input"
                    placeholder="Enter current password"
                    required
                  />
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Default operator password is <code style={{ color: '#06B6D4' }}>operator123</code> unless previously modified.
                  </div>
                </div>

                <div className="profile-form-field">
                  <label className="profile-field-label">New Password *</label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, new_password: e.target.value })
                    }
                    className="profile-spacious-input"
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>

                <div className="profile-form-field">
                  <label className="profile-field-label">Confirm New Password *</label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                    }
                    className="profile-spacious-input"
                    placeholder="Repeat new password"
                    required
                  />
                </div>

                <div style={{ paddingTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="stitch-btn-primary"
                    style={{ padding: '9px 22px' }}
                  >
                    {isChangingPassword ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        <span>Verifying & Encrypting...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">key</span>
                        <span>Change Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: METADATA & OPERATIONAL CONTEXT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Account System Metadata Card */}
          <aside className="profile-card-clean">
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined text-[#06B6D4] text-[18px]">verified_user</span>
              Account Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="profile-info-row-clean">
                <span style={{ color: 'var(--text-muted)' }}>Role Permission</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.role}</span>
              </div>

              <div className="profile-info-row-clean">
                <span style={{ color: 'var(--text-muted)' }}>Account Status</span>
                <span style={{ fontWeight: 600, color: '#4ade80' }}>{currentUser.account_status}</span>
              </div>

              <div className="profile-info-row-clean">
                <span style={{ color: 'var(--text-muted)' }}>Auth Provider</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.auth_provider}</span>
              </div>

              <div className="profile-info-row-clean">
                <span style={{ color: 'var(--text-muted)' }}>Created On</span>
                <span className="font-numeric" style={{ color: 'var(--text-muted)' }}>
                  {new Date(currentUser.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="profile-info-row-clean">
                <span style={{ color: 'var(--text-muted)' }}>Last Session Login</span>
                <span className="font-numeric" style={{ color: 'var(--text-muted)' }}>
                  {currentUser.last_login ? new Date(currentUser.last_login).toLocaleString() : 'Active Now'}
                </span>
              </div>

              <div className="profile-info-row-clean">
                <span style={{ color: 'var(--text-muted)' }}>System Identifier</span>
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }} title={String(currentUser.id)}>
                  #{currentUser.id}
                </span>
              </div>
            </div>
          </aside>

          {/* Plant & Role Context Card */}
          <aside className="profile-card-clean">
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined text-[#06B6D4] text-[18px]">factory</span>
              Operational Assignment
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Active Facility
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {currentUser.plant_assignment}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#06B6D4', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined text-[15px]">location_on</span>
                  Coimbatore Industrial Corridor
                </div>
              </div>

              <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Shift Jurisdiction
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  Shift A (Morning Line 1–4)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                  Access level allows ISO-10816 threshold override, maintenance scheduling, and RAG knowledge query.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
