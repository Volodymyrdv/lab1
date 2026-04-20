import baseStyles from '../../page.module.css';
import styles from '../admin.module.css';

type Lab2VoteRow = {
  id: number;
  expert: string;
  first_choice: string;
  second_choice: string;
  third_choice: string;
};

type HeuristicRankingRow = {
  code: string;
  description: string;
  points: number;
};

type HeuristicStepRow = {
  code: string;
  beforeCount: number;
  afterCount: number;
  removedCount: number;
};

type Lab2FilterRow = {
  movie: string;
  rank: number;
  ratingPoints: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  totalVotes: number;
  matchedHeuristics: string[];
  removedBy: string | null;
  isIncluded: boolean;
};

type ExpertRankingRow = {
  expert: string;
  ranking: string[];
};

type EvolutionResult = {
  objective: 'min-sum' | 'min-max';
  totalPermutations: number;
  populationSize: number;
  generations: number;
  bestRanking: string[];
  bestSumDistance: number;
  bestMaxDistance: number;
  topRankings: { ranking: string[]; sumDistance: number; maxDistance: number }[];
  durationMs: number;
};

type Lab2SectionProps = {
  lab2Votes: Lab2VoteRow[];
  heuristicRankingRows: HeuristicRankingRow[];
  lab2Analysis: {
    topHeuristics: { code: string }[];
    heuristicSteps: HeuristicStepRow[];
  };
  lab2FilterRows: Lab2FilterRow[];
  lab2FinalCandidates: string[];
  lab2ExpertRankings: ExpertRankingRow[];
  lab2ExpertCount: number;
  onLab2ExpertCountChange: (value: number) => void;
  onRegenerateLab2ExpertRankings: () => void;
  getHeuristicCode: (value: string) => string;
  lab2FitnessMode: 'min-sum' | 'min-max';
  onLab2FitnessModeChange: (value: 'min-sum' | 'min-max') => void;
  runEvolutionSearch: () => void;
  isEvolutionRunning: boolean;
  evolutionResult: EvolutionResult | null;
};

export function Lab2Section({
  lab2Votes,
  heuristicRankingRows,
  lab2Analysis,
  lab2FilterRows,
  lab2FinalCandidates,
  lab2ExpertRankings,
  lab2ExpertCount,
  onLab2ExpertCountChange,
  onRegenerateLab2ExpertRankings,
  getHeuristicCode,
  lab2FitnessMode,
  onLab2FitnessModeChange,
  runEvolutionSearch,
  isEvolutionRunning,
  evolutionResult
}: Lab2SectionProps) {
  return (
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
          Базова множина для ЛР2 формується з усіх 20 об&apos;єктів із таблиці рейтингу ЛР1. Для
          кожного об&apos;єкта нижче показано, чи спрацьовує на ньому одна з обраних евристик.
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
                    {row.matchedHeuristics.length > 0 ? row.matchedHeuristics.join(', ') : '-'}
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
        <div className={styles.blockHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Ранжування {lab2ExpertCount} експертів</h2>
            <p className={styles.sectionText}>
              Кількість експертів можна змінювати вручну, і ранжування одразу буде перебудоване.
            </p>
          </div>

          <div className={styles.expertControls}>
            <div className={styles.expertCountControl}>
              <label htmlFor='lab2-expert-count' className={styles.controlLabel}>
                Кількість експертів
              </label>
              <input
                id='lab2-expert-count'
                type='number'
                min={3}
                max={30}
                step={1}
                value={lab2ExpertCount}
                onChange={(e) => {
                  const nextValue = Number(e.target.value);
                  if (Number.isNaN(nextValue)) {
                    return;
                  }

                  onLab2ExpertCountChange(Math.min(30, Math.max(3, nextValue)));
                }}
                className={baseStyles.input}
              />
            </div>
            <button
              type='button'
              className={baseStyles.button}
              onClick={onRegenerateLab2ExpertRankings}
              disabled={lab2FinalCandidates.length === 0}
            >
              Згенерувати нові ранжування
            </button>
          </div>
        </div>

        {lab2ExpertRankings.length > 0 ? (
          <div className={styles.expertRankingGrid}>
            {lab2ExpertRankings.map((row, index) => (
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
            Немає даних для ранжування експертів
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Генетичний алгоритм</h2>
        <p className={styles.sectionText}>
          Пошук виконується генетичним алгоритмом з турнірним відбором, кросовером, мутацією.
        </p>
        <div className={styles.controlRow}>
          <div className={baseStyles.inputGroup}>
            <label htmlFor='lab2-fitness' className={styles.controlLabel}>
              Фітнес-функція
            </label>
            <select
              id='lab2-fitness'
              value={lab2FitnessMode}
              onChange={(e) => onLab2FitnessModeChange(e.target.value as 'min-sum' | 'min-max')}
              className={styles.select}
            >
              <option value='min-sum'>Мінімальна сума відстаней</option>
              <option value='min-max'>MinMax</option>
            </select>
          </div>
          <button
            type='button'
            className={baseStyles.button}
            onClick={runEvolutionSearch}
            disabled={isEvolutionRunning || lab2FinalCandidates.length !== 8}
          >
            {isEvolutionRunning ? 'Розрахунок...' : 'Запустити генетичний алгоритм'}
          </button>
        </div>
        {lab2FinalCandidates.length !== 8 && (
          <p className={`${styles.sectionText} ${styles.muted}`}>
            Для запуску потрібно рівно 8 об&apos;єктів у фінальній підмножині.
          </p>
        )}
        {evolutionResult && (
          <div className={styles.resultCard}>
            <p className={styles.sectionText}>
              Фітнес-функція:{' '}
              {evolutionResult.objective === 'min-sum' ? 'Мінімальна сума відстаней' : 'MinMax'}
            </p>
            <p className={styles.sectionText}>
              Найкраще ранжування: {evolutionResult.bestRanking.join(' > ')}
            </p>
            <p className={styles.sectionText}>
              Сума відстаней Хемінга: {evolutionResult.bestSumDistance}
            </p>
            <p className={styles.sectionText}>
              Максимальна відстань: {evolutionResult.bestMaxDistance}
            </p>
            <p className={styles.sectionText}>
              Популяція: {evolutionResult.populationSize}, поколінь: {evolutionResult.generations},
              час: {evolutionResult.durationMs} мс
            </p>
          </div>
        )}
        {evolutionResult && evolutionResult.topRankings.length > 0 && (
          <div className={styles.subSection}>
            <h3 className={styles.subTitle}>
              {evolutionResult.objective === 'min-sum'
                ? 'Рішення з мінімальною сумою відстаней'
                : 'Рішення з мінімальним значенням Max'}
            </h3>
            <div className={styles.tableWrap}>
              {evolutionResult.topRankings.map((row, index) => (
                <p key={`${row.ranking.join('|')}-${index}`} className={styles.sectionText}>
                  {index + 1}. {row.ranking.join(' > ')} (сума = {row.sumDistance}, max ={' '}
                  {row.maxDistance})
                </p>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
