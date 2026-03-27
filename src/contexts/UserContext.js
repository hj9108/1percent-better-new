import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  db,
  doc,
  getDoc,
  setDoc,
} from '../data/firebase';

var UserContext = createContext();

export var useUser = function() {
  var context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

// ⚠️ CHANGE THESE TO YOUR REAL DETAILS
var USERS = [
  {
    id: 'user1',
    username: 'harsha',
    password: 'harsha123',
    displayName: 'Harsha',
    emoji: '🌿',
  },
  {
    id: 'user2',
    username: 'friend',
    password: 'friend123',
    displayName: 'Friend',
    emoji: '🌱',
  },
];

var initializeUserData = async function(userId) {
  try {
    var userDocRef = doc(db, 'users', userId);
    var userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        createdAt: new Date().toISOString(),
        habits: [],
        goals: [],
      });
    }
  } catch(e) {
    console.log('Init user data error:', e);
  }
};

export var UserProvider = function({ children }) {
  var [loggedInUser, setLoggedInUser] = useState(function() {
    try {
      var saved = localStorage.getItem('1percent-loggedInUser');
      return saved ? JSON.parse(saved) : null;
    } catch(e) { return null; }
  });

  var [activeProfile, setActiveProfile] = useState(function() {
    try {
      var saved = localStorage.getItem('1percent-activeProfile');
      return saved ? JSON.parse(saved) : null;
    } catch(e) { return null; }
  });

  var [isLoading, setIsLoading] = useState(false);

  useEffect(function() {
    if (loggedInUser) {
      localStorage.setItem('1percent-loggedInUser', JSON.stringify(loggedInUser));
    } else {
      localStorage.removeItem('1percent-loggedInUser');
    }
  }, [loggedInUser]);

  useEffect(function() {
    if (activeProfile) {
      localStorage.setItem('1percent-activeProfile', JSON.stringify(activeProfile));
    } else {
      localStorage.removeItem('1percent-activeProfile');
    }
  }, [activeProfile]);

  var login = async function(username, password) {
    var user = USERS.find(function(u) {
      return u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password;
    });

    if (user) {
      setIsLoading(true);
      await initializeUserData(user.id);
      var userInfo = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        emoji: user.emoji,
      };
      setLoggedInUser(userInfo);
      setActiveProfile(userInfo);
      setIsLoading(false);
      return { success: true };
    }
    return { success: false, error: 'Invalid username or password' };
  };

  var logout = function() {
    setLoggedInUser(null);
    setActiveProfile(null);
    localStorage.removeItem('1percent-loggedInUser');
    localStorage.removeItem('1percent-activeProfile');
  };

  var switchProfile = function() {
    if (!loggedInUser || !activeProfile) return;
    var otherUser = USERS.find(function(u) { return u.id !== activeProfile.id; });
    if (otherUser) {
      setActiveProfile({
        id: otherUser.id,
        username: otherUser.username,
        displayName: otherUser.displayName,
        emoji: otherUser.emoji,
      });
    }
  };

  var isOwnProfile = loggedInUser && activeProfile && loggedInUser.id === activeProfile.id;

  return React.createElement(
    UserContext.Provider,
    {
      value: {
        loggedInUser,
        activeProfile,
        isOwnProfile,
        isLoading,
        login,
        logout,
        switchProfile,
        USERS,
      }
    },
    children
  );
};

export default UserContext;