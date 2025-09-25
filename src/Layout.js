import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MainContent from "./MainContent";

const Layout = ({ onSelectPlayground, onPlaygroundUpdated }) => {
  const [openPlaygrounds, setOpenPlaygrounds] = useState([]);
  const [activePlaygroundId, setActivePlaygroundId] = useState(null);
  const [selectedPlaygroundId, setSelectedPlaygroundId] = useState(null);
  const [runningStateManager, setRunningStateManager] = useState(null);
  const [autoRefreshStates, setAutoRefreshStates] = useState({}); // playgroundId -> { isActive: boolean, interval: number }
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleRunningStateChange = useCallback((manager) => {
    setRunningStateManager(manager);
  }, []);

  const handlePlaygroundDataUpdated = useCallback((updatedPlaygrounds) => {
    // Update open playgrounds with fresh data from sidebar
    setOpenPlaygrounds(prev => {
      const updated = prev.map(openPg => {
        const updatedPg = updatedPlaygrounds.find(up => up.id === openPg.id);
        if (updatedPg) {
          return updatedPg;
        }
        return openPg;
      });
      return updated;
    });
  }, []);

  // Tab-specific auto-refresh functions
  const startAutoRefresh = (playgroundId, intervalMs = 10000) => {
    const currentState = autoRefreshStates[playgroundId];
    if (currentState && currentState.interval) {
      clearInterval(currentState.interval);
    }

    const interval = setInterval(async () => {
      // Trigger refresh for this specific playground
      if (runningStateManager && runningStateManager.refreshPlaygrounds) {
        await runningStateManager.refreshPlaygrounds();
      }
    }, intervalMs);

    setAutoRefreshStates(prev => ({
      ...prev,
      [playgroundId]: { isActive: true, interval, currentInterval: intervalMs }
    }));
  };

  const stopAutoRefresh = (playgroundId) => {
    const currentState = autoRefreshStates[playgroundId];
    if (currentState && currentState.interval) {
      clearInterval(currentState.interval);
    }

    setAutoRefreshStates(prev => ({
      ...prev,
      [playgroundId]: { isActive: false, interval: null, currentInterval: null }
    }));
  };

  const isAutoRefreshActive = (playgroundId) => {
    return autoRefreshStates[playgroundId]?.isActive || false;
  };

  const getCurrentInterval = (playgroundId) => {
    return autoRefreshStates[playgroundId]?.currentInterval || null;
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const handlePlaygroundDeleted = useCallback((deletedPlaygroundId) => {
    // Stop auto-refresh for deleted playground
    stopAutoRefresh(deletedPlaygroundId);
    
    // Remove from open tabs
    setOpenPlaygrounds(prev => prev.filter(p => p.id !== deletedPlaygroundId));
    
    // If the deleted playground was active, switch to another tab or clear selection
    if (activePlaygroundId === deletedPlaygroundId) {
      const remainingPlaygrounds = openPlaygrounds.filter(p => p.id !== deletedPlaygroundId);
      if (remainingPlaygrounds.length > 0) {
        setActivePlaygroundId(remainingPlaygrounds[0].id);
        setSelectedPlaygroundId(remainingPlaygrounds[0].id);
      } else {
        setActivePlaygroundId(null);
        setSelectedPlaygroundId(null);
      }
    }
    
    // If the deleted playground was selected, clear selection
    if (selectedPlaygroundId === deletedPlaygroundId) {
      setSelectedPlaygroundId(null);
    }
  }, [openPlaygrounds, activePlaygroundId, selectedPlaygroundId]);

  const handlePlaygroundUpdated = useCallback((updatedPlayground) => {
    // Update the playground in open tabs
    setOpenPlaygrounds(prev => prev.map(p => 
      p.id === updatedPlayground.id ? updatedPlayground : p
    ));
    
    // Notify parent component about the update
    if (onPlaygroundUpdated) {
      onPlaygroundUpdated(updatedPlayground);
    }
  }, [onPlaygroundUpdated]);

  const handlePlaygroundSelect = useCallback((playground) => {
    // Stop auto refresh for the previously active playground when switching tabs
    if (activePlaygroundId && activePlaygroundId !== playground.id) {
      stopAutoRefresh(activePlaygroundId);
    }

    // Always set as selected playground (for sidebar highlighting)
    setSelectedPlaygroundId(playground.id);

    // Check if playground is already open
    const isAlreadyOpen = openPlaygrounds.find(p => p.id === playground.id);
    
    // Add playground to open tabs if not already open
    if (!isAlreadyOpen) {
      setOpenPlaygrounds(prev => [...prev, playground]);
    }
    
    // Set as active tab
    setActivePlaygroundId(playground.id);
    
    // Call parent's onSelectPlayground AFTER updating our state
    if (onSelectPlayground) {
      onSelectPlayground(playground);
    }
  }, [openPlaygrounds, onSelectPlayground, activePlaygroundId]);

  const closePlaygroundTab = (playgroundId, e) => {
    e.stopPropagation();
    
    // Stop auto refresh for the playground being closed
    stopAutoRefresh(playgroundId);
    
    setOpenPlaygrounds(prev => prev.filter(p => p.id !== playgroundId));
    
    // If we're closing the active tab, switch to another one
    if (activePlaygroundId === playgroundId) {
      const remainingPlaygrounds = openPlaygrounds.filter(p => p.id !== playgroundId);
      if (remainingPlaygrounds.length > 0) {
        setActivePlaygroundId(remainingPlaygrounds[0].id);
      } else {
        setActivePlaygroundId(null);
      }
    }
  };

  const getActivePlayground = () => {
    return openPlaygrounds.find(p => p.id === activePlaygroundId);
  };

  // Cleanup auto-refresh intervals on component unmount
  useEffect(() => {
    return () => {
      Object.values(autoRefreshStates).forEach(state => {
        if (state.interval) {
          clearInterval(state.interval);
        }
      });
    };
  }, []);

  // Keyboard shortcut for toggling sidebar (Ctrl/Cmd + B)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);





  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "inherit",
        background: "var(--neutral-50)",
        color: "var(--neutral-800)",
      }}
    >
      {/* Sidebar */}
      <div style={{ 
        flexShrink: 0,
        width: sidebarCollapsed ? '64px' : '340px',
        transition: 'width 0.3s ease-in-out'
      }}>
        <Sidebar 
          onSelectPlayground={handlePlaygroundSelect} 
          activePlaygroundId={selectedPlaygroundId}
          onPlaygroundDeleted={handlePlaygroundDeleted}
          onPlaygroundUpdated={handlePlaygroundUpdated}
          onRunningStateChange={handleRunningStateChange}
          onPlaygroundDataUpdated={handlePlaygroundDataUpdated}
          autoRefreshState={{
            isActive: isAutoRefreshActive(selectedPlaygroundId),
            start: () => startAutoRefresh(selectedPlaygroundId),
            stop: () => stopAutoRefresh(selectedPlaygroundId)
          }}
          collapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        minWidth: 0,
        transition: 'all 0.3s ease-in-out'
      }}>
        <Header onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        
        {/* Playground Tabs */}
        {openPlaygrounds.length > 0 && (
          <div style={{
            background: 'var(--neutral-100)',
            borderBottom: '1px solid var(--neutral-300)',
            padding: '8px 24px 0',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0',
            overflowX: 'auto',
            position: 'relative',
            minHeight: '48px',
            flexShrink: 0
          }}>
            {openPlaygrounds.map((playground) => (
              <div
                key={playground.id}
                onClick={() => {
                  setActivePlaygroundId(playground.id);
                  setSelectedPlaygroundId(playground.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px 16px',
                  background: activePlaygroundId === playground.id 
                    ? 'white' 
                    : 'var(--neutral-200)',
                  border: '1px solid',
                  borderColor: activePlaygroundId === playground.id 
                    ? 'var(--neutral-300)' 
                    : 'var(--neutral-300)',
                  borderBottom: activePlaygroundId === playground.id 
                    ? '1px solid white' 
                    : '1px solid var(--neutral-300)',
                  color: activePlaygroundId === playground.id 
                    ? 'var(--neutral-900)' 
                    : 'var(--neutral-600)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  minWidth: 'fit-content',
                  maxWidth: '250px',
                  position: 'relative',
                  borderRadius: '8px 8px 0 0',
                  marginRight: '2px',
                  boxShadow: activePlaygroundId === playground.id 
                    ? '0 -2px 8px rgba(0, 0, 0, 0.1)' 
                    : 'none',
                  zIndex: activePlaygroundId === playground.id ? 2 : 1
                }}
                onMouseEnter={(e) => {
                  if (activePlaygroundId !== playground.id) {
                    e.currentTarget.style.background = 'var(--neutral-150)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePlaygroundId !== playground.id) {
                    e.currentTarget.style.background = 'var(--neutral-200)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  flex: 1
                }}>
                  <span 
                    title={playground.name}
                    style={{
                      fontSize: '13px',
                      fontWeight: activePlaygroundId === playground.id ? '600' : '500',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.3px',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'inline-block'
                    }}
                  >
                    {playground.name}
                  </span>
                  

                </div>
                
                <button
                  onClick={(e) => closePlaygroundTab(playground.id, e)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    transition: 'all 0.2s ease',
                    opacity: '0.7'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(0, 0, 0, 0.1)';
                    e.target.style.opacity = '1';
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.opacity = '0.7';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            
            {/* Tab Background Extension */}
            <div style={{
              position: 'absolute',
              bottom: '-1px',
              left: '0',
              right: '0',
              height: '1px',
              background: 'var(--neutral-300)',
              zIndex: 1
            }} />
          </div>
        )}
        
        <div
          style={{
            padding: "24px",
            background: "var(--neutral-50)",
            flex: 1,
            overflowY: "auto",
          }}
        >
          <MainContent 
            playground={getActivePlayground()}
            runningStateManager={runningStateManager}
            autoRefreshState={{
              isActive: isAutoRefreshActive(activePlaygroundId),
              currentInterval: getCurrentInterval(activePlaygroundId),
              start: () => startAutoRefresh(activePlaygroundId),
              startWithInterval: (intervalMs) => startAutoRefresh(activePlaygroundId, intervalMs),
              stop: () => stopAutoRefresh(activePlaygroundId)
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Layout;
