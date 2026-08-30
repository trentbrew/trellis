/**
 * Genealogy seed data — Matthew 1 and Luke 3 (abbreviated wedge).
 */

export interface BegatEdge {
  id: string;
  father: string;
  son: string;
  passageUri: string;
}

export const PERSONS: Array<{ id: string; name: string }> = [
  { id: 'bible:person/abraham', name: 'Abraham' },
  { id: 'bible:person/isaac', name: 'Isaac' },
  { id: 'bible:person/jacob', name: 'Jacob' },
  { id: 'bible:person/judah', name: 'Judah' },
  { id: 'bible:person/david', name: 'David' },
  { id: 'bible:person/solomon', name: 'Solomon' },
  { id: 'bible:person/nathan', name: 'Nathan' },
  { id: 'bible:person/jesse', name: 'Jesse' },
  { id: 'bible:person/joseph', name: 'Joseph' },
  { id: 'bible:person/jesus', name: 'Jesus' },
  { id: 'bible:person/jacob-mattan', name: 'Jacob (son of Matthan)' },
  { id: 'bible:person/heli', name: 'Heli' },
  { id: 'bible:person/rehoboam', name: 'Rehoboam' },
  { id: 'bible:person/mattatha', name: 'Mattatha' },
];

export const TRADITIONS = [
  {
    id: 'bible:tradition/matthew-genealogy',
    name: 'Gospel of Matthew — genealogy',
    kind: 'genealogy' as const,
  },
  {
    id: 'bible:tradition/luke-genealogy',
    name: 'Gospel of Luke — genealogy',
    kind: 'genealogy' as const,
  },
];

export const MATTHEW_BEGATS: BegatEdge[] = [
  { id: 'claim:matthew/abraham-isaac', father: 'bible:person/abraham', son: 'bible:person/isaac', passageUri: 'bible://MAT.1.2' },
  { id: 'claim:matthew/isaac-jacob', father: 'bible:person/isaac', son: 'bible:person/jacob', passageUri: 'bible://MAT.1.2' },
  { id: 'claim:matthew/jacob-judah', father: 'bible:person/jacob', son: 'bible:person/judah', passageUri: 'bible://MAT.1.2' },
  { id: 'claim:matthew/judah-david', father: 'bible:person/judah', son: 'bible:person/david', passageUri: 'bible://MAT.1.6' },
  { id: 'claim:matthew/david-solomon', father: 'bible:person/david', son: 'bible:person/solomon', passageUri: 'bible://MAT.1.6' },
  { id: 'claim:matthew/solomon-rehoboam', father: 'bible:person/solomon', son: 'bible:person/rehoboam', passageUri: 'bible://MAT.1.7' },
  { id: 'claim:matthew/jacob-mattan-joseph', father: 'bible:person/jacob-mattan', son: 'bible:person/joseph', passageUri: 'bible://MAT.1.16' },
  { id: 'claim:matthew/joseph-jesus', father: 'bible:person/joseph', son: 'bible:person/jesus', passageUri: 'bible://MAT.1.16' },
];

export const LUKE_BEGATS: BegatEdge[] = [
  { id: 'claim:luke/david-nathan', father: 'bible:person/david', son: 'bible:person/nathan', passageUri: 'bible://LUK.3.31' },
  { id: 'claim:luke/nathan-mattatha', father: 'bible:person/nathan', son: 'bible:person/mattatha', passageUri: 'bible://LUK.3.31' },
  { id: 'claim:luke/heli-joseph', father: 'bible:person/heli', son: 'bible:person/joseph', passageUri: 'bible://LUK.3.23' },
  { id: 'claim:luke/joseph-jesus', father: 'bible:person/joseph', son: 'bible:person/jesus', passageUri: 'bible://LUK.3.23' },
  { id: 'claim:luke/abraham-isaac', father: 'bible:person/abraham', son: 'bible:person/isaac', passageUri: 'bible://LUK.3.34' },
  { id: 'claim:luke/isaac-jacob', father: 'bible:person/isaac', son: 'bible:person/jacob', passageUri: 'bible://LUK.3.34' },
];

export const ATTACK_PAIRS: Array<[string, string]> = [
  ['claim:matthew/jacob-mattan-joseph', 'claim:luke/heli-joseph'],
  ['claim:luke/heli-joseph', 'claim:matthew/jacob-mattan-joseph'],
];
