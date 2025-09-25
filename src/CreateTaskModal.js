import React, { useState, useEffect, useContext } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { format } from 'sql-formatter';
import MonacoEditor from '@monaco-editor/react';
import { AuthContext } from './AuthProvider';
import { UDFApi } from './utils/apiUtils';

const CreateTaskModal = ({ isOpen, onClose, playground, tasks, onSubmit }) => {
  const { user, token } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    type: 'SPARK_SQL',
    query: '',
    parentId: '',
    udfIds: []
  });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'formatted'
  const [rawQuery, setRawQuery] = useState(''); // Store the raw unformatted query
  const [udfs, setUdfs] = useState([]);
  const [udfsLoading, setUdfsLoading] = useState(false);

  // Ensure tasks is always an array
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const taskTypes = [
    { value: 'SPARK_SQL', label: 'Spark SQL' },
    { value: 'PY_SPARK', label: 'PySpark' },
    { value: 'PRESTO', label: 'Presto' },
    { value: 'HIVE', label: 'Hive' },
    { value: 'SQL', label: 'SQL' }
  ];

  // Fetch UDFs when modal opens
  useEffect(() => {
    if (isOpen && user && token) {
      fetchUDFs();
    }
  }, [isOpen, user, token]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.query.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Debug logging
    console.log('CreateTaskModal submitting:', {
      formData,
      playground,
      playgroundId: playground?.id
    });

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        type: 'SPARK_SQL',
        query: '',
        parentId: '',
        udfIds: []
      });
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'query') {
      // Store the raw query for editing
      setRawQuery(value);
      
      // Always format the SQL
      const formattedSQL = formatSQL(value);
      setFormData(prev => ({
        ...prev,
        [name]: formattedSQL
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  const handleUDFSelection = (udfId, isSelected) => {
    setFormData(prev => ({
      ...prev,
      udfIds: isSelected 
        ? [...prev.udfIds, udfId]
        : prev.udfIds.filter(id => id !== udfId)
    }));
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
          maxWidth: '1200px',
          width: '95%',
          maxHeight: '95vh',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--neutral-200)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--neutral-200)'
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--neutral-900)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create New Task
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: 'var(--neutral-600)'
            }}>
              Add a new data processing task to {playground.name}
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
            {/* Left Column - Form Fields */}
            <div style={{ 
              width: '300px', 
              flexShrink: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              overflow: 'auto'
            }}>
              {/* Task Name */}
              <div>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--neutral-700)',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  Task Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter task name..."
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--neutral-300)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-500)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--neutral-300)';
                  }}
                />
              </div>

              {/* Task Type */}
              <div>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--neutral-700)',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  Task Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--neutral-300)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    background: 'white'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-500)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--neutral-300)';
                  }}
                >
                  {taskTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parent Task */}
              <div>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--neutral-700)',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  Parent Task (Optional)
                </label>
                <select
                  name="parentId"
                  value={formData.parentId}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--neutral-300)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    background: 'white'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-500)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--neutral-300)';
                  }}
                >
                  <option value="">No parent task</option>
                  {safeTasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* UDF Selection */}
              <div>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--neutral-700)',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  UDFs (Optional)
                </label>
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
                          checked={formData.udfIds.includes(udf.id)}
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
                {formData.udfIds.length > 0 && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--neutral-600)',
                    marginTop: '4px'
                  }}>
                    {formData.udfIds.length} UDF{formData.udfIds.length !== 1 ? 's' : ''} selected
                  </div>
                )}
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
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--neutral-800)',
                  margin: 0
                }}>
                  Query Editor *
                </label>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--neutral-500)',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                }}>
                  {formData.type}
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
                  value={formData.query}
                  onChange={(value) => {
                    if (value) {
                      setFormData(prev => ({
                        ...prev,
                        query: value
                      }));
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
              {/* SQL Information Message */}
              {formData.type === 'SQL' && (
                <div style={{
                  padding: '12px 16px',
                  background: '#e0f2fe',
                  borderTop: '1px solid #b3e5fc',
                  fontSize: '13px',
                  color: '#01579b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>
                    <strong>SQL Query Info:</strong> Using SQL, you can query the configured database directly. Only read queries are supported.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--neutral-200)'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--neutral-300)',
                borderRadius: '6px',
                color: 'var(--neutral-600)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = 'var(--neutral-50)';
                  e.target.style.borderColor = 'var(--neutral-400)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = 'transparent';
                  e.target.style.borderColor = 'var(--neutral-300)';
                }
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim() || !formData.query.trim()}
              style={{
                padding: '8px 16px',
                background: (loading || !formData.name.trim() || !formData.query.trim()) 
                  ? 'var(--neutral-300)' 
                  : 'var(--primary-600)',
                border: 'none',
                borderRadius: '6px',
                color: (loading || !formData.name.trim() || !formData.query.trim()) 
                  ? 'var(--neutral-500)' 
                  : 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: (loading || !formData.name.trim() || !formData.query.trim()) 
                  ? 'not-allowed' 
                  : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                if (!loading && formData.name.trim() && formData.query.trim()) {
                  e.target.style.background = 'var(--primary-700)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && formData.name.trim() && formData.query.trim()) {
                  e.target.style.background = 'var(--primary-600)';
                }
              }}
            >
              {loading && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>

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
          }}>Ctrl+Enter</kbd> to create task, <kbd style={{
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

export default CreateTaskModal;
