import { TEXT } from './strings.js';

export const formatResponse = value => value === null ? TEXT.empty : TEXT.seconds(value);
export const formatAccuracy = value => value === null ? TEXT.empty : TEXT.percent(value);
export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const formatRemaining = value => formatDuration(Math.ceil(value / 1000) * 1000);
