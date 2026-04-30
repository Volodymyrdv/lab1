'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import baseStyles from '../../page.module.css';
import styles from '../admin.module.css';

type ExpertRankingRow = {
  expert: string;
  ranking: string[];
};

type Lab3CandidateRow = {
  rank: number;
  movie: string;
  isSelected: boolean;
};

type ExhaustiveRankingResult = {
  ranking: string[];
  distances: number[];
  sumDistance: number;
  maxDistance: number;
};

type DistributedWorkerResult = {
  workerId: number;
  prefix: string[];
  permutationsProcessed: number;
  startedAtMs?: number;
  finishedAtMs?: number;
  durationMs?: number;
  minSumBest: ExhaustiveRankingResult | null;
  minMaxBest: ExhaustiveRankingResult | null;
};

type DistributedSearchResult = {
  totalPermutations: number;
  durationMs: number;
  workers: DistributedWorkerResult[];
  minSumBest: ExhaustiveRankingResult;
  minSumSolutions: ExhaustiveRankingResult[];
  minMaxBest: ExhaustiveRankingResult;
  minMaxSolutions: ExhaustiveRankingResult[];
};

type DistributedSearchProgress = {
  processedPermutations: number;
  totalPermutations: number;
  completedWorkers: number;
  totalWorkers: number;
  durationMs: number;
};

type Lab3EvolutionResult = {
  objective: 'min-sum' | 'min-max';
  populationSize: number;
  generations: number;
  bestRanking: string[];
  bestSumDistance: number;
  bestMaxDistance: number;
  topRankings: { ranking: string[]; sumDistance: number; maxDistance: number }[];
  durationMs: number;
};

type EvolutionRankingScore = {
  ranking: string[];
  sumDistance: number;
  maxDistance: number;
};

type Lab4EvolutionProgress = {
  generation: number;
  totalGenerations: number;
  durationMs: number;
};

type Lab4Method = 'distributed-search' | 'distributed-ga';

type ExpertSatisfactionRow = {
  expert: string;
  ranking: string[];
  ranks: number[];
  minSumDistance: number;
  minSumSatisfaction: number;
  minMaxDistance: number;
  minMaxSatisfaction: number;
};

type WorkerProgressMessage = {
  type: 'progress';
  workerId: number;
  processedPermutations: number;
};

type WorkerDoneMessage = {
  type: 'done';
  result: DistributedWorkerResult;
};

type WorkerErrorMessage = {
  type: 'error';
  workerId: number;
  error: string;
};

type WorkerMessage = WorkerProgressMessage | WorkerDoneMessage | WorkerErrorMessage;

type Lab4SectionProps = {
  lab3CandidateRows: Lab3CandidateRow[];
  lab3ObjectCount: number;
  onLab3ObjectCountChange: (value: number) => void;
  lab3Candidates: string[];
  lab3ExpertRankings: ExpertRankingRow[];
  lab3ExhaustiveSearch: {
    durationMs: number;
    minSumBest: {
      ranking: string[];
      sumDistance: number;
      maxDistance: number;
    };
    minMaxBest: {
      ranking: string[];
      sumDistance: number;
      maxDistance: number;
    };
  } | null;
  lab3EvolutionResult: Lab3EvolutionResult | null;
  lab3ExpertCount: number;
  onLab3ExpertCountChange: (value: number) => void;
  onRegenerateLab3ExpertRankings: () => void;
  lab3FitnessMode: 'min-sum' | 'min-max';
  onLab3FitnessModeChange: (value: 'min-sum' | 'min-max') => void;
  runLab3EvolutionSearch: () => void;
  isLab3EvolutionRunning: boolean;
  formatRankingOrderNumbers: (ranking: string[], candidates: string[]) => string;
};

const factorial = (value: number) => {
  let result = 1;

  for (let index = 2; index <= value; index += 1) {
    result *= index;
  }

  return result;
};

const compareRankingsAlphabetically = (left: string[], right: string[]) =>
  left.join('|').localeCompare(right.join('|'));

const compareMinSumResults = (left: ExhaustiveRankingResult, right: ExhaustiveRankingResult) =>
  left.sumDistance - right.sumDistance ||
  left.maxDistance - right.maxDistance ||
  compareRankingsAlphabetically(left.ranking, right.ranking);

const compareMinMaxResults = (left: ExhaustiveRankingResult, right: ExhaustiveRankingResult) =>
  left.maxDistance - right.maxDistance ||
  left.sumDistance - right.sumDistance ||
  compareRankingsAlphabetically(left.ranking, right.ranking);

const calculateRankDistance = (ranking: string[], expertRanking: string[]) => {
  const rankByCandidate = new Map(ranking.map((candidate, index) => [candidate, index + 1]));

  return expertRanking.reduce((distance, candidate, expertIndex) => {
    const compromiseRank = rankByCandidate.get(candidate);

    if (!compromiseRank) {
      return distance;
    }

    return distance + Math.abs(expertIndex + 1 - compromiseRank);
  }, 0);
};

const getRanksByCandidateOrder = (ranking: string[], candidates: string[]) =>
  candidates.map((candidate) => ranking.indexOf(candidate) + 1);

const calculateExpertSatisfaction = (distance: number, candidateCount: number) => {
  const maxDistance = (candidateCount ** 3 - candidateCount) / 3;

  if (maxDistance <= 0) {
    return 100;
  }

  return Math.max(0, (1 - distance / maxDistance) * 100);
};

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const appendUniqueSolution = (
  collection: ExhaustiveRankingResult[],
  candidate: ExhaustiveRankingResult
) => {
  if (collection.some((item) => item.ranking.join('|') === candidate.ranking.join('|'))) {
    return collection;
  }

  return [...collection, candidate];
};

const compareObjectiveScores = (
  left: EvolutionRankingScore,
  right: EvolutionRankingScore,
  objective: 'min-sum' | 'min-max'
) => {
  if (objective === 'min-sum') {
    return (
      left.sumDistance - right.sumDistance ||
      left.maxDistance - right.maxDistance ||
      compareRankingsAlphabetically(left.ranking, right.ranking)
    );
  }

  return (
    left.maxDistance - right.maxDistance ||
    left.sumDistance - right.sumDistance ||
    compareRankingsAlphabetically(left.ranking, right.ranking)
  );
};

const filterRankingsByBestObjective = (
  rankings: { ranking: string[]; sumDistance: number; maxDistance: number }[],
  objective: 'min-sum' | 'min-max'
) => {
  if (rankings.length === 0) {
    return rankings;
  }

  const bestValue =
    objective === 'min-sum'
      ? Math.min(...rankings.map((item) => item.sumDistance))
      : Math.min(...rankings.map((item) => item.maxDistance));

  return rankings.filter((item) =>
    objective === 'min-sum' ? item.sumDistance === bestValue : item.maxDistance === bestValue
  );
};

