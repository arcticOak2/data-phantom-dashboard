import React, { useState, useEffect, useContext } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AuthContext } from './AuthProvider';
import { UDFApi } from './utils/apiUtils';

const TaskDetailsModal = ({ isOpen, onClose, task }) => {
  const { user, token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('info');
  const [outputPreview, setOutputPreview] = useState({ loading: false, data: null, error: null, permanentError: false });
  const [logPreview, setLogPreview] = useState({ loading: false, data: null, error: null, permanentError: false });
  const [udfs, setUdfs] = useState([]);
  const [udfsLoading, setUdfsLoading] = useState(false);
  const [selectedUdfs, setSelectedUdfs] = useState([]);

  // Reset preview states when task changes
  useEffect(() => {
    if (task) {
      setOutputPreview({ loading: false, data: null, error: null, permanentError: false });
      setLogPreview({ loading: false, data: null, error: null, permanentError: false });
      setActiveTab('info'); // Reset to info tab when opening new task
      
      // Parse and set selected UDFs
      if (task.udfIds) {
        const udfIdsArray = task.udfIds.split(',').filter(id => id.trim());
        setSelectedUdfs(udfIdsArray);
      } else {
        setSelectedUdfs([]);
      }
      
      // Fetch UDFs if user and token are available
      if (user && token) {
        fetchUDFs();
      }
    }
  }, [task?.id, user, token]); // Reset when task ID changes

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

  // Load previews when switching to preview or log tab
  useEffect(() => {
    if ((activeTab === 'preview' || activeTab === 'log') && isOpen && task) {
      if (activeTab === 'preview' && task.outputLocation && !outputPreview.data && !outputPreview.loading && !outputPreview.permanentError) {
        fetchS3Preview(task.outputLocation, 'output');
      }
      if (activeTab === 'log' && task.logPath && !logPreview.data && !logPreview.loading && !logPreview.permanentError) {
        fetchS3Preview(task.logPath, 'log');
      }
    }
  }, [activeTab, task?.outputLocation, task?.logPath, isOpen]);

  if (!isOpen || !task) return null;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return { bg: '#10b981', text: 'white', border: '#059669' }; // Green - success
      case 'FAILED':
        return { bg: '#ef4444', text: 'white', border: '#dc2626' }; // Red - failure
      case 'RUNNING':
        return { bg: '#fbbf24', text: 'black', border: '#f59e0b' }; // Bright yellow - active
      case 'PENDING':
        return { bg: '#60a5fa', text: 'white', border: '#3b82f6' }; // Light blue - waiting
      case 'CANCELLED':
        return { bg: '#6b7280', text: 'white', border: '#4b5563' }; // Dark gray - stopped
      case 'IDLE':
        return { bg: '#a78bfa', text: 'white', border: '#8b5cf6' }; // Light purple - sleeping
      case 'PARTIAL_SUCCESS':
        return { bg: '#f97316', text: 'white', border: '#ea580c' }; // Orange - partial
      case 'UPSTREAM_FAILED':
        return { bg: '#f59e0b', text: 'white', border: '#d97706' }; // Amber - upstream failure
      case 'UNKNOWN':
      default:
        return { bg: '#9ca3af', text: 'white', border: '#6b7280' }; // Medium gray - unknown
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'SPARK_SQL':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {/* Apache Spark Logo */}
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#E25A1C"/>
            <path d="M2 17l10 5 10-5" fill="#E25A1C"/>
            <path d="M2 12l10 5 10-5" fill="#E25A1C"/>
            <circle cx="12" cy="7" r="2" fill="white"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
            <circle cx="12" cy="17" r="2" fill="white"/>
          </svg>
        );
      case 'PY_SPARK':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {/* Python + Spark combined */}
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#E25A1C"/>
            <path d="M2 17l10 5 10-5" fill="#E25A1C"/>
            <path d="M2 12l10 5 10-5" fill="#E25A1C"/>
            <circle cx="12" cy="7" r="1.5" fill="white"/>
            <circle cx="12" cy="12" r="1.5" fill="white"/>
            <circle cx="12" cy="17" r="1.5" fill="white"/>
            {/* Python snake */}
            <path d="M8 4c-1 0-2 1-2 2s1 2 2 2 2-1 2-2-1-2-2-2z" fill="#3776AB"/>
            <path d="M16 4c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2z" fill="#FFD43B"/>
          </svg>
        );
      case 'PRESTO':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {/* Presto Logo */}
            <circle cx="12" cy="12" r="10" fill="#5890FF"/>
            <path d="M8 8h8v8H8z" fill="white"/>
            <circle cx="10" cy="10" r="1" fill="#5890FF"/>
            <circle cx="14" cy="10" r="1" fill="#5890FF"/>
            <circle cx="10" cy="14" r="1" fill="#5890FF"/>
            <circle cx="14" cy="14" r="1" fill="#5890FF"/>
            <path d="M12 8v8M8 12h8" stroke="#5890FF" strokeWidth="0.5"/>
          </svg>
        );
      case 'HIVE':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {/* Apache Hive Logo */}
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#FD7C00"/>
            <path d="M2 17l10 5 10-5" fill="#FD7C00"/>
            <path d="M2 12l10 5 10-5" fill="#FD7C00"/>
            <circle cx="12" cy="7" r="1.5" fill="white"/>
            <circle cx="12" cy="12" r="1.5" fill="white"/>
            <circle cx="12" cy="17" r="1.5" fill="white"/>
            {/* Hive hexagon */}
            <path d="M12 4l3 1.5v3l-3 1.5-3-1.5v-3L12 4z" fill="white" opacity="0.8"/>
          </svg>
        );
      case 'SQL':
        return (
          <span style={{ fontSize: '20px' }}>🗃️</span>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11H1l9-9 9 9h-8v7a2 2 0 0 1-2 2H9v-7z" />
            <path d="M20 20h-2a2 2 0 0 1-2-2V9" />
          </svg>
        );
    }
  };

  const statusColors = getStatusColor(task.status);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Function to parse CSV data properly
  const parseCSV = (csvText) => {
    if (!csvText || typeof csvText !== 'string') return { headers: [], rows: [] };
    
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    // Detect delimiter (comma or tab)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const delimiter = tabCount > commaCount ? '\t' : ',';
    
    console.log('CSV Parsing Debug:');
    console.log('- Using delimiter:', delimiter);
    console.log('- Comma count:', commaCount);
    console.log('- Tab count:', tabCount);
    
    // Parse CSV with proper handling of quoted values and detected delimiter
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVLine(line));
    
    console.log('Parsed CSV:');
    console.log('- Headers:', headers);
    console.log('- Rows count:', rows.length);
    console.log('- First row:', rows[0]);
    
    return { headers, rows };
  };

  // Function to detect if content is CSV-like
  const isCSVContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    const lines = content.trim().split('\n');
    if (lines.length < 2) return false;
    
    // Check if first line has comma-separated values
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    console.log('CSV Detection Debug:');
    console.log('- First line:', firstLine);
    console.log('- Comma count:', commaCount);
    console.log('- Tab count:', tabCount);
    console.log('- Lines count:', lines.length);
    
    // More lenient detection - check for commas OR tabs, and require at least 2 lines
    const isCSV = (commaCount > 0 || tabCount > 0) && lines.length > 1;
    console.log('- Will detect as CSV:', isCSV);
    
    return isCSV;
  };

  // API function to fetch S3 file preview
  const fetchS3Preview = async (s3Location, type) => {
    if (!s3Location) return;
    
    const setState = type === 'output' ? setOutputPreview : setLogPreview;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/preview/${encodeURIComponent(s3Location)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const previewText = data.preview?.join('\n') || '';
        
        // Parse CSV only for output files, not logs
        const isCSV = type === 'output' && isCSVContent(previewText);
        const parsedData = isCSV ? parseCSV(previewText) : null;
        
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          data: { 
            ...data, 
            isCSV, 
            parsedData,
            rawText: previewText
          }, 
          error: null 
        }));
      } else if (response.status === 404) {
        // Handle file not found specifically - set permanent error state
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'File not found', 
          data: null, 
          permanentError: true 
        }));
      } else {
        throw new Error(`Failed to fetch preview: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error fetching ${type} preview:`, error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message, 
        data: null, 
        permanentError: error.message.includes('404') || error.message.includes('not found') 
      }));
    }
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
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--neutral-200)',
          background: 'white'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'var(--primary-100)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-700)'
              }}>
                {getTypeIcon(task.type)}
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--neutral-900)',
                  marginBottom: '4px'
                }}>
                  {task.name}
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{
                    padding: '4px 12px',
                    background: 'var(--primary-50)',
                    color: 'var(--primary-700)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {task.type.replace('_', ' ')}
                  </span>
                  <span style={{
                    padding: '6px 12px',
                    background: statusColors.bg,
                    color: statusColors.text,
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: `1px solid ${statusColors.border}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {task.status === 'SUCCESS' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 12l2 2 4-4" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    ) : task.status === 'RUNNING' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    ) : task.status === 'FAILED' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                      </svg>
                    )}
                    {task.status}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Last Run Status */}
            {task.lastRunStatus && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--neutral-700)',
                  minWidth: '120px'
                }}>
                  Last Run Status:
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    padding: '6px 12px',
                    background: getStatusColor(task.lastRunStatus).bg,
                    color: getStatusColor(task.lastRunStatus).text,
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: `1px solid ${getStatusColor(task.lastRunStatus).border}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {task.lastRunStatus === 'SUCCESS' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 12l2 2 4-4" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    ) : task.lastRunStatus === 'RUNNING' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    ) : task.lastRunStatus === 'FAILED' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                      </svg>
                    )}
                    {task.lastRunStatus}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--neutral-500)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--neutral-100)';
                e.target.style.color = 'var(--neutral-700)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = 'var(--neutral-500)';
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          padding: '0 24px',
          borderBottom: '1px solid var(--neutral-200)',
          background: 'white'
        }}>
          <div style={{
            display: 'flex',
            gap: '0',
            borderBottom: '1px solid var(--neutral-200)'
          }}>
            <button
              onClick={() => setActiveTab('info')}
              style={{
                padding: '12px 20px',
                background: activeTab === 'info' ? 'white' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'info' ? '2px solid var(--primary-600)' : '2px solid transparent',
                color: activeTab === 'info' ? 'var(--primary-700)' : 'var(--neutral-600)',
                fontSize: '14px',
                fontWeight: activeTab === 'info' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Task Information
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              style={{
                padding: '12px 20px',
                background: activeTab === 'preview' ? 'white' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'preview' ? '2px solid var(--primary-600)' : '2px solid transparent',
                color: activeTab === 'preview' ? 'var(--primary-700)' : 'var(--neutral-600)',
                fontSize: '14px',
                fontWeight: activeTab === 'preview' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Output Preview
            </button>
            <button
              onClick={() => setActiveTab('log')}
              style={{
                padding: '12px 20px',
                background: activeTab === 'log' ? 'white' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'log' ? '2px solid var(--primary-600)' : '2px solid transparent',
                color: activeTab === 'log' ? 'var(--primary-700)' : 'var(--neutral-600)',
                fontSize: '14px',
                fontWeight: activeTab === 'log' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
              </svg>
              Log Preview
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflow: 'hidden',
          display: 'flex',
          gap: '24px'
        }}>
          {activeTab === 'info' ? (
            <>
              {/* Left Column - Task Information */}
          <div style={{ 
            width: '350px', 
            flexShrink: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px',
            overflow: 'auto'
          }}>
            {/* Basic Information */}
            <div>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--neutral-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Basic Information
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{
                  padding: '10px 12px',
                  background: 'var(--neutral-50)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--neutral-200)'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--neutral-600)', marginBottom: '4px' }}>Task ID</div>
                  <div style={{ 
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    fontSize: '12px',
                    color: 'var(--neutral-700)',
                    wordBreak: 'break-all'
                  }}>
                    {task.id}
                  </div>
                </div>
                <div style={{
                  padding: '10px 12px',
                  background: 'var(--neutral-50)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--neutral-200)'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--neutral-600)', marginBottom: '4px' }}>Created</div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-700)' }}>
                    {formatDate(task.createdAt)}
                  </div>
                </div>
                {task.updatedAt && (
                  <div style={{
                    padding: '10px 12px',
                    background: 'var(--neutral-50)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--neutral-200)'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--neutral-600)', marginBottom: '4px' }}>Last Updated</div>
                    <div style={{ fontSize: '12px', color: 'var(--neutral-700)' }}>
                      {formatDate(task.updatedAt)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Output Location */}
            {task.outputLocation && (
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--neutral-800)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10,9 9,9 8,9" />
                  </svg>
                  Output Location
                </h3>
                <div style={{
                  padding: '12px',
                  background: 'var(--neutral-50)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--neutral-200)',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '12px',
                  color: 'var(--neutral-700)',
                  wordBreak: 'break-all'
                }}>
                  {task.outputLocation}
                </div>
              </div>
            )}

            {/* Log Path */}
            {task.logPath && (
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--neutral-800)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    <path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    <path d="M18.36 5.64c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0z" />
                    <path d="M7.05 16.95c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0z" />
                    <path d="M18.36 18.36c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0z" />
                    <path d="M7.05 7.05c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0z" />
                  </svg>
                  Log Path
                </h3>
                <div style={{
                  padding: '12px',
                  background: 'var(--neutral-50)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--neutral-200)',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '12px',
                  color: 'var(--neutral-700)',
                  wordBreak: 'break-all'
                }}>
                  {task.logPath}
                </div>
              </div>
            )}

            {/* Parent Task */}
            {task.parentId && (
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--neutral-800)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                  Parent Task
                </h3>
                <div style={{
                  padding: '12px',
                  background: 'var(--neutral-50)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--neutral-200)',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '12px',
                  color: 'var(--neutral-700)',
                  wordBreak: 'break-all'
                }}>
                  {task.parentId}
                </div>
              </div>
            )}

            {/* Selected UDFs */}
            {selectedUdfs.length > 0 && (
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--neutral-800)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                    <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                    <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                  </svg>
                  Selected UDFs
                </h3>
                <div style={{
                  padding: '12px',
                  background: 'var(--primary-50)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--primary-200)'
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
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {selectedUdfs.map(udfId => {
                        const udf = udfs.find(u => u.id === udfId);
                        return (
                          <div
                            key={udfId}
                            style={{
                              padding: '8px 10px',
                              background: 'white',
                              borderRadius: '6px',
                              border: '1px solid var(--primary-200)',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{
                              fontWeight: '600',
                              color: 'var(--primary-800)',
                              marginBottom: '2px'
                            }}>
                              {udf ? udf.name : 'Unknown UDF'}
                            </div>
                            {udf && (
                              <div style={{
                                fontSize: '11px',
                                color: 'var(--primary-600)',
                                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                marginBottom: '4px'
                              }}>
                                {udf.functionName}
                              </div>
                            )}
                            {udf && (
                              <div style={{
                                display: 'flex',
                                gap: '8px',
                                marginBottom: '4px'
                              }}>
                                <div style={{
                                  fontSize: '10px',
                                  color: 'var(--neutral-500)',
                                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                                }}>
                                  Params: {udf.parameterTypes || 'N/A'}
                                </div>
                                <div style={{
                                  fontSize: '10px',
                                  color: 'var(--neutral-500)',
                                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                                }}>
                                  Returns: {udf.returnType || 'N/A'}
                                </div>
                              </div>
                            )}
                            {udf && udf.description && (
                              <div style={{
                                fontSize: '11px',
                                color: 'var(--neutral-600)',
                                marginTop: '4px',
                                fontStyle: 'italic'
                              }}>
                                {udf.description}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Query Display */}
          {task.query && (
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
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--neutral-800)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16,18 22,12 16,6" />
                    <polyline points="8,6 2,12 8,18" />
                  </svg>
                  Query
                </h3>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--neutral-500)',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                }}>
                  {task.type.replace('_', ' ')}
                </div>
              </div>
              <div style={{
                flex: 1,
                overflow: 'auto',
                border: 'none',
                outline: 'none'
              }}>
                <SyntaxHighlighter
                  language="sql"
                  style={prism}
                  customStyle={{
                    margin: 0,
                    padding: '16px',
                    background: '#f8f9fa',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    borderRadius: 0,
                    border: 'none'
                  }}
                  showLineNumbers={true}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {task.query}
                </SyntaxHighlighter>
              </div>
              {/* SQL Information Message */}
              {task.type === 'SQL' && (
                <div style={{
                  padding: '12px 16px',
                  background: '#e0f2fe',
                  borderTop: '1px solid #b3e5fc',
                  borderBottom: '1px solid #b3e5fc',
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
          )}
            </>
          ) : activeTab === 'preview' ? (
            /* Output Preview Tab Content */
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {task.outputLocation ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
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
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'var(--neutral-800)'
                    }}>
                      Output Preview
                    </h3>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '16px',
                    overflow: 'auto',
                    background: '#f8f9fa'
                  }}>
                    {outputPreview.loading ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        color: 'var(--neutral-500)'
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid var(--neutral-300)',
                          borderTop: '2px solid var(--primary-600)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginRight: '12px'
                        }} />
                        Loading output preview...
                      </div>
                    ) : outputPreview.error ? (
                      <div style={{
                        padding: '20px',
                        background: outputPreview.permanentError ? '#fef3cd' : '#fef2f2',
                        border: `1px solid ${outputPreview.permanentError ? '#fde68a' : '#fecaca'}`,
                        borderRadius: '6px',
                        color: outputPreview.permanentError ? '#92400e' : '#b91c1c'
                      }}>
                        {outputPreview.permanentError ? 'File not found' : `Error loading output preview: ${outputPreview.error}`}
                      </div>
                    ) : outputPreview.data ? (
                      (() => {
                        console.log('CSV Debug Info:');
                        console.log('- isCSV:', outputPreview.data.isCSV);
                        console.log('- parsedData:', outputPreview.data.parsedData);
                        console.log('- headers:', outputPreview.data.parsedData?.headers);
                        console.log('- rows count:', outputPreview.data.parsedData?.rows?.length);
                        return null;
                      })() ||
                      outputPreview.data.isCSV && outputPreview.data.parsedData ? (
                        <div style={{ 
                          overflow: 'auto', 
                          maxHeight: '500px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          background: '#ffffff',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          <table style={{
                            width: 'max-content',
                            borderCollapse: 'collapse',
                            fontSize: '13px',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            minWidth: '100%'
                          }}>
                            <thead>
                              <tr style={{ background: '#374151' }}>
                                {outputPreview.data.parsedData.headers.map((header, index) => (
                                  <th key={index} style={{
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    fontWeight: '600',
                                    color: '#ffffff',
                                    border: '1px solid #4b5563',
                                    whiteSpace: 'nowrap',
                                    minWidth: '120px',
                                    background: '#374151',
                                    fontSize: '13px',
                                    letterSpacing: '0.025em',
                                    textTransform: 'uppercase'
                                  }}>
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {outputPreview.data.parsedData.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} style={{
                                  background: rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
                                  transition: 'background-color 0.15s ease'
                                }}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} style={{
                                      padding: '10px 16px',
                                      border: '1px solid #e5e7eb',
                                      whiteSpace: 'nowrap',
                                      minWidth: '120px',
                                      fontSize: '13px',
                                      color: '#374151',
                                      background: rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
                                      verticalAlign: 'top',
                                      lineHeight: '1.5'
                                    }}>
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{
                          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                          fontSize: '12px',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {outputPreview.data.rawText || outputPreview.data.preview?.join('\n') || 'No preview data available'}
                        </div>
                      )
                    ) : (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: 'var(--neutral-500)'
                      }}>
                        No output location available
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--neutral-500)',
                  fontSize: '16px'
                }}>
                  No output location available for preview
                </div>
              )}
            </div>
          ) : activeTab === 'log' ? (
            /* Log Preview Tab Content */
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {task.logPath ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
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
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4" />
                      <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                    </svg>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'var(--neutral-800)'
                    }}>
                      Log Preview
                    </h3>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '16px',
                    overflow: 'auto',
                    background: '#f8f9fa'
                  }}>
                    {logPreview.loading ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        color: 'var(--neutral-500)'
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid var(--neutral-300)',
                          borderTop: '2px solid var(--primary-600)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginRight: '12px'
                        }} />
                        Loading log preview...
                      </div>
                    ) : logPreview.error ? (
                      <div style={{
                        padding: '20px',
                        background: logPreview.permanentError ? '#fef3cd' : '#fef2f2',
                        border: `1px solid ${logPreview.permanentError ? '#fde68a' : '#fecaca'}`,
                        borderRadius: '6px',
                        color: logPreview.permanentError ? '#92400e' : '#b91c1c'
                      }}>
                        {logPreview.permanentError ? 'File not found' : `Error loading log preview: ${logPreview.error}`}
                      </div>
                    ) : logPreview.data ? (
                      <div style={{
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {logPreview.data.preview?.join('\n') || 'No preview data available'}
                      </div>
                    ) : (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: 'var(--neutral-500)'
                      }}>
                        No log path available
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--neutral-500)',
                  fontSize: '16px'
                }}>
                  No log path available for preview
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--neutral-200)',
          background: 'var(--neutral-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: 'var(--neutral-500)'
          }}>
            Press <kbd style={{
              background: 'var(--neutral-100)',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '11px',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
            }}>Esc</kbd> to close
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: 'var(--primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--primary-700)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--primary-600)';
            }}
          >
            Close
          </button>
        </div>
      </div>
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TaskDetailsModal;
