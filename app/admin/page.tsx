'use client';

import { useEffect, useMemo, useState } from 'react';
import baseStyles from '../page.module.css';
import styles from './admin.module.css';
import { movies } from '@/lib/movies';
import { getHeuristicByValue, heuristics } from '@/lib/heuristics';

interface VoteRow {
  id: number;
  expert: string;
  first_place: string;
  second_place: string;
  third_place: string;
  created_at: string;
}

interface Lab2VoteRow {
  id: number;
  expert: string;
  first_choice: string;
  second_choice: string;
  third_choice: string;
  created_at: string;
}

interface RatingRow {
  movie: string;
  points: number;
}

interface StructureRow {
  movie: string;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  totalVotes: number;
}

interface HeuristicRankingRow {
  code: string;
  description: string;
  points: number;
}

interface HeuristicStepRow {
  code: string;
  beforeCount: number;
  afterCount: number;
  removedCount: number;
}

interface Lab2FilterRow extends StructureRow {
  rank: number;
  ratingPoints: number;
  matchedHeuristics: string[];
  removedBy: string | null;
  isIncluded: boolean;
}

interface ExpertRankingRow {
  expert: string;
  ranking: string[];
}

interface EvolutionResult {
  totalPermutations: number;
  populationSize: number;
  generations: number;
  bestRanking: string[];
  bestSumDistance: number;
  topRankings: { ranking: string[]; sumDistance: number }[];
  durationMs: number;
}

interface Lab3MatrixRow {
  comparison: number;
  expertValues: number[];
}

interface Lab3PreferenceStatsRow {
  candidateNumber: number;
  movie: string;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  participationCount: number;
}

interface Lab3RankMatrixRow {
  candidateNumber: number;
  movie: string;
  expertRanks: number[];
}

interface ExhaustiveRankingResult {
  ranking: string[];
  distances: number[];
  sumDistance: number;
  maxDistance: number;
}

interface Lab3ExhaustiveSearchResult {
  totalPermutations: number;
  minSumBest: ExhaustiveRankingResult;
  minSumTop: ExhaustiveRankingResult[];
  minMaxBest: ExhaustiveRankingResult;
  minMaxTop: ExhaustiveRankingResult[];
}

interface Lab3EvolutionResult {
  objective: 'min-sum' | 'min-max';
  totalPermutations: number;
  populationSize: number;
  generations: number;
  bestRanking: string[];
  bestSumDistance: number;
  bestMaxDistance: number;
  topRankings: { ranking: string[]; sumDistance: number; maxDistance: number }[];
  durationMs: number;
}

interface DistributedChunkResult {
  workerId: number;
  fixedFirstMovie: string;
  permutationCount: number;
  minSumBest: ExhaustiveRankingResult;
  minMaxBest: ExhaustiveRankingResult;
}

interface DistributedSearchResult {
  inputSignature: string;
  workerCount: number;
  permutationsPerWorker: number;
  totalPermutations: number;
  chunks: DistributedChunkResult[];
  globalMinSum: ExhaustiveRankingResult;
  globalMinMax: ExhaustiveRankingResult;
  matchesLab3MinSum: boolean;
  matchesLab3MinMax: boolean;
}

interface EvolutionRankingScore {
  ranking: string[];
  sumDistance: number;
  maxDistance: number;
}

interface LargeScaleEvolutionSummary {
  mode: 'simple' | 'island';
  objective: 'min-sum';
  populationSize: number;
  generations: number;
  bestRanking: string[];
  bestSumDistance: number;
  bestMaxDistance: number;
  durationMs: number;
}

interface LargeScaleIslandSummary {
  islandId: number;
  populationSize: number;
  durationMs: number;
  bestRanking: string[];
  bestSumDistance: number;
  bestMaxDistance: number;
}

interface LargeScaleDistributedSummary extends LargeScaleEvolutionSummary {
  islandCount: number;
  islands: LargeScaleIslandSummary[];
  estimatedParallelDurationMs: number;
  migrationInterval: number;
  migrantsPerIsland: number;
}

interface LargeScaleExperimentResult {
  alternativeCount: number;
  expertCount: number;
  candidates: string[];
  expertRankings: ExpertRankingRow[];
  simple: LargeScaleEvolutionSummary;
  distributed: LargeScaleDistributedSummary;
  estimatedSpeedup: number;
  qualityDelta: number;
}

const lab1ScoreMap = {
  first_place: 3,
  second_place: 2,
  third_place: 1
} as const;

const lab2ScoreMap = {
  first_choice: 3,
  second_choice: 2,
  third_choice: 1
} as const;

const getHeuristicCode = (value: string) => getHeuristicByValue(value)?.code ?? value;

const shuffleWithSeed = (items: string[], seed: number) => {
  const result = [...items];
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 48271) % 2147483647;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
};

const generateExpertRankings = (candidates: string[], count: number): ExpertRankingRow[] =>
  Array.from({ length: count }).map((_, index) => ({
    expert: `Експерт ${index + 1}`,
    ranking: shuffleWithSeed(candidates, 1000 + index * 37)
  }));

const randomPermutation = (items: string[]) => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
};

const generateRandomExpertRankings = (candidates: string[], count: number): ExpertRankingRow[] =>
  Array.from({ length: count }).map((_, index) => ({
    expert: `Експерт ${index + 1}`,
    ranking: randomPermutation(candidates)
  }));

const calculateHammingDistanceFull = (ranking: string[], expertRanking: string[]) =>
  ranking.reduce((total, movie, index) => total + (expertRanking[index] === movie ? 0 : 1), 0);

const calculateSumHammingAgainstExperts = (ranking: string[], expertRankings: ExpertRankingRow[]) =>
  expertRankings.reduce(
    (total, expertRow) => total + calculateHammingDistanceFull(ranking, expertRow.ranking),
    0
  );

