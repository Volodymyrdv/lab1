'use client';

import { useEffect, useMemo, useState } from 'react';
import baseStyles from '../page.module.css';
import styles from './admin.module.css';
import { movies } from '@/lib/movies';
import { getHeuristicByValue, heuristics } from '@/lib/heuristics';

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

interface Lab2FilterRow extends StructureRow {
  rank: number;
  ratingPoints: number;
  matchedHeuristics: string[];
  removedBy: string | null;
  isIncluded: boolean;
}

interface ExpertRankingRow {
  expert: string;
  ranking: string[];
}

interface EvolutionResult {
  totalPermutations: number;
  populationSize: number;
  generations: number;
  bestRanking: string[];
  bestSumDistance: number;
  topRankings: { ranking: string[]; sumDistance: number }[];
  durationMs: number;
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

const shuffleWithSeed = (items: string[], seed: number) => {
  const result = [...items];
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 48271) % 2147483647;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
};

const generateExpertRankings = (candidates: string[], count: number): ExpertRankingRow[] =>
  Array.from({ length: count }).map((_, index) => ({
    expert: `Експерт ${index + 1}`,
    ranking: shuffleWithSeed(candidates, 1000 + index * 37)
  }));

const calculateHammingDistanceFull = (ranking: string[], expertRanking: string[]) =>
  ranking.reduce((total, movie, index) => total + (expertRanking[index] === movie ? 0 : 1), 0);

const calculateSumHammingAgainstExperts = (ranking: string[], expertRankings: ExpertRankingRow[]) =>
  expertRankings.reduce(
    (total, expertRow) => total + calculateHammingDistanceFull(ranking, expertRow.ranking),
    0
  );

const factorial = (value: number) => {
  let result = 1;
  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }
  return result;
};

const mutateChromosome = (chromosome: string[]) => {
  if (chromosome.length < 2) {
    return chromosome;
  }

  const mutated = [...chromosome];
  const leftIndex = Math.floor(Math.random() * mutated.length);
  let rightIndex = Math.floor(Math.random() * mutated.length);
  if (rightIndex === leftIndex) {
    rightIndex = (rightIndex + 1) % mutated.length;
  }

  [mutated[leftIndex], mutated[rightIndex]] = [mutated[rightIndex], mutated[leftIndex]];
  return mutated;
};

const tournamentSelect = (
  population: { chromosome: string[]; sumDistance: number }[],
  tournamentSize: number
) => {
  let best = population[Math.floor(Math.random() * population.length)];

  for (let i = 1; i < tournamentSize; i += 1) {
    const candidate = population[Math.floor(Math.random() * population.length)];
    if (candidate.sumDistance < best.sumDistance) {
      best = candidate;
    }
  }

  return best;
};

