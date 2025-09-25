/**
 * JWT Authentication Service
 * Handles login, registration, token refresh, and token management
 */

class AuthService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:9092';
  }

  /**
   * Register a new user
   */
  async register(userData) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(errorData.message || 'Registration failed');
    }

    return response.json();
  }

  /**
   * Login with email or user_id and password
   */
  async login(identifier, password) {
    // Determine if identifier is email or userId
    const isEmail = identifier.includes('@');
    const requestBody = isEmail 
      ? { email: identifier, password }
      : { userId: identifier, password };

    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(errorData.message || 'Invalid email/user ID or password');
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken) {
    const response = await fetch(`${this.baseURL}/auth/refresh?refresh_token=${refreshToken}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Token refresh failed' }));
      throw new Error(errorData.message || 'Token refresh failed');
    }

    return response.json();
  }

  /**
   * Verify if a token is still valid
   */
  async verifyToken(token) {
    const response = await fetch(`${this.baseURL}/auth/verify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    return response.ok;
  }

  /**
   * Decode JWT token to extract user information
   */
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Store tokens in localStorage
   */
  storeTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Get stored access token
   */
  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Clear all stored tokens
   */
  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Check if user is authenticated (has valid tokens)
   */
  isAuthenticated() {
    const token = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return !!(token && refreshToken);
  }

  /**
   * Check if access token is expired or close to expiring
   */
  isTokenExpired(token = null) {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) return true;
    
    try {
      const tokenData = this.decodeToken(accessToken);
      if (!tokenData || !tokenData.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = tokenData.exp - now;
      
      // Consider token expired if it expires within 30 seconds
      return timeUntilExpiry < 30;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTimeUntilExpiry(token = null) {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) return 0;
    
    try {
      const tokenData = this.decodeToken(accessToken);
      if (!tokenData || !tokenData.exp) return 0;
      
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, tokenData.exp - now);
    } catch (error) {
      console.error('Error getting token expiry time:', error);
      return 0;
    }
  }



  /**
   * Logout user by clearing tokens
   */
  logout() {
    this.clearTokens();
  }
}

export default new AuthService();

