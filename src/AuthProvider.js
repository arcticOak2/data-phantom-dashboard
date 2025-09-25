import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthService from "./services/AuthService";
import LoginPage from "./components/LoginPage";

export const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    initializeAuth();
    
    // Listen for token expiration events from API calls
    const handleTokenExpired = () => {
      console.log("Token expired event received, logging out...");
      logout();
    };
    
    window.addEventListener('auth:token-expired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
    };
  }, []);

  const initializeAuth = async () => {
    try {
      const accessToken = AuthService.getAccessToken();
      const refreshToken = AuthService.getRefreshToken();

      if (accessToken && refreshToken) {
        // Check if token is expired or close to expiring (within 5 minutes)
        const tokenData = AuthService.decodeToken(accessToken);
        if (tokenData && tokenData.exp) {
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = tokenData.exp - now;
          
          // If token expires within 5 minutes, try to refresh proactively
          if (timeUntilExpiry < 300) {
            console.log("Token expires soon, refreshing proactively...");
            try {
              const response = await AuthService.refreshToken(refreshToken);
              AuthService.storeTokens(response.accessToken, response.refreshToken);
              
              const newTokenData = AuthService.decodeToken(response.accessToken);
              if (newTokenData) {
                setUser({
                  username: newTokenData.username || newTokenData.preferred_username,
                  email: newTokenData.email,
                  userId: newTokenData.userId || newTokenData.sub,
                });
                setToken(response.accessToken);
                setAuthenticated(true);
              }
            } catch (refreshError) {
              console.error("Proactive token refresh failed:", refreshError);
              // If proactive refresh fails, try to verify current token
              await verifyCurrentToken(accessToken, tokenData);
            }
          } else {
            // Token is still valid, use it
            await verifyCurrentToken(accessToken, tokenData);
          }
        } else {
          // Can't decode token, try to refresh
          try {
            const response = await AuthService.refreshToken(refreshToken);
            AuthService.storeTokens(response.accessToken, response.refreshToken);
            
            const newTokenData = AuthService.decodeToken(response.accessToken);
            if (newTokenData) {
              setUser({
                username: newTokenData.username || newTokenData.preferred_username,
                email: newTokenData.email,
                userId: newTokenData.userId || newTokenData.sub,
              });
              setToken(response.accessToken);
              setAuthenticated(true);
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            logout();
          }
        }
      }
    } catch (error) {
      console.error("Auth initialization failed:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const verifyCurrentToken = async (accessToken, tokenData) => {
    try {
      // Set user from token data without making API call
      if (tokenData) {
        setUser({
          username: tokenData.username || tokenData.preferred_username,
          email: tokenData.email,
          userId: tokenData.userId || tokenData.sub,
        });
        setToken(accessToken);
        setAuthenticated(true);
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      logout();
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setToken(AuthService.getAccessToken());
    setAuthenticated(true);
    navigate('/home');
  };

  const logout = () => {
    AuthService.logout();
    setAuthenticated(false);
    setUser(null);
    setToken(null);
  };

  const refreshTokenIfNeeded = async () => {
    const refreshToken = AuthService.getRefreshToken();
    try {
      const response = await AuthService.refreshToken(refreshToken);
      AuthService.storeTokens(response.accessToken, response.refreshToken);
      setToken(response.accessToken);
      return response.accessToken;
    } catch (error) {
      logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      authenticated, 
      user, 
      token, 
      logout, 
      refreshTokenIfNeeded,
      loading,
      handleLoginSuccess 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
