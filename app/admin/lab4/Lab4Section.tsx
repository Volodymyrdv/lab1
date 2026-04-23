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

const appendUniqueSolution = (
  collection: ExhaustiveRankingResult[],
  candidate: ExhaustiveRankingResult
) => {
  if (collection.some((item) => item.ranking.join('|') === candidate.ranking.join('|'))) {
    return collection;
  }

  return [...collection, candidate];
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
  const [distributedSearchError, setDistributedSearchError] = useState<string | null>(null);
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
          setDistributedSearchError('Не вдалося зібрати глобальний результат розподіленого перебору.');
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
        const worker = new Worker(
          new URL('./distributedPermutation.worker.ts', import.meta.url),
          { type: 'module' }
        );

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
            resultsByWorker.set(message.result.workerId, message.result);
            progressByWorker.set(
              message.result.workerId,
              message.result.permutationsProcessed
            );
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
          Простір усіх перестановок розбиваємо на неперетинні підмножини за першим елементом
          ранжування. Для кожного можливого першого елемента запускається окремий Web Worker, який
          перебирає всі перестановки решти {Math.max(lab3Candidates.length - 1, 0)} об&apos;єктів.
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
              {lab3Candidates.length} * {expectedWorkerPermutations} = {factorial(lab3Candidates.length)}
            </span>
            <span className={styles.infoMeta}>
              Кожна перестановка має єдиний перший елемент, тому буде оброблена рівно одним worker.
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
            <p className={styles.sectionText}>Поточний час: {distributedProgress.durationMs} мс</p>
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
  );
}
