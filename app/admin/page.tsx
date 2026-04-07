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

interface Lab3ExpertRow {
  choices: string[];
}

interface PermutationResult {
  ranking: string[];
  sumDistance: number;
}

interface EvolutionPopulationRow {
  generation: number;
  individual: number;
  chromosome: string[];
  sumDistance: number;
  fitness: number;
  isBest: boolean;
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

const calculateHammingDistance = (ranking: string[], expertChoices: string[]) => {
  const comparedRanking = ranking.slice(0, expertChoices.length);

  return expertChoices.reduce(
    (total, movie, index) => total + (comparedRanking[index] === movie ? 0 : 1),
    0
  );
};

const calculateSumHammingDistance = (ranking: string[], expertRows: Lab3ExpertRow[]) =>
  expertRows.reduce(
    (total, expertRow) => total + calculateHammingDistance(ranking, expertRow.choices),
    0
  );

const calculateEvolutionFitness = (chromosome: string[], expertRows: Lab3ExpertRow[]) => {
  const sumDistance = calculateSumHammingDistance(chromosome, expertRows);
  const fitness = Number((1 / (1 + sumDistance)).toFixed(4));

  return {
    sumDistance,
    fitness
  };
};

const rotateChromosome = (chromosome: string[], shift: number) => {
  if (chromosome.length === 0) {
    return [];
  }

  const offset = shift % chromosome.length;
  return [...chromosome.slice(offset), ...chromosome.slice(0, offset)];
};

const mutateChromosome = (chromosome: string[], generation: number) => {
  if (chromosome.length < 2) {
    return chromosome;
  }

  const mutated = [...chromosome];
  const leftIndex = generation % chromosome.length;
  const rightIndex = (generation + 2) % chromosome.length;

  [mutated[leftIndex], mutated[rightIndex]] = [mutated[rightIndex], mutated[leftIndex]];

  return mutated;
};

const deduplicatePopulation = (population: string[][]) =>
  population.filter(
    (chromosome, index, collection) =>
      collection.findIndex((item) => item.join('|') === chromosome.join('|')) === index
  );

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

function MatrixTable({
  title,
  candidates,
  matrix
}: {
  title: string;
  candidates: string[];
  matrix: number[][];
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Об&apos;єкт</th>
              {candidates.map((candidate) => (
                <th key={candidate}>{candidate}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate, rowIndex) => (
              <tr key={candidate}>
                <td>{candidate}</td>
                {matrix[rowIndex].map((value, columnIndex) => (
                  <td key={`${candidate}-${candidates[columnIndex]}`}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExpertRankMatrixTable({
  title,
  candidates,
  experts,
  matrix
}: {
  title: string;
  candidates: string[];
  experts: string[];
  matrix: number[][];
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Об&apos;єкт</th>
              {experts.map((expert, index) => (
                <th key={expert}>{index + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate, rowIndex) => (
              <tr key={candidate}>
                <td>{candidate}</td>
                {matrix[rowIndex].map((value, columnIndex) => (
                  <td key={`${candidate}-${experts[columnIndex]}`}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.sectionText}>
        Нумерація стовпців відповідає порядку експертів у протоколі ЛР1. `1`, `2`, `3` показують
        місце об&apos;єкта в експерта, `0` означає, що об&apos;єкт не потрапив до його трійки.
      </p>
    </section>
  );
}

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [lab2Votes, setLab2Votes] = useState<Lab2VoteRow[]>([]);
  const [activeLab, setActiveLab] = useState<'lab1' | 'lab2' | 'lab3'>('lab1');
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

  const lab2EvolutionAnalysis = useMemo(() => {
    const candidates = lab2Analysis.finalSubset.map((row) => row.movie);

    const expertRows: Lab3ExpertRow[] = votes
      .map((vote) => ({
        choices: [vote.first_place, vote.second_place, vote.third_place]
      }))
      .filter((row) => row.choices.length > 0);

    if (candidates.length === 0) {
      return {
        candidates,
        expertRows,
        finalPopulationRows: [] as EvolutionPopulationRow[]
      };
    }

    const defaultOrder = [...candidates];
    const reverseOrder = [...candidates].reverse();
    const targetPopulationSize = 100;
    const survivorCount = Math.max(2, Math.ceil(targetPopulationSize / 4));
    const totalGenerations = 50;

    const initialPopulationPool: string[][] = [defaultOrder, reverseOrder];

    for (let shift = 1; shift < candidates.length; shift += 1) {
      initialPopulationPool.push(rotateChromosome(defaultOrder, shift));
      initialPopulationPool.push(rotateChromosome(reverseOrder, shift));
    }

    initialPopulationPool.push(mutateChromosome(defaultOrder, 1));
    initialPopulationPool.push(mutateChromosome(reverseOrder, 2));

    let population = deduplicatePopulation(initialPopulationPool).slice(0, targetPopulationSize);

    const populationRows: EvolutionPopulationRow[] = [];

    for (let generation = 1; generation <= totalGenerations; generation += 1) {
      const rankedPopulation = population
        .map((chromosome) => ({
          chromosome,
          ...calculateEvolutionFitness(chromosome, expertRows)
        }))
        .sort(
          (left, right) => right.fitness - left.fitness || left.sumDistance - right.sumDistance
        );

      rankedPopulation.forEach((candidate, index) => {
        populationRows.push({
          generation,
          individual: index + 1,
          chromosome: candidate.chromosome,
          sumDistance: candidate.sumDistance,
          fitness: candidate.fitness,
          isBest: index === 0
        });
      });

      const survivors = rankedPopulation.slice(0, survivorCount);
      const nextPopulationPool = survivors.map((item) => item.chromosome);

      while (nextPopulationPool.length < targetPopulationSize) {
        const parentIndex = nextPopulationPool.length % survivors.length;
        const parent = survivors[parentIndex]?.chromosome ?? survivors[0].chromosome;
        const mutationSeed = generation + nextPopulationPool.length;

        nextPopulationPool.push(mutateChromosome(parent, mutationSeed));
        nextPopulationPool.push(rotateChromosome(parent, mutationSeed));
      }

      population = deduplicatePopulation(nextPopulationPool).slice(0, targetPopulationSize);

      if (population.length < targetPopulationSize) {
        const fallbackPopulation = [...population];

        for (let shift = 1; fallbackPopulation.length < targetPopulationSize; shift += 1) {
          fallbackPopulation.push(rotateChromosome(defaultOrder, shift));
          fallbackPopulation.push(mutateChromosome(reverseOrder, generation + shift));
        }

        population = deduplicatePopulation(fallbackPopulation).slice(0, targetPopulationSize);
      }
    }

    return {
      candidates,
      expertRows,
      finalPopulationRows: populationRows.filter((row) => row.generation === totalGenerations)
    };
  }, [lab2Analysis.finalSubset, votes]);

  const lab3Analysis = useMemo(() => {
    const candidates = lab2Analysis.finalSubset.map((row) => row.movie);
    const experts = votes.map((vote) => vote.expert);

    const expertRows: Lab3ExpertRow[] = votes
      .map((vote) => ({
        choices: [vote.first_place, vote.second_place, vote.third_place]
      }))
      .filter((row) => row.choices.length > 0);

    const expertRankMatrix = candidates.map((candidate) =>
      votes.map((vote) => {
        if (vote.first_place === candidate) {
          return 1;
        }

        if (vote.second_place === candidate) {
          return 2;
        }

        if (vote.third_place === candidate) {
          return 3;
        }

        return 0;
      })
    );

    const preferenceMatrix = candidates.map((leftCandidate) =>
      candidates.map((rightCandidate) => {
        if (leftCandidate === rightCandidate) {
          return 0;
        }

        return expertRows.reduce((total, row) => {
          const leftIndex = row.choices.indexOf(leftCandidate);
          const rightIndex = row.choices.indexOf(rightCandidate);

          if (leftIndex !== -1 && rightIndex !== -1) {
            return leftIndex < rightIndex ? total + 1 : total;
          }

          if (leftIndex !== -1 && rightIndex === -1) {
            return total + 1;
          }

          return total;
        }, 0);
      })
    );

    const permutationSamples: PermutationResult[] = [];
    const bestBySum: PermutationResult[] = [];
    let minSum = Number.POSITIVE_INFINITY;

    if (candidates.length > 0 && candidates.length <= 8) {
      const working = [...candidates];

      const evaluatePermutation = (ranking: string[]) => {
        const sumDistance = calculateSumHammingDistance(ranking, expertRows);
        const result = { ranking: [...ranking], sumDistance };

        if (permutationSamples.length < 10) {
          permutationSamples.push(result);
        }

        if (sumDistance < minSum) {
          minSum = sumDistance;
          bestBySum.length = 0;
          bestBySum.push(result);
        } else if (sumDistance === minSum && bestBySum.length < 5) {
          bestBySum.push(result);
        }
      };

      const generate = (n: number) => {
        if (n === 1) {
          evaluatePermutation(working);
          return;
        }

        generate(n - 1);

        for (let i = 0; i < n - 1; i += 1) {
          if (n % 2 === 0) {
            [working[i], working[n - 1]] = [working[n - 1], working[i]];
          } else {
            [working[0], working[n - 1]] = [working[n - 1], working[0]];
          }

          generate(n - 1);
        }
      };

      generate(working.length);
    }

    return {
      candidates,
      experts,
      expertRankMatrix,
      preferenceMatrix,
      permutationSamples,
      bestBySum,
      canEnumerate: candidates.length > 0 && candidates.length <= 8
    };
  }, [lab2Analysis.finalSubset, votes]);

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
            <button
              type='button'
              className={`${styles.navButton} ${activeLab === 'lab3' ? styles.navButtonActive : ''}`}
              onClick={() => setActiveLab('lab3')}
            >
              Лаб3
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
              <h2 className={styles.sectionTitle}>
                Фінальна підмножина після ЛР2 та еволюційні стратегії
              </h2>
              <p className={styles.sectionText}>
                Еволюційні стратегії оцінюють хромосоми через відстань Хемінга відносно експертних
                трійок. Для кожного експерта його повна трійка напряму порівнюється з першими трьома
                позиціями хромосоми без попередньої фільтрації. Для порівняння популяції
                використовується `Сума відстаней Хемінга`, а fitness-функція знову обчислюється як
                `1 / (1 + sumDistance)`. Найкращими вважаються хромосоми з найбільшим значенням
                `fitness`, що відповідає найменшому значенню `sumDistance`. Нова популяція
                формується без схрещування: лише через відбір найкращих особин, мутації та циклічні
                зсуви.
              </p>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Фільм</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lab2EvolutionAnalysis.candidates.length > 0 ? (
                      lab2EvolutionAnalysis.candidates.map((movie, index) => (
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

              <div className={styles.subSection}>
                <h3 className={styles.subTitle}>Фінальна популяція</h3>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Особина</th>
                        <th>Хромосома</th>
                        <th>Сума відстаней Хемінга</th>
                        <th>Fitness</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lab2EvolutionAnalysis.finalPopulationRows.length > 0 ? (
                        lab2EvolutionAnalysis.finalPopulationRows.map((row) => (
                          <tr
                            key={`${row.generation}-${row.individual}-${row.chromosome.join('|')}`}
                          >
                            <td>{row.individual}</td>
                            <td className={styles.sequenceCell}>{row.chromosome.join(' > ')}</td>
                            <td>{row.sumDistance}</td>
                            <td>{row.fitness}</td>
                            <td>{row.isBest ? 'Найкраща в поколінні' : 'Популяція'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className={`${styles.centerCell} ${styles.muted}`}>
                            Фінальна популяція ще не сформована
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Лабораторна 3 - перелік об&apos;єктів</h2>
              <p className={styles.sectionText}>
                До ЛР3 передається фінальна підмножина переможців після ЛР2.
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Об&apos;єкт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lab3Analysis.candidates.length > 0 ? (
                      lab3Analysis.candidates.map((candidate, index) => (
                        <tr key={candidate}>
                          <td>{index + 1}</td>
                          <td>{candidate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className={`${styles.centerCell} ${styles.muted}`}>
                          Після ЛР2 немає підмножини для ранжування
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <ExpertRankMatrixTable
              title='Лабораторна 3 - ранги за множинними порівняннями'
              candidates={lab3Analysis.candidates}
              experts={lab3Analysis.experts}
              matrix={lab3Analysis.expertRankMatrix}
            />

            <MatrixTable
              title='Лабораторна 3 - матриця статистики переваг'
              candidates={lab3Analysis.candidates}
              matrix={lab3Analysis.preferenceMatrix}
            />

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Лабораторна 3 - перевірка кількох перестановок
              </h2>
              <p className={styles.sectionText}>
                Для кожної перестановки обчислюється тільки сума відстаней Хемінга до експертних
                трійок.
              </p>
              {lab3Analysis.canEnumerate ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Перестановка</th>
                        <th>Сума відстаней Хемінга</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lab3Analysis.permutationSamples.map((sample, index) => (
                        <tr key={`${sample.ranking.join('|')}-${index}`}>
                          <td>{sample.ranking.join(' > ')}</td>
                          <td>{sample.sumDistance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.sectionText}>
                  Прямий перебір наразі запускається для підмножини до 8 об&apos;єктів, щоб не
                  блокувати інтерфейс браузера. Зараз у підмножині {lab3Analysis.candidates.length}{' '}
                  об&apos;єктів.
                </p>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Лабораторна 3 - колективне ранжування</h2>
              {lab3Analysis.canEnumerate ? (
                <>
                  <p className={styles.sectionText}>
                    Нижче наведено перестановки, що дають найменшу суму відстаней Хемінга.
                  </p>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Критерій</th>
                          <th>Ранжування</th>
                          <th>Сума відстаней Хемінга</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lab3Analysis.bestBySum.map((result, index) => (
                          <tr key={`sum-${result.ranking.join('|')}-${index}`}>
                            <td>Мінімум суми</td>
                            <td>{result.ranking.join(' > ')}</td>
                            <td>{result.sumDistance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className={styles.sectionText}>
                  Для прямого перебору спершу потрібно зменшити підмножину до 8 або менше
                  об&apos;єктів. Решта підготовчих розрахунків уже доступна в цій вкладці.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
