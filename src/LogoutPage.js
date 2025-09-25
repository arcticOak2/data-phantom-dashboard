import { useEffect } from "react";

const LogoutPage = () => {
  useEffect(() => {
    // Clear tokens and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = "/login";
  }, []);

  return <div>Logging out...</div>;
};

export default LogoutPage;