const evaluateRankingAgainstExperts = (
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

const factorial = (value: number) => {
  let result = 1;
  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }
  return result;
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

const tournamentSelect = (
  population: { chromosome: string[]; sumDistance: number }[],
  tournamentSize: number
) => {
  let best = population[Math.floor(Math.random() * population.length)];

  for (let i = 1; i < tournamentSize; i += 1) {
    const candidate = population[Math.floor(Math.random() * population.length)];
    if (candidate.sumDistance < best.sumDistance) {
      best = candidate;
    }
  }

  return best;
};

const compareEvolutionScores = (left: EvolutionRankingScore, right: EvolutionRankingScore) =>
  left.sumDistance - right.sumDistance ||
  left.maxDistance - right.maxDistance ||
  compareRankingsAlphabetically(left.ranking, right.ranking);

const tournamentSelectEvolution = (
  population: EvolutionRankingScore[],
  tournamentSize: number
) => {
  let best = population[Math.floor(Math.random() * population.length)];

  for (let index = 1; index < tournamentSize; index += 1) {
    const candidate = population[Math.floor(Math.random() * population.length)];
    if (compareEvolutionScores(candidate, best) < 0) {
      best = candidate;
    }
  }

  return best;
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

    const signature = row.ranking.join('|');
    if (!seen.has(signature)) {
      population.push([...row.ranking]);
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

const evolvePopulationOnce = (
  evaluatedPopulation: EvolutionRankingScore[],
  targetSize: number,
  tournamentSize: number,
  mutationRate: number,
  eliteCount: number
) => {
  const sorted = [...evaluatedPopulation].sort(compareEvolutionScores);
  const nextPopulation = sorted
    .slice(0, Math.min(eliteCount, sorted.length))
    .map((item) => [...item.ranking]);

  while (nextPopulation.length < targetSize) {
    const leftParent = tournamentSelectEvolution(sorted, tournamentSize);
    const rightParent = tournamentSelectEvolution(sorted, tournamentSize);
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

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const formatDuration = (durationMs: number) =>
  durationMs >= 1000 ? `${(durationMs / 1000).toFixed(2)} с` : `${durationMs} мс`;

const generatePermutations = (items: string[]) => {
  const result: string[][] = [];
  const working = [...items];
  const c = new Array(working.length).fill(0);

  result.push([...working]);
  let i = 0;

  while (i < working.length) {
    if (c[i] < i) {
      if (i % 2 === 0) {
        [working[0], working[i]] = [working[i], working[0]];
      } else {
        [working[c[i]], working[i]] = [working[i], working[c[i]]];
      }
      result.push([...working]);
      c[i] += 1;
      i = 0;
    } else {
      c[i] = 0;
      i += 1;
    }
  }

  return result;
};

const matchesHeuristic = (row: StructureRow, code: string) => {
  switch (code) {
    case 'E1':
      return row.thirdPlace === 1;
    case 'E2':
      return row.secondPlace === 1;
    case 'E3':
      return row.firstPlace === 1;
    case 'E4':
      return row.thirdPlace === 2;
    case 'E5':
      return row.thirdPlace === 1 && row.secondPlace === 1;
    case 'E6':
      return row.firstPlace === 0;
    case 'E7':
      return row.totalVotes === 1;
    default:
      return false;
  }
};

const compareRankingsAlphabetically = (left: string[], right: string[]) =>
  left.join('|').localeCompare(right.join('|'));

const insertTopResult = (
  collection: ExhaustiveRankingResult[],
  candidate: ExhaustiveRankingResult,
  comparator: (left: ExhaustiveRankingResult, right: ExhaustiveRankingResult) => number,
  limit: number
) => {
  const next = [...collection, candidate].sort(comparator);
  return next.slice(0, limit);
};

const formatRankingOrderNumbers = (ranking: string[], candidates: string[]) =>
  ranking
    .map((movie) => {
      const candidateIndex = candidates.findIndex((candidate) => candidate === movie);
      return candidateIndex >= 0 ? String(candidateIndex + 1) : '?';
    })
    .join(' ');

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [lab2Votes, setLab2Votes] = useState<Lab2VoteRow[]>([]);
  const [activeLab, setActiveLab] = useState<'lab1' | 'lab2' | 'lab3' | 'lab4'>('lab1');
  const [message, setMessage] = useState('');
  const [evolutionResult, setEvolutionResult] = useState<EvolutionResult | null>(null);
  const [isEvolutionRunning, setIsEvolutionRunning] = useState(false);
  const [lab3FitnessMode, setLab3FitnessMode] = useState<'min-sum' | 'min-max'>('min-sum');
  const [lab3EvolutionResult, setLab3EvolutionResult] = useState<Lab3EvolutionResult | null>(null);
  const [isLab3EvolutionRunning, setIsLab3EvolutionRunning] = useState(false);
  const [lab4DistributedSearch, setLab4DistributedSearch] = useState<DistributedSearchResult | null>(
    null
  );
  const [isLab4DistributedRunning, setIsLab4DistributedRunning] = useState(false);
  const [lab4LargeExpertCount, setLab4LargeExpertCount] = useState(30);
  const [lab4IslandCount, setLab4IslandCount] = useState(2);
  const [lab4LargeScaleResult, setLab4LargeScaleResult] = useState<LargeScaleExperimentResult | null>(
    null
  );
  const [isLab4LargeScaleRunning, setIsLab4LargeScaleRunning] = useState(false);
  const [lab4View, setLab4View] = useState<'all' | 'classic' | 'large'>('all');
  const [isLab4RankingVisible, setIsLab4RankingVisible] = useState(true);
  const [isLab4SubsetVisible, setIsLab4SubsetVisible] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const loadData = async () => {
      const [lab1Response, lab2Response] = await Promise.all([
        fetch('/api/vote'),
        fetch('/api/lab2-vote')
      ]);

      const [lab1Data, lab2Data] = await Promise.all([lab1Response.json(), lab2Response.json()]);

      setVotes(Array.isArray(lab1Data) ? lab1Data : []);
      setLab2Votes(Array.isArray(lab2Data) ? lab2Data : []);
    };

    loadData();
    const interval = setInterval(loadData, 5000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
      setMessage('');
    } else {
      setMessage('Invalid credentials');
    }
  };

  const ratingRows = useMemo<RatingRow[]>(
    () =>
      movies
        .map((movie) => {
          const points = votes.reduce((total, vote) => {
            if (vote.first_place === movie) {
              return total + lab1ScoreMap.first_place;
            }
            if (vote.second_place === movie) {
              return total + lab1ScoreMap.second_place;
            }
            if (vote.third_place === movie) {
              return total + lab1ScoreMap.third_place;
            }
            return total;
          }, 0);

          return { movie, points };
        })
        .sort((a, b) => b.points - a.points || a.movie.localeCompare(b.movie)),
    [votes]
  );

  const structureRows = useMemo<StructureRow[]>(
    () =>
      movies
        .map((movie) => {
          const firstPlace = votes.filter((vote) => vote.first_place === movie).length;
          const secondPlace = votes.filter((vote) => vote.second_place === movie).length;
          const thirdPlace = votes.filter((vote) => vote.third_place === movie).length;

          return {
            movie,
            firstPlace,
            secondPlace,
            thirdPlace,
            totalVotes: firstPlace + secondPlace + thirdPlace
          };
        })
        .sort((a, b) => b.totalVotes - a.totalVotes || a.movie.localeCompare(b.movie)),
    [votes]
  );

  const heuristicRankingRows = useMemo<HeuristicRankingRow[]>(
    () =>
      heuristics
        .map((heuristic) => {
          const points = lab2Votes.reduce((total, vote) => {
            if (vote.first_choice === heuristic.value) {
              return total + lab2ScoreMap.first_choice;
            }
            if (vote.second_choice === heuristic.value) {
              return total + lab2ScoreMap.second_choice;
            }
            if (vote.third_choice === heuristic.value) {
              return total + lab2ScoreMap.third_choice;
            }
            return total;
          }, 0);

          return {
            code: heuristic.code,
            description: heuristic.description,
            points
          };
        })
        .sort((a, b) => b.points - a.points || a.code.localeCompare(b.code)),
    [lab2Votes]
  );

  const lab2Analysis = useMemo(() => {
    const topHeuristics = heuristicRankingRows.filter((row) => row.points > 0).slice(0, 3);
    const baseSubset = ratingRows
      .slice(0, movies.length)
      .map((row) => structureRows.find((item) => item.movie === row.movie))
      .filter((row): row is StructureRow => Boolean(row));

    const heuristicSteps: HeuristicStepRow[] = [];
    let currentSubset = [...baseSubset];

    topHeuristics.forEach((heuristic) => {
      const beforeCount = currentSubset.length;
      const filteredSubset = currentSubset.filter((row) => !matchesHeuristic(row, heuristic.code));
      const afterCount = filteredSubset.length;

      heuristicSteps.push({
        code: heuristic.code,
        beforeCount,
        afterCount,
        removedCount: beforeCount - afterCount
      });

      currentSubset = filteredSubset;
    });

    return {
      baseSubset,
      topHeuristics,
      heuristicSteps,
      finalSubset: currentSubset
    };
  }, [heuristicRankingRows, ratingRows, structureRows]);

  const lab2FilterRows = useMemo<Lab2FilterRow[]>(
    () =>
      ratingRows.map((ratingRow, index) => {
        const structureRow = structureRows.find((row) => row.movie === ratingRow.movie);

        if (!structureRow) {
          return {
            movie: ratingRow.movie,
            rank: index + 1,
            ratingPoints: ratingRow.points,
            firstPlace: 0,
            secondPlace: 0,
            thirdPlace: 0,
            totalVotes: 0,
            matchedHeuristics: [],
            removedBy: null,
            isIncluded: false
          };
        }

        const matchedHeuristics = lab2Analysis.topHeuristics
          .map((heuristic) => heuristic.code)
          .filter((code) => matchesHeuristic(structureRow, code));

        const removedBy =
          lab2Analysis.topHeuristics.find((heuristic) =>
            matchesHeuristic(structureRow, heuristic.code)
          )?.code ?? null;

        return {
          ...structureRow,
          rank: index + 1,
          ratingPoints: ratingRow.points,
          matchedHeuristics,
          removedBy,
          isIncluded: !removedBy
        };
      }),
    [lab2Analysis.topHeuristics, ratingRows, structureRows]
  );

  const lab2FinalCandidates = useMemo(
    () => lab2Analysis.finalSubset.map((row) => row.movie),
    [lab2Analysis.finalSubset]
  );

  const lab2ExpertRankings = useMemo(
    () => generateExpertRankings(lab2FinalCandidates, 15),
    [lab2FinalCandidates]
  );

  const lab3MatrixRows = useMemo<Lab3MatrixRow[]>(() => {
    if (lab2FinalCandidates.length === 0 || lab2ExpertRankings.length === 0) {
      return [];
    }

    return [0, 1, 2].map((comparisonIndex) => ({
      comparison: comparisonIndex + 1,
      expertValues: lab2ExpertRankings.map((expertRow) => {
        const movie = expertRow.ranking[comparisonIndex];
        const candidateIndex = lab2FinalCandidates.findIndex((candidate) => candidate === movie);

        return candidateIndex >= 0 ? candidateIndex + 1 : 0;
      })
    }));
  }, [lab2ExpertRankings, lab2FinalCandidates]);

  const lab3ExpertHeaders = useMemo(
    () => lab3MatrixRows[0]?.expertValues.map((_, index) => index + 1) ?? [],
    [lab3MatrixRows]
  );

  const lab3PreferenceStats = useMemo<Lab3PreferenceStatsRow[]>(() => {
    if (lab2FinalCandidates.length === 0 || lab2ExpertRankings.length === 0) {
      return [];
    }

    return lab2FinalCandidates.map((movie, index) => {
      let firstCount = 0;
      let secondCount = 0;
      let thirdCount = 0;

      lab2ExpertRankings.forEach((expertRow) => {
        const rankIndex = expertRow.ranking.findIndex((item) => item === movie);

        if (rankIndex === 0) {
          firstCount += 1;
        } else if (rankIndex === 1) {
          secondCount += 1;
        } else if (rankIndex === 2) {
          thirdCount += 1;
        }
      });

      return {
        candidateNumber: index + 1,
        movie,
        firstCount,
        secondCount,
        thirdCount,
        participationCount: firstCount + secondCount + thirdCount
      };
    });
  }, [lab2ExpertRankings, lab2FinalCandidates]);

  const lab3RankMatrixRows = useMemo<Lab3RankMatrixRow[]>(() => {
    if (lab2FinalCandidates.length === 0 || lab2ExpertRankings.length === 0) {
      return [];
    }

    return lab2FinalCandidates.map((movie, index) => ({
      candidateNumber: index + 1,
      movie,
      expertRanks: lab2ExpertRankings.map((expertRow) => {
        const rankIndex = expertRow.ranking.findIndex((item) => item === movie);
        return rankIndex >= 0 && rankIndex < 3 ? rankIndex + 1 : 0;
      })
    }));
  }, [lab2ExpertRankings, lab2FinalCandidates]);

  const lab3ExhaustiveSearch = useMemo<Lab3ExhaustiveSearchResult | null>(() => {
    if (lab2FinalCandidates.length !== 8 || lab2ExpertRankings.length === 0) {
      return null;
    }

    const permutations = generatePermutations(lab2FinalCandidates);
    let minSumBest: ExhaustiveRankingResult | null = null;
    let minMaxBest: ExhaustiveRankingResult | null = null;
    let minSumTop: ExhaustiveRankingResult[] = [];
    let minMaxTop: ExhaustiveRankingResult[] = [];

    permutations.forEach((ranking) => {
      const distances = lab2ExpertRankings.map((expertRow) =>
        calculateHammingDistanceFull(ranking, expertRow.ranking)
      );
      const sumDistance = distances.reduce((total, value) => total + value, 0);
      const maxDistance = Math.max(...distances);
      const candidate = {
        ranking: [...ranking],
        distances,
        sumDistance,
        maxDistance
      };

      if (
        !minSumBest ||
        sumDistance < minSumBest.sumDistance ||
        (sumDistance === minSumBest.sumDistance && maxDistance < minSumBest.maxDistance) ||
        (sumDistance === minSumBest.sumDistance &&
          maxDistance === minSumBest.maxDistance &&
          compareRankingsAlphabetically(ranking, minSumBest.ranking) < 0)
      ) {
        minSumBest = candidate;
      }

      if (
        !minMaxBest ||
        maxDistance < minMaxBest.maxDistance ||
        (maxDistance === minMaxBest.maxDistance && sumDistance < minMaxBest.sumDistance) ||
        (maxDistance === minMaxBest.maxDistance &&
          sumDistance === minMaxBest.sumDistance &&
          compareRankingsAlphabetically(ranking, minMaxBest.ranking) < 0)
      ) {
        minMaxBest = candidate;
      }

      minSumTop = insertTopResult(
        minSumTop,
        candidate,
        (left, right) =>
          left.sumDistance - right.sumDistance ||
          left.maxDistance - right.maxDistance ||
          compareRankingsAlphabetically(left.ranking, right.ranking),
        10
      );

      minMaxTop = insertTopResult(
        minMaxTop,
        candidate,
        (left, right) =>
          left.maxDistance - right.maxDistance ||
          left.sumDistance - right.sumDistance ||
          compareRankingsAlphabetically(left.ranking, right.ranking),
        10
      );
    });

    if (!minSumBest || !minMaxBest) {
      return null;
    }

    return {
      totalPermutations: permutations.length,
      minSumBest,
      minSumTop,
      minMaxBest,
      minMaxTop
    };
  }, [lab2ExpertRankings, lab2FinalCandidates]);

  const lab4DistributedInputSignature = useMemo(
    () => `${lab2FinalCandidates.join('|')}::${lab2ExpertRankings.map((row) => row.ranking.join('|')).join('::')}`,
    [lab2ExpertRankings, lab2FinalCandidates]
  );

  const activeLab4DistributedSearch =
    lab4DistributedSearch?.inputSignature === lab4DistributedInputSignature
      ? lab4DistributedSearch
      : null;

  const runEvolutionSearch = async () => {
    if (lab2FinalCandidates.length === 0) {
      setEvolutionResult(null);
      return;
    }

    if (lab2FinalCandidates.length !== 8) {
      setEvolutionResult(null);
      return;
    }

    if (lab2ExpertRankings.length === 0) {
      setEvolutionResult(null);
      return;
    }

    setIsEvolutionRunning(true);
    setEvolutionResult(null);
    const start = Date.now();
    const totalPermutations = factorial(lab2FinalCandidates.length);
    const populationSize = totalPermutations;
    const generations = 20;
    const tournamentSize = 3;
    const mutationRate = 0.35;

    let population = generatePermutations(lab2FinalCandidates);

    const evaluatePopulation = async (current: string[][]) => {
      const chunkSize = 1000;
      const chunks: string[][][] = [];

      for (let index = 0; index < current.length; index += chunkSize) {
        chunks.push(current.slice(index, index + chunkSize));
      }

      const evaluatedChunks = await Promise.all(
        chunks.map(
          (chunk) =>
            new Promise<{ chromosome: string[]; sumDistance: number }[]>((resolve) => {
              setTimeout(() => {
                const evaluated = chunk.map((chromosome) => ({
                  chromosome,
                  sumDistance: calculateSumHammingAgainstExperts(chromosome, lab2ExpertRankings)
                }));
                resolve(evaluated);
              }, 0);
            })
        )
      );

      return evaluatedChunks.flat();
    };

    let evaluated = await evaluatePopulation(population);
    let best = evaluated[0];
    let globalTop: { ranking: string[]; sumDistance: number }[] = [];

    for (let gen = 1; gen <= generations; gen += 1) {
      for (let i = 1; i < evaluated.length; i += 1) {
        if (evaluated[i].sumDistance < best.sumDistance) {
          best = evaluated[i];
        }
      }

      const currentTop = [...evaluated]
        .sort((left, right) => left.sumDistance - right.sumDistance)
        .slice(0, 40)
        .map((item) => ({ ranking: item.chromosome, sumDistance: item.sumDistance }));

      globalTop = [...globalTop, ...currentTop]
        .sort((left, right) => left.sumDistance - right.sumDistance)
        .filter(
          (item, index, collection) =>
            collection.findIndex((row) => row.ranking.join('|') === item.ranking.join('|')) ===
            index
        )
        .slice(0, 40);

      const nextPopulation: string[][] = [];
      while (nextPopulation.length < populationSize) {
        const parent = tournamentSelect(evaluated, tournamentSize);
        const child =
          Math.random() < mutationRate ? mutateChromosome(parent.chromosome) : parent.chromosome;
        nextPopulation.push(child);
      }

      population = nextPopulation;
      evaluated = await evaluatePopulation(population);
    }

    setEvolutionResult({
      totalPermutations,
      populationSize,
      generations,
      bestRanking: best.chromosome,
      bestSumDistance: best.sumDistance,
      topRankings: globalTop,
      durationMs: Date.now() - start
    });
    setIsEvolutionRunning(false);
  };

  const runLab3EvolutionSearch = async () => {
    if (lab2FinalCandidates.length !== 8 || lab2ExpertRankings.length === 0) {
      setLab3EvolutionResult(null);
      return;
    }

    setIsLab3EvolutionRunning(true);
    setLab3EvolutionResult(null);

    const start = Date.now();
    const totalPermutations = factorial(lab2FinalCandidates.length);
    const populationSize = totalPermutations;
    const generations = 20;
    const tournamentSize = 3;
    const mutationRate = 0.35;
    let population = generatePermutations(lab2FinalCandidates);

    const isBetterLab3 = (
      left: { ranking: string[]; sumDistance: number; maxDistance: number },
      right: { ranking: string[]; sumDistance: number; maxDistance: number }
    ) => {
      if (lab3FitnessMode === 'min-sum') {
        return (
          left.sumDistance < right.sumDistance ||
          (left.sumDistance === right.sumDistance && left.maxDistance < right.maxDistance) ||
          (left.sumDistance === right.sumDistance &&
            left.maxDistance === right.maxDistance &&
            compareRankingsAlphabetically(left.ranking, right.ranking) < 0)
        );
      }

      return (
        left.maxDistance < right.maxDistance ||
        (left.maxDistance === right.maxDistance && left.sumDistance < right.sumDistance) ||
        (left.maxDistance === right.maxDistance &&
          left.sumDistance === right.sumDistance &&
          compareRankingsAlphabetically(left.ranking, right.ranking) < 0)
      );
    };

    const evaluatePopulation = async (current: string[][]) => {
      const chunkSize = 1000;
      const chunks: string[][][] = [];

      for (let index = 0; index < current.length; index += chunkSize) {
        chunks.push(current.slice(index, index + chunkSize));
      }

      const evaluatedChunks = await Promise.all(
        chunks.map(
          (chunk) =>
            new Promise<{ ranking: string[]; sumDistance: number; maxDistance: number }[]>(
              (resolve) => {
                setTimeout(() => {
                  const evaluated = chunk.map((ranking) => {
                    const distances = lab2ExpertRankings.map((expertRow) =>
                      calculateHammingDistanceFull(ranking, expertRow.ranking)
                    );

                    return {
                      ranking,
                      sumDistance: distances.reduce((total, value) => total + value, 0),
                      maxDistance: Math.max(...distances)
                    };
                  });

                  resolve(evaluated);
                }, 0);
              }
            )
        )
      );

      return evaluatedChunks.flat();
    };

    const pickParent = (
      populationRows: { ranking: string[]; sumDistance: number; maxDistance: number }[]
    ) => {
      let best = populationRows[Math.floor(Math.random() * populationRows.length)];

      for (let i = 1; i < tournamentSize; i += 1) {
        const candidate = populationRows[Math.floor(Math.random() * populationRows.length)];
        if (isBetterLab3(candidate, best)) {
          best = candidate;
        }
      }

      return best;
    };

    let evaluated = await evaluatePopulation(population);
    let best = evaluated[0];
    let globalTop: { ranking: string[]; sumDistance: number; maxDistance: number }[] = [];

    for (let generation = 1; generation <= generations; generation += 1) {
      for (let i = 1; i < evaluated.length; i += 1) {
        if (isBetterLab3(evaluated[i], best)) {
          best = evaluated[i];
        }
      }

      const currentTop = [...evaluated]
        .sort((left, right) => {
          if (lab3FitnessMode === 'min-sum') {
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
        })
        .slice(0, 40)
        .map((item) => ({
          ranking: item.ranking,
          sumDistance: item.sumDistance,
          maxDistance: item.maxDistance
        }));

      globalTop = [...globalTop, ...currentTop]
        .sort((left, right) => {
          if (lab3FitnessMode === 'min-sum') {
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
        })
        .filter(
          (item, index, collection) =>
            collection.findIndex((row) => row.ranking.join('|') === item.ranking.join('|')) ===
            index
        )
        .slice(0, 40);

      const nextPopulation: string[][] = [];
      while (nextPopulation.length < populationSize) {
        const parent = pickParent(evaluated);
        const child = Math.random() < mutationRate ? mutateChromosome(parent.ranking) : parent.ranking;
        nextPopulation.push(child);
      }

      population = nextPopulation;
      evaluated = await evaluatePopulation(population);
    }

    setLab3EvolutionResult({
      objective: lab3FitnessMode,
      totalPermutations,
      populationSize,
      generations,
      bestRanking: best.ranking,
      bestSumDistance: best.sumDistance,
      bestMaxDistance: best.maxDistance,
      topRankings: globalTop,
      durationMs: Date.now() - start
    });
    setIsLab3EvolutionRunning(false);
  };

  const runLab4DistributedSearch = async () => {
    if (!lab3ExhaustiveSearch || lab2FinalCandidates.length === 0 || lab2ExpertRankings.length === 0) {
      setLab4DistributedSearch(null);
      return;
    }

    setIsLab4DistributedRunning(true);
    setLab4DistributedSearch(null);

    const workerCount = lab2FinalCandidates.length;
    const permutationsPerWorker = factorial(Math.max(lab2FinalCandidates.length - 1, 0));

    const chunks: DistributedChunkResult[] = [];

    for (const [workerIndex, fixedFirstMovie] of lab2FinalCandidates.entries()) {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const tailCandidates = lab2FinalCandidates.filter((movie) => movie !== fixedFirstMovie);
      const tailPermutations = generatePermutations(tailCandidates);
      let minSumBest: ExhaustiveRankingResult | null = null;
      let minMaxBest: ExhaustiveRankingResult | null = null;

      tailPermutations.forEach((tailRanking) => {
        const ranking = [fixedFirstMovie, ...tailRanking];
        const distances = lab2ExpertRankings.map((expertRow) =>
          calculateHammingDistanceFull(ranking, expertRow.ranking)
        );
        const sumDistance = distances.reduce((total, value) => total + value, 0);
        const maxDistance = Math.max(...distances);
        const candidate = {
          ranking,
          distances,
          sumDistance,
          maxDistance
        };

        if (
          !minSumBest ||
          sumDistance < minSumBest.sumDistance ||
          (sumDistance === minSumBest.sumDistance && maxDistance < minSumBest.maxDistance) ||
          (sumDistance === minSumBest.sumDistance &&
            maxDistance === minSumBest.maxDistance &&
            compareRankingsAlphabetically(ranking, minSumBest.ranking) < 0)
        ) {
          minSumBest = candidate;
        }

        if (
          !minMaxBest ||
          maxDistance < minMaxBest.maxDistance ||
          (maxDistance === minMaxBest.maxDistance && sumDistance < minMaxBest.sumDistance) ||
          (maxDistance === minMaxBest.maxDistance &&
            sumDistance === minMaxBest.sumDistance &&
            compareRankingsAlphabetically(ranking, minMaxBest.ranking) < 0)
        ) {
          minMaxBest = candidate;
        }
      });

      chunks.push({
        workerId: workerIndex + 1,
        fixedFirstMovie,
        permutationCount: tailPermutations.length,
        minSumBest: minSumBest ?? {
          ranking: [],
          distances: [],
          sumDistance: Number.POSITIVE_INFINITY,
          maxDistance: Number.POSITIVE_INFINITY
        },
        minMaxBest: minMaxBest ?? {
          ranking: [],
          distances: [],
          sumDistance: Number.POSITIVE_INFINITY,
          maxDistance: Number.POSITIVE_INFINITY
        }
      });
    }

    const globalMinSum = [...chunks]
      .map((chunk) => chunk.minSumBest)
      .sort(
        (left, right) =>
          left.sumDistance - right.sumDistance ||
          left.maxDistance - right.maxDistance ||
          compareRankingsAlphabetically(left.ranking, right.ranking)
      )[0];

    const globalMinMax = [...chunks]
      .map((chunk) => chunk.minMaxBest)
      .sort(
        (left, right) =>
          left.maxDistance - right.maxDistance ||
          left.sumDistance - right.sumDistance ||
          compareRankingsAlphabetically(left.ranking, right.ranking)
      )[0];

    setLab4DistributedSearch({
      inputSignature: lab4DistributedInputSignature,
      workerCount,
      permutationsPerWorker,
      totalPermutations: chunks.reduce((total, chunk) => total + chunk.permutationCount, 0),
      chunks,
      globalMinSum,
      globalMinMax,
      matchesLab3MinSum:
        globalMinSum.ranking.join('|') === lab3ExhaustiveSearch.minSumBest.ranking.join('|'),
      matchesLab3MinMax:
        globalMinMax.ranking.join('|') === lab3ExhaustiveSearch.minMaxBest.ranking.join('|')
    });
    setIsLab4DistributedRunning(false);
  };

  const runLab4LargeScaleExperiment = async () => {
    setIsLab4LargeScaleRunning(true);
    setLab4LargeScaleResult(null);

    const candidates = [...movies];
    const expertRankings = generateRandomExpertRankings(candidates, lab4LargeExpertCount);
    const generations = 36;
    const totalPopulation = 96;
    const tournamentSize = 4;
    const mutationRate = 0.32;
    const eliteCount = 4;
    const migrationInterval = 6;
    const migrantsPerIsland = 2;

    const evaluatePopulation = async (population: string[][]) => {
      const chunkSize = 16;
      const evaluated: EvolutionRankingScore[] = [];

      for (let index = 0; index < population.length; index += chunkSize) {
        const chunk = population.slice(index, index + chunkSize);
        evaluated.push(
          ...chunk.map((ranking) => evaluateRankingAgainstExperts(ranking, expertRankings))
        );
        await yieldToBrowser();
      }

      return evaluated;
    };

    const simplePopulationSize = totalPopulation;
    let simplePopulation = createEvolutionPopulation(candidates, simplePopulationSize, expertRankings);
    let simpleBest: EvolutionRankingScore | null = null;
    const simpleStart = Date.now();

    for (let generation = 0; generation < generations; generation += 1) {
      const evaluated = await evaluatePopulation(simplePopulation);
      const generationBest = [...evaluated].sort(compareEvolutionScores)[0];

      if (!simpleBest || compareEvolutionScores(generationBest, simpleBest) < 0) {
        simpleBest = generationBest;
      }

      simplePopulation = evolvePopulationOnce(
        evaluated,
        simplePopulationSize,
        tournamentSize,
        mutationRate,
        eliteCount
      );
    }

    const simpleDurationMs = Date.now() - simpleStart;
    const simpleResult: LargeScaleEvolutionSummary = {
      mode: 'simple',
      objective: 'min-sum',
      populationSize: simplePopulationSize,
      generations,
      bestRanking: simpleBest?.ranking ?? [],
      bestSumDistance: simpleBest?.sumDistance ?? Number.POSITIVE_INFINITY,
      bestMaxDistance: simpleBest?.maxDistance ?? Number.POSITIVE_INFINITY,
      durationMs: simpleDurationMs
    };

    const islandPopulationSize = Math.max(24, Math.floor(totalPopulation / lab4IslandCount));
    let islandPopulations = Array.from({ length: lab4IslandCount }, () =>
      createEvolutionPopulation(candidates, islandPopulationSize, expertRankings)
    );
    const islandDurations = new Array(lab4IslandCount).fill(0);
    const islandBests = new Array<EvolutionRankingScore | null>(lab4IslandCount).fill(null);
    const distributedStart = Date.now();

    for (let generation = 0; generation < generations; generation += 1) {
      const nextPopulations: string[][][] = [];

      for (let islandIndex = 0; islandIndex < lab4IslandCount; islandIndex += 1) {
        const islandStart = Date.now();
        const evaluated = await evaluatePopulation(islandPopulations[islandIndex]);
        const sorted = [...evaluated].sort(compareEvolutionScores);
        const islandBest = sorted[0];

        if (!islandBests[islandIndex] || compareEvolutionScores(islandBest, islandBests[islandIndex]!) < 0) {
          islandBests[islandIndex] = islandBest;
        }

        nextPopulations.push(
          evolvePopulationOnce(
            evaluated,
            islandPopulationSize,
            tournamentSize,
            mutationRate,
            Math.min(eliteCount, islandPopulationSize)
          )
        );
        islandDurations[islandIndex] += Date.now() - islandStart;
      }

      islandPopulations = nextPopulations;

      if ((generation + 1) % migrationInterval === 0 && lab4IslandCount > 1) {
        const migrants = islandBests.map((best, islandIndex) => ({
          islandIndex,
          migrants:
            best === null
              ? []
              : Array.from({ length: migrantsPerIsland }, () => mutateChromosome(best.ranking))
        }));

        islandPopulations = islandPopulations.map((population, islandIndex) => {
          const source = migrants[(islandIndex - 1 + migrants.length) % migrants.length];
          if (source.migrants.length === 0) {
            return population;
          }

          const preserved = population.slice(0, Math.max(population.length - migrantsPerIsland, 0));
          return [...preserved, ...source.migrants.map((ranking) => [...ranking])];
        });
      }

      await yieldToBrowser();
    }

    const distributedDurationMs = Date.now() - distributedStart;
    const islandSummaries: LargeScaleIslandSummary[] = islandBests.map((best, index) => ({
      islandId: index + 1,
      populationSize: islandPopulationSize,
      durationMs: islandDurations[index],
      bestRanking: best?.ranking ?? [],
      bestSumDistance: best?.sumDistance ?? Number.POSITIVE_INFINITY,
      bestMaxDistance: best?.maxDistance ?? Number.POSITIVE_INFINITY
    }));

    const distributedBest = islandSummaries
      .map((island) => ({
        ranking: island.bestRanking,
        sumDistance: island.bestSumDistance,
        maxDistance: island.bestMaxDistance
      }))
      .sort(compareEvolutionScores)[0];

    const estimatedParallelDurationMs = Math.max(...islandDurations);
    const distributedResult: LargeScaleDistributedSummary = {
      mode: 'island',
      objective: 'min-sum',
      populationSize: islandPopulationSize * lab4IslandCount,
      generations,
      bestRanking: distributedBest?.ranking ?? [],
      bestSumDistance: distributedBest?.sumDistance ?? Number.POSITIVE_INFINITY,
      bestMaxDistance: distributedBest?.maxDistance ?? Number.POSITIVE_INFINITY,
      durationMs: distributedDurationMs,
      islandCount: lab4IslandCount,
      islands: islandSummaries,
      estimatedParallelDurationMs,
      migrationInterval,
      migrantsPerIsland
    };

    const estimatedSpeedup =
      estimatedParallelDurationMs > 0
        ? Number((simpleDurationMs / estimatedParallelDurationMs).toFixed(2))
        : 0;
    const qualityDelta = distributedResult.bestSumDistance - simpleResult.bestSumDistance;

    setLab4LargeScaleResult({
      alternativeCount: candidates.length,
      expertCount: lab4LargeExpertCount,
      candidates,
      expertRankings,
      simple: simpleResult,
      distributed: distributedResult,
      estimatedSpeedup,
      qualityDelta
    });
    setIsLab4LargeScaleRunning(false);
  };

  if (!isLoggedIn) {
    return (
      <div className={baseStyles.page}>
        <div className={baseStyles.container}>
          <h1 className={baseStyles.pageTitle}>Admin Login</h1>
          <div
            className={baseStyles.content}
            style={{ maxWidth: '400px', margin: '0 auto', display: 'block' }}
          >
            <div className={baseStyles.column}>
              <form onSubmit={handleLogin}>
                <div className={baseStyles.inputGroup}>
                  <label>Username:</label>
                  <input
                    type='text'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={baseStyles.input}
                  />
                </div>
                <div className={baseStyles.inputGroup}>
                  <label>Password:</label>
                  <input
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={baseStyles.input}
                  />
                </div>
                <button type='submit' className={baseStyles.button}>
                  Login
                </button>
              </form>
              {message && <p className={baseStyles.message}>{message}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.shell}>
        <h1 className={styles.heading}>Адмін панель</h1>

        <div className={styles.toolbar}>
          <div className={styles.nav}>
            <button
              type='button'
              className={`${styles.navButton} ${activeLab === 'lab1' ? styles.navButtonActive : ''}`}
              onClick={() => setActiveLab('lab1')}
            >
              Лаб1
            </button>
            <button
              type='button'
              className={`${styles.navButton} ${activeLab === 'lab2' ? styles.navButtonActive : ''}`}
              onClick={() => setActiveLab('lab2')}
            >
              Лаб2
            </button>
            <button
              type='button'
              className={`${styles.navButton} ${activeLab === 'lab3' ? styles.navButtonActive : ''}`}
              onClick={() => setActiveLab('lab3')}
            >
              Лаб3
            </button>
            <button
              type='button'
              className={`${styles.navButton} ${activeLab === 'lab4' ? styles.navButtonActive : ''}`}
              onClick={() => setActiveLab('lab4')}
            >
              Лаб4
            </button>
          </div>
          <button
            onClick={() => setIsLoggedIn(false)}
            className={`${baseStyles.button} ${styles.logoutButton}`}
          >
            Logout
          </button>
        </div>

        {activeLab === 'lab1' ? (
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
              <h2 className={styles.sectionTitle}>
                Лабораторна 1 - структура голосування по фільмам
              </h2>
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
        ) : activeLab === 'lab2' ? (
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
                Базова множина для ЛР2 формується з усіх 20 об&apos;єктів із таблиці рейтингу ЛР1.
                Для кожного об&apos;єкта нижче показано, чи спрацьовує на ньому одна з обраних
                евристик.
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
                          {row.matchedHeuristics.length > 0
                            ? row.matchedHeuristics.join(', ')
                            : '-'}
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
              <h2 className={styles.sectionTitle}>Ранжування 15 експертів</h2>
              {lab2ExpertRankings.length > 0 ? (
                <div className={styles.tableWrap}>
                  {lab2ExpertRankings.map((row) => (
                    <p key={row.expert} className={styles.sectionText}>
                      {row.expert}: {row.ranking.join(' > ')}
                    </p>
                  ))}
                </div>
              ) : (
                <p className={`${styles.sectionText} ${styles.muted}`}>
                  Немає даних для ранжування експертів
                </p>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Еволюційні стратегії</h2>
              <button
                type='button'
                className={baseStyles.button}
                onClick={runEvolutionSearch}
                disabled={isEvolutionRunning || lab2FinalCandidates.length !== 8}
              >
                {isEvolutionRunning ? 'Розрахунок...' : 'Запустити алгоритм'}
              </button>
              {lab2FinalCandidates.length !== 8 && (
                <p className={`${styles.sectionText} ${styles.muted}`}>
                  Для запуску потрібно рівно 8 об&apos;єктів у фінальній підмножині.
                </p>
              )}
              {evolutionResult && (
                <div className={styles.subSection}>
                  <h3 className={styles.subTitle}>Найкраща перестановка</h3>
                  <p className={styles.sectionText}>
                    Ранжування: {evolutionResult.bestRanking.join(' > ')}
                  </p>
                  <p className={styles.sectionText}>
                    Сума відстаней Хемінга: {evolutionResult.bestSumDistance}
                  </p>
                  <p className={styles.sectionText}>
                    Розмір популяції: {evolutionResult.populationSize}
                  </p>
                  <p className={styles.sectionText}>
                    Кількість поколінь: {evolutionResult.generations}
                  </p>
                </div>
              )}
              {evolutionResult && evolutionResult.topRankings.length > 0 && (
                <div className={styles.subSection}>
                  <h3 className={styles.subTitle}>Топ-40 перестановок</h3>
                  <div className={styles.tableWrap}>
                    {evolutionResult.topRankings.map((row, index) => (
                      <p key={`${row.ranking.join('|')}-${index}`} className={styles.sectionText}>
                        {index + 1}. {row.ranking.join(' > ')} (ΣH = {row.sumDistance})
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        ) : activeLab === 'lab3' ? (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Ранжування 15 експертів</h2>
              {lab2ExpertRankings.length > 0 ? (
                <div className={styles.expertRankingGrid}>
                  {lab2ExpertRankings.map((row) => (
                    <article key={row.expert} className={styles.expertRankingCard}>
                      <div className={styles.expertRankingHeader}>
                        <span className={styles.expertRankingBadge}>{row.expert}</span>
                      </div>
                      <p className={styles.expertRankingText}>{row.ranking.join(' > ')}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className={`${styles.sectionText} ${styles.muted}`}>
                  Для побудови ранжування потрібні дані з блоку ЛР2.
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
                        <div className={styles.chartRow}>
                          <span className={styles.chartLabel}>1 місце</span>
                          <div className={styles.chartTrack}>
                            <div
                              className={`${styles.chartBar} ${styles.chartBarFirst}`}
                              style={{ width: `${(row.firstCount / 15) * 100}%` }}
                            />
                          </div>
                          <span className={styles.chartValue}>{row.firstCount}</span>
                        </div>

                        <div className={styles.chartRow}>
                          <span className={styles.chartLabel}>2 місце</span>
                          <div className={styles.chartTrack}>
                            <div
                              className={`${styles.chartBar} ${styles.chartBarSecond}`}
                              style={{ width: `${(row.secondCount / 15) * 100}%` }}
                            />
                          </div>
                          <span className={styles.chartValue}>{row.secondCount}</span>
                        </div>

                        <div className={styles.chartRow}>
                          <span className={styles.chartLabel}>3 місце</span>
                          <div className={styles.chartTrack}>
                            <div
                              className={`${styles.chartBar} ${styles.chartBarThird}`}
                              style={{ width: `${(row.thirdCount / 15) * 100}%` }}
                            />
                          </div>
                          <span className={styles.chartValue}>{row.thirdCount}</span>
                        </div>

                        <div className={styles.chartRow}>
                          <span className={styles.chartLabel}>Участь</span>
                          <div className={styles.chartTrack}>
                            <div
                              className={`${styles.chartBar} ${styles.chartBarParticipation}`}
                              style={{ width: `${(row.participationCount / 15) * 100}%` }}
                            />
                          </div>
                          <span className={styles.chartValue}>{row.participationCount}</span>
                        </div>
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
                        .map((distance: number, index: number) => `Е${index + 1}=${distance}`)
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
                        .map((distance: number, index: number) => `Е${index + 1}=${distance}`)
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
              <h2 className={styles.sectionTitle}>Еволюційні стратегії</h2>
              <div className={styles.controlRow}>
                <div className={baseStyles.inputGroup}>
                  <label htmlFor='lab3-fitness' className={styles.controlLabel}>
                    Фітнес-функція
                  </label>
                  <select
                    id='lab3-fitness'
                    value={lab3FitnessMode}
                    onChange={(e) =>
                      setLab3FitnessMode(e.target.value as 'min-sum' | 'min-max')
                    }
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
                  {isLab3EvolutionRunning ? 'Розрахунок...' : 'Запустити алгоритм'}
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
                  <h3 className={styles.subTitle}>Топ-40 еволюційного пошуку</h3>
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
        ) : activeLab === 'lab4' ? (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Навігація по ЛР4</h2>
              <div className={styles.lab4Subnav}>
                {[
                  { value: 'all', label: 'Усі блоки' },
                  { value: 'classic', label: 'ЛР3 + розподіл' },
                  { value: 'large', label: 'n >> 12' }
                ].map((item) => (
                  <button
                    key={`lab4-view-${item.value}`}
                    type='button'
                    className={`${styles.lab4SubnavButton} ${
                      lab4View === item.value ? styles.lab4SubnavButtonActive : ''
                    }`}
                    onClick={() => setLab4View(item.value as 'all' | 'classic' | 'large')}
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
                    обчислювальний вузол отримує власний блок виду
                    {' '}
                    <span className={styles.inlineFormula}>
                      [a<sub>k</sub>, ...]
                    </span>
                    {' '}
                    і перебирає лише перестановки хвоста з решти
                    {' '}
                    {Math.max(lab2FinalCandidates.length - 1, 0)}
                    {' '}
                    об&apos;єктів.
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
                      <strong className={styles.infoValue}>{factorial(lab2FinalCandidates.length)}</strong>
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
                <button
                  type='button'
                  className={styles.toggleButton}
                  onClick={() => setIsLab4SubsetVisible((current) => !current)}
                >
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
              <div className={styles.blockHeader}>
                <h2 className={styles.sectionTitle}>Ранжування 15 експертів</h2>
                <button
                  type='button'
                  className={styles.toggleButton}
                  onClick={() => setIsLab4RankingVisible((current) => !current)}
                >
                  {isLab4RankingVisible ? 'Приховати блок' : 'Показати блок'}
                </button>
              </div>

              {isLab4RankingVisible && (
                <div className={styles.expertRankingGrid}>
                  {lab2ExpertRankings.length > 0 ? (
                    lab2ExpertRankings.map((row, index) => (
                      <article
                        key={`lab4-preview-${row.expert}-${index}`}
                        className={styles.expertRankingCard}
                      >
                        <div className={styles.expertRankingHeader}>
                          <span className={styles.expertRankingBadge}>{row.expert}</span>
                        </div>
                        <p className={styles.expertRankingText}>{row.ranking.join(' > ')}</p>
                      </article>
                    ))
                  ) : (
                    <p className={`${styles.sectionText} ${styles.muted}`}>
                      Для побудови ранжувань потрібна фінальна підмножина ЛР2.
                    </p>
                  )}
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
                        MinSum: {activeLab4DistributedSearch.matchesLab3MinSum ? 'так' : 'ні'},
                        {' '}MinMax: {activeLab4DistributedSearch.matchesLab3MinMax ? 'так' : 'ні'}
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
                              сума = {chunk.minSumBest.sumDistance}, max ={' '}
                              {chunk.minSumBest.maxDistance}
                            </td>
                            <td className={styles.sequenceCell}>
                              {chunk.minMaxBest.ranking.join(' > ')}
                              <br />
                              max = {chunk.minMaxBest.maxDistance}, сума ={' '}
                              {chunk.minMaxBest.sumDistance}
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
                    onChange={(e) => setLab4LargeExpertCount(Number(e.target.value))}
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
                    onChange={(e) => setLab4IslandCount(Number(e.target.value))}
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
                    Для
                    {' '}
                    {lab4LargeScaleResult.alternativeCount}
                    {' '}
                    альтернатив і
                    {' '}
                    {lab4LargeScaleResult.expertCount}
                    {' '}
                    випадкових експертних ранжувань порівнюються базова стратегія та острівна
                    декомпозиція на
                    {' '}
                    {lab4LargeScaleResult.distributed.islandCount}
                    {' '}
                    острови.
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
                        сумарна популяція = {lab4LargeScaleResult.distributed.populationSize},
                        {' '}мігрантів на острів = {lab4LargeScaleResult.distributed.migrantsPerIsland}
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

                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Острів</th>
                          <th>Популяція</th>
                          <th>Час</th>
                          <th>Локальний компроміс</th>
                          <th>ΣH / max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lab4LargeScaleResult.distributed.islands.map((island) => (
                          <tr key={`large-island-${island.islandId}`}>
                            <td>Острів {island.islandId}</td>
                            <td>{island.populationSize}</td>
                            <td>{formatDuration(island.durationMs)}</td>
                            <td className={styles.sequenceCell}>{island.bestRanking.join(' > ')}</td>
                            <td>
                              {island.bestSumDistance} / {island.bestMaxDistance}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.blockHeader}>
                    <h3 className={styles.subTitle}>Приклад згенерованих ранжувань експертів</h3>
                  </div>
                  <div className={styles.expertRankingGrid}>
                    {lab4LargeScaleResult.expertRankings.slice(0, 6).map((row) => (
                      <article key={`large-expert-${row.expert}`} className={styles.expertRankingCard}>
                        <div className={styles.expertRankingHeader}>
                          <span className={styles.expertRankingBadge}>{row.expert}</span>
                        </div>
                        <p className={styles.expertRankingText}>{row.ranking.join(' > ')}</p>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <p className={`${styles.sectionText} ${styles.muted}`}>
                  Оберіть кількість експертів, кількість островів та запустіть експеримент, щоб
                  оцінити швидкість і якість компромісного розв&apos;язку для
                  {' '}
                  {movies.length}
                  {' '}
                  альтернатив.
                </p>
              )}
            </section>
              </>
            )}

          </>
        ) : null}
      </div>
    </div>
  );
}
