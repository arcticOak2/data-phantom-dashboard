import React, { useState, useMemo, useEffect } from 'react';

const RunHistory = ({ runHistory, loading, playground, limit, onLimitChange }) => {
  const [selectedRun, setSelectedRun] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  const toggleTaskExpansion = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return '#10b981';
      case 'FAILED':
        return '#ef4444';
      case 'RUNNING':
        return '#3b82f6';
      case 'PENDING':
        return '#eab308';
      case 'CANCELLED':
        return '#f97316';
      case 'IDLE':
        return '#8b5cf6';
      case 'PARTIAL_SUCCESS':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A';
    const date = new Date(dateTime);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Process run history data for visualization
  const processedData = useMemo(() => {
    if (!runHistory || runHistory.length === 0) return { runs: [], tasks: [], maxDuration: 0 };

    // Backend already returns runs sorted by start time (newest first), so no need to sort again
    const sortedRuns = [...runHistory];

    // First, collect all unique tasks from ALL runs
    const allTasks = new Map();
    
    const collectTasks = (tasks) => {
      tasks.forEach(task => {
        if (!allTasks.has(task.child_id)) {
          allTasks.set(task.child_id, {
            id: task.child_id,
            name: task.child_name,
            parentId: task.parent_id,
            children: []
          });
        }
        if (task.children && task.children.length > 0) {
          collectTasks(task.children);
        }
      });
    };

    // Collect all tasks from all runs
    sortedRuns.forEach((run) => {
      if (run.tasks && run.tasks.length > 0) {
        collectTasks(run.tasks);
      }
    });

    // Now build the task hierarchy and assign levels
    const taskMap = new Map();
    const rootTasks = [];

    // Initialize all tasks with status arrays
    allTasks.forEach((task, taskId) => {
      taskMap.set(taskId, {
        ...task,
        level: 0, // Will be calculated later
        statuses: new Array(sortedRuns.length).fill(null)
      });
    });

    // Calculate levels and build hierarchy
    const calculateLevels = (taskId, level = 0) => {
      const task = taskMap.get(taskId);
      if (task) {
        task.level = level;
        
        // Find children
        const children = Array.from(allTasks.values()).filter(t => t.parentId === taskId);
        task.children = children.map(child => child.id);
        
        // Recursively calculate levels for children
        children.forEach(child => {
          calculateLevels(child.id, level + 1);
        });
      }
    };

    // Find root tasks (tasks with no parent)
    const rootTaskIds = Array.from(allTasks.values())
      .filter(task => !task.parentId)
      .map(task => task.id);

    // Calculate levels starting from root tasks
    rootTaskIds.forEach(rootTaskId => {
      rootTasks.push(rootTaskId);
      calculateLevels(rootTaskId, 0);
    });

    // Initialize all parent tasks as expanded by default
    const allParentTasks = Array.from(taskMap.values()).filter(task => task.children.length > 0);
    const defaultExpanded = new Set(allParentTasks.map(task => task.id));

    // Now populate statuses for each run
    sortedRuns.forEach((run, runIndex) => {
      if (run.tasks && run.tasks.length > 0) {
        const updateTaskStatus = (tasks) => {
          tasks.forEach(task => {
            const taskData = taskMap.get(task.child_id);
            if (taskData) {
              taskData.statuses[runIndex] = task.task_status;
            }
            if (task.children && task.children.length > 0) {
              updateTaskStatus(task.children);
            }
          });
        };
        updateTaskStatus(run.tasks);
      }
    });

    // Calculate max duration for chart scaling
    const maxDuration = Math.max(...sortedRuns.map(run => {
      if (!run.playground_started_at || !run.playground_ended_at) return 0;
      return new Date(run.playground_ended_at) - new Date(run.playground_started_at);
    }));

    return {
      runs: sortedRuns,
      tasks: Array.from(taskMap.values()),
      rootTasks,
      maxDuration,
      defaultExpanded
    };
  }, [runHistory]);

  // Initialize expanded state when data changes
  useEffect(() => {
    if (processedData.defaultExpanded) {
      setExpandedTasks(processedData.defaultExpanded);
    }
  }, [processedData.defaultExpanded]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const limitDropdown = document.getElementById('limit-dropdown');
      const limitTrigger = event.target.closest('[data-dropdown-trigger]');
      
      if (limitDropdown && !limitTrigger && !limitDropdown.contains(event.target)) {
        limitDropdown.style.display = 'none';
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const UnifiedRunHistory = () => {
    const { runs, tasks, rootTasks, maxDuration } = processedData;
    
    if (runs.length === 0) return null;

    const maxDurationSeconds = Math.ceil(maxDuration / 1000);
    const chartHeight = 80;
    const barWidth = 16;
    const barSpacing = 2;

    // Flatten all tasks into a single list, maintaining hierarchy order with expand/collapse
    const flattenedTasks = [];
    const addTasksRecursively = (taskIds, level = 0) => {
      taskIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          flattenedTasks.push({ ...task, level });
          
          // Only add children if parent is expanded
          if (task.children.length > 0 && expandedTasks.has(taskId)) {
            addTasksRecursively(task.children, level + 1);
          }
        }
      });
    };

    // Start with root tasks
    addTasksRecursively(rootTasks);

    const renderTaskRow = (task, isLast = false) => {
      return (
        <div key={task.id}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            marginLeft: `${task.level * 20}px`,
            background: selectedRun === runs[0]?.run_id ? 'var(--primary-50)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.2s ease'
          }}>
            {/* Task name */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              minWidth: '200px'
            }}>
              {/* Expand/Collapse button for parent tasks */}
              {task.children.length > 0 ? (
                <button
                  onClick={() => toggleTaskExpansion(task.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--neutral-100)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                  }}
                >
                  {expandedTasks.has(task.id) ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6,9 12,15 18,9" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  )}
                </button>
              ) : (
                <div style={{ width: '16px', height: '16px' }} />
              )}
              
              <span style={{ 
                fontWeight: task.level === 0 ? '600' : '500',
                color: 'var(--neutral-900)',
                fontSize: '13px'
              }}>
                {task.name}
              </span>
            </div>

            {/* Status grid */}
            <div style={{ 
              display: 'flex', 
              gap: '2px',
              alignItems: 'center'
            }}>
              {task.statuses.map((status, runIndex) => (
                <div
                  key={runIndex}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '2px',
                    background: status ? getStatusColor(status) : 'var(--neutral-200)',
                    border: '1px solid var(--neutral-300)',
                    cursor: 'default',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    opacity: status ? 1 : 0.5
                  }}
                  onMouseEnter={(e) => {
                    if (status) {
                      e.target.style.opacity = '0.8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (status) {
                      e.target.style.opacity = '1';
                    }
                  }}
                  title={status ? status : 'Task did not exist in this run'}
                >
                  {/* Status indicator */}
                  {status ? (
                    <div 
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'white',
                        opacity: 0.8
                      }}
                      title={status}
                    />
                  ) : (
                    <div 
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--neutral-400)',
                        opacity: 0.6
                      }}
                      title="Task did not exist in this run"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Horizontal line after each task (except the last one) */}
          {!isLast && (
            <div style={{
              height: '1px',
              background: 'var(--neutral-200)',
              marginLeft: `${task.level * 20 + 12}px`,
              marginRight: '12px',
              marginTop: '2px',
              marginBottom: '2px'
            }} />
          )}
        </div>
      );
    };

    return (
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--neutral-200)',
        overflow: 'hidden'
      }}>
        {/* Duration Chart Header */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--neutral-200)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--neutral-900)' }}>
              Duration
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
              {runs.length} run{runs.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Duration Chart */}
          <div style={{ 
            position: 'relative',
            height: `${chartHeight}px`,
            background: 'var(--neutral-50)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--neutral-200)',
            padding: '12px',
            overflow: 'hidden'
          }}>
            {/* Y-axis labels */}
            <div style={{
              position: 'absolute',
              left: '0',
              top: '0',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: 'var(--neutral-500)',
              width: '40px'
            }}>
              <span>{Math.floor(maxDurationSeconds / 60)}m {maxDurationSeconds % 60}s</span>
              <span>{Math.floor(maxDurationSeconds / 120)}m {Math.floor((maxDurationSeconds % 120) / 2)}s</span>
              <span>00:00:00</span>
            </div>

            {/* Chart area - positioned to align with status grid */}
            <div style={{
              marginLeft: '50px',
              height: '100%',
              display: 'flex',
              alignItems: 'end',
              gap: `${barSpacing}px`,
              justifyContent: 'flex-end',
              paddingRight: '0px', // Align to the right edge
              position: 'relative'
            }}>
              {runs.map((run, index) => {
                const duration = run.playground_started_at && run.playground_ended_at 
                  ? (new Date(run.playground_ended_at) - new Date(run.playground_started_at)) / 1000
                  : 0;
                const height = maxDurationSeconds > 0 ? (duration / maxDurationSeconds) * (chartHeight - 24) : 0;
                
                return (
                  <div
                    key={run.run_id}
                    style={{
                      width: `${barWidth}px`,
                      height: `${height}px`,
                      background: '#10b981',
                      borderRadius: '2px 2px 0 0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      minHeight: '4px'
                    }}
                    onClick={() => setSelectedRun(selectedRun === run.run_id ? null : run.run_id)}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#059669';
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#10b981';
                      e.target.style.transform = 'scale(1)';
                    }}
                    title={`Run ${runs.length - index}\nDuration: ${formatDuration(run.playground_started_at, run.playground_ended_at)}\nStarted: ${formatDateTime(run.playground_started_at)}`}
                  >
                    {/* Success indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '0',
                      height: '0',
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: '6px solid #10b981'
                    }} />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div style={{
              marginLeft: '50px',
              marginTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: 'var(--neutral-500)'
            }}>
              <span>{formatDateTime(runs[runs.length - 1]?.playground_started_at)}</span>
              <span>{formatDateTime(runs[0]?.playground_started_at)}</span>
            </div>
          </div>
        </div>

        {/* Task Status Grid */}
        <div style={{
          padding: '16px 20px'
        }}>
          {/* Task Grid Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            background: 'var(--neutral-50)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--neutral-200)',
            marginBottom: '8px'
          }}>
            <div style={{ 
              flex: 1, 
              minWidth: '200px',
              fontWeight: '600',
              fontSize: '12px',
              color: 'var(--neutral-700)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Task Name
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '2px',
              alignItems: 'center'
            }}>
              {runs.slice().reverse().map((run, index) => (
                <div
                  key={run.run_id}
                  style={{
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: 'var(--neutral-600)',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelectedRun(run.run_id)}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--neutral-200)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                  title={`Run ${runs.length - index}\n${formatDateTime(run.playground_started_at)}`}
                >
                  {runs.length - index}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {flattenedTasks.map((task, index) => renderTaskRow(task, index === flattenedTasks.length - 1))}
          </div>
        </div>
      </div>
    );
  };

  const DurationChart = () => {
    const { runs, maxDuration } = processedData;
    
    if (runs.length === 0) return null;

    const maxDurationSeconds = Math.ceil(maxDuration / 1000);
    const chartHeight = 80;
    const barWidth = 16; // Match the status grid square width
    const barSpacing = 2; // Match the status grid gap

    return (
      <div style={{ 
        background: 'white', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--neutral-200)',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--neutral-900)' }}>
            Duration
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
            {runs.length} run{runs.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div style={{ 
          position: 'relative',
          height: `${chartHeight}px`,
          background: 'var(--neutral-50)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--neutral-200)',
          padding: '12px',
          overflow: 'hidden'
        }}>
          {/* Y-axis labels */}
          <div style={{
            position: 'absolute',
            left: '0',
            top: '0',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: 'var(--neutral-500)',
            width: '40px'
          }}>
            <span>{Math.floor(maxDurationSeconds / 60)}m {maxDurationSeconds % 60}s</span>
            <span>{Math.floor(maxDurationSeconds / 120)}m {Math.floor((maxDurationSeconds % 120) / 2)}s</span>
            <span>00:00:00</span>
          </div>

          {/* Chart area */}
          <div style={{
            marginLeft: '50px',
            marginRight: '200px', // Add right margin to align bars with status grid
            height: '100%',
            display: 'flex',
            alignItems: 'end',
            gap: `${barSpacing}px`,
            justifyContent: 'flex-end'
          }}>
            {runs.map((run, index) => {
              const duration = run.playground_started_at && run.playground_ended_at 
                ? (new Date(run.playground_ended_at) - new Date(run.playground_started_at)) / 1000
                : 0;
              const height = maxDurationSeconds > 0 ? (duration / maxDurationSeconds) * (chartHeight - 24) : 0;
              
              return (
                <div
                  key={run.run_id}
                  style={{
                    width: `${barWidth}px`,
                    height: `${height}px`,
                    background: '#10b981',
                    borderRadius: '2px 2px 0 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    minHeight: '4px'
                  }}
                  onClick={() => setSelectedRun(selectedRun === run.run_id ? null : run.run_id)}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#059669';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#10b981';
                    e.target.style.transform = 'scale(1)';
                  }}
                  title={`Run ${runs.length - index}\nDuration: ${formatDuration(run.playground_started_at, run.playground_ended_at)}\nStarted: ${formatDateTime(run.playground_started_at)}`}
                >
                  {/* Success indicator */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0',
                    height: '0',
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '6px solid #10b981'
                  }} />
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div style={{
            marginLeft: '50px',
            marginTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: 'var(--neutral-500)'
          }}>
            <span>{formatDateTime(runs[runs.length - 1]?.playground_started_at)}</span>
            <span>{formatDateTime(runs[0]?.playground_started_at)}</span>
          </div>
        </div>
      </div>
    );
  };

  const TaskStatusGrid = () => {
    const { runs, tasks, rootTasks } = processedData;
    
    if (runs.length === 0) return null;

    // Flatten all tasks into a single list, maintaining hierarchy order with expand/collapse
    const flattenedTasks = [];
    const addTasksRecursively = (taskIds, level = 0) => {
      taskIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          flattenedTasks.push({ ...task, level });
          
          // Only add children if parent is expanded
          if (task.children.length > 0 && expandedTasks.has(taskId)) {
            addTasksRecursively(task.children, level + 1);
          }
        }
      });
    };

    // Start with root tasks
    addTasksRecursively(rootTasks);

    const renderTaskRow = (task, isLast = false) => {
      return (
        <div key={task.id}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            marginLeft: `${task.level * 20}px`,
            background: selectedRun === runs[0]?.run_id ? 'var(--primary-50)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.2s ease'
          }}>
            {/* Task name */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              minWidth: '200px'
            }}>
              {/* Expand/Collapse button for parent tasks */}
              {task.children.length > 0 ? (
                <button
                  onClick={() => toggleTaskExpansion(task.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--neutral-100)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                  }}
                >
                  {expandedTasks.has(task.id) ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6,9 12,15 18,9" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  )}
                </button>
              ) : (
                <div style={{ width: '16px', height: '16px' }} />
              )}
              
              <span style={{ 
                fontWeight: task.level === 0 ? '600' : '500',
                color: 'var(--neutral-900)',
                fontSize: '13px'
              }}>
                {task.name}
              </span>
            </div>

            {/* Status grid */}
            <div style={{ 
              display: 'flex', 
              gap: '2px',
              alignItems: 'center'
            }}>
              {task.statuses.map((status, runIndex) => (
                <div
                  key={runIndex}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '2px',
                    background: status ? getStatusColor(status) : 'var(--neutral-200)',
                    border: '1px solid var(--neutral-300)',
                    cursor: 'default',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    opacity: status ? 1 : 0.5
                  }}
                  onMouseEnter={(e) => {
                    if (status) {
                      e.target.style.opacity = '0.8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (status) {
                      e.target.style.opacity = '1';
                    }
                  }}
                  title={status ? status : 'Task did not exist in this run'}
                >
                  {/* Status indicator */}
                  {status ? (
                    <div 
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'white',
                        opacity: 0.8
                      }}
                      title={status}
                    />
                  ) : (
                    <div 
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--neutral-400)',
                        opacity: 0.6
                      }}
                      title="Task did not exist in this run"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Horizontal line after each task (except the last one) */}
          {!isLast && (
            <div style={{
              height: '1px',
              background: 'var(--neutral-200)',
              marginLeft: `${task.level * 20 + 12}px`,
              marginRight: '12px',
              marginTop: '2px',
              marginBottom: '2px'
            }} />
          )}
        </div>
      );
    };

    return (
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--neutral-900)' }}>
            Task Execution History
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
            {runs.length} run{runs.length !== 1 ? 's' : ''} • {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--neutral-200)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            background: 'var(--neutral-50)',
            borderBottom: '1px solid var(--neutral-200)'
          }}>
            <div style={{ 
              flex: 1, 
              minWidth: '200px',
              fontWeight: '600',
              fontSize: '12px',
              color: 'var(--neutral-700)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Task Name
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '2px',
              alignItems: 'center'
            }}>
              {runs.slice().reverse().map((run, index) => (
                <div
                  key={run.run_id}
                  style={{
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: 'var(--neutral-600)',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelectedRun(run.run_id)}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--neutral-200)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                  title={`Run ${runs.length - index}\n${formatDateTime(run.playground_started_at)}`}
                >
                  {runs.length - index}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {flattenedTasks.map((task, index) => renderTaskRow(task, index === flattenedTasks.length - 1))}
          </div>
        </div>
      </div>
    );
  };

  const RunDetailsPanel = () => {
    if (!selectedRun) return null;

    const run = processedData.runs.find(r => r.run_id === selectedRun);
    if (!run) return null;

    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        maxHeight: '80vh',
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--neutral-200)',
        boxShadow: 'var(--shadow-xl)',
        zIndex: 1000,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--neutral-200)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--neutral-900)' }}>
            Run Details
          </h3>
          <button
            onClick={() => setSelectedRun(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--neutral-500)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--neutral-200)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-500)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                Run ID
              </div>
              <div style={{ fontSize: '13px', color: 'var(--neutral-900)', fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace" }}>
                {run.run_id.substring(0, 8)}...
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-500)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                Started At
              </div>
              <div style={{ fontSize: '13px', color: 'var(--neutral-900)', fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace" }}>
                {formatDateTime(run.playground_started_at)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-500)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                Ended At
              </div>
              <div style={{ fontSize: '13px', color: 'var(--neutral-900)', fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace" }}>
                {formatDateTime(run.playground_ended_at)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-500)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                Duration
              </div>
              <div style={{ fontSize: '13px', color: 'var(--neutral-900)', fontWeight: '600' }}>
                {formatDuration(run.playground_started_at, run.playground_ended_at)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-500)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                Task Count
              </div>
              <div style={{ fontSize: '13px', color: 'var(--neutral-900)', fontWeight: '600' }}>
                {run.task_count}
              </div>
            </div>
          </div>

          {/* Task summary */}
          {run.tasks && run.tasks.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--neutral-900)' }}>
                Task Summary
              </h4>
              <div style={{
                background: 'var(--neutral-50)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                border: '1px solid var(--neutral-200)'
              }}>
                {run.tasks.map((task, index) => (
                  <div key={task.child_id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 0',
                    borderBottom: index < run.tasks.length - 1 ? '1px solid var(--neutral-200)' : 'none'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getStatusColor(task.task_status),
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: '12px', color: 'var(--neutral-900)' }}>
                      {task.child_name}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: getStatusColor(task.task_status),
                      color: 'white',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      marginLeft: 'auto'
                    }}>
                      {task.task_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        color: 'var(--neutral-600)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--neutral-200)',
          borderTop: '3px solid var(--primary-600)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }} />
        <p style={{ margin: 0, fontSize: '16px' }}>Loading run history...</p>
      </div>
    );
  }

  if (!runHistory || runHistory.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        color: 'var(--neutral-600)',
        textAlign: 'center'
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '16px', opacity: 0.5 }}>
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
          No Run History
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--neutral-500)' }}>
          This playground hasn't been executed yet. Run the playground to see execution history.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--neutral-200)',
        background: 'var(--neutral-50)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
      }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--neutral-900)' }}>
            Run History
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--neutral-500)' }}>
            {playground?.name} • {runHistory.length} run{runHistory.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Limit Dropdown */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            data-dropdown-trigger
            onClick={() => {
              const dropdown = document.getElementById('limit-dropdown');
              if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
              }
            }}
            style={{
              background: 'var(--neutral-800)',
              color: '#e2e8f0',
              border: '1px solid #4a5568',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--neutral-600)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--neutral-800)';
            }}
            title="Limit options"
          >
            <span>Show {limit} runs</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </button>
          
          {/* Limit Dropdown Menu */}
          <div
            id="limit-dropdown"
            style={{
              display: 'none',
              position: 'absolute',
              top: '100%',
              right: '0',
              background: 'var(--neutral-800)',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
              zIndex: 1000,
              minWidth: '120px',
              marginTop: '4px',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '8px 0',
              borderBottom: '1px solid #4a5568',
              fontSize: '12px',
              fontWeight: '600',
              color: '#a0aec0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              paddingLeft: '12px',
              paddingRight: '12px',
              paddingBottom: '6px'
            }}>
              Show Runs
            </div>
            
            {[5, 10, 25, 50].map((option) => (
              <button
                key={option}
                onClick={() => {
                  // Close dropdown
                  const dropdown = document.getElementById('limit-dropdown');
                  if (dropdown) {
                    dropdown.style.display = 'none';
                  }
                  
                  // Update limit
                  onLimitChange(option);
                }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--neutral-600)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                <span>{option}</span>
                {limit === option && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Duration and Task Grid */}
      <UnifiedRunHistory />

      {/* Run Details Modal */}
      <RunDetailsPanel />

      {/* Overlay for modal */}
      {selectedRun && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
          onClick={() => setSelectedRun(null)}
        />
      )}
    </div>
  );
};

export default RunHistory;