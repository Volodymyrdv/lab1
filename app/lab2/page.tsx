'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from '../page.module.css';
import { heuristics } from '@/lib/heuristics';

const medals = ['🥇', '🥈', '🥉'];
const createExpertId = () => `expert-${Date.now()}`;

export default function Lab2Page() {
  const [expert, setExpert] = useState(createExpertId);
  const [selectedHeuristics, setSelectedHeuristics] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const handleHeuristicClick = (heuristic: string) => {
    if (selectedHeuristics.includes(heuristic)) {
      setSelectedHeuristics(selectedHeuristics.filter((item) => item !== heuristic));
    } else if (selectedHeuristics.length < 3) {
      setSelectedHeuristics([...selectedHeuristics, heuristic]);
    }
  };

  const handleRemoveHeuristic = (index: number) => {
    setSelectedHeuristics(selectedHeuristics.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expert.trim()) {
      setMessage('Please enter the expert name.');
      return;
    }

    if (selectedHeuristics.length !== 3) {
      setMessage('Please select exactly 3 heuristics.');
      return;
    }

    const res = await fetch('/api/lab2-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expert, selectedHeuristics })
    });

    if (res.ok) {
      setMessage('Heuristics submitted successfully!');
      setExpert(createExpertId());
      setSelectedHeuristics([]);
      setTimeout(() => setMessage(''), 3000);
    } else {
      const data = await res.json().catch(() => null);
      setMessage(data?.error ?? 'Error submitting heuristics.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topNav}>
          <Link href='/' className={styles.topNavLink}>
            Лаб1
          </Link>
          <Link href='/lab2' className={`${styles.topNavLink} ${styles.topNavLinkActive}`}>
            Лаб2
          </Link>
        </div>

        <h1 className={styles.pageTitle}>Lab 2 - Heuristic Selection</h1>

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
          <div className={styles.column}>
            <h2 className={styles.columnTitle}>Оберіть 3 евристики</h2>
            <div className={styles.moviesList}>
              {heuristics.map((heuristic, index) => (
                <div
                  key={heuristic}
                  className={`${styles.movieItem} ${selectedHeuristics.includes(heuristic) ? styles.movieItemSelected : ''}`}
                  onClick={() => handleHeuristicClick(heuristic)}
                >
                  <span className={styles.movieItemNumber}>{index + 1}</span>
                  <span className={styles.movieItemLabel}>{heuristic}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.column}>
            <h2 className={styles.columnTitle}>Ваш вибір</h2>
            <div className={styles.selectedMovies}>
              {selectedHeuristics.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Натисніть на евристики, щоб обрати топ 3</p>
                </div>
              ) : (
                <>
                  {selectedHeuristics.map((heuristic, index) => (
                    <div key={heuristic} className={styles.selectedMovie}>
                      <span className={styles.selectedMovieRank}>{medals[index]}</span>
                      <span className={styles.selectedMovieName}>{heuristic}</span>
                      <button
                        className={styles.selectedMovieRemove}
                        onClick={() => handleRemoveHeuristic(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {selectedHeuristics.length === 3 && (
                    <button
                      className={styles.button}
                      onClick={handleSubmit}
                      style={{ marginTop: '20px' }}
                    >
                      Confirm Heuristics
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
