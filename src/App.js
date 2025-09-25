import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider, { AuthContext } from "./AuthProvider";
import Layout from "./Layout";
import LoginPage from "./components/LoginPage";

const PrivateRoute = ({ children }) => {
  const { authenticated } = React.useContext(AuthContext);
  return authenticated ? children : <Navigate to="/login" />;
};

function App() {
  const [selectedPlayground, setSelectedPlayground] = React.useState(null);

  const handlePlaygroundSelect = (playground) => {
    setSelectedPlayground(playground);
  };

  const handlePlaygroundUpdated = (updatedPlayground) => {
    // Update the selected playground if it's the one being updated
    if (selectedPlayground && selectedPlayground.id === updatedPlayground.id) {
      setSelectedPlayground(updatedPlayground);
    }
  };

  return (
    <Router>
      <AuthProvider>
        <AuthContext.Consumer>
          {({ authenticated, loading, handleLoginSuccess }) => {
            if (loading) {
              return (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100vh',
                  fontSize: '18px',
                  color: '#666'
                }}>
                  Loading...
                </div>
              );
            }

            if (!authenticated) {
              return <LoginPage onLoginSuccess={handleLoginSuccess} />;
            }

            return (
              <Routes>
                <Route
                  path="/home"
                  element={
                    <Layout 
                      onSelectPlayground={handlePlaygroundSelect} 
                      onPlaygroundUpdated={handlePlaygroundUpdated}
                    />
                  }
                />
                <Route
                  path="/"
                  element={<Navigate to="/home" replace />}
                />
              </Routes>
            );
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    </Router>
  );
}

export default App;
