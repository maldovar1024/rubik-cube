export type ClockwiseKeys = 'F' | 'B' | 'L' | 'R' | 'U' | 'D';
export type CounterClockwiseKeys = `${ClockwiseKeys}'`;
export type HalfTurnKeys = `${ClockwiseKeys}2`;

export type AllTransformKeys =
  | ClockwiseKeys
  | CounterClockwiseKeys
  | HalfTurnKeys;
