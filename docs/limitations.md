# Limitations

**Model parameters are not fitted.** The knowledge tracing constants are
literature typical defaults and the 44 item difficulties are hand assigned.
A real deployment would fit both from response data, which is where most of the
accuracy would come from.

**Mastery is tracked per track, not per concept.** Four skills is coarse. Real
tutoring systems track dozens of knowledge components, which is what lets a
review target the specific thing a learner forgot rather than the whole track.

**The evidence label is a heuristic.** It counts answers. It is not a
statistical confidence interval, and it says nothing about whether the estimate
beside it is accurate.

**Progress is device local.** No accounts means no sync, and clearing site data
clears progress. It also means the app holds no personal data anywhere.

**The market has no regimes.** Constant drift and volatility produce no crashes,
no volatility clustering and no fat tails. That is adequate for teaching
diversification and wrong for teaching what a drawdown feels like.

**The community feed is written content.** Seeded threads with invented authors,
labeled as such on the page. Replies a learner writes stay on their device.

**Content is US centric and short.** Twenty lessons is an argument for a
curriculum rather than a curriculum.

**Accessibility work is implemented but not automatically checked.** Keyboard
operation, focus management, labeled controls, a skip link and reduced motion
support are in the code. No accessibility check runs in continuous integration
and the app has not been tested with a screen reader.
