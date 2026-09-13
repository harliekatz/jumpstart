# Ranking and models

## The recommendation score

[`src/lib/scheduler.ts`](../src/lib/scheduler.ts) scores every lesson whose
prerequisites are met and sorts by the total. It is a weighted sum. Six terms
are added together, so a term lower in this table can outrank one above it.

| Term | Maximum | Scaled by |
| --- | --- | --- |
| Overdue review | 90 | 60 flat, plus 3 per day overdue up to 30 more |
| Room to improve | 30 | `1 - P(mastered)` for the lesson's track |
| Foundation | 25 | How many later lessons it transitively unblocks, capped at 5 |
| Goal alignment | 20 | The weight the chosen goal gives that track, applied above 0.7 |
| Unread | 8 | Flat, if the lesson has not been opened |
| Short lesson | 1.2 | Tie break toward a quicker lesson |

Only the overdue term dominates on its own, since the other five reach at most
84.2 together. Everything else competes.

Two behaviors follow from this and are asserted in
[`src/lib/scheduler.test.ts`](../src/lib/scheduler.test.ts).

- A weak track can beat a strong foundation. With no goal set, a lesson that
  unblocks one other lesson in a track at 10 percent mastery outranks one that
  unblocks six in a track at 95 percent.
- An overdue review beats everything else combined.

Lessons with unmet prerequisites are excluded before scoring rather than
down weighted, so a locked lesson can never appear however weak its track is.
The gate is a practice score of 0.6 or better on each prerequisite lesson.

## Mastery

The app tracks the probability that a learner has mastered each of the four
tracks using Bayesian knowledge tracing, described in Corbett and Anderson
(1995), "Knowledge tracing: modeling the acquisition of procedural knowledge",
*User Modeling and User-Adapted Interaction* 4(4).

```
correct    P' = P(1-slip) / [ P(1-slip) + (1-P)·guess ]
incorrect  P' = P·slip     / [ P·slip     + (1-P)(1-guess) ]
then       P  = P' + (1-P')·transit
```

Item difficulty modulates slip and guess, so a correct answer on a hard item
moves the estimate further than one on an easy item. Guess is floored near pure
chance, because with four options a correct answer cannot prove more than the
one in four baseline allows.

**The learning term is switched off during placement.** This is the one
departure from the textbook update, and it came from a failing test. With
`transit` fixed at 0.18, three consecutive wrong answers still left the estimate
near its 0.2 prior, because the model kept assuming the learner was picking it
up as they went. That is right during practice, where an explanation follows
every question. It is wrong during a diagnostic, where nothing is taught. So
`transit` is a parameter, zero for placement and 0.18 for practice.

A useful consequence is that placement updates become pure Bayes and therefore
commute, so shuffling the question order cannot change where a learner lands.
Practice deliberately does not have that property. Both are asserted in
[`src/state/reducer.test.ts`](../src/state/reducer.test.ts).

**Parameters are literature defaults, not fitted.** `pInit` 0.2, `pTransit`
0.18, base slip 0.1 and base guess 0.25 are hardcoded. Item difficulties are
hand assigned. Nothing in this repository fits either from response data.

## The evidence label

Alongside each mastery estimate the app shows a label reading low, moderate or
high. It is computed from answer count alone.

```
evidence = 1 - e^(-attempts / 6)
low below 0.45, moderate below 0.8, high above
```

Thresholds land at roughly four and ten answers. This is a heuristic for how
much evidence an estimate rests on. It is not a posterior variance, a credible
interval or a standard error, and two learners with the same number of answers
get the same label whatever those answers were. It exists so that a 62 percent
estimate from three answers is not read the same way as one from twenty.

## Review scheduling

Adapted from SM-2. The ease factor update and the 1.3 floor are SM-2 as
published. Three things differ.

- Quality is a whole practice session's score rescaled to 0 through 5, not a
  per item recall grade, so fractional values reach the ease formula.
- State is held per track rather than per item, so four skills are scheduled
  rather than forty four questions.
- The second interval is 4 days rather than SM-2's 6, and a failed session sets
  the interval to 1 day instead of restarting a repetition count.

A session below 60 percent resets the interval to one day. Overdue reviews then
dominate the recommendation score, which is how spacing stays at the top of the
Today screen rather than sitting at the bottom of a list.

## Market simulation

Prices follow geometric Brownian motion.

```
S(t+1) = S(t) · exp( (μ - σ²/2)·dt + σ·√dt·Z )
```

The `-σ²/2` correction keeps expected value equal to `S₀·e^(μt)`. Without it,
higher volatility would raise expected returns, which is the opposite of the
lesson the simulator is there to teach.

Each instrument carries a market beta, so one common factor moves everything and
leaves an idiosyncratic remainder. A learner who buys two high beta technology
names sees a portfolio that swings harder than one spread across sectors and
bonds. Everything is seeded, so every learner sees the same market.
