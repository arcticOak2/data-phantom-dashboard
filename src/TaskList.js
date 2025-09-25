import React from 'react';

const TaskList = ({ tasks, onEditTask, onDeleteTask, onTaskClick, onCreateTask, playground, runningStateManager, selectedTasks = {}, onTaskSelection, onSelectAll, onDeselectAll, selectionMode = false }) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  
  // Function to determine if a task is currently running
  const isTaskRunning = (task) => {
    // Check if playground is running and task status is RUNNING
    const isPlaygroundRunning = playground?.currentStatus === 'RUNNING' || 
      (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id));
    
    return isPlaygroundRunning && task.status === 'RUNNING';
  };

  // Build task hierarchy for hierarchical selection
  const taskHierarchy = React.useMemo(() => {
    const taskMap = {};
    const roots = [];

    // First pass: create task map
    safeTasks.forEach(task => {
      taskMap[task.id] = {
        ...task,
        children: []
      };
    });

    // Second pass: build hierarchy
    safeTasks.forEach(task => {
      if (task.parentId && taskMap[task.parentId]) {
        taskMap[task.parentId].children.push(taskMap[task.id]);
      } else {
        roots.push(taskMap[task.id]);
      }
    });

    return { roots, allTasks: taskMap };
  }, [safeTasks]);

  // Handle task selection with hierarchical logic
  const handleTaskSelection = (taskId, isSelected) => {
    if (!onTaskSelection) return;
    
    const task = taskHierarchy.allTasks[taskId];
    if (!task) return;

    // Function to recursively select/deselect task and all children
    const selectTaskAndChildren = (currentTask, selected) => {
      onTaskSelection(currentTask.id, selected);
      currentTask.children.forEach(child => {
        selectTaskAndChildren(child, selected);
      });
    };

    selectTaskAndChildren(task, isSelected);
  };

  // Get count of selected tasks
  const selectedCount = Object.values(selectedTasks).filter(Boolean).length;
  
  // Add CSS for blinking animation and button hover effects
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
      .blinking-button {
        animation: blink 1.5s infinite;
      }
      .action-button {
        transition: all 0.2s ease;
        border: none;
        outline: none;
      }
      .action-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        border: none;
        outline: none;
      }
      .action-button:focus {
        border: none;
        outline: none;
      }
      .action-button:active {
        border: none;
        outline: none;
      }
      .action-button:visited {
        border: none;
        outline: none;
      }
      .edit-button {
        background: var(--primary-50);
        color: var(--primary-700);
        border: 1px solid var(--primary-200);
      }
      .edit-button:hover {
        background: var(--primary-100);
        border: 1px solid var(--primary-200);
      }
      .delete-button {
        background: var(--error-50);
        color: var(--error-700);
        border: 1px solid var(--error-200);
      }
      .delete-button:hover {
        background: var(--error-100);
        border: 1px solid var(--error-200);
      }
      .view-button {
        background: var(--success-50);
        color: var(--success-700);
        border: 1px solid var(--success-200);
      }
      .view-button:hover {
        background: var(--success-100);
        border: 1px solid var(--success-200);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Always render the table structure, even when empty

  const handleEditTask = (task) => {
    if (onEditTask) {
      onEditTask(task);
    }
  };

  const handleDeleteTask = (task) => {
    if (onDeleteTask) {
      onDeleteTask(task);
    }
  };

  const handleTaskClick = (task) => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'SPARK_SQL':
        return (
          <span style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'var(--primary-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px'
          }}>
            S
          </span>
        );
      case 'PY_SPARK':
        return (
          <span style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'var(--primary-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px'
          }}>
            PS
          </span>
        );
      case 'PRESTO':
        return (
          <span style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'var(--primary-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px'
          }}>
            P
          </span>
        );
      case 'HIVE':
        return (
          <span style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'var(--warning-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px'
          }}>
            H
          </span>
        );
      case 'SQL':
        return (
          <span style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'var(--info-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px'
          }}>
            SQL
          </span>
        );
      default:
        return (
          <span style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'var(--neutral-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px'
          }}>
            ?
          </span>
        );
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--neutral-200)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 24px',
        background: 'var(--neutral-50)',
        borderBottom: '1px solid var(--neutral-200)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--neutral-800)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Task List ({safeTasks.length} tasks)
          </h3>
          
          
          {/* Selection Controls */}
          {onTaskSelection && selectionMode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'white',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--neutral-200)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <span style={{
                fontSize: '12px',
                color: 'var(--neutral-600)',
                fontWeight: '500'
              }}>
                Selected: {selectedCount}
              </span>
              
              <div style={{ width: '1px', height: '16px', background: 'var(--neutral-200)' }} />
              
              <button
                onClick={onSelectAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary-600)',
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--primary-50)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                Select All
              </button>
              
              <button
                onClick={onDeselectAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--neutral-600)',
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--neutral-100)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                Deselect All
              </button>
              
            </div>
          )}
        </div>
        
        {/* Create Task Button */}
        {onCreateTask && (
          <button
            onClick={onCreateTask}
            style={{
              background: 'var(--neutral-700)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
            Create Task
          </button>
        )}
      </div>
      
      <div style={{ overflow: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)' }}>
              <th style={{ 
                padding: '16px 24px', 
                textAlign: 'center',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: selectionMode ? '50px' : '40px'
              }}>
                {onTaskSelection && selectionMode ? (
                  <input
                    type="checkbox"
                    checked={selectedCount === safeTasks.length && safeTasks.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectAll();
                      } else {
                        onDeselectAll();
                      }
                    }}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                    title={selectedCount === safeTasks.length ? 'Deselect All' : 'Select All'}
                  />
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--neutral-400)' }}>
                    {selectionMode ? '✓' : '●'}
                  </span>
                )}
              </th>
              <th style={{ 
                padding: '16px 24px', 
                textAlign: 'left',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Task</th>
              <th style={{ 
                padding: '16px 24px', 
                textAlign: 'left',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Type</th>
              <th style={{ 
                padding: '16px 24px', 
                textAlign: 'left',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Last Run Status</th>
              <th style={{ 
                padding: '16px 24px', 
                textAlign: 'left',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Parent</th>
              <th style={{ 
                padding: '16px 24px', 
                textAlign: 'center',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeTasks.length === 0 ? (
              <tr>
                <td colSpan="6" style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: 'var(--neutral-500)',
                  background: 'white'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'var(--neutral-100)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--neutral-400)'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10,9 9,9 8,9" />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{
                        margin: '0 0 8px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'var(--neutral-700)'
                      }}>
                        No Tasks Found
                      </h3>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        color: 'var(--neutral-500)'
                      }}>
                        Create your first task to get started with data processing
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              safeTasks.map((task) => {
                const isSelected = selectedTasks[task.id] || false;
                return (
                <tr 
                  key={task.id} 
                  style={{ 
                    borderBottom: '1px solid var(--neutral-100)',
                    transition: 'all 0.2s ease',
                    background: isSelected ? 'var(--primary-50)' : 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isSelected ? 'var(--primary-100)' : 'var(--neutral-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected ? 'var(--primary-50)' : 'white';
                  }}
                >
                  <td style={{ 
                    padding: '16px 24px',
                    textAlign: 'center',
                    width: selectionMode ? '50px' : '40px'
                  }}>
                    {onTaskSelection && selectionMode ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                        title={isSelected ? 'Deselect task' : 'Select task'}
                      />
                    ) : (
                      /* Running/Idle Status Dot */
                      <div 
                        className={isTaskRunning(task) ? 'blinking-button' : ''}
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: isTaskRunning(task) ? '#22c55e' : '#6b7280',
                          border: `2px solid ${isTaskRunning(task) ? '#16a34a' : '#9ca3af'}`,
                          boxShadow: isTaskRunning(task) 
                            ? '0 0 0 3px rgba(34, 197, 94, 0.2), 0 0 8px rgba(34, 197, 94, 0.3)'
                            : '0 0 0 1px rgba(107, 114, 128, 0.1)',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          zIndex: 1,
                          margin: '0 auto'
                        }}
                        title={isTaskRunning(task) ? 'Currently Running' : 'Idle'}
                      />
                    )}
                  </td>
                <td style={{ 
                  padding: '16px 24px',
                  color: 'var(--neutral-900)',
                  fontWeight: '500'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: 'var(--primary-100)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary-700)'
                    }}>
                      {getTypeIcon(task.type)}
                    </div>
                    <div>
                      <div style={{
                        fontWeight: '600',
                        color: 'var(--neutral-900)',
                        marginBottom: '4px',
                        fontSize: '14px'
                      }}>
                        {task.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ 
                  padding: '16px 24px',
                  color: 'var(--neutral-700)'
                }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    background: 'var(--primary-50)',
                    color: 'var(--primary-700)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {task.type.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ 
                  padding: '16px 24px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {/* Last Run Status Badge */}
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-lg)',
                        background: task.lastRunStatus === 'SUCCESS' ? '#ecfdf5' : 
                                   task.lastRunStatus === 'FAILED' ? '#fef2f2' :
                                   task.lastRunStatus === 'RUNNING' ? '#eff6ff' :
                                   task.lastRunStatus === 'PENDING' ? '#fefce8' :
                                   task.lastRunStatus === 'CANCELLED' ? '#fff7ed' :
                                   task.lastRunStatus === 'IDLE' ? '#faf5ff' :
                                   task.lastRunStatus === 'PARTIAL_SUCCESS' ? '#fffbeb' :
                                   task.lastRunStatus === 'UPSTREAM_FAILED' ? '#fefce8' : '#f8fafc',
                        border: `1px solid ${task.lastRunStatus === 'SUCCESS' ? '#a7f3d0' : 
                                           task.lastRunStatus === 'FAILED' ? '#fecaca' :
                                           task.lastRunStatus === 'RUNNING' ? '#bfdbfe' :
                                           task.lastRunStatus === 'PENDING' ? '#fde68a' :
                                           task.lastRunStatus === 'CANCELLED' ? '#fed7aa' :
                                           task.lastRunStatus === 'IDLE' ? '#e9d5ff' :
                                           task.lastRunStatus === 'PARTIAL_SUCCESS' ? '#fde68a' :
                                           task.lastRunStatus === 'UPSTREAM_FAILED' ? '#fde68a' : '#e2e8f0'}`,
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {/* Last Run Status Icon */}
                      <div style={{
                        width: '14px',
                        height: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: task.lastRunStatus === 'SUCCESS' ? '#059669' : 
                               task.lastRunStatus === 'FAILED' ? '#dc2626' :
                               task.lastRunStatus === 'RUNNING' ? '#2563eb' :
                               task.lastRunStatus === 'PENDING' ? '#ca8a04' :
                               task.lastRunStatus === 'CANCELLED' ? '#ea580c' :
                               task.lastRunStatus === 'IDLE' ? '#7c3aed' :
                               task.lastRunStatus === 'PARTIAL_SUCCESS' ? '#d97706' :
                               task.lastRunStatus === 'UPSTREAM_FAILED' ? '#ca8a04' : '#475569'
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
                        ) : task.lastRunStatus === 'UPSTREAM_FAILED' ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Last Run Status Text */}
                      <span 
                        style={{
                          color: task.lastRunStatus === 'SUCCESS' ? '#047857' : 
                                 task.lastRunStatus === 'FAILED' ? '#b91c1c' :
                                 task.lastRunStatus === 'RUNNING' ? '#1d4ed8' :
                                 task.lastRunStatus === 'PENDING' ? '#a16207' :
                                 task.lastRunStatus === 'CANCELLED' ? '#c2410c' :
                                 task.lastRunStatus === 'IDLE' ? '#6b21a8' :
                                 task.lastRunStatus === 'PARTIAL_SUCCESS' ? '#b45309' :
                                 task.lastRunStatus === 'UPSTREAM_FAILED' ? '#a16207' : '#334155',
                          fontWeight: '600',
                          fontSize: '11px',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase'
                        }}
                      >
                        {task.lastRunStatus || 'UNKNOWN'}
                      </span>
                      
                      {/* Last Run Status Indicator */}
                      <div 
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: task.lastRunStatus === 'SUCCESS' ? '#10b981' : 
                                     task.lastRunStatus === 'FAILED' ? '#ef4444' :
                                     task.lastRunStatus === 'RUNNING' ? '#3b82f6' :
                                     task.lastRunStatus === 'PENDING' ? '#eab308' :
                                     task.lastRunStatus === 'CANCELLED' ? '#f97316' :
                                     task.lastRunStatus === 'IDLE' ? '#8b5cf6' :
                                     task.lastRunStatus === 'PARTIAL_SUCCESS' ? '#f59e0b' :
                                     task.lastRunStatus === 'UPSTREAM_FAILED' ? '#eab308' : '#6b7280',
                          transition: 'all 0.2s ease'
                        }} 
                      />
                    </div>
                  </div>
                </td>
                <td style={{ 
                  padding: '16px 24px',
                  color: 'var(--neutral-600)'
                }}>
                  {(() => {
                    const parentTask = safeTasks.find(t => t.id === task.parentId);
                    return parentTask ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          background: 'var(--neutral-100)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--neutral-600)'
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                          </svg>
                        </div>
                        <span 
                          style={{
                            fontSize: '13px',
                            fontWeight: '500',
                            color: 'var(--blue-600)',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            borderBottom: '1px solid transparent'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(parentTask);
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.color = 'var(--blue-700)';
                            e.target.style.borderBottomColor = 'var(--blue-300)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.color = 'var(--blue-600)';
                            e.target.style.borderBottomColor = 'transparent';
                          }}
                        >
                          {parentTask.name}
                        </span>
                      </div>
                    ) : (
                      <span style={{
                        color: 'var(--neutral-400)',
                        fontSize: '12px',
                        fontStyle: 'italic'
                      }}>
                        None
                      </span>
                    );
                  })()}
                </td>
                <td style={{ 
                  padding: '16px 24px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={() => handleTaskClick(task)}
                      className="action-button view-button"
                      style={{
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px'
                      }}
                      title="View Task Details"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEditTask(task)}
                      className="action-button edit-button"
                      style={{
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px'
                      }}
                      title="Edit Query"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="action-button delete-button"
                      style={{
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px'
                      }}
                      title="Delete Task"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;