---
from: proposit-app
---

# Operator queue offers the conclusion premise and omits restriction premises



Found while verifying the review-verdicts two-axes work. Two disagreements
between `buildOperatorQueue` and the design it implements.

1. **The conclusion premise is offered a decision.** The design is explicit that
   it is never strikable — striking it would delete the thing being proven. The
   engine already guards this (a `rejected` assignment on the conclusion premise
   strikes nothing; pinned by `proposit-core`'s "never strikes the conclusion
   premise or a derivation premise"), so this is a UX defect rather than a
   correctness hole: a reader can record a decision that silently does nothing.
2. **Restriction premises are never offered**, though the design's decision-target
   rule says they use the same rule. The queue is `listSupportingPremises()`
   (inference-rooted only) plus the conclusion. A restriction can still receive a
   decision through the contradiction alert's exit, so the two paths disagree
   about what is decidable.

The server slice declined to fork the rule locally, because header and wizard
would then disagree. Fix it here or decide the design should change.
