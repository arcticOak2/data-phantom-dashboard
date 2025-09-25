import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthProvider";
import AlertModal from "./AlertModal";
import EditPlaygroundModal from "./EditPlaygroundModal";
import UDFModal from "./UDFModal";
import logo from "./assets/logo.png";

const Sidebar = ({ onSelectPlayground, activePlaygroundId, onPlaygroundDeleted, onPlaygroundUpdated, onRunningStateChange, onPlaygroundDataUpdated, autoRefreshState, collapsed = false, onToggleSidebar }) => {
  const { user, token } = useContext(AuthContext);
  const [playgrounds, setPlaygrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaygroundName, setNewPlaygroundName] = useState('');
  const [newPlaygroundCron, setNewPlaygroundCron] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });
  const [editModal, setEditModal] = useState({ isOpen: false, playground: null });
  const [udfModal, setUdfModal] = useState({ isOpen: false });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [runningPlaygrounds, setRunningPlaygrounds] = useState(new Set());
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);

  // Functions to manage running state
  const setPlaygroundRunning = (playgroundId, isRunning) => {
    setRunningPlaygrounds(prev => {
      const newSet = new Set(prev);
      if (isRunning) {
        newSet.add(playgroundId);
      } else {
        newSet.delete(playgroundId);
      }
      return newSet;
    });
  };

  // Polling functions for real-time updates
  const startPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Only start polling if auto-refresh is active
    if (!autoRefreshState?.isActive) {
      return;
    }
    
    setIsPolling(true);
    const interval = setInterval(async () => {
      // Check if auto-refresh is still active before polling
      if (!autoRefreshState?.isActive) {
        stopPolling();
        return;
      }
      
      await fetchPlaygrounds();
      
      // Check if we should stop polling (no running playgrounds)
      // Use a timeout to allow the state to update
      setTimeout(() => {
        const hasRunningPlaygrounds = playgrounds.some(pg => 
          pg?.currentStatus === 'RUNNING' || runningPlaygrounds.has(pg?.id)
        );
        
        if (!hasRunningPlaygrounds) {
          stopPolling();
        }
      }, 1000); // 1 second delay to allow state update
    }, 3000); // Poll every 3 seconds
    
    setPollingInterval(interval);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setIsPolling(false);
  };

  // Expose running state management to parent
  useEffect(() => {
    if (onRunningStateChange) {
      onRunningStateChange({
        setPlaygroundRunning,
        isPlaygroundRunning: (playgroundId) => runningPlaygrounds.has(playgroundId),
        startPolling,
        stopPolling,
        refreshPlaygrounds: fetchPlaygrounds
      });
    }
  }, [onRunningStateChange]);

  // Stop polling when auto-refresh is turned off
  useEffect(() => {
    if (!autoRefreshState?.isActive && isPolling) {
      stopPolling();
    }
  }, [autoRefreshState?.isActive]);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Search, sort, and pagination logic
  const safePlaygrounds = Array.isArray(playgrounds) ? playgrounds : [];
  const filteredPlaygrounds = safePlaygrounds
    .filter(pg => 
      pg && pg.name && pg.name.toLowerCase().includes((searchQuery || '').toLowerCase())
    )
    .sort((a, b) => {
      // Sort by modifiedAt (newest first)
      const timeA = a.modifiedAt || a.createdAt || 0;
      const timeB = b.modifiedAt || b.createdAt || 0;
      return timeB - timeA; // Descending order (newest first)
    });
  const totalPages = Math.ceil(filteredPlaygrounds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPlaygrounds = filteredPlaygrounds.slice(startIndex, endIndex);



  // Reset to page 1 when playgrounds change or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [playgrounds.length, searchQuery]);

  // Ensure we're on page 1 if current page is invalid
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Effect to ensure proper styling after selection changes
  useEffect(() => {
    // Force re-render of all playground buttons to ensure correct styling
    const playgroundButtons = document.querySelectorAll('[data-playground-id]');
    playgroundButtons.forEach(button => {
      const playgroundId = button.getAttribute('data-playground-id');
      const isActive = activePlaygroundId === playgroundId;
      
      if (isActive) {
        button.style.background = "rgba(255, 255, 255, 0.08)";
        button.style.border = "2px solid #1f2937";  // Dark border for selected
        button.style.transform = "translateY(0)";
        button.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.2)";
        button.style.margin = "0 2px";
      } else {
        button.style.background = "rgba(255, 255, 255, 0.03)";
        button.style.border = "1px solid rgba(255, 255, 255, 0.08)";
        button.style.transform = "translateY(0)";
        button.style.boxShadow = "none";
        button.style.margin = "0";
      }
    });
  }, [activePlaygroundId]);

  const fetchPlaygrounds = async () => {
    if (!user || !token) return [];
    
    try {
      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/playground/${user.userId}`;

      
      const res = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
        
      

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
        
      

      
      let playgroundList;
      
      // Handle different response formats
      if (Array.isArray(data)) {
          // If response is an array
        playgroundList = data.map((playgroundData) => {

          return {
            id: playgroundData.id,
            name: playgroundData.name,
            createdAt: playgroundData.createdAt,
            userId: playgroundData.userId,
            cronExpression: playgroundData.cronExpression,
            modifiedAt: playgroundData.modifiedAt,
            lastExecutedAt: playgroundData.lastExecutedAt || playgroundData.last_executed_at,
            currentStatus: playgroundData.currentStatus,
            lastRunStatus: playgroundData.lastRunStatus,
            lastRunEndTime: playgroundData.lastRunEndTime,
            lastRunFailureCount: playgroundData.lastRunFailureCount || 0,
            lastRunSuccessCount: playgroundData.lastRunSuccessCount || 0
          };
        });
      } else if (typeof data === 'object' && data !== null) {
        // If response is an object (Map<String, Object>)
        playgroundList = Object.entries(data).map(([id, playgroundData]) => {

          return {
            id: playgroundData.id,
            name: playgroundData.name,
            createdAt: playgroundData.createdAt,
            userId: playgroundData.userId,
            cronExpression: playgroundData.cronExpression,
            modifiedAt: playgroundData.modifiedAt,
            lastExecutedAt: playgroundData.lastExecutedAt || playgroundData.last_executed_at,
            currentStatus: playgroundData.currentStatus,
            lastRunStatus: playgroundData.lastRunStatus,
            lastRunEndTime: playgroundData.lastRunEndTime,
            lastRunFailureCount: playgroundData.lastRunFailureCount || 0,
            lastRunSuccessCount: playgroundData.lastRunSuccessCount || 0
          };
        });
      } else {
        console.error("Unexpected response format:", data);
        playgroundList = [];
      }
      

      
      setPlaygrounds(playgroundList);
      
      // Notify parent about updated playground data
      if (onPlaygroundDataUpdated) {
        onPlaygroundDataUpdated(playgroundList);
      }
      
      return playgroundList;
      } catch (err) {
        console.error("Failed to fetch playgrounds:", err);
        return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaygrounds();
  }, [user, token]);

  // Function to validate cron expression
  const isValidCronExpression = (cron) => {
    if (!cron || cron.trim() === '') return true; // Empty is valid (optional)
    
    // Basic cron validation - should have 5 or 6 parts
    // 5 parts: minutes hours day month day-of-week (Unix format)
    // 6 parts: seconds minutes hours day month day-of-week (Quartz format)
    const cronParts = cron.trim().split(/\s+/);
    if (cronParts.length !== 5 && cronParts.length !== 6) return false;
    
    // Check each part for valid characters and ranges
    const validPattern = /^(\*|\*\/\d+|\d+(-\d+)?(,\d+(-\d+)?)*)$/;
    
    if (cronParts.length === 6) {
      // 6-part format: seconds minutes hours day month day-of-week (Quartz)
      // Seconds (0-59)
      if (!validPattern.test(cronParts[0]) || !isInRange(cronParts[0], 0, 59)) return false;
      // Minutes (0-59)
      if (!validPattern.test(cronParts[1]) || !isInRange(cronParts[1], 0, 59)) return false;
      // Hours (0-23)
      if (!validPattern.test(cronParts[2]) || !isInRange(cronParts[2], 0, 23)) return false;
      // Day of month (1-31)
      if (!validPattern.test(cronParts[3]) || !isInRange(cronParts[3], 1, 31)) return false;
      // Month (1-12)
      if (!validPattern.test(cronParts[4]) || !isInRange(cronParts[4], 1, 12)) return false;
      // Day of week (0-7, where 0 and 7 are Sunday)
      if (!validPattern.test(cronParts[5]) || !isInRange(cronParts[5], 0, 7)) return false;
    } else {
      // 5-part format: minutes hours day month day-of-week (Unix)
      // Minutes (0-59)
      if (!validPattern.test(cronParts[0]) || !isInRange(cronParts[0], 0, 59)) return false;
      // Hours (0-23)
      if (!validPattern.test(cronParts[1]) || !isInRange(cronParts[1], 0, 23)) return false;
      // Day of month (1-31)
      if (!validPattern.test(cronParts[2]) || !isInRange(cronParts[2], 1, 31)) return false;
      // Month (1-12)
      if (!validPattern.test(cronParts[3]) || !isInRange(cronParts[3], 1, 12)) return false;
      // Day of week (0-7, where 0 and 7 are Sunday)
      if (!validPattern.test(cronParts[4]) || !isInRange(cronParts[4], 0, 7)) return false;
    }
    
    return true;
  };

  // Helper function to check if cron part is in valid range
  const isInRange = (part, min, max) => {
    if (part === '*') return true;
    
    // Handle */n syntax
    if (part.startsWith('*/')) {
      const step = parseInt(part.substring(2));
      return step >= 1 && step <= max;
    }
    
    const numbers = part.split(',').flatMap(p => {
      if (p.includes('-')) {
        const [start, end] = p.split('-').map(Number);
        return Array.from({length: end - start + 1}, (_, i) => start + i);
      }
      return [Number(p)];
    });
    
    return numbers.every(num => num >= min && num <= max);
  };

  // Simple function to explain cron expression
  const explainCronExpression = (cron) => {
    if (!cron || cron.trim() === '') return null;
    
    const parts = cron.trim().split(/\s+/);
    
    // Handle 6-part Quartz format (seconds minutes hours day month day-of-week)
    if (parts.length === 6) {
      const [seconds, minutes, hours, day, month, dayOfWeek] = parts;
      
      // Handle specific time patterns
      if (hours !== '*' && minutes !== '*' && seconds !== '*') {
        const hour = parseInt(hours);
        const minute = parseInt(minutes);
        const second = parseInt(seconds);
        
        let timeStr = '';
        if (hour === 0 && minute === 0) timeStr = 'midnight';
        else if (hour === 12 && minute === 0) timeStr = 'noon';
        else if (hour < 12) timeStr = `${hour}:${minute.toString().padStart(2, '0')} AM`;
        else if (hour === 12) timeStr = `${hour}:${minute.toString().padStart(2, '0')} PM`;
        else timeStr = `${hour - 12}:${minute.toString().padStart(2, '0')} PM`;
        
        if (second !== 0) timeStr += `:${second.toString().padStart(2, '0')}`;
        
        return `Daily at ${timeStr}`;
      }
      
      // Handle every X minutes
      if (hours === '*' && minutes.startsWith('*/') && seconds === '0') {
        const interval = minutes.substring(2);
        return `Every ${interval} minutes`;
      }
      
      // Handle every X hours
      if (hours.startsWith('*/') && minutes === '0' && seconds === '0') {
        const interval = hours.substring(2);
        return `Every ${interval} hours`;
      }
    }
    
    // Handle 5-part Unix format (minutes hours day month day-of-week)
    if (parts.length === 5) {
      const [minutes, hours, day, month, dayOfWeek] = parts;
      
      // Handle specific time patterns
      if (hours !== '*' && minutes !== '*') {
        const hour = parseInt(hours);
        const minute = parseInt(minutes);
        
        let timeStr = '';
        if (hour === 0 && minute === 0) timeStr = 'midnight';
        else if (hour === 12 && minute === 0) timeStr = 'noon';
        else if (hour < 12) timeStr = `${hour}:${minute.toString().padStart(2, '0')} AM`;
        else if (hour === 12) timeStr = `${hour}:${minute.toString().padStart(2, '0')} PM`;
        else timeStr = `${hour - 12}:${minute.toString().padStart(2, '0')} PM`;
        
        return `Daily at ${timeStr}`;
      }
      
      // Handle every X minutes
      if (hours === '*' && minutes.startsWith('*/')) {
        const interval = minutes.substring(2);
        return `Every ${interval} minutes`;
      }
      
      // Handle every X hours
      if (hours.startsWith('*/') && minutes === '0') {
        const interval = hours.substring(2);
        return `Every ${interval} hours`;
      }
    }
    
    // Fallback for complex expressions
    return `Scheduled`;
  };


  const handleCreatePlayground = async () => {
    // Prevent multiple simultaneous operations
    if (isOperationInProgress) {
      return;
    }

    // Validate playground name
    if (!newPlaygroundName.trim()) {
      alert("Please enter a playground name");
      return;
    }

    // Validate playground name length
    if (newPlaygroundName.trim().length < 3) {
      alert("Playground name must be at least 3 characters long");
      return;
    }

    if (newPlaygroundName.trim().length > 50) {
      alert("Playground name must be less than 50 characters");
      return;
    }

    // Validate cron expression if provided
    if (newPlaygroundCron.trim() && !isValidCronExpression(newPlaygroundCron.trim())) {
      alert("Invalid cron expression. Please use format: 'seconds minutes hours day month day-of-week'\nExample: '0 0 12 * * ?' (daily at noon)");
      return;
    }

    if (!token) {
      alert("No authentication token found. Please log in again.");
      return;
    }

    if (!user || !user.userId) {
      alert("User information not found. Please log in again.");
      return;
    }

    try {
      setIsOperationInProgress(true);
      
      const requestBody = {
        name: newPlaygroundName.trim(),
        userId: user.userId,
        cronExpression: newPlaygroundCron.trim() || null
      };



      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/playground`,
        {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        }
      );



          if (res.ok) {
            const newPlayground = await res.json();


            
            // Clear form and close
            setNewPlaygroundName('');
            setNewPlaygroundCron('');
            setShowCreateForm(false);
            
            // Refetch all playgrounds to ensure we have the complete data
            const updatedPlaygrounds = await fetchPlaygrounds();
            
            // Find the newly created playground in the updated list
            const createdPlayground = updatedPlaygrounds.find(p => p.id === newPlayground.id);
            if (createdPlayground) {
              onSelectPlayground(createdPlayground);
            } else {
              onSelectPlayground(newPlayground);
            }
            
            setIsOperationInProgress(false);
          } else {
            console.error("HTTP Error:", res.status, res.statusText);
            let errorData;
            try {
              errorData = await res.json();
              console.error("Error response body:", errorData);
            } catch (parseError) {
              console.error("Could not parse error response:", parseError);
              const textResponse = await res.text();
              console.error("Raw error response:", textResponse);
            }
            
            setAlertModal({
              isOpen: true,
              title: 'Error',
              message: `Failed to create playground (${res.status}): ${errorData?.message || res.statusText}`,
              type: 'error',
              showCancel: false,
              onConfirm: null
            });
            setIsOperationInProgress(false);
      }
    } catch (err) {
      console.error("Error creating playground:", err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Network error: ${err.message}. Please check your connection and try again.`,
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      setIsOperationInProgress(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCreatePlayground();
    }
  };





  const handleDeletePlayground = (playgroundId, e) => {
    e.stopPropagation(); // Prevent playground selection when clicking delete
    
    if (!playgroundId) {
      console.error('Cannot delete playground: ID is undefined');
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Cannot delete playground: Invalid ID',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    const playground = playgrounds.find(pg => pg.id === playgroundId);
    const playgroundName = playground ? playground.name : 'this playground';
    
    setAlertModal({
      isOpen: true,
      title: 'Delete Playground',
      message: `Are you sure you want to delete "${playgroundName}"? This action cannot be undone.`,
      type: 'warning',
      showCancel: true,
      onConfirm: () => performDeletePlayground(playgroundId)
    });
  };

  const performDeletePlayground = async (playgroundId) => {
    // Prevent multiple simultaneous operations
    if (isOperationInProgress) {
      return;
    }

    if (!playgroundId) {
      console.error('Cannot delete playground: ID is undefined');
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Cannot delete playground: Invalid ID',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    if (!token) {
      console.error('Cannot delete playground: No authentication token');
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Authentication required. Please log in again.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    try {
      setIsOperationInProgress(true);
      
      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/playground/${playgroundId}`;
      const res = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        // Remove from playgrounds state
        setPlaygrounds(prev => prev.filter(pg => pg.id !== playgroundId));
        
        // Notify Layout to close the tab (with a small delay to ensure state is updated)
        if (onPlaygroundDeleted) {
          setTimeout(() => {
            onPlaygroundDeleted(playgroundId);
          }, 50);
        }
        
        // Show success message
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: 'Playground deleted successfully!',
          type: 'success',
          showCancel: false,
          onConfirm: null
        });
        
        setIsOperationInProgress(false);
      } else {
        const errorText = await res.text();
        let errorMessage = `Failed to delete playground (${res.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
        
        console.error("Failed to delete playground:", res.status, errorMessage);
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: errorMessage,
          type: 'error',
          showCancel: false,
          onConfirm: null
        });
        setIsOperationInProgress(false);
      }
    } catch (err) {
      console.error("Error deleting playground:", err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Network error: ${err.message}. Please check your connection and try again.`,
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      setIsOperationInProgress(false);
    }
  };

  const handleEditPlayground = (playground, e) => {
    e.stopPropagation(); // Prevent playground selection when clicking edit
    
    if (!playground || !playground.id) {
      console.error('Cannot edit playground: Invalid playground data');
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Cannot edit playground: Invalid data',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    setEditModal({
      isOpen: true,
      playground: playground
    });
  };

  const handleCloseEditModal = () => {
    setEditModal({
      isOpen: false,
      playground: null
    });
  };

  const handleSavePlayground = async (playgroundId, newName, newCronExpression) => {
    if (!token) {
      console.error('Cannot update playground: No authentication token');
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Authentication required. Please log in again.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/playground/update`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: playgroundId,
            name: newName,
            cronExpression: newCronExpression
          })
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = `Failed to update playground (${res.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Update local state
      setPlaygrounds(prev => prev.map(pg => 
        pg.id === playgroundId 
          ? { ...pg, name: newName, cronExpression: newCronExpression }
          : pg
      ));

      // Get the updated playground for the callback
      const updatedPlayground = { 
        ...playgrounds.find(pg => pg.id === playgroundId), 
        name: newName, 
        cronExpression: newCronExpression 
      };

      // Notify parent components about the update
      if (onPlaygroundUpdated) {
        onPlaygroundUpdated(updatedPlayground);
      }

      // Show success message
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Playground updated successfully!',
        type: 'success',
        showCancel: false,
        onConfirm: null
      });

    } catch (err) {
      console.error("Error updating playground:", err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Failed to update playground: ${err.message}`,
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    }
  };

  if (loading)
    return <div style={{ color: "#888", padding: "10px" }}>Loading playgrounds...</div>;

  return (
    <div
      style={{
        width: collapsed ? "64px" : "340px",
        background: "var(--neutral-800)",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        transition: "width 0.3s ease-in-out",
        boxSizing: "border-box"
      }}
    >
      <style jsx="true">{`
        @keyframes runningDotPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.3);
            box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.3);
          }
        }
        
        /* Prevent text selection styling interference - only target text divs */
        [data-playground-id] > div:not(:first-child) div {
          background: transparent !important;
          border: none !important;
          outline: none !important;
          text-decoration: none !important;
        }
        
        [data-playground-id] > div:not(:first-child) div:hover {
          background: transparent !important;
          border: none !important;
          outline: none !important;
          text-decoration: none !important;
        }
        
        /* Ensure status dot is always visible */
        .status-dot {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 10px !important;
          height: 10px !important;
          min-width: 10px !important;
          min-height: 10px !important;
        }
        
        [data-playground-id] > div:first-child {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      `}</style>
      {/* Top Gradient Overlay */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "72px",
        background: "var(--neutral-800)",
        opacity: 0.9
      }} />
      
      {/* Logo Section */}
      <div style={{
        padding: collapsed ? "20px 10px" : "16px 24px 16px",
        position: "relative",
        zIndex: 2,
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
        ...(collapsed && {
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        })
      }}>
        <div style={{
          background: collapsed 
            ? "transparent" 
            : "rgba(255, 255, 255, 0.1)",
          borderRadius: collapsed ? "0" : "16px",
          padding: collapsed ? "0" : "16px 12px",
          backdropFilter: collapsed ? "none" : "blur(10px)",
          border: collapsed 
            ? "none" 
            : "1px solid rgba(255, 255, 255, 0.2)",
          textAlign: "center",
          transition: "all 0.3s ease",
          cursor: collapsed ? "pointer" : "default",
          ...(collapsed && {
            width: "100%",
            height: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
          boxSizing: "border-box"
        }}
        onClick={collapsed ? onToggleSidebar : undefined}
        onMouseEnter={collapsed ? (e) => {
          e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(59, 130, 246, 0.2)";
        } : undefined}
        onMouseLeave={collapsed ? (e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "none";
        } : undefined}
        title={collapsed ? "Click to expand sidebar" : undefined}
        >
          {collapsed ? (
            // Collapsed view - just the logo
            <div style={{
              width: "44px",
              height: "44px",
              background: "rgba(59, 130, 246, 0.2)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(59, 130, 246, 0.8)",
              boxShadow: "0 2px 6px rgba(59, 130, 246, 0.3)",
              padding: "2px",
              transition: "all 0.3s ease",
              flexShrink: 0
            }}>
              <img 
                src={logo} 
                alt="Data Phantom Dashboard" 
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter: "brightness(0) invert(1)"
                }}
              />
            </div>
          ) : (
            // Expanded view - logo, text, and toggle button
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "14px"
              }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  background: "rgba(59, 130, 246, 0.15)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid rgba(59, 130, 246, 0.8)",
                  boxShadow: "0 4px 16px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)",
                  padding: "2px",
                  transition: "all 0.3s ease",
                  flexShrink: 0
                }}>
                  <img 
                    src={logo} 
                    alt="Data Phantom Dashboard" 
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      filter: "brightness(0) invert(1)"
                    }}
                  />
                </div>
                <div style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "rgba(255, 255, 255, 0.9)",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase"
                }}>
                  Data Phantom
                </div>
              </div>
              
              {/* Sidebar Toggle Button */}
              <button
                onClick={onToggleSidebar}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.transform = 'translateY(-1px) scale(1.05)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                title="Collapse sidebar"
              >
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* UDFs Section */}
      <div style={{
        padding: collapsed ? "16px 8px 8px 8px" : "20px 16px 8px 16px",
        position: "relative",
        zIndex: 2,
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        {collapsed ? (
          <button
            onClick={() => setUdfModal({ isOpen: true })}
            style={{
              width: "44px",
              height: "44px",
              background: "transparent",
              border: "none",
              borderRadius: "16px",
              color: "rgba(255, 255, 255, 0.8)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
              flexShrink: 0,
              margin: "0 auto"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.1)";
              e.target.style.border = "1px solid rgba(255, 255, 255, 0.2)";
              e.target.style.transform = "translateY(-1px) scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.border = "none";
              e.target.style.transform = "translateY(0) scale(1)";
            }}
            title="Manage UDFs"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <div style={{
            marginBottom: collapsed ? "16px" : "24px",
            padding: collapsed ? "0" : "0 8px"
          }}>
            <button
              onClick={() => setUdfModal({ isOpen: true })}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                msUserSelect: "none",
                padding: "12px 16px",
                width: "100%",
                textAlign: "left",
                borderRadius: "8px"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.1)";
                e.target.style.color = "rgba(255, 255, 255, 0.9)";
                e.target.style.border = "1px solid rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                e.target.style.color = "rgba(255, 255, 255, 0.6)";
                e.target.style.border = "none";
              }}
              title="Manage UDFs"
            >
              <span style={{
                fontSize: "12px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                UDF Library
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Section */}
      <div style={{
        flex: 1,
        padding: collapsed ? "0 8px" : "0 16px",
        position: "relative",
        zIndex: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Playgrounds Header */}
        <div style={{
          marginTop: "16px",
          marginBottom: collapsed ? "16px" : "24px",
          padding: collapsed ? "0" : "0 8px"
        }}>
          {!collapsed && (
            <h3 style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "rgba(255, 255, 255, 0.6)",
              margin: "0 0 12px 0",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              Workspace
            </h3>
          )}
          
          {/* Search Bar with Create Button */}
          <div style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
            ...(collapsed && { justifyContent: "center" })
          }}>
            {!collapsed ? (
              <>
                {/* Search Input */}
                <div style={{
                  position: "relative",
                  flex: 1
                }}>
                  <input
                    type="text"
                    placeholder="Search playgrounds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 36px 10px 36px",
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "10px",
                      color: "white",
                      fontSize: "13px",
                      backdropFilter: "blur(10px)",
                      transition: "all 0.2s ease",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => {
                      e.target.style.background = "rgba(255, 255, 255, 0.15)";
                      e.target.style.borderColor = "rgba(255, 255, 255, 0.3)";
                    }}
                    onBlur={(e) => {
                      e.target.style.background = "rgba(255, 255, 255, 0.1)";
                      e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    }}
                  />
                  {/* Search Icon */}
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="rgba(255, 255, 255, 0.6)" 
                    strokeWidth="2"
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none"
                    }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  
                  {/* Clear Button */}
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "none",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        padding: 0
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "rgba(255, 255, 255, 0.2)";
                        e.target.style.transform = "translateY(-50%) scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "rgba(255, 255, 255, 0.1)";
                        e.target.style.transform = "translateY(-50%) scale(1)";
                      }}
                    >
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="rgba(255, 255, 255, 0.7)" 
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Create Button - Simple Plus */}
                <button
                  onClick={() => setShowCreateForm(true)}
                  style={{
                      width: "38px",
                      height: "38px",
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "10px",
                      color: "white",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      backdropFilter: "blur(10px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      msUserSelect: "none",
                      flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                      e.target.style.background = "rgba(255, 255, 255, 0.2)";
                      e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                      e.target.style.background = "rgba(255, 255, 255, 0.1)";
                      e.target.style.transform = "translateY(0)";
                  }}
                    title="Create New Playground"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </>
            ) : (
              /* Collapsed Create Button */
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                    width: "44px",
                    height: "44px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "16px",
                    color: "rgba(16, 185, 129, 0.9)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    backdropFilter: "blur(10px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                    flexShrink: 0,
                    margin: "0 auto",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
                }}
                onMouseEnter={(e) => {
                    e.target.style.background = "rgba(16, 185, 129, 0.25)";
                    e.target.style.borderColor = "rgba(16, 185, 129, 0.5)";
                    e.target.style.transform = "translateY(-2px) scale(1.05)";
                    e.target.style.boxShadow = "0 8px 20px rgba(16, 185, 129, 0.3)";
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = "rgba(16, 185, 129, 0.15)";
                    e.target.style.borderColor = "rgba(16, 185, 129, 0.3)";
                    e.target.style.transform = "translateY(0) scale(1)";
                    e.target.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.2)";
                }}
                title="Create New Playground"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
        </div>

        {/* Create Playground Form */}
        {showCreateForm && !collapsed && (
          <div style={{
              marginTop: "16px",
              padding: "16px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)"
          }}>
            <input
              type="text"
              placeholder="Enter playground name..."
              value={newPlaygroundName}
              onChange={(e) => setNewPlaygroundName(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: newPlaygroundName.trim() && (newPlaygroundName.trim().length < 3 || newPlaygroundName.trim().length > 50)
                    ? "1px solid rgba(239, 68, 68, 0.6)"
                    : "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "14px",
                  marginBottom: "4px",
                  fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace"
              }}
            />
            {newPlaygroundName.trim() && (newPlaygroundName.trim().length < 3 || newPlaygroundName.trim().length > 50) && (
              <div style={{
                fontSize: "11px",
                color: "rgba(239, 68, 68, 0.8)",
                marginBottom: "12px",
                marginLeft: "4px"
              }}>
                {newPlaygroundName.trim().length < 3 ? "Name must be at least 3 characters" : "Name must be less than 50 characters"}
              </div>
            )}
            <input
              type="text"
              placeholder="Cron expression (optional) - e.g., */5 * * * * or 0 0 12 * * ?"
              value={newPlaygroundCron}
              onChange={(e) => setNewPlaygroundCron(e.target.value)}
              style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: newPlaygroundCron.trim() && !isValidCronExpression(newPlaygroundCron.trim())
                    ? "1px solid rgba(239, 68, 68, 0.6)"
                    : "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "14px",
                  marginBottom: "4px",
                  fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace"
              }}
            />
            {newPlaygroundCron.trim() && !isValidCronExpression(newPlaygroundCron.trim()) && (
              <div style={{
                fontSize: "11px",
                color: "rgba(239, 68, 68, 0.8)",
                marginBottom: "12px",
                marginLeft: "4px"
              }}>
                Invalid cron format. Use: seconds minutes hours day month day-of-week
              </div>
            )}
            {newPlaygroundCron.trim() && isValidCronExpression(newPlaygroundCron.trim()) && (
              <div style={{
                fontSize: "11px",
                color: "rgba(16, 185, 129, 0.8)",
                marginBottom: "12px",
                marginLeft: "4px",
                padding: "6px 8px",
                background: "rgba(16, 185, 129, 0.1)",
                borderRadius: "4px",
                border: "1px solid rgba(16, 185, 129, 0.2)"
              }}>
                <strong>📅 {explainCronExpression(newPlaygroundCron.trim())}</strong>
              </div>
            )}
            <div style={{
                fontSize: "11px",
                color: "rgba(255, 255, 255, 0.6)",
                marginBottom: "12px",
                lineHeight: "1.4"
            }}>
              Leave empty for manual execution. Supports both Unix (5 parts) and Quartz (6 parts) formats.
            </div>
            <div style={{
                display: "flex",
                gap: "8px"
            }}>
              <button
                onClick={handleCreatePlayground}
                disabled={
                  isOperationInProgress ||
                  !newPlaygroundName.trim() || 
                  newPlaygroundName.trim().length < 3 || 
                  newPlaygroundName.trim().length > 50 ||
                  (newPlaygroundCron.trim() && !isValidCronExpression(newPlaygroundCron.trim()))
                }
                style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: (
                      !newPlaygroundName.trim() || 
                      newPlaygroundName.trim().length < 3 || 
                      newPlaygroundName.trim().length > 50 ||
                      (newPlaygroundCron.trim() && !isValidCronExpression(newPlaygroundCron.trim()))
                    ) ? "rgba(107, 114, 128, 0.5)" : "rgba(16, 185, 129, 0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: (
                      !newPlaygroundName.trim() || 
                      newPlaygroundName.trim().length < 3 || 
                      newPlaygroundName.trim().length > 50 ||
                      (newPlaygroundCron.trim() && !isValidCronExpression(newPlaygroundCron.trim()))
                    ) ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none"
                }}
                onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                        e.target.style.background = "rgba(16, 185, 129, 1)";
                    }
                }}
                onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                        e.target.style.background = "rgba(16, 185, 129, 0.8)";
                    }
                }}
              >
                {isOperationInProgress ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewPlaygroundName('');
                  setNewPlaygroundCron('');
                }}
                style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none"
                }}
                onMouseEnter={(e) => {
                    e.target.style.background = "rgba(255, 255, 255, 0.2)";
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = "rgba(255, 255, 255, 0.1)";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Playgrounds List */}
      <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        flex: 1,
          overflow: "hidden",
          paddingBottom: playgrounds && playgrounds.length > 0 ? (collapsed ? "16px" : "80px") : "0",
          minHeight: 0
        }}>
          {!playgrounds || playgrounds.length === 0 ? (
            collapsed ? (
              // When collapsed, show just a simple icon in the center
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "rgba(255, 255, 255, 0.4)"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </div>
            ) : (
              // When expanded, show the full message
              <div style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.6)"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  backdropFilter: "blur(10px)"
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {/* Folder/Workspace icon */}
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    {/* Plus icon for empty state */}
                    <line x1="12" y1="11" x2="12" y2="17" />
                    <line x1="9" y1="14" x2="15" y2="14" />
                  </svg>
                </div>
                <p style={{ fontSize: "14px", margin: "0 0 8px 0", fontWeight: "600" }}>No playgrounds yet</p>
                <p style={{ fontSize: "12px", margin: 0, opacity: 0.8 }}>Create your first playground to get started</p>
              </div>
            )
          ) : filteredPlaygrounds.length === 0 ? (
            collapsed ? (
              // When collapsed, show just a simple search icon in the center
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "rgba(255, 255, 255, 0.4)"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
            ) : (
              // When expanded, show the full message
              <div style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.6)"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  backdropFilter: "blur(10px)"
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <p style={{ fontSize: "14px", margin: "0 0 8px 0", fontWeight: "600" }}>No results found</p>
                <p style={{ fontSize: "12px", margin: 0, opacity: 0.8 }}>Try adjusting your search terms</p>
              </div>
            )
        ) : (
          <>
              {/* Playground Items */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                flex: 1,
                overflowY: "auto",
                padding: collapsed ? "8px 0" : "8px 2px 8px 2px",  // Add padding on both sides to prevent border clipping
                minHeight: 0
              }}>
                {currentPlaygrounds && currentPlaygrounds.length > 0 ? currentPlaygrounds.map((pg) => {


                  return (
                  <button
                    key={pg?.id || 'unknown'}
                    title={`${pg?.name || 'Unknown Playground'}${pg?.cronExpression ? `\nSchedule: ${pg.cronExpression}` : '\nManual execution'}${pg?.currentStatus === 'RUNNING' ? '\nStatus: Running (Green blinking dot)' : '\nStatus: Idle (Blue dot)'}${activePlaygroundId === pg.id ? '\nCurrently selected' : ''}`}
                    onClick={() => {
                      onSelectPlayground(pg);
                    }}
                style={{
                      padding: collapsed ? "14px" : "12px 14px",
                      textAlign: "left",
                      background: activePlaygroundId === pg.id 
                        ? (collapsed 
                          ? "rgba(59, 130, 246, 0.2)" 
                          : "rgba(255, 255, 255, 0.08)")
                        : (collapsed 
                          ? "rgba(255, 255, 255, 0.05)" 
                          : "rgba(255, 255, 255, 0.03)"),
                      border: activePlaygroundId === pg.id 
                        ? (collapsed 
                          ? "2px solid rgba(59, 130, 246, 0.8)" 
                          : "2px solid #1f2937")
                        : (collapsed 
                          ? "1px solid rgba(255, 255, 255, 0.1)" 
                          : "1px solid rgba(255, 255, 255, 0.08)"),
                      borderRadius: collapsed ? "16px" : "10px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: collapsed ? "0" : "10px",
                      backdropFilter: "blur(10px)",
                      boxShadow: activePlaygroundId === pg.id 
                        ? (collapsed 
                          ? "0 6px 20px rgba(59, 130, 246, 0.3)" 
                          : "0 4px 16px rgba(0, 0, 0, 0.2)")
                        : (collapsed 
                          ? "0 2px 8px rgba(0, 0, 0, 0.1)" 
                          : "none"),
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      msUserSelect: "none",
                      margin: activePlaygroundId === pg.id ? "0 2px" : "0",
                      position: "relative",
                      justifyContent: collapsed ? "center" : "flex-start",
                      width: collapsed ? "44px" : "auto",
                      height: collapsed ? "44px" : "auto",
                      minHeight: collapsed ? "44px" : "auto"
                    }}
                data-active={activePlaygroundId === pg.id}
                data-playground-id={pg.id}
                data-active-id={activePlaygroundId}
                onMouseEnter={(e) => {
                      // Only apply hover effects if this playground is NOT currently selected
                      if (activePlaygroundId !== pg.id) {
                        e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        e.target.style.border = "1px solid rgba(255, 255, 255, 0.15)";
                        e.target.style.transform = "translateY(-2px)";
                        e.target.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.15)";
                        e.target.style.margin = "0";
                      }
                }}
                onMouseLeave={(e) => {
                      // Always reset to the correct state based on selection
                      if (activePlaygroundId === pg.id) {
                        // Selected state - dark border
                        e.target.style.background = "rgba(255, 255, 255, 0.08)";
                        e.target.style.border = "2px solid #1f2937";
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.2)";
                        e.target.style.margin = "0 2px";
                      } else {
                        // Default state
                        e.target.style.background = "rgba(255, 255, 255, 0.03)";
                        e.target.style.border = "1px solid rgba(255, 255, 255, 0.08)";
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "none";
                        e.target.style.margin = "0";
                      }
                    }}
              >
                    <div 
                      className="status-dot"
                      style={{
                        width: collapsed ? "18px" : "10px",
                        height: collapsed ? "18px" : "10px",
                        backgroundColor: pg?.currentStatus === 'RUNNING' 
                          ? "#22c55e"  // Brighter green when running
                          : "#3b82f6", // Blue when idle (whether selected or not)
                        borderRadius: "50%",
                        flexShrink: 0,
                        transition: "all 0.3s ease",
                        animation: pg?.currentStatus === 'RUNNING' 
                          ? "runningDotPulse 1.5s ease-in-out infinite" 
                          : "none",
                        display: "block",
                        position: "relative",
                        zIndex: 10,
                        minWidth: collapsed ? "18px" : "10px",
                        minHeight: collapsed ? "18px" : "10px",
                        border: collapsed 
                          ? "2px solid rgba(255, 255, 255, 0.3)" 
                          : "1px solid rgba(255, 255, 255, 0.2)",
                        boxSizing: "border-box",
                        boxShadow: collapsed 
                          ? (pg?.currentStatus === 'RUNNING' 
                            ? "0 0 12px rgba(34, 197, 94, 0.6)" 
                            : "0 0 8px rgba(59, 130, 246, 0.4)")
                          : "none"
                      }} 
                      title={`${pg?.name || 'Unknown Playground'} - Status: ${pg?.currentStatus || 'UNKNOWN'} - ${pg?.currentStatus === 'RUNNING' ? 'Running (Green)' : 'Idle (Blue)'}`}
                    />
                {!collapsed && (
                  <>
                    <div style={{
                      flex: 1,
                      minWidth: 0
                    }}>
                      <div style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "white",
                            marginBottom: "2px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            MozUserSelect: "none",
                            msUserSelect: "none",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            textDecoration: "none"
                          }}>
                            {pg?.name || 'Unknown Playground'}
                      </div>
                      <div style={{
                            fontSize: "10px",
                            color: "rgba(255, 255, 255, 0.5)",
                            fontWeight: "500",
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            MozUserSelect: "none",
                            msUserSelect: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            textDecoration: "none"
                          }}>
                                                    {pg?.cronExpression ? (
                              <>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12,6 12,12 16,14" />
                                </svg>
                                <span style={{
                                  fontSize: "9px",
                                  opacity: 0.8,
                                  maxWidth: "120px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}>
                                  {explainCronExpression(pg.cronExpression)}
                                </span>
                              </>
                            ) : (
                              <>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="8" y1="12" x2="16" y2="12" />
                                </svg>
                                <span>Manual</span>
                              </>
                            )}

                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div style={{
                      display: "flex",
                      gap: "4px",
                      alignItems: "center"
                    }}>
                      {/* Edit Button */}
                      <div
                        onClick={(e) => handleEditPlayground(pg, e)}
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "6px",
                          color: "rgba(255, 255, 255, 0.5)",
                          cursor: "pointer",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "22px",
                          height: "22px",
                          transition: "all 0.2s ease",
                          flexShrink: 0,
                          opacity: "0.6"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "rgba(255, 255, 255, 0.12)";
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
                          e.target.style.color = "rgba(255, 255, 255, 0.8)";
                          e.target.style.transform = "scale(1.05)";
                          e.target.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "rgba(255, 255, 255, 0.06)";
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.color = "rgba(255, 255, 255, 0.5)";
                          e.target.style.transform = "scale(1)";
                          e.target.style.opacity = "0.6";
                        }}
                        title="Edit playground"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </div>

                      {/* Delete Button */}
                      <div
                        onClick={(e) => handleDeletePlayground(pg?.id, e)}
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "6px",
                          color: "rgba(255, 255, 255, 0.5)",
                          cursor: "pointer",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "22px",
                          height: "22px",
                          transition: "all 0.2s ease",
                          flexShrink: 0,
                          opacity: "0.6"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "rgba(255, 255, 255, 0.12)";
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
                          e.target.style.color = "rgba(255, 255, 255, 0.8)";
                          e.target.style.transform = "scale(1.05)";
                          e.target.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "rgba(255, 255, 255, 0.06)";
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.color = "rgba(255, 255, 255, 0.5)";
                          e.target.style.transform = "scale(1)";
                          e.target.style.opacity = "0.6";
                        }}
                        title="Delete playground"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                          <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </div>

                    </div>
                  </>
                )}
                  </button>
                  );
                }) : (
                  collapsed ? (
                    // When collapsed, show just a simple icon
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "16px 8px",
                      color: "rgba(255, 255, 255, 0.4)"
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                      </svg>
                    </div>
                  ) : (
                    // When expanded, show the full message
                    <div style={{
                      padding: "24px 16px",
                      textAlign: "center",
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: "12px"
                    }}>
                      No playgrounds on this page
                    </div>
                  )
                )}
              </div>

            </>
          )}
        </div>
      </div>

      {/* Pagination Controls - Fixed at Bottom */}
      {filteredPlaygrounds && filteredPlaygrounds.length > 0 && !collapsed && (
              <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(30, 41, 59, 0.95) 20%, rgba(30, 41, 59, 1) 100%)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          zIndex: 10
              }}>
                <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
              background: currentPage === 1 ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              color: currentPage === 1 ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.7)",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              padding: "6px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6" />
            </svg>
                </button>
                
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.7)",
            fontWeight: "500"
          }}>
            <span>{currentPage}</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span>{totalPages}</span>
          </div>
                
                <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{
              background: currentPage === totalPages ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              color: currentPage === totalPages ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.7)",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              padding: "6px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6" />
            </svg>
                </button>
              </div>
            )}

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

      {/* Edit Playground Modal */}
      <EditPlaygroundModal
        isOpen={editModal.isOpen}
        onClose={handleCloseEditModal}
        playground={editModal.playground}
        onSave={handleSavePlayground}
      />

      {/* UDF Modal */}
      <UDFModal
        isOpen={udfModal.isOpen}
        onClose={() => setUdfModal({ isOpen: false })}
      />

    </div>
  );
};

export default Sidebar;
