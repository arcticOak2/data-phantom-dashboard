import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthProvider';
import TaskGraph from './TaskGraph';
import TaskList from './TaskList';
import RunHistory from './RunHistory';
import Reconciliation from './Reconciliation';
import EditQueryModal from './EditQueryModal';
import TaskDetailsModal from './TaskDetailsModal';
import CreateTaskModal from './CreateTaskModal';
import AlertModal from './AlertModal';

const TaskManager = ({ playground, tasks, setTasks, loading, setLoading, runningStateManager, autoRefreshState }) => {
  const { token } = useContext(AuthContext);
  const [viewMode, setViewMode] = useState('list'); // Default to list view
  const [runHistory, setRunHistory] = useState([]);
  const [runHistoryLoading, setRunHistoryLoading] = useState(false);
  const [runHistoryLimit, setRunHistoryLimit] = useState(10);
  const [executionSummary, setExecutionSummary] = useState(null);
  const [executionSummaryLoading, setExecutionSummaryLoading] = useState(false);
  const [editModal, setEditModal] = useState({ isOpen: false, task: null });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, task: null });
  const [createModal, setCreateModal] = useState({ isOpen: false });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });
  const [selectedTasks, setSelectedTasks] = useState({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [isRunningAllTasks, setIsRunningAllTasks] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Reset view mode to 'list' when playground changes
  useEffect(() => {
    setViewMode('list');
    setSelectedTasks({}); // Clear selected tasks when playground changes
    setSelectionMode(false); // Exit selection mode when playground changes
  }, [playground?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const refreshDropdown = document.getElementById('refresh-dropdown');
      
      if (refreshDropdown && !refreshDropdown.contains(event.target) && !event.target.closest('[data-dropdown-trigger]')) {
        refreshDropdown.style.display = 'none';
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCreateTask = async (taskData) => {
    try {
      // Check if playground exists and has an ID
      if (!playground || !playground.id) {
        console.error('Cannot create task: No playground selected or playground ID is missing');
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: 'No playground selected. Please select a playground first.',
          type: 'error',
          showCancel: false,
          onConfirm: null
        });
        return;
      }


      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: taskData.name,
          playgroundId: playground.id,
          type: taskData.type,
          query: taskData.query,
          parentId: taskData.parentId || null,
          udfIds: taskData.udfIds ? taskData.udfIds.join(',') : null
        })
      });

      if (response.ok) {
        const newTask = await response.json();
        setCreateModal({ isOpen: false });
        
        // Refetch all tasks to ensure we have the complete data
        await fetchTasks();
      } else {
        const errorData = await response.json();
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: `Failed to create task: ${response.status}: ${errorData.message}`,
          type: 'error',
          showCancel: false,
          onConfirm: null
        });
      }
    } catch (error) {
      console.error('Error creating task:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to create task. Please try again.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    }
  };

  const handleRunAllTasks = async () => {
    if (!playground || !tasks || tasks.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'No Tasks',
        message: 'No tasks available to run in this playground.',
        type: 'info',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    // Show confirmation dialog before executing
    setAlertModal({
      isOpen: true,
      title: 'Confirm Task Execution',
      message: `Are you sure you want to run all ${tasks.length} tasks in "${playground.name}"? This will execute all tasks immediately.`,
      type: 'warning',
      showCancel: true,
      onConfirm: executeRunAllTasks
    });
  };

  // Handle toggle selection mode
  const handleToggleSelectionMode = () => {
    setSelectionMode(prev => {
      if (prev) {
        // Exiting selection mode - clear all selections
        setSelectedTasks({});
      }
      return !prev;
    });
  };

  // Handle individual task selection
  const handleTaskSelection = (taskId, isSelected) => {
    setSelectedTasks(prev => ({
      ...prev,
      [taskId]: isSelected
    }));
  };

  // Handle select all tasks
  const handleSelectAll = () => {
    const allSelected = {};
    tasks.forEach(task => {
      allSelected[task.id] = true;
    });
    setSelectedTasks(allSelected);
  };

  // Handle deselect all tasks
  const handleDeselectAll = () => {
    setSelectedTasks({});
  };

  // Handle running selected tasks
  const handleRunSelected = async () => {
    const selectedCount = Object.values(selectedTasks).filter(Boolean).length;
    
    if (selectedCount === 0) {
      setAlertModal({
        isOpen: true,
        title: 'No Tasks Selected',
        message: 'Please select at least one task to run.',
        type: 'info',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    // Show confirmation dialog
    setAlertModal({
      isOpen: true,
      title: 'Confirm Limited Run',
      message: `Are you sure you want to run ${selectedCount} selected task${selectedCount !== 1 ? 's' : ''} in "${playground.name}"?`,
      type: 'warning',
      showCancel: true,
      onConfirm: executeRunSelectedTasks
    });
  };

  const executeRunSelectedTasks = async () => {
    setIsRunningAllTasks(true);
    
    // Immediately set playground as running for real-time feedback
    if (runningStateManager && playground?.id) {
      runningStateManager.setPlaygroundRunning(playground.id, true);
      // Start playground polling for metadata updates only if auto-refresh is active
      if (runningStateManager.startPolling && autoRefreshState?.isActive) {
        runningStateManager.startPolling();
      }
    }
    
    try {
      // Use the new limited-adhoc-run API endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/limited-adhoc-run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playgroundId: playground.id,
          tasksToRun: selectedTasks
        })
      });

      if (response.ok) {
        const result = await response.text(); // API returns plain text response
        const selectedCount = Object.values(selectedTasks).filter(Boolean).length;
        
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: `Successfully started limited run with ${selectedCount} selected tasks in the playground.`,
          type: 'success',
          showCancel: false,
          onConfirm: null
        });
        
        // Refresh tasks to show updated status
        await fetchTasks();
        
        // Clear selection state and exit selection mode
        setSelectedTasks({});
        setSelectionMode(false);
      } else {
        const errorData = await response.text().catch(() => response.statusText);
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: `Failed to run selected tasks: ${errorData}`,
          type: 'error',
          showCancel: false,
          onConfirm: null
        });
      }
    } catch (error) {
      console.error('Error running selected tasks:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Network error: ${error.message}. Please check your connection and try again.`,
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    } finally {
      setIsRunningAllTasks(false);
      
      // Clear running state after a delay to allow for API status updates
      if (runningStateManager && playground?.id) {
        setTimeout(() => {
          runningStateManager.setPlaygroundRunning(playground.id, false);
          // Stop playground polling after clearing running state
          if (runningStateManager.stopPolling) {
            runningStateManager.stopPolling();
          }
        }, 2000); // 2 second delay to allow API to update status
      }
    }
  };

  const executeRunAllTasks = async () => {
    setIsRunningAllTasks(true);
    
    // Immediately set playground as running for real-time feedback
    if (runningStateManager && playground?.id) {
      runningStateManager.setPlaygroundRunning(playground.id, true);
      // Start playground polling for metadata updates only if auto-refresh is active
      if (runningStateManager.startPolling && autoRefreshState?.isActive) {
        runningStateManager.startPolling();
      }
    }
    
    try {
      // Use the new adhoc-run API endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/adhoc-run/${playground.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.text(); // API returns plain text response
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: `Successfully started running all ${tasks.length} tasks in the playground.`,
          type: 'success',
          showCancel: false,
          onConfirm: null
        });
        
        // Refresh tasks to show updated status
        await fetchTasks();
      } else {
        const errorData = await response.text().catch(() => response.statusText);
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: `Failed to run tasks: ${errorData}`,
          type: 'error',
          showCancel: false,
          onConfirm: null
        });
      }
    } catch (error) {
      console.error('Error running all tasks:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Network error: ${error.message}. Please check your connection and try again.`,
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    } finally {
      setIsRunningAllTasks(false);
      
      // Clear running state after a delay to allow for API status updates
      if (runningStateManager && playground?.id) {
        setTimeout(() => {
          runningStateManager.setPlaygroundRunning(playground.id, false);
          // Stop playground polling after clearing running state
          if (runningStateManager.stopPolling) {
            runningStateManager.stopPolling();
          }
        }, 2000); // 2 second delay to allow API to update status
      }
    }
  };

  const handleCancelPlayground = async () => {
    if (!playground || !playground.id) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No playground selected or playground ID is missing.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    // Check if playground is actually running
    const isRunning = playground?.currentStatus === 'RUNNING' || (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id));
    
    if (!isRunning) {
      setAlertModal({
        isOpen: true,
        title: 'No Active Run',
        message: 'There is no active run to cancel for this playground.',
        type: 'info',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    // Show confirmation dialog
    setAlertModal({
      isOpen: true,
      title: 'Cancel Playground Run',
      message: `Are you sure you want to cancel the current run for playground "${playground.name}"?\n\nThis will stop all running tasks in this playground.`,
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/playground/cancel/${playground.id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const result = await response.text();
            setAlertModal({
              isOpen: true,
              title: 'Success',
              message: 'Playground cancellation requested successfully. The run will be stopped shortly.',
              type: 'success',
              showCancel: false,
              onConfirm: null
            });
            
            // Clear running state immediately
            if (runningStateManager && playground?.id) {
              runningStateManager.setPlaygroundRunning(playground.id, false);
              // Stop playground polling
              if (runningStateManager.stopPolling) {
                runningStateManager.stopPolling();
              }
            }
            
            // Refresh tasks to show updated status
            await fetchTasks();
          } else {
            const errorData = await response.text().catch(() => response.statusText);
            setAlertModal({
              isOpen: true,
              title: 'Error',
              message: `Failed to cancel playground: ${errorData}`,
              type: 'error',
              showCancel: false,
              onConfirm: null
            });
          }
        } catch (error) {
          console.error('Error cancelling playground:', error);
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: `Network error: ${error.message}. Please check your connection and try again.`,
            type: 'error',
            showCancel: false,
            onConfirm: null
          });
        }
      }
    });
  };




  const handleEditTask = (task) => {
    setEditModal({ isOpen: true, task });
  };

  const handleSaveQuery = async (taskId, newQuery, udfIds) => {
    try {
      // Check if playground exists and has an ID
      if (!playground || !playground.id) {
        console.error('Cannot save query: No playground selected or playground ID is missing');
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: 'No playground selected. Please select a playground first.',
          type: 'error',
          showCancel: false,
          onConfirm: null
        });
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/task/query`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: taskId,
          query: newQuery,
          playgroundId: playground.id,
          udfIds: udfIds || null
        })
      });

      if (response.ok) {
        // Refetch all tasks to ensure we have the complete data
        await fetchTasks();
      } else {
        throw new Error('Failed to update query');
      }
    } catch (error) {
      console.error('Error updating query:', error);
      throw error;
    }
  };

  const handleCloseEditModal = () => {
    setEditModal({ isOpen: false, task: null });
  };

  const handleTaskClick = (task) => {

    setDetailsModal({ isOpen: true, task });
  };

  const handleCloseDetailsModal = () => {
    setDetailsModal({ isOpen: false, task: null });
  };

  const handleDeleteTask = (task) => {

    
    // Check if this task has children
    const childTasks = tasks.filter(t => t.parentId === task.id);
    const hasChildren = childTasks.length > 0;
    

    
    let message = `Are you sure you want to delete "${task.name}"?`;
    if (hasChildren) {
      message += `\n\nThis will also delete ${childTasks.length} child task${childTasks.length > 1 ? 's' : ''}:`;
      childTasks.forEach(child => {
        message += `\n• ${child.name}`;
      });
    }
    message += `\n\nThis action cannot be undone.`;
    

    
    setAlertModal({
      isOpen: true,
      title: 'Delete Task',
      message: message,
      type: 'warning',
      showCancel: true,
      onConfirm: () => performDeleteTask(task)
    });
    

  };

  const performDeleteTask = async (task) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/task/${task.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playgroundId: playground.id
        })
      });

      if (response.ok) {
        // Remove the task from local state
        setTasks(prev => prev.filter(t => t.id !== task.id));
        // Show success message
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: `Task "${task.name}" deleted successfully!`,
          type: 'success',
          showCancel: false,
          onConfirm: null
        });
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to delete task. Please try again.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    }
  };

  const fetchRunHistory = useCallback(async (limit = runHistoryLimit) => {
    if (!playground || !playground.id) return;
    
    setRunHistoryLoading(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/playground/${playground.id}/run-history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.runs) {
          setRunHistory(data.data.runs);
        } else {
          console.error('Invalid run history response format:', data);
          setRunHistory([]);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch run history:', errorData);
        setRunHistory([]);
      }
    } catch (error) {
      console.error('Error fetching run history:', error);
      setRunHistory([]);
    } finally {
      setRunHistoryLoading(false);
    }
  }, [playground, token, runHistoryLimit]);

  const fetchExecutionSummary = useCallback(async () => {
    if (!playground || !playground.id) return;
    
    setExecutionSummaryLoading(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/playground/${playground.id}/run-history?limit=1`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.runs && data.data.runs.length > 0) {
          const latestRun = data.data.runs[0];
          
          if (latestRun && latestRun.tasks) {
            const summary = {
              total: 0,
              successful: 0,
              failed: 0,
              skipped: 0,
              cancelled: 0,
              running: 0,
              pending: 0,
              upstream_failed: 0
            };

            // Count statuses from all tasks (including nested children)
            const countStatuses = (tasks) => {
              tasks.forEach(task => {
                summary.total++;
                switch (task.task_status) {
                  case 'SUCCESS':
                    summary.successful++;
                    break;
                  case 'FAILED':
                    summary.failed++;
                    break;
                  case 'SKIPPED':
                    summary.skipped++;
                    break;
                  case 'CANCELLED':
                    summary.cancelled++;
                    break;
                  case 'RUNNING':
                    summary.running++;
                    break;
                  case 'PENDING':
                    summary.pending++;
                    break;
                  case 'UPSTREAM_FAILED':
                    summary.upstream_failed++;
                    break;
                }
                
                // Recursively count children
                if (task.children && task.children.length > 0) {
                  countStatuses(task.children);
                }
              });
            };

            countStatuses(latestRun.tasks);
            setExecutionSummary(summary);
          } else {
            setExecutionSummary(null);
          }
        } else {
          setExecutionSummary(null);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch execution summary:', errorData);
        setExecutionSummary(null);
      }
    } catch (error) {
      console.error('Error fetching execution summary:', error);
      setExecutionSummary(null);
    } finally {
      setExecutionSummaryLoading(false);
    }
  }, [playground, token]);

  const fetchTasks = useCallback(async () => {
    if (!playground || !playground.id) return;
    

    
    // Try both API endpoint patterns
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:9092';
    const endpoints = [
      `${baseUrl}/data-phantom/playground/${playground.id}/tasks`,
      `${baseUrl}/data-phantom/tasks?playgroundId=${playground.id}`,
      `${baseUrl}/data-phantom/tasks`
    ];
    
    setLoading(true);
    
    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];

      
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });



        if (response.ok) {
          const tasksData = await response.json();

          
          // Handle wrapped response format: {success: true, count: 2, tasks: Array(2)}
          let actualTasks = [];
          if (tasksData && typeof tasksData === 'object') {
            if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
              // Wrapped format: {success: true, count: 2, tasks: Array(2)}
              actualTasks = tasksData.tasks;

            } else if (Array.isArray(tasksData)) {
              // Direct array format
              actualTasks = tasksData;

            }
          }
          
          // If we got actual tasks data, use it and break
          if (actualTasks.length > 0) {

            setTasks(actualTasks);
            break;
          } else {

          }
        } else {
          const errorText = await response.text();

        }
      } catch (error) {

      }
    }
    
    setLoading(false);
  }, [playground, token]);

  // Fetch tasks when playground changes
  useEffect(() => {
    if (playground && playground.id) {
      // Clear existing tasks when switching playgrounds
      setTasks([]);
      // Clear run history when switching playgrounds
      setRunHistory([]);

      
      // Fetch tasks for the new playground

      fetchTasks();
    } else {
      // Clear tasks when no playground is selected
      setTasks([]);
      // Clear run history when no playground is selected
      setRunHistory([]);

    }
  }, [playground, fetchTasks]);

  // Auto-load run history when playground changes and we're in history view
  useEffect(() => {
    if (playground && playground.id && viewMode === 'history' && runHistory.length === 0) {
      fetchRunHistory();
    }
  }, [playground, viewMode, runHistory.length, fetchRunHistory]);

  // Fetch run history when limit changes
  useEffect(() => {
    if (playground && playground.id && viewMode === 'history') {
      fetchRunHistory();
    }
  }, [runHistoryLimit, fetchRunHistory, playground, viewMode]);

  useEffect(() => {
    if (playground && playground.id) {
      fetchExecutionSummary();
    } else {
      setExecutionSummary(null);
    }
  }, [playground, fetchExecutionSummary]);

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
        <p style={{ margin: 0, fontSize: '16px' }}>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--neutral-200)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--neutral-200)',
        background: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--neutral-900)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              Task Management
              {/* Status Indicator */}
              {(() => {
                const isRunning = playground?.currentStatus === 'RUNNING' || (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id));
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    background: isRunning ? '#dcfce7' : '#f3f4f6',
                    color: isRunning ? '#166534' : '#6b7280',
                    border: isRunning ? '1px solid #86efac' : '1px solid #d1d5db'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isRunning ? '#10b981' : '#9ca3af',
                      flexShrink: 0,
                      animation: isRunning ? 'pulse 2s infinite' : 'none'
                    }} />
                    {isRunning ? 'Running' : 'Idle'}
                  </div>
                );
              })()}
            </h2>
            
            {/* Playground metadata */}
            {(playground?.cronExpression || true) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '8px 12px',
                background: 'var(--neutral-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--neutral-200)'
              }}>
                {/* Schedule info */}
                {playground?.cronExpression && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--primary-500)',
                      flexShrink: 0
                    }} />
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px'
                    }}>
                      <span style={{
                        fontSize: '10px',
                        color: 'var(--neutral-500)',
                        fontWeight: '500',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Schedule
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--neutral-700)',
                        fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace",
                        fontWeight: '500'
                      }}>
                        {playground.cronExpression}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Separator */}
                {playground?.cronExpression && (
                  <div style={{
                    width: '1px',
                    height: '32px',
                    background: 'var(--neutral-300)',
                    margin: '0 8px'
                  }} />
                )}
                
                                {/* Last execution info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: playground?.lastExecutedAt ? 'var(--success-500)' : 'var(--neutral-400)',
                    flexShrink: 0
                  }} />
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px'
                  }}>
                    <span style={{
                      fontSize: '10px',
                      color: 'var(--neutral-500)',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Last Run
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: playground?.lastExecutedAt ? 'var(--neutral-700)' : 'var(--neutral-500)',
                      fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace",
                      fontWeight: '500',
                      fontStyle: playground?.lastExecutedAt ? 'normal' : 'italic'
                    }}>
                      {playground?.lastExecutedAt 
                        ? `${new Date(playground.lastExecutedAt).toLocaleDateString([], {month: 'short', day: 'numeric'})} ${new Date(playground.lastExecutedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                        : 'Never ran'
                      }
                    </span>
                  </div>
                </div>


                {/* Last Run Status */}
                {playground?.lastRunStatus && (
                  <>
                    <div style={{
                      width: '1px',
                      height: '32px',
                      background: 'var(--neutral-300)',
                      margin: '0 8px'
                    }} />
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: playground.lastRunStatus === 'SUCCESS' ? '#10b981' :
                                   playground.lastRunStatus === 'FAILED' ? '#ef4444' :
                                   playground.lastRunStatus === 'RUNNING' ? '#3b82f6' :
                                   playground.lastRunStatus === 'PENDING' ? '#eab308' :
                                   playground.lastRunStatus === 'CANCELLED' ? '#f97316' :
                                   playground.lastRunStatus === 'IDLE' ? '#8b5cf6' :
                                   playground.lastRunStatus === 'PARTIAL_SUCCESS' ? '#f59e0b' : '#6b7280',
                        flexShrink: 0
                      }} />
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px'
                      }}>
                        <span style={{
                          fontSize: '10px',
                          color: 'var(--neutral-500)',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Last Run Status
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: playground.lastRunStatus === 'SUCCESS' ? '#047857' :
                                 playground.lastRunStatus === 'FAILED' ? '#b91c1c' :
                                 playground.lastRunStatus === 'RUNNING' ? '#1d4ed8' :
                                 playground.lastRunStatus === 'PENDING' ? '#a16207' :
                                 playground.lastRunStatus === 'CANCELLED' ? '#c2410c' :
                                 playground.lastRunStatus === 'IDLE' ? '#6b21a8' :
                                 playground.lastRunStatus === 'PARTIAL_SUCCESS' ? '#b45309' : '#334155',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {playground.lastRunStatus}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Last Execution Summary */}
                {executionSummary && (
                  <>
                    <div style={{
                      width: '1px',
                      height: '32px',
                      background: 'var(--neutral-300)',
                      margin: '0 8px'
                    }} />
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'default',
                        position: 'relative'
                      }}
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    >
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--primary-500)',
                        flexShrink: 0
                      }} />
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px'
                      }}>
                        <span style={{
                          fontSize: '10px',
                          color: 'var(--neutral-500)',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Last Execution Summary
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--neutral-700)',
                          fontWeight: '500',
                          display: 'flex',
                          gap: '6px'
                        }}>
                          {executionSummary.successful > 0 && (
                            <span style={{ color: 'var(--success-600)' }}>
                              ✓ {executionSummary.successful}
                            </span>
                          )}
                          {executionSummary.failed > 0 && (
                            <span style={{ color: 'var(--error-600)' }}>
                              ✗ {executionSummary.failed}
                            </span>
                          )}
                          {executionSummary.skipped > 0 && (
                            <span style={{ color: 'var(--warning-600)' }}>
                              ⏭ {executionSummary.skipped}
                            </span>
                          )}
                          {executionSummary.cancelled > 0 && (
                            <span style={{ color: 'var(--neutral-600)' }}>
                              ⏹ {executionSummary.cancelled}
                            </span>
                          )}
                          {executionSummary.running > 0 && (
                            <span style={{ color: 'var(--primary-600)' }}>
                              ⏳ {executionSummary.running}
                            </span>
                          )}
                          {executionSummary.pending > 0 && (
                            <span style={{ color: 'var(--warning-600)' }}>
                              ⏸ {executionSummary.pending}
                            </span>
                          )}
                          {executionSummary.upstream_failed > 0 && (
                            <span style={{ color: 'var(--warning-600)' }}>
                              ⚠ {executionSummary.upstream_failed}
                            </span>
                          )}
                        </span>
                      </div>
                      
                      {/* Custom Tooltip */}
                      {showTooltip && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'var(--neutral-800)',
                          color: '#e2e8f0',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          zIndex: 1000,
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
                          border: '1px solid #4a5568',
                          marginBottom: '8px'
                        }}>
                          {[
                            executionSummary.successful > 0 ? `${executionSummary.successful} success` : null,
                            executionSummary.failed > 0 ? `${executionSummary.failed} failed` : null,
                            executionSummary.skipped > 0 ? `${executionSummary.skipped} skipped` : null,
                            executionSummary.cancelled > 0 ? `${executionSummary.cancelled} cancelled` : null,
                            executionSummary.running > 0 ? `${executionSummary.running} running` : null,
                            executionSummary.pending > 0 ? `${executionSummary.pending} pending` : null,
                            executionSummary.upstream_failed > 0 ? `${executionSummary.upstream_failed} upstream failed` : null
                          ].filter(Boolean).join(', ')}
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '0',
                            height: '0',
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '6px solid var(--neutral-800)'
                          }} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>

            {/* Run/Cancel Button */}
            <button
              onClick={() => {
                const isRunning = playground?.currentStatus === 'RUNNING' || (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id));
                if (isRunning) {
                  handleCancelPlayground();
                } else if (selectionMode) {
                  handleRunSelected();
                } else {
                  handleRunAllTasks();
                }
              }}
              disabled={!tasks || tasks.length === 0}
              title={
                playground?.currentStatus === 'RUNNING' || (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id))
                  ? "Cancel current playground run"
                  : !tasks || tasks.length === 0 
                    ? 'No tasks available to run' 
                    : selectionMode
                      ? `Run ${Object.values(selectedTasks).filter(Boolean).length} selected tasks`
                      : `Run all ${tasks.length} tasks`
              }
              style={{
                background: playground?.currentStatus === 'RUNNING' || (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id))
                  ? '#dc2626'
                  : !tasks || tasks.length === 0 
                    ? '#4a5568' 
                    : 'var(--neutral-800)',
                color: '#e2e8f0',
                border: '1px solid #4a5568',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: !tasks || tasks.length === 0 
                  ? 'not-allowed' 
                  : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                opacity: !tasks || tasks.length === 0 ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)';
                  const isRunning = playground?.currentStatus === 'RUNNING' || (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id));
                  e.target.style.background = isRunning ? '#b91c1c' : 'var(--neutral-600)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.target.disabled) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                  const isRunning = playground?.currentStatus === 'RUNNING' || (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id));
                  e.target.style.background = isRunning ? '#dc2626' : 'var(--neutral-800)';
                }
              }}
            >
              {playground?.currentStatus === 'RUNNING' || (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id)) ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
              {playground?.currentStatus === 'RUNNING' || (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id)) 
                ? 'Cancel' 
                : selectionMode 
                  ? `Run Selected (${Object.values(selectedTasks).filter(Boolean).length}/${tasks?.length || 0})`
                  : 'Run All Tasks'
              }
            </button>

            {/* Choose Tasks to Run Button */}
            {!(playground?.currentStatus === 'RUNNING' || (runningStateManager && runningStateManager.isPlaygroundRunning && runningStateManager.isPlaygroundRunning(playground?.id))) && tasks && tasks.length > 0 && (
              <button
                onClick={handleToggleSelectionMode}
                title={selectionMode ? 'Exit selection mode' : 'Choose specific tasks to run instead of running all tasks'}
                style={{
                  background: selectionMode ? 'var(--primary-600)' : 'var(--neutral-700)',
                  color: 'white',
                  border: '1px solid #4a5568',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)';
                  e.target.style.background = selectionMode ? 'var(--primary-700)' : 'var(--neutral-600)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                  e.target.style.background = selectionMode ? 'var(--primary-600)' : 'var(--neutral-700)';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                {selectionMode ? 'Exit Selection' : 'Select & Run'}
              </button>
            )}



            {/* Refresh Button with Dropdown */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{
                display: 'flex',
                background: 'var(--neutral-800)',
                border: '1px solid #1d4ed8',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <button
                  onClick={async () => {
                    // Always trigger immediate refresh when button is clicked
                    await fetchTasks();
                    // Also refresh playground data
                    if (runningStateManager && runningStateManager.refreshPlaygrounds) {
                      await runningStateManager.refreshPlaygrounds();
                    }
                  }}
                  style={{
                    background: 'transparent',
                    color: '#e2e8f0',
                    border: 'none',
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRight: '1px solid #4a5568'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#4a5568';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                  title="Refresh now"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8" />
                  </svg>
                  Refresh
                </button>
                
                {/* Dropdown Arrow */}
                <button
                  data-dropdown-trigger
                  onClick={() => {
                    const dropdown = document.getElementById('refresh-dropdown');
                    if (dropdown) {
                      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                    }
                  }}
                  style={{
                    background: 'transparent',
                    color: '#e2e8f0',
                    border: 'none',
                    padding: '6px 6px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '32px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#4a5568';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                  title="Auto refresh options"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                </button>
              </div>
              
              {/* Dropdown Menu */}
              <div
                id="refresh-dropdown"
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  background: '#2d3748',
                  border: '1px solid #4a5568',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
                  zIndex: 1000,
                  minWidth: '160px',
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
                  Auto Refresh
                </div>
                
                {[
                  { label: 'Off', value: null },
                  { label: '5s', value: 5000 },
                  { label: '10s', value: 10000 },
                  { label: '30s', value: 30000 }
                ].map((option) => (
                  <button
                    key={option.value || 'off'}
                    onClick={async () => {
                      // Close dropdown
                      const dropdown = document.getElementById('refresh-dropdown');
                      if (dropdown) {
                        dropdown.style.display = 'none';
                      }
                      
                      if (option.value === null) {
                        // Turn off auto refresh
                        if (autoRefreshState && autoRefreshState.stop) {
                          autoRefreshState.stop();
                        }
                      } else {
                        // Set new interval
                        if (autoRefreshState && autoRefreshState.startWithInterval) {
                          autoRefreshState.startWithInterval(option.value);
                        } else if (autoRefreshState && autoRefreshState.start) {
                          autoRefreshState.start();
                        }
                      }
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
                      e.target.style.background = '#4a5568';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                    }}
                  >
                    <span>{option.label}</span>
                    {autoRefreshState && autoRefreshState.isActive && autoRefreshState.currentInterval === option.value && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--neutral-100)',
          borderRadius: 'var(--radius-lg)',
          padding: '2px',
          border: '1px solid var(--neutral-200)',
          marginTop: '16px',
          gap: '4px'
        }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              background: viewMode === 'list' 
                ? 'white' 
                : 'transparent',
              color: viewMode === 'list' 
                ? 'var(--primary-700)' 
                : 'var(--neutral-600)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: viewMode === 'list' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'list') {
                e.target.style.background = 'rgba(255, 255, 255, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Tasks
          </button>
          
          <button
            onClick={() => setViewMode('reconciliation')}
            style={{
              background: viewMode === 'reconciliation' 
                ? 'white' 
                : 'transparent',
              color: viewMode === 'reconciliation' 
                ? 'var(--primary-700)' 
                : 'var(--neutral-600)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: viewMode === 'reconciliation' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === 'reconciliation' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'reconciliation') {
                e.target.style.background = 'rgba(255, 255, 255, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
              <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
              <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
            </svg>
            Reconciliation
          </button>
          <button
            onClick={() => setViewMode('graph')}
            style={{
              background: viewMode === 'graph' 
                ? 'white' 
                : 'transparent',
              color: viewMode === 'graph' 
                ? 'var(--primary-700)' 
                : 'var(--neutral-600)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: viewMode === 'graph' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === 'graph' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'graph') {
                e.target.style.background = 'rgba(255, 255, 255, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
            </svg>
            Graph
          </button>

          <button
            onClick={() => {
              setViewMode('history');
              // Only fetch if we don't have run history data yet
              if (runHistory.length === 0) {
                fetchRunHistory();
              }
            }}
            style={{
              background: viewMode === 'history' 
                ? 'white' 
                : 'transparent',
              color: viewMode === 'history' 
                ? 'var(--primary-700)' 
                : 'var(--neutral-600)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: viewMode === 'history' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === 'history' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'history') {
                e.target.style.background = 'rgba(255, 255, 255, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Run History
          </button>


        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {viewMode === 'list' ? (
          <TaskList 
            tasks={tasks || []} 
            onEditTask={handleEditTask} 
            onDeleteTask={handleDeleteTask} 
            onTaskClick={handleTaskClick}
            onCreateTask={() => setCreateModal({ isOpen: true })}
            playground={playground}
            runningStateManager={runningStateManager}
            selectedTasks={selectedTasks}
            onTaskSelection={handleTaskSelection}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            selectionMode={selectionMode}
          />
        ) : viewMode === 'graph' ? (
          <TaskGraph tasks={tasks || []} onTaskClick={handleTaskClick} selectedTasks={selectionMode ? selectedTasks : {}} />
        ) : viewMode === 'history' ? (
          <RunHistory 
            runHistory={runHistory}
            loading={runHistoryLoading}
            playground={playground}
            limit={runHistoryLimit}
            onLimitChange={setRunHistoryLimit}
          />
        ) : viewMode === 'reconciliation' ? (
          <Reconciliation 
            tasks={tasks || []}
            playground={playground}
          />
        ) : null}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal({ isOpen: false })}
        playground={playground}
        tasks={tasks || []}
        onSubmit={handleCreateTask}
      />

      {/* Edit Query Modal */}
      <EditQueryModal
        isOpen={editModal.isOpen}
        onClose={handleCloseEditModal}
        task={editModal.task}
        onSave={handleSaveQuery}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={handleCloseDetailsModal}
        task={detailsModal.task}
      />

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

      
      {/* CSS for animations */}
      <style jsx="true">{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default TaskManager;
