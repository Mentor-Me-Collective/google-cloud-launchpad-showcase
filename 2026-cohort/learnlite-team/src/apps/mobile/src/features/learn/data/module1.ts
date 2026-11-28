// The ONE content source for the app: Reshma's Module 1 pack from content/module1_pack.json.
// Drop a newer pack into that file and the app picks it up; nothing else holds lesson text.
import rawPack from '../../../../../../content/module1_pack.json';

import type { ContentPack, LockedLesson } from '@/features/learn/types/learn';

export const bundledPack = rawPack as unknown as ContentPack;

export const LEARNER_ID = 'amara';
export const LEARNER_NAME = 'Amara';

export const MODULE_TITLE = 'Inside the AI Chatbot';
export const MODULE_SUBTITLE = 'How it works and when not to trust it';
export const MODULE_MINUTES = 25;

/** Lessons not in the pack yet. Shown as locked "Coming soon" cards. */
export const LOCKED_LESSONS: LockedLesson[] = [
  { number: 2, title: 'Where AI learns from', description: 'What goes into the text a model is trained on.' },
  { number: 3, title: 'Write a clear prompt', description: 'Ask in a way that gets you a useful answer.' },
  { number: 5, title: 'Final challenge', description: 'Put everything together and earn your badge.' },
];
