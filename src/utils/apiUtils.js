/**
 * API utility functions with retry logic and error handling
 */

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504], // HTTP status codes to retry
  retryableErrors: ['NetworkError', 'TypeError', 'AbortError'] // Error types to retry
};

/**
 * Sleep utility for delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff
 */
const calculateDelay = (attempt, baseDelay, maxDelay, backoffMultiplier) => {
  const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelay);
};

/**
 * Check if an error is retryable
 */
const isRetryableError = (error, retryableStatuses, retryableErrors) => {
  // Check HTTP status codes
  if (error.status && retryableStatuses.includes(error.status)) {
    return true;
  }
  
  // Check error types
  if (error.name && retryableErrors.includes(error.name)) {
    return true;
  }
  
  // Check for network-related errors
  if (error.message && (
    error.message.includes('Failed to fetch') ||
    error.message.includes('Network request failed') ||
    error.message.includes('CORS') ||
    error.message.includes('timeout')
  )) {
    return true;
  }
  
  return false;
};

/**
 * Enhanced fetch with retry logic and JWT token management
 */
export const fetchWithRetry = async (url, options = {}, retryConfig = {}) => {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError;
  
  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      console.log(`API call attempt ${attempt}/${config.maxRetries + 1} to ${url}`);
      
      // Add JWT token to headers if available
      const token = localStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      if (token) {
        // Check if token is expired before making the request
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = tokenData.exp - now;
        
        if (timeUntilExpiry < 30) {
          // Token expires soon, try to refresh proactively
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const refreshResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/auth/refresh?refresh_token=${refreshToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                localStorage.setItem('accessToken', refreshData.accessToken);
                localStorage.setItem('refreshToken', refreshData.refreshToken);
                headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
              } else {
                headers['Authorization'] = `Bearer ${token}`;
              }
            } else {
              headers['Authorization'] = `Bearer ${token}`;
            }
          } catch (refreshError) {
            console.warn('Proactive token refresh failed:', refreshError);
            headers['Authorization'] = `Bearer ${token}`;
          }
        } else {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      // If response is ok, return it
      if (response.ok) {
        console.log(`API call successful on attempt ${attempt}`);
        return response;
      }
      
      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401) {
        // Try to refresh token
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const refreshResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/auth/refresh?refresh_token=${refreshToken}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              localStorage.setItem('accessToken', refreshData.accessToken);
              localStorage.setItem('refreshToken', refreshData.refreshToken);
              
              // Retry the original request with new token
              const retryResponse = await fetch(url, {
                ...options,
                headers: {
                  ...headers,
                  'Authorization': `Bearer ${refreshData.accessToken}`
                },
                signal: AbortSignal.timeout(30000)
              });
              
              if (retryResponse.ok) {
                console.log(`API call successful after token refresh on attempt ${attempt}`);
                return retryResponse;
              }
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // If refresh fails, clear tokens and let AuthProvider handle the redirect
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // Dispatch a custom event to notify AuthProvider
          window.dispatchEvent(new CustomEvent('auth:token-expired'));
          throw new Error('Authentication failed');
        }
      }
      
      // Check if status is retryable
      if (config.retryableStatuses.includes(response.status)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Non-retryable error, return response as-is
      return response;
      
    } catch (error) {
      lastError = error;
      console.warn(`API call attempt ${attempt} failed:`, error.message);
      
      // Check if error is retryable
      if (!isRetryableError(error, config.retryableStatuses, config.retryableErrors)) {
        console.error('Non-retryable error encountered:', error);
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === config.maxRetries + 1) {
        console.error(`All ${config.maxRetries + 1} attempts failed for ${url}`);
        throw error;
      }
      
      // Calculate delay and wait
      const delay = calculateDelay(attempt, config.baseDelay, config.maxDelay, config.backoffMultiplier);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
};

/**
 * JSON fetch with retry logic
 */
export const fetchJsonWithRetry = async (url, options = {}, retryConfig = {}) => {
  const response = await fetchWithRetry(url, options, retryConfig);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
};

/**
 * State reconciliation utilities
 */
