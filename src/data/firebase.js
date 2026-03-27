var getFirestore = function() {
  return new Promise(function(resolve) {
    if (window.firebaseReady && window.db) {
      resolve(window.db);
      return;
    }
    var attempts = 0;
    var interval = setInterval(function() {
      attempts++;
      if (window.firebaseReady && window.db) {
        clearInterval(interval);
        resolve(window.db);
      } else if (attempts > 100) {
        clearInterval(interval);
        console.error('Firebase timeout after 10s');
        resolve(null);
      }
    }, 100);
  });
};

export var db = {
  _isProxy: true
};

export var collection = function(db, path1, path2, path3, path4) {
  var parts = [path1, path2, path3, path4].filter(Boolean);
  return { _colPath: parts.join('/') };
};

export var doc = function(db, path1, path2, path3, path4) {
  var parts = [path1, path2, path3, path4].filter(Boolean);
  return { _docPath: parts.join('/') };
};

export var setDoc = async function(docRef, data, options) {
  var fs = await getFirestore();
  if (!fs) throw new Error('Firebase not available');
  if (options && options.merge) {
    return fs.doc(docRef._docPath).set(data, { merge: true });
  }
  return fs.doc(docRef._docPath).set(data);
};

export var getDoc = async function(docRef) {
  var fs = await getFirestore();
  if (!fs) return { exists: function() { return false; }, data: function() { return null; }, id: '' };
  var snap = await fs.doc(docRef._docPath).get();
  return {
    exists: function() { return snap.exists; },
    data: function() { return snap.data(); },
    id: snap.id,
  };
};

export var getDocs = async function(colRef) {
  var fs = await getFirestore();
  if (!fs) return { docs: [], size: 0 };
  var snap = await fs.collection(colRef._colPath).get();
  return {
    docs: snap.docs.map(function(d) {
      return {
        id: d.id,
        data: function() { return d.data(); },
      };
    }),
    size: snap.size,
  };
};

export var updateDoc = async function(docRef, data) {
  var fs = await getFirestore();
  if (!fs) throw new Error('Firebase not available');
  return fs.doc(docRef._docPath).update(data);
};

export var deleteDoc = async function(docRef) {
  var fs = await getFirestore();
  if (!fs) throw new Error('Firebase not available');
  return fs.doc(docRef._docPath).delete();
};