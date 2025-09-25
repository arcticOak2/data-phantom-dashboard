import React from 'react';

const AlertModal = ({ isOpen, onClose, title, message, type = 'info', onConfirm, showCancel = false }) => {

  
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          icon: '❌',
          iconBg: 'rgba(239, 68, 68, 0.1)',
          iconColor: '#ef4444',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          buttonBg: '#ef4444',
          buttonHover: '#dc2626'
        };
      case 'warning':
        return {
          icon: '',
          iconBg: 'rgba(245, 158, 11, 0.1)',
          iconColor: '#f59e0b',
          borderColor: 'rgba(245, 158, 11, 0.2)',
          buttonBg: '#22c55e',
          buttonHover: '#16a34a'
        };
      case 'success':
        return {
          icon: '',
          iconBg: 'rgba(34, 197, 94, 0.1)',
          iconColor: '#22c55e',
          borderColor: 'rgba(34, 197, 94, 0.2)',
          buttonBg: '#22c55e',
          buttonHover: '#16a34a'
        };
      default:
        return {
          icon: 'ℹ️',
          iconBg: 'rgba(59, 130, 246, 0.1)',
          iconColor: '#3b82f6',
          borderColor: 'rgba(59, 130, 246, 0.2)',
          buttonBg: '#3b82f6',
          buttonHover: '#2563eb'
        };
    }
  };

  const typeStyles = getTypeStyles();

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

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
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: `1px solid ${typeStyles.borderColor}`,
          animation: 'modalSlideIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {type !== 'warning' && (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: typeStyles.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              {typeStyles.icon}
            </div>
          )}
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--neutral-900)'
          }}>
            {title}
          </h3>
        </div>

        {/* Message */}
        <div style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          lineHeight: '1.5',
          color: 'var(--neutral-600)',
          whiteSpace: 'pre-line'
        }}>
          {message}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          {showCancel && (
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--neutral-300)',
                borderRadius: '6px',
                color: 'var(--neutral-600)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--neutral-50)';
                e.target.style.borderColor = 'var(--neutral-400)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'var(--neutral-300)';
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              background: typeStyles.buttonBg,
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = typeStyles.buttonHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = typeStyles.buttonBg;
            }}
          >
            {showCancel ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>

      <style jsx="true">{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AlertModal;
