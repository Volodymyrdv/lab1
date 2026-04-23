import baseStyles from '../../page.module.css';
import styles from '../admin.module.css';

type Lab4SectionProps = {
  lab3Candidates: string[];
  lab3ExpertRankings: Array<{
    expert: string;
    ranking: string[];
  }>;
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

export function Lab4Section({
  lab3Candidates,
  lab3ExpertRankings,
  lab3ExhaustiveSearch,
  lab3ExpertCount,
  onLab3ExpertCountChange,
  onRegenerateLab3ExpertRankings,
  formatRankingOrderNumbers
}: Lab4SectionProps) {
  return (
    <>
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
              {lab3Candidates.length > 0 ? (
                lab3Candidates.map((movie, index) => (
                  <tr key={`lab4-candidate-${movie}`}>
                    <td>{index + 1}</td>
                    <td>{movie}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className={`${styles.centerCell} ${styles.muted}`}>
                    Немає об&apos;єктів для відображення.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeaderInline}>
          <div>
            <h2 className={styles.sectionTitle}>Ранжування {lab3ExpertCount} експертів для ЛР3</h2>
            <p className={styles.sectionText}>
              Це окремий набір ранжувань для ЛР3, який не залежить від згенерованих експертів у
              ЛР2.
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
        <h2 className={styles.sectionTitle}>Результати точного перебору</h2>
        {lab3ExhaustiveSearch ? (
          <>
            <p className={styles.sectionText}>
              Час точного перебору: {lab3ExhaustiveSearch.durationMs} мс
            </p>

            <div className={styles.subSection}>
              <h3 className={styles.subTitle}>Результат мінімальної суми</h3>
              <p className={styles.sectionText}>Перший результат</p>
              <div className={styles.highlightResultCard}>
                <span className={styles.highlightResultBadge}>Найкраще ранжування</span>
                <p className={styles.highlightResultOrder}>
                  {formatRankingOrderNumbers(
                    lab3ExhaustiveSearch.minSumBest.ranking,
                    lab3Candidates
                  )}
                </p>
                <p className={styles.highlightResultText}>
                  {lab3ExhaustiveSearch.minSumBest.ranking.join(' > ')}
                </p>
                <p className={styles.sectionText}>
                  сума = {lab3ExhaustiveSearch.minSumBest.sumDistance}, max ={' '}
                  {lab3ExhaustiveSearch.minSumBest.maxDistance}
                </p>
              </div>
            </div>

            <div className={styles.subSection}>
              <h3 className={styles.subTitle}>Результат MinMax</h3>
              <p className={styles.sectionText}>Перший результат</p>
              <div className={styles.highlightResultCard}>
                <span className={styles.highlightResultBadge}>Найкраще ранжування</span>
                <p className={styles.highlightResultOrder}>
                  {formatRankingOrderNumbers(
                    lab3ExhaustiveSearch.minMaxBest.ranking,
                    lab3Candidates
                  )}
                </p>
                <p className={styles.highlightResultText}>
                  {lab3ExhaustiveSearch.minMaxBest.ranking.join(' > ')}
                </p>
                <p className={styles.sectionText}>
                  max = {lab3ExhaustiveSearch.minMaxBest.maxDistance}, сума ={' '}
                  {lab3ExhaustiveSearch.minMaxBest.sumDistance}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className={`${styles.sectionText} ${styles.muted}`}>
            Результати точного перебору з&apos;являться після завершення обрахунку в ЛР3.
          </p>
        )}
      </section>
    </>
  );
}