const generatePermutations = (items: string[]) => {
  const result: string[][] = [];
  const working = [...items];
  const c = new Array(working.length).fill(0);

  result.push([...working]);
  let i = 0;

  while (i < working.length) {
    if (c[i] < i) {
      if (i % 2 === 0) {
        [working[0], working[i]] = [working[i], working[0]];
      } else {
        [working[c[i]], working[i]] = [working[i], working[c[i]]];
      }
      result.push([...working]);
      c[i] += 1;
      i = 0;
    } else {
      c[i] = 0;
      i += 1;
    }
  }

  return result;
};

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

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [lab2Votes, setLab2Votes] = useState<Lab2VoteRow[]>([]);
  const [activeLab, setActiveLab] = useState<'lab1' | 'lab2'>('lab1');
  const [message, setMessage] = useState('');
  const [evolutionResult, setEvolutionResult] = useState<EvolutionResult | null>(null);
  const [isEvolutionRunning, setIsEvolutionRunning] = useState(false);

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

  const ratingRows = useMemo<RatingRow[]>(
    () =>
      movies
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
        .sort((a, b) => b.points - a.points || a.movie.localeCompare(b.movie)),
    [votes]
  );

  const structureRows = useMemo<StructureRow[]>(
    () =>
      movies
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
        .sort((a, b) => b.totalVotes - a.totalVotes || a.movie.localeCompare(b.movie)),
    [votes]
  );

  const heuristicRankingRows = useMemo<HeuristicRankingRow[]>(
    () =>
      heuristics
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
        .sort((a, b) => b.points - a.points || a.code.localeCompare(b.code)),
    [lab2Votes]
  );

  const lab2Analysis = useMemo(() => {
    const topHeuristics = heuristicRankingRows.filter((row) => row.points > 0).slice(0, 3);
    const baseSubset = ratingRows
      .slice(0, movies.length)
      .map((row) => structureRows.find((item) => item.movie === row.movie))
      .filter((row): row is StructureRow => Boolean(row));

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

    return {
      baseSubset,
      topHeuristics,
      heuristicSteps,
      finalSubset: currentSubset
    };
  }, [heuristicRankingRows, ratingRows, structureRows]);

  const lab2FilterRows = useMemo<Lab2FilterRow[]>(
    () =>
      ratingRows.map((ratingRow, index) => {
        const structureRow = structureRows.find((row) => row.movie === ratingRow.movie);

        if (!structureRow) {
          return {
            movie: ratingRow.movie,
            rank: index + 1,
            ratingPoints: ratingRow.points,
            firstPlace: 0,
            secondPlace: 0,
            thirdPlace: 0,
            totalVotes: 0,
            matchedHeuristics: [],
            removedBy: null,
            isIncluded: false
          };
        }

        const matchedHeuristics = lab2Analysis.topHeuristics
          .map((heuristic) => heuristic.code)
          .filter((code) => matchesHeuristic(structureRow, code));

        const removedBy =
          lab2Analysis.topHeuristics.find((heuristic) =>
            matchesHeuristic(structureRow, heuristic.code)
          )?.code ?? null;

        return {
          ...structureRow,
          rank: index + 1,
          ratingPoints: ratingRow.points,
          matchedHeuristics,
          removedBy,
          isIncluded: !removedBy
        };
      }),
    [lab2Analysis.topHeuristics, ratingRows, structureRows]
  );

  const lab2FinalCandidates = useMemo(
    () => lab2Analysis.finalSubset.map((row) => row.movie),
    [lab2Analysis.finalSubset]
  );

  const lab2ExpertRankings = useMemo(
    () => generateExpertRankings(lab2FinalCandidates, 15),
    [lab2FinalCandidates]
  );

  const runEvolutionSearch = async () => {
    if (lab2FinalCandidates.length === 0) {
      setEvolutionResult(null);
      return;
    }

    if (lab2FinalCandidates.length !== 8) {
      setEvolutionResult(null);
      return;
    }

    if (lab2ExpertRankings.length === 0) {
      setEvolutionResult(null);
      return;
    }

    setIsEvolutionRunning(true);
    setEvolutionResult(null);
    const start = Date.now();
    const totalPermutations = factorial(lab2FinalCandidates.length);
    const populationSize = totalPermutations;
    const generations = 20;
    const tournamentSize = 3;
    const mutationRate = 0.35;

    let population = generatePermutations(lab2FinalCandidates);

    const evaluatePopulation = async (current: string[][]) => {
      const chunkSize = 1000;
      const chunks: string[][][] = [];

      for (let index = 0; index < current.length; index += chunkSize) {
        chunks.push(current.slice(index, index + chunkSize));
      }

      const evaluatedChunks = await Promise.all(
        chunks.map(
          (chunk) =>
            new Promise<{ chromosome: string[]; sumDistance: number }[]>((resolve) => {
              setTimeout(() => {
                const evaluated = chunk.map((chromosome) => ({
                  chromosome,
                  sumDistance: calculateSumHammingAgainstExperts(chromosome, lab2ExpertRankings)
                }));
                resolve(evaluated);
              }, 0);
            })
        )
      );

      return evaluatedChunks.flat();
    };

    let evaluated = await evaluatePopulation(population);
    let best = evaluated[0];
    let globalTop: { ranking: string[]; sumDistance: number }[] = [];

    for (let gen = 1; gen <= generations; gen += 1) {
      for (let i = 1; i < evaluated.length; i += 1) {
        if (evaluated[i].sumDistance < best.sumDistance) {
          best = evaluated[i];
        }
      }

      const currentTop = [...evaluated]
        .sort((left, right) => left.sumDistance - right.sumDistance)
        .slice(0, 40)
        .map((item) => ({ ranking: item.chromosome, sumDistance: item.sumDistance }));

      globalTop = [...globalTop, ...currentTop]
        .sort((left, right) => left.sumDistance - right.sumDistance)
        .filter(
          (item, index, collection) =>
            collection.findIndex((row) => row.ranking.join('|') === item.ranking.join('|')) ===
            index
        )
        .slice(0, 40);

      const nextPopulation: string[][] = [];
      while (nextPopulation.length < populationSize) {
        const parent = tournamentSelect(evaluated, tournamentSize);
        const child =
          Math.random() < mutationRate ? mutateChromosome(parent.chromosome) : parent.chromosome;
        nextPopulation.push(child);
      }

      population = nextPopulation;
      evaluated = await evaluatePopulation(population);
    }

    setEvolutionResult({
      totalPermutations,
      populationSize,
      generations,
      bestRanking: best.chromosome,
      bestSumDistance: best.sumDistance,
      topRankings: globalTop,
      durationMs: Date.now() - start
    });
    setIsEvolutionRunning(false);
  };
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
        ) : activeLab === 'lab2' ? (
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
              <h2 className={styles.sectionTitle}>Фільтрування 20 об&apos;єктів</h2>
              <p className={styles.sectionText}>
                Застосовано топ-3 евристики:{' '}
                {lab2Analysis.topHeuristics.length > 0
                  ? lab2Analysis.topHeuristics.map((heuristic) => heuristic.code).join(', ')
                  : 'ще не визначені'}
              </p>
              <p className={styles.sectionText}>
                Базова множина для ЛР2 формується з усіх 20 об&apos;єктів із таблиці рейтингу ЛР1.
                Для кожного об&apos;єкта нижче показано, чи спрацьовує на ньому одна з обраних
                евристик.
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Місце</th>
                      <th>Фільм</th>
                      <th>Бали</th>
                      <th>1 місце</th>
                      <th>2 місце</th>
                      <th>3 місце</th>
                      <th>Всього голосів</th>
                      <th>Спрацювали евристики</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lab2FilterRows.map((row) => (
                      <tr key={row.movie}>
                        <td>{row.rank}</td>
                        <td>{row.movie}</td>
                        <td>{row.ratingPoints}</td>
                        <td>{row.firstPlace}</td>
                        <td>{row.secondPlace}</td>
                        <td>{row.thirdPlace}</td>
                        <td>{row.totalVotes}</td>
                        <td>
                          {row.matchedHeuristics.length > 0
                            ? row.matchedHeuristics.join(', ')
                            : '-'}
                        </td>
                        <td>{row.isIncluded ? 'Залишився' : `Відсіяно (${row.removedBy})`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Підсумок застосування евристик</h2>
              <p className={styles.sectionText}>
                На кожному кроці показано, як змінюється кількість об&apos;єктів після послідовного
                застосування топ-3 евристик до всіх 20 фільмів.
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
                    {lab2Analysis.heuristicSteps.length > 0 ? (
                      lab2Analysis.heuristicSteps.map((step) => (
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
              <h2 className={styles.sectionTitle}>Фінальна підмножина після евристик</h2>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Фільм</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lab2FinalCandidates.length > 0 ? (
                      lab2FinalCandidates.map((movie, index) => (
                        <tr key={movie}>
                          <td>{index + 1}</td>
                          <td>{movie}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className={`${styles.centerCell} ${styles.muted}`}>
                          Після застосування евристик об&apos;єкти не залишилися
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Ранжування 15 експертів</h2>
              {lab2ExpertRankings.length > 0 ? (
                <div className={styles.tableWrap}>
                  {lab2ExpertRankings.map((row) => (
                    <p key={row.expert} className={styles.sectionText}>
                      {row.expert}: {row.ranking.join(' > ')}
                    </p>
                  ))}
                </div>
              ) : (
                <p className={`${styles.sectionText} ${styles.muted}`}>
                  Немає даних для ранжування експертів
                </p>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Еволюційні стратегії</h2>
              <button
                type='button'
                className={baseStyles.button}
                onClick={runEvolutionSearch}
                disabled={isEvolutionRunning || lab2FinalCandidates.length !== 8}
              >
                {isEvolutionRunning ? 'Розрахунок...' : 'Запустити алгоритм'}
              </button>
              {lab2FinalCandidates.length !== 8 && (
                <p className={`${styles.sectionText} ${styles.muted}`}>
                  Для запуску потрібно рівно 8 об&apos;єктів у фінальній підмножині.
                </p>
              )}
              {evolutionResult && (
                <div className={styles.subSection}>
                  <h3 className={styles.subTitle}>Найкраща перестановка</h3>
                  <p className={styles.sectionText}>
                    Ранжування: {evolutionResult.bestRanking.join(' > ')}
                  </p>
                  <p className={styles.sectionText}>
                    Сума відстаней Хемінга: {evolutionResult.bestSumDistance}
                  </p>
                  <p className={styles.sectionText}>
                    Розмір популяції: {evolutionResult.populationSize}
                  </p>
                  <p className={styles.sectionText}>
                    Кількість поколінь: {evolutionResult.generations}
                  </p>
                </div>
              )}
              {evolutionResult && evolutionResult.topRankings.length > 0 && (
                <div className={styles.subSection}>
                  <h3 className={styles.subTitle}>Топ-40 перестановок</h3>
                  <div className={styles.tableWrap}>
                    {evolutionResult.topRankings.map((row, index) => (
                      <p key={`${row.ranking.join('|')}-${index}`} className={styles.sectionText}>
                        {index + 1}. {row.ranking.join(' > ')} (ΣH = {row.sumDistance})
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
