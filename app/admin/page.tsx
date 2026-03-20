'use client';

import { useEffect, useState } from 'react';
import baseStyles from '../page.module.css';
import styles from './admin.module.css';
import { movies } from '@/lib/movies';

interface VoteRow {
  id: number;
  expert: string;
  first_place: string;
  second_place: string;
  third_place: string;
  created_at: string;
}

interface RatingRow {
  movie: string;
  points: number;
}

interface StructureRow {
  movie: string;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  totalVotes: number;
}

const scoreMap = {
  first_place: 3,
  second_place: 2,
  third_place: 1
} as const;

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const loadVotes = () => {
      fetch('/api/vote')
        .then((res) => res.json())
        .then((data) => setVotes(Array.isArray(data) ? data : []));
    };

    loadVotes();
    const interval = setInterval(loadVotes, 5000);

    return () => clearInterval(interval);
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

  const ratingRows: RatingRow[] = movies
    .map((movie) => {
      const points = votes.reduce((total, vote) => {
        if (vote.first_place === movie) {
          return total + scoreMap.first_place;
        }
        if (vote.second_place === movie) {
          return total + scoreMap.second_place;
        }
        if (vote.third_place === movie) {
          return total + scoreMap.third_place;
        }
        return total;
      }, 0);

      return { movie, points };
    })
    .sort((a, b) => b.points - a.points || a.movie.localeCompare(b.movie));

  const structureRows: StructureRow[] = movies
    .map((movie) => {
      const firstPlace = votes.filter((vote) => vote.first_place === movie).length;
      const secondPlace = votes.filter((vote) => vote.second_place === movie).length;
      const thirdPlace = votes.filter((vote) => vote.third_place === movie).length;

      return {
        movie,
        firstPlace,
        secondPlace,
        thirdPlace,
        totalVotes: firstPlace + secondPlace + thirdPlace
      };
    })
    .sort((a, b) => b.totalVotes - a.totalVotes || a.movie.localeCompare(b.movie));

  if (!isLoggedIn) {
    return (
      <div className={baseStyles.page}>
        <div className={baseStyles.container}>
          <h1 className={baseStyles.pageTitle}>Admin Login</h1>
          <div
            className={baseStyles.content}
            style={{ maxWidth: '400px', margin: '0 auto', display: 'block' }}
          >
            <div className={baseStyles.column}>
              <form onSubmit={handleLogin}>
                <div className={baseStyles.inputGroup}>
                  <label>Username:</label>
                  <input
                    type='text'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={baseStyles.input}
                  />
                </div>
                <div className={baseStyles.inputGroup}>
                  <label>Password:</label>
                  <input
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={baseStyles.input}
                  />
                </div>
                <button type='submit' className={baseStyles.button}>
                  Login
                </button>
              </form>
              {message && <p className={baseStyles.message}>{message}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.shell}>
        <h1 className={styles.heading}>Адмін панель</h1>

        <div className={styles.toolbar}>
          <div className={styles.nav}>
            <button type='button' className={`${styles.navButton} ${styles.navButtonActive}`}>
              Лаб1
            </button>
          </div>
          <button
            onClick={() => setIsLoggedIn(false)}
            className={`${baseStyles.button} ${styles.logoutButton}`}
          >
            Logout
          </button>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Лабораторна 1 - протокол голосування</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Експерт</th>
                  <th>1 місце</th>
                  <th>2 місце</th>
                  <th>3 місце</th>
                  <th>Час</th>
                </tr>
              </thead>
              <tbody>
                {votes.length > 0 ? (
                  votes.map((vote) => (
                    <tr key={vote.id}>
                      <td>{vote.expert}</td>
                      <td>{vote.first_place}</td>
                      <td>{vote.second_place}</td>
                      <td>{vote.third_place}</td>
                      <td>{new Date(vote.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={`${styles.centerCell} ${styles.muted}`}>
                      Поки що немає голосів
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Лабораторна 1 - рейтинг об&apos;єктів</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Місце</th>
                  <th>Об&apos;єкт</th>
                  <th>Бали</th>
                </tr>
              </thead>
              <tbody>
                {ratingRows.map((row, index) => (
                  <tr key={row.movie}>
                    <td>{index + 1}</td>
                    <td>{row.movie}</td>
                    <td>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Лабораторна 1 - структура голосування по фільмам</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Фільм</th>
                  <th>1 місце</th>
                  <th>2 місце</th>
                  <th>3 місце</th>
                  <th>Всього голосів</th>
                </tr>
              </thead>
              <tbody>
                {structureRows.map((row) => (
                  <tr key={row.movie}>
                    <td>{row.movie}</td>
                    <td>{row.firstPlace}</td>
                    <td>{row.secondPlace}</td>
                    <td>{row.thirdPlace}</td>
                    <td>{row.totalVotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
