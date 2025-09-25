import React, { useState } from 'react';
import AuthService from '../services/AuthService';
import logo from '../assets/logo.png';
import backgroundImage from '../assets/login-bg.jpg';
import './LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    userId: '',
    password: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login - determine if input is email or user_id
        const identifier = formData.email; // This field now contains either email or user_id
        const response = await AuthService.login(identifier, formData.password);
        
        // Store tokens
        AuthService.storeTokens(response.accessToken, response.refreshToken);
        
        // Call success callback with user data
        onLoginSuccess(response.user);
      } else {
        // Register
        const response = await AuthService.register({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          userId: formData.userId
        });
        
        // Store tokens
        AuthService.storeTokens(response.accessToken, response.refreshToken);
        
        // Call success callback with user data
        onLoginSuccess(response.user);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      email: '',
      password: '',
      username: '',
      userId: ''
    });
  };


  return (
    <div className="login-container">
      {/* Data Flow Background */}
      <div className="data-flow-bg"></div>
      
      {/* Floating Data Particles */}
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      <div className="data-particle"></div>
      
      {/* Left Content Area */}
      <div className="left-content">
        <h1>Data Phantom</h1>
        <p className="subtitle">
          Enterprise-grade data processing platform designed for modern analytics teams. 
          Streamline your data workflows with powerful automation and real-time monitoring.
        </p>
        <ul className="features">
          <li>Multi-Engine Data Processing</li>
          <li>Automated Workflow Scheduling</li>
          <li>Real-time Execution Monitoring</li>
          <li>Enterprise Security & Compliance</li>
        </ul>
      </div>
      
      {/* Right Login Area */}
      <div className="right-login">
        <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <img src={logo} alt="Data Phantom" />
          </div>
          <h1>Data Phantom</h1>
          <p className="subtitle">
            {isLogin 
              ? 'Welcome back! Please sign in to continue to your dashboard.' 
              : 'Join Data Phantom and start managing your data workflows efficiently.'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required={isLogin}
              placeholder="Enter your email or user ID"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">Name</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required={!isLogin}
                placeholder="Enter your name"
              />
            </div>
          )}

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="userId">User ID</label>
              <input
                type="text"
                id="userId"
                name="userId"
                value={formData.userId}
                onChange={handleInputChange}
                required={!isLogin}
                placeholder="Enter your user ID"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
              minLength="6"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                <span style={{ marginLeft: '8px' }}>
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </span>
              </>
            ) : (
              isLogin ? 'Sign In to Dashboard' : 'Create Account & Continue'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "New to Data Phantom?" : "Already have an account?"}
            <button 
              type="button" 
              className="toggle-button"
              onClick={toggleMode}
            >
              {isLogin ? 'Create an account' : 'Sign in instead'}
            </button>
          </p>
        </div>
        </div>
      </div>
      
      {/* Right Content Area */}
      <div className="right-content">
        <h1>Data Phantom</h1>
        <p className="subtitle">
          Enterprise data processing platform for modern analytics teams.
        </p>
        <ul className="features">
          <li>Multi-Engine Processing</li>
          <li>Automated Scheduling</li>
          <li>Real-time Monitoring</li>
          <li>Enterprise Security</li>
        </ul>
      </div>

    </div>
  );
};

export default LoginPage;

