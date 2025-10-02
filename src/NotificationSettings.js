import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthProvider';
import { NotificationApi } from './utils/apiUtils';

const NotificationSettings = ({ playground }) => {
  const { token } = useContext(AuthContext);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [feedback, setFeedback] = useState({ show: false, type: '', message: '' });
  const [validationError, setValidationError] = useState('');
  const [operationInProgress, setOperationInProgress] = useState(false);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Show feedback message
  const showFeedback = (type, message) => {
    setFeedback({ show: true, type, message });
    setTimeout(() => setFeedback({ show: false, type: '', message: '' }), 5000);
  };

  // Validate email format
  const validateEmail = (email) => {
    return emailRegex.test(email.trim());
  };

  // Fetch current subscribers
  const fetchSubscribers = async () => {
    if (!playground || !playground.id) return;

    try {
      setLoading(true);
      const response = await NotificationApi.getSubscribers(playground.id);
      setSubscribers(response || []);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      showFeedback('error', 'Failed to load notification subscribers');
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  };

  // Add single email subscriber
  const addEmailSubscriber = async (email) => {
    if (!playground || !playground.id) return;

    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    // Check if email already exists
    if (subscribers.some(sub => sub.destination?.toLowerCase() === trimmedEmail.toLowerCase())) {
      setValidationError('This email is already subscribed');
      return;
    }

    try {
      setOperationInProgress(true);
      await NotificationApi.addSubscriber(playground.id, trimmedEmail);

      // Refresh subscribers list
      await fetchSubscribers();
      showFeedback('success', `Successfully added ${trimmedEmail} to notifications`);
      setValidationError('');
      return true;
    } catch (error) {
      console.error('Error adding subscriber:', error);
      showFeedback('error', `Failed to add ${trimmedEmail}: ${error.message}`);
      return false;
    } finally {
      setOperationInProgress(false);
    }
  };

  // Remove email subscriber
  const removeEmailSubscriber = async (destinationId, email) => {
    if (!playground || !playground.id) return;

    try {
      setOperationInProgress(true);
      await NotificationApi.removeSubscriber(destinationId);

      // Refresh subscribers list
      await fetchSubscribers();
      showFeedback('success', `Successfully removed ${email} from notifications`);
    } catch (error) {
      console.error('Error removing subscriber:', error);
      showFeedback('error', `Failed to remove ${email}: ${error.message}`);
    } finally {
      setOperationInProgress(false);
    }
  };

  // Handle single email add
  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const success = await addEmailSubscriber(newEmail);
    if (success) {
      setNewEmail('');
    }
  };

  // Load subscribers when playground changes
  useEffect(() => {
    fetchSubscribers();
  }, [playground?.id]);

  // Clear validation error when input changes
  useEffect(() => {
    if (validationError) {
      setValidationError('');
    }
  }, [newEmail]);

  if (!playground) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '300px',
        color: 'var(--neutral-500)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: 'var(--neutral-100)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--neutral-700)', margin: '0 0 4px 0' }}>
          No Playground Selected
        </h3>
        <p style={{ fontSize: '14px', margin: 0 }}>
          Select a playground to manage notification settings
        </p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '0'
    }}>
      {/* Feedback Message */}
      {feedback.show && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '8px',
          border: `1px solid ${feedback.type === 'success' ? 'var(--success-200)' : 'var(--error-200)'}`,
          background: feedback.type === 'success' ? 'var(--success-50)' : 'var(--error-50)',
          color: feedback.type === 'success' ? 'var(--success-700)' : 'var(--error-700)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {feedback.type === 'success' ? (
              <path d="M9 12l2 2 4-4"/>
            ) : (
              <circle cx="12" cy="12" r="10"/>
            )}
          </svg>
          {feedback.message}
        </div>
      )}

      {/* Header */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--neutral-200)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--neutral-900)',
          margin: '0 0 8px 0'
        }}>
          Email Notifications
        </h2>
        <p style={{
          fontSize: '14px',
          color: 'var(--neutral-600)',
          margin: 0
        }}>
          Manage email subscribers for playground execution notifications. Add email addresses to receive notifications when this playground runs.
        </p>
      </div>

      {/* Add Email Section */}
      <div style={{
        background: 'var(--neutral-50)',
        border: '1px solid var(--neutral-200)',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--neutral-900)',
          margin: '0 0 16px 0'
        }}>
          Add Email Subscribers
        </h3>

        {/* Single Email Input */}
        <form onSubmit={handleAddEmail} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter email address"
                disabled={operationInProgress}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${validationError ? 'var(--error-300)' : 'var(--neutral-300)'}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                  opacity: operationInProgress ? 0.6 : 1
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                onBlur={(e) => e.target.style.borderColor = validationError ? 'var(--error-300)' : 'var(--neutral-300)'}
              />
            </div>
            <button
              type="submit"
              disabled={!newEmail.trim() || operationInProgress}
              style={{
                padding: '10px 16px',
                background: !newEmail.trim() || operationInProgress ? 'var(--neutral-300)' : 'var(--primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: !newEmail.trim() || operationInProgress ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (newEmail.trim() && !operationInProgress) {
                  e.target.style.background = 'var(--primary-700)';
                }
              }}
              onMouseLeave={(e) => {
                if (newEmail.trim() && !operationInProgress) {
                  e.target.style.background = 'var(--primary-600)';
                }
              }}
            >
              Add Email
            </button>
          </div>
        </form>

        {/* Validation Error */}
        {validationError && (
          <div style={{
            padding: '8px 12px',
            marginTop: '8px',
            background: 'var(--error-50)',
            border: '1px solid var(--error-200)',
            borderRadius: '6px',
            color: 'var(--error-700)',
            fontSize: '14px'
          }}>
            {validationError}
          </div>
        )}
      </div>

      {/* Current Subscribers */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--neutral-900)',
            margin: 0
          }}>
            Current Subscribers
          </h3>
          <span style={{
            fontSize: '14px',
            color: 'var(--neutral-500)',
            background: 'var(--neutral-100)',
            padding: '4px 8px',
            borderRadius: '12px'
          }}>
            {loading ? 'Loading...' : `${subscribers.length} subscriber${subscribers.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '120px',
            color: 'var(--neutral-500)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--neutral-200)',
              borderTop: '3px solid var(--primary-500)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ marginLeft: '12px' }}>Loading subscribers...</span>
          </div>
        ) : subscribers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--neutral-500)',
            background: 'var(--neutral-50)',
            border: '1px solid var(--neutral-200)',
            borderRadius: '8px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'var(--neutral-100)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>No Email Subscribers</p>
            <p style={{ margin: 0, fontSize: '14px' }}>Add email addresses above to start receiving notifications</p>
          </div>
        ) : (
          <div style={{
            border: '1px solid var(--neutral-200)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {subscribers.map((subscriber, index) => (
              <div
                key={subscriber.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: index < subscribers.length - 1 ? '1px solid var(--neutral-200)' : 'none',
                  background: 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: 'var(--primary-100)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-600)" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--neutral-900)'
                    }}>
                      {subscriber.destination}
                    </div>
                    {subscriber.createdAt && (
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--neutral-500)'
                      }}>
                        Added {new Date(subscriber.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeEmailSubscriber(subscriber.id, subscriber.destination)}
                  disabled={operationInProgress}
                  style={{
                    background: 'none',
                    border: '1px solid var(--error-300)',
                    color: 'var(--error-600)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: operationInProgress ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: operationInProgress ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!operationInProgress) {
                      e.target.style.background = 'var(--error-50)';
                      e.target.style.borderColor = 'var(--error-400)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!operationInProgress) {
                      e.target.style.background = 'none';
                      e.target.style.borderColor = 'var(--error-300)';
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSS for loading spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NotificationSettings;
