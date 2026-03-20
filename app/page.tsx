'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { movies } from '@/lib/movies';

const medals = ['🥇', '🥈', '🥉'];
const createExpertId = () => `expert-${Date.now()}`;

export default function Home() {
  const [expert, setExpert] = useState(createExpertId);
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const handleMovieClick = (movie: string) => {
    if (selectedMovies.includes(movie)) {
      setSelectedMovies(selectedMovies.filter((m) => m !== movie));
    } else if (selectedMovies.length < 3) {
      setSelectedMovies([...selectedMovies, movie]);
    }
  };

  const handleRemoveMovie = (index: number) => {
    setSelectedMovies(selectedMovies.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expert.trim()) {
      setMessage('Please enter the expert name.');
      return;
    }
    if (selectedMovies.length !== 3) {
      setMessage('Please select exactly 3 movies.');
      return;
    }
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expert, selectedMovies })
    });
    if (res.ok) {
      setMessage('Vote submitted successfully!');
      setExpert(createExpertId());
      setSelectedMovies([]);
      setTimeout(() => setMessage(''), 3000);
    } else {
      const data = await res.json().catch(() => null);
      setMessage(data?.error ?? 'Error submitting vote.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Vote for Top 20 Movies</h1>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor='expert'>Expert</label>
            <input
              id='expert'
              type='text'
              value={expert}
              onChange={(e) => setExpert(e.target.value)}
              placeholder='Наприклад: expert-1740000000000'
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.content}>
          {/* Left column - Select movies */}
          <div className={styles.column}>
            <h2 className={styles.columnTitle}>Select Your Top 3</h2>
            <div className={styles.moviesList}>
              {movies.map((movie, index) => (
                <div
                  key={movie}
                  className={`${styles.movieItem} ${selectedMovies.includes(movie) ? styles.movieItemSelected : ''}`}
                  onClick={() => handleMovieClick(movie)}
                >
                  <span className={styles.movieItemNumber}>{index + 1}</span>
                  <span className={styles.movieItemLabel}>{movie}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column - Selected movies */}
          <div className={styles.column}>
            <h2 className={styles.columnTitle}>Your Selection</h2>
            <div className={styles.selectedMovies}>
              {selectedMovies.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Click on movies to select your top 3</p>
                </div>
              ) : (
                <>
                  {selectedMovies.map((movie, index) => (
                    <div key={index} className={styles.selectedMovie}>
                      <span className={styles.selectedMovieRank}>{medals[index]}</span>
                      <span className={styles.selectedMovieName}>{movie}</span>
                      <button
                        className={styles.selectedMovieRemove}
                        onClick={() => handleRemoveMovie(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {selectedMovies.length === 3 && (
                    <button
                      className={styles.button}
                      onClick={handleSubmit}
                      style={{ marginTop: '20px' }}
                    >
                      Confirm Vote
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {message && <p className={styles.message}>{message}</p>}

        <div className={styles.adminLink}>
          <a href='/admin'>Admin Panel</a>
        </div>
      </div>
    </div>
  );
}
