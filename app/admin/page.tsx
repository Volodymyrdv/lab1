'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import baseStyles from '../page.module.css';
import styles from './admin.module.css';
import { movies } from '@/lib/movies';
import { getHeuristicByValue, heuristics } from '@/lib/heuristics';
import { Lab1Section } from './lab1/Lab1Section';
import { Lab2Section } from './lab2/Lab2Section';
import { Lab3Section } from './lab3/Lab3Section';
import { Lab4Section } from './lab4/Lab4Section';

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
  durationMs: number;
  minSumBest: ExhaustiveRankingResult;
  minSumTop: ExhaustiveRankingResult[];
  minMaxBest: ExhaustiveRankingResult;
  minMaxTop: ExhaustiveRankingResult[];
}

interface Lab3ExhaustiveSearchProgress {
  processedPermutations: number;
  totalPermutations: number;
  durationMs: number;
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

interface EvolutionRankingScore {
  ranking: string[];
  sumDistance: number;
  maxDistance: number;
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

const delayToMainThread = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const computeLab3ExhaustiveSearchAsync = async (
  candidates: string[],
  expertRankings: ExpertRankingRow[],
  onProgress: (progress: Lab3ExhaustiveSearchProgress) => void,
  shouldStop: () => boolean
): Promise<Lab3ExhaustiveSearchResult | null> => {
  if (candidates.length === 0 || expertRankings.length === 0) {
    return null;
  }

  const totalPermutations = factorial(candidates.length);
  const startedAt = performance.now();
  const currentRanking: string[] = [];
  const used = Array.from({ length: candidates.length }, () => false);
  const progressChunkSize = 500;
  let processedPermutations = 0;
  let operationsSinceYield = 0;
  let minSumBest: ExhaustiveRankingResult | null = null;
  let minMaxBest: ExhaustiveRankingResult | null = null;
  let minSumTop: ExhaustiveRankingResult[] = [];
  let minMaxTop: ExhaustiveRankingResult[] = [];

  const evaluateCurrentRanking = () => {
    const ranking = [...currentRanking];
    const distances = expertRankings.map((expertRow) =>
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
  };

  const traverse = async (depth: number): Promise<void> => {
    if (shouldStop()) {
      return;
    }

    if (depth === candidates.length) {
      evaluateCurrentRanking();
      processedPermutations += 1;
      operationsSinceYield += 1;

      if (
        processedPermutations === totalPermutations ||
        operationsSinceYield >= progressChunkSize
      ) {
        onProgress({
          processedPermutations,
          totalPermutations,
          durationMs: Math.round(performance.now() - startedAt)
        });
        operationsSinceYield = 0;
        await delayToMainThread();
      }

      return;
    }

    for (let index = 0; index < candidates.length; index += 1) {
      if (used[index]) {
        continue;
      }

      used[index] = true;
      currentRanking.push(candidates[index]);
      await traverse(depth + 1);
      currentRanking.pop();
      used[index] = false;

      if (shouldStop()) {
        return;
      }
    }
  };

  await traverse(0);

  if (shouldStop() || !minSumBest || !minMaxBest) {
    return null;
  }

  return {
    totalPermutations,
    durationMs: Math.round(performance.now() - startedAt),
    minSumBest,
    minSumTop,
    minMaxBest,
    minMaxTop
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

const compareEvolutionScores = (left: EvolutionRankingScore, right: EvolutionRankingScore) =>
  left.sumDistance - right.sumDistance ||
  left.maxDistance - right.maxDistance ||
  compareRankingsAlphabetically(left.ranking, right.ranking);

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

const filterRankingsByBestObjective = (
  rankings: { ranking: string[]; sumDistance: number; maxDistance: number }[],
  objective: 'min-sum' | 'min-max'
) => {
  if (rankings.length === 0) {
    return rankings;
  }

  const bestValue =
    objective === 'min-sum'
      ? Math.min(...rankings.map((item) => item.sumDistance))
      : Math.min(...rankings.map((item) => item.maxDistance));

  return rankings.filter((item) =>
    objective === 'min-sum' ? item.sumDistance === bestValue : item.maxDistance === bestValue
  );
};

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
  const [lab2ExpertCount, setLab2ExpertCount] = useState(15);
  const [lab2ExpertGeneration, setLab2ExpertGeneration] = useState(0);
  const [lab2FitnessMode, setLab2FitnessMode] = useState<'min-sum' | 'min-max'>('min-sum');
  const [evolutionResult, setEvolutionResult] = useState<EvolutionResult | null>(null);
  const [isEvolutionRunning, setIsEvolutionRunning] = useState(false);
  const [lab3ObjectCount, setLab3ObjectCount] = useState(8);
  const [lab3ExpertCount, setLab3ExpertCount] = useState(15);
  const [lab3ExpertGeneration, setLab3ExpertGeneration] = useState(0);
  const [lab3FitnessMode, setLab3FitnessMode] = useState<'min-sum' | 'min-max'>('min-sum');
  const [lab3ExhaustiveSearch, setLab3ExhaustiveSearch] = useState<Lab3ExhaustiveSearchResult | null>(
    null
  );
  const [lab3ExhaustiveSearchProgress, setLab3ExhaustiveSearchProgress] =
    useState<Lab3ExhaustiveSearchProgress | null>(null);
  const [isLab3ExhaustiveSearchRunning, setIsLab3ExhaustiveSearchRunning] = useState(false);
  const [lab3EvolutionResult, setLab3EvolutionResult] = useState<Lab3EvolutionResult | null>(null);
  const [isLab3EvolutionRunning, setIsLab3EvolutionRunning] = useState(false);

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

  const lab3Candidates = useMemo(
    () => ratingRows.slice(0, lab3ObjectCount).map((row) => row.movie),
    [lab3ObjectCount, ratingRows]
  );

  const lab3CandidateRows = useMemo(
    () =>
      ratingRows.map((row, index) => ({
        rank: index + 1,
        movie: row.movie,
        isSelected: index < lab3ObjectCount
      })),
    [lab3ObjectCount, ratingRows]
  );

  const lab2FinalCandidatesSignature = useMemo(
    () => lab2FinalCandidates.join('|'),
    [lab2FinalCandidates]
  );
  const stableLab2FinalCandidates = useMemo(
    () => (lab2FinalCandidatesSignature ? lab2FinalCandidatesSignature.split('|') : []),
    [lab2FinalCandidatesSignature]
  );
  const lab2ExpertRankings = useMemo(
    () => {
      const generationToken = lab2ExpertGeneration;

      return generationToken >= 0
        ? generateRandomExpertRankings(stableLab2FinalCandidates, lab2ExpertCount)
        : [];
    },
    [lab2ExpertCount, lab2ExpertGeneration, stableLab2FinalCandidates]
  );

  const lab3CandidatesSignature = useMemo(() => lab3Candidates.join('|'), [lab3Candidates]);
  const stableLab3Candidates = useMemo(
    () => (lab3CandidatesSignature ? lab3CandidatesSignature.split('|') : []),
    [lab3CandidatesSignature]
  );

  const lab3ExpertRankings = useMemo(
    () => {
      const generationToken = lab3ExpertGeneration;

      return generationToken >= 0
        ? generateRandomExpertRankings(stableLab3Candidates, lab3ExpertCount)
        : [];
    },
    [lab3ExpertCount, lab3ExpertGeneration, stableLab3Candidates]
  );
  const lab3ExpertRankingsSignature = useMemo(
    () => lab3ExpertRankings.map((row) => `${row.expert}:${row.ranking.join('|')}`).join('::'),
    [lab3ExpertRankings]
  );
  const lab3ExhaustiveSearchInputSignature = useMemo(
    () => `${lab3CandidatesSignature}::${lab3ExpertRankingsSignature}`,
    [lab3CandidatesSignature, lab3ExpertRankingsSignature]
  );
  const completedLab3ExhaustiveSearchSignatureRef = useRef<string | null>(null);
  const activeLab3ExhaustiveSearchSignatureRef = useRef<string | null>(null);

  const resetLab3DerivedResults = () => {
    completedLab3ExhaustiveSearchSignatureRef.current = null;
    activeLab3ExhaustiveSearchSignatureRef.current = null;
    setLab3ExhaustiveSearch(null);
    setLab3ExhaustiveSearchProgress(null);
    setLab3EvolutionResult(null);
  };

  const resetLab2DerivedResults = () => {
    setEvolutionResult(null);
  };

  const handleLab2ExpertCountChange = (value: number) => {
    setLab2ExpertCount(value);
    setLab2ExpertGeneration((current) => current + 1);
    resetLab2DerivedResults();
  };

  const regenerateLab2ExpertRankings = () => {
    setLab2ExpertGeneration((current) => current + 1);
    resetLab2DerivedResults();
  };

  const handleLab3ExpertCountChange = (value: number) => {
    setLab3ExpertCount(value);
    setLab3ExpertGeneration((current) => current + 1);
    resetLab3DerivedResults();
  };

  const handleLab3ObjectCountChange = (value: number) => {
    setLab3ObjectCount(value);
    setLab3ExpertGeneration((current) => current + 1);
    resetLab3DerivedResults();
  };

  const regenerateLab3ExpertRankings = () => {
    setLab3ExpertGeneration((current) => current + 1);
    resetLab3DerivedResults();
  };

  const lab3MatrixRows = useMemo<Lab3MatrixRow[]>(() => {
    if (lab3Candidates.length === 0 || lab3ExpertRankings.length === 0) {
      return [];
    }

    return [0, 1, 2].map((comparisonIndex) => ({
      comparison: comparisonIndex + 1,
      expertValues: lab3ExpertRankings.map((expertRow) => {
        const movie = expertRow.ranking[comparisonIndex];
        const candidateIndex = lab3Candidates.findIndex((candidate) => candidate === movie);

        return candidateIndex >= 0 ? candidateIndex + 1 : 0;
      })
    }));
  }, [lab3CandidatesSignature, lab3ExpertRankingsSignature]);

  const lab3ExpertHeaders = useMemo(
    () => lab3MatrixRows[0]?.expertValues.map((_, index) => index + 1) ?? [],
    [lab3MatrixRows]
  );

  const lab3PreferenceStats = useMemo<Lab3PreferenceStatsRow[]>(() => {
    if (lab3Candidates.length === 0 || lab3ExpertRankings.length === 0) {
      return [];
    }

    return lab3Candidates.map((movie, index) => {
      let firstCount = 0;
      let secondCount = 0;
      let thirdCount = 0;

      lab3ExpertRankings.forEach((expertRow) => {
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
  }, [lab3ExpertRankings, lab3Candidates]);

  const lab3RankMatrixRows = useMemo<Lab3RankMatrixRow[]>(() => {
    if (lab3Candidates.length === 0 || lab3ExpertRankings.length === 0) {
      return [];
    }

    return lab3Candidates.map((movie, index) => ({
      candidateNumber: index + 1,
      movie,
      expertRanks: lab3ExpertRankings.map((expertRow) => {
        const rankIndex = expertRow.ranking.findIndex((item) => item === movie);
        return rankIndex >= 0 && rankIndex < 3 ? rankIndex + 1 : 0;
      })
    }));
  }, [lab3ExpertRankings, lab3Candidates]);

  useEffect(() => {
    let isCancelled = false;
    const currentInputSignature = lab3ExhaustiveSearchInputSignature;

    const runExhaustiveSearch = async () => {
      if (lab3Candidates.length === 0 || lab3ExpertRankings.length === 0) {
        completedLab3ExhaustiveSearchSignatureRef.current = null;
        activeLab3ExhaustiveSearchSignatureRef.current = null;
        setLab3ExhaustiveSearch(null);
        setLab3ExhaustiveSearchProgress(null);
        setIsLab3ExhaustiveSearchRunning(false);
        return;
      }

      if (
        completedLab3ExhaustiveSearchSignatureRef.current === currentInputSignature
      ) {
        setIsLab3ExhaustiveSearchRunning(false);
        return;
      }

      if (activeLab3ExhaustiveSearchSignatureRef.current === currentInputSignature) {
        return;
      }

      activeLab3ExhaustiveSearchSignatureRef.current = currentInputSignature;

      setLab3ExhaustiveSearch(null);
      setLab3ExhaustiveSearchProgress({
        processedPermutations: 0,
        totalPermutations: factorial(lab3Candidates.length),
        durationMs: 0
      });
      setIsLab3ExhaustiveSearchRunning(true);

      const result = await computeLab3ExhaustiveSearchAsync(
        lab3Candidates,
        lab3ExpertRankings,
        (progress) => {
          if (!isCancelled) {
            setLab3ExhaustiveSearchProgress(progress);
          }
        },
        () => isCancelled
      );

      if (isCancelled) {
        return;
      }

      activeLab3ExhaustiveSearchSignatureRef.current = null;
      completedLab3ExhaustiveSearchSignatureRef.current = result ? currentInputSignature : null;
      setLab3ExhaustiveSearch(result);
      setLab3ExhaustiveSearchProgress(
        result
          ? {
              processedPermutations: result.totalPermutations,
              totalPermutations: result.totalPermutations,
              durationMs: result.durationMs
            }
          : null
      );
      setIsLab3ExhaustiveSearchRunning(false);
    };

    runExhaustiveSearch();

    return () => {
      isCancelled = true;
      if (activeLab3ExhaustiveSearchSignatureRef.current === currentInputSignature) {
        activeLab3ExhaustiveSearchSignatureRef.current = null;
      }
    };
  }, [lab3ExhaustiveSearchInputSignature]);

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
    const populationSize = Math.min(Math.max(lab2FinalCandidates.length * 12, 48), 160);
    const generations = 40;
    const tournamentSize = 4;
    const mutationRate = 0.35;
    const eliteCount = 4;

    let population = createEvolutionPopulation(
      lab2FinalCandidates,
      populationSize,
      lab2ExpertRankings
    );

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

    let evaluated = await evaluatePopulation(population);
    let best = evaluated[0];
    let globalTop: { ranking: string[]; sumDistance: number; maxDistance: number }[] = [];

    for (let gen = 1; gen <= generations; gen += 1) {
      for (let i = 1; i < evaluated.length; i += 1) {
        if (compareObjectiveScores(evaluated[i], best, lab2FitnessMode) < 0) {
          best = evaluated[i];
        }
      }

      const currentTop = [...evaluated]
        .sort((left, right) => compareObjectiveScores(left, right, lab2FitnessMode))
        .slice(0, 40)
        .map((item) => ({
          ranking: item.ranking,
          sumDistance: item.sumDistance,
          maxDistance: item.maxDistance
        }));

      globalTop = [...globalTop, ...currentTop]
        .sort((left, right) => compareObjectiveScores(left, right, lab2FitnessMode))
        .filter(
          (item, index, collection) =>
            collection.findIndex((row) => row.ranking.join('|') === item.ranking.join('|')) ===
            index
        )
        .slice(0, 40);

      const sortedEvaluated = [...evaluated].sort((left, right) =>
        compareObjectiveScores(left, right, lab2FitnessMode)
      );
      population = evolvePopulationOnce(
        sortedEvaluated,
        populationSize,
        tournamentSize,
        mutationRate,
        eliteCount
      );
      evaluated = await evaluatePopulation(population);
    }

    setEvolutionResult({
      objective: lab2FitnessMode,
      totalPermutations,
      populationSize,
      generations,
      bestRanking: best.ranking,
      bestSumDistance: best.sumDistance,
      bestMaxDistance: best.maxDistance,
      topRankings: filterRankingsByBestObjective(globalTop, lab2FitnessMode),
      durationMs: Date.now() - start
    });
    setIsEvolutionRunning(false);
  };

  const runLab3EvolutionSearch = async () => {
    if (lab3Candidates.length === 0 || lab3ExpertRankings.length === 0) {
      setLab3EvolutionResult(null);
      return;
    }

    setIsLab3EvolutionRunning(true);
    setLab3EvolutionResult(null);

    const start = Date.now();
    const totalPermutations = factorial(lab3Candidates.length);
    const populationSize = Math.min(Math.max(lab3Candidates.length * 12, 48), 160);
    const generations = 40;
    const tournamentSize = 4;
    const mutationRate = 0.35;
    const eliteCount = 4;
    let population = createEvolutionPopulation(
      lab3Candidates,
      populationSize,
      lab3ExpertRankings
    );

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
                    const distances = lab3ExpertRankings.map((expertRow) =>
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

    let evaluated = await evaluatePopulation(population);
    let best = evaluated[0];
    let globalTop: { ranking: string[]; sumDistance: number; maxDistance: number }[] = [];

    for (let generation = 1; generation <= generations; generation += 1) {
      for (let i = 1; i < evaluated.length; i += 1) {
        if (compareObjectiveScores(evaluated[i], best, lab3FitnessMode) < 0) {
          best = evaluated[i];
        }
      }

      const currentTop = [...evaluated]
        .sort((left, right) => compareObjectiveScores(left, right, lab3FitnessMode))
        .slice(0, 40)
        .map((item) => ({
          ranking: item.ranking,
          sumDistance: item.sumDistance,
          maxDistance: item.maxDistance
        }));

      globalTop = [...globalTop, ...currentTop]
        .sort((left, right) => compareObjectiveScores(left, right, lab3FitnessMode))
        .filter(
          (item, index, collection) =>
            collection.findIndex((row) => row.ranking.join('|') === item.ranking.join('|')) ===
            index
        )
        .slice(0, 40);

      const sortedEvaluated = [...evaluated].sort((left, right) =>
        compareObjectiveScores(left, right, lab3FitnessMode)
      );
      population = evolvePopulationOnce(
        sortedEvaluated,
        populationSize,
        tournamentSize,
        mutationRate,
        eliteCount
      );
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
      topRankings: filterRankingsByBestObjective(globalTop, lab3FitnessMode),
      durationMs: Date.now() - start
    });
    setIsLab3EvolutionRunning(false);
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
          <Lab1Section votes={votes} ratingRows={ratingRows} structureRows={structureRows} />
        ) : activeLab === 'lab2' ? (
          <Lab2Section
            lab2Votes={lab2Votes}
            heuristicRankingRows={heuristicRankingRows}
            lab2Analysis={lab2Analysis}
            lab2FilterRows={lab2FilterRows}
            lab2FinalCandidates={lab2FinalCandidates}
            lab2ExpertRankings={lab2ExpertRankings}
            lab2ExpertCount={lab2ExpertCount}
            onLab2ExpertCountChange={handleLab2ExpertCountChange}
            onRegenerateLab2ExpertRankings={regenerateLab2ExpertRankings}
            getHeuristicCode={getHeuristicCode}
            lab2FitnessMode={lab2FitnessMode}
            onLab2FitnessModeChange={setLab2FitnessMode}
            runEvolutionSearch={runEvolutionSearch}
            isEvolutionRunning={isEvolutionRunning}
            evolutionResult={evolutionResult}
          />
        ) : activeLab === 'lab3' ? (
          <Lab3Section
            lab3ExpertHeaders={lab3ExpertHeaders}
            lab3MatrixRows={lab3MatrixRows}
            lab3PreferenceStats={lab3PreferenceStats}
            lab3RankMatrixRows={lab3RankMatrixRows}
            lab3ExhaustiveSearch={lab3ExhaustiveSearch}
            lab3ExhaustiveSearchProgress={lab3ExhaustiveSearchProgress}
            isLab3ExhaustiveSearchRunning={isLab3ExhaustiveSearchRunning}
            lab3CandidateRows={lab3CandidateRows}
            lab3ObjectCount={lab3ObjectCount}
            onLab3ObjectCountChange={handleLab3ObjectCountChange}
            lab3ExpertRankings={lab3ExpertRankings}
            lab3ExpertCount={lab3ExpertCount}
            onLab3ExpertCountChange={handleLab3ExpertCountChange}
            onRegenerateLab3ExpertRankings={regenerateLab3ExpertRankings}
            lab3Candidates={lab3Candidates}
            formatRankingOrderNumbers={formatRankingOrderNumbers}
            lab3FitnessMode={lab3FitnessMode}
            onLab3FitnessModeChange={setLab3FitnessMode}
            runLab3EvolutionSearch={runLab3EvolutionSearch}
            isLab3EvolutionRunning={isLab3EvolutionRunning}
            lab3EvolutionResult={lab3EvolutionResult}
          />
        ) : activeLab === 'lab4' ? (
          <Lab4Section
            lab3Candidates={lab3Candidates}
            lab3ExpertRankings={lab3ExpertRankings}
            lab3ExhaustiveSearch={lab3ExhaustiveSearch}
            lab3ExpertCount={lab3ExpertCount}
            onLab3ExpertCountChange={handleLab3ExpertCountChange}
            onRegenerateLab3ExpertRankings={regenerateLab3ExpertRankings}
            formatRankingOrderNumbers={formatRankingOrderNumbers}
          />
        ) : null}
      </div>
    </div>
  );
}
