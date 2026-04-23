'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import baseStyles from '../../page.module.css';
import styles from '../admin.module.css';

type ExpertRankingRow = {
  expert: string;
  ranking: string[];
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

type Lab4SectionProps = {
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
  lab3ExpertCount: number;
  onLab3ExpertCountChange: (value: number) => void;
  onRegenerateLab3ExpertRankings: () => void;
  formatRankingOrderNumbers: (ranking: string[], candidates: string[]) => string;
};

const factorial = (value: number) => {
  let result = 1;

  for (let index = 2; index <= value; index += 1) {
    result *= index;
  }

  return result;
};

const delayToMainThread = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const compareRankingsAlphabetically = (left: string[], right: string[]) =>
  left.join('|').localeCompare(right.join('|'));

const calculateHammingDistanceFull = (ranking: string[], expertRanking: string[]) =>
  ranking.reduce((total, movie, index) => total + (expertRanking[index] === movie ? 0 : 1), 0);

const compareMinSumResults = (left: ExhaustiveRankingResult, right: ExhaustiveRankingResult) =>
  left.sumDistance - right.sumDistance ||
  left.maxDistance - right.maxDistance ||
  compareRankingsAlphabetically(left.ranking, right.ranking);

const compareMinMaxResults = (left: ExhaustiveRankingResult, right: ExhaustiveRankingResult) =>
  left.maxDistance - right.maxDistance ||
  left.sumDistance - right.sumDistance ||
  compareRankingsAlphabetically(left.ranking, right.ranking);

const appendUniqueSolution = (
  collection: ExhaustiveRankingResult[],
  candidate: ExhaustiveRankingResult
) => {
  if (collection.some((item) => item.ranking.join('|') === candidate.ranking.join('|'))) {
    return collection;
  }

  return [...collection, candidate];
};

const computeDistributedPermutationSearchAsync = async (
  candidates: string[],
  expertRankings: ExpertRankingRow[],
  onProgress: (progress: DistributedSearchProgress) => void,
  shouldStop: () => boolean
): Promise<DistributedSearchResult | null> => {
  if (candidates.length === 0 || expertRankings.length === 0) {
    return null;
  }

  const totalPermutations = factorial(candidates.length);
  const startedAt = performance.now();
  const totalWorkers = candidates.length;
  const progressChunkSize = 500;
  let processedPermutations = 0;
  let completedWorkers = 0;
  let operationsSinceYield = 0;
  let globalMinSumBest: ExhaustiveRankingResult | null = null;
  let globalMinMaxBest: ExhaustiveRankingResult | null = null;
  let globalMinSumSolutions: ExhaustiveRankingResult[] = [];
  let globalMinMaxSolutions: ExhaustiveRankingResult[] = [];
  const workers: DistributedWorkerResult[] = [];

  const publishProgress = async () => {
    onProgress({
      processedPermutations,
      totalPermutations,
      completedWorkers,
      totalWorkers,
      durationMs: Math.round(performance.now() - startedAt)
    });
    operationsSinceYield = 0;
    await delayToMainThread();
  };

  const evaluateCandidate = (ranking: string[]) => {
    const distances = expertRankings.map((expertRow) =>
      calculateHammingDistanceFull(ranking, expertRow.ranking)
    );

    return {
      ranking,
      distances,
      sumDistance: distances.reduce((total, value) => total + value, 0),
      maxDistance: Math.max(...distances)
    };
  };

  for (let workerIndex = 0; workerIndex < candidates.length; workerIndex += 1) {
    if (shouldStop()) {
      return null;
    }

    const prefix = [candidates[workerIndex]];
    const currentRanking = [...prefix];
    const used = Array.from({ length: candidates.length }, (_, index) => index === workerIndex);
    let workerMinSumBest: ExhaustiveRankingResult | null = null;
    let workerMinMaxBest: ExhaustiveRankingResult | null = null;
    let workerProcessed = 0;

    const traverse = async (depth: number): Promise<void> => {
      if (shouldStop()) {
        return;
      }

      if (depth === candidates.length) {
        const candidate = evaluateCandidate([...currentRanking]);

        if (!workerMinSumBest || compareMinSumResults(candidate, workerMinSumBest) < 0) {
          workerMinSumBest = candidate;
        }

        if (!workerMinMaxBest || compareMinMaxResults(candidate, workerMinMaxBest) < 0) {
          workerMinMaxBest = candidate;
        }

        if (!globalMinSumBest || compareMinSumResults(candidate, globalMinSumBest) < 0) {
          globalMinSumBest = candidate;
          globalMinSumSolutions = [candidate];
        } else if (
          globalMinSumBest &&
          candidate.sumDistance === globalMinSumBest.sumDistance &&
          candidate.maxDistance === globalMinSumBest.maxDistance
        ) {
          globalMinSumSolutions = appendUniqueSolution(globalMinSumSolutions, candidate);
        }

        if (!globalMinMaxBest || compareMinMaxResults(candidate, globalMinMaxBest) < 0) {
          globalMinMaxBest = candidate;
          globalMinMaxSolutions = [candidate];
        } else if (
          globalMinMaxBest &&
          candidate.maxDistance === globalMinMaxBest.maxDistance &&
          candidate.sumDistance === globalMinMaxBest.sumDistance
        ) {
          globalMinMaxSolutions = appendUniqueSolution(globalMinMaxSolutions, candidate);
        }

        processedPermutations += 1;
        workerProcessed += 1;
        operationsSinceYield += 1;

        if (
          processedPermutations === totalPermutations ||
          operationsSinceYield >= progressChunkSize
        ) {
          await publishProgress();
        }

        return;
      }

      for (let index = 0; index < candidates.length; index += 1) {
        if (used[index]) {
          continue;
        }

        used[index] = true;
        currentRanking.push(candidates[index]);
        await traverse(depth + 1);
        currentRanking.pop();
        used[index] = false;

        if (shouldStop()) {
          return;
        }
      }
    };

    await traverse(prefix.length);

    if (shouldStop()) {
      return null;
    }

    completedWorkers += 1;
    workers.push({
      workerId: workerIndex + 1,
      prefix,
      permutationsProcessed: workerProcessed,
      minSumBest: workerMinSumBest,
      minMaxBest: workerMinMaxBest
    });

    await publishProgress();
  }

  if (shouldStop() || !globalMinSumBest || !globalMinMaxBest) {
    return null;
  }

  return {
    totalPermutations,
    durationMs: Math.round(performance.now() - startedAt),
    workers,
    minSumBest: globalMinSumBest,
    minSumSolutions: [...globalMinSumSolutions].sort(compareMinSumResults),
    minMaxBest: globalMinMaxBest,
    minMaxSolutions: [...globalMinMaxSolutions].sort(compareMinMaxResults)
  };
};

export function Lab4Section({
  lab3Candidates,
  lab3ExpertRankings,
  lab3ExhaustiveSearch,
  lab3ExpertCount,
  onLab3ExpertCountChange,
  onRegenerateLab3ExpertRankings,
  formatRankingOrderNumbers
}: Lab4SectionProps) {
  const [distributedSearch, setDistributedSearch] = useState<DistributedSearchResult | null>(null);
  const [distributedProgress, setDistributedProgress] = useState<DistributedSearchProgress | null>(
    null
  );
  const [isDistributedSearchRunning, setIsDistributedSearchRunning] = useState(false);
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
    let isCancelled = false;
    const currentInputSignature = lab4InputPayload;

    const runDistributedSearch = async () => {
      const parsedInput = JSON.parse(currentInputSignature) as {
        candidates: string[];
        expertRankings: ExpertRankingRow[];
      };
      const currentCandidates = parsedInput.candidates;
      const currentExpertRankings = parsedInput.expertRankings;

      if (currentCandidates.length === 0 || currentExpertRankings.length === 0) {
        completedSearchSignatureRef.current = null;
        activeSearchSignatureRef.current = null;
        setDistributedSearch(null);
        setDistributedProgress(null);
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

      activeSearchSignatureRef.current = currentInputSignature;
      setDistributedSearch(null);
      setDistributedProgress({
        processedPermutations: 0,
        totalPermutations: factorial(currentCandidates.length),
        completedWorkers: 0,
        totalWorkers: currentCandidates.length,
        durationMs: 0
      });
      setIsDistributedSearchRunning(true);

      const result = await computeDistributedPermutationSearchAsync(
        currentCandidates,
        currentExpertRankings,
        (progress) => {
          if (!isCancelled) {
            setDistributedProgress(progress);
          }
        },
        () => isCancelled
      );

      if (isCancelled) {
        return;
      }

      activeSearchSignatureRef.current = null;
      completedSearchSignatureRef.current = result ? currentInputSignature : null;
      setDistributedSearch(result);
      setDistributedProgress(
        result
          ? {
              processedPermutations: result.totalPermutations,
              totalPermutations: result.totalPermutations,
              completedWorkers: result.workers.length,
              totalWorkers: result.workers.length,
              durationMs: result.durationMs
            }
          : null
      );
      setIsDistributedSearchRunning(false);
    };

    runDistributedSearch();

    return () => {
      isCancelled = true;
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
        <h2 className={styles.sectionTitle}>Схема декомпозиції прямого перебору</h2>
        <p className={styles.sectionText}>
          Простір усіх перестановок розбиваємо на незалежні підмножини за першим елементом
          ранжування. Кожний підпроцес отримує фіксований перший об&apos;єкт і перебирає всі
          перестановки решти {Math.max(lab3Candidates.length - 1, 0)} об&apos;єктів.
        </p>
        <div className={styles.infoGrid}>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>Кількість підзадач</span>
            <span className={styles.infoValue}>{lab3Candidates.length}</span>
            <span className={styles.infoMeta}>
              По одній підзадачі на кожен можливий перший елемент перестановки.
            </span>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>Розмір підзадачі</span>
            <span className={styles.infoValue}>{expectedWorkerPermutations}</span>
            <span className={styles.infoMeta}>
              Кожна підзадача містить усі перестановки хвоста довжини n-1, тобто (n-1)!.
            </span>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>Доведення покриття</span>
            <span className={styles.infoValue}>
              {lab3Candidates.length} * {expectedWorkerPermutations} ={' '}
              {factorial(lab3Candidates.length)}
            </span>
            <span className={styles.infoMeta}>
              Кожна перестановка має рівно один перший елемент, тому належить рівно одній
              підмножині.
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
              Завершено підзадач: {distributedProgress.completedWorkers} /{' '}
              {distributedProgress.totalWorkers}
            </p>
            <p className={styles.sectionText}>Поточний час: {distributedProgress.durationMs} мс</p>
          </div>
        )}
        {distributedSearch ? (
          <>
            <div className={styles.infoGrid}>
              <article className={styles.infoCard}>
                <span className={styles.infoLabel}>Перебрано</span>
                <span className={styles.infoValue}>{distributedSearch.totalPermutations}</span>
                <span className={styles.infoMeta}>
                  Після розбиття на {distributedSearch.workers.length} незалежних підзадач.
                </span>
              </article>
              <article className={styles.infoCard}>
                <span className={styles.infoLabel}>Час ЛР4</span>
                <span className={styles.infoValue}>{distributedSearch.durationMs} мс</span>
                <span className={styles.infoMeta}>
                  Розподілений перебір виконується поверх тих самих даних, що й ЛР3.
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
                      <th>Локальний мінімум Σd</th>
                      <th>Локальний мінімум Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributedSearch.workers.map((worker) => (
                      <tr key={`worker-${worker.workerId}`}>
                        <td>Процес {worker.workerId}</td>
                        <td>{worker.prefix.join(' > ')}</td>
                        <td>{worker.permutationsProcessed}</td>
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
                  {formatRankingOrderNumbers(distributedSearch.minSumBest.ranking, lab3Candidates)}
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
                  {formatRankingOrderNumbers(distributedSearch.minMaxBest.ranking, lab3Candidates)}
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
          </>
        ) : (
          <p className={`${styles.sectionText} ${styles.muted}`}>
            {isDistributedSearchRunning
              ? 'Розподілений перебір вже виконується. Результати з’являться після завершення.'
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
                  Повний перебір усіх перестановок без декомпозиції простору пошуку.
                </span>
              </article>
              <article className={styles.infoCard}>
                <span className={styles.infoLabel}>Час розподіленого перебору ЛР4</span>
                <span className={styles.infoValue}>{distributedSearch.durationMs} мс</span>
                <span className={styles.infoMeta}>
                  Той самий повний перебір, але поділений на незалежні підзадачі за першим
                  елементом.
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
                      ? 'Розподілений перебір спрацював швидше за прямий.'
                      : directVsDistributedTimeDelta < 0
                        ? 'Прямий перебір спрацював швидше за розподілений.'
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
  );
}
