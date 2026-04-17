import baseStyles from '../../page.module.css';
import styles from '../admin.module.css';

type ExhaustiveRankingResult = {
  ranking: string[];
  sumDistance: number;
  maxDistance: number;
};

type Lab3ExhaustiveSearchResult = {
  totalPermutations: number;
  minSumBest: ExhaustiveRankingResult;
  minMaxBest: ExhaustiveRankingResult;
};

type DistributedChunkResult = {
  workerId: number;
  fixedFirstMovie: string;
  permutationCount: number;
  minSumBest: ExhaustiveRankingResult;
  minMaxBest: ExhaustiveRankingResult;
};

type DistributedSearchResult = {
  workerCount: number;
  permutationsPerWorker: number;
  totalPermutations: number;
  chunks: DistributedChunkResult[];
  globalMinSum: ExhaustiveRankingResult;
  globalMinMax: ExhaustiveRankingResult;
  matchesLab3MinSum: boolean;
  matchesLab3MinMax: boolean;
};

type LargeScaleIslandSummary = {
  islandId: number;
  populationSize: number;
  durationMs: number;
  bestSumDistance: number;
};

type LargeScaleResult = {
  alternativeCount: number;
  expertCount: number;
  estimatedSpeedup: number;
  simple: {
    durationMs: number;
    bestSumDistance: number;
    bestRanking: string[];
    populationSize: number;
    generations: number;
  };
  distributed: {
    durationMs: number;
    estimatedParallelDurationMs: number;
    bestSumDistance: number;
    bestRanking: string[];
    populationSize: number;
    islandCount: number;
    migrantsPerIsland: number;
    islands: LargeScaleIslandSummary[];
  };
};

type Lab4SectionProps = {
  lab4View: 'all' | 'classic' | 'large';
  onLab4ViewChange: (value: 'all' | 'classic' | 'large') => void;
  lab2FinalCandidates: string[];
  factorial: (value: number) => number;
  isLab4SubsetVisible: boolean;
  onToggleLab4SubsetVisible: () => void;
  lab3ExhaustiveSearch: Lab3ExhaustiveSearchResult | null;
  runLab4DistributedSearch: () => void;
  isLab4DistributedRunning: boolean;
  activeLab4DistributedSearch: DistributedSearchResult | null;
  lab4LargeExpertCount: number;
  onLab4LargeExpertCountChange: (value: number) => void;
  lab4IslandCount: number;
  onLab4IslandCountChange: (value: number) => void;
  runLab4LargeScaleExperiment: () => void;
  isLab4LargeScaleRunning: boolean;
  lab4LargeScaleResult: LargeScaleResult | null;
  formatDuration: (durationMs: number) => string;
};

