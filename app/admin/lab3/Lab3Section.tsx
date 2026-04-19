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

type ExhaustiveRankingResult = {
  ranking: string[];
  distances: number[];
  sumDistance: number;
  maxDistance: number;
};

type Lab3ExhaustiveSearchResult = {
  totalPermutations: number;
  minSumBest: ExhaustiveRankingResult;
  minSumTop: ExhaustiveRankingResult[];
  minMaxBest: ExhaustiveRankingResult;
  minMaxTop: ExhaustiveRankingResult[];
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
  lab2FinalCandidates: string[];
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
  lab2FinalCandidates,
  formatRankingOrderNumbers,
  lab3FitnessMode,
  onLab3FitnessModeChange,
  runLab3EvolutionSearch,
  isLab3EvolutionRunning,
  lab3EvolutionResult
}: Lab3SectionProps) {
  const expertCount = Math.max(lab3ExpertHeaders.length, 1);

  return (
    <>
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
                    Для побудови таблиці потрібні дані з фінальної підмножини ЛР2.
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
            Для побудови статистики потрібні дані з фінальної підмножини ЛР2.
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
                    Для побудови таблиці потрібні дані з фінальної підмножини ЛР2.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Пошук мінімальної суми відстаней</h2>
        {lab3ExhaustiveSearch ? (
          <>
            <p className={styles.sectionText}>
              Перебрано всіх перестановок: {lab3ExhaustiveSearch.totalPermutations}
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
                    lab2FinalCandidates
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
            Для точного пошуку потрібно рівно 8 об&apos;єктів у фінальній підмножині ЛР2.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Пошук мінімуму максимумів MinMax</h2>
        {lab3ExhaustiveSearch ? (
          <>
            <p className={styles.sectionText}>
              Перебрано всіх перестановок: {lab3ExhaustiveSearch.totalPermutations}
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
                    lab2FinalCandidates
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
            Для точного пошуку потрібно рівно 8 об&apos;єктів у фінальній підмножині ЛР2.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Генетичний алгоритм</h2>
        <p className={styles.sectionText}>
          Пошук виконується генетичним алгоритмом з турнірним відбором, кросовером, мутацією та
          елітизмом.
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
            disabled={isLab3EvolutionRunning || lab2FinalCandidates.length !== 8}
          >
            {isLab3EvolutionRunning ? 'Розрахунок...' : 'Запустити генетичний алгоритм'}
          </button>
        </div>
        {lab2FinalCandidates.length !== 8 && (
          <p className={`${styles.sectionText} ${styles.muted}`}>
            Для запуску потрібно рівно 8 об&apos;єктів у фінальній підмножині.
          </p>
        )}
        {lab3EvolutionResult && (
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
