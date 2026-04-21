import baseStyles from '../../page.module.css';
import styles from '../admin.module.css';

type Lab3MatrixRow = {
  comparison: number;
  expertValues: number[];
};

type Lab3PreferenceStatsRow = {
  candidateNumber: number;
  movie: string;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  participationCount: number;
};

type Lab3RankMatrixRow = {
  candidateNumber: number;
  expertRanks: number[];
};

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

type Lab3ExhaustiveSearchResult = {
  totalPermutations: number;
  durationMs: number;
  minSumBest: ExhaustiveRankingResult;
  minSumTop: ExhaustiveRankingResult[];
  minMaxBest: ExhaustiveRankingResult;
  minMaxTop: ExhaustiveRankingResult[];
};

type Lab3ExhaustiveSearchProgress = {
  processedPermutations: number;
  totalPermutations: number;
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

type Lab3SectionProps = {
  lab3ExpertHeaders: number[];
  lab3MatrixRows: Lab3MatrixRow[];
  lab3PreferenceStats: Lab3PreferenceStatsRow[];
  lab3RankMatrixRows: Lab3RankMatrixRow[];
  lab3ExhaustiveSearch: Lab3ExhaustiveSearchResult | null;
  lab3ExhaustiveSearchProgress: Lab3ExhaustiveSearchProgress | null;
  isLab3ExhaustiveSearchRunning: boolean;
  lab3CandidateRows: Lab3CandidateRow[];
  lab3ObjectCount: number;
  onLab3ObjectCountChange: (value: number) => void;
  lab3ExpertRankings: ExpertRankingRow[];
  lab3ExpertCount: number;
  onLab3ExpertCountChange: (value: number) => void;
  onRegenerateLab3ExpertRankings: () => void;
  lab3Candidates: string[];
  formatRankingOrderNumbers: (ranking: string[], candidates: string[]) => string;
  lab3FitnessMode: 'min-sum' | 'min-max';
  onLab3FitnessModeChange: (value: 'min-sum' | 'min-max') => void;
  runLab3EvolutionSearch: () => void;
  isLab3EvolutionRunning: boolean;
  lab3EvolutionResult: Lab3EvolutionResult | null;
};

export function Lab3Section({
  lab3ExpertHeaders,
  lab3MatrixRows,
  lab3PreferenceStats,
  lab3RankMatrixRows,
  lab3ExhaustiveSearch,
  lab3ExhaustiveSearchProgress,
  isLab3ExhaustiveSearchRunning,
  lab3CandidateRows,
  lab3ObjectCount,
  onLab3ObjectCountChange,
  lab3ExpertRankings,
  lab3ExpertCount,
  onLab3ExpertCountChange,
  onRegenerateLab3ExpertRankings,
  lab3Candidates,
  formatRankingOrderNumbers,
  lab3FitnessMode,
  onLab3FitnessModeChange,
  runLab3EvolutionSearch,
  isLab3EvolutionRunning,
  lab3EvolutionResult
}: Lab3SectionProps) {
  const expertCount = Math.max(lab3ExpertHeaders.length, 1);
  const exhaustiveProgressPercent = lab3ExhaustiveSearchProgress
    ? Math.round(
        (lab3ExhaustiveSearchProgress.processedPermutations /
          Math.max(lab3ExhaustiveSearchProgress.totalPermutations, 1)) *
          100
      )
    : 0;

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeaderInline}>
          <div>
            <h2 className={styles.sectionTitle}>Лабораторна 3 - вибір об&apos;єктів</h2>
            <p className={styles.sectionText}>
              Для ЛР3 використовується топ-N об&apos;єктів із рейтингу ЛР1 без урахування балів.
            </p>
          </div>
          <div className={styles.expertControls}>
            <div className={styles.expertCountControl}>
              <label htmlFor='lab3-object-count' className={styles.controlLabel}>
                Кількість об&apos;єктів
              </label>
              <input
                id='lab3-object-count'
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
                <tr key={`lab3-candidate-${row.movie}`}>
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
            <h2 className={styles.sectionTitle}>Ранжування {lab3ExpertCount} експертів для ЛР3</h2>
            <p className={styles.sectionText}>
              Це окремий набір ранжувань для ЛР3, який не залежить від згенерованих експертів у ЛР2.
            </p>
          </div>
          <div className={styles.expertControls}>
            <div className={styles.expertCountControl}>
              <label htmlFor='lab3-expert-count' className={styles.controlLabel}>
                Кількість експертів
              </label>
              <input
                id='lab3-expert-count'
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

        {lab3ExpertRankings.length > 0 ? (
          <div className={styles.expertRankingGrid}>
            {lab3ExpertRankings.map((row, index) => (
              <article key={row.expert} className={styles.expertRankingCard}>
                <div className={styles.expertRankingTop}>
                  <div className={styles.expertRankingHeader}>
                    <span className={styles.expertRankingBadge}>{row.expert}</span>
                  </div>
                  <span className={styles.expertRankingMeta}>#{index + 1}</span>
                </div>

                <div className={styles.rankingSequence}>
                  <p className={styles.highlightResultText}>{row.ranking.join(' > ')}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={`${styles.sectionText} ${styles.muted}`}>
            Немає даних для ранжування експертів у ЛР3.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Множинні порівняння</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Порівняння</th>
                {lab3ExpertHeaders.map((expert) => (
                  <th key={expert}>Експерт {expert}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lab3MatrixRows.length > 0 ? (
                lab3MatrixRows.map((row) => (
                  <tr key={row.comparison}>
                    <td>{row.comparison}</td>
                    {row.expertValues.map((value, index) => (
                      <td key={`${row.comparison}-${index}`}>{value}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={Math.max(lab3ExpertHeaders.length + 1, 2)}
                    className={`${styles.centerCell} ${styles.muted}`}
                  >
                    Для побудови таблиці потрібні вибрані об&apos;єкти ЛР3.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Статистика відношень переваги експертів</h2>
        {lab3PreferenceStats.length > 0 ? (
          <div className={styles.chartGrid}>
            {lab3PreferenceStats.map((row) => (
              <div key={row.candidateNumber} className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <span className={styles.chartNumber}>{row.candidateNumber}</span>
                  <span className={styles.chartMovie}>{row.movie}</span>
                </div>

                <div className={styles.chartRows}>
                  {[
                    { label: '1 місце', count: row.firstCount, className: styles.chartBarFirst },
                    { label: '2 місце', count: row.secondCount, className: styles.chartBarSecond },
                    { label: '3 місце', count: row.thirdCount, className: styles.chartBarThird },
                    {
                      label: 'Участь',
                      count: row.participationCount,
                      className: styles.chartBarParticipation
                    }
                  ].map((item) => (
                    <div key={`${row.candidateNumber}-${item.label}`} className={styles.chartRow}>
                      <span className={styles.chartLabel}>{item.label}</span>
                      <div className={styles.chartTrack}>
                        <div
                          className={`${styles.chartBar} ${item.className}`}
                          style={{ width: `${(item.count / expertCount) * 100}%` }}
                        />
                      </div>
                      <span className={styles.chartValue}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`${styles.sectionText} ${styles.muted}`}>
            Для побудови статистики потрібні вибрані об&apos;єкти ЛР3.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Ранги за множинними порівняннями</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>№</th>
                {lab3ExpertHeaders.map((expert) => (
                  <th key={`rank-expert-${expert}`}>Е{expert}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lab3RankMatrixRows.length > 0 ? (
                lab3RankMatrixRows.map((row) => (
                  <tr key={row.candidateNumber}>
                    <td>{row.candidateNumber}</td>
                    {row.expertRanks.map((value, index) => (
                      <td key={`${row.candidateNumber}-${index}`}>{value}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={Math.max(lab3ExpertHeaders.length + 1, 2)}
                    className={`${styles.centerCell} ${styles.muted}`}
                  >
                    Для побудови таблиці потрібні вибрані об&apos;єкти ЛР3.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Пошук мінімальної суми відстаней</h2>
        {lab3ExhaustiveSearchProgress && (
          <div className={styles.resultCard}>
            <p className={styles.sectionText}>
              Статус: {isLab3ExhaustiveSearchRunning ? 'обрахунок триває' : 'обрахунок завершено'}
            </p>
            <p className={styles.sectionText}>
              Опрацьовано перестановок: {lab3ExhaustiveSearchProgress.processedPermutations} /{' '}
              {lab3ExhaustiveSearchProgress.totalPermutations} ({exhaustiveProgressPercent}%)
            </p>
            <p className={styles.sectionText}>
              Поточний час: {lab3ExhaustiveSearchProgress.durationMs} мс
            </p>
          </div>
        )}
        {lab3ExhaustiveSearch ? (
          <>
            <p className={styles.sectionText}>
              Перебрано всіх перестановок: {lab3ExhaustiveSearch.totalPermutations}
            </p>
            <p className={styles.sectionText}>
              Час точного перебору: {lab3ExhaustiveSearch.durationMs} мс
            </p>
            <div className={styles.resultCard}>
              <p className={styles.sectionText}>
                Найкращий ранг: {lab3ExhaustiveSearch.minSumBest.ranking.join(' > ')}
              </p>
              <p className={styles.sectionText}>
                Сума відстаней: {lab3ExhaustiveSearch.minSumBest.sumDistance}
              </p>
              <p className={styles.sectionText}>
                Максимальна відстань: {lab3ExhaustiveSearch.minSumBest.maxDistance}
              </p>
              <p className={styles.sectionText}>
                Відстані до експертів:{' '}
                {lab3ExhaustiveSearch.minSumBest.distances
                  .map((distance, index) => `Е${index + 1}=${distance}`)
                  .join(', ')}
              </p>
            </div>
            <div className={styles.subSection}>
              <h3 className={styles.subTitle}>Топ-10 за сумою відстаней</h3>
              {lab3ExhaustiveSearch.minSumTop.map((row, index) => (
                <p key={`min-sum-${row.ranking.join('|')}`} className={styles.sectionText}>
                  {index + 1}. {row.ranking.join(' > ')} (сума = {row.sumDistance}, max ={' '}
                  {row.maxDistance})
                </p>
              ))}
            </div>
            <div className={styles.subSection}>
              <h3 className={styles.subTitle}>Перший результат</h3>
              <div className={styles.highlightResultCard}>
                <span className={styles.highlightResultBadge}>Найкраще ранжування</span>
                <p className={styles.highlightResultOrder}>
                  {formatRankingOrderNumbers(
                    lab3ExhaustiveSearch.minSumTop[0].ranking,
                    lab3Candidates
                  )}
                </p>
                <p className={styles.highlightResultText}>
                  {lab3ExhaustiveSearch.minSumTop[0].ranking.join(' > ')}
                </p>
                <p className={styles.sectionText}>
                  сума = {lab3ExhaustiveSearch.minSumTop[0].sumDistance}, max ={' '}
                  {lab3ExhaustiveSearch.minSumTop[0].maxDistance}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className={`${styles.sectionText} ${styles.muted}`}>
            {isLab3ExhaustiveSearchRunning
              ? 'Точний перебір виконується. Результати з&apos;являться після завершення обрахунку.'
              : `Для точного пошуку потрібно вибрати хоча б 1 об&apos;єкт і згенерувати ранжування експертів. Зараз вибрано: ${lab3ObjectCount}.`}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Пошук мінімуму максимумів MinMax</h2>
        {lab3ExhaustiveSearchProgress && (
          <div className={styles.resultCard}>
            <p className={styles.sectionText}>
              Статус: {isLab3ExhaustiveSearchRunning ? 'обрахунок триває' : 'обрахунок завершено'}
            </p>
            <p className={styles.sectionText}>
              Опрацьовано перестановок: {lab3ExhaustiveSearchProgress.processedPermutations} /{' '}
              {lab3ExhaustiveSearchProgress.totalPermutations} ({exhaustiveProgressPercent}%)
            </p>
            <p className={styles.sectionText}>
              Поточний час: {lab3ExhaustiveSearchProgress.durationMs} мс
            </p>
          </div>
        )}
        {lab3ExhaustiveSearch ? (
          <>
            <p className={styles.sectionText}>
              Перебрано всіх перестановок: {lab3ExhaustiveSearch.totalPermutations}
            </p>
            <p className={styles.sectionText}>
              Час точного перебору: {lab3ExhaustiveSearch.durationMs} мс
            </p>
            <div className={styles.resultCard}>
              <p className={styles.sectionText}>
                Найкращий ранг: {lab3ExhaustiveSearch.minMaxBest.ranking.join(' > ')}
              </p>
              <p className={styles.sectionText}>
                Максимальна відстань: {lab3ExhaustiveSearch.minMaxBest.maxDistance}
              </p>
              <p className={styles.sectionText}>
                Сума відстаней: {lab3ExhaustiveSearch.minMaxBest.sumDistance}
              </p>
              <p className={styles.sectionText}>
                Відстані до експертів:{' '}
                {lab3ExhaustiveSearch.minMaxBest.distances
                  .map((distance, index) => `Е${index + 1}=${distance}`)
                  .join(', ')}
              </p>
            </div>
            <div className={styles.subSection}>
              <h3 className={styles.subTitle}>Топ-10 за критерієм MinMax</h3>
              {lab3ExhaustiveSearch.minMaxTop.map((row, index) => (
                <p key={`min-max-${row.ranking.join('|')}`} className={styles.sectionText}>
                  {index + 1}. {row.ranking.join(' > ')} (max = {row.maxDistance}, сума ={' '}
                  {row.sumDistance})
                </p>
              ))}
            </div>
            <div className={styles.subSection}>
              <h3 className={styles.subTitle}>Перший результат</h3>
              <div className={styles.highlightResultCard}>
                <span className={styles.highlightResultBadge}>Найкраще ранжування</span>
                <p className={styles.highlightResultOrder}>
                  {formatRankingOrderNumbers(
                    lab3ExhaustiveSearch.minMaxTop[0].ranking,
                    lab3Candidates
                  )}
                </p>
                <p className={styles.highlightResultText}>
                  {lab3ExhaustiveSearch.minMaxTop[0].ranking.join(' > ')}
                </p>
                <p className={styles.sectionText}>
                  max = {lab3ExhaustiveSearch.minMaxTop[0].maxDistance}, сума ={' '}
                  {lab3ExhaustiveSearch.minMaxTop[0].sumDistance}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className={`${styles.sectionText} ${styles.muted}`}>
            {isLab3ExhaustiveSearchRunning
              ? 'Точний перебір виконується. Результати з&apos;являться після завершення обрахунку.'
              : `Для точного пошуку потрібно вибрати хоча б 1 об&apos;єкт і згенерувати ранжування експертів. Зараз вибрано: ${lab3ObjectCount}.`}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Генетичний алгоритм</h2>
        <p className={styles.sectionText}>
          Пошук виконується генетичним алгоритмом з турнірним відбором, кросовером, мутацією
        </p>
        <div className={styles.controlRow}>
          <div className={baseStyles.inputGroup}>
            <label htmlFor='lab3-fitness' className={styles.controlLabel}>
              Фітнес-функція
            </label>
            <select
              id='lab3-fitness'
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
            {isLab3EvolutionRunning ? 'Розрахунок...' : 'Запустити генетичний алгоритм'}
          </button>
        </div>
        {lab3Candidates.length === 0 && (
          <p className={`${styles.sectionText} ${styles.muted}`}>
            Для запуску потрібно вибрати хоча б 1 об&apos;єкт. Зараз вибрано: {lab3ObjectCount}.
          </p>
        )}
        {lab3EvolutionResult && (
          <div className={styles.resultCard}>
            <p className={styles.sectionText}>
              Фітнес-функція:{' '}
              {lab3EvolutionResult.objective === 'min-sum' ? 'Мінімальна сума відстаней' : 'MinMax'}
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
        )}
        {lab3EvolutionResult && lab3EvolutionResult.topRankings.length > 0 && (
          <div className={styles.subSection}>
            <h3 className={styles.subTitle}>
              {lab3EvolutionResult.objective === 'min-sum'
                ? 'Рішення з мінімальною сумою відстаней'
                : 'Рішення з мінімальним значенням Max'}
            </h3>
            {lab3EvolutionResult.topRankings.map((row, index) => (
              <p
                key={`lab3-evolution-${row.ranking.join('|')}-${index}`}
                className={styles.sectionText}
              >
                {index + 1}. {row.ranking.join(' > ')} (сума = {row.sumDistance}, max ={' '}
                {row.maxDistance})
              </p>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
