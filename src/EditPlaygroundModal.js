import React, { useState, useEffect } from 'react';

const EditPlaygroundModal = ({ isOpen, onClose, playground, onSave }) => {
  const [name, setName] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (playground && isOpen) {
      setName(playground.name || '');
      setCronExpression(playground.cronExpression || '');
    }
  }, [playground, isOpen]);

  const handleSave = async () => {
    if (!playground || !name.trim()) return;
    
    setSaving(true);
    try {
      await onSave(playground.id, name.trim(), cronExpression.trim());
      onClose();
    } catch (error) {
      console.error('Error saving playground:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  if (!isOpen || !playground) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '95%',
          maxHeight: '95vh',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--neutral-200)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--neutral-200)'
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--neutral-900)'
            }}>
              Edit Playground
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: 'var(--neutral-600)'
            }}>
              Update playground settings
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--neutral-400)',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--neutral-600)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--neutral-400)'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--neutral-700)'
            }}>
              Playground Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--neutral-300)',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--neutral-300)'}
              placeholder="Enter playground name"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--neutral-700)'
            }}>
              Cron Expression
            </label>
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--neutral-300)',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--neutral-300)'}
              placeholder="e.g., 0 0 * * * (daily at midnight)"
            />
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: 'var(--neutral-500)'
            }}>
              Optional: Cron expression for scheduling. Leave empty for manual execution.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '20px',
          borderTop: '1px solid var(--neutral-200)'
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '10px 20px',
              border: '1px solid var(--neutral-300)',
              borderRadius: '8px',
              background: 'white',
              color: 'var(--neutral-700)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: saving ? 0.5 : 1
            }}
            onMouseEnter={(e) => !saving && (e.target.style.background = 'var(--neutral-50)')}
            onMouseLeave={(e) => !saving && (e.target.style.background = 'white')}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: saving || !name.trim() ? 'var(--neutral-300)' : 'var(--primary-600)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: saving ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!saving && name.trim()) {
                e.target.style.background = 'var(--primary-700)';
              }
            }}
            onMouseLeave={(e) => {
              if (!saving && name.trim()) {
                e.target.style.background = 'var(--primary-600)';
              }
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPlaygroundModal;





















































