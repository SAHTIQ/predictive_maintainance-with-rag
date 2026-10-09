import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface UserMenuProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onProfileClick: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  isOpen,
  onClose,
  onProfileClick,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Helper for initials fallback
  const getInitials = (name: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Close on outside click or escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    try {
      await api.signOut();
    } catch (e) {
      console.warn('Sign out call failed:', e);
    }
    onClose();
    // In our single-session industrial environment, notify user or refresh
    window.location.reload();
  };

  return (
    <div
      ref={menuRef}
      className="user-dropdown-menu"
      role="menu"
      aria-label="User Account Menu"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: '0',
        width: '260px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
        overflow: 'hidden',
        animation: 'fadeInMenu 0.15s ease-out',
      }}
    >
      {/* Header Profile Identity */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#06B6D4',
            flexShrink: 0,
          }}
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span>{getInitials(user.full_name)}</span>
          )}
        </div>
        <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {user.full_name || 'Operator'}
          </div>
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {user.email || 'operator@resonex.internal'}
          </div>
          <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: user.account_status === 'ACTIVE' ? '#22C55E' : '#EAB308',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: '0.66rem',
                color: user.account_status === 'ACTIVE' ? '#22C55E' : '#EAB308',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 600,
              }}
            >
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Actions */}
      <div style={{ padding: '6px 0' }}>
        <button
          type="button"
          role="menuitem"
          className="user-menu-item"
          onClick={() => {
            onClose();
            onProfileClick();
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#06B6D4' }}>
            account_circle
          </span>
          <span>View Profile</span>
        </button>

        <button
          type="button"
          role="menuitem"
          className="user-menu-item"
          onClick={() => {
            onClose();
            navigate('/settings');
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94A3B8' }}>
            tune
          </span>
          <span>Account Settings</span>
        </button>
      </div>

      {/* Sign Out / Session Action */}
      <div style={{ borderTop: '1px solid var(--border-color)', padding: '6px 0' }}>
        <button
          type="button"
          role="menuitem"
          className="user-menu-item sign-out-item"
          onClick={handleSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            background: 'none',
            border: 'none',
            color: '#EF4444',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#EF4444' }}>
            logout
          </span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
