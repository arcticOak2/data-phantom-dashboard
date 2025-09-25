import React, { useState, useEffect, useContext } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { format } from 'sql-formatter';
import MonacoEditor from '@monaco-editor/react';
import { AuthContext } from './AuthProvider';
import { UDFApi } from './utils/apiUtils';

const EditQueryModal = ({ isOpen, onClose, task, onSave }) => {
  const { user, token } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'formatted'
  const [rawQuery, setRawQuery] = useState(''); // Store the raw unformatted query
  const [udfs, setUdfs] = useState([]);
  const [udfsLoading, setUdfsLoading] = useState(false);
  const [selectedUdfIds, setSelectedUdfIds] = useState([]);

  useEffect(() => {
    if (task && isOpen) {
      setQuery(task.query || '');
      setRawQuery(task.query || '');
      
      // Parse existing UDF IDs from task
      if (task.udfIds) {
        const udfIdsArray = task.udfIds.split(',').filter(id => id.trim());
        setSelectedUdfIds(udfIdsArray);
      } else {
        setSelectedUdfIds([]);
      }
      
      // Fetch UDFs
      if (user && token) {
        fetchUDFs();
      }
    }
  }, [task, isOpen, user, token]);

  const fetchUDFs = async () => {
    if (!user || !token) return;
    
    setUdfsLoading(true);
    try {
      const response = await UDFApi.getUDFsByUserId(user.userId);
      
      if (response.success && response.udfs) {
        setUdfs(response.udfs);
      } else {
        setUdfs([]);
      }
    } catch (error) {
      console.error('Failed to fetch UDFs:', error);
      setUdfs([]);
    } finally {
      setUdfsLoading(false);
    }
  };

  // SQL formatter using sql-formatter library
  const formatSQL = (sql) => {
    if (!sql.trim()) return sql;
    
    try {
      return format(sql, {
        language: 'spark', // Use Spark SQL dialect
        uppercase: true,
        linesBetweenQueries: 1,
        indent: '  '
      });
    } catch (error) {
      // If formatting fails, return the original SQL
      console.warn('SQL formatting failed:', error);
      return sql;
    }
  };

  const handleSave = async () => {
    if (!task || !query.trim()) return;
    
    setSaving(true);
    try {
      await onSave(task.id, query.trim(), selectedUdfIds.join(','));
      onClose();
    } catch (error) {
      console.error('Error saving query:', error);
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

  const handleUDFSelection = (udfId, isSelected) => {
    setSelectedUdfIds(prev => 
      isSelected 
        ? [...prev, udfId]
        : prev.filter(id => id !== udfId)
    );
  };

  if (!isOpen || !task) return null;

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
          maxWidth: '1200px',
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
              Edit Query
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: 'var(--neutral-600)'
            }}>
              {task.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--neutral-500)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--neutral-100)';
              e.target.style.color = 'var(--neutral-700)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = 'var(--neutral-500)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', gap: '24px', minHeight: 0 }}>
          {/* Left Column - Task Information */}
          <div style={{ 
            width: '300px', 
            flexShrink: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px'
          }}>
            {/* Task Details */}
            <div>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--neutral-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Task Details
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{
                  padding: '8px 10px',
                  background: 'var(--neutral-50)',
                  borderRadius: '6px',
                  border: '1px solid var(--neutral-200)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--neutral-600)', marginBottom: '2px' }}>Type</div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-700)' }}>
                    {task.type.replace('_', ' ')}
                  </div>
                </div>
                <div style={{
                  padding: '8px 10px',
                  background: 'var(--neutral-50)',
                  borderRadius: '6px',
                  border: '1px solid var(--neutral-200)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--neutral-600)', marginBottom: '2px' }}>Status</div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-700)' }}>
                    {task.taskStatus}
                  </div>
                </div>
                {task.outputLocation && (
                  <div style={{
                    padding: '8px 10px',
                    background: 'var(--neutral-50)',
                    borderRadius: '6px',
                    border: '1px solid var(--neutral-200)'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--neutral-600)', marginBottom: '2px' }}>Output</div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: 'var(--neutral-700)',
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      wordBreak: 'break-all'
                    }}>
                      {task.outputLocation}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* UDF Selection */}
            <div>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--neutral-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                  <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                  <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                </svg>
                UDFs
              </h4>
              <div style={{
                maxHeight: '120px',
                overflowY: 'auto',
                border: '1px solid var(--neutral-300)',
                borderRadius: '6px',
                background: 'white',
                padding: '8px'
              }}>
                {udfsLoading ? (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--neutral-500)',
                    textAlign: 'center',
                    padding: '8px'
                  }}>
                    Loading UDFs...
                  </div>
                ) : udfs.length === 0 ? (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--neutral-500)',
                    textAlign: 'center',
                    padding: '8px'
                  }}>
                    No UDFs available
                  </div>
                ) : (
                  udfs.map(udf => (
                    <label
                      key={udf.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 0',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUdfIds.includes(udf.id)}
                        onChange={(e) => handleUDFSelection(udf.id, e.target.checked)}
                        style={{
                          margin: 0,
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{
                        color: 'var(--neutral-700)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {udf.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {selectedUdfIds.length > 0 && (
                <div style={{
                  fontSize: '11px',
                  color: 'var(--neutral-600)',
                  marginTop: '4px'
                }}>
                  {selectedUdfIds.length} UDF{selectedUdfIds.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {/* Editing Tips */}
            <div>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--neutral-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11H1l9-9 9 9h-8v7a2 2 0 0 1-2 2H9v-7z" />
                </svg>
                Tips
              </h4>
              <div style={{
                padding: '12px',
                background: 'var(--primary-50)',
                borderRadius: '6px',
                border: '1px solid var(--primary-200)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--primary-800)', lineHeight: '1.4' }}>
                  • Use <kbd style={{ background: 'var(--primary-100)', padding: '1px 4px', borderRadius: '2px', fontSize: '10px' }}>Ctrl+Enter</kbd> to save quickly<br/>
                  • Press <kbd style={{ background: 'var(--primary-100)', padding: '1px 4px', borderRadius: '2px', fontSize: '10px' }}>Esc</kbd> to cancel<br/>
                  • Changes are saved immediately
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Query Editor */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: 0,
            border: '1px solid var(--neutral-200)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '12px 16px',
              background: 'var(--neutral-50)',
              borderBottom: '1px solid var(--neutral-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--neutral-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16,18 22,12 16,6" />
                  <polyline points="8,6 2,12 8,18" />
                </svg>
                Query Editor
              </h4>
              <div style={{
                fontSize: '11px',
                color: 'var(--neutral-500)',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
              }}>
                {task.type.replace('_', ' ')}
              </div>
            </div>
            <div style={{
              flex: 1,
              minHeight: '400px',
              border: '1px solid var(--neutral-200)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <MonacoEditor
                height="400px"
                language="sql"
                theme="vs-light"
                value={query}
                onChange={(value) => {
                  if (value) {
                    setQuery(value);
                  }
                }}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 16,
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible'
                  },
                  automaticLayout: true
                }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--neutral-200)'
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--neutral-300)',
              borderRadius: '6px',
              color: 'var(--neutral-600)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: saving ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.target.style.background = 'var(--neutral-50)';
                e.target.style.borderColor = 'var(--neutral-400)';
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'var(--neutral-300)';
              }
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !query.trim()}
            style={{
              padding: '8px 16px',
              background: saving || !query.trim() ? 'var(--neutral-300)' : 'var(--primary-600)',
              border: 'none',
              borderRadius: '6px',
              color: saving || !query.trim() ? 'var(--neutral-500)' : 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: saving || !query.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (!saving && query.trim()) {
                e.target.style.background = 'var(--primary-700)';
              }
            }}
            onMouseLeave={(e) => {
              if (!saving && query.trim()) {
                e.target.style.background = 'var(--primary-600)';
              }
            }}
          >
            {saving && (
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid transparent',
                borderTop: '2px solid currentColor',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
            {saving ? 'Saving...' : 'Save Query'}
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div style={{
          marginTop: '12px',
          fontSize: '12px',
          color: 'var(--neutral-500)',
          textAlign: 'center'
        }}>
          Press <kbd style={{
            background: 'var(--neutral-100)',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '11px',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
          }}>Ctrl+Enter</kbd> to save query, <kbd style={{
            background: 'var(--neutral-100)',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '11px',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
          }}>Esc</kbd> to cancel
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EditQueryModal;

