import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  const handleAdmin = () => {
    setMenuOpen(false);
    navigate('/admin');
  };

  // Don't show navbar on login/register pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <div style={{
      background: '#0b1b30',
      borderBottom: '1px solid #2a4060',
      padding: '15px 30px',
      fontFamily: "'Roboto', sans-serif",
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;500;700&display=swap');
          
          .navbar-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .navbar-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.8rem;
            color: white;
            margin: 0;
            cursor: pointer;
            text-shadow: 0 0 10px rgba(0, 255, 136, 0.6);
          }
          
          .navbar-title span {
            color: #00ff88;
          }
          
          .navbar-menu {
            display: flex;
            align-items: center;
            gap: 20px;
          }
          
          .nav-button {
            background: transparent;
            color: #00aaff;
            border: 1px solid #00aaff;
            border-radius: 4px;
            padding: 8px 16px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .nav-button:hover {
            background: rgba(0, 170, 255, 0.1);
            color: #00ff88;
            border-color: #00ff88;
            box-shadow: 0 0 10px rgba(0, 170, 255, 0.3);
          }
          
          .nav-button.primary {
            background: #00ff88;
            color: #0a1121;
            border: 1px solid #00ff88;
          }
          
          .nav-button.primary:hover {
            background: #00cc6d;
            border-color: #00cc6d;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
          }
          
          .user-menu {
            position: relative;
          }
          
          .user-button {
            background: #111c30;
            color: #00ff88;
            border: 1px solid #2a4060;
            border-radius: 4px;
            padding: 8px 16px;
            font-family: 'Roboto', sans-serif;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
          }
          
          .user-button:hover {
            background: rgba(0, 255, 136, 0.1);
            border-color: #00ff88;
            box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
          }
          
          .dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background: #111c30;
            border: 1px solid #2a4060;
            border-radius: 8px;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
            min-width: 200px;
            margin-top: 5px;
            z-index: 100;
          }
          
          .dropdown-item {
            padding: 12px 20px;
            color: #e0e0e0;
            font-family: 'Roboto', sans-serif;
            cursor: pointer;
            transition: all 0.3s ease;
            border-bottom: 1px solid #2a4060;
          }
          
          .dropdown-item:last-child {
            border-bottom: none;
          }
          
          .dropdown-item:hover {
            background: rgba(0, 255, 136, 0.1);
            color: #00ff88;
          }
          
          .menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: transparent;
            z-index: 99;
          }
        `}
      </style>
      
      <div className="navbar-container">
        <h1
          className="navbar-title"
          onClick={() => navigate('/')}
        >
          AIShield <span>India</span>
        </h1>
        
        {user ? (
          <div className="user-menu">
            <button 
              className="user-button"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span>👤</span> {user.name}
            </button>
            
            {menuOpen && (
              <>
                <div 
                  className="menu-overlay" 
                  onClick={() => setMenuOpen(false)}
                ></div>
                <div className="dropdown-menu">
                  {user.role === 'admin' && (
                    <div 
                      className="dropdown-item"
                      onClick={handleAdmin}
                    >
                      Admin Dashboard
                    </div>
                  )}
                  <div 
                    className="dropdown-item"
                    onClick={handleLogout}
                  >
                    Logout
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="navbar-menu">
            <button 
              className="nav-button"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button 
              className="nav-button primary"
              onClick={() => navigate('/register')}
            >
              Register
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
