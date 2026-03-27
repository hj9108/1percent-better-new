import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import App from './App';
import './style.css';

var renderApp = function() {
  var root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(
          UserProvider,
          null,
          React.createElement(App, null)
        )
      )
    )
  );
};

renderApp();