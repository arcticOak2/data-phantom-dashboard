import React, { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from './AuthProvider';
import { useNavigate } from 'react-router-dom';

const Header = ({ onToggleSidebar, sidebarCollapsed }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/logout');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header style={{
      background: 'var(--neutral-800)',
      borderBottom: '1px solid #2563eb',
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(12px)'
    }}>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'relative'
      }} ref={dropdownRef}>
        {/* User Dropdown Trigger */}
        <button
          onClick={toggleDropdown}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.15)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            background: '#10b981',
            borderRadius: '50%'
          }} />
          <span>{user?.username || 'User'}</span>
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{
              transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            minWidth: '160px',
            zIndex: 1000,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '8px 0'
            }}>
              {/* User Info */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--neutral-900)',
                  marginBottom: '4px'
                }}>
                  {user?.username || 'User'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--neutral-600)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    background: '#10b981',
                    borderRadius: '50%'
                  }} />
                  Online
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--neutral-700)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--neutral-50)';
                  e.target.style.color = 'var(--neutral-900)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'var(--neutral-700)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16,17 21,12 16,7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
