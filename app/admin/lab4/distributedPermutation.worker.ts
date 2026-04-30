/// <reference lib="webworker" />

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

type WorkerRequest = {
  workerId: number;
  prefix: string[];
  candidates: string[];
  expertRankings: ExpertRankingRow[];
  progressChunkSize: number;
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

const getRankingOrderNumbers = (ranking: string[], candidates: string[]) =>
  ranking.map((candidate) => candidates.indexOf(candidate) + 1);

const getRanksByCandidateOrder = (ranking: string[], candidates: string[]) =>
  candidates.map((candidate) => ranking.indexOf(candidate) + 1);

const calculateOrderDistance = (
  ranking: string[],
  expertRanking: string[],
  candidates: string[]
) => {
  const rankingOrder = getRankingOrderNumbers(ranking, candidates);
  const expertRanks = getRanksByCandidateOrder(expertRanking, candidates);

  return rankingOrder.reduce(
    (distance, value, index) => distance + Math.abs(value - (expertRanks[index] ?? 0)),
    0
  );
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { workerId, prefix, candidates, expertRankings, progressChunkSize } = event.data;

  try {
    const currentRanking = [...prefix];
    const used = Array.from({ length: candidates.length }, () => false);
    let processedPermutations = 0;
    let operationsSinceProgress = 0;
    let minSumBest: ExhaustiveRankingResult | null = null;
    let minMaxBest: ExhaustiveRankingResult | null = null;

    prefix.forEach((movie) => {
      const index = candidates.findIndex((candidate) => candidate === movie);
      if (index >= 0) {
        used[index] = true;
      }
    });

    const evaluateCurrentRanking = () => {
      const ranking = [...currentRanking];
      const distances = expertRankings.map((expertRow) =>
        calculateOrderDistance(ranking, expertRow.ranking, candidates)
      );
      const candidate = {
        ranking,
        distances,
        sumDistance: distances.reduce((total, value) => total + value, 0),
        maxDistance: Math.max(...distances)
      };

      if (!minSumBest || compareMinSumResults(candidate, minSumBest) < 0) {
        minSumBest = candidate;
      }

      if (!minMaxBest || compareMinMaxResults(candidate, minMaxBest) < 0) {
        minMaxBest = candidate;
      }

      processedPermutations += 1;
      operationsSinceProgress += 1;

      if (operationsSinceProgress >= progressChunkSize) {
        const progressMessage: WorkerProgressMessage = {
          type: 'progress',
          workerId,
          processedPermutations
        };
        self.postMessage(progressMessage);
        operationsSinceProgress = 0;
      }
    };

    const traverse = (depth: number) => {
      if (depth === candidates.length) {
        evaluateCurrentRanking();
        return;
      }

      for (let index = 0; index < candidates.length; index += 1) {
        if (used[index]) {
          continue;
        }

        used[index] = true;
        currentRanking.push(candidates[index]);
        traverse(depth + 1);
        currentRanking.pop();
        used[index] = false;
      }
    };

    traverse(prefix.length);

    const finalProgressMessage: WorkerProgressMessage = {
      type: 'progress',
      workerId,
      processedPermutations
    };
    const doneMessage: WorkerDoneMessage = {
      type: 'done',
      result: {
        workerId,
        prefix,
        permutationsProcessed: processedPermutations,
        minSumBest,
        minMaxBest
      }
    };

    self.postMessage(finalProgressMessage);
    self.postMessage(doneMessage);
  } catch (error) {
    const errorMessage: WorkerErrorMessage = {
      type: 'error',
      workerId,
      error: error instanceof Error ? error.message : 'Невідома помилка у worker.'
    };

    self.postMessage(errorMessage);
  }
};

export {};
