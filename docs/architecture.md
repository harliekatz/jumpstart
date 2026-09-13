# Architecture

Vite, React 19 and TypeScript in strict mode. The build is a static bundle with
no server, no account and no network call.

```
src/
├── lib/
│   ├── rng.ts         seeded random numbers, the source of every synthetic figure
│   ├── mastery.ts     the knowledge tracing update, evidence label and review schedule
│   ├── scheduler.ts   lesson ranking, prerequisite gating and the displayed reasons
│   ├── curriculum.ts  20 lessons and the prerequisite graph
│   ├── items.ts       44 questions, 12 for placement and 32 for practice
│   ├── market.ts      the seeded price series
│   ├── portfolio.ts   cost basis, concentration and portfolio feedback
│   ├── budget.ts      50/30/20, emergency fund runway and projections
│   └── storage.ts     versioned localStorage codec
├── state/
│   ├── reducer.ts     every state transition, pure, with the clock injected
│   └── useJumpStart.ts the one stateful hook
└── components/        presentation
```

## One rule that keeps it navigable

`lib/` contains no React import. Every piece of behavior worth testing is a pure
function, which is why the suite has 115 tests and no test renderer.

## The clock is a parameter

`now` is passed into every dated action rather than read inside it. That is what
lets the streak and spaced repetition tests assert against specific dates
instead of mocking timers.

```ts
dispatch({ type: "submit-practice", lessonId, answers, now: new Date() });
```

## State

A single reducer owns every transition. `useJumpStart` holds the state, persists
it and exposes derived values through one memo keyed on the state object. The
whole derivation is a few hundred operations over twenty lessons, so there is no
cache to invalidate and no path where one screen shows a stale number.

Saved state is read after mount rather than during the first render, because
`localStorage` throws in a private window. Every read is wrapped and merged
against a fresh state, so a payload written by an older build degrades to a
partial reset rather than an undefined read inside a component.