export function Lab4Section({
  lab3CandidateRows,
  lab3ObjectCount,
  onLab3ObjectCountChange,
  lab3Candidates,
  lab3ExpertRankings,
  lab3ExhaustiveSearch,
  lab3EvolutionResult,
  lab3ExpertCount,
  onLab3ExpertCountChange,
  onRegenerateLab3ExpertRankings,
  lab3FitnessMode,
  onLab3FitnessModeChange,
  runLab3EvolutionSearch,
  isLab3EvolutionRunning,
  formatRankingOrderNumbers
}: Lab4SectionProps) {
  const [activeLab4Method, setActiveLab4Method] = useState<Lab4Method>('distributed-search');
  const [distributedSearch, setDistributedSearch] = useState<DistributedSearchResult | null>(null);
  const [distributedProgress, setDistributedProgress] = useState<DistributedSearchProgress | null>(
    null
  );
  const [isDistributedSearchRunning, setIsDistributedSearchRunning] = useState(false);
  const [distributedSearchError, setDistributedSearchError] = useState<string | null>(null);
  const [lab4EvolutionObjective, setLab4EvolutionObjective] = useState<'min-sum' | 'min-max'>(
    'min-sum'
  );
  const [lab4EvolutionThreadCount, setLab4EvolutionThreadCount] = useState<2 | 3 | 4>(4);
  const [lab4EvolutionResult, setLab4EvolutionResult] = useState<Lab3EvolutionResult | null>(null);
  const [lab4EvolutionProgress, setLab4EvolutionProgress] = useState<Lab4EvolutionProgress | null>(
    null
  );
  const [isLab4EvolutionRunning, setIsLab4EvolutionRunning] = useState(false);
  const [lab4EvolutionError, setLab4EvolutionError] = useState<string | null>(null);
  const lab4InputPayload = useMemo(
    () =>
      JSON.stringify({
        candidates: lab3Candidates,
        expertRankings: lab3ExpertRankings
      }),
    [lab3Candidates, lab3ExpertRankings]
  );
  const completedSearchSignatureRef = useRef<string | null>(null);
  const activeSearchSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const currentInputSignature = lab4InputPayload;
    const parsedInput = JSON.parse(currentInputSignature) as {
      candidates: string[];
      expertRankings: ExpertRankingRow[];
    };
    const currentCandidates = parsedInput.candidates;
    const currentExpertRankings = parsedInput.expertRankings;
    const totalPermutations = factorial(currentCandidates.length);
    const workers: Worker[] = [];
    let isCancelled = false;

    const stopWorkers = () => {
      workers.forEach((worker) => worker.terminate());
    };

    const runDistributedSearch = () => {
      if (currentCandidates.length === 0 || currentExpertRankings.length === 0) {
        completedSearchSignatureRef.current = null;
        activeSearchSignatureRef.current = null;
        setDistributedSearch(null);
        setDistributedProgress(null);
        setDistributedSearchError(null);
        setIsDistributedSearchRunning(false);
        return;
      }

      if (completedSearchSignatureRef.current === currentInputSignature) {
        setIsDistributedSearchRunning(false);
        return;
      }

      if (activeSearchSignatureRef.current === currentInputSignature) {
        return;
      }

      if (typeof Worker === 'undefined') {
        setDistributedSearchError('Поточний браузер не підтримує Web Workers.');
        setDistributedSearch(null);
        setDistributedProgress(null);
        setIsDistributedSearchRunning(false);
        return;
      }

      activeSearchSignatureRef.current = currentInputSignature;
      setDistributedSearch(null);
      setDistributedSearchError(null);
      setDistributedProgress({
        processedPermutations: 0,
        totalPermutations,
        completedWorkers: 0,
        totalWorkers: currentCandidates.length,
        durationMs: 0
      });
      setIsDistributedSearchRunning(true);

      const startedAt = performance.now();
      const progressByWorker = new Map<number, number>();
      const resultsByWorker = new Map<number, DistributedWorkerResult>();
      const workerStartedAt = new Map<number, number>();
      let completedWorkers = 0;
      let failed = false;

      const publishProgress = () => {
        if (isCancelled) {
          return;
        }

        const processedPermutations = Array.from(progressByWorker.values()).reduce(
          (total, value) => total + value,
          0
        );

        setDistributedProgress({
          processedPermutations,
          totalPermutations,
          completedWorkers,
          totalWorkers: currentCandidates.length,
          durationMs: Math.round(performance.now() - startedAt)
        });
      };

      const finishIfReady = () => {
        if (failed || completedWorkers !== currentCandidates.length || isCancelled) {
          return;
        }

        const workerResults = currentCandidates
          .map((_, index) => resultsByWorker.get(index + 1) ?? null)
          .filter((result): result is DistributedWorkerResult => Boolean(result));
        let globalMinSumBest: ExhaustiveRankingResult | null = null;
        let globalMinMaxBest: ExhaustiveRankingResult | null = null;
        let globalMinSumSolutions: ExhaustiveRankingResult[] = [];
        let globalMinMaxSolutions: ExhaustiveRankingResult[] = [];

        workerResults.forEach((workerResult) => {
          if (workerResult.minSumBest) {
            if (
              !globalMinSumBest ||
              compareMinSumResults(workerResult.minSumBest, globalMinSumBest) < 0
            ) {
              globalMinSumBest = workerResult.minSumBest;
              globalMinSumSolutions = [workerResult.minSumBest];
            } else if (
              globalMinSumBest &&
              workerResult.minSumBest.sumDistance === globalMinSumBest.sumDistance &&
              workerResult.minSumBest.maxDistance === globalMinSumBest.maxDistance
            ) {
              globalMinSumSolutions = appendUniqueSolution(
                globalMinSumSolutions,
                workerResult.minSumBest
              );
            }
          }

          if (workerResult.minMaxBest) {
            if (
              !globalMinMaxBest ||
              compareMinMaxResults(workerResult.minMaxBest, globalMinMaxBest) < 0
            ) {
              globalMinMaxBest = workerResult.minMaxBest;
              globalMinMaxSolutions = [workerResult.minMaxBest];
            } else if (
              globalMinMaxBest &&
              workerResult.minMaxBest.maxDistance === globalMinMaxBest.maxDistance &&
              workerResult.minMaxBest.sumDistance === globalMinMaxBest.sumDistance
            ) {
              globalMinMaxSolutions = appendUniqueSolution(
                globalMinMaxSolutions,
                workerResult.minMaxBest
              );
            }
          }
        });

        if (!globalMinSumBest || !globalMinMaxBest) {
          failed = true;
          activeSearchSignatureRef.current = null;
          setDistributedSearchError(
            'Не вдалося зібрати глобальний результат розподіленого перебору.'
          );
          setDistributedSearch(null);
          setIsDistributedSearchRunning(false);
          stopWorkers();
          return;
        }

        activeSearchSignatureRef.current = null;
        completedSearchSignatureRef.current = currentInputSignature;
        setDistributedSearch({
          totalPermutations,
          durationMs: Math.round(performance.now() - startedAt),
          workers: workerResults,
          minSumBest: globalMinSumBest,
          minSumSolutions: [...globalMinSumSolutions].sort(compareMinSumResults),
          minMaxBest: globalMinMaxBest,
          minMaxSolutions: [...globalMinMaxSolutions].sort(compareMinMaxResults)
        });
        setDistributedProgress({
          processedPermutations: totalPermutations,
          totalPermutations,
          completedWorkers: workerResults.length,
          totalWorkers: currentCandidates.length,
          durationMs: Math.round(performance.now() - startedAt)
        });
        setIsDistributedSearchRunning(false);
        stopWorkers();
      };

      currentCandidates.forEach((candidate, index) => {
        const workerId = index + 1;
        progressByWorker.set(workerId, 0);
        const worker = new Worker(new URL('./distributedPermutation.worker.ts', import.meta.url), {
          type: 'module'
        });

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
          if (isCancelled || failed) {
            return;
          }

          const message = event.data;

          if (message.type === 'progress') {
            progressByWorker.set(message.workerId, message.processedPermutations);
            publishProgress();
            return;
          }

          if (message.type === 'done') {
            const finishedAtMs = Math.round(performance.now() - startedAt);
            const workerStartMs = workerStartedAt.get(message.result.workerId) ?? 0;
            resultsByWorker.set(message.result.workerId, {
              ...message.result,
              startedAtMs: workerStartMs,
              finishedAtMs,
              durationMs: finishedAtMs - workerStartMs
            });
            progressByWorker.set(message.result.workerId, message.result.permutationsProcessed);
            completedWorkers += 1;
            publishProgress();
            finishIfReady();
            return;
          }

          failed = true;
          activeSearchSignatureRef.current = null;
          setDistributedSearchError(message.error);
          setDistributedSearch(null);
          setIsDistributedSearchRunning(false);
          stopWorkers();
        };

        worker.onerror = () => {
          if (failed || isCancelled) {
            return;
          }

          failed = true;
          activeSearchSignatureRef.current = null;
          setDistributedSearchError(`Помилка у Web Worker ${workerId}.`);
          setDistributedSearch(null);
          setIsDistributedSearchRunning(false);
          stopWorkers();
        };

        workers.push(worker);
        workerStartedAt.set(workerId, Math.round(performance.now() - startedAt));
        worker.postMessage({
          workerId,
          prefix: [candidate],
          candidates: currentCandidates,
          expertRankings: currentExpertRankings,
          progressChunkSize: 500
        });
      });
    };

    runDistributedSearch();

    return () => {
      isCancelled = true;
      stopWorkers();
      if (activeSearchSignatureRef.current === currentInputSignature) {
        activeSearchSignatureRef.current = null;
      }
    };
  }, [lab4InputPayload]);

  const distributedProgressPercent = distributedProgress
    ? Math.round(
        (distributedProgress.processedPermutations /
          Math.max(distributedProgress.totalPermutations, 1)) *
          100
      )
    : 0;
  const expectedWorkerPermutations = useMemo(
    () => factorial(Math.max(lab3Candidates.length - 1, 0)),
    [lab3Candidates.length]
  );
  const coverageCheckPassed =
    distributedSearch?.workers.every(
      (worker) => worker.permutationsProcessed === expectedWorkerPermutations
    ) ?? false;
  const minSumMatchesLab3 =
    Boolean(distributedSearch && lab3ExhaustiveSearch) &&
    distributedSearch!.minSumBest.sumDistance === lab3ExhaustiveSearch!.minSumBest.sumDistance &&
    distributedSearch!.minSumBest.maxDistance === lab3ExhaustiveSearch!.minSumBest.maxDistance &&
    distributedSearch!.minSumBest.ranking.join('|') ===
      lab3ExhaustiveSearch!.minSumBest.ranking.join('|');
  const minMaxMatchesLab3 =
    Boolean(distributedSearch && lab3ExhaustiveSearch) &&
    distributedSearch!.minMaxBest.maxDistance === lab3ExhaustiveSearch!.minMaxBest.maxDistance &&
    distributedSearch!.minMaxBest.sumDistance === lab3ExhaustiveSearch!.minMaxBest.sumDistance &&
    distributedSearch!.minMaxBest.ranking.join('|') ===
      lab3ExhaustiveSearch!.minMaxBest.ranking.join('|');
  const directVsDistributedTimeDelta =
    distributedSearch && lab3ExhaustiveSearch
      ? distributedSearch.durationMs - lab3ExhaustiveSearch.durationMs
      : null;
  const expertSatisfactionRows = useMemo<ExpertSatisfactionRow[]>(() => {
    if (!distributedSearch) {
      return [];
    }

    return lab3ExpertRankings.map((expertRow) => {
      const minSumDistance = calculateRankDistance(
        distributedSearch.minSumBest.ranking,
        expertRow.ranking
      );
      const minMaxDistance = calculateRankDistance(
        distributedSearch.minMaxBest.ranking,
        expertRow.ranking
      );

      return {
        expert: expertRow.expert,
        ranking: expertRow.ranking,
        ranks: getRanksByCandidateOrder(expertRow.ranking, lab3Candidates),
        minSumDistance,
        minSumSatisfaction: calculateExpertSatisfaction(minSumDistance, lab3Candidates.length),
        minMaxDistance,
        minMaxSatisfaction: calculateExpertSatisfaction(minMaxDistance, lab3Candidates.length)
      };
    });
  }, [distributedSearch, lab3Candidates, lab3ExpertRankings]);
  const geneticComparisonReady =
    Boolean(lab3EvolutionResult && lab4EvolutionResult) &&
    lab3EvolutionResult!.objective === lab4EvolutionResult!.objective;
  const geneticObjectiveImprovement =
    geneticComparisonReady && lab3EvolutionResult && lab4EvolutionResult
      ? lab4EvolutionResult.objective === 'min-sum'
        ? lab3EvolutionResult.bestSumDistance - lab4EvolutionResult.bestSumDistance
        : lab3EvolutionResult.bestMaxDistance - lab4EvolutionResult.bestMaxDistance
      : null;
  const geneticTimeImprovement =
    geneticComparisonReady && lab3EvolutionResult && lab4EvolutionResult
      ? lab3EvolutionResult.durationMs - lab4EvolutionResult.durationMs
      : null;

  const runLab4EvolutionSearch = async () => {
    if (lab3Candidates.length === 0 || lab3ExpertRankings.length === 0) {
      setLab4EvolutionResult(null);
      return;
    }

    if (typeof Worker === 'undefined') {
      setLab4EvolutionError('Поточний браузер не підтримує Web Workers для генетичного алгоритму.');
      setLab4EvolutionResult(null);
      return;
    }

    setIsLab4EvolutionRunning(true);
    setLab4EvolutionError(null);
    setLab4EvolutionResult(null);
    setLab4EvolutionProgress({
      generation: 0,
      totalGenerations: 40,
      durationMs: 0
    });

    const startedAt = performance.now();
    const populationSize = Math.min(Math.max(lab3Candidates.length * 12, 48), 160);
    const activeThreadCount = Math.max(1, Math.min(lab4EvolutionThreadCount, populationSize));
    const islandPopulationSize = Math.max(8, Math.ceil(populationSize / activeThreadCount));
    const generations = 40;
    const tournamentSize = 4;
    const mutationRate = 0.35;
    const eliteCount = 4;

    try {
      const islandResults = await new Promise<
        {
          best: EvolutionRankingScore;
          topRankings: EvolutionRankingScore[];
          durationMs: number;
        }[]
      >((resolve, reject) => {
        const workers: Worker[] = [];
        const progressByWorker = new Map<number, number>();
        const results: {
          best: EvolutionRankingScore;
          topRankings: EvolutionRankingScore[];
          durationMs: number;
        }[] = [];
        let completedWorkers = 0;
        let failed = false;

        const stopWorkers = () => {
          workers.forEach((worker) => worker.terminate());
        };

        for (let index = 0; index < activeThreadCount; index += 1) {
          const workerId = index + 1;
          progressByWorker.set(workerId, 0);

          const worker = new Worker(new URL('./geneticEvaluation.worker.ts', import.meta.url), {
            type: 'module'
          });
          workers.push(worker);

          worker.onmessage = (
            event: MessageEvent<
              | {
                  type: 'progress';
                  workerId: number;
                  generation: number;
                  durationMs: number;
                }
              | {
                  type: 'done';
                  workerId: number;
                  result: {
                    best: EvolutionRankingScore;
                    topRankings: EvolutionRankingScore[];
                    durationMs: number;
                  };
                }
              | {
                  type: 'error';
                  error: string;
                }
            >
          ) => {
            const message = event.data;

            if (failed) {
              return;
            }

            if (message.type === 'progress') {
              progressByWorker.set(message.workerId, message.generation);
              setLab4EvolutionProgress({
                generation: Math.min(...progressByWorker.values()),
                totalGenerations: generations,
                durationMs: Math.round(performance.now() - startedAt)
              });
              return;
            }

            if (message.type === 'done') {
              progressByWorker.set(message.workerId, generations);
              results.push(message.result);
              completedWorkers += 1;
              worker.terminate();

              setLab4EvolutionProgress({
                generation: Math.min(...progressByWorker.values()),
                totalGenerations: generations,
                durationMs: Math.round(performance.now() - startedAt)
              });

              if (completedWorkers === activeThreadCount) {
                resolve(results);
              }
              return;
            }

            failed = true;
            stopWorkers();
            reject(new Error(message.error));
          };

          worker.onerror = () => {
            if (failed) {
              return;
            }

            failed = true;
            stopWorkers();
            reject(new Error(`Помилка у genetic worker ${workerId}.`));
          };

          worker.postMessage({
            workerId,
            candidates: lab3Candidates,
            expertRankings: lab3ExpertRankings,
            populationSize: islandPopulationSize,
            generations,
            tournamentSize,
            mutationRate,
            eliteCount,
            objective: lab4EvolutionObjective
          });
        }
      });

      const best = islandResults
        .map((result) => result.best)
        .sort((left, right) => compareObjectiveScores(left, right, lab4EvolutionObjective))[0];
      const globalTop = islandResults
        .flatMap((result) => result.topRankings)
        .sort((left, right) => compareObjectiveScores(left, right, lab4EvolutionObjective))
        .filter(
          (item, index, collection) =>
            collection.findIndex((row) => row.ranking.join('|') === item.ranking.join('|')) ===
            index
        )
        .slice(0, 40);

      setLab4EvolutionResult({
        objective: lab4EvolutionObjective,
        populationSize: islandPopulationSize * activeThreadCount,
        generations,
        bestRanking: best.ranking,
        bestSumDistance: best.sumDistance,
        bestMaxDistance: best.maxDistance,
        topRankings: filterRankingsByBestObjective(globalTop, lab4EvolutionObjective),
        durationMs: Math.round(performance.now() - startedAt)
      });
      setLab4EvolutionProgress({
        generation: generations,
        totalGenerations: generations,
        durationMs: Math.round(performance.now() - startedAt)
      });
    } catch (error) {
      setLab4EvolutionError(
        error instanceof Error ? error.message : 'Помилка під час розподіленого ГА.'
      );
    } finally {
      setIsLab4EvolutionRunning(false);
    }
  };

  const renderSolutionTable = (
    title: string,
    rows: ExhaustiveRankingResult[],
    objective: 'min-sum' | 'min-max'
  ) => (
    <div className={styles.subSection}>
      <h3 className={styles.subTitle}>{title}</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>№</th>
              <th>Порядок</th>
              <th>Ранжування</th>
              <th>Σd</th>
              <th>Max</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${objective}-${row.ranking.join('|')}`}>
                <td>{index + 1}</td>
                <td>{formatRankingOrderNumbers(row.ranking, lab3Candidates)}</td>
                <td className={styles.sequenceCell}>{row.ranking.join(' > ')}</td>
                <td>{row.sumDistance}</td>
                <td>{row.maxDistance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeaderInline}>
          <div>
            <h2 className={styles.sectionTitle}>Лабораторна 4 - вибір об&apos;єктів</h2>
            <p className={styles.sectionText}>
              Для ЛР4 використовується та сама топ-N множина об&apos;єктів із рейтингу ЛР1 без
              урахування балів.
            </p>
          </div>
          <div className={styles.expertControls}>
            <div className={styles.expertCountControl}>
              <label htmlFor='lab4-object-count' className={styles.controlLabel}>
                Кількість об&apos;єктів
              </label>
              <input
                id='lab4-object-count'
                type='number'
                min={1}
                max={20}
                value={lab3ObjectCount}
                onChange={(e) =>
                  onLab3ObjectCountChange(
                    Math.min(20, Math.max(1, Number.parseInt(e.target.value || '1', 10) || 1))
                  )
                }
                className={baseStyles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Місце</th>
                <th>Об&apos;єкт</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {lab3CandidateRows.map((row) => (
                <tr key={`lab4-candidate-${row.movie}`}>
                  <td>{row.rank}</td>
                  <td>{row.movie}</td>
                  <td>{row.isSelected ? 'Використовується' : 'Не використовується'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeaderInline}>
          <div>
            <h2 className={styles.sectionTitle}>Вхідні дані для ЛР4</h2>
            <p className={styles.sectionText}>
              ЛР4 використовує ту саму множину об&apos;єктів і ті самі експертні ранжування, що і
              точний перебір у ЛР3. Це дає змогу напряму порівняти результати двох способів
              перебору.
            </p>
          </div>
          <div className={styles.expertControls}>
            <div className={styles.expertCountControl}>
              <label htmlFor='lab4-expert-count' className={styles.controlLabel}>
                Кількість експертів
              </label>
              <input
                id='lab4-expert-count'
                type='number'
                min={1}
                max={50}
                value={lab3ExpertCount}
                onChange={(e) =>
                  onLab3ExpertCountChange(
                    Math.min(50, Math.max(1, Number.parseInt(e.target.value || '1', 10) || 1))
                  )
                }
                className={baseStyles.input}
              />
            </div>
            <button
              type='button'
              className={baseStyles.button}
              onClick={onRegenerateLab3ExpertRankings}
              disabled={lab3Candidates.length === 0}
            >
              Згенерувати нові ранжування
            </button>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>Об&apos;єкти</span>
            <span className={styles.infoValue}>{lab3Candidates.length}</span>
            <span className={styles.infoMeta}>
              {lab3Candidates.length > 0 ? lab3Candidates.join(', ') : 'Немає об’єктів.'}
            </span>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>Експерти</span>
            <span className={styles.infoValue}>{lab3ExpertRankings.length}</span>
            <span className={styles.infoMeta}>
              Кожен експерт задає повне ранжування тієї самої множини об&apos;єктів.
            </span>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>Усього перестановок</span>
            <span className={styles.infoValue}>{factorial(lab3Candidates.length)}</span>
            <span className={styles.infoMeta}>
              Для {lab3Candidates.length} об&apos;єктів маємо {lab3Candidates.length}! перестановок.
            </span>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeaderInline}>
          <div>
            <h2 className={styles.sectionTitle}>Навігація ЛР4</h2>
            <p className={styles.sectionText}>
              Обери метод, щоб показати тільки відповідні результати та порівняння.
            </p>
          </div>
          <div className={styles.lab4Subnav} role='tablist' aria-label='Методи ЛР4'>
            <button
              type='button'
              role='tab'
              aria-selected={activeLab4Method === 'distributed-search'}
              className={`${styles.lab4SubnavButton} ${
                activeLab4Method === 'distributed-search' ? styles.lab4SubnavButtonActive : ''
              }`}
              onClick={() => setActiveLab4Method('distributed-search')}
            >
              Розподілений прямий перебір
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={activeLab4Method === 'distributed-ga'}
              className={`${styles.lab4SubnavButton} ${
                activeLab4Method === 'distributed-ga' ? styles.lab4SubnavButtonActive : ''
              }`}
              onClick={() => setActiveLab4Method('distributed-ga')}
            >
              Розподілений ГА
            </button>
          </div>
        </div>
      </section>

      {activeLab4Method === 'distributed-search' ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Схема декомпозиції прямого перебору</h2>
            <p className={styles.sectionText}>
              Простір усіх перестановок розбиваємо на неперетинні підмножини за першим елементом
              ранжування. Для кожного можливого першого елемента запускається окремий Web Worker,
              який перебирає всі перестановки решти {Math.max(lab3Candidates.length - 1, 0)}{' '}
              об&apos;єктів.
            </p>
            <div className={styles.infoGrid}>
              <article className={styles.infoCard}>
                <span className={styles.infoLabel}>Кількість worker-підзадач</span>
                <span className={styles.infoValue}>{lab3Candidates.length}</span>
                <span className={styles.infoMeta}>
                  Один реальний Web Worker на кожен можливий перший елемент перестановки.
                </span>
              </article>
              <article className={styles.infoCard}>
                <span className={styles.infoLabel}>Розмір підзадачі</span>
                <span className={styles.infoValue}>{expectedWorkerPermutations}</span>
                <span className={styles.infoMeta}>
                  Кожна worker-підзадача містить рівно (n-1)! перестановок.
                </span>
              </article>
              <article className={styles.infoCard}>
                <span className={styles.infoLabel}>Доведення покриття</span>
                <span className={styles.infoValue}>
                  {lab3Candidates.length} * {expectedWorkerPermutations} ={' '}
                  {factorial(lab3Candidates.length)}
                </span>
                <span className={styles.infoMeta}>
                  Кожна перестановка має єдиний перший елемент, тому буде оброблена рівно одним
                  worker.
                </span>
              </article>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Розподілений прямий перебір перестановок</h2>
            {distributedProgress && (
              <div className={styles.resultCard}>
                <p className={styles.sectionText}>
                  Статус: {isDistributedSearchRunning ? 'обрахунок триває' : 'обрахунок завершено'}
                </p>
                <p className={styles.sectionText}>
                  Опрацьовано перестановок: {distributedProgress.processedPermutations} /{' '}
                  {distributedProgress.totalPermutations} ({distributedProgressPercent}%)
                </p>
                <p className={styles.sectionText}>
                  Завершено worker-підзадач: {distributedProgress.completedWorkers} /{' '}
                  {distributedProgress.totalWorkers}
                </p>
                <p className={styles.sectionText}>
                  Поточний час: {distributedProgress.durationMs} мс
                </p>
              </div>
            )}
            {distributedSearchError && (
              <p className={`${styles.sectionText} ${styles.muted}`}>{distributedSearchError}</p>
            )}
            {distributedSearch ? (
              <>
                <div className={styles.infoGrid}>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Перебрано</span>
                    <span className={styles.infoValue}>{distributedSearch.totalPermutations}</span>
                    <span className={styles.infoMeta}>
                      Результат зібраний з {distributedSearch.workers.length} реальних Web Workers.
                    </span>
                  </article>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Час ЛР4</span>
                    <span className={styles.infoValue}>{distributedSearch.durationMs} мс</span>
                    <span className={styles.infoMeta}>
                      Головний потік тільки координує роботу, а сам перебір виконують worker-и.
                    </span>
                  </article>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Контроль покриття</span>
                    <span className={styles.infoValue}>
                      {coverageCheckPassed ? 'Пройдено' : 'Помилка'}
                    </span>
                    <span className={styles.infoMeta}>
                      У кожній підзадачі перебрано рівно {expectedWorkerPermutations} перестановок.
                    </span>
                  </article>
                </div>

                <div className={styles.subSection}>
                  <h3 className={styles.subTitle}>Усі підзадачі розподіленого перебору</h3>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Підзадача</th>
                          <th>Фіксований префікс</th>
                          <th>Перестановок</th>
                          <th>Старт</th>
                          <th>Фініш</th>
                          <th>Час worker-а</th>
                          <th>Локальний мінімум Σd</th>
                          <th>Локальний мінімум Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {distributedSearch.workers.map((worker) => (
                          <tr key={`worker-${worker.workerId}`}>
                            <td>Worker {worker.workerId}</td>
                            <td>{worker.prefix.join(' > ')}</td>
                            <td>{worker.permutationsProcessed}</td>
                            <td>{worker.startedAtMs ?? '-'} мс</td>
                            <td>{worker.finishedAtMs ?? '-'} мс</td>
                            <td>{worker.durationMs ?? '-'} мс</td>
                            <td className={styles.sequenceCell}>
                              {worker.minSumBest
                                ? `${worker.minSumBest.ranking.join(' > ')} | Σd=${worker.minSumBest.sumDistance}, Max=${worker.minSumBest.maxDistance}`
                                : '-'}
                            </td>
                            <td className={styles.sequenceCell}>
                              {worker.minMaxBest
                                ? `${worker.minMaxBest.ranking.join(' > ')} | Max=${worker.minMaxBest.maxDistance}, Σd=${worker.minMaxBest.sumDistance}`
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles.subSection}>
                  <h3 className={styles.subTitle}>
                    Компромісні ранжування за критерієм мінімальної суми
                  </h3>
                  <div className={styles.highlightResultCard}>
                    <span className={styles.highlightResultBadge}>
                      Представник множини розв&apos;язків
                    </span>
                    <p className={styles.highlightResultOrder}>
                      {formatRankingOrderNumbers(
                        distributedSearch.minSumBest.ranking,
                        lab3Candidates
                      )}
                    </p>
                    <p className={styles.highlightResultText}>
                      {distributedSearch.minSumBest.ranking.join(' > ')}
                    </p>
                    <p className={styles.sectionText}>
                      Σd = {distributedSearch.minSumBest.sumDistance}, Max ={' '}
                      {distributedSearch.minSumBest.maxDistance}
                    </p>
                  </div>
                  {renderSolutionTable(
                    'Усі одержані розв’язки з мінімальною сумою',
                    distributedSearch.minSumSolutions,
                    'min-sum'
                  )}
                </div>

                <div className={styles.subSection}>
                  <h3 className={styles.subTitle}>Компромісні ранжування за критерієм MinMax</h3>
                  <div className={styles.highlightResultCard}>
                    <span className={styles.highlightResultBadge}>
                      Представник множини розв&apos;язків
                    </span>
                    <p className={styles.highlightResultOrder}>
                      {formatRankingOrderNumbers(
                        distributedSearch.minMaxBest.ranking,
                        lab3Candidates
                      )}
                    </p>
                    <p className={styles.highlightResultText}>
                      {distributedSearch.minMaxBest.ranking.join(' > ')}
                    </p>
                    <p className={styles.sectionText}>
                      Max = {distributedSearch.minMaxBest.maxDistance}, Σd ={' '}
                      {distributedSearch.minMaxBest.sumDistance}
                    </p>
                  </div>
                  {renderSolutionTable(
                    'Усі одержані розв’язки за критерієм MinMax',
                    distributedSearch.minMaxSolutions,
                    'min-max'
                  )}
                </div>

                {expertSatisfactionRows.length > 0 && (
                  <div className={styles.subSection}>
                    <h3 className={styles.subTitle}>
                      Індекси задоволеності експертів для розподіленого прямого перебору
                    </h3>
                    <p className={styles.sectionText}>
                      Індекс рахується за формулою S = (1 - d / ((n³ - n) / 3)) * 100%, де d -
                      сума модулів різниць рангів експерта і компромісного ранжування.
                    </p>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Експерт</th>
                            <th>Aᵢ - множинне ранжування</th>
                            <th>Rᵢ - ранги об&apos;єктів</th>
                            <th>d до min Σd</th>
                            <th>S до min Σd</th>
                            <th>d до MinMax</th>
                            <th>S до MinMax</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expertSatisfactionRows.map((row) => (
                            <tr key={`satisfaction-${row.expert}`}>
                              <td>{row.expert}</td>
                              <td className={styles.sequenceCell}>{row.ranking.join(' > ')}</td>
                              <td>{row.ranks.join(', ')}</td>
                              <td>{row.minSumDistance}</td>
                              <td>{formatPercent(row.minSumSatisfaction)}</td>
                              <td>{row.minMaxDistance}</td>
                              <td>{formatPercent(row.minMaxSatisfaction)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className={`${styles.sectionText} ${styles.muted}`}>
                {isDistributedSearchRunning
                  ? 'Реальний паралельний перебір у worker-ах вже виконується. Результати з’являться після завершення.'
                  : 'Для запуску розподіленого перебору потрібні об’єкти та ранжування експертів.'}
              </p>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Порівняння результатів ЛР4 та ЛР3</h2>
            {distributedSearch && lab3ExhaustiveSearch ? (
              <>
                <div className={styles.infoGrid}>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Час прямого перебору ЛР3</span>
                    <span className={styles.infoValue}>{lab3ExhaustiveSearch.durationMs} мс</span>
                    <span className={styles.infoMeta}>
                      Повний перебір усіх перестановок в одному потоці без worker-декомпозиції.
                    </span>
                  </article>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Час розподіленого перебору ЛР4</span>
                    <span className={styles.infoValue}>{distributedSearch.durationMs} мс</span>
                    <span className={styles.infoMeta}>
                      Паралельний перебір із реальними Web Workers для окремих підзадач.
                    </span>
                  </article>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Різниця часу</span>
                    <span className={styles.infoValue}>
                      {directVsDistributedTimeDelta === null
                        ? '-'
                        : directVsDistributedTimeDelta === 0
                          ? '0 мс'
                          : `${directVsDistributedTimeDelta > 0 ? '+' : ''}${directVsDistributedTimeDelta} мс`}
                    </span>
                    <span className={styles.infoMeta}>
                      {directVsDistributedTimeDelta === null
                        ? 'Порівняння часу недоступне.'
                        : directVsDistributedTimeDelta > 0
                          ? 'ЛР4 з worker-ами спрацювала швидше за прямий перебір ЛР3.'
                          : directVsDistributedTimeDelta < 0
                            ? 'ЛР3 спрацювала швидше; накладні витрати на worker-и переважають.'
                            : 'Обидва способи дали однаковий час виконання.'}
                    </span>
                  </article>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Критерій</th>
                        <th>ЛР3</th>
                        <th>ЛР4</th>
                        <th>Збіг</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Мінімальна сума відстаней</td>
                        <td className={styles.sequenceCell}>
                          {lab3ExhaustiveSearch.minSumBest.ranking.join(' > ')} | Σd=
                          {lab3ExhaustiveSearch.minSumBest.sumDistance}, Max=
                          {lab3ExhaustiveSearch.minSumBest.maxDistance}
                        </td>
                        <td className={styles.sequenceCell}>
                          {distributedSearch.minSumBest.ranking.join(' > ')} | Σd=
                          {distributedSearch.minSumBest.sumDistance}, Max=
                          {distributedSearch.minSumBest.maxDistance}
                        </td>
                        <td>{minSumMatchesLab3 ? 'Так' : 'Ні'}</td>
                      </tr>
                      <tr>
                        <td>Критерій MinMax</td>
                        <td className={styles.sequenceCell}>
                          {lab3ExhaustiveSearch.minMaxBest.ranking.join(' > ')} | Max=
                          {lab3ExhaustiveSearch.minMaxBest.maxDistance}, Σd=
                          {lab3ExhaustiveSearch.minMaxBest.sumDistance}
                        </td>
                        <td className={styles.sequenceCell}>
                          {distributedSearch.minMaxBest.ranking.join(' > ')} | Max=
                          {distributedSearch.minMaxBest.maxDistance}, Σd=
                          {distributedSearch.minMaxBest.sumDistance}
                        </td>
                        <td>{minMaxMatchesLab3 ? 'Так' : 'Ні'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className={`${styles.sectionText} ${styles.muted}`}>
                Порівняння стане доступним після завершення точного перебору в ЛР3 та розподіленого
                перебору в ЛР4.
              </p>
            )}
          </section>
        </>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Генетичний алгоритм ЛР3</h2>
            <p className={styles.sectionText}>
              Пошук виконується генетичним алгоритмом з турнірним відбором, кросовером, мутацією.
              Цей блок повторює централізований ГА з ЛР3 для подальшого порівняння з розподіленим
              ГА ЛР4.
            </p>
            <div className={styles.controlRow}>
              <div className={baseStyles.inputGroup}>
                <label htmlFor='lab4-lab3-fitness' className={styles.controlLabel}>
                  Фітнес-функція
                </label>
                <select
                  id='lab4-lab3-fitness'
                  value={lab3FitnessMode}
                  onChange={(e) => onLab3FitnessModeChange(e.target.value as 'min-sum' | 'min-max')}
                  className={styles.select}
                >
                  <option value='min-sum'>Мінімальна сума відстаней</option>
                  <option value='min-max'>MinMax</option>
                </select>
              </div>
              <button
                type='button'
                className={baseStyles.button}
                onClick={runLab3EvolutionSearch}
                disabled={isLab3EvolutionRunning || lab3Candidates.length === 0}
              >
                {isLab3EvolutionRunning ? 'Розрахунок...' : 'Запустити генетичний алгоритм ЛР3'}
              </button>
            </div>
            {lab3Candidates.length === 0 && (
              <p className={`${styles.sectionText} ${styles.muted}`}>
                Для запуску потрібно вибрати хоча б 1 об&apos;єкт. Зараз вибрано:{' '}
                {lab3Candidates.length}.
              </p>
            )}
            {lab3EvolutionResult && (
              <>
                <div className={styles.resultCard}>
                  <p className={styles.sectionText}>
                    Фітнес-функція:{' '}
                    {lab3EvolutionResult.objective === 'min-sum'
                      ? 'Мінімальна сума відстаней'
                      : 'MinMax'}
                  </p>
                  <p className={styles.sectionText}>
                    Найкраще ранжування: {lab3EvolutionResult.bestRanking.join(' > ')}
                  </p>
                  <p className={styles.sectionText}>
                    Сума відстаней: {lab3EvolutionResult.bestSumDistance}
                  </p>
                  <p className={styles.sectionText}>
                    Максимальна відстань: {lab3EvolutionResult.bestMaxDistance}
                  </p>
                  <p className={styles.sectionText}>
                    Популяція: {lab3EvolutionResult.populationSize}, поколінь:{' '}
                    {lab3EvolutionResult.generations}, час: {lab3EvolutionResult.durationMs} мс
                  </p>
                </div>
                {lab3EvolutionResult.topRankings.length > 0 &&
                  renderSolutionTable(
                    lab3EvolutionResult.objective === 'min-sum'
                      ? 'Рішення ЛР3 з мінімальною сумою відстаней'
                      : 'Рішення ЛР3 з мінімальним значенням Max',
                    lab3EvolutionResult.topRankings.map((item) => ({
                      ranking: item.ranking,
                      sumDistance: item.sumDistance,
                      maxDistance: item.maxDistance,
                      distances: []
                    })),
                    lab3EvolutionResult.objective
                  )}
              </>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Розподілений генетичний алгоритм</h2>
            <p className={styles.sectionText}>
              У ЛР4 кожен Web Worker виконує повний незалежний генетичний алгоритм на своїй
              підпопуляції. Кількість потоків можна обрати вручну: 2, 3 або 4.
            </p>
            <div className={styles.controlRow}>
              <div className={baseStyles.inputGroup}>
                <label htmlFor='lab4-ga-objective' className={styles.controlLabel}>
                  Фітнес-функція
                </label>
                <select
                  id='lab4-ga-objective'
                  value={lab4EvolutionObjective}
                  onChange={(e) =>
                    setLab4EvolutionObjective(e.target.value as 'min-sum' | 'min-max')
                  }
                  className={styles.select}
                >
                  <option value='min-sum'>Мінімальна сума відстаней</option>
                  <option value='min-max'>MinMax</option>
                </select>
              </div>
              <div className={baseStyles.inputGroup}>
                <label htmlFor='lab4-ga-threads' className={styles.controlLabel}>
                  Кількість потоків
                </label>
                <select
                  id='lab4-ga-threads'
                  value={lab4EvolutionThreadCount}
                  onChange={(e) =>
                    setLab4EvolutionThreadCount(Number.parseInt(e.target.value, 10) as 2 | 3 | 4)
                  }
                  className={styles.select}
                >
                  <option value={2}>2 потоки</option>
                  <option value={3}>3 потоки</option>
                  <option value={4}>4 потоки</option>
                </select>
              </div>
              <button
                type='button'
                className={baseStyles.button}
                onClick={runLab4EvolutionSearch}
                disabled={isLab4EvolutionRunning || lab3Candidates.length === 0}
              >
                {isLab4EvolutionRunning ? 'Розрахунок...' : 'Запустити розподілений ГА'}
              </button>
            </div>

            {lab4EvolutionProgress && (
              <div className={styles.resultCard}>
                <p className={styles.sectionText}>
                  Покоління: {lab4EvolutionProgress.generation} /{' '}
                  {lab4EvolutionProgress.totalGenerations}
                </p>
                <p className={styles.sectionText}>
                  Поточний час: {lab4EvolutionProgress.durationMs} мс
                </p>
                <p className={styles.sectionText}>
                  Потоки: {lab4EvolutionThreadCount}, популяція:{' '}
                  {Math.max(
                    8,
                    Math.ceil(
                      Math.min(Math.max(lab3Candidates.length * 12, 48), 160) /
                        lab4EvolutionThreadCount
                    )
                  ) * lab4EvolutionThreadCount}
                </p>
              </div>
            )}

            {lab4EvolutionError && (
              <p className={`${styles.sectionText} ${styles.muted}`}>{lab4EvolutionError}</p>
            )}

            {lab4EvolutionResult && (
              <>
                <div className={styles.resultCard}>
                  <p className={styles.sectionText}>
                    Фітнес-функція:{' '}
                    {lab4EvolutionResult.objective === 'min-sum'
                      ? 'Мінімальна сума відстаней'
                      : 'MinMax'}
                  </p>
                  <p className={styles.sectionText}>
                    Найкраще ранжування: {lab4EvolutionResult.bestRanking.join(' > ')}
                  </p>
                  <p className={styles.sectionText}>
                    Сума відстаней: {lab4EvolutionResult.bestSumDistance}
                  </p>
                  <p className={styles.sectionText}>
                    Максимальна відстань: {lab4EvolutionResult.bestMaxDistance}
                  </p>
                  <p className={styles.sectionText}>
                    Потоків: {lab4EvolutionThreadCount}, поколінь: {lab4EvolutionResult.generations}
                    , час: {lab4EvolutionResult.durationMs} мс
                  </p>
                </div>
                {lab4EvolutionResult.topRankings.length > 0 &&
                  renderSolutionTable(
                    lab4EvolutionResult.objective === 'min-sum'
                      ? 'Найкращі рішення розподіленого ГА за сумою'
                      : 'Найкращі рішення розподіленого ГА за критерієм MinMax',
                    lab4EvolutionResult.topRankings.map((item) => ({
                      ranking: item.ranking,
                      sumDistance: item.sumDistance,
                      maxDistance: item.maxDistance,
                      distances: []
                    })),
                    lab4EvolutionResult.objective
                  )}
              </>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Порівняння розподіленого ГА ЛР4 та ГА ЛР3</h2>
            {lab3EvolutionResult && lab4EvolutionResult ? (
              geneticComparisonReady ? (
                <>
                  <div className={styles.infoGrid}>
                    <article className={styles.infoCard}>
                      <span className={styles.infoLabel}>Час ГА ЛР3</span>
                      <span className={styles.infoValue}>{lab3EvolutionResult.durationMs} мс</span>
                      <span className={styles.infoMeta}>
                        Централізоване обчислення в одному потоці без Web Workers.
                      </span>
                    </article>
                    <article className={styles.infoCard}>
                      <span className={styles.infoLabel}>Час розподіленого ГА ЛР4</span>
                      <span className={styles.infoValue}>{lab4EvolutionResult.durationMs} мс</span>
                      <span className={styles.infoMeta}>
                        Кожен із {lab4EvolutionThreadCount} потоків виконує власний незалежний ГА.
                      </span>
                    </article>
                    <article className={styles.infoCard}>
                      <span className={styles.infoLabel}>Покращення розв&apos;язку</span>
                      <span className={styles.infoValue}>
                        {geneticObjectiveImprovement === null
                          ? '-'
                          : geneticObjectiveImprovement > 0
                            ? `+${geneticObjectiveImprovement}`
                            : `${geneticObjectiveImprovement}`}
                      </span>
                      <span className={styles.infoMeta}>
                        {lab4EvolutionResult.objective === 'min-sum'
                          ? 'Додатне значення означає меншу суму відстаней у ЛР4.'
                          : 'Додатне значення означає менше значення Max у ЛР4.'}
                      </span>
                    </article>
                  </div>

                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Метод</th>
                          <th>Найкраще ранжування</th>
                          <th>Σd</th>
                          <th>Max</th>
                          <th>Час</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>ГА ЛР3</td>
                          <td className={styles.sequenceCell}>
                            {lab3EvolutionResult.bestRanking.join(' > ')}
                          </td>
                          <td>{lab3EvolutionResult.bestSumDistance}</td>
                          <td>{lab3EvolutionResult.bestMaxDistance}</td>
                          <td>{lab3EvolutionResult.durationMs} мс</td>
                        </tr>
                        <tr>
                          <td>Розподілений ГА ЛР4</td>
                          <td className={styles.sequenceCell}>
                            {lab4EvolutionResult.bestRanking.join(' > ')}
                          </td>
                          <td>{lab4EvolutionResult.bestSumDistance}</td>
                          <td>{lab4EvolutionResult.bestMaxDistance}</td>
                          <td>{lab4EvolutionResult.durationMs} мс</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.noteCard}>
                    <p className={styles.sectionText}>
                      Висновок: розподілений генетичний алгоритм ЛР4{' '}
                      {geneticObjectiveImprovement !== null && geneticObjectiveImprovement > 0
                        ? 'знайшов кращий розв’язок'
                        : geneticObjectiveImprovement === 0
                          ? 'дав такий самий за якістю розв’язок'
                          : 'поки не перевершив централізований ГА ЛР3'}{' '}
                      і{' '}
                      {geneticTimeImprovement !== null && geneticTimeImprovement > 0
                        ? `виконався швидше на ${geneticTimeImprovement} мс.`
                        : geneticTimeImprovement === 0
                          ? 'показав той самий час виконання.'
                          : geneticTimeImprovement !== null
                            ? `виконався повільніше на ${Math.abs(geneticTimeImprovement)} мс.`
                            : 'має недоступне порівняння часу.'}
                    </p>
                  </div>
                </>
              ) : (
                <p className={`${styles.sectionText} ${styles.muted}`}>
                  Для коректного порівняння запусти ГА в ЛР3 і ЛР4 з однаковою фітнес-функцією.
                </p>
              )
            ) : (
              <p className={`${styles.sectionText} ${styles.muted}`}>
                Спочатку потрібно отримати результат ГА в ЛР3 та запустити розподілений ГА в ЛР4.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
