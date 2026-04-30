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
  workerId: number;
  candidates: string[];
  expertRankings: ExpertRankingRow[];
  populationSize: number;
  generations: number;
  tournamentSize: number;
  mutationRate: number;
  eliteCount: number;
  objective: 'min-sum' | 'min-max';
};

const compareRankingsAlphabetically = (left: string[], right: string[]) =>
  left.join('|').localeCompare(right.join('|'));

const calculateHammingDistanceFull = (ranking: string[], expertRanking: string[]) =>
  ranking.reduce((total, movie, index) => total + (expertRanking[index] === movie ? 0 : 1), 0);

const evaluateRanking = (
  ranking: string[],
  expertRankings: ExpertRankingRow[]
): EvolutionRankingScore => {
  const distances = expertRankings.map((expertRow) =>
    calculateHammingDistanceFull(ranking, expertRow.ranking)
  );

  return {
    ranking,
    sumDistance: distances.reduce((total, value) => total + value, 0),
    maxDistance: Math.max(...distances)
  };
};

const compareObjectiveScores = (
  left: EvolutionRankingScore,
  right: EvolutionRankingScore,
  objective: 'min-sum' | 'min-max'
) => {
  if (objective === 'min-sum') {
    return (
      left.sumDistance - right.sumDistance ||
      left.maxDistance - right.maxDistance ||
      compareRankingsAlphabetically(left.ranking, right.ranking)
    );
  }

  return (
    left.maxDistance - right.maxDistance ||
    left.sumDistance - right.sumDistance ||
    compareRankingsAlphabetically(left.ranking, right.ranking)
  );
};

const randomPermutation = (items: string[]) => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
};

const createEvolutionPopulation = (
  candidates: string[],
  size: number,
  expertRankings: ExpertRankingRow[]
) => {
  const population: string[][] = [];
  const seen = new Set<string>();

  expertRankings.forEach((row) => {
    if (population.length >= size) {
      return;
    }

    const ranking = randomPermutation(row.ranking);
    const signature = ranking.join('|');
    if (!seen.has(signature)) {
      population.push(ranking);
      seen.add(signature);
    }
  });

  while (population.length < size) {
    const ranking = randomPermutation(candidates);
    const signature = ranking.join('|');

    if (!seen.has(signature)) {
      population.push(ranking);
      seen.add(signature);
    }
  }

  return population;
};

const tournamentSelectEvolution = (
  population: EvolutionRankingScore[],
  tournamentSize: number,
  objective: 'min-sum' | 'min-max'
) => {
  let best = population[Math.floor(Math.random() * population.length)];

  for (let index = 1; index < tournamentSize; index += 1) {
    const candidate = population[Math.floor(Math.random() * population.length)];
    if (compareObjectiveScores(candidate, best, objective) < 0) {
      best = candidate;
    }
  }

  return best;
};

const mutateChromosome = (chromosome: string[]) => {
  if (chromosome.length < 2) {
    return chromosome;
  }

  const mutated = [...chromosome];
  const leftIndex = Math.floor(Math.random() * mutated.length);
  let rightIndex = Math.floor(Math.random() * mutated.length);

  if (rightIndex === leftIndex) {
    rightIndex = (rightIndex + 1) % mutated.length;
  }

  [mutated[leftIndex], mutated[rightIndex]] = [mutated[rightIndex], mutated[leftIndex]];
  return mutated;
};

const crossoverChromosomes = (leftParent: string[], rightParent: string[]) => {
  if (leftParent.length < 2) {
    return [...leftParent];
  }

  const start = Math.floor(Math.random() * leftParent.length);
  const end = start + Math.floor(Math.random() * (leftParent.length - start));
  const child = new Array<string>(leftParent.length).fill('');
  const used = new Set<string>();

  for (let index = start; index <= end; index += 1) {
    child[index] = leftParent[index];
    used.add(leftParent[index]);
  }

  let rightIndex = 0;

  for (let childIndex = 0; childIndex < child.length; childIndex += 1) {
    if (child[childIndex]) {
      continue;
    }

    while (used.has(rightParent[rightIndex])) {
      rightIndex += 1;
    }

    child[childIndex] = rightParent[rightIndex];
    used.add(rightParent[rightIndex]);
    rightIndex += 1;
  }

  return child;
};

const evolvePopulationOnce = (
  evaluatedPopulation: EvolutionRankingScore[],
  targetSize: number,
  tournamentSize: number,
  mutationRate: number,
  eliteCount: number,
  objective: 'min-sum' | 'min-max'
) => {
  const sorted = [...evaluatedPopulation].sort((left, right) =>
    compareObjectiveScores(left, right, objective)
  );
  const nextPopulation = sorted
    .slice(0, Math.min(eliteCount, sorted.length))
    .map((item) => [...item.ranking]);

  while (nextPopulation.length < targetSize) {
    const leftParent = tournamentSelectEvolution(sorted, tournamentSize, objective);
    const rightParent = tournamentSelectEvolution(sorted, tournamentSize, objective);
    let child = crossoverChromosomes(leftParent.ranking, rightParent.ranking);

    if (Math.random() < mutationRate) {
      child = mutateChromosome(child);
    }

    if (Math.random() < mutationRate / 2) {
      child = mutateChromosome(child);
    }

    nextPopulation.push(child);
  }

  return nextPopulation;
};

const appendUniqueTopRankings = (
  currentTop: EvolutionRankingScore[],
  newRankings: EvolutionRankingScore[],
  objective: 'min-sum' | 'min-max'
) =>
  [...currentTop, ...newRankings]
    .sort((left, right) => compareObjectiveScores(left, right, objective))
    .filter(
      (item, index, collection) =>
        collection.findIndex((row) => row.ranking.join('|') === item.ranking.join('|')) === index
    )
    .slice(0, 40);

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const {
      workerId,
      candidates,
      expertRankings,
      populationSize,
      generations,
      tournamentSize,
      mutationRate,
      eliteCount,
      objective
    } = event.data;
    const startedAt = performance.now();
    let population = createEvolutionPopulation(candidates, populationSize, expertRankings);
    let best: EvolutionRankingScore | null = null;
    let topRankings: EvolutionRankingScore[] = [];

    for (let generation = 1; generation <= generations; generation += 1) {
      const evaluated = population.map((ranking) => evaluateRanking(ranking, expertRankings));
      const sorted = [...evaluated].sort((left, right) =>
        compareObjectiveScores(left, right, objective)
      );

      if (!best || compareObjectiveScores(sorted[0], best, objective) < 0) {
        best = sorted[0];
      }

      topRankings = appendUniqueTopRankings(topRankings, sorted.slice(0, 40), objective);
      population = evolvePopulationOnce(
        sorted,
        populationSize,
        tournamentSize,
        mutationRate,
        eliteCount,
        objective
      );

      if (generation === generations || generation % 5 === 0) {
        self.postMessage({
          type: 'progress',
          workerId,
          generation,
          durationMs: Math.round(performance.now() - startedAt)
        });
      }
    }

    if (!best) {
      throw new Error('Worker не отримав жодного результату генетичного алгоритму.');
    }

    self.postMessage({
      type: 'done',
      workerId,
      result: {
        best,
        topRankings,
        durationMs: Math.round(performance.now() - startedAt)
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Невідома помилка генетичного алгоритму.'
    });
  }
};

export {};
