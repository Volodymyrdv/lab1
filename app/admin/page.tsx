'use client';

import { useEffect, useState } from 'react';
import baseStyles from '../page.module.css';
import styles from './admin.module.css';
import { movies } from '@/lib/movies';
import { getHeuristicByValue, heuristics } from '@/lib/heuristics';
import popularObjects from '@/data/lab1-popular-objects.json';

interface VoteRow {
  id: number;
  expert: string;
  first_place: string;
  second_place: string;
  third_place: string;
  created_at: string;
}

interface Lab2VoteRow {
  id: number;
  expert: string;
  first_choice: string;
  second_choice: string;
  third_choice: string;
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

interface HeuristicRankingRow {
  code: string;
  description: string;
  points: number;
}

interface HeuristicStepRow {
  code: string;
  beforeCount: number;
  afterCount: number;
  removedCount: number;
}

const lab1ScoreMap = {
  first_place: 3,
  second_place: 2,
  third_place: 1
} as const;

const lab2ScoreMap = {
  first_choice: 3,
  second_choice: 2,
  third_choice: 1
} as const;

const getHeuristicCode = (value: string) => getHeuristicByValue(value)?.code ?? value;

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [lab2Votes, setLab2Votes] = useState<Lab2VoteRow[]>([]);
  const [activeLab, setActiveLab] = useState<'lab1' | 'lab2'>('lab1');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const loadData = async () => {
      const [lab1Response, lab2Response] = await Promise.all([
        fetch('/api/vote'),
        fetch('/api/lab2-vote')
      ]);

      const [lab1Data, lab2Data] = await Promise.all([lab1Response.json(), lab2Response.json()]);

      setVotes(Array.isArray(lab1Data) ? lab1Data : []);
      setLab2Votes(Array.isArray(lab2Data) ? lab2Data : []);
    };

    loadData();
    const interval = setInterval(loadData, 5000);

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
          return total + lab1ScoreMap.first_place;
        }
        if (vote.second_place === movie) {
          return total + lab1ScoreMap.second_place;
        }
        if (vote.third_place === movie) {
          return total + lab1ScoreMap.third_place;
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

  const heuristicRankingRows: HeuristicRankingRow[] = heuristics
    .map((heuristic) => {
      const points = lab2Votes.reduce((total, vote) => {
        if (vote.first_choice === heuristic.value) {
          return total + lab2ScoreMap.first_choice;
        }
        if (vote.second_choice === heuristic.value) {
          return total + lab2ScoreMap.second_choice;
        }
        if (vote.third_choice === heuristic.value) {
          return total + lab2ScoreMap.third_choice;
        }
        return total;
      }, 0);

      return {
        code: heuristic.code,
        description: heuristic.description,
        points
      };
    })
    .sort((a, b) => b.points - a.points || a.code.localeCompare(b.code));

  const topHeuristics = heuristicRankingRows.filter((row) => row.points > 0).slice(0, 3);
  const baseSubset = structureRows.filter((row) => popularObjects.includes(row.movie));

  const matchesHeuristic = (row: StructureRow, code: string) => {
    switch (code) {
      case 'E1':
        return row.thirdPlace === 1;
      case 'E2':
        return row.secondPlace === 1;
      case 'E3':
        return row.firstPlace === 1;
      case 'E4':
        return row.thirdPlace === 2;
      case 'E5':
        return row.thirdPlace === 1 && row.secondPlace === 1;
      case 'E6':
        return row.firstPlace === 0;
      case 'E7':
        return row.totalVotes === 1;
      default:
        return false;
    }
  };

  const heuristicSteps: HeuristicStepRow[] = [];
  let currentSubset = [...baseSubset];

  topHeuristics.forEach((heuristic) => {
    const beforeCount = currentSubset.length;
    const filteredSubset = currentSubset.filter((row) => !matchesHeuristic(row, heuristic.code));
    const afterCount = filteredSubset.length;

    heuristicSteps.push({
      code: heuristic.code,
      beforeCount,
      afterCount,
      removedCount: beforeCount - afterCount
    });

    currentSubset = filteredSubset;
  });

  const finalSubset = currentSubset;

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
            <button
              type='button'
              className={`${styles.navButton} ${activeLab === 'lab1' ? styles.navButtonActive : ''}`}
              onClick={() => setActiveLab('lab1')}
            >
              Лаб1
            </button>
            <button
              type='button'
              className={`${styles.navButton} ${activeLab === 'lab2' ? styles.navButtonActive : ''}`}
              onClick={() => setActiveLab('lab2')}
            >
              Лаб2
            </button>
          </div>
          <button
            onClick={() => setIsLoggedIn(false)}
            className={`${baseStyles.button} ${styles.logoutButton}`}
          >
            Logout
          </button>
        </div>

        {activeLab === 'lab1' ? (
          <>
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
              <h2 className={styles.sectionTitle}>
                Лабораторна 1 - структура голосування по фільмам
              </h2>
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
          </>
        ) : (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Протокол ЛР2</h2>
              <p className={styles.sectionText}>Всього голосів: {lab2Votes.length}</p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Експерт</th>
                      <th>Обрані евристики</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lab2Votes.length > 0 ? (
                      lab2Votes.map((vote) => (
                        <tr key={vote.id}>
                          <td>{vote.expert}</td>
                          <td>
                            {[
                              getHeuristicCode(vote.first_choice),
                              getHeuristicCode(vote.second_choice),
                              getHeuristicCode(vote.third_choice)
                            ].join(', ')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className={`${styles.centerCell} ${styles.muted}`}>
                          Поки що немає голосів по евристиках
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Популярність евристик</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Місце</th>
                      <th>Евристика</th>
                      <th>Кількість</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heuristicRankingRows.map((row, index) => (
                      <tr key={row.code}>
                        <td>{index + 1}</td>
                        <td>{row.description}</td>
                        <td>{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Підмножина переможців (макс. 10)</h2>
              <p className={styles.sectionText}>
                Застосовано топ-3 евристики:{' '}
                {topHeuristics.length > 0
                  ? topHeuristics.map((heuristic) => heuristic.code).join(', ')
                  : 'ще не визначені'}
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Евристика</th>
                      <th>Було</th>
                      <th>Стало</th>
                      <th>Відсіяно</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heuristicSteps.length > 0 ? (
                      heuristicSteps.map((step) => (
                        <tr key={step.code}>
                          <td>{step.code}</td>
                          <td>{step.beforeCount}</td>
                          <td>{step.afterCount}</td>
                          <td>{step.removedCount}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className={`${styles.centerCell} ${styles.muted}`}>
                          Ще немає голосів для застосування евристик
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <tbody>
                    {finalSubset.length > 0 ? (
                      finalSubset.map((row, index) => (
                        <tr key={row.movie}>
                          <td>{index + 1}. {row.movie}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className={`${styles.centerCell} ${styles.muted}`}>
                          Після застосування евристик об&apos;єкти не залишилися
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
