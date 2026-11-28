// Synthetic demo learners from the execution plan personas. No real learner data.
export type Learner = {
  id: string;
  name: string;
  age: number;
  country: string;
  role: 'learner' | 'educator';
  note: string;
};

export const LEARNERS: Learner[] = [
  { id: 'amara', name: 'Amara', age: 16, country: 'Kenya', role: 'learner', note: "Shares her mother's phone; data runs out mid-lesson" },
  { id: 'ravi', name: 'Ravi', age: 19, country: 'India', role: 'learner', note: 'Learns on the bus; signal comes and goes' },
  { id: 'lucia', name: 'Lucía', age: 19, country: 'Peru', role: 'learner', note: 'Signal only on market days; learns offline for days' },
  { id: 'tuan', name: 'Tuan', age: 15, country: 'Vietnam', role: 'learner', note: 'School tablet in class, own phone at home' },
  { id: 'okafor', name: 'Mr. Okafor', age: 34, country: 'Nigeria', role: 'educator', note: 'Teacher with 40 students' },
];

export const DEFAULT_LEARNER_ID = 'amara';
