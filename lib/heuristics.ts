export interface HeuristicDefinition {
  code: string;
  description: string;
  value: string;
}

export const heuristics: HeuristicDefinition[] = [
  {
    code: 'E1',
    description: 'Участь в одному множинному порівнянні на 3 місці',
    value: 'Евристика E1. Участь в одному множинному порівнянні на 3 місці.'
  },
  {
    code: 'E2',
    description: 'Участь в одному множинному порівнянні на 2 місці',
    value: 'Евристика E2. Участь в одному множинному порівнянні на 2 місці.'
  },
  {
    code: 'E3',
    description: 'Участь в одному множинному порівнянні на 1 місці',
    value: 'Евристика E3. Участь в одному множинному порівнянні на 1 місці.'
  },
  {
    code: 'E4',
    description: 'Участь у двох множинних порівняннях на 3 місці',
    value: 'Евристика E4. Участь в 2х множинних порівняннях на 3 місці.'
  },
  {
    code: 'E5',
    description: 'Участь в одному порівнянні на 3 місці та ще в одному на 2 місці',
    value: 'Евристика E5. Участь в одному множинному порівнянні на 3 місці та ще в одному на 2 місці.'
  },
  {
    code: 'E6',
    description: 'Об’єкт жодного разу не посідав 1 місце',
    value: 'Евристика E6. Об’єкт жодного разу не посідав 1 місце.'
  },
  {
    code: 'E7',
    description: 'Об’єкт згадувався лише один раз незалежно від позиції',
    value: 'Евристика E7. Об’єкт згадувався лише один раз незалежно від позиції.'
  }
];

export const getHeuristicByValue = (value: string) =>
  heuristics.find((heuristic) => heuristic.value === value);
