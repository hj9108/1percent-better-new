import React, { useState } from 'react';
import { motion } from './Motion';
import { FiUser, FiLock, FiEye, FiEyeOff, FiLogIn } from './Icons';
import { useUser } from '../contexts/UserContext';
import { getRandomQuote } from '../data/quotes';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { login } = useUser();

  const quote = getRandomQuote();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    const result = await login(username.trim(), password);

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 1500);
    } else {
      setError(result.error);
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="login-success-overlay">
        <div className="login-success-icon">🌿</div>
        <div className="login-success-text">Welcome back!</div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg-decoration">
        <div className="login-bg-circle" />
        <div className="login-bg-circle" />
        <div className="login-bg-circle" />
        <span className="login-bg-leaf">🍃</span>
        <span className="login-bg-leaf">🌿</span>
        <span className="login-bg-leaf">☘️</span>
        <span className="login-bg-leaf">🍀</span>
      </div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="login-logo">
          <div className="login-plant-icon">🌿</div>
          <h1 className="login-app-name">1%Better</h1>
          <p className="login-tagline">Grow a little every day</p>
        </div>

        <div className="login-growing-plant">
          <div className="plant-pot">
            <div className="plant-leaves-container">
              <span className="plant-leaf-left">🌿</span>
              <span className="plant-leaf-right">🌿</span>
            </div>
            <div className="plant-stem" />
            <div className="plant-soil" />
            <div className="plant-pot-rim" />
            <div className="plant-pot-base" />
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <motion.div
              className="login-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="login-error-icon">⚠️</span>
              <span>{error}</span>
            </motion.div>
          )}

          <div className="login-input-group">
            <label className="login-label">
              <FiUser className="login-label-icon" />
              Username
            </label>
            <input
              type="text"
              className="login-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="login-input-group">
            <label className="login-label">
              <FiLock className="login-label-icon" />
              Password
            </label>
            <div className="login-input-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            className="login-btn"
            disabled={isLoading}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <div className="login-btn-loading" />
            ) : (
              <>
                <FiLogIn />
                Enter the Garden
              </>
            )}
          </motion.button>
        </form>

        <div className="login-footer">
          <p className="login-footer-quote">"{quote.text}"</p>
          <p>— {quote.author}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;