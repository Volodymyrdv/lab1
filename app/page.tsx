'use client';

import { useState } from 'react';
import styles from './page.module.css';

const movies = [
  'The Shawshank Redemption',
  'The Godfather',
  'The Dark Knight',
  'Pulp Fiction',
  'Forrest Gump',
  'Inception',
  'Скажене весілля',
  'The Matrix',
  'Goodfellas',
  'The Lord of the Rings: The Fellowship of the Ring',
  'Star Wars: Episode V - The Empire Strikes Back',
  'The Silence of the Lambs',
  "Schindler's List",
  'Titanic',
  'Gladiator',
  'The Avengers',
  'Interstellar',
  'Parasite',
  'Joker',
  'Avengers: Endgame'
];

const medals = ['🥇', '🥈', '🥉'];

export default function Home() {
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
    if (selectedMovies.length !== 3) {
      setMessage('Please select exactly 3 movies.');
      return;
    }
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedMovies })
    });
    if (res.ok) {
      setMessage('Vote submitted successfully!');
      setSelectedMovies([]);
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Error submitting vote.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Vote for Top 20 Movies</h1>

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
