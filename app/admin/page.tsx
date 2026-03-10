'use client';

import { useState, useEffect } from 'react';
import styles from '../page.module.css';

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      fetch('/api/vote')
        .then((res) => res.json())
        .then((data) => setVotes(data));

      // Refresh votes every 5 seconds
      const interval = setInterval(() => {
        fetch('/api/vote')
          .then((res) => res.json())
          .then((data) => setVotes(data));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
      setMessage('');
    } else {
      setMessage('Invalid credentials');
    }
  };

  const sortedMovies = Object.entries(votes).sort(([, a], [, b]) => b - a);

  if (!isLoggedIn) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Admin Login</h1>
          <div
            className={styles.content}
            style={{ maxWidth: '400px', margin: '0 auto', display: 'block' }}
          >
            <div className={styles.column}>
              <form onSubmit={handleLogin}>
                <div className={styles.inputGroup}>
                  <label>Username:</label>
                  <input
                    type='text'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={styles.input}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Password:</label>
                  <input
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={styles.input}
                  />
                </div>
                <button type='submit' className={styles.button}>
                  Login
                </button>
              </form>
              {message && <p className={styles.message}>{message}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Admin Results</h1>

        <div className={styles.results} style={{ marginBottom: '30px' }}>
          <h2 className={styles.resultsTitle}>Live Voting Results</h2>
          <ul className={styles.resultsList}>
            {sortedMovies.length > 0 ? (
              sortedMovies.map(([movie, count], index) => (
                <li key={movie} className={styles.resultsItem}>
                  <span
                    style={{
                      marginRight: '10px',
                      fontWeight: 'bold',
                      color: '#8a2be2',
                      minWidth: '30px'
                    }}
                  >
                    #{index + 1}
                  </span>
                  <span>{movie}</span>
                  <span className={styles.resultsBadge}>{count} votes</span>
                </li>
              ))
            ) : (
              <li style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No votes yet</li>
            )}
          </ul>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setIsLoggedIn(false)}
            className={styles.button}
            style={{ maxWidth: '300px', margin: '0 auto' }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