export const StateReconciler = {
  /**
   * Merge task lists, handling duplicates and conflicts
   */
  mergeTaskLists: (existingTasks, newTasks) => {
    if (!Array.isArray(existingTasks)) existingTasks = [];
    if (!Array.isArray(newTasks)) newTasks = [];
    
    const taskMap = new Map();
    
    // Add existing tasks
    existingTasks.forEach(task => {
      if (task.id) {
        taskMap.set(task.id, { ...task, _source: 'existing' });
      }
    });
    
    // Merge new tasks, preferring newer data
    newTasks.forEach(task => {
      if (task.id) {
        const existing = taskMap.get(task.id);
        if (existing) {
          // Merge with preference for newer data
          taskMap.set(task.id, { 
            ...existing, 
            ...task, 
            _source: 'merged',
            _lastUpdated: Date.now()
          });
        } else {
          taskMap.set(task.id, { ...task, _source: 'new' });
        }
      }
    });
    
    return Array.from(taskMap.values());
  },
  
  /**
   * Merge playground lists
   */
  mergePlaygroundLists: (existingPlaygrounds, newPlaygrounds) => {
    if (!Array.isArray(existingPlaygrounds)) existingPlaygrounds = [];
    if (!Array.isArray(newPlaygrounds)) newPlaygrounds = [];
    
    const playgroundMap = new Map();
    
    // Add existing playgrounds
    existingPlaygrounds.forEach(playground => {
      if (playground.id) {
        playgroundMap.set(playground.id, { ...playground, _source: 'existing' });
      }
    });
    
    // Merge new playgrounds
    newPlaygrounds.forEach(playground => {
      if (playground.id) {
        const existing = playgroundMap.get(playground.id);
        if (existing) {
          playgroundMap.set(playground.id, { 
            ...existing, 
            ...playground, 
            _source: 'merged',
            _lastUpdated: Date.now()
          });
        } else {
          playgroundMap.set(playground.id, { ...playground, _source: 'new' });
        }
      }
    });
    
    return Array.from(playgroundMap.values());
  },
  
  /**
   * Detect and resolve state conflicts
   */
  detectConflicts: (localState, remoteState) => {
    const conflicts = [];
    
    if (localState && remoteState) {
      // Check for timestamp conflicts
      if (localState.modifiedAt && remoteState.modifiedAt) {
        const localTime = new Date(localState.modifiedAt).getTime();
        const remoteTime = new Date(remoteState.modifiedAt).getTime();
        
        if (Math.abs(localTime - remoteTime) > 5000) { // 5 second threshold
          conflicts.push({
            type: 'timestamp_conflict',
            field: 'modifiedAt',
            local: localState.modifiedAt,
            remote: remoteState.modifiedAt
          });
        }
      }
      
      // Check for status conflicts
      if (localState.currentStatus && remoteState.currentStatus) {
        if (localState.currentStatus !== remoteState.currentStatus) {
          conflicts.push({
            type: 'status_conflict',
            field: 'currentStatus',
            local: localState.currentStatus,
            remote: remoteState.currentStatus
          });
        }
      }
    }
    
    return conflicts;
  }
};

/**
 * Error classification utilities
 */
export const ErrorClassifier = {
  /**
   * Classify API errors
   */
  classifyError: (error) => {
    if (error.status) {
      if (error.status >= 400 && error.status < 500) {
        return { type: 'client_error', retryable: false, userMessage: 'Please check your request and try again.' };
      } else if (error.status >= 500) {
        return { type: 'server_error', retryable: true, userMessage: 'Server error occurred. Retrying...' };
      }
    }
    
    if (error.name === 'NetworkError' || error.message?.includes('Failed to fetch')) {
      return { type: 'network_error', retryable: true, userMessage: 'Network connection issue. Retrying...' };
    }
    
    if (error.name === 'AbortError') {
      return { type: 'timeout_error', retryable: true, userMessage: 'Request timed out. Retrying...' };
    }
    
    return { type: 'unknown_error', retryable: false, userMessage: 'An unexpected error occurred.' };
  },
  
  /**
   * Get user-friendly error message
   */
  getUserMessage: (error) => {
    const classification = ErrorClassifier.classifyError(error);
    return classification.userMessage;
  }
};

/**
 * Circuit breaker pattern for API calls
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Global circuit breakers for different services
export const circuitBreakers = {
  tasks: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 }),
  playgrounds: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 }),
  preview: new CircuitBreaker({ failureThreshold: 5, resetTimeout: 60000 }),
  udfs: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 })
};

/**
 * UDF API functions
 */
export const UDFApi = {
  /**
   * Create a new UDF
   */
  createUDF: async (udfData) => {
    const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/udf`;
    
    return circuitBreakers.udfs.execute(async () => {
      return fetchJsonWithRetry(apiUrl, {
        method: 'POST',
        body: JSON.stringify(udfData)
      });
    });
  },

  /**
   * Get UDFs by user ID
   */
  getUDFsByUserId: async (userId) => {
    const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/udf/user/${userId}`;
    
    return circuitBreakers.udfs.execute(async () => {
      return fetchJsonWithRetry(apiUrl, {
        method: 'GET'
      });
    });
  },

  /**
   * Delete a UDF by ID
   */
  deleteUDF: async (udfId) => {
    const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:9092'}/data-phantom/udf/${udfId}`;
    
    return circuitBreakers.udfs.execute(async () => {
      return fetchJsonWithRetry(apiUrl, {
        method: 'DELETE'
      });
    });
  }
};






















