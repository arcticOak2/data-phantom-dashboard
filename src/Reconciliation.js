import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthProvider';

const Reconciliation = ({ tasks, playground }) => {
  const { token } = useContext(AuthContext);
  const [taskPairs, setTaskPairs] = useState([]);
  const [selectedTask1, setSelectedTask1] = useState(null);
  const [selectedTask2, setSelectedTask2] = useState(null);
  const [task1Fields, setTask1Fields] = useState([]);
  const [task2Fields, setTask2Fields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fieldMappings, setFieldMappings] = useState({});
  const [selectedSourceField, setSelectedSourceField] = useState(null);
  const [selectedTargetField, setSelectedTargetField] = useState(null);
  const [sourceFieldSearch, setSourceFieldSearch] = useState('');
  const [targetFieldSearch, setTargetFieldSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [viewingMapping, setViewingMapping] = useState(null);
  const [showRunConfirmModal, setShowRunConfirmModal] = useState(false);
  const [selectedPairForRun, setSelectedPairForRun] = useState(null);
  const [reconciliationResults, setReconciliationResults] = useState({});
  const [loadingResults, setLoadingResults] = useState({});
  const [resultError, setResultError] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [activePreviewTab, setActivePreviewTab] = useState('common');
  const [previewStates, setPreviewStates] = useState({
    common: { loading: false, data: null, error: null, permanentError: false },
    leftExclusive: { loading: false, data: null, error: null, permanentError: false },
    rightExclusive: { loading: false, data: null, error: null, permanentError: false }
  });
  const [showTooltip, setShowTooltip] = useState(false);

  // Safe tasks array
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Filter fields based on search terms and sort with mapped/selected first
  const filteredSourceFields = task1Fields
    .filter(field => field.toLowerCase().includes(sourceFieldSearch.toLowerCase()))
    .sort((a, b) => {
      // Mapped fields first (sorted alphabetically within mapped group)
      const aMapped = fieldMappings[a] ? 1 : 0;
      const bMapped = fieldMappings[b] ? 1 : 0;
      if (aMapped !== bMapped) return bMapped - aMapped;
      
      // Selected field second (only one selected field, so no need to sort within this group)
      const aSelected = selectedSourceField === a ? 1 : 0;
      const bSelected = selectedSourceField === b ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      
      // All other fields sorted alphabetically
      return a.localeCompare(b);
    });
  
  const filteredTargetFields = task2Fields
    .filter(field => field.toLowerCase().includes(targetFieldSearch.toLowerCase()))
    .sort((a, b) => {
      // Mapped fields first (sorted alphabetically within mapped group)
      const aMapped = Object.values(fieldMappings).includes(a) ? 1 : 0;
      const bMapped = Object.values(fieldMappings).includes(b) ? 1 : 0;
      if (aMapped !== bMapped) return bMapped - aMapped;
      
      // Selected field second (only one selected field, so no need to sort within this group)
      const aSelected = selectedTargetField === a ? 1 : 0;
      const bSelected = selectedTargetField === b ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      
      // All other fields sorted alphabetically
      return a.localeCompare(b);
    });

  // Load existing mappings when playground changes
  useEffect(() => {
    if (playground?.id) {
      loadExistingMappings();
    }
  }, [playground?.id]);

  // Poll for reconciliation results when task pairs are loaded
  useEffect(() => {
    if (taskPairs.length > 0) {
      // Check for results immediately
      checkAllReconciliationResults();
      
      // Set up polling every 30 seconds
      const interval = setInterval(checkAllReconciliationResults, 30000);
      
      return () => clearInterval(interval);
    }
  }, [taskPairs]);

  // Fetch selected fields for a task
  const fetchTaskFields = async (taskId) => {
    if (!taskId || !token) return [];
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/task/fields/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.selectedFields) {
          return data.selectedFields;
        }
      }
      return [];
    } catch (error) {
      console.error('Error fetching task fields:', error);
      return [];
    }
  };

  // API Functions for Reconciliation Mappings
  const saveReconciliationMapping = async (playgroundId, leftTableId, rightTableId, map) => {
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/reconciliation-mapping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        playgroundId,
        leftTableId,
        rightTableId,
        map: JSON.stringify(map)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save reconciliation mapping');
    }
    return data;
  };

  const loadReconciliationMappings = async (playgroundId) => {
    if (!token || !playgroundId) return [];
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/reconciliation-mapping/playground/${playgroundId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading reconciliation mappings:', error);
      return [];
    }
  };

  const updateReconciliationMapping = async (reconciliationId, map) => {
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/reconciliation-mapping/${reconciliationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        map: JSON.stringify(map)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update reconciliation mapping');
    }
    return data;
  };

  const deleteReconciliationMapping = async (reconciliationId) => {
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/reconciliation-mapping/${reconciliationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete reconciliation mapping');
    }
    return data;
  };

  // API Function to fetch reconciliation results
  const fetchReconciliationResult = async (reconciliationId) => {
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/reconciliation-result/${reconciliationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Reconciliation result not found');
      } else if (response.status === 400) {
        throw new Error('Invalid reconciliation ID format');
      } else if (response.status === 500) {
        throw new Error('Database error occurred');
      } else {
        throw new Error(data.error || 'Failed to fetch reconciliation result');
      }
    }
    return data;
  };

  // API Function to run reconciliation
  const runReconciliation = async (reconciliationId) => {
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/reconciliation-run/${reconciliationId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 400) {
        throw new Error('Invalid reconciliation ID format');
      } else if (response.status === 500) {
        throw new Error('Failed to start reconciliation run: ' + errorText);
      } else {
        throw new Error(errorText || 'Failed to start reconciliation run');
      }
    }
    
    return response.text(); // Returns "Reconciliation run started successfully"
  };

  // API Function to get reconciliation status
  const getReconciliationStatus = async (reconciliationId) => {
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/reconciliation-status/${reconciliationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Invalid reconciliation ID format');
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch reconciliation status');
      }
    }
    
    return response.json();
  };

  // Handle task 1 selection
  const handleTask1Selection = async (taskId) => {
    setSelectedTask1(taskId);
    setSelectedTask2(null); // Reset task 2 when task 1 changes
    setTask2Fields([]);
    setFieldMappings({});
    setSelectedSourceField(null);
    setSelectedTargetField(null);
    setSourceFieldSearch('');
    setTargetFieldSearch('');
    
    if (taskId) {
      setLoading(true);
      const fields = await fetchTaskFields(taskId);
      setTask1Fields(fields);
      setLoading(false);
    } else {
      setTask1Fields([]);
    }
  };

  // Handle task 2 selection
  const handleTask2Selection = async (taskId) => {
    setSelectedTask2(taskId);
    setFieldMappings({});
    setSelectedSourceField(null);
    setSelectedTargetField(null);
    setSourceFieldSearch('');
    setTargetFieldSearch('');
    
    if (taskId) {
      setLoading(true);
      const fields = await fetchTaskFields(taskId);
      setTask2Fields(fields);
      setLoading(false);
    } else {
      setTask2Fields([]);
    }
  };

  // Add new task pair
  const addTaskPair = async () => {
    if (!selectedTask1 || !selectedTask2) {
      setError('Please select both tasks before adding a pair');
      return;
    }

    if (Object.keys(fieldMappings).length === 0) {
      setError('Please create at least one field mapping before adding a pair');
      return;
    }

    const task1 = safeTasks.find(t => t.id === selectedTask1);
    const task2 = safeTasks.find(t => t.id === selectedTask2);

    if (!task1 || !task2) {
      setError('Selected tasks not found');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingMapping) {
        // Update existing mapping
        await updateReconciliationMapping(editingMapping.reconciliationId, fieldMappings);
      } else {
        // Create new mapping
        await saveReconciliationMapping(
          playground.id,
          selectedTask1,
          selectedTask2,
          fieldMappings
        );
      }

      // Reload mappings to get the updated list
      await loadExistingMappings();
      
      // Close modal and reset state
      closeModal();

    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Load existing mappings from backend
  const loadExistingMappings = async () => {
    if (!playground?.id) return;
    
    setLoadingMappings(true);
    try {
      const mappings = await loadReconciliationMappings(playground.id);
      
      // Transform backend data to frontend format
      const transformedPairs = mappings.map(mapping => {
        const task1 = safeTasks.find(t => t.id === mapping.leftTableId);
        const task2 = safeTasks.find(t => t.id === mapping.rightTableId);
        
        return {
          reconciliationId: mapping.reconciliationId,
          task1: {
            id: mapping.leftTableId,
            name: task1?.name || 'Unknown Task',
            fields: []
          },
          task2: {
            id: mapping.rightTableId,
            name: task2?.name || 'Unknown Task',
            fields: []
          },
          mappings: JSON.parse(mapping.mapping),
          createdAt: mapping.createdAt,
          updatedAt: mapping.updatedAt
        };
      });
      
      setTaskPairs(transformedPairs);
    } catch (error) {
      setError('Failed to load existing mappings: ' + error.message);
    } finally {
      setLoadingMappings(false);
    }
  };

  // Remove task pair
  const removeTaskPair = async (reconciliationId) => {
    if (!reconciliationId) return;
    
    try {
      await deleteReconciliationMapping(reconciliationId);
      await loadExistingMappings(); // Reload to get updated list
    } catch (error) {
      setError('Failed to delete mapping: ' + error.message);
    }
  };

  // Update field mapping
  const updateFieldMapping = (task1Field, task2Field) => {
    setFieldMappings(prev => ({
      ...prev,
      [task1Field]: task2Field
    }));
  };

  // Handle field click for mapping
  const handleFieldClick = (sourceField, targetField) => {
    if (sourceField && targetField) {
      updateFieldMapping(sourceField, targetField);
    }
  };

  // Handle source field selection
  const handleSourceFieldSelection = (field) => {
    setSelectedSourceField(field);
    setError(null); // Clear any existing errors
  };

  // Handle target field selection
  const handleTargetFieldSelection = (field) => {
    setSelectedTargetField(field);
    setError(null); // Clear any existing errors
  };

  // Confirm field pair
  const confirmFieldPair = () => {
    if (selectedSourceField && selectedTargetField) {
      updateFieldMapping(selectedSourceField, selectedTargetField);
      setSelectedSourceField(null);
      setSelectedTargetField(null);
    }
  };

  // Reset modal state
  const resetModalState = () => {
    setSelectedTask1(null);
    setSelectedTask2(null);
    setTask1Fields([]);
    setTask2Fields([]);
    setFieldMappings({});
    setSelectedSourceField(null);
    setSelectedTargetField(null);
    setSourceFieldSearch('');
    setTargetFieldSearch('');
    setError(null);
  };

  // Close modal
  const closeModal = () => {
    setShowCreateModal(false);
    setEditingMapping(null);
    setViewingMapping(null);
    resetModalState();
  };

  // Open modal in edit mode
  const openEditModal = async (mapping) => {
    setEditingMapping(mapping);
    setSelectedTask1(mapping.task1.id);
    setSelectedTask2(mapping.task2.id);
    setFieldMappings(mapping.mappings);
    
    // Load fields for both tasks
    setLoading(true);
    try {
      const [fields1, fields2] = await Promise.all([
        fetchTaskFields(mapping.task1.id),
        fetchTaskFields(mapping.task2.id)
      ]);
      setTask1Fields(fields1);
      setTask2Fields(fields2);
    } catch (error) {
      setError('Failed to load task fields: ' + error.message);
    } finally {
      setLoading(false);
    }
    
    setShowCreateModal(true);
  };

  // Open modal in view mode
  const openViewModal = async (mapping) => {
    // Check if reconciliation results are available
    if (reconciliationResults[mapping.reconciliationId]) {
      // Show reconciliation results instead of mapping
      openResultsModal(mapping);
      return;
    }
    
    // Otherwise show the mapping as before
    setViewingMapping(mapping);
    setSelectedTask1(mapping.task1.id);
    setSelectedTask2(mapping.task2.id);
    setFieldMappings(mapping.mappings);
    
    // Load fields for both tasks
    setLoading(true);
    try {
      const [fields1, fields2] = await Promise.all([
        fetchTaskFields(mapping.task1.id),
        fetchTaskFields(mapping.task2.id)
      ]);
      setTask1Fields(fields1);
      setTask2Fields(fields2);
    } catch (error) {
      setError('Failed to load task fields: ' + error.message);
    } finally {
      setLoading(false);
    }
    
    setShowCreateModal(true);
  };

  // Remove field mapping
  const removeFieldMapping = (task1Field) => {
    setFieldMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[task1Field];
      return newMappings;
    });
  };

  // Handle run reconciliation with confirmation
  const handleRunReconciliation = (reconciliationId, taskPair) => {
    setSelectedPairForRun({ reconciliationId, taskPair });
    setShowRunConfirmModal(true);
  };

  // Confirm and run reconciliation
  const confirmRunReconciliation = async () => {
    if (!selectedPairForRun) return;
    
    const { reconciliationId } = selectedPairForRun;
    
    try {
      setError(null);
      await runReconciliation(reconciliationId);
      
      // Show success message
      setError('Reconciliation run started successfully!');
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
      
      // Optionally refresh the reconciliation results after a short delay
      setTimeout(() => {
        checkAllReconciliationResults();
      }, 2000);
      
    } catch (error) {
      setError('Failed to start reconciliation run: ' + error.message);
    } finally {
      setShowRunConfirmModal(false);
      setSelectedPairForRun(null);
    }
  };

  // Cancel run reconciliation
  const cancelRunReconciliation = () => {
    setShowRunConfirmModal(false);
    setSelectedPairForRun(null);
  };

  // Check all reconciliation statuses
  const checkAllReconciliationResults = async () => {
    if (!token || taskPairs.length === 0) return;
    
    const promises = taskPairs.map(async (pair) => {
      try {
        const statusResponse = await getReconciliationStatus(pair.reconciliationId);
        
        // Update the reconciliation results with status information
        setReconciliationResults(prev => ({ 
          ...prev, 
          [pair.reconciliationId]: {
            status: statusResponse.status,
            message: statusResponse.message,
            executionTimestamp: statusResponse.executionTimestamp,
            reconciliationMethod: statusResponse.reconciliationMethod
          }
        }));
        
        // If status is SUCCESS, also fetch the full reconciliation result for detailed data
        if (statusResponse.status === 'SUCCESS') {
          try {
            const resultResponse = await fetchReconciliationResult(pair.reconciliationId);
            setReconciliationResults(prev => ({ 
              ...prev, 
              [pair.reconciliationId]: {
                ...prev[pair.reconciliationId],
                ...resultResponse.data // Merge in the full result data
              }
            }));
          } catch (resultError) {
            // If we can't fetch the full result, keep the status info
            console.warn(`Could not fetch full result for ${pair.reconciliationId}:`, resultError.message);
          }
        }
      } catch (error) {
        // Log errors but don't remove existing status
        console.error(`Error fetching status for ${pair.reconciliationId}:`, error.message);
        
        // Set a default status for errors
        setReconciliationResults(prev => ({ 
          ...prev, 
          [pair.reconciliationId]: {
            status: 'FAILED',
            message: 'Unable to determine status'
          }
        }));
      }
    });
    
    await Promise.allSettled(promises);
  };

  // Open results modal
  const openResultsModal = (pair) => {
    console.log('Opening results modal for pair:', pair);
    const result = reconciliationResults[pair.reconciliationId];
    
    // Only open modal if we have detailed result data (not just status)
    // Check if we have the detailed result data by looking for row count fields
    if (!result || (result.leftFileRowCount === undefined && result.rightFileRowCount === undefined)) {
      setError('Detailed reconciliation results are not available yet. Please wait for the reconciliation to complete.');
      return;
    }
    console.log('Found result:', result);
    console.log('Available S3 paths:', {
      sampleCommonRowsS3Path: result.sampleCommonRowsS3Path,
      sampleExclusiveLeftRowsS3Path: result.sampleExclusiveLeftRowsS3Path,
      sampleExclusiveRightRowsS3Path: result.sampleExclusiveRightRowsS3Path
    });
    
    if (result) {
      console.log('Setting modal state...');
      setSelectedResult({ pair, result });
      setShowResultsModal(true);
      
      // Determine the first available tab
      let defaultTab = 'common';
      if (!result.sampleCommonRowsS3Path) {
        if (result.sampleExclusiveLeftRowsS3Path) {
          defaultTab = 'leftExclusive';
        } else if (result.sampleExclusiveRightRowsS3Path) {
          defaultTab = 'rightExclusive';
        }
      }
      
      setActivePreviewTab(defaultTab);
      console.log('Modal state set, activePreviewTab should be:', defaultTab);
    }
  };

  // Close results modal
  const closeResultsModal = () => {
    setShowResultsModal(false);
    setSelectedResult(null);
    setActivePreviewTab('common');
    setPreviewStates({
      common: { loading: false, data: null, error: null, permanentError: false },
      leftExclusive: { loading: false, data: null, error: null, permanentError: false },
      rightExclusive: { loading: false, data: null, error: null, permanentError: false }
    });
  };

  // Function to parse CSV data properly for reconciliation results
  const parseCSV = (csvText, fieldMappings = null) => {
    if (!csvText || typeof csvText !== 'string') return { headers: [], rows: [] };
    
    // Handle the special reconciliation CSV format
    // Example: ["460764|33 (Count: 1)","461649|208631 (Count: 1)",...] or ["value1 (Count: 2)","value2 (Count: 1)",...]
    // Or new format: ["460922 (Left: 1, Right: 1)","456868 (Left: 1, Right: 1)",...]
    if (csvText.includes('(Count:') || csvText.includes('(Left:') || csvText.includes('(Right:')) {
      return parseReconciliationCSV(csvText, fieldMappings);
    }
    
    // Handle regular CSV format
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    // Detect delimiter (comma or tab)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const delimiter = tabCount > commaCount ? '\t' : ',';
    
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
    
    return { headers, rows };
  };

  // Function to parse reconciliation-specific CSV format
  const parseReconciliationCSV = (csvText, fieldMappings = null) => {
    try {
      // Parse the JSON array format
      const dataArray = JSON.parse(csvText);
      
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return { headers: [], rows: [] };
      }
      
      // Extract headers from the first row to determine column count
      const firstRow = dataArray[0];
      const pipeCount = (firstRow.match(/\|/g) || []).length;
      const columnCount = pipeCount + 1; // +1 because pipe count + 1 = column count
      
      // Create headers based on field mappings or fallback to generic names
      const headers = [];
      if (fieldMappings && Object.keys(fieldMappings).length > 0) {
        // Use the source field names from the mapping as headers
        const sourceFields = Object.keys(fieldMappings);
        for (let i = 0; i < columnCount; i++) {
          headers.push(sourceFields[i] || `Column ${i + 1}`);
        }
      } else {
        // Fallback to generic column names
        for (let i = 1; i <= columnCount; i++) {
          headers.push(`Column ${i}`);
        }
      }
      
      // Parse each row and expand based on count
      const rows = [];
      dataArray.forEach(row => {
        let count = 0;
        let dataPart = '';
        
        // Check for new format: "value (Left: X, Right: Y)"
        const leftRightMatch = row.match(/\(Left:\s*(\d+),\s*Right:\s*(\d+)\)$/);
        if (leftRightMatch) {
          const leftCount = parseInt(leftRightMatch[1]);
          const rightCount = parseInt(leftRightMatch[2]);
          // Left: 2, Right: 2 means 2 identical rows exist in both datasets, so show 2 times
          count = Math.max(leftCount, rightCount);
          dataPart = row.replace(/\s*\(Left:\s*\d+,\s*Right:\s*\d+\)$/, '');
        } else {
          // Check for old format: "value1|value2|value3 (Count: N)"
          const countMatch = row.match(/\(Count:\s*(\d+)\)$/);
          count = countMatch ? parseInt(countMatch[1]) : 0;
          dataPart = row.replace(/\s*\(Count:\s*\d+\)$/, '');
        }
        
        // Split by pipe delimiter (if any)
        const values = dataPart.split('|');
        
        // Add the row 'count' number of times
        for (let i = 0; i < count; i++) {
          rows.push([...values]);
        }
      });
      
      return { headers, rows };
    } catch (error) {
      console.error('Error parsing reconciliation CSV:', error);
      return { headers: [], rows: [] };
    }
  };

  // Function to detect if content is CSV-like
  const isCSVContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    
    // Check for reconciliation CSV format first
    // This handles both single column (no pipes) and multi-column (with pipes) data
    // Also handles both (Count: N) and (Left: X, Right: Y) formats
    if (content.includes('(Count:') || content.includes('(Left:') || content.includes('(Right:')) {
      try {
        const parsed = JSON.parse(content);
        // Check if it's an array of strings with the reconciliation format
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstItem = parsed[0];
          if (typeof firstItem === 'string' && 
              (firstItem.includes('(Count:') || firstItem.includes('(Left:') || firstItem.includes('(Right:'))) {
            return true; // Valid JSON array with reconciliation format
          }
        }
        return false;
      } catch {
        return false;
      }
    }
    
    // Check for regular CSV format
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) return false;
    
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    const isCSV = commaCount > 0 || tabCount > 0;
    
    return isCSV;
  };

  // API function to fetch S3 file preview
  const fetchS3Preview = useCallback(async (s3Location, type) => {
    if (!s3Location || !token) return;
    
    setPreviewStates(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, error: null }
    }));
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/preview/${encodeURIComponent(s3Location)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const previewText = data.preview?.join('\n') || '';
        
        // Parse CSV with field mappings
        const isCSV = isCSVContent(previewText);
        const parsedData = isCSV ? parseCSV(previewText, selectedResult?.pair?.mappings) : null;
        
        setPreviewStates(prev => ({
          ...prev,
          [type]: { 
            loading: false, 
            data: { 
              ...data, 
              isCSV, 
              parsedData,
              rawText: previewText
            }, 
            error: null 
          }
        }));
      } else if (response.status === 404) {
        // Handle file not found specifically - set permanent error state
        setPreviewStates(prev => ({
          ...prev,
          [type]: { loading: false, error: 'File not found', data: null, permanentError: true }
        }));
      } else {
        throw new Error(`Failed to fetch preview: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error fetching ${type} preview:`, error);
      setPreviewStates(prev => ({
        ...prev,
        [type]: { 
          loading: false, 
          error: error.message, 
          data: null, 
          permanentError: error.message.includes('404') || error.message.includes('not found') 
        }
      }));
    }
  }, [token, selectedResult?.pair?.mappings]);

  // Load first available tab immediately when modal opens
  useEffect(() => {
    console.log('Modal useEffect triggered:', {
      showResultsModal,
      selectedResult: !!selectedResult,
      activePreviewTab,
      hasS3Path: selectedResult?.result?.sampleCommonRowsS3Path,
      hasData: !!previewStates.common.data,
      isLoading: previewStates.common.loading
    });
    
    if (showResultsModal && selectedResult) {
      const { result } = selectedResult;
      
      // Check which tabs have data available
      const availableTabs = [];
      if (result.sampleCommonRowsS3Path) availableTabs.push({ type: 'common', path: result.sampleCommonRowsS3Path });
      if (result.sampleExclusiveLeftRowsS3Path) availableTabs.push({ type: 'leftExclusive', path: result.sampleExclusiveLeftRowsS3Path });
      if (result.sampleExclusiveRightRowsS3Path) availableTabs.push({ type: 'rightExclusive', path: result.sampleExclusiveRightRowsS3Path });
      
      console.log('Available tabs:', availableTabs);
      
      // Load the first available tab that matches the active tab
      const tabToLoad = availableTabs.find(tab => tab.type === activePreviewTab);
      
      if (tabToLoad && !previewStates[tabToLoad.type].data && !previewStates[tabToLoad.type].loading && !previewStates[tabToLoad.type].permanentError) {
        console.log(`Loading ${tabToLoad.type} from:`, tabToLoad.path);
        fetchS3Preview(tabToLoad.path, tabToLoad.type);
      } else if (availableTabs.length > 0 && !tabToLoad) {
        // If the active tab doesn't have data, switch to the first available tab
        const firstAvailable = availableTabs[0];
        console.log(`Switching to first available tab: ${firstAvailable.type}`);
        setActivePreviewTab(firstAvailable.type);
      }
    }
  }, [showResultsModal, selectedResult, activePreviewTab, fetchS3Preview]);

  // Load preview when switching tabs
  useEffect(() => {
    if (showResultsModal && selectedResult) {
      const { result } = selectedResult;
      
      if (activePreviewTab === 'leftExclusive' && result.sampleExclusiveLeftRowsS3Path && !previewStates.leftExclusive.data && !previewStates.leftExclusive.loading && !previewStates.leftExclusive.permanentError) {
        fetchS3Preview(result.sampleExclusiveLeftRowsS3Path, 'leftExclusive');
      } else if (activePreviewTab === 'rightExclusive' && result.sampleExclusiveRightRowsS3Path && !previewStates.rightExclusive.data && !previewStates.rightExclusive.loading && !previewStates.rightExclusive.permanentError) {
        fetchS3Preview(result.sampleExclusiveRightRowsS3Path, 'rightExclusive');
      }
    }
  }, [activePreviewTab, showResultsModal, selectedResult, fetchS3Preview]);

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--neutral-200)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
      {/* Content */}
      <div style={{ padding: '32px' }}>
        {/* Header Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--neutral-200)'
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '8px'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--neutral-900)'
              }}>
                Reconciliation Mappings
              </h2>
              <div style={{
                position: 'relative',
                display: 'inline-block'
              }}>
                <button
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--primary-100)',
                    border: '1px solid var(--primary-200)',
                    color: 'var(--primary-600)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--primary-200)';
                    e.target.style.color = 'var(--primary-700)';
                    setShowTooltip(true);
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'var(--primary-100)';
                    e.target.style.color = 'var(--primary-600)';
                    setShowTooltip(false);
                  }}
                >
                  i
                </button>
                
                {/* Custom Tooltip */}
                {showTooltip && (
                  <div style={{
                    position: 'absolute',
                    top: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--neutral-900)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid var(--neutral-700)'
                  }}>
                    Reconciliation will run automatically at the end of DAG execution
                    {/* Tooltip Arrow */}
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderBottom: '6px solid var(--neutral-900)'
                    }}></div>
                  </div>
                )}
              </div>
            </div>
            <p style={{
              margin: 0,
              fontSize: '16px',
              color: 'var(--neutral-600)',
              lineHeight: '1.5'
            }}>
              Create and manage field mappings between tasks for data reconciliation
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '6px 10px',
              background: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#4B5563';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#374151';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create New Mapping
          </button>
        </div>

        {/* Existing Task Pairs */}
        {loadingMappings ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--neutral-500)',
            background: 'var(--neutral-50)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--neutral-200)'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>Loading existing mappings...</div>
          </div>
        ) : taskPairs.length > 0 ? (
          <div>
            
            <div style={{
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--neutral-200)',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Table Header */}
              <div style={{
                background: 'var(--neutral-50)',
                borderBottom: '1px solid var(--neutral-200)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--neutral-600)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '50%',
                  textAlign: 'left'
                }}>
                  Task Pair
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--neutral-600)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '20%',
                  textAlign: 'left'
                }}>
                  Mappings
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--neutral-600)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '20%',
                  textAlign: 'left'
                }}>
                  Status
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--neutral-600)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '15%',
                  textAlign: 'center'
                }}>
                  Actions
                </div>
              </div>

              {/* Table Rows */}
              <div>
                {taskPairs.map((pair, index) => (
                  <div key={pair.reconciliationId} style={{
                    padding: '20px 24px',
                    borderBottom: index < taskPairs.length - 1 ? '1px solid var(--neutral-200)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--neutral-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                  >
                    {/* Task Pair */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative',
                      width: '50%'
                    }}>
                      {/* Task 1 Box */}
                      <div style={{
                        padding: '8px 12px',
                        background: 'var(--primary-50)',
                        color: 'var(--primary-700)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: '1px solid var(--primary-200)',
                        flex: '0 0 auto',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {pair.task1.name}
                      </div>
                      
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--neutral-400)', flex: '0 0 auto' }}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      
                      {/* Task 2 Box */}
                      <div style={{
                        padding: '8px 12px',
                        background: 'var(--success-50)',
                        color: 'var(--success-700)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: '1px solid var(--success-200)',
                        flex: '0 0 auto',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {pair.task2.name}
                      </div>
                    </div>

                    {/* Mappings Count */}
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--neutral-700)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '20%'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primary-600)' }}>
                        <path d="M9 12l2 2 4-4" />
                        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                        <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                        <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                      </svg>
                      {Object.keys(pair.mappings).length} fields
                    </div>

                    {/* Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '20%'
                    }}>
                      {reconciliationResults[pair.reconciliationId] ? (
                        <>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            background: 
                              reconciliationResults[pair.reconciliationId].status === 'SUCCESS' ? 'var(--success-500)' :
                              reconciliationResults[pair.reconciliationId].status === 'RUNNING' ? 'var(--primary-500)' :
                              reconciliationResults[pair.reconciliationId].status === 'FAILED' ? 'var(--error-500)' :
                              'var(--warning-500)',
                            borderRadius: '50%',
                            animation: reconciliationResults[pair.reconciliationId].status === 'RUNNING' ? 'pulse 2s infinite' : 'none'
                          }}></div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '500',
                            color: 
                              reconciliationResults[pair.reconciliationId].status === 'SUCCESS' ? 'var(--success-700)' :
                              reconciliationResults[pair.reconciliationId].status === 'RUNNING' ? 'var(--primary-700)' :
                              reconciliationResults[pair.reconciliationId].status === 'FAILED' ? 'var(--error-700)' :
                              'var(--warning-700)'
                          }}>
                            {reconciliationResults[pair.reconciliationId].status === 'SUCCESS' ? 'Completed' :
                             reconciliationResults[pair.reconciliationId].status === 'RUNNING' ? 'Running' :
                             reconciliationResults[pair.reconciliationId].status === 'FAILED' ? 'Failed' :
                             'Unknown'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            background: 'var(--neutral-400)',
                            borderRadius: '50%'
                          }}></div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '500',
                            color: 'var(--neutral-600)'
                          }}>
                            Not Started
                          </span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '15%'
                    }}>
                      <button
                        onClick={() => handleRunReconciliation(pair.reconciliationId, pair)}
                        style={{
                          padding: '8px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--warning-100)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                        title="Run reconciliation now"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--warning-600)' }}>
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openViewModal(pair)}
                        style={{
                          padding: '8px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--success-100)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                        title="View mapping"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--success-600)' }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEditModal(pair)}
                        style={{
                          padding: '8px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--primary-100)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                        title="Edit mapping"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primary-600)' }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeTaskPair(pair.reconciliationId)}
                        style={{
                          padding: '8px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--error-100)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                        title="Delete mapping"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--error-600)' }}>
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}


        {/* Empty State */}
        {!loadingMappings && taskPairs.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 40px',
            background: 'var(--neutral-50)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--neutral-200)',
            marginTop: '24px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'var(--primary-100)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--primary-600)' }}>
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
              </svg>
            </div>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--neutral-800)'
            }}>
              No reconciliation mappings yet
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '16px',
              color: 'var(--neutral-600)',
              lineHeight: '1.5',
              maxWidth: '400px',
              margin: '0 auto 24px auto'
            }}>
              Create your first reconciliation mapping to start comparing data between tasks
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '12px 24px',
                background: 'var(--primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--primary-700)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--primary-600)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create Your First Mapping
            </button>
          </div>
        )}
      </div>

      {/* Create Mapping Modal */}
      {showCreateModal && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--neutral-200)',
              background: 'var(--neutral-50)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--neutral-900)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                  <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                  <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                </svg>
{viewingMapping ? 'View Reconciliation Mapping' : editingMapping ? 'Edit Reconciliation Mapping' : 'Create Reconciliation Mapping'}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  color: 'var(--neutral-500)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--neutral-200)';
                  e.target.style.color = 'var(--neutral-700)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'var(--neutral-500)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '24px',
              overflow: 'auto',
              flex: 1
            }}>
              <div>
                {/* Task Selection Section */}
                {!viewingMapping && (
                  <div style={{
                    background: 'var(--neutral-50)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: '1px solid var(--neutral-200)',
                    marginBottom: '24px'
                  }}>
                    <h4 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'var(--neutral-900)'
                    }}>
                      Select Task Pair
                    </h4>
                  
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '20px',
                      marginBottom: '20px'
                    }}>
                      {/* Task 1 Selection */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: 'var(--neutral-700)',
                          marginBottom: '8px'
                        }}>
                          Source Task
                        </label>
                        <select
                          value={selectedTask1 || ''}
                          onChange={(e) => handleTask1Selection(e.target.value || null)}
                          disabled={editingMapping || viewingMapping}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid var(--neutral-300)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            background: (editingMapping || viewingMapping) ? 'var(--neutral-100)' : 'white',
                            color: (editingMapping || viewingMapping) ? 'var(--neutral-500)' : 'var(--neutral-900)',
                            cursor: (editingMapping || viewingMapping) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <option value="">Select source task...</option>
                          {safeTasks.map(task => (
                            <option key={task.id} value={task.id}>
                              {task.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Task 2 Selection */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: 'var(--neutral-700)',
                          marginBottom: '8px'
                        }}>
                          Target Task
                        </label>
                        <select
                          value={selectedTask2 || ''}
                          onChange={(e) => handleTask2Selection(e.target.value || null)}
                          disabled={!selectedTask1 || editingMapping || viewingMapping}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid var(--neutral-300)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            background: (selectedTask1 && !editingMapping && !viewingMapping) ? 'white' : 'var(--neutral-100)',
                            color: (selectedTask1 && !editingMapping && !viewingMapping) ? 'var(--neutral-900)' : 'var(--neutral-500)',
                            cursor: (selectedTask1 && !editingMapping && !viewingMapping) ? 'pointer' : 'not-allowed'
                          }}
                        >
                          <option value="">Select target task...</option>
                          {safeTasks.filter(task => task.id !== selectedTask1).map(task => (
                            <option key={task.id} value={task.id}>
                              {task.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Field Mapping Section */}
                {((selectedTask1 && selectedTask2) || viewingMapping) && (
                  <div style={{
                    border: '1px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    background: 'white'
                  }}>
                    <h5 style={{
                      margin: '0 0 12px 0',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--neutral-800)'
                    }}>
                      Column Mapping
                    </h5>
                    
                    {loading ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        color: 'var(--neutral-500)'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 11-6.219-8.56" />
                        </svg>
                        <span style={{ marginLeft: '8px' }}>Loading fields...</span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        gap: '12px',
                        alignItems: 'center'
                      }}>
                        {/* Source Fields */}
                        <div>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: 'var(--neutral-600)',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Source Fields ({filteredSourceFields.length}/{task1Fields.length})
                          </div>
                          <div style={{
                            marginBottom: '8px',
                            position: 'relative'
                          }}>
                            <input
                              type="text"
                              placeholder="Search source fields..."
                              value={sourceFieldSearch}
                              onChange={(e) => setSourceFieldSearch(e.target.value)}
                              disabled={viewingMapping}
                              style={{
                                width: '100%',
                                padding: '8px 12px 8px 32px',
                                border: '1px solid var(--neutral-300)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                background: 'white',
                                color: 'var(--neutral-900)',
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
                            <svg 
                              width="14" 
                              height="14" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2"
                              style={{
                                position: 'absolute',
                                left: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--neutral-400)',
                                pointerEvents: 'none'
                              }}
                            >
                              <circle cx="11" cy="11" r="8" />
                              <path d="M21 21l-4.35-4.35" />
                            </svg>
                          </div>
                          <div style={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            border: '1px solid var(--neutral-200)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--neutral-50)'
                          }}>
                            {filteredSourceFields.length > 0 ? (
                              filteredSourceFields.map(field => (
                                <div key={field} style={{
                                  padding: '8px 12px',
                                  borderBottom: '1px solid var(--neutral-200)',
                                  fontSize: '13px',
                                  color: 'var(--neutral-700)',
                                  background: selectedSourceField === field 
                                    ? 'var(--primary-100)' 
                                    : fieldMappings[field] 
                                      ? 'var(--success-50)' 
                                      : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s ease',
                                  position: 'relative',
                                  border: selectedSourceField === field ? '2px solid var(--primary-500)' : 'none'
                                }}
                                onClick={() => {
                                  if (viewingMapping) return; // Disable interactions in view mode
                                  if (fieldMappings[field]) {
                                    removeFieldMapping(field);
                                  } else {
                                    handleSourceFieldSelection(field);
                                  }
                                }}
                                >
                                  {field}
                                  {fieldMappings[field] && (
                                    <span style={{
                                      float: 'right',
                                      color: 'var(--success-600)',
                                      fontSize: '12px'
                                    }}>
                                      ✓
                                    </span>
                                  )}
                                  {selectedSourceField === field && !fieldMappings[field] && (
                                    <span style={{
                                      float: 'right',
                                      color: 'var(--primary-600)',
                                      fontSize: '12px'
                                    }}>
                                      ●
                                    </span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div style={{
                                padding: '16px 12px',
                                textAlign: 'center',
                                color: 'var(--neutral-500)',
                                fontSize: '12px',
                                fontStyle: 'italic'
                              }}>
                                {sourceFieldSearch ? 'No fields match your search' : 'No fields available'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mapping Arrow */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--neutral-400)' }}>
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                          <span style={{
                            fontSize: '10px',
                            color: 'var(--neutral-500)',
                            textAlign: 'center',
                            fontWeight: '500'
                          }}>
                            MAP
                          </span>
                        </div>

                        {/* Target Fields */}
                        <div>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: 'var(--neutral-600)',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Target Fields ({filteredTargetFields.length}/{task2Fields.length})
                          </div>
                          <div style={{
                            marginBottom: '8px',
                            position: 'relative'
                          }}>
                            <input
                              type="text"
                              placeholder="Search target fields..."
                              value={targetFieldSearch}
                              onChange={(e) => setTargetFieldSearch(e.target.value)}
                              disabled={viewingMapping}
                              style={{
                                width: '100%',
                                padding: '8px 12px 8px 32px',
                                border: '1px solid var(--neutral-300)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                background: 'white',
                                color: 'var(--neutral-900)',
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
                            <svg 
                              width="14" 
                              height="14" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2"
                              style={{
                                position: 'absolute',
                                left: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--neutral-400)',
                                pointerEvents: 'none'
                              }}
                            >
                              <circle cx="11" cy="11" r="8" />
                              <path d="M21 21l-4.35-4.35" />
                            </svg>
                          </div>
                          <div style={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            border: '1px solid var(--neutral-200)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--neutral-50)'
                          }}>
                            {filteredTargetFields.length > 0 ? (
                              filteredTargetFields.map(field => (
                                <div key={field} style={{
                                  padding: '8px 12px',
                                  borderBottom: '1px solid var(--neutral-200)',
                                  fontSize: '13px',
                                  color: 'var(--neutral-700)',
                                  background: selectedTargetField === field 
                                    ? 'var(--primary-100)' 
                                    : Object.values(fieldMappings).includes(field) 
                                      ? 'var(--warning-50)' 
                                      : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s ease',
                                  position: 'relative',
                                  border: selectedTargetField === field ? '2px solid var(--primary-500)' : 'none'
                                }}
                                onClick={() => {
                                  if (viewingMapping) return; // Disable interactions in view mode
                                  // Find which source field is mapped to this target field
                                  const sourceField = Object.keys(fieldMappings).find(key => fieldMappings[key] === field);
                                  if (sourceField) {
                                    removeFieldMapping(sourceField);
                                  } else {
                                    handleTargetFieldSelection(field);
                                  }
                                }}
                                >
                                  {field}
                                  {Object.values(fieldMappings).includes(field) && (
                                    <span style={{
                                      float: 'right',
                                      color: 'var(--success-600)',
                                      fontSize: '12px'
                                    }}>
                                      ✓
                                    </span>
                                  )}
                                  {selectedTargetField === field && !Object.values(fieldMappings).includes(field) && (
                                    <span style={{
                                      float: 'right',
                                      color: 'var(--primary-600)',
                                      fontSize: '12px'
                                    }}>
                                      ●
                                    </span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div style={{
                                padding: '16px 12px',
                                textAlign: 'center',
                                color: 'var(--neutral-500)',
                                fontSize: '12px',
                                fontStyle: 'italic'
                              }}>
                                {targetFieldSearch ? 'No fields match your search' : 'No fields available'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Confirm Pair Button */}
                    {selectedSourceField && selectedTargetField && (
                      <div style={{
                        marginTop: '16px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: 'var(--primary-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--primary-200)'
                      }}>
                        <div style={{
                          fontSize: '13px',
                          color: 'var(--neutral-700)',
                          fontWeight: '500'
                        }}>
                          Map <strong>{selectedSourceField}</strong> → <strong>{selectedTargetField}</strong>
                        </div>
                        <button
                          onClick={confirmFieldPair}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--primary-600)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: '500',
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
                          Confirm Pair
                        </button>
                      </div>
                    )}

                    {/* Confirmed Mappings Table */}
                    {Object.keys(fieldMappings).length > 0 && (
                      <div style={{
                        marginTop: '20px',
                        border: '1px solid var(--neutral-200)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        background: 'white'
                      }}>
                        <div style={{
                          padding: '12px 16px',
                          background: 'var(--neutral-50)',
                          borderBottom: '1px solid var(--neutral-200)',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--neutral-800)'
                        }}>
                          Confirmed Field Mappings ({Object.keys(fieldMappings).length})
                        </div>
                        <div style={{ overflow: 'auto' }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse'
                          }}>
                            <thead>
                              <tr style={{
                                background: 'var(--neutral-100)',
                                borderBottom: '1px solid var(--neutral-200)'
                              }}>
                                <th style={{
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--neutral-600)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  width: '40%'
                                }}>
                                  Source Field
                                </th>
                                <th style={{
                                  padding: '12px 16px',
                                  textAlign: 'center',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--neutral-600)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  width: '20%'
                                }}>
                                  Maps To
                                </th>
                                <th style={{
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'var(--neutral-600)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  width: '40%'
                                }}>
                                  Target Field
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(fieldMappings).map(([sourceField, targetField], index) => (
                                <tr key={sourceField} style={{
                                  borderBottom: index < Object.keys(fieldMappings).length - 1 ? '1px solid var(--neutral-200)' : 'none'
                                }}>
                                  <td style={{
                                    padding: '12px 16px',
                                    fontSize: '13px',
                                    color: 'var(--neutral-800)',
                                    fontWeight: '500'
                                  }}>
                                    <span style={{
                                      padding: '4px 8px',
                                      background: 'var(--success-100)',
                                      color: 'var(--success-700)',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '12px',
                                      fontWeight: '500'
                                    }}>
                                      {sourceField}
                                    </span>
                                  </td>
                                  <td style={{
                                    padding: '12px 16px',
                                    textAlign: 'center'
                                  }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primary-500)' }}>
                                      <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                  </td>
                                  <td style={{
                                    padding: '12px 16px',
                                    fontSize: '13px',
                                    color: 'var(--neutral-800)',
                                    fontWeight: '500',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span style={{
                                      padding: '4px 8px',
                                      background: 'var(--warning-100)',
                                      color: 'var(--warning-700)',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '12px',
                                      fontWeight: '500'
                                    }}>
                                      {targetField}
                                    </span>
                                    {!viewingMapping && (
                                      <button
                                        onClick={() => removeFieldMapping(sourceField)}
                                        style={{
                                          padding: '4px 6px',
                                          background: 'var(--error-100)',
                                          color: 'var(--error-700)',
                                          border: 'none',
                                          borderRadius: 'var(--radius-sm)',
                                          fontSize: '10px',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.background = 'var(--error-200)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.background = 'var(--error-100)';
                                        }}
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {error && (
                      <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: 'var(--error-50)',
                        border: '1px solid var(--error-200)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--error-700)',
                        fontSize: '14px'
                      }}>
                        {error}
                      </div>
                    )}

                    {/* Save Button */}
                    {!viewingMapping && (
                      <div style={{
                        marginTop: '16px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                      {saving && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: 'var(--neutral-600)',
                          fontSize: '14px'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                            <path d="M21 12a9 9 0 11-6.219-8.56" />
                          </svg>
                          Saving...
                        </div>
                      )}
                      <button
                        onClick={addTaskPair}
                        disabled={Object.keys(fieldMappings).length === 0 || saving}
                        style={{
                          padding: '8px 16px',
                          background: Object.keys(fieldMappings).length > 0 && !saving ? 'var(--primary-600)' : 'var(--neutral-300)',
                          color: Object.keys(fieldMappings).length > 0 && !saving ? 'white' : 'var(--neutral-500)',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: Object.keys(fieldMappings).length > 0 && !saving ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s ease'
                        }}
                      >
{saving ? 'Saving...' : editingMapping ? 'Update Mapping' : 'Save Mapping'}
                      </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Results Modal */}
      {showResultsModal && selectedResult && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeResultsModal();
            }
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--neutral-200)',
              background: 'var(--neutral-50)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--neutral-900)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--warning-600)' }}>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Reconciliation Results
              </h3>
              <button
                onClick={closeResultsModal}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  color: 'var(--neutral-500)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--neutral-200)';
                  e.target.style.color = 'var(--neutral-700)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'var(--neutral-500)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '24px',
              overflow: 'auto',
              flex: 1
            }}>
              {/* Result Header */}
              <div style={{
                marginBottom: '24px'
              }}>
                <h4 style={{
                  margin: '0 0 20px 0',
                  fontSize: '20px',
                  fontWeight: '600',
                  color: 'var(--neutral-900)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {selectedResult.pair.task1.name} ↔ {selectedResult.pair.task2.name}
                  {/* Status Badge */}
                  <div style={{
                    padding: '4px 8px',
                    background: selectedResult.result.status === 'SUCCESS' 
                      ? 'var(--success-50)' 
                      : 'var(--error-50)',
                    color: selectedResult.result.status === 'SUCCESS' 
                      ? 'var(--success-700)' 
                      : 'var(--error-700)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontWeight: '600',
                    border: `1px solid ${selectedResult.result.status === 'SUCCESS' 
                      ? 'var(--success-200)' 
                      : 'var(--error-200)'}`,
                    flex: '0 0 auto',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {selectedResult.result.status}
                  </div>
                </h4>
                
                {/* Metadata Card */}
                <div style={{
                  background: 'white',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {/* Method Section */}
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--neutral-500)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      Method
                      {selectedResult.result.reconciliationMethod === 'PROBABILISTIC_MATCH' && (
                        <div style={{ position: 'relative' }}>
                          <button
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: 'var(--neutral-300)',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '10px',
                              fontWeight: '600',
                              color: 'var(--neutral-600)',
                              padding: 0
                            }}
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                          >
                            i
                          </button>
                          {showTooltip && (
                            <div style={{
                              position: 'absolute',
                              top: '20px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: 'var(--neutral-900)',
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: '500',
                              whiteSpace: 'nowrap',
                              zIndex: 1000,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              pointerEvents: 'none'
                            }}>
                              For probabilistic matching, data can be slightly inaccurate with false positives
                              <div style={{
                                position: 'absolute',
                                top: '-4px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '0',
                                height: '0',
                                borderLeft: '4px solid transparent',
                                borderRight: '4px solid transparent',
                                borderBottom: '4px solid var(--neutral-900)'
                              }}></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--primary-700)',
                      textTransform: 'uppercase',
                      background: 'var(--primary-100)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'inline-block'
                    }}>
                      {selectedResult.result.reconciliationMethod}
                    </div>
                  </div>

                  {/* Executed Section */}
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--neutral-500)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      Executed
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--neutral-800)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {selectedResult.result.executionTimestamp ? new Date(selectedResult.result.executionTimestamp).toLocaleString() : 'N/A'}
                    </div>
                  </div>

                </div>
              </div>

              {/* Visual Charts */}
              <div style={{
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                {/* File Comparison Chart */}
                <div style={{
                  background: 'white',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px'
                }}>
                  <h5 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--neutral-900)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3v18h18"/>
                      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                    </svg>
                    File Comparison
                  </h5>
                  <div style={{
                    display: 'flex',
                    alignItems: 'end',
                    gap: '20px',
                    height: '120px',
                    padding: '0 20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1
                    }}>
                      <div style={{
                        background: 'var(--primary-500)',
                        width: '100%',
                        height: `${(selectedResult.result.leftFileRowCount / Math.max(selectedResult.result.leftFileRowCount, selectedResult.result.rightFileRowCount)) * 80}px`,
                        borderRadius: '4px 4px 0 0',
                        display: 'flex',
                        alignItems: 'end',
                        justifyContent: 'center',
                        paddingBottom: '8px',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '12px',
                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
                        position: 'relative'
                      }}>
                        <span style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {selectedResult.result.leftFileRowCount ? selectedResult.result.leftFileRowCount.toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--neutral-700)',
                        textAlign: 'center'
                      }}>
                        Left File
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1
                    }}>
                      <div style={{
                        background: 'var(--primary-500)',
                        width: '100%',
                        height: `${(selectedResult.result.rightFileRowCount / Math.max(selectedResult.result.leftFileRowCount, selectedResult.result.rightFileRowCount)) * 80}px`,
                        borderRadius: '4px 4px 0 0',
                        display: 'flex',
                        alignItems: 'end',
                        justifyContent: 'center',
                        paddingBottom: '8px',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '12px',
                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
                        position: 'relative'
                      }}>
                        <span style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {selectedResult.result.rightFileRowCount ? selectedResult.result.rightFileRowCount.toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--neutral-700)',
                        textAlign: 'center'
                      }}>
                        Right File
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row Breakdown Chart */}
                <div style={{
                  background: 'white',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px'
                }}>
                  <h5 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--neutral-900)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Row Breakdown
                  </h5>
                  <div style={{
                    display: 'flex',
                    alignItems: 'end',
                    gap: '16px',
                    height: '120px',
                    padding: '0 20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1
                    }}>
                      <div style={{
                        background: 'var(--success-500)',
                        width: '100%',
                        height: `${(selectedResult.result.commonRowCount / Math.max(selectedResult.result.commonRowCount, selectedResult.result.leftFileExclusiveRowCount, selectedResult.result.rightFileExclusiveRowCount)) * 80}px`,
                        borderRadius: '4px 4px 0 0',
                        display: 'flex',
                        alignItems: 'end',
                        justifyContent: 'center',
                        paddingBottom: '8px',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '12px',
                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
                        position: 'relative'
                      }}>
                        <span style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {selectedResult.result.commonRowCount ? selectedResult.result.commonRowCount.toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--success-700)',
                        textAlign: 'center'
                      }}>
                        Common
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1
                    }}>
                      <div style={{
                        background: 'var(--warning-500)',
                        width: '100%',
                        height: `${(selectedResult.result.leftFileExclusiveRowCount / Math.max(selectedResult.result.commonRowCount, selectedResult.result.leftFileExclusiveRowCount, selectedResult.result.rightFileExclusiveRowCount)) * 80}px`,
                        borderRadius: '4px 4px 0 0',
                        display: 'flex',
                        alignItems: 'end',
                        justifyContent: 'center',
                        paddingBottom: '8px',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '12px',
                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
                        position: 'relative'
                      }}>
                        <span style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {selectedResult.result.leftFileExclusiveRowCount ? selectedResult.result.leftFileExclusiveRowCount.toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--warning-700)',
                        textAlign: 'center'
                      }}>
                        Left Only
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1
                    }}>
                      <div style={{
                        background: 'var(--warning-500)',
                        width: '100%',
                        height: `${(selectedResult.result.rightFileExclusiveRowCount / Math.max(selectedResult.result.commonRowCount, selectedResult.result.leftFileExclusiveRowCount, selectedResult.result.rightFileExclusiveRowCount)) * 80}px`,
                        borderRadius: '4px 4px 0 0',
                        display: 'flex',
                        alignItems: 'end',
                        justifyContent: 'center',
                        paddingBottom: '8px',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '12px',
                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
                        position: 'relative'
                      }}>
                        <span style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {selectedResult.result.rightFileExclusiveRowCount ? selectedResult.result.rightFileExclusiveRowCount.toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--warning-700)',
                        textAlign: 'center'
                      }}>
                        Right Only
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* Table Preview Notice - Only for Probabilistic Matching */}
              {selectedResult.result.reconciliationMethod === 'PROBABILISTIC_MATCH' && (
                <div style={{
                  background: 'var(--warning-50)',
                  border: '1px solid var(--warning-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    background: 'var(--warning-500)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M12 9v4"/>
                      <path d="M12 17h.01"/>
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--warning-800)',
                      marginBottom: '2px'
                    }}>
                      Table Previews Not Available
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--warning-700)'
                    }}>
                      Probabilistic matching does not support data previews at this time.
                    </div>
                  </div>
                </div>
              )}

              {/* Sample Data Preview Tabs */}
              <div style={{
                border: '1px solid var(--neutral-200)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'white'
              }}>
                {/* Tab Navigation */}
                <div style={{
                  display: 'flex',
                  background: 'var(--neutral-50)',
                  borderBottom: '1px solid var(--neutral-200)'
                }}>
                  {selectedResult.result.sampleCommonRowsS3Path && (
                    <button
                      onClick={() => setActivePreviewTab('common')}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: activePreviewTab === 'common' ? 'white' : 'transparent',
                        border: 'none',
                        borderBottom: activePreviewTab === 'common' ? '2px solid var(--success-500)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: activePreviewTab === 'common' ? 'var(--success-700)' : 'var(--neutral-600)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4" />
                        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                        <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                        <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                      </svg>
                      Common Rows
                    </button>
                  )}
                  {selectedResult.result.sampleExclusiveLeftRowsS3Path && (
                    <button
                      onClick={() => setActivePreviewTab('leftExclusive')}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: activePreviewTab === 'leftExclusive' ? 'white' : 'transparent',
                        border: 'none',
                        borderBottom: activePreviewTab === 'leftExclusive' ? '2px solid var(--warning-500)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: activePreviewTab === 'leftExclusive' ? 'var(--warning-700)' : 'var(--neutral-600)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4" />
                        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                        <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                        <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                      </svg>
                      Left Exclusive
                    </button>
                  )}
                  {selectedResult.result.sampleExclusiveRightRowsS3Path && (
                    <button
                      onClick={() => setActivePreviewTab('rightExclusive')}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: activePreviewTab === 'rightExclusive' ? 'white' : 'transparent',
                        border: 'none',
                        borderBottom: activePreviewTab === 'rightExclusive' ? '2px solid var(--warning-500)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: activePreviewTab === 'rightExclusive' ? 'var(--warning-700)' : 'var(--neutral-600)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4" />
                        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                        <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                        <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                      </svg>
                      Right Exclusive
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                <div style={{
                  padding: '16px',
                  background: '#f8f9fa',
                  minHeight: '400px',
                  maxHeight: '500px',
                  overflow: 'auto'
                }}>
                  {(() => {
                    const currentState = previewStates[activePreviewTab];
                    const s3Path = activePreviewTab === 'common' ? selectedResult.result.sampleCommonRowsS3Path :
                                  activePreviewTab === 'leftExclusive' ? selectedResult.result.sampleExclusiveLeftRowsS3Path :
                                  selectedResult.result.sampleExclusiveRightRowsS3Path;

                    if (!s3Path) {
                      return (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '40px',
                          color: 'var(--neutral-500)',
                          fontSize: '14px'
                        }}>
                          No sample data available for this category
                        </div>
                      );
                    }

                    if (currentState.loading) {
                      return (
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
                          Loading preview...
                        </div>
                      );
                    }

                    if (currentState.error) {
                      return (
                        <div style={{
                          padding: '20px',
                          background: currentState.permanentError ? '#fef3cd' : '#fef2f2',
                          border: `1px solid ${currentState.permanentError ? '#fde68a' : '#fecaca'}`,
                          borderRadius: '6px',
                          color: currentState.permanentError ? '#92400e' : '#b91c1c'
                        }}>
                          {currentState.permanentError ? 'File not found' : `Error loading preview: ${currentState.error}`}
                        </div>
                      );
                    }

                    if (currentState.data) {
                      if (currentState.data.isCSV && currentState.data.parsedData) {
                        return (
                          <div style={{ 
                            overflow: 'auto', 
                            maxHeight: '450px',
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
                                  {currentState.data.parsedData.headers.map((header, index) => (
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
                                {currentState.data.parsedData.rows.map((row, rowIndex) => (
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
                                        lineHeight: '1.5',
                                        textAlign: 'left'
                                      }}>
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      } else {
                        return (
                          <div style={{
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            whiteSpace: 'pre-wrap',
                            background: 'white',
                            padding: '16px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db'
                          }}>
                            {currentState.data.rawText || currentState.data.preview?.join('\n') || 'No preview data available'}
                          </div>
                        );
                      }
                    }

                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        color: 'var(--neutral-500)',
                        fontSize: '14px'
                      }}>
                        Click to load preview
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Run Confirmation Modal */}
      {showRunConfirmModal && selectedPairForRun && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--neutral-200)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'var(--warning-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--warning-600)' }}>
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--neutral-800)'
              }}>
                Run Reconciliation
              </h3>
            </div>

            {/* Content */}
            <div style={{
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              <p style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: 'var(--neutral-700)'
              }}>
                Are you sure you want to run this reconciliation now?
              </p>
              
              <div style={{
                background: 'var(--neutral-50)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--neutral-200)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    padding: '6px 10px',
                    background: 'var(--primary-50)',
                    color: 'var(--primary-700)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '1px solid var(--primary-200)'
                  }}>
                    {selectedPairForRun.taskPair.task1.name}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--neutral-400)' }}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  <div style={{
                    padding: '6px 10px',
                    background: 'var(--success-50)',
                    color: 'var(--success-700)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '1px solid var(--success-200)'
                  }}>
                    {selectedPairForRun.taskPair.task2.name}
                  </div>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--neutral-600)'
                }}>
                  <strong>{Object.keys(selectedPairForRun.taskPair.mappings).length}</strong> field mappings configured
                </div>
              </div>
              
              <p style={{
                margin: '16px 0 0 0',
                fontSize: '13px',
                color: 'var(--neutral-600)'
              }}>
                This will start the reconciliation process immediately and may take some time to complete.
              </p>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={cancelRunReconciliation}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid var(--neutral-300)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--neutral-700)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--neutral-50)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRunReconciliation}
                style={{
                  padding: '10px 20px',
                  background: 'var(--warning-600)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--warning-700)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--warning-600)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Run Now
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Reconciliation;
