import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthProvider';
import { UDFApi } from './utils/apiUtils';
import AlertModal from './AlertModal';

const UDFModal = ({ isOpen, onClose }) => {
  const { user, token } = useContext(AuthContext);
  const [udfs, setUdfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [expandedUdf, setExpandedUdf] = useState(null);

  // Form state for creating new UDF
  const [formData, setFormData] = useState({
    name: '',
    functionName: '',
    jarS3Path: '',
    className: '',
    parameterTypes: '',
    returnType: '',
    description: ''
  });

  // Fetch UDFs when modal opens
  useEffect(() => {
    if (isOpen && user && token) {
      fetchUDFs();
    }
  }, [isOpen, user, token]);

  const fetchUDFs = async () => {
    if (!user || !token) return;
    
    setLoading(true);
    try {
      const response = await UDFApi.getUDFsByUserId(user.userId);
      
      if (response.success && response.udfs) {
        setUdfs(response.udfs);
      } else {
        setUdfs([]);
      }
    } catch (error) {
      console.error('Failed to fetch UDFs:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Failed to fetch UDFs: ${error.message}`,
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUDF = async () => {
    if (isOperationInProgress) return;

    // Validate form data
    if (!formData.name.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'UDF name is required',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    if (!formData.functionName.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Function name is required',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    if (!formData.jarS3Path.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'JAR S3 path is required',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    if (!formData.className.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Class name is required',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    if (!token) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No authentication token found. Please log in again.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    if (!user || !user.userId) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'User information not found. Please log in again.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    try {
      setIsOperationInProgress(true);
      
          const udfData = {
            userId: user.userId,
            name: formData.name.trim(),
            functionName: formData.functionName.trim(),
            jarS3Path: formData.jarS3Path.trim(),
            className: formData.className.trim(),
            parameterTypes: formData.parameterTypes.trim(),
            returnType: formData.returnType.trim(),
            description: formData.description.trim()
          };

      const response = await UDFApi.createUDF(udfData);
      
      if (response.success) {
        // Clear form and close create form
        setFormData({
          name: '',
          functionName: '',
          jarS3Path: '',
          className: '',
          parameterTypes: '',
          returnType: '',
          description: ''
        });
        setShowCreateForm(false);
        
        // Refresh UDFs list
        await fetchUDFs();
        
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: 'UDF created successfully!',
          type: 'success',
          showCancel: false,
          onConfirm: null
        });
      } else {
        throw new Error(response.error || 'Failed to create UDF');
      }
    } catch (error) {
      console.error('Error creating UDF:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Failed to create UDF: ${error.message}`,
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    } finally {
      setIsOperationInProgress(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeleteUDF = async (udfId, udfName) => {
    if (isOperationInProgress) return;

    // Show confirmation dialog
    setAlertModal({
      isOpen: true,
      title: 'Delete UDF',
      message: `Are you sure you want to delete "${udfName}"? This action cannot be undone.`,
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          setIsOperationInProgress(true);
          const response = await UDFApi.deleteUDF(udfId);
          
          if (response.success) {
            // Remove from local state
            setUdfs(prevUdfs => prevUdfs.filter(udf => udf.id !== udfId));
            setExpandedUdf(null); // Close any expanded UDF
            
            setAlertModal({
              isOpen: true,
              title: 'Success',
              message: 'UDF deleted successfully!',
              type: 'success',
              showCancel: false,
              onConfirm: null
            });
          } else {
            throw new Error(response.error || 'Failed to delete UDF');
          }
        } catch (error) {
          console.error('Error deleting UDF:', error);
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: `Failed to delete UDF: ${error.message}`,
            type: 'error',
            showCancel: false,
            onConfirm: null
          });
        } finally {
          setIsOperationInProgress(false);
        }
      }
    });
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setExpandedUdf(null);
    setFormData({
      name: '',
      functionName: '',
      jarS3Path: '',
      className: '',
      parameterTypes: '',
      returnType: '',
      description: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--neutral-200)'
        }}>
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
              UDF Management
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: 'var(--neutral-600)'
            }}>
              Manage your User Defined Functions
            </p>
          </div>
          <button
            onClick={handleClose}
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
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Action Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '14px',
              color: 'var(--neutral-600)'
            }}>
              {loading ? 'Loading UDFs...' : `${udfs.length} UDF${udfs.length !== 1 ? 's' : ''} registered`}
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
                style={{
                  background: 'var(--primary-600)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--primary-700)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--primary-600)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create UDF
              </button>
            </div>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div style={{
              background: 'var(--neutral-50)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid var(--neutral-200)'
            }}>
              <h3 style={{
                color: 'var(--neutral-900)',
                margin: '0 0 16px 0',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Create New UDF
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    color: 'var(--neutral-700)',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    UDF Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="String Uppercase"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid var(--neutral-300)',
                      borderRadius: '8px',
                      color: 'var(--neutral-900)',
                      fontSize: '14px',
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--neutral-300)'}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    color: 'var(--neutral-700)',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    Function Name *
                  </label>
                  <input
                    type="text"
                    value={formData.functionName}
                    onChange={(e) => handleInputChange('functionName', e.target.value)}
                    placeholder="toUpperCase"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid var(--neutral-300)',
                      borderRadius: '8px',
                      color: 'var(--neutral-900)',
                      fontSize: '14px',
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--neutral-300)'}
                  />
                </div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    color: 'var(--neutral-700)',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    JAR S3 Path *
                  </label>
                  <input
                    type="text"
                    value={formData.jarS3Path}
                    onChange={(e) => handleInputChange('jarS3Path', e.target.value)}
                    placeholder="s3://bucket/udfs/string-utils.jar"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid var(--neutral-300)',
                      borderRadius: '8px',
                      color: 'var(--neutral-900)',
                      fontSize: '14px',
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--neutral-300)'}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    color: 'var(--neutral-700)',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    Class Name *
                  </label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={(e) => handleInputChange('className', e.target.value)}
                    placeholder="com.annihilator.dataphantom.udfs.StringUtils"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid var(--neutral-300)',
                      borderRadius: '8px',
                      color: 'var(--neutral-900)',
                      fontSize: '14px',
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--neutral-300)'}
                  />
                </div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    color: 'var(--neutral-700)',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    Parameter Types
                  </label>
                  <input
                    type="text"
                    value={formData.parameterTypes}
                    onChange={(e) => handleInputChange('parameterTypes', e.target.value)}
                    placeholder="varchar"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid var(--neutral-300)',
                      borderRadius: '8px',
                      color: 'var(--neutral-900)',
                      fontSize: '14px',
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--neutral-300)'}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    color: 'var(--neutral-700)',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    Return Type
                  </label>
                  <input
                    type="text"
                    value={formData.returnType}
                    onChange={(e) => handleInputChange('returnType', e.target.value)}
                    placeholder="varchar"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid var(--neutral-300)',
                      borderRadius: '8px',
                      color: 'var(--neutral-900)',
                      fontSize: '14px',
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--neutral-300)'}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--neutral-700)',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Converts string to uppercase"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'white',
                    border: '1px solid var(--neutral-300)',
                    borderRadius: '8px',
                    color: 'var(--neutral-900)',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    minHeight: '80px',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--neutral-300)'}
                />
              </div>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid var(--neutral-300)',
                    borderRadius: '8px',
                    background: 'white',
                    color: 'var(--neutral-700)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--neutral-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUDF}
                  disabled={isOperationInProgress || !formData.name.trim() || !formData.functionName.trim() || !formData.jarS3Path.trim() || !formData.className.trim()}
                  style={{
                    padding: '10px 20px',
                    background: (!formData.name.trim() || !formData.functionName.trim() || !formData.jarS3Path.trim() || !formData.className.trim()) 
                      ? 'var(--neutral-300)' 
                      : 'var(--primary-600)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: (!formData.name.trim() || !formData.functionName.trim() || !formData.jarS3Path.trim() || !formData.className.trim()) 
                      ? 'not-allowed' 
                      : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isOperationInProgress ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled && formData.name.trim() && formData.functionName.trim() && formData.jarS3Path.trim() && formData.className.trim()) {
                      e.target.style.background = 'var(--primary-700)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled && formData.name.trim() && formData.functionName.trim() && formData.jarS3Path.trim() && formData.className.trim()) {
                      e.target.style.background = 'var(--primary-600)';
                    }
                  }}
                >
                  {isOperationInProgress ? 'Creating...' : 'Create UDF'}
                </button>
              </div>
            </div>
          )}

          {/* UDFs List */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--neutral-50)',
            borderRadius: '8px',
            border: '1px solid var(--neutral-200)'
          }}>
            {loading ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--neutral-600)'
              }}>
                Loading UDFs...
              </div>
            ) : udfs.length === 0 ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--neutral-600)'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'var(--neutral-100)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                    <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                    <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                  </svg>
                </div>
                <p style={{ fontSize: '14px', margin: '0 0 8px 0', fontWeight: '600', color: 'var(--neutral-900)' }}>No UDFs registered</p>
                <p style={{ fontSize: '12px', margin: 0, color: 'var(--neutral-500)' }}>Create your first UDF to get started</p>
              </div>
            ) : (
              <div style={{ padding: '0' }}>
                {udfs.map((udf, index) => {
                  const isExpanded = expandedUdf === (udf.id || index);
                  return (
                    <div
                      key={udf.id || index}
                      style={{
                        background: 'white',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        border: '1px solid var(--neutral-200)',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Collapsed view - clickable header */}
                      <div
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => setExpandedUdf(isExpanded ? null : (udf.id || index))}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--neutral-50)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'white';
                        }}
                      >
                        {/* Icon */}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M9 12l2 2 4-4" />
                            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                            <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                            <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                          </svg>
                        </div>
                        
                        {/* UDF Name */}
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            color: 'var(--neutral-900)',
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: '600'
                          }}>
                            {udf.name}
                          </h4>
                        </div>
                        
                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent expanding when clicking delete
                            handleDeleteUDF(udf.id || index, udf.name);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--neutral-400)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            marginRight: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'var(--red-50)';
                            e.target.style.color = 'var(--red-500)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = 'var(--neutral-400)';
                          }}
                          title="Delete UDF"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                        
                        {/* Expand/Collapse Icon */}
                        <div style={{
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--neutral-500)',
                          transition: 'transform 0.2s ease',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6,9 12,15 18,9"></polyline>
                          </svg>
                        </div>
                      </div>
                      
                      {/* Expanded view - details */}
                      {isExpanded && (
                        <div style={{
                          padding: '0 16px 16px 16px',
                          borderTop: '1px solid var(--neutral-100)',
                          background: 'var(--neutral-25)'
                        }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            marginTop: '12px'
                          }}>
                            <div style={{
                              background: 'white',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--neutral-100)'
                            }}>
                              <div style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                color: 'var(--neutral-500)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '4px'
                              }}>
                                Function Name
                              </div>
                              <div style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--neutral-900)',
                                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                              }}>
                                {udf.functionName}
                              </div>
                            </div>
                            
                            <div style={{
                              background: 'white',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--neutral-100)'
                            }}>
                              <div style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                color: 'var(--neutral-500)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '4px'
                              }}>
                                Class Name
                              </div>
                              <div style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--neutral-900)',
                                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                              }}>
                                {udf.className}
                              </div>
                            </div>
                          </div>
                          
                            <div style={{
                              background: 'white',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--neutral-100)',
                              marginTop: '8px'
                            }}>
                              <div style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                color: 'var(--neutral-500)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '4px'
                              }}>
                                JAR S3 Path
                              </div>
                              <div style={{
                                fontSize: '11px',
                                fontWeight: '500',
                                color: 'var(--neutral-700)',
                                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                wordBreak: 'break-all',
                                lineHeight: '1.4'
                              }}>
                                {udf.jarS3Path}
                              </div>
                            </div>
                            
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '8px',
                              marginTop: '8px'
                            }}>
                              <div style={{
                                background: 'white',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--neutral-100)'
                              }}>
                                <div style={{
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  color: 'var(--neutral-500)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  marginBottom: '4px'
                                }}>
                                  Parameter Types
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  color: 'var(--neutral-700)',
                                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                                }}>
                                  {udf.parameterTypes || 'N/A'}
                                </div>
                              </div>
                              
                              <div style={{
                                background: 'white',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--neutral-100)'
                              }}>
                                <div style={{
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  color: 'var(--neutral-500)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  marginBottom: '4px'
                                }}>
                                  Return Type
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  color: 'var(--neutral-700)',
                                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                                }}>
                                  {udf.returnType || 'N/A'}
                                </div>
                              </div>
                            </div>
                          
                          {udf.description && (
                            <div style={{
                              background: 'linear-gradient(135deg, var(--primary-50), var(--primary-100))',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--primary-200)',
                              marginTop: '8px'
                            }}>
                              <div style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                color: 'var(--primary-600)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '4px'
                              }}>
                                Description
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: 'var(--primary-800)',
                                lineHeight: '1.4'
                              }}>
                                {udf.description}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        showCancel={alertModal.showCancel}
        onConfirm={alertModal.onConfirm}
      />
    </>
  );
};

export default UDFModal;
