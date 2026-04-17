import styles from '../admin.module.css';

type VoteRow = {
  id: number;
  expert: string;
  first_place: string;
  second_place: string;
  third_place: string;
  created_at: string;
};

type RatingRow = {
  movie: string;
  points: number;
};

type StructureRow = {
  movie: string;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  totalVotes: number;
};

type Lab1SectionProps = {
  votes: VoteRow[];
  ratingRows: RatingRow[];
  structureRows: StructureRow[];
};

export function Lab1Section({ votes, ratingRows, structureRows }: Lab1SectionProps) {
  return (
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
        <h2 className={styles.sectionTitle}>Лабораторна 1 - структура голосування по фільмам</h2>
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
  );
}
