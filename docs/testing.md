# Testing

```bash
npm test           # 115 tests
npm run typecheck  # strict, with noUncheckedIndexedAccess
npm run lint
```

All tests run against the logic rather than the markup.

| File | Covers |
| --- | --- |
| [`src/lib/mastery.test.ts`](../src/lib/mastery.test.ts) | Difficulty modulation in both directions, recovery after a wrong answer, bounds under 200 identical answers, convergence from a wrong prior, the interval walk and the 1.3 ease floor. |
| [`src/lib/scheduler.test.ts`](../src/lib/scheduler.test.ts) | The graph is acyclic and every edge resolves, every track has an entry lesson, prerequisites gate correctly, overdue reviews outrank everything, and the score behaves as a weighted sum rather than a priority order. |
| [`src/lib/market.test.ts`](../src/lib/market.test.ts) | Determinism across runs, per instrument path independence, no non positive prices, realized volatility ordering matching declared parameters. |
| [`src/lib/portfolio.test.ts`](../src/lib/portfolio.test.ts) | Volume weighted cost basis across purchases at different prices, cost basis unchanged by a partial sale, value conserved on a round trip, no mutation of input state. |
| [`src/lib/budget.test.ts`](../src/lib/budget.test.ts) | The annuity formula against its closed form, the early versus late compounding comparison the lesson makes, zero income and over commitment edge cases. |
| [`src/state/reducer.test.ts`](../src/state/reducer.test.ts) | Order independence during placement, order dependence during practice, XP awarded exactly once, day clamping, empty and unknown id submissions. |

## Two bugs the tests caught

**The placement test could not report low mastery.** Three wrong answers still
left the estimate near its prior, because the learning term kept lifting it. The
term is now switched off during placement. See
[ranking and models](models.md).

**Finished lessons reappeared forever.** A skill with no review scheduled has a
null due date, which the overdue calculation returned zero for, reading as due
today. Completed lessons stayed pinned to the top of the list.

## What these tests do not establish

The suite covers functional correctness. It asserts monotonicity, bounds,
determinism, graph structure and conservation properties.

It does not establish that the mastery estimates are calibrated, that the
difficulty assignments are accurate, or that the recommendation order helps
anyone learn faster. Those are empirical questions about people and would need
response data from real learners, which this project does not have.
