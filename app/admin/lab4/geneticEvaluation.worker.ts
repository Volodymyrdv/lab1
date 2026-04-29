/// <reference lib="webworker" />

type ExpertRankingRow = {
  expert: string;
  ranking: string[];
};

type EvolutionRankingScore = {
  ranking: string[];
  sumDistance: number;
  maxDistance: number;
};

type WorkerRequest = {
  population: string[][];
  expertRankings: ExpertRankingRow[];
};

const calculateHammingDistanceFull = (ranking: string[], expertRanking: string[]) =>
  ranking.reduce((total, movie, index) => total + (expertRanking[index] === movie ? 0 : 1), 0);

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const { population, expertRankings } = event.data;
    const scores: EvolutionRankingScore[] = population.map((ranking) => {
      const distances = expertRankings.map((expertRow) =>
        calculateHammingDistanceFull(ranking, expertRow.ranking)
      );

      return {
        ranking,
        sumDistance: distances.reduce((total, value) => total + value, 0),
        maxDistance: Math.max(...distances)
      };
    });

    self.postMessage({
      type: 'done',
      scores
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Невідома помилка оцінювання популяції.'
    });
  }
};

export {};
