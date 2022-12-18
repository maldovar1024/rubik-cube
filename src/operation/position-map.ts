import { ClockwiseKeys, CounterClockwiseKeys, HalfTurnKeys } from './types';

type PositionMap = Record<number, number | undefined>;

/*
 *        6 15 24
 *        7 16 25
 *        8 17 26
 * 6 7 8  8 17 26  26 25 24  24 15  6
 * 3 4 5  5 14 23  23 22 21  21 12  3
 * 0 1 2  2 11 20  20 19 18  18  9  0
 *        2 11 20
 *        1 10 19
 *        0  9 18
 */
const clockwisePositionMap: Record<ClockwiseKeys, PositionMap> = {
  F: {
    2: 8,
    5: 17,
    8: 26,
    11: 5,
    17: 23,
    20: 2,
    23: 11,
    26: 20,
  },
  L: {
    0: 6,
    3: 7,
    6: 8,
    1: 3,
    7: 5,
    2: 0,
    5: 1,
    8: 2,
  },
  R: {
    20: 26,
    23: 25,
    26: 24,
    19: 23,
    25: 21,
    18: 20,
    21: 19,
    24: 18,
  },
  B: {
    0: 18,
    3: 9,
    6: 0,
    9: 21,
    15: 3,
    18: 24,
    21: 15,
    24: 6,
  },
  U: {
    8: 6,
    7: 15,
    6: 24,
    17: 7,
    15: 25,
    26: 8,
    25: 17,
    24: 26,
  },
  D: {
    0: 2,
    1: 11,
    2: 20,
    9: 1,
    11: 19,
    18: 0,
    19: 9,
    20: 18,
  },
};

const counterClockwisePositionMap = Object.fromEntries(
  Object.entries(clockwisePositionMap).map(([face, map]) => [
    `${face}'`,
    Object.fromEntries(Object.entries(map).map(([from, to]) => [to, from])),
  ])
) as Record<CounterClockwiseKeys, PositionMap>;

const halfTurnPositionMap = Object.fromEntries(
  Object.entries(clockwisePositionMap).map(([face, map]) => [
    `${face}2`,
    Object.fromEntries(
      Object.entries(map).map(([from, to]) => [from, map[to!]])
    ),
  ])
) as Record<HalfTurnKeys, PositionMap>;

export default {
  ...counterClockwisePositionMap,
  ...halfTurnPositionMap,
  ...clockwisePositionMap,
};
