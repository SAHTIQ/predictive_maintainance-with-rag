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

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');

  // Edit mode for Profile Info
  const [isEditing, setIsEditing] = useState<boolean>(false);
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

  // Preferences form
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

  // Password change form
  const [passwordForm, setPasswordForm] = useState<ChangePasswordInput>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // UI state
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [preferencesSuccess, setPreferencesSuccess] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sync state from currentUser when loaded
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

  // Compute initials
  const getInitials = (name: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Check if profile form is dirty
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

    // Validation
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
    <div className="view-page-container">
      {/* 1. Header Banner & Identity Capsule */}
      <div className="stitch-card p-space-lg mb-space-base">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-base">
          {/* Identity Group */}
          <div className="flex items-center gap-4">
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                border: '2px solid rgba(6, 182, 212, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 700,
                color: '#06B6D4',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)',
                flexShrink: 0,
              }}
            >
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span>{getInitials(currentUser.full_name)}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="stitch-page-title text-xl font-bold">{currentUser.full_name}</h1>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#06B6D4]">badge</span>
                  {currentUser.job_title} ({currentUser.role})
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#94A3B8]">domain</span>
                  {currentUser.department} • {currentUser.plant_assignment}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#94A3B8]">mail</span>
                  {currentUser.email}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="stitch-btn-secondary flex items-center gap-1.5"
              onClick={() => navigate('/overview')}
              title="Return to Factory Overview"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Overview</span>
            </button>
            <button
              type="button"
              className="stitch-btn-secondary flex items-center gap-1.5"
              onClick={() => refreshCurrentUser()}
              title="Reload account data from server"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Sync</span>
            </button>
            {!isEditing && (
              <button
                type="button"
                className="stitch-btn-primary flex items-center gap-1.5"
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
        <div className="flex items-center gap-2 mt-6 border-b border-[var(--border-color)]">
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-[#06B6D4] text-[#06B6D4]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            Personal & Work Info
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'preferences'
                ? 'border-[#06B6D4] text-[#06B6D4]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences & Alerts
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'security'
                ? 'border-[#06B6D4] text-[#06B6D4]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('security')}
          >
            Security & Authentication
          </button>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-base">
        {/* LEFT 2 COLS: Tab Content */}
        <div className="lg:col-span-2 space-y-space-base">
          {/* TAB 1: PROFILE INFO */}
          {activeTab === 'profile' && (
            <div className="stitch-card p-space-lg">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-color)]">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#06B6D4] text-[18px]">person</span>
                    Operator Profile Information
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Your personal identity, shift title, and contact details stored in the Resonex platform.
                  </p>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-[#06B6D4] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Modify
                  </button>
                )}
              </div>

              {profileSuccess && (
                <div className="p-3 mb-4 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 mb-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      className="stitch-input w-full"
                      placeholder="e.g. Mark Jenkins"
                      required
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                      Display / Badge Name
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profileForm.display_name}
                      onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                      className="stitch-input w-full"
                      placeholder="e.g. Mark J."
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      disabled={!isEditing}
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="stitch-input w-full"
                      placeholder="e.g. mark.jenkins@resonex.internal"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                      Phone / Internal Extension
                    </label>
                    <input
                      type="tel"
                      disabled={!isEditing}
                      value={profileForm.phone_number}
                      onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                      className="stitch-input w-full"
                      placeholder="e.g. +1 (555) 019-2834"
                    />
                  </div>

                  {/* Job Title */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profileForm.job_title}
                      onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                      className="stitch-input w-full"
                      placeholder="e.g. Senior Shift Supervisor"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                      className="stitch-input w-full"
                      placeholder="e.g. Spinning Operations & Maintenance"
                    />
                  </div>

                  {/* Plant Assignment */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                      Plant Assignment
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profileForm.plant_assignment}
                      onChange={(e) => setProfileForm({ ...profileForm, plant_assignment: e.target.value })}
                      className="stitch-input w-full"
                      placeholder="e.g. Plant 01 - Coimbatore Facility"
                    />
                  </div>

                  {/* Preferred Language */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                      UI Language
                    </label>
                    <select
                      disabled={!isEditing}
                      value={profileForm.preferred_language}
                      onChange={(e) => setProfileForm({ ...profileForm, preferred_language: e.target.value })}
                      className="stitch-input w-full"
                    >
                      <option value="en">English (US / UK)</option>
                      <option value="ta">Tamil (தமிழ்)</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                      <option value="de">German (Deutsch)</option>
                    </select>
                  </div>
                </div>

                {/* Avatar URL / Path */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Avatar Image URL / Asset Path
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileForm.avatar_url}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                    className="stitch-input w-full font-mono text-xs"
                    placeholder="/operations_manager_avatar.png or https://..."
                  />
                </div>

                {/* Form Action Controls */}
                {isEditing && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                    <button
                      type="button"
                      disabled={isSavingProfile}
                      onClick={handleCancelEdit}
                      className="stitch-btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="stitch-btn-primary flex items-center gap-1.5"
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

          {/* TAB 2: ACCOUNT PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="stitch-card p-space-lg">
              <div className="pb-3 mb-4 border-b border-[var(--border-color)]">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#06B6D4] text-[18px]">tune</span>
                  Workspace & Notification Preferences
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Customize your default dashboard view, theme palette, and industrial alert delivery channels.
                </p>
              </div>

              {preferencesSuccess && (
                <div className="p-3 mb-4 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{preferencesSuccess}</span>
                </div>
              )}

              {preferencesError && (
                <div className="p-3 mb-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{preferencesError}</span>
                </div>
              )}

              <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                {/* Visual Experience */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Interface Customization
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                        Theme Mode
                      </label>
                      <select
                        value={preferencesForm.theme}
                        onChange={(e) =>
                          setPreferencesForm({
                            ...preferencesForm,
                            theme: e.target.value as 'light' | 'dark',
                          })
                        }
                        className="stitch-input w-full"
                      >
                        <option value="dark">Dark Navy Industrial (Default)</option>
                        <option value="light">Light Industrial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                        Default Home Route
                      </label>
                      <select
                        value={preferencesForm.preferred_dashboard}
                        onChange={(e) =>
                          setPreferencesForm({
                            ...preferencesForm,
                            preferred_dashboard: e.target.value,
                          })
                        }
                        className="stitch-input w-full"
                      >
                        <option value="/overview">Factory Overview (/overview)</option>
                        <option value="/machines">All Machines Grid (/machines)</option>
                        <option value="/alerts">Active Alerts Center (/alerts)</option>
                        <option value="/assistant">Resonex AI Workspace (/assistant)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                        Display Timezone
                      </label>
                      <select
                        value={preferencesForm.timezone}
                        onChange={(e) =>
                          setPreferencesForm({
                            ...preferencesForm,
                            timezone: e.target.value,
                          })
                        }
                        className="stitch-input w-full"
                      >
                        <option value="UTC+05:30 (Asia/Kolkata)">UTC+05:30 (Asia/Kolkata)</option>
                        <option value="UTC+00:00 (UTC)">UTC+00:00 (Universal Coordinated Time)</option>
                        <option value="UTC-05:00 (America/New_York)">UTC-05:00 (America/New York)</option>
                        <option value="UTC+01:00 (Europe/Berlin)">UTC+01:00 (Europe/Berlin)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notifications & Sound */}
                <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Alert Dispatch Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-start gap-3 p-3 rounded bg-[var(--bg-card-hover)] border border-[var(--border-color)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferencesForm.email_alerts}
                        onChange={(e) =>
                          setPreferencesForm({ ...preferencesForm, email_alerts: e.target.checked })
                        }
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Email Notifications</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          Receive daily digest and warning escalation emails.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 rounded bg-[var(--bg-card-hover)] border border-[var(--border-color)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferencesForm.critical_push}
                        onChange={(e) =>
                          setPreferencesForm({ ...preferencesForm, critical_push: e.target.checked })
                        }
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Critical Push Alerts</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          High-priority browser push notifications for ISO-10816 vibration breaches.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 rounded bg-[var(--bg-card-hover)] border border-[var(--border-color)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferencesForm.sound_effects}
                        onChange={(e) =>
                          setPreferencesForm({ ...preferencesForm, sound_effects: e.target.checked })
                        }
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Audio Alarm Chimes</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          Play industrial audible alarm chime on critical state transition.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 rounded bg-[var(--bg-card-hover)] border border-[var(--border-color)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferencesForm.sms_alerts}
                        onChange={(e) =>
                          setPreferencesForm({ ...preferencesForm, sms_alerts: e.target.checked })
                        }
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">SMS Emergency Dispatch</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          Send SMS dispatch to on-duty plant manager phone.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                  <button
                    type="submit"
                    disabled={isSavingPreferences}
                    className="stitch-btn-primary flex items-center gap-1.5"
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
            <div className="stitch-card p-space-lg">
              <div className="pb-3 mb-4 border-b border-[var(--border-color)]">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#06B6D4] text-[18px]">lock</span>
                  Password & Security Management
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Update your authentication credentials. Resonex validates salted PBKDF2 cryptography on the backend.
                </p>
              </div>

              {passwordSuccess && (
                <div className="p-3 mb-4 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 mb-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, current_password: e.target.value })
                    }
                    className="stitch-input w-full"
                    placeholder="Enter current password"
                    required
                  />
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    Default operator password is <code className="text-[#06B6D4]">operator123</code> unless previously modified.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, new_password: e.target.value })
                    }
                    className="stitch-input w-full"
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                    }
                    className="stitch-input w-full"
                    placeholder="Repeat new password"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="stitch-btn-primary flex items-center gap-1.5"
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

        {/* RIGHT 1 COL: Account Metadata & Session Info */}
        <div className="space-y-space-base">
          {/* Account System Metadata Card */}
          <div className="stitch-card p-space-lg">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-color)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#06B6D4] text-[16px]">verified_user</span>
              Account Information
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Role Permission</span>
                <span className="font-semibold text-[var(--text-primary)]">{currentUser.role}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Account Status</span>
                <span className="font-semibold text-emerald-400">{currentUser.account_status}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Auth Provider</span>
                <span className="font-semibold text-[var(--text-primary)]">{currentUser.auth_provider}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Created On</span>
                <span className="font-numeric text-[var(--text-muted)]">
                  {new Date(currentUser.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Last Session Login</span>
                <span className="font-numeric text-[var(--text-muted)]">
                  {currentUser.last_login ? new Date(currentUser.last_login).toLocaleString() : 'Active Now'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[var(--text-muted)]">System Identifier</span>
                <span className="font-mono text-[10px] text-[var(--text-muted)] truncate max-w-[140px]" title={String(currentUser.id)}>
                  #{currentUser.id}
                </span>
              </div>
            </div>
          </div>

          {/* Plant & Role Context Card */}
          <div className="stitch-card p-space-lg">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-color)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#06B6D4] text-[16px]">factory</span>
              Operational Assignment
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Active Facility</div>
                <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{currentUser.plant_assignment}</div>
                <div className="text-[11px] text-[#06B6D4] mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">location_on</span>
                  Coimbatore Industrial Corridor
                </div>
              </div>

              <div className="p-2.5 rounded bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Shift Jurisdiction</div>
                <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">Shift A (Morning Line 1–4)</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">
                  Access level allows ISO-10816 threshold override, maintenance scheduling, and RAG knowledge query.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
