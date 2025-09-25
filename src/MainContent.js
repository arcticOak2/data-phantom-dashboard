import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "./AuthProvider";
import TaskManager from "./TaskManager";

const MainContent = ({ playground, runningStateManager, autoRefreshState }) => {
  const [tasks, setTasks] = useState([]); // Initialize as empty array
  const [loading, setLoading] = useState(false);


  if (!playground) {

    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "var(--neutral-500)", // Changed from #888
        textAlign: "center" // Added
      }}>
        <div style={{
          width: "64px", // New size
          height: "64px", // New size
          background: "var(--neutral-100)", // New background
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px"
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6" cy="12" r="3" />
            <circle cx="12" cy="12" r="3" />
            <circle cx="18" cy="12" r="3" />
            <path d="M9 12h3" />
            <path d="M15 12h3" />
          </svg>
        </div>
        <h3 style={{
          fontSize: "18px", // New font size
          fontWeight: "600",
          color: "var(--neutral-700)", // New color
          margin: "0 0 8px 0"
        }}>
          No Playground Selected
        </h3>
        <p style={{
          fontSize: "14px",
          margin: 0,
          maxWidth: "400px",
          lineHeight: "1.5"
        }}>
          Select a playground from the sidebar to begin working with your data
        </p>
      </div>
    );
  }



  return (
    <div style={{
      flex: 1,
      color: "var(--neutral-800)", // Changed from #fff
      minHeight: "100%",
      overflowY: "auto"
    }}>


      {/* Breadcrumb Style */}
      <div style={{
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "14px",
        color: "var(--neutral-600)"
      }}>
        <span>Workspace</span>
        <span>/</span>
        <span style={{ color: "var(--neutral-900)", fontWeight: "500" }}>
          {playground.name}
        </span>
      </div>

      {/* Task Management Section */}
      <TaskManager
        playground={playground}
        tasks={tasks}
        setTasks={setTasks}
        loading={loading}
        setLoading={setLoading}
        runningStateManager={runningStateManager}
        autoRefreshState={autoRefreshState}
      />
    </div>
  );
};

export default MainContent;