export function Lab4Section({
  lab4View,
  onLab4ViewChange,
  lab2FinalCandidates,
  factorial,
  isLab4SubsetVisible,
  onToggleLab4SubsetVisible,
  lab3ExhaustiveSearch,
  runLab4DistributedSearch,
  isLab4DistributedRunning,
  activeLab4DistributedSearch,
  lab4LargeExpertCount,
  onLab4LargeExpertCountChange,
  lab4IslandCount,
  onLab4IslandCountChange,
  runLab4LargeScaleExperiment,
  isLab4LargeScaleRunning,
  lab4LargeScaleResult,
  formatDuration
}: Lab4SectionProps) {
  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Навігація по ЛР4</h2>
        <div className={styles.lab4Subnav}>
          {[
            { value: 'all', label: 'Усі блоки' },
            { value: 'classic', label: 'ЛР3 + розподіл' },
            { value: 'large', label: 'n &gt;&gt; 12' }
          ].map((item) => (
            <button
              key={`lab4-view-${item.value}`}
              type='button'
              className={`${styles.lab4SubnavButton} ${
                lab4View === item.value ? styles.lab4SubnavButtonActive : ''
              }`}
              onClick={() => onLab4ViewChange(item.value as 'all' | 'classic' | 'large')}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {(lab4View === 'all' || lab4View === 'classic') && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Схема декомпозиції прямого перебору</h2>
            {lab2FinalCandidates.length > 0 ? (
              <>
                <p className={styles.sectionText}>
                  Для розподіленого перебору фіксую перший елемент перестановки. Кожен
                  обчислювальний вузол отримує власний блок виду{' '}
                  <span className={styles.inlineFormula}>
                    [a<sub>k</sub>, ...]
                  </span>{' '}
                  і перебирає лише перестановки хвоста з решти{' '}
                  {Math.max(lab2FinalCandidates.length - 1, 0)} об&apos;єктів.
                </p>
                <div className={styles.infoGrid}>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Кількість блоків</span>
                    <strong className={styles.infoValue}>{lab2FinalCandidates.length}</strong>
                  </article>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Перестановок у блоці</span>
                    <strong className={styles.infoValue}>
                      {factorial(Math.max(lab2FinalCandidates.length - 1, 0))}
                    </strong>
                  </article>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Повна потужність</span>
                    <strong className={styles.infoValue}>
                      {factorial(lab2FinalCandidates.length)}
                    </strong>
                  </article>
                </div>
              </>
            ) : (
              <p className={`${styles.sectionText} ${styles.muted}`}>
                Спочатку потрібна фінальна підмножина з лабораторної роботи №2.
              </p>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.blockHeader}>
              <h2 className={styles.sectionTitle}>Фінальна підмножина після евристик</h2>
              <button type='button' className={styles.toggleButton} onClick={onToggleLab4SubsetVisible}>
                {isLab4SubsetVisible ? 'Приховати блок' : 'Показати блок'}
              </button>
            </div>
            {isLab4SubsetVisible && (
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
                        <tr key={`lab4-subset-${movie}`}>
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
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Компромісні ранжування з ЛР3</h2>
            {lab3ExhaustiveSearch ? (
              <div className={styles.infoGrid}>
                <article className={styles.infoCard}>
                  <span className={styles.infoLabel}>MinSum</span>
                  <strong className={styles.cardTitle}>
                    {lab3ExhaustiveSearch.minSumBest.ranking.join(' > ')}
                  </strong>
                  <span className={styles.infoMeta}>
                    сума = {lab3ExhaustiveSearch.minSumBest.sumDistance}, max ={' '}
                    {lab3ExhaustiveSearch.minSumBest.maxDistance}
                  </span>
                </article>
                <article className={styles.infoCard}>
                  <span className={styles.infoLabel}>MinMax</span>
                  <strong className={styles.cardTitle}>
                    {lab3ExhaustiveSearch.minMaxBest.ranking.join(' > ')}
                  </strong>
                  <span className={styles.infoMeta}>
                    max = {lab3ExhaustiveSearch.minMaxBest.maxDistance}, сума ={' '}
                    {lab3ExhaustiveSearch.minMaxBest.sumDistance}
                  </span>
                </article>
              </div>
            ) : (
              <p className={`${styles.sectionText} ${styles.muted}`}>
                Для відображення компромісних ранжувань потрібно рівно 8 об&apos;єктів у фінальній
                підмножині.
              </p>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Розподілений прямий перебір перестановок</h2>
            <button
              type='button'
              className={baseStyles.button}
              onClick={runLab4DistributedSearch}
              disabled={isLab4DistributedRunning || !lab3ExhaustiveSearch}
            >
              {isLab4DistributedRunning ? 'Розрахунок...' : 'Запустити алгоритм'}
            </button>
            {activeLab4DistributedSearch ? (
              <>
                <div className={styles.infoGrid}>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Централізований перебір</span>
                    <strong className={styles.infoValue}>
                      {lab3ExhaustiveSearch?.totalPermutations ?? 0} перестановок
                    </strong>
                    <span className={styles.infoMeta}>
                      орієнтир для порівняння з результатами ЛР3
                    </span>
                  </article>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Розподілений перебір</span>
                    <strong className={styles.infoValue}>
                      {activeLab4DistributedSearch.workerCount} блоків по{' '}
                      {activeLab4DistributedSearch.permutationsPerWorker}
                    </strong>
                    <span className={styles.infoMeta}>
                      сумарно {activeLab4DistributedSearch.totalPermutations} перестановок
                    </span>
                  </article>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Співпадіння з ЛР3</span>
                    <strong className={styles.infoValue}>
                      {activeLab4DistributedSearch.matchesLab3MinSum &&
                      activeLab4DistributedSearch.matchesLab3MinMax
                        ? 'Так'
                        : 'Ні'}
                    </strong>
                    <span className={styles.infoMeta}>
                      MinSum: {activeLab4DistributedSearch.matchesLab3MinSum ? 'так' : 'ні'}, MinMax:{' '}
                      {activeLab4DistributedSearch.matchesLab3MinMax ? 'так' : 'ні'}
                    </span>
                  </article>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Вузол</th>
                        <th>Фіксований 1-й об&apos;єкт</th>
                        <th>Перестановок</th>
                        <th>Локальний MinSum</th>
                        <th>Локальний MinMax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLab4DistributedSearch.chunks.map((chunk) => (
                        <tr key={`chunk-${chunk.workerId}-${chunk.fixedFirstMovie}`}>
                          <td>W{chunk.workerId}</td>
                          <td>{chunk.fixedFirstMovie}</td>
                          <td>{chunk.permutationCount}</td>
                          <td className={styles.sequenceCell}>
                            {chunk.minSumBest.ranking.join(' > ')}
                            <br />
                            сума = {chunk.minSumBest.sumDistance}, max = {chunk.minSumBest.maxDistance}
                          </td>
                          <td className={styles.sequenceCell}>
                            {chunk.minMaxBest.ranking.join(' > ')}
                            <br />
                            max = {chunk.minMaxBest.maxDistance}, сума = {chunk.minMaxBest.sumDistance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.infoGrid}>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Глобальний MinSum</span>
                    <strong className={styles.cardTitle}>
                      {activeLab4DistributedSearch.globalMinSum.ranking.join(' > ')}
                    </strong>
                    <span className={styles.infoMeta}>
                      сума = {activeLab4DistributedSearch.globalMinSum.sumDistance}, max ={' '}
                      {activeLab4DistributedSearch.globalMinSum.maxDistance}
                    </span>
                  </article>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Глобальний MinMax</span>
                    <strong className={styles.cardTitle}>
                      {activeLab4DistributedSearch.globalMinMax.ranking.join(' > ')}
                    </strong>
                    <span className={styles.infoMeta}>
                      max = {activeLab4DistributedSearch.globalMinMax.maxDistance}, сума ={' '}
                      {activeLab4DistributedSearch.globalMinMax.sumDistance}
                    </span>
                  </article>
                </div>
              </>
            ) : (
              <p className={`${styles.sectionText} ${styles.muted}`}>
                {!lab3ExhaustiveSearch
                  ? 'Для запуску потрібно рівно 8 об&apos;єктів у фінальній підмножині та результати точного пошуку з ЛР3.'
                  : 'Натисніть кнопку, щоб запустити розподілений прямий перебір перестановок.'}
              </p>
            )}
          </section>
        </>
      )}

      {(lab4View === 'all' || lab4View === 'large') && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Випадкові ранжування та еволюційні алгоритми для n &gt;&gt; 12
            </h2>
            <div className={styles.controlRow}>
              <div className={baseStyles.inputGroup}>
                <label htmlFor='lab4-expert-count' className={styles.controlLabel}>
                  Кількість експертів
                </label>
                <select
                  id='lab4-expert-count'
                  value={lab4LargeExpertCount}
                  onChange={(e) => onLab4LargeExpertCountChange(Number(e.target.value))}
                  className={styles.select}
                  disabled={isLab4LargeScaleRunning}
                >
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((count) => (
                    <option key={`expert-count-${count}`} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>

              <div className={baseStyles.inputGroup}>
                <label htmlFor='lab4-island-count' className={styles.controlLabel}>
                  Кількість островів / варіацій
                </label>
                <select
                  id='lab4-island-count'
                  value={lab4IslandCount}
                  onChange={(e) => onLab4IslandCountChange(Number(e.target.value))}
                  className={styles.select}
                  disabled={isLab4LargeScaleRunning}
                >
                  {[2, 3, 4].map((count) => (
                    <option key={`island-count-${count}`} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type='button'
                className={baseStyles.button}
                onClick={runLab4LargeScaleExperiment}
                disabled={isLab4LargeScaleRunning}
              >
                {isLab4LargeScaleRunning ? 'Розрахунок...' : 'Згенерувати та запустити'}
              </button>
            </div>
            <p className={`${styles.sectionText} ${styles.muted}`}>
              Порівняння виконується між базовою еволюційною стратегією та декомпозицією на
              острови з міграцією найкращих особин.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Результати для великої задачі</h2>
            {lab4LargeScaleResult ? (
              <>
                <p className={styles.sectionText}>
                  Для {lab4LargeScaleResult.alternativeCount} альтернатив і{' '}
                  {lab4LargeScaleResult.expertCount} випадкових експертних ранжувань порівнюються
                  базова стратегія та острівна декомпозиція на{' '}
                  {lab4LargeScaleResult.distributed.islandCount} острови.
                </p>
                <div className={styles.timeChartCard}>
                  <h3 className={styles.subTitle}>Графік часу виконання</h3>
                  {[
                    {
                      label: 'Базова стратегія',
                      value: lab4LargeScaleResult.simple.durationMs,
                      note: `ΣH = ${lab4LargeScaleResult.simple.bestSumDistance}`
                    },
                    {
                      label: 'Острівна модель',
                      value: lab4LargeScaleResult.distributed.durationMs,
                      note: `ΣH = ${lab4LargeScaleResult.distributed.bestSumDistance}`
                    },
                    {
                      label: 'Паралельна оцінка',
                      value: lab4LargeScaleResult.distributed.estimatedParallelDurationMs,
                      note: `прискорення ×${lab4LargeScaleResult.estimatedSpeedup.toFixed(2)}`
                    }
                  ].map((row, index, collection) => {
                    const maxValue = Math.max(...collection.map((item) => item.value), 1);
                    const width = (row.value / maxValue) * 100;

                    return (
                      <div key={`time-chart-${row.label}`} className={styles.timeChartRow}>
                        <div className={styles.timeChartHeader}>
                          <span className={styles.timeChartLabel}>{row.label}</span>
                          <span className={styles.timeChartValue}>{formatDuration(row.value)}</span>
                        </div>
                        <div className={styles.timeChartTrack}>
                          <div
                            className={`${styles.timeChartBar} ${
                              index === 0
                                ? styles.timeChartBarPrimary
                                : index === 1
                                  ? styles.timeChartBarSecondary
                                  : styles.timeChartBarAccent
                            }`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className={styles.timeChartMeta}>{row.note}</span>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.infoGrid}>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Найкращий результат: базова стратегія</span>
                    <strong className={styles.cardTitle}>
                      {lab4LargeScaleResult.simple.bestRanking.join(' > ')}
                    </strong>
                    <span className={styles.infoMeta}>
                      популяція = {lab4LargeScaleResult.simple.populationSize}, поколінь ={' '}
                      {lab4LargeScaleResult.simple.generations}
                    </span>
                  </article>
                  <article className={styles.infoCard}>
                    <span className={styles.infoLabel}>Найкращий результат: острови</span>
                    <strong className={styles.cardTitle}>
                      {lab4LargeScaleResult.distributed.bestRanking.join(' > ')}
                    </strong>
                    <span className={styles.infoMeta}>
                      сумарна популяція = {lab4LargeScaleResult.distributed.populationSize}, мігрантів
                      на острів = {lab4LargeScaleResult.distributed.migrantsPerIsland}
                    </span>
                  </article>
                </div>

                <div className={styles.timeChartCard}>
                  <h3 className={styles.subTitle}>Графік часу по островах</h3>
                  {lab4LargeScaleResult.distributed.islands.map((island, _, collection) => {
                    const maxValue = Math.max(...collection.map((item) => item.durationMs), 1);
                    const width = (island.durationMs / maxValue) * 100;

                    return (
                      <div key={`island-time-${island.islandId}`} className={styles.timeChartRow}>
                        <div className={styles.timeChartHeader}>
                          <span className={styles.timeChartLabel}>Острів {island.islandId}</span>
                          <span className={styles.timeChartValue}>
                            {formatDuration(island.durationMs)}
                          </span>
                        </div>
                        <div className={styles.timeChartTrack}>
                          <div
                            className={`${styles.timeChartBar} ${styles.timeChartBarIsland}`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className={styles.timeChartMeta}>
                          ΣH = {island.bestSumDistance}, популяція = {island.populationSize}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className={`${styles.sectionText} ${styles.muted}`}>
                Натисніть &quot;Згенерувати та запустити&quot;, щоб побачити результати великої задачі.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
