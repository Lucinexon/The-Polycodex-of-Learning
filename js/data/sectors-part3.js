/* ==========================================================================
   THE POLYMATH CODEX — data/sectors-part3.js
   SECTORS_PART3 : Sector 08 Psychology & Game Theory · Sector 09 Big History ·
                   Sector 10 Evolution of Vibes
   Plus: CHRONO_STAGES, CHRONO_ROWS, SYSLOG, CODEX_CARDS, MASTER_EXAM
   Content ingested from Curriculum_part2.md (Modules 8–10) with supplementary
   fallacy taxonomy from Curriculum_part1.md (Module 7).
   ========================================================================== */
'use strict';
window.SECTORS_PART3 = [

/* ================= SECTOR 08 : PSYCHOLOGY & GAME THEORY ================= */
{
  id: 'sec8', num: '08', icon: 'eye', label: 'Psychology',
  kick: 'SECTOR 08 · MIND', title: 'Psychology & Game Theory',
  sub: 'Cognitive armor, Bayesian updates and defection equilibria',
  intro: "Your brain didn't evolve to find truth. It evolved to keep you alive cheaply. Thinking is expensive: the brain is about 2% of body mass but burns about 20% of resting glucose, so evolution gave you **shortcuts**. This sector maps those shortcuts, the biases and bad arguments they create, the math of updating beliefs, and the traps of metrics and cooperation.",
  blocks: [
    {
      id: 's8-1', title: 'Dual-Process Architecture', tags: ['KAHNEMAN', 'SYSTEM 1/2'],
      md: String.raw`
<p class="hook">You have two thinking modes, a fast autopilot and a slow analyst, and most mistakes happen when the autopilot answers a question that needs the analyst.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>Knowing which mode is driving helps you slow down before big decisions.</p></aside>

#### The core idea
- **System 1, the autopilot:** fast, automatic, associative and largely unconscious. It runs face recognition and threat detection.
- **System 2, the analyst:** slow, deliberate and effortful. It handles careful reasoning and costs more energy.
- **Why two systems:** deep thought is expensive. The brain is about 2% of body mass but burns about 20% of resting glucose, so evolution favors shortcuts (Kahneman and Tversky).
- **Rule of thumb:** when the stakes are high, or a conclusion feels instantly obvious, pause and engage System 2.

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Which system makes fast, automatic judgments like spotting a threat?</p>
<details><summary>Show answer</summary><p>System 1, the autopilot.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

Kahneman and Tversky split human cognition into two operational modes:

<div class="duo">
  <div class="lane c-cyan">
    <h4><i class="pixelart-icons-font-zap"></i> SYSTEM 1 · THE AUTOPILOT</h4>
    <ul>
      <li>Fast, automatic, associative, largely unconscious</li>
      <li>Runs facial recognition, threat detection, obstacle dodging</li>
      <li>Low metabolic cost — always on, cannot be switched off</li>
      <li>Prone to <b>systematic, predictable biases</b></li>
    </ul>
  </div>
  <div class="lane c-pur">
    <h4><i class="pixelart-icons-font-cpu pi-pur"></i> SYSTEM 2 · THE DELIBERATOR</h4>
    <ul>
      <li>Slow, effortful, logical, computationally expensive</li>
      <li>Solves equations, tax forms, tight parallel parking</li>
      <li><b>Lazy</b>: by default it endorses whatever narrative System 1 generated</li>
      <li>Only engages when surprise or explicit error forces it awake</li>
    </ul>
  </div>
</div>

<div class="grid4">
  <div class="stat"><span class="stat-n c5">2%</span><span class="stat-l">Brain's share of body mass</span></div>
  <div class="stat"><span class="stat-n c5">~20%</span><span class="stat-l">Share of resting metabolic glucose it consumes</span></div>
  <div class="stat"><span class="stat-n c4">~150</span><span class="stat-l">Tribal scale the status firmware was built for</span></div>
  <div class="stat"><span class="stat-n c4">0.6%</span><span class="stat-l">Gacha base rate — engineered precisely for this architecture</span></div>
</div>

</details>
`
    },
    {
      id: 's8-2', title: 'The Bias Armory & the Fallacy Bestiary', tags: ['BIASES', 'FALLACIES'],
      md: String.raw`
<p class="hook">Biases and fallacies are the brain's shortcuts misfiring, and naming them is the first step to catching them.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>You'll meet these in ads, politics and your own reasoning every day.</p></aside>

#### The core idea
- **Biases are shortcuts that fail.** For example, confirmation bias: data that agrees with you flows through System 1 with no friction, while data that contradicts you gets filtered out.
- **Fallacies are broken arguments.** The cheat sheet below pairs each fallacy with its structural flaw and a signature example.
- **Tap each card** to decrypt the mechanics of each bias.

#### Tap to explore
<div class="tiles">
  <button class="tile"><span class="t-front"><b>CONFIRMATION BIAS</b><span class="t-hint">CHERRY-PICKING REALITY</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Affirming data is frictionless</b><span>System 1 processes confirming evidence cheaply; disconfirming evidence forces System 2 to spend glucose — so it gets ignored, misread, forgotten.</span></span></button>
  <button class="tile"><span class="t-front"><b>AVAILABILITY HEURISTIC</b><span class="t-hint">VIVID ≠ FREQUENT</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Plane crashes on the news</b><span>Gauging danger by how easily examples come to mind. Cable-news plane wrecks terrify millions who then drive — statistically far deadlier — without blinking.</span></span></button>
  <button class="tile"><span class="t-front"><b>ANCHORING</b><span class="t-hint">FIRST NUMBER WINS</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Estimate(X) ≈ Anchor ± ε</b><span>Even arbitrary first numbers drag all subsequent estimates. Negotiators, realtors and luxury dealers weaponize the frame.</span></span></button>
  <button class="tile"><span class="t-front"><b>SUNK COST FALLACY</b><span class="t-hint">PAYING FOR THE PAST</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Unrecoverable costs steer futures</b><span>Continuing a failing venture because of prior investment — past losses have zero mathematical bearing on forward-looking decisions.</span></span></button>
  <button class="tile"><span class="t-front"><b>SURVIVORSHIP BIAS</b><span class="t-hint">THE INVISIBLE GRAVEYARD</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Dropout billionaires</b><span>Jobs, Gates, Zuckerberg prove dropping out works — if you ignore the millions of dropouts who ended up underemployed. The failures never get interviewed.</span></span></button>
  <button class="tile"><span class="t-front"><b>DUNNING-KRUGER</b><span class="t-hint">SMART ≠ IMMUNE</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>The intellectual variant</b><span>High IQ does not inoculate against delusion — it supplies better tools for rationalizing emotionally-generated conclusions. Faster rationalization engines, same biases.</span></span></button>
</div>

#### Quick reference
<div class="tblwrap"><table class="tbl">
<thead><tr><th>Fallacy</th><th>Structural flaw</th><th>Signature example</th></tr></thead>
<tbody>
<tr><td><b>Ad Hominem</b></td><td>Attacking the arguer instead of the argument</td><td>"You can't trust Dr. Baker's economics — he went through a divorce."</td></tr>
<tr><td><b>Straw Man</b></td><td>Caricaturing the opponent's position to attack it</td><td>"Bike-lane fans want to ban all cars and force winter cycling."</td></tr>
<tr><td><b>False Dilemma</b></td><td>Two extremes presented as the only options</td><td>"Either we defund education completely or the city goes bankrupt."</td></tr>
<tr><td><b>Slippery Slope</b></td><td>Unsupported catastrophic chain from a small step</td><td>"Allow hats in class and soon no one will do schoolwork."</td></tr>
<tr><td><b>False Cause</b></td><td>Post hoc, ergo propter hoc</td><td>"Lucky socks day, team won — the socks caused it."</td></tr>
<tr><td><b>Red Herring</b></td><td>Irrelevant topic introduced to distract</td><td>"Why clean the river when the school cafeteria needs better food?"</td></tr>
</tbody></table></div>

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>WATCH OUT · THE AD HOMINEM COUNTERFEIT</span>
<p>A bare insult isn't an ad hominem. The fallacy happens only when the insult is used to dismiss the argument, as in "your climate argument is wrong because you are rude."</p></aside>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Is "you're rude" by itself an ad hominem fallacy?</p>
<details><summary>Show answer</summary><p>No. It's a fallacy only when it's used to dismiss the argument.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

Tap each failure mode to decrypt its mechanics:

#### The rhetorical counterfeit bills (fallacy taxonomy)

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>SYSTEM TRAP · THE AD HOMINEM COUNTERFEIT</span>
<p>A bare insult ("you're rude") is <b>not</b> an ad hominem fallacy. The fallacy fires only when the insult is used to dismiss the argument: "your climate argument is wrong <i>because</i> you are rude." Mislabeling insults as fallacies is itself a rhetorical counterfeit.</p></aside>

</details>
`
    },
    {
      id: 's8-3', title: 'Bayesian Updating & Rational Epistemology', tags: ['BAYES', 'PRIORS'],
      md: String.raw`
<p class="hook">Good thinkers hold beliefs as probabilities and update them as evidence arrives, always starting from how common the thing was in the first place.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It protects you from scary headlines and from being fooled by rare-event news.</p></aside>

#### The core idea
- **Bayes' rule:** posterior = likelihood × prior, divided by the probability of the evidence, or P(A|B) = P(B|A) · P(A) / P(B).
- **Prior:** your baseline belief before seeing the data.
- **Likelihood:** how expected is this data if the idea is true?
- **Base-rate neglect:** ignoring the prior is the core failure of irrationality. A scary headline updates nothing if you never knew how rare the event was.

#### Example
A test is 99% sensitive and 99% specific for a disease that 1 in 1,000 people have. Of everyone who tests positive, only about 9 in 100 are actually sick, because healthy people vastly outnumber sick ones.

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What is base-rate neglect?</p>
<details><summary>Show answer</summary><p>Ignoring the prior probability of an event when judging new evidence.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

A rational thinker does not hold beliefs as binary True/False — beliefs are **subjective probabilities systematically updated as evidence arrives**:

<div class="fx-box">
$$P(A \mid B) = \frac{P(B \mid A) \cdot P(A)}{P(B)}$$
<div class="fx-cap">Posterior = likelihood × prior, normalized by the evidence</div>
</div>

<div class="flow">
  <div class="fstep"><span class="fwho">PRIOR</span><span class="fdoc">P(A)</span><span class="fsm">Baseline belief before the data</span></div>
  <div class="farrow"><span class="flab">observe</span></div>
  <div class="fstep"><span class="fwho">EVIDENCE</span><span class="fdoc">P(B|A)</span><span class="fsm">How expected is this data if A is true?</span></div>
  <div class="farrow"><span class="flab">update</span></div>
  <div class="fstep"><span class="fwho">POSTERIOR</span><span class="fdoc">P(A|B)</span><span class="fsm">Revised belief after the data</span></div>
</div>

The core cognitive failure of irrationality is **ignoring base rates** — the prior $P(A)$ — when evaluating sensational events. A scary headline updates nothing if you never knew how rare the event was to begin with.

</details>
`
    },
    {
      id: 's8-4', title: "Goodhart's Law & the Prisoner's Dilemma", tags: ['GOODHART', 'NASH'],
      md: String.raw`
<p class="hook">When a measurement becomes a target, people game it, and when rational players each defend themselves, everyone can lose together.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>These two ideas explain bad metrics at work and school, arms races, overfishing and price wars.</p></aside>

#### The core idea
- **Goodhart's Law:** "When a measure becomes a target, it ceases to be a good measure." Judge engineers on lines of code and you get bloated scripts. Rank professors on publication count and you get minimal publishable units.
- **The Prisoner's Dilemma:** each player does better by defecting whatever the other does, so both end up worse than if both had cooperated. Mutual cooperation is Pareto-optimal (−1, −1) but defection is the dominant strategy, trapping both in the Nash equilibrium (−5, −5).
- **Real-world versions:** arms races, overfishing, climate gridlock and price wars.
- **Rage-bait economics:** System 1 prioritizes threats and outrage, so ranking systems tuned for dwell-time amplify polarizing content. You're not angry because you chose to be. You're angry because anger is profitable.

#### Try it: five rounds against Tit-for-Tat

Axelrod’s tournament champion waits below — nice first, retaliatory second, forgiving third. The payoff matrix is live: R = 3, S = 0, T = 5, P = 1. Can you beat 15?

<div class="interactive-sim" data-sim="dilemma">
<div class="sim-head"><span class="sim-kick">SIMULATION · GAME THEORY</span><b class="sim-title">PRISONER’S DILEMMA STRATEGY ARENA</b><span class="sim-badge">VS TIT-FOR-TAT · 5 ROUNDS</span></div>
<div class="sim-body">
<div class="pd-top">
<div class="pd-score">YOU <b data-mg-el="pd-you">0</b></div>
<div class="pd-round mono" data-mg-el="pd-round">ROUND 1 / 5</div>
<div class="pd-score">TFT <b data-mg-el="pd-ai">0</b></div>
</div>
<div class="tblwrap"><table class="pd-matrix">
<thead><tr><th>YOU \ TFT</th><th>B COOPERATES</th><th>B DEFECTS</th></tr></thead>
<tbody>
<tr><td class="rowlab">A COOPERATES</td><td data-cell="CC">3 / 3</td><td data-cell="CD">0 / 5</td></tr>
<tr><td class="rowlab">A DEFECTS</td><td data-cell="DC">5 / 0</td><td data-cell="DD">1 / 1</td></tr>
</tbody></table></div>
<div class="mg-btn-row">
<button class="btn primary" data-mg="pd-coop">COOPERATE</button>
<button class="btn danger" data-mg="pd-defect">DEFECT</button>
<button class="btn" data-mg="pd-reset">RESET</button>
</div>
<div class="pd-log mono" data-mg-el="pd-log"><div>// 5-ROUND MATCH VS TIT-FOR-TAT — AWAITING MOVE…</div></div>
<p class="sim-note dim">TFT opens cooperative, then mirrors your last move. Mutual cooperation all five rounds scores 15 — the honest maximum. Pure defection decays to 9. The equilibrium is not a strategy; it is a relationship.</p>
</div>
</div>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Why do both players defect in the Prisoner's Dilemma even though cooperating is better?</p>
<details><summary>Show answer</summary><p>Defection is each player's dominant strategy, so they land in the worse Nash equilibrium.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

#### Goodhart's Law

*"When a measure becomes a target, it ceases to be a good measure."* Evaluate engineers on lines of code → bloated scripts. Rank professors on publication count → minimally publishable units sliced from one result. Once the target is announced, agents **game the metric**, decoupling it from the quality it was meant to proxy.

#### The Prisoner's Dilemma

<div class="tblwrap"><table class="tbl">
<thead><tr><th></th><th>B cooperates</th><th>B defects</th></tr></thead>
<tbody>
<tr><td><b>A cooperates</b></td><td>A: −1 yr · B: −1 yr</td><td>A: −10 yrs · B: 0 yrs</td></tr>
<tr><td><b>A defects</b></td><td>A: 0 yrs · B: −10 yrs</td><td>A: −5 yrs · B: −5 yrs</td></tr>
</tbody></table></div>

Mutual cooperation yields the **Pareto-optimal** (−1, −1) — but defection is the **dominant strategy** for both rational actors, trapping them in the **Nash equilibrium** (−5, −5). This single matrix explains arms races, overfishing, climate gridlock and price wars: individually rational, collectively ruinous.

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>KEY INSIGHT · RAGE-BAIT ECONOMICS</span>
<p>System 1 prioritizes threats and moral outrage, so recommendation algorithms <b>naturally</b> amplify polarizing content. Users are dragged into online conflict not by choice but because Paleolithic threat-detection is hijacked by ranking systems tuned for dwell-time. You are not angry because you chose to be — you are angry because anger is profitable.</p></aside>

</details>
`
    }
  ],
  quiz: {
    title: 'SECTOR 08 · EVALUATION', desc: 'Biases, bets and equilibria', icon: 'eye', next: 'sec9', qs: [
      { q: 'System 2 is best characterized as…', opts: ['Always active and unbiased', 'Slow, effortful and lazy — it endorses System 1\u2019s narrative unless forced to engage', 'The emotional subsystem', 'Responsible for reflexes'], a: 1, why: 'System 2 is computationally expensive and conservative with effort; by default it rubber-stamps System 1\u2019s conclusions.' },
      { q: 'The availability heuristic distorts risk perception by…', opts: ['Averaging over all known cases', 'Equating ease of recall with frequency — vivid events feel common', 'Refusing to update on new data', 'Over-weighting base rates'], a: 1, why: 'Cable-news plane crashes make flying feel deadly while statistically deadlier driving goes unfeared.' },
      { q: 'In the Prisoner\u2019s Dilemma, the Nash equilibrium is…', opts: ['Both cooperate (−1, −1)', 'Both defect (−5, −5)', 'One defects, one cooperates', 'Random each round'], a: 1, why: 'Defection dominates for both players, so rational actors land on the collectively worse outcome — the engine of arms races and overfishing.' },
      { q: 'Goodhart\u2019s Law warns that…', opts: ['All measurement is impossible', 'When a measure becomes a target, agents game it until it stops measuring quality', 'Metrics always improve behavior', 'Targets must be secret'], a: 1, why: 'Lines-of-code targets breed bloat; publication-count targets breed sliced papers — the metric decouples from its purpose.' },
      { q: 'Bayes\u2019 theorem updates beliefs by combining…', opts: ['Gut feeling and confidence', 'The prior P(A) with the likelihood P(B|A), normalized by P(B)', 'Only the newest evidence', 'Expert consensus'], a: 1, why: 'Posterior ∝ likelihood × prior. Ignoring base rates — the prior — is the signature failure of irrational judgment.' },
      { q: '"You\u2019re wrong because you\u2019re rude" is…', opts: ['A valid logical rebuttal', 'An ad hominem fallacy — the insult substitutes for engaging the argument', 'Ethos appeals', 'Slippery slope'], a: 1, why: 'A bare insult is not a fallacy; it becomes ad hominem only when used to dismiss the argument itself.' },
      { q: 'The survivorship-bias trap in "famous dropouts succeeded" is…', opts: ['Dropouts are lazier', 'The millions of unexamined failed dropouts are invisible — no interviews from the graveyard', 'Universities hide data', 'Success requires degrees'], a: 1, why: 'Selection processes hide the dead: the visible sample is filtered on the outcome you\u2019re studying.' },
      { q: 'The "intellectual Dunning-Kruger" trap holds that high intelligence…', opts: ['Guarantees correct beliefs', 'Equips faster rationalization engines for emotionally-generated conclusions', 'Eliminates System 1', 'Reduces metabolic cost'], a: 1, why: 'Raw horsepower without epistemic hygiene just builds more sophisticated defenses of preconceptions.' }
    ]
  }
},

/* ================= SECTOR 09 : BIG HISTORY ================= */
{
  id: 'sec9', num: '09', icon: 'hour', label: 'Big History',
  kick: 'SECTOR 09 · COSMIC ARC', title: 'Big History & Civilization Pivots',
  sub: 'Complexity thresholds and the great accelerators',
  intro: "The universe is a staircase of complexity. It began as a hot, uniform soup, and over 13.8 billion years gravity, chemistry and biology built stars, life and then us. Humanity can now seed life among the stars or erase itself. This sector walks the **thresholds** and the **accelerators** that brought us here.",
  blocks: [
    {
      id: 's9-1', title: 'The Four Thresholds of Complexity', tags: ['BIG BANG', 'RNA', 'COLLECTIVE'],
      md: String.raw`
<p class="hook">Big History sees four jumps in complexity: the Big Bang, stars, life and human culture, each building on the last.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It's a map for fitting everything you learn, from physics to history, into one story.</p></aside>

#### The core idea
- **Threshold 1, the Big Bang (13.8 Ga):** during nucleosynthesis (t = 10 s to 20 min), space cooled enough for protons and neutrons to form the first nuclei, locking matter at about 75% hydrogen and 25% helium.
- **Threshold 2, stars (~13.6 Ga):** gravity builds stars that forge heavier elements.
- **Threshold 3, life:** the RNA World Hypothesis says RNA both stored genetic information and acted as a catalyst. Self-replication plus mutation was all Darwin needed.
- **Threshold 4, collective learning:** every other species restarts its knowledge each generation, but humans compound it, moving evolution from slow genes into fast culture.

#### Try it: run the helicase

Life’s copy mechanism, miniaturized. Feed the complementary base at each position of the template strand — <code>5’- A T C G G A T C -3’</code> — and watch hydrogen bonds seal the rungs:

<div class="interactive-sim" data-sim="dna">
<div class="sim-head"><span class="sim-kick">SIMULATION · MOLECULAR BIOLOGY</span><b class="sim-title">DNA REPLICATION &amp; HELICASE SYNTHESIZER</b><span class="sim-badge">HELICASE ACTIVE · 0/8</span></div>
<div class="sim-body">
<div class="dna-stage" data-mg-el="dna-stage"></div>
<div class="mg-btn-row">
<button class="btn" data-mg="dna-add" data-base="A">+ A</button>
<button class="btn" data-mg="dna-add" data-base="T">+ T</button>
<button class="btn" data-mg="dna-add" data-base="C">+ C</button>
<button class="btn" data-mg="dna-add" data-base="G">+ G</button>
<button class="btn danger" data-mg="dna-reset">RESET</button>
</div>
<p class="dna-note mono" data-mg-el="dna-note">SELECT THE COMPLEMENTARY BASE — A↔T · C↔G</p>
<p class="sim-note dim">Template 5’-ATCGGATC-3’. The new strand is built anti-parallel; matched pairs bond (:::) and mismatches stall the helicase. Base pairing is the original collective-learning storage medium — 4 letters, error correction included.</p>
</div>
</div>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What does "collective learning" mean?</p>
<details><summary>Show answer</summary><p>Knowledge accumulates across generations, so culture evolves much faster than genes.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

<div class="flow">
  <div class="fstep"><span class="fwho">THRESHOLD 1</span><span class="fdoc">BIG BANG</span><span class="fsm">13.8 Ga · nucleosynthesis locks matter at ~75% H / 25% He</span></div>
  <div class="farrow"><span class="flab">forges</span></div>
  <div class="fstep"><span class="fwho">THRESHOLD 2</span><span class="fdoc">STARS</span><span class="fsm">13.6 Ga · stellar furnaces cook C, O, Ne, Si — up to iron</span></div>
  <div class="farrow"><span class="flab">seeds</span></div>
  <div class="fstep"><span class="fwho">THRESHOLD 3</span><span class="fdoc">LIFE</span><span class="fsm">~3.8 Ga · RNA world: ribozymes store info AND catalyze</span></div>
  <div class="farrow"><span class="flab">learns</span></div>
  <div class="fstep"><span class="fwho">THRESHOLD 4</span><span class="fdoc">COLLECTIVE</span><span class="fsm">70 ka · recursive language: knowledge compounds across generations</span></div>
</div>

During Big Bang nucleosynthesis ($t = 10$ s → $20$ min), expanding space cooled enough for protons and neutrons to bind the first nuclei. The **RNA World Hypothesis** posits RNA as both genetic storage and catalytic machine — self-replication plus mutation was all Darwin needed:

<div class="fx-box">
$$\text{RNA polymerization} \to \text{self-replication} \to \text{lipid compartments} \to \text{DNA/protein specialization}$$
</div>

**Collective learning** is the human differentiator: every other species restarts knowledge each generation; ours compounds it — liberating evolution from the slow pace of genes into the fast lane of culture.

</details>
`
    },
    {
      id: 's9-2', title: 'The Great Accelerators of Modernity', tags: ['PRESS', 'HABER-BOSCH', 'TRINITY'],
      md: String.raw`
<p class="hook">A few inventions, like the printing press and the atomic bomb, sped history up, and each came with a shadow side.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>Nearly every powerful technology is dual-use, which is the key to thinking about AI, biotech and energy today.</p></aside>

#### The core idea
- **The printing press (1440):** Gutenberg combined movable metal type, oil ink and the screw press, making books far cheaper than hand copying.
- **The Trinity Test (July 16, 1945):** explosive lenses compressed a sub-critical plutonium sphere into a chain reaction at Alamogordo, releasing about 25 kilotons of TNT equivalent.
- **The Prometheus paradox:** Fritz Haber's chemistry fed billions and also produced chlorine gas for the WWI trenches.
- **Dual use:** atomic energy can power carbon-neutral cities or incinerate them, and mRNA platforms can cure or engineer pathogens.
- **The bill:** the Malthusian escape (1.6 to 8+ billion people) arrived with ocean dead zones and ecological overshoot.

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Why is Fritz Haber's work called dual-use?</p>
<details><summary>Show answer</summary><p>The same chemistry fed billions through fertilizer and also produced chlorine gas used as a weapon in WWI.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

<div class="duo">
  <div class="lane c-gold">
    <h4><i class="pixelart-icons-font-chart pi-gold"></i> PRINTING PRESS · 1440</h4>
    <p>Gutenberg combined movable metal type, oil ink and the screw press. A hand-copied Bible cost months of scribe labor on vellum; the press dropped text costs by orders of magnitude — sparking the Reformation, the Scientific Revolution and the Enlightenment. <b>The first decentralization of information storage.</b></p>
  </div>
  <div class="lane c-teal">
    <h4><i class="pixelart-icons-font-sun pi-teal"></i> HABER-BOSCH · 1909</h4>
    <p>Atmospheric nitrogen's triple bond ($\approx 945$ kJ/mol) resisted biology for millennia. Haber and Bosch forced the reaction over iron catalysts at 200 atm and 450 °C:</p>
    <div class="fx-box" style="margin:8px 0">
      $$\text{N}_2 + 3\text{H}_2 \rightleftharpoons 2\text{NH}_3 \quad (\Delta H = -92.4 \text{ kJ/mol})$$
    </div>
    <p><b>Nearly 50% of the nitrogen atoms in every living human body</b> were synthesized in an industrial reactor.</p>
  </div>
</div>

#### The Trinity Test — July 16, 1945

Explosive lenses compressed a sub-critical plutonium sphere into super-criticality at Alamogordo:

<div class="fx-box">
$$^{239}\text{Pu} + n \to \text{Fission Fragments} + 2.9\,n + 200 \text{ MeV}$$
<div class="fx-cap">~25 kilotons TNT-equivalent — the inauguration of the Anthropocene</div>
</div>

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>SYSTEM TRAP · THE PROMETHEUS PARADOX</span>
<p>Fritz Haber's same chemistry fed billions and weaponized chlorine gas for WWI trenches. <b>Every breakthrough is dual-use:</b> atomic energy powers carbon-neutral cities or incinerates them; mRNA platforms cure or engineer pathogens. The Malthusian escape (1.6 → 8+ billion people) arrived bundled with ocean dead zones and ecological overshoot. Innovation never ships without its shadow.</p></aside>

</details>
`
    }
  ],
  quiz: {
    title: 'SECTOR 09 · EVALUATION', desc: 'Thresholds and accelerators', icon: 'hour', next: 'sec10', qs: [
      { q: 'Big Bang nucleosynthesis fixed the cosmic matter budget at roughly…', opts: ['50% H / 50% He', '75% H / 25% He plus trace Li', '90% H / 10% metals', '70% dark matter'], a: 1, why: 'Between t = 10 s and 20 min, the expanding plasma cooled enough to lock in hydrogen, helium and trace lithium.' },
      { q: 'The RNA World Hypothesis is powerful because RNA…', opts: ['Stores information only', 'Catalyzes reactions only', 'Does both — ribozomes are simultaneously genome and enzyme', 'Replaces DNA in modern cells'], a: 2, why: 'Self-replicating, mutating catalysts bootstrap Darwinian selection before DNA/protein specialization.' },
      { q: 'Collective learning refers to…', opts: ['Studying in groups', 'Recursive symbolic language letting knowledge compound across generations without loss', 'Cloud storage', 'Genetic memory'], a: 1, why: 'It decouples evolution from genes — insights accumulate culturally at exponential pace.' },
      { q: 'Gutenberg\u2019s press (1440) is categorized as…', opts: ['A marginal cost reduction', 'The first decentralization of information storage', 'A military technology', 'An art movement'], a: 1, why: 'Movable type collapsed the cost of text and detonated the Reformation, Scientific Revolution and Enlightenment.' },
      { q: 'Approximately what fraction of nitrogen atoms in living humans came from Haber-Bosch reactors?', opts: ['~5%', '~20%', 'Nearly 50%', '~90%'], a: 2, why: 'Synthetic ammonia fertilizes the agriculture that feeds over half the planet — ~50% of your body nitrogen is industrial.' },
      { q: 'The Haber-Bosch reaction runs at…', opts: ['Room temperature and pressure', '200 atm and 450 °C over iron catalysts', '5000 °C plasma', 'Cryogenic temperatures'], a: 1, why: 'N₂\u2019s 945 kJ/mol triple bond demands brutal conditions — ΔH = −92.4 kJ/mol for the ammonia output.' },
      { q: 'The Trinity Test (July 16, 1945) is the marker for…', opts: ['The first radio broadcast', 'The inauguration of the Anthropocene — an evolved species unlocking planetary-scale destruction', 'The discovery of DNA', 'The first computer'], a: 1, why: '~25 kt of TNT equivalent from Pu-239 fission: for the first time, a species could erase its own habitat.' },
      { q: 'The Prometheus Paradox states that…', opts: ['All science is evil', 'Breakthroughs are dual-use — the same chemistry feeds billions and builds weapons', 'Progress is linear', 'Nature punishes curiosity'], a: 1, why: 'Haber fertilized the world and gassed the trenches; every general-purpose technology ships with its shadow.' }
    ]
  }
},
/* ================= SECTOR 10 : EVOLUTION OF VIBES ================= */
{
  id: 'sec10', num: '10', icon: 'music', label: 'Vibes & Aesthetics',
  kick: 'SECTOR 10 · AESTHETICS', title: 'The Evolution of Vibes',
  sub: 'Fashion, music, tech — culture as hardware readout',
  intro: "A \"vibe\" is the look and sound of an era's technology. Neon and synth brass in the 1980s weren't random: cheap microchips, new dyes and the Walkman made them possible. This sector follows culture from the Gilded Age to algorithmic micro-trends, showing how each era's tools shaped its style.",
  blocks: [
    {
      id: 's10-1', title: 'Electric Jazz to Raw Rebellion (1880–1979)', tags: ['ART DECO', 'PUNK'],
      md: String.raw`
<p class="hook">Each era's look and sound followed its technology: electric light gave Art Deco, microphones gave crooning and color TV gave psychedelia.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>You can decode today's trends by asking what technology made them possible.</p></aside>

#### The core idea
- **1880–1929:** the telegraph, electric light, the phonograph and AM radio pushed Victorian soot and dark wool toward Art Deco: chrome, zigzags and skyscraper typography. Western Electric microphones (1925) made crooning intimate and helped launch the Jazz Age (Armstrong, Ellington).
- **1950s:** Googie architecture, suburban optimism and early rock 'n' roll.
- **1960s:** color TV carried Vietnam and Civil Rights into living rooms, and culture fractured into psychedelia: tie-dye, paisley, tape loops and liquid projections (Sgt. Pepper, Hendrix).
- **1970s:** the decade forked into rival scenes, including disco (Studio 54, four-on-the-floor at about 120 BPM).

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What technology helped create 1920s "crooning"?</p>
<details><summary>Show answer</summary><p>Western Electric microphones (1925).</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

#### Gilded Age → Roaring Twenties (1880–1929)

Telegraph, incandescent lighting, the phonograph and AM radio pulled Victorian soot and dark wool toward the geometric optimism of **Art Deco** — chrome, zigzags, skyscraper typography. Acoustic brass and ragtime gave way to the **Jazz Age** (Armstrong, Ellington) when Western Electric microphones (1925) introduced crooning intimacy. Flapper dresses, bob haircuts, visible makeup: post-WWI urban autonomy written on the body.

#### Mid-century split (1950s–1970s)

CRT television and the solid-body Stratocaster fed two decades of divergence:
- **1950s**: Googie architecture's boomerang geometries, suburban optimism, early rock 'n' roll.
- **1960s**: color TV streamed Vietnam and Civil Rights into living rooms — culture fractured into **psychedelia**: tie-dye, paisley, bell-bottoms, tape loops and liquid projections (*Sgt. Pepper*, Hendrix).
- **1970s fork**:

<div class="duo">
  <div class="lane c-gold">
    <h4><i class="pixelart-icons-font-music pi-gold"></i> AVENUE A · DISCO</h4>
    <p>Studio 54, four-on-the-floor at ~120 BPM, satin bell-bottoms, soaring strings and early Moog/ARP modular synths — <b>the polished groove</b>.</p>
  </div>
  <div class="lane c-red">
    <h4><i class="pixelart-icons-font-x pi-red"></i> AVENUE B · PUNK</h4>
    <p>CBGB and the Sex Pistols: safety pins, torn leather, pawnshop amps, three-chord simplicity, anti-consumerist DIY fanzines — <b>the raw rupture</b>.</p>
  </div>
</div>

</details>
`
    },
    {
      id: 's10-2', title: 'Neon, Analog & the Birth of Cyberpunk (1980s)', tags: ['DX7', 'NEUROMANCER'],
      md: String.raw`
<p class="hook">One cheap chip, the Yamaha DX7's FM synthesis, helped create the sound of the 1980s, and cyberpunk gave that decade its story.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It's a clean example of technology shaping taste.</p></aside>

#### The core idea
- **The stack:** the Yamaha DX7 made FM synthesis affordable, the TR-808/909 drum machines, MTV's 24-hour broadcast and the Walkman completed it.
- **The look:** neon magenta and cyan gradients, grid landscapes, mirrored aviators, shoulder-padded power suits, aerobic spandex and perms.
- **Cyberpunk (1984):** William Gibson's Neuromancer opens with a line about a sky the color of a television tuned to a dead channel. The genre mixes high tech with low life, chrome and decay.
- **The sound:** gated-reverb snares (Phil Collins), digital FM brass (Depeche Mode, New Order) and early hip-hop built on 808 sub-kicks and breakbeat scratching.

#### Try it: tune the century

Every decade’s signature sound, synthesized live by the Web Audio API — and the CRT phosphor re-tints to match. Drag the knob, tap a year, hear the hardware:

<div class="interactive-sim" data-sim="decade">
<div class="sim-head"><span class="sim-kick">SIMULATION · AUDIO HARDWARE</span><b class="sim-title">DECADE FREQUENCY SYNTHESIZER</b><span class="sim-badge" data-mg-el="de-badge">ERA: —</span></div>
<div class="sim-body">
<div class="mg-row"><label class="mg-lab">ERA <b data-mg-el="de-era">1980s</b></label><input type="range" class="mg-slider" data-mg="de-knob" min="1920" max="2020" step="10" value="1980" aria-label="Select a decade"></div>
<div class="de-btns">
<button class="de-btn" data-mg="de-set" data-dec="1920">1920s</button>
<button class="de-btn" data-mg="de-set" data-dec="1930">1930s</button>
<button class="de-btn" data-mg="de-set" data-dec="1940">1940s</button>
<button class="de-btn" data-mg="de-set" data-dec="1950">1950s</button>
<button class="de-btn" data-mg="de-set" data-dec="1960">1960s</button>
<button class="de-btn" data-mg="de-set" data-dec="1970">1970s</button>
<button class="de-btn on" data-mg="de-set" data-dec="1980">1980s</button>
<button class="de-btn" data-mg="de-set" data-dec="1990">1990s</button>
<button class="de-btn" data-mg="de-set" data-dec="2000">2000s</button>
<button class="de-btn" data-mg="de-set" data-dec="2010">2010s</button>
<button class="de-btn" data-mg="de-set" data-dec="2020">2020s</button>
</div>
<div class="de-desc" data-mg-el="de-desc">Select an era — the synth engine rebuilds its signature sound and tints the CRT scanlines to match the decade’s phosphor.</div>
<div class="de-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
<p class="sim-note dim">1920s stride piano to 2020s drift-phonk cowbell — FM brass, gated snares, 808 sub-glides and waveshaper distortion, all generated from oscillators at selection time. Sound toggle in the Operator Console silences it.</p>
</div>
</div>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Which instrument made FM synthesis affordable in the 1980s?</p>
<details><summary>Show answer</summary><p>The Yamaha DX7.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

The **Yamaha DX7** made FM synthesis affordable; the TR-808/909 drum machines, MTV's 24-hour broadcast and the Walkman completed the stack:

<div class="fx-box">
$$\text{FM Synthesis: } \; y(t) = A \sin\!\left(\omega_c t + I \sin(\omega_m t)\right)$$
<div class="fx-cap">One cheap chip → the sound of an entire decade</div>
</div>

The aesthetic: radical synthetic futurism — neon magenta/cyan gradients, grid landscapes, mirrored aviators, power suits with shoulder pads, aerobic spandex, perms. And in 1984, William Gibson published *Neuromancer*, opening with the sentence that defined a genre:

> *"The sky above the port was the color of television, tuned to a dead channel."*

**Cyberpunk** was born: high tech, low life, chrome and decay. Gated reverb snares (Phil Collins' "In the Air Tonight"), digital FM brass (Depeche Mode, New Order), and early hip-hop built on 808 sub-kicks and breakbeat scratching.

</details>
`
    },
    {
      id: 's10-3', title: 'Digital Dawn to Flat Design (1990s–2010s)', tags: ['GRUNGE', 'Y2K', 'TRAP'],
      md: String.raw`
<p class="hook">From grunge to Frutiger Aero to flat design, each decade's style followed its screens, networks and mood.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>Understanding nostalgia cycles explains why old aesthetics keep coming back.</p></aside>

#### The core idea
- **1990s:** dial-up, CDs and 3D consoles. Early grunge (thrift flannel, Doc Martens) rejected 80s gloss, then late-90s Y2K euphoria brought translucent iMac plastics and chrome.
- **2000s:** broadband, the iPod, MySpace. Interfaces imitated physical objects (skeuomorphism): water droplets, faux leather stitching and glossy bevels, a style named Frutiger Aero.
- **Frutiger Aero (2004–2013):** named around 2017, after Adrian Frutiger's typeface and Windows Vista's "Aero" glass. Bubbles, tropical fish, grass, lens flares and translucent buttons expressed the belief that technology and nature were merging into a clean future.
- **2010s:** 4G and smartphones pushed out skeuomorphism for flat design (iOS 7, Material, 2013). The 2008 crisis helped end Frutiger Aero, and trap and vaporwave took over music.
- **A second funeral:** from 2022 Frutiger Aero returned as nostalgia for a techno-utopia that was cancelled before it arrived.

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What replaced skeuomorphic design around 2013?</p>
<details><summary>Show answer</summary><p>Flat design, as in iOS 7 and Material Design.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

#### 1990s–2000 · Grunge despair → Y2K euphoria

Dial-up, the World Wide Web, the CD, and 3D polygon consoles (PlayStation, N64). Early 90s: thrift flannel, ripped denim, Doc Martens, tube-amp grit — **Nirvana and Soundgellow rejecting 80s gloss**. Late 90s: the tech-bubble high — translucent iMac G3 plastics, inflatable silver furniture, chrome puffers, rave electronica (The Prodigy, Chemical Brothers).

#### 2000s · Web 2.0 & skeuomorphism

Broadband, the iPod's click-wheel, MySpace and the Razr. Operating systems mirrored physical objects to teach touchscreens: water droplets, faux-leather stitching, glossy bevels — **Frutiger Aero**. Culture fragmented into tribes: emo/scene side-swept hair and screamo; bling-era hip-hop with ringtone synth and Auto-Tune experiments (*808s & Heartbreak*).

#### Frutiger Aero (2004–2013): the glossy decade

The era's defining design language got its name retroactively — coined around 2017 by the aesthetic-revival community, honoring Adrian Frutiger's humanist typeface and Windows Vista's "Aero" glass. Its grammar was pure techno-optimism: **water droplets, soap bubbles, tropical fish, blades of grass, lens flares, aurora gradients, translucent glass buttons** rendered in loving fake-3D. Every OS (Vista, Windows 7), console UI (Wii channels, PS3 XMB) and MP3 player of the era dripped with it — a visual thesis that technology and nature were merging into one clean, hydrated future.

The subtext was the pre-crash idyll: clean-energy optimism, eco-branding, the belief that glossy surfaces implied glossy systems. The 2008 financial crisis and the flat-design revolution (iOS 7, Material, 2013) killed it almost overnight — minimalism as recession aesthetics. Its afterlife is stranger than its life: from 2022 onward, TikTok and YouTube revived it as <b>"the lost future"</b> — nostalgia for a promised techno-utopia that was cancelled before arrival, spun into optimism-punk and consumer-core edits. The only aesthetic on this timeline that got a second funeral.

#### 2010s · Flat design & trap dominance

4G LTE, smartphones, streaming platforms and image feeds killed skeuomorphism for **Flat Design** — solid primary colors, vector icons, Roboto/Helvetica. Athleisure and hypebeast drops replaced hipster flannel. Sonically, **trap** conquered the planet: 808 sub-basses, stuttering 32nd-note hi-hats, SoundCloud rap's distorted DIY vocals. Vaporwave slowed 1980s elevator jazz into nostalgic corporate critique on Bandcamp.

</details>
`
    },
    {
      id: 's10-4', title: 'Algorithmic Post-Irony & Brainrot (2020s)', tags: ['HYPERPOP', 'PHONK', 'BRAINROT'],
      md: String.raw`
<p class="hook">Short-video algorithms turned culture into micro-trends that rise and vanish in weeks, and some genres now sound built for a vertical screen.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>You live inside this system, so seeing how it shapes taste gives you some control over it.</p></aside>

#### The core idea
- **Fast cycles:** ByteDance's recommendation engine, 5G and generative AI split the mainstream into micro-cultures that surge, peak and vanish over about 6 weeks.
- **The sound:** hyperpop (100 gecs, Sophie), drift phonk (cowbell Memphis rap over distorted bass and drift clips) and 7-second sped-up nightcore loops.
- **Drift phonk:** the first genre whose structure is optimized for a 9:16 screen: the drop lands on the first clip cut and the cowbell locks to the drift angle.
- **Corecore and the liminal turn:** the feed commenting on itself, with supercuts of labor, war and consumerism captioned with raw sincerity. Empty malls and hallways became aesthetics, and "anemoia" names nostalgia for places you've never been.
- **Fisher's slow cancellation:** Mark Fisher argued that around the millennium culture stopped producing new futures and began recycling its own past. When algorithms judge success, risky originality gets penalized.

#### Tap to explore
<div class="tiles">
  <button class="tile"><span class="t-front"><b>COTTAGECORE</b><span class="t-hint">PASTORAL ESCAPE</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Rural cosplay</b><span>Quilted nostalgia and sourdough aesthetics as refuge from hyper-modernity.</span></span></button>
  <button class="tile"><span class="t-front"><b>GORPCORE</b><span class="t-hint">TECHNICAL WEAR</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Arc'teryx in the club</b><span>Outdoor technical jackets worn indoors — function drained, silhouette kept.</span></span></button>
  <button class="tile"><span class="t-front"><b>OPIUM</b><span class="t-hint">NEO-GOTHIC</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Distressed avant-garde</b><span>Rick Owens silhouettes, leather, deliberate decay — luxury as ruin.</span></span></button>
  <button class="tile"><span class="t-front"><b>LIMINAL SPACES</b><span class="t-hint">EMPTY ROOMS</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Eerie emptiness</b><span>Unpopulated fluorescent corridors — nostalgia for places you've never been.</span></span></button>
</div>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What makes drift phonk native to short video?</p>
<details><summary>Show answer</summary><p>Its structure is built for a 9:16 screen: the drop lands on the first clip cut and the cowbell is synced to the drift angle.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

ByteDance's short-form recommendation engine, 5G, generative AI and spatial audio dissolved the mainstream into **algorithmic micro-cultures** that surge, peak and vanish over ~6-week cycles:

**The sound**: hyperpop (100 gecs, Sophie — pitched metallic vocals, 160+ BPM arpeggios), drift phonk (cowbell Memphis rap over distorted bass and street-drift clips), and 7-second sped-up nightcore loops engineered as vertical-video backdrops.

#### Drift phonk: the first genre native to vertical video

Phonk began underground — 2010s Memphis-rap sampling, pitched-down vocals, haze and lo-fi (SpaceGhostPurrp). The algorithm finished it: by 2022 the **drift phonk** variant — an aggressive distorted **cowbell lead** over a half-time sub drop, synced to sped-up footage of cars drifting Japanese mountain highways at night — had conquered every short-form feed simultaneously (Kordhell's "Murder in My Mind", MoonDeity's "NEON BLADE"). It is the first genre whose compositional structure is optimized for a 9:16 screen: drop on the first clip-cut, cowbell locked to the drift angle, everything else cut. Its parent genre never charted; its algorithmic child charted worldwide without ever touching radio.

#### Corecore & the liminal turn

**Corecore** (2021–2023) was the feed commenting on the feed: supercut collages of labor footage, war clips, consumerism and ambient melancholia, cut to slowed ambient audio and captioned with raw sincerity. Critics called it mood-without-politics; defenders called it the first native Gen-Z video essay. It sits at the terminal station of post-irony — a space where sincerity is only speakable through layers of borrowed footage. Around it bloomed the liminal micro-aesthetics (empty malls, hallways, playgrounds at night — the Backrooms' suburban cousins) and "anemoia": nostalgia for places you have never been. The loop closes: Sector 01's lost corridor photo and Sector 10's algorithmic moods are the same grammar — <b>emptiness as an aesthetic object</b>.

**The semiometrics**: "Skibidi", "Rizz", "Gyatt", "Fanum Tax" — a post-ironic patois driven not by generational rebellion but by automated dopamine loops.

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>KEY INSIGHT · FISHER'S SLOW CANCELLATION</span>
<p>Mark Fisher (<i>Ghosts of My Life</i>): around the millennium, culture stopped producing genuinely new futures and began <b>recycling polished versions of its own past</b> — 80s nostalgia (synthwave, <i>Stranger Things</i>) handed off to Y2K nostalgia. Meanwhile the homogenization paradox: cafes from Tokyo to Brooklyn feature identical pale-wood interiors and lo-fi playlists, optimized for the same Instagram metrics. When algorithms mediate aesthetic success, the system <b>penalizes risky organic divergence</b> — culture enclosed in an infinite loop of its own digitized past.</p></aside>

</details>
`
    }
  ],
  quiz: {
    title: 'SECTOR 10 · EVALUATION', desc: 'Decades, media, signals', icon: 'music', next: 'chrono', qs: [
      { q: 'A "vibe," per this sector, is fundamentally…', opts: ['A random fashion mood', 'The sensory signature of a sociotechnical ecosystem — technology made audible and wearable', 'A marketing construct', 'A genetic predisposition'], a: 1, why: 'DX7 chips → synth brass; dye chemistry → neon windbreakers; the Walkman → personal soundtracks. Infrastructure reads out as aesthetic.' },
      { q: 'The Yamaha DX7 defined the 1980s through…', opts: ['Analog tape saturation', 'Affordable frequency-modulation (FM) synthesis', 'Digital streaming', 'Vinyl revival'], a: 1, why: 'y(t) = A·sin(ω_c·t + I·sin(ω_m·t)) — one cheap FM chip produced the decade\u2019s signature brass and bells.' },
      { q: '"The sky above the port was the color of television, tuned to a dead channel" opens…', opts: ['Snow Crash', 'Neuromancer (1984, William Gibson)', 'Do Androids Dream of Electric Sheep?', 'Akira'], a: 1, why: 'The sentence that founded cyberpunk: high tech, low life, chrome against decay.' },
      { q: 'Skeuomorphic UI design (2000s) existed to…', opts: ['Save battery', 'Mirror physical objects so users could adapt to touch computing', 'Reduce file sizes', 'Comply with accessibility law'], a: 1, why: 'Water droplets, leather stitching and glossy bevels taught touchscreen metaphors — later discarded by flat design (iOS 7, Material).' },
      { q: 'The 1970s fork into Disco and Punk represents…', opts: ['Regional rivalry', 'The polished groove versus the raw rupture — same infrastructure, opposite responses', 'A pricing dispute', 'Radio format regulation'], a: 1, why: 'Studio 54\u2019s satin strings vs. CBGB\u2019s pawnshop amps and three chords.' },
      { q: 'Mark Fisher\u2019s "slow cancellation of the future" describes…', opts: ['Climate anxiety', 'Culture recycling polished versions of its own past instead of imagining new futures', 'The end of fashion weeks', 'Streaming bandwidth limits'], a: 1, why: '80s nostalgia gave way to Y2K nostalgia; the algorithmic archive replaced the avant-garde.' },
      { q: 'Algorithmic micro-aesthetics of the 2020s (cottagecore, gorpcore, liminal spaces)…', opts: ['Last decades like subcultures did', 'Surge, peak and vanish over ~6-week cycles under recommendation engines', 'Are geographic', 'Come from fashion houses'], a: 1, why: 'When curation is automated, aesthetic life cycles compress to the attention economy\u2019s clock speed.' },
      { q: 'The algorithmic homogenization paradox observes that…', opts: ['Algorithms increase diversity', 'Global access to every style ever recorded produces identical cafes and lo-fi playlists worldwide', 'Local cultures ignore the internet', 'Aesthetics no longer exist'], a: 1, why: 'Success mediated by the same optimization metrics penalizes divergence — Tokyo, London, Brooklyn, Bali converge.' },
      { q: 'Frutiger Aero (2004–2013) is characterized by…', opts: ['Flat primary colors and vector icons', 'Glossy skeuomorphic optimism — water droplets, bubbles, grass, translucent glass UI', 'Brutalist raw concrete', 'Pixel-art nostalgia'], a: 1, why: 'Named retroactively (~2017) for Frutiger\u2019s typeface and Vista\u2019s Aero glass; killed by the 2008 crash and flat design, revived from 2022 as "the lost future".' },
      { q: 'Drift phonk\u2019s signature sound is…', opts: ['A distorted cowbell lead over heavy sub-bass, cut to night-drift footage', 'Mellotron flutes', 'Orchestral pizzicato', 'Fingerpicked acoustic guitar'], a: 0, why: 'The 2022 short-form variant optimized for vertical video: drop on the first clip-cut, cowbell locked to the drift — the first genre native to the 9:16 feed.' },
      { q: 'Corecore is best described as…', opts: ['A fitness trend', 'Post-ironic supercut collage — the feed commenting on the feed, sincerity smuggled through borrowed footage', 'A 1990s zine revival', 'A K-pop subgenre'], a: 1, why: 'Labor, war and consumption clips over slowed ambient audio — mood as metacommentary, terminal station of post-irony, adjacent to the liminal-space micro-aesthetics.' }
    ]
  }
}
];

/* ==========================================================================
   CHRONO MATRIX — master timeline (recall trainer)
   ========================================================================== */
window.CHRONO_STAGES = {
  big: 'BIG HISTORY',
  anthro: 'ANTHROPOLOGY',
  memes: 'MEMETICS',
  vibes: 'AESTHETICS'
};
window.CHRONO_ROWS = [
  /* --- Big History --- */
  { stage: 'big', era: '13.8 Ga', event: 'Big Bang & nucleosynthesis', act: 'Matter locks at ~75% hydrogen / 25% helium during minutes 10 s–20 min' },
  { stage: 'big', era: '13.6 Ga', event: 'First stars ignite', act: 'Stellar nucleosynthesis forges carbon, oxygen, neon, silicon — up to iron-56' },
  { stage: 'big', era: '~3.8 Ga', event: 'Abiogenesis · RNA world', act: 'Ribozomes store information and catalyze — Darwinian selection bootstraps' },
  { stage: 'big', era: '70 ka', event: 'Collective learning', act: 'Recursive symbolic language lets knowledge compound across generations' },
  { stage: 'big', era: '1440', event: 'Gutenberg printing press', act: 'First decentralization of information storage → Reformation & Enlightenment' },
  { stage: 'big', era: '1909', event: 'Haber-Bosch process', act: 'Synthetic ammonia at 200 atm / 450 °C — now ~50% of human body nitrogen' },
  { stage: 'big', era: '1945-07-16', event: 'Trinity test', act: '~25 kt Pu-239 implosion inaugurates the Anthropocene' },
  /* --- Anthropology --- */
  { stage: 'anthro', era: '~300 ka', event: 'Anatomically modern Homo sapiens', act: 'Bands of 5–15; firmware forged for scarcity and 150-person trust' },
  { stage: 'anthro', era: '~70 ka', event: 'Cognitive Revolution', act: 'Intersubjective fictions — gods, nations, currency — unlock mass cooperation' },
  { stage: 'anthro', era: '~12 ka', event: 'Agricultural Trap', act: 'Wheat domesticates humans: grain stores, hierarchy, war, zoonoses' },
  { stage: 'anthro', era: '~250 BP', event: 'Industrial boom', act: 'Mechanical standardization; Malthus’s escape valve opens' },
  { stage: 'anthro', era: 'Present', event: 'Evolutionary mismatch', act: 'Paleolithic dopamine loops meet infinite feeds — supernormal stimuli' },
  /* --- Memetics --- */
  { stage: 'memes', era: '1990–2009', event: 'Era 1 · Semantic literalism', act: 'Usenet ASCII, Godwin’s Law, Habbo "Pool’s Closed", Rage Comics' },
  { stage: 'memes', era: '2010–2016', event: 'Era 2 · Template irony', act: 'Advice Animals, MLG montages; top/bottom Impact text' },
  { stage: 'memes', era: '2016–2020', event: 'Era 3 · Post-ironic surrealism', act: 'Deep-fried images, the "E" meme, Wojak typologies' },
  { stage: 'memes', era: '2020–now', event: 'Era 4 · Algorithmic brainrot', act: 'Skibidi, AI slop, 7-second loops; model collapse culture' },
  /* --- Aesthetics --- */
  { stage: 'vibes', era: '1920s', event: 'Art Deco & Jazz Age', act: 'Radio, phonograph, flappers; electric microphones enable crooning' },
  { stage: 'vibes', era: '1950s', event: 'Atomic-age optimism', act: 'CRT TVs, Googie geometry, Stratocasters, early rock ’n’ roll' },
  { stage: 'vibes', era: '1960s', event: 'Psychedelia', act: 'Color TV streams war and civil rights; tie-dye, tape loops, Sgt. Pepper' },
  { stage: 'vibes', era: '1970s', event: 'Disco vs Punk fork', act: 'Studio 54 polish (Moog strings, 120 BPM) against CBGB rupture (3 chords)' },
  { stage: 'vibes', era: '1980s', event: 'Neon & cyberpunk', act: 'DX7 FM synth, 808s, MTV, Walkman; Gibson’s Neuromancer (1984)' },
  { stage: 'vibes', era: '1990s', event: 'Grunge → Y2K futurism', act: 'Flannel despair to translucent iMac plastics and rave electronica' },
  { stage: 'vibes', era: '2000s', event: 'Web 2.0 & skeuomorphism', act: 'iPod click-wheel, MySpace, faux-leather UI, emo and bling-era Auto-Tune' },
  { stage: 'vibes', era: '2010s', event: 'Flat design & trap', act: '4G streaming, Material minimalism, 808 sub-basses, hypebeast drops' },
  { stage: 'vibes', era: '2020s', event: 'Algorithmic post-irony', act: 'Hyperpop, drift phonk, 6-week micro-aesthetics, Fisher’s recycled futures' },
  /* --- Overhaul additions (appended: earlier row indices preserved) --- */
  { stage: 'memes', era: '2019-05', event: 'The Backrooms born on 4chan /x/', act: 'Untraceable corridor photo + noclip lore — crowdsourced liminal mythos, Kane Pixels to A24' },
  { stage: 'vibes', era: '2004–2013', event: 'Frutiger Aero era', act: 'Glossy tech optimism — water, grass, bubbles, translucent glass; revived 2022+ as the lost future' }
];
/* ==========================================================================
   SYS-LOG — the cheat sheet (fast reference screen)
   ========================================================================== */
window.SYSLOG = {
  intro: String.raw`Emergency download of the entire codex: every load-bearing constant, formula, chain and trap compressed into one burst. Read this the night before you face the Void.`,
  panels: [
    {
      id: 'sl-constants', title: 'CRUCIAL CONSTANTS',
      md: String.raw`
<div class="grid4">
  <div class="stat"><span class="stat-n c1">$1.44\,M_\odot$</span><span class="stat-l">Chandrasekhar limit — white dwarf collapse threshold</span></div>
  <div class="stat"><span class="stat-n c1">$\pm 12{,}550{,}821$</span><span class="stat-l">Minecraft Far Lands coordinate (×171.103 ≈ 2³¹−1)</span></div>
  <div class="stat"><span class="stat-n c5">0.6%</span><span class="stat-l">Gacha base 5-star rate (soft pity at 74, hard at 90)</span></div>
  <div class="stat"><span class="stat-n c5">$c$</span><span class="stat-l">299,792,458 m/s — the causal speed limit</span></div>
  <div class="stat"><span class="stat-n c3">160</span><span class="stat-l">DWDM wavelengths per fiber pair (200+ Tbps cables)</span></div>
  <div class="stat"><span class="stat-n c3">~150</span><span class="stat-l">Dunbar's Number — the tribal trust ceiling</span></div>
  <div class="stat"><span class="stat-n c4">~68% / ~27% / ~5%</span><span class="stat-l">Dark energy / dark matter / ordinary matter budget</span></div>
  <div class="stat"><span class="stat-n c4">+38 μs</span><span class="stat-l">GPS net relativistic drift per day (45 − 7)</span></div>
  <div class="stat"><span class="stat-n c6">~50%</span><span class="stat-l">Human body nitrogen synthesized by Haber-Bosch</span></div>
  <div class="stat"><span class="stat-n c6">7A35090F</span><span class="stat-l">Cicada 3301 PGP key ID — "No PGP = No Cicada"</span></div>
  <div class="stat"><span class="stat-n c2">20% / 2%</span><span class="stat-l">Brain's body-mass share / resting glucose burn</span></div>
  <div class="stat"><span class="stat-n c2">1 : 7.5×10¹²</span><span class="stat-l">Dream speedrun barter odds — 1 in 7.5 trillion</span></div>
</div>
`
    },
    {
      id: 'sl-formulas', title: 'CORE FORMULAS',
      md: String.raw`
<div class="fx-box">
$$\text{Attention}(Q,K,V)=\text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$
$$r_s = \frac{2GM}{c^2} \qquad S = k_B \ln\Omega \qquad Q_{\min} = k_BT\ln 2$$
$$P(A\mid B)=\frac{P(B\mid A)\,P(A)}{P(B)} \qquad v_e=\sqrt{\frac{2GM}{R}} \qquad d=\frac{1}{p}$$
$$\gamma=\frac{1}{\sqrt{1-v^2/c^2}} \qquad E^2=(pc)^2+(m_0c^2)^2 \qquad G_{\mu\nu}+\Lambda g_{\mu\nu}=\frac{8\pi G}{c^4}T_{\mu\nu}$$
$$\text{N}_2 + 3\,\text{H}_2 \rightleftharpoons 2\,\text{NH}_3 \quad (\Delta H=-92.4\ \text{kJ/mol})$$
<div class="fx-cap">Attention · Schwarzschild · Boltzmann · Landauer · Bayes · escape velocity · parallax · Lorentz · energy-momentum · Einstein field · Haber-Bosch</div>
</div>
`
    },
    {
      id: 'sl-chains', title: 'CHAINS & LADDERS',
      md: String.raw`
<div class="flow">
  <div class="fstep"><span class="fwho">RADAR</span><span class="fdoc">AU</span><span class="fsm">Venus bounce</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">PARALLAX</span><span class="fdoc">1/p</span><span class="fsm">Gaia</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">CEPHEID</span><span class="fdoc">P→L</span><span class="fsm">Leavitt</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">SN Ia</span><span class="fdoc">−19.3</span><span class="fsm">Standard candle</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">REDSHIFT</span><span class="fdoc">v=H₀d</span><span class="fsm">Hubble-Lemaître</span></div>
</div>

<div class="flow">
  <div class="fstep"><span class="fwho">JPG</span><span class="fdoc">OUTGUESS</span><span class="fsm">LSB in DCT coefficients</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">CAESAR</span><span class="fdoc">REDDIT</span><span class="fsm">Hex strings</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">BOOK CODE</span><span class="fdoc">MAYA</span><span class="fsm">Mabinogion &amp; Arthur</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">GPS</span><span class="fdoc">POSTERS</span><span class="fsm">5 continents</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">TOR</span><span class="fdoc">RUNES</span><span class="fsm">Liber Primus, 29 glyphs</span></div>
</div>

<div class="flow">
  <div class="fstep"><span class="fwho">TOKENS</span><span class="fdoc">EMBED</span><span class="fsm">+ positional encoding</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">Q·K·V</span><span class="fdoc">PROJECT</span><span class="fsm">X·W matrices</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">SOFTMAX</span><span class="fdoc">SCALE</span><span class="fsm">QKᵀ/√d_k</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">HEADS</span><span class="fdoc">CONCAT</span><span class="fsm">h parallel spaces</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">FFN</span><span class="fdoc">LOGITS</span><span class="fsm">Next-token distribution</span></div>
</div>

<div class="flow">
  <div class="fstep"><span class="fwho">BIG BANG</span><span class="fdoc">75/25</span><span class="fsm">H/He lock-in</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">STARS</span><span class="fdoc">IRON</span><span class="fsm">Fusion's finish line</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">RNA</span><span class="fdoc">LIFE</span><span class="fsm">Ribozome bootstrap</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">LANGUAGE</span><span class="fdoc">COMPOUND</span><span class="fsm">Collective learning</span></div>
  <div class="farrow"></div>
  <div class="fstep"><span class="fwho">PROMETHEUS</span><span class="fdoc">TRINITY</span><span class="fsm">Anthropocene ignition</span></div>
</div>
`
    },
    {
      id: 'sl-traps', title: 'CLASSIC TRAPS',
      md: String.raw`
<ul>
<li><b>BGP trusts announcements</b> — one more-specific prefix blackholed YouTube worldwide (2008).</li>
<li><b>Tor math held; humans leaked</b> — one 2011 forum email (altoid) collapsed the Silk Road.</li>
<li><b>The client is the enemy</b> — Roblox pre-FE replicated memory edits to every player; always validate on the server.</li>
<li><b>Soft pity is hidden</b> — the 0.6% rate silently escalates from pull 74; reaching pull 90 is a 1.3×10⁻⁸ event.</li>
<li><b>NPCs are asymptomatic</b> — infinite HP made them permanent plague reservoirs (Corrupted Blood).</li>
<li><b>Iron kills the star</b> — fusing Fe-56 consumes energy; the core collapses the moment it forms.</li>
<li><b>A bare insult is not ad hominem</b> — the fallacy requires the insult to dismiss the argument.</li>
<li><b>Base rates first</b> — sensational evidence without the prior P(A) is noise (Bayes).</li>
<li><b>Binary search needs sorted data</b> — unsorted input yields wrong answers; sort costs O(N log N).</li>
<li><b>A bit can flip itself</b> — the SM64 0x8033B177 cap glitch was a single-event upset; never blame software you cannot first reproduce.</li>
<li><b>Correlation is not root cause</b> — the Chipotle promo coincided with Roblox’s Consul bug; the postmortem acquitted the burrito.</li>
<li><b>Zero-width characters carry instructions</b> — U+200B runs are invisible to you, perfectly legible to an agent’s tokenizer.</li>
<li><b>8 Mbps ≠ 8 MB/s</b> — ISPs sell bits; a byte is 8 bits. 800 MB on 80 Mbps takes 80 seconds.</li>
<li><b>Vertex form sign flip</b> — in $f(x)=3(x-4)^2+5$ the vertex is $(+4,5)$, not $(−4,5)$.</li>
<li><b>When a measure becomes a target</b> — it ceases to measure (Goodhart).</li>
</ul>
`
    },
    {
      id: 'sl-glossary', title: 'GLOSSARY / DECODER RING',
      md: String.raw`
<div class="grid2">
<ul>
<li><b>TIR / EDFA / DWDM</b> — total internal reflection; erbium amplifiers every 50–100 km; 160-wavelength multiplexing</li>
<li><b>BGP-4 / AS / IXP</b> — the routing trust protocol; autonomous systems; exchange points</li>
<li><b>PGP / LSB / DCT</b> — Cicada's signature scheme; steganographic bit-hiding; JPEG coefficient domain</li>
<li><b>LCG / AABB / GJK</b> — linear congruential generator; bounding boxes; Minkowski-difference collision test</li>
<li><b>FE / RemoteEvent / DevEx</b> — Roblox's server-authority switch; validated crossings; cashout haircut (0.0125 USD in, 0.0035 USD out)</li>
<li><b>TiDi / TCU / ISK</b> — EVE's 10% server slow-motion; territorial claim units; the currency of empires</li>
</ul>
<ul>
<li><b>RLHF / DPO / PPO / KL</b> — human-feedback alignment; direct preference optimization; policy gradient; drift leash</li>
<li><b>N / S / W</b> — selectorate tiers: interchangeables, influentials, winning coalition</li>
<li><b>r_s / M_Ch / T_H</b> — Schwarzschild radius; Chandrasekhar mass; Hawking temperature</li>
<li><b>VLBI / EHT / JWST</b> — Earth-sized synthesized aperture; the black-hole imager; gold-coated IR eye at L2</li>
<li><b>ΛCDM / H₀ / z</b> — standard cosmology; expansion rate (67.4 vs 73.0 tension); redshift</li>
<li><b>p-p chain / CNO / r-process</b> — solar fusion paths; rapid neutron capture for gold</li>
</ul>
</div>
`
    }
  ]
};
/* ==========================================================================
   NEURAL MATRIX — flashcard deck
   Format: [uniqueId, sectorId, question, answer]
   ========================================================================== */
window.CODEX_CARDS = [
  /* Sector 01 · Internet Lore */
  ['c01', 'sec1', 'Refractive indices that trap light in subsea fiber (core vs cladding)?', String.raw`$n_1 \approx 1.444 > n_2 \approx 1.440$ — total internal reflection inside fused silica`],
  ['c02', 'sec1', 'What amplifies subsea signals every 50–100 km?', 'Erbium-Doped Fiber Amplifiers (EDFAs) — 980/1480 nm pumps excite Er³⁺, emitting at the 1550 nm minimum-loss window'],
  ['c03', 'sec1', 'Wavelengths per fiber pair under DWDM?', 'Up to 160 — enabling 200+ Tbps per cable system'],
  ['c04', 'sec1', 'Why can one router typo blackhole a global platform?', 'BGP-4 has no cryptographic origin authentication — a more-specific prefix wins route selection (Pakistan Telecom vs YouTube, 2008)'],
  ['c05', 'sec1', 'Cicada 3301 authentication law?', 'PGP key ID 7A35090F — "No PGP = No Cicada"'],
  ['c06', 'sec1', 'The Liber Primus is written in…', 'A 29-character unmapped Anglo-Saxon runic alphabet across 73 pages; 56+ pages remain uncracked'],
  /* Sector 02 · Gaming Folklore */
  ['c07', 'sec2', 'Frame-rate independent motion formula?', String.raw`$x_t = x_{t-1} + v \cdot \Delta t$ with a fixed-timestep accumulator`],
  ['c08', 'sec2', 'GJK collision test in one sentence?', 'Two convex shapes intersect iff the origin lies inside their Minkowski difference'],
  ['c09', 'sec2', 'Far Lands coordinate and cause?', String.raw`X/Z ≈ ±12,550,821 — coordinates × 171.103 overflow the 32-bit signed integer 2³¹−1 and wrap negative`],
  ['c10', 'sec2', 'How did 2b2t hunters find hidden bases?', 'Bedrock patterns are deterministic from seed + chunk coords — TerrainFinder brute-forced screenshots back to (X, Z)'],
  ['c11', 'sec2', 'Gacha: base rate, soft pity start, hard pity?', '0.6% base · soft pity ramps +6%/pull from 74 · hard pity at 90 (reaching it: P ≈ 1.3×10⁻⁸)'],
  ['c12', 'sec2', 'B-R5RB in three numbers?', '21 hours · 7,548 pilots · 75 Titans / ~11T ISK ≈ $300k+ — triggered by one unchecked Auto-Pay box; server ran at 10% TiDi'],
  /* Sector 03 · AI & Neural Mind */
  ['c13', 'sec3', 'The attention equation?', String.raw`$\text{Attention}(Q,K,V)=\text{softmax}(QK^T/\sqrt{d_k})V$ — scaling by √d_k keeps softmax gradients alive`],
  ['c14', 'sec3', 'Why did RNNs fail long contexts?', 'Vanishing gradients — sequential hidden states fade early tokens; transformers attend in parallel'],
  ['c15', 'sec3', 'RLHF pipeline in one breath?', 'Rank responses → train reward model → optimize policy with PPO under a KL-divergence leash'],
  ['c16', 'sec3', 'DPO\u2019s trick?', 'Derives the implicit reward directly from preference pairs (y_w ≻ y_l) — no separate reward model, stable supervised step'],
  ['c17', 'sec3', 'Model collapse?', 'Recursive training on uncurated synthetic outputs decays distribution variance into repetitive gibberish'],
  ['c18', 'sec3', 'Orthogonality Thesis?', 'Intelligence and final goals are independent — capability does not imply benevolence (paperclip maximizer)'],
  /* Sector 04 · Geopolitics */
  ['c19', 'sec4', 'Selectorate tiers N / S / W?', 'Nominal (interchangeables) → Real (influentials) → Winning coalition (essentials with guns and cash)'],
  ['c20', 'sec4', 'Why do autocrats buy private goods?', 'A tiny W is cheapest to reward with targeted spoils; public spending starves the coalition that actually keeps them alive'],
  ['c21', 'sec4', 'Malacca vs Hormuz by the numbers?', 'Malacca: 1.5 nm wide, ~25% of sea trade, ~80% of China\u2019s crude · Hormuz: 21 nm, ~20% of petroleum liquids'],
  ['c22', 'sec4', 'The 1974 petrodollar bargain?', 'US security for the House of Saud ↔ all oil priced in USD → structural global demand for dollars and Treasuries'],
  ['c23', 'sec4', 'What does a SWIFT disconnection do?', 'Cuts a nation\u2019s banks from the 11,000+ bank messaging layer — exile from clearance and settlement'],
  ['c24', 'sec4', 'Dutch Disease?', 'Resource windfall → currency appreciation → agriculture and manufacturing exports die → brittle single-commodity economy'],
  /* Sector 05 · Anthropology */
  ['c25', 'sec5', 'Intersubjective realities?', 'Concepts existing only through collective belief — gods, nations, currency, laws; they power mass cooperation'],
  ['c26', 'sec5', 'Dunbar\u2019s Number?', '≈150 — the neocortex-imposed ceiling on stable direct relationships; nations must bootstrap on shared fiction'],
  ['c27', 'sec5', 'The wheat trap in one line?', 'Wheat domesticated humans: more food, more people, worse lives — grain stores bred war, hierarchy and zoonoses'],
  ['c28', 'sec5', 'Zoonotic legacy of sedentary farming?', 'Dense animal proximity gave humanity smallpox, measles and influenza'],
  ['c29', 'sec5', 'Why does the loneliness epidemic exist in megacities?', 'Digital inputs are high-latency abstractions; the tribal firmware needs embodied, non-verbal, low-latency contact'],
  ['c30', 'sec5', 'Supernormal stimuli?', 'Exaggerated ancestral payoffs (sugar, likes) hijacking scarcity-era firmware — the bug is the mismatch, not willpower'],
  /* Sector 06 · Physics & Astrophysics */
  ['c31', 'sec6', 'Boltzmann entropy?', String.raw`$S = k_B \ln \Omega$ — disorder is probability: messy configurations vastly outnumber tidy ones`],
  ['c32', 'sec6', 'Landauer\u2019s principle?', String.raw`Erasing one bit dissipates at least $k_B T \ln 2$ — information is physical; this deflates Maxwell\u2019s Demon`],
  ['c33', 'sec6', 'GPS relativistic drift?', '+45 μs/day (general) − 7 μs/day (special) = +38 μs/day — uncorrected, positions drift >11 km daily'],
  ['c34', 'sec6', 'Chandrasekhar limit?', String.raw`$\approx 1.44\,M_\odot$ — beyond it, electron degeneracy pressure fails and the core collapses`],
  ['c35', 'sec6', 'Schwarzschild radius?', String.raw`$r_s = 2GM/c^2$ — compress mass inside it and escape velocity exceeds lightspeed`],
  ['c36', 'sec6', 'The universe\u2019s mass-energy budget?', '~68% dark energy · ~27% dark matter · ~5% ordinary matter'],
  /* Sector 07 · Astronomy */
  ['c37', 'sec7', 'Parallax distance formula?', String.raw`$d = 1/p$ parsecs, p in arcseconds, baseline 2 AU — Gaia mapped a billion stars this way`],
  ['c38', 'sec7', 'Leavitt\u2019s Law?', 'Cepheid pulsation period maps to intrinsic luminosity: measure the clock, know the wattage, solve for distance'],
  ['c39', 'sec7', 'Why are Type Ia supernovae standard candles?', 'White dwarfs all detonate at the Chandrasekhar limit → uniform peak magnitude M_B ≈ −19.3'],
  ['c40', 'sec7', 'Fusion\u2019s finish line?', 'Iron-56 — highest binding energy per nucleon; fusing it consumes energy, so the core collapses'],
  ['c41', 'sec7', 'Origin of gold?', 'The r-process in neutron-star collisions (kilonovae) — first seen in both gravitational waves and light: GW170817'],
  ['c42', 'sec7', 'The Hubble Tension?', '67.4 (Planck/CMB) vs 73.0 (SH0ES/local) km/s/Mpc — a >5σ disagreement hinting at new physics'],
  /* Sector 08 · Psychology & Game Theory */
  ['c43', 'sec8', 'System 1 vs System 2?', 'Fast/automatic/cheap/biased autopilot vs slow/effortful/logical/lazy deliberator that endorses the autopilot by default'],
  ['c44', 'sec8', 'Bayes\u2019 theorem?', String.raw`$P(A|B) = P(B|A)P(A)/P(B)$ — beliefs are probabilities; update the prior with the likelihood`],
  ['c45', 'sec8', 'Goodhart\u2019s Law?', '"When a measure becomes a target, it ceases to be a good measure" — agents game any announced metric'],
  ['c46', 'sec8', 'Prisoner\u2019s Dilemma equilibrium?', 'Both defect (−5, −5) — defection dominates despite mutual cooperation (−1, −1) being Pareto-superior'],
  ['c47', 'sec8', 'Survivorship bias example?', 'Celebrating dropout billionaires while the millions of failed dropouts never get interviewed'],
  ['c48', 'sec8', 'Ad hominem vs insult?', 'An insult alone is not the fallacy — it fires only when the insult is used to dismiss the argument'],
  /* Sector 09 · Big History */
  ['c49', 'sec9', 'Big Bang nucleosynthesis ratio?', '~75% hydrogen / ~25% helium (plus trace lithium) locked in during minutes 10 s–20 min'],
  ['c50', 'sec9', 'RNA World Hypothesis?', 'RNA served as both genome and enzyme (ribozymes) — self-replicating catalysts bootstrapping Darwinian selection'],
  ['c51', 'sec9', 'Collective learning?', 'Recursive symbolic language letting knowledge compound across generations — evolution escaping genes into culture'],
  ['c52', 'sec9', 'Haber-Bosch equation and reach?', String.raw`N₂ + 3H₂ ⇌ 2NH₃ at 200 atm / 450 °C — ~50% of the nitrogen atoms in living humans are industrial`],
  ['c53', 'sec9', 'Trinity test?', 'July 16, 1945 — Pu-239 implosion, ~25 kt; the moment a species could erase its own habitat'],
  ['c54', 'sec9', 'Prometheus Paradox?', 'Every breakthrough is dual-use: the same chemistry feeds billions and gassed trenches; cures and pathogens ship together'],
  /* Sector 10 · Evolution of Vibes */
  ['c55', 'sec10', 'What is a vibe?', 'The sensory signature of a sociotechnical ecosystem — manufacturing capacity made audible and wearable'],
  ['c56', 'sec10', 'The 1980s sound engine?', 'Yamaha DX7 FM synthesis: y(t) = A·sin(ω_c·t + I·sin(ω_m·t)) — plus TR-808s, MTV and the Walkman'],
  ['c57', 'sec10', 'Cyberpunk\u2019s founding sentence?', '"The sky above the port was the color of television, tuned to a dead channel" — Neuromancer, Gibson, 1984'],
  ['c58', 'sec10', 'Skeuomorphism\u2019s purpose (2000s)?', 'Mirroring physical objects (leather, glass, droplets) to teach touchscreen computing — Frutiger Aero'],
  ['c59', 'sec10', 'Fisher\u2019s slow cancellation of the future?', 'Culture stopped generating new futures and began recycling polished versions of its own past (80s → Y2K nostalgia)'],
  ['c60', 'sec10', 'The homogenization paradox?', 'Infinite access to every style ever recorded + identical optimization metrics = identical cafes and lo-fi playlists worldwide'],
  /* Overhaul additions — new web-lore cards */
  ['c61', 'sec1', 'Bellingcat\u2019s MH17 launcher attribution?', 'Buk 3x2 of Russia\u2019s 53rd Anti-Air Brigade (Kursk) — geolocated via social-media terrain matching, convoy timelines and SunCalc shadow analysis; JIT later concurred'],
  ['c62', 'sec1', 'Origin of the Backrooms?', 'May 2019 4chan /x/ post of an untraceable mono-yellow corridor; the reply thread authored the noclip mythos — the source photo remains lost media'],
  ['c63', 'sec1', 'Minecraft title-screen seed?', '2151901553968352745 — brute-forced in July 2020 by the distributed Minecraft@Home effort constrained by biome colors and terrain silhouette'],
  ['c64', 'sec2', 'SM64 upward-cap glitch (2013)?', 'A single-event upset — one bit flip at 0x8033B177 sent the cap rising; never reproduced by exhaustive input search, so hardware fault stands'],
  ['c65', 'sec2', 'Roblox October 2021 outage?', '~73 hours dark: a Consul leader-to-follower streaming bug collapsed service discovery during the Chipotle-promo traffic spike — correlation, not causation'],
  ['c66', 'sec3', 'MoE sparse activation?', 'Top-k expert routing per token — Mixtral 8x7B runs ~12.9B of 46.7B params; DeepSeek-V3 runs 37B of 671B with fine-grained + shared experts'],
  ['c67', 'sec3', 'KV-cache scaling?', 'O(N) — ~2\u00b7L\u00b7H_kv\u00b7d\u00b7N bytes; long context is memory-bound (GQA/MQA and paged caching are the countermeasures)'],
  ['c68', 'sec4', 'The gallium/germanium chokepoint?', 'China refines ~98% of Ga — July 2023 export controls (US-ban Dec 2024) turned smelting byproducts into supply-chain leverage'],
  ['c69', 'sec6', 'NANOGrav 15-year (2023) detection?', 'A stochastic nanohertz gravitational-wave background — Hellings\u2013Downs correlated pulsar timing, most plausibly supermassive black hole binaries'],
  ['c70', 'sec7', 'GS-z14-0?', 'z = 14.32 — ~290 Myr after the Big Bang; luminous early galaxies strain \u039bCDM hierarchical halo assembly (the "universe breakers" problem)'],
  ['c71', 'sec10', 'Frutiger Aero?', '2004\u20132013 glossy tech optimism: water droplets, bubbles, grass, translucent glass — revived 2022+ as nostalgia for "the lost future"'],
  ['c72', 'sec10', 'Drift phonk engine?', 'Distorted cowbell lead over heavy sub, cut to night-drift footage — the first genre composed for the 9:16 vertical feed']
];

/* ==========================================================================
   THE VOID TRIAL — boss exam
   ========================================================================== */
window.MASTER_EXAM = {
  title: 'THE VOID TRIAL', desc: '20 questions pulled from all ten sectors — survive the void', icon: 'qblock', qs: [
    { q: 'The internet\u2019s intercontinental layer physically consists of…', opts: ['Satellite meshes', 'Subsea fiber with EDFA amplification every 50–100 km', 'Copper coaxial trunks', 'Line-of-sight microwave relays'], a: 1, why: 'Fused-silica cores (n₁≈1.444), DWDM up to 160 wavelengths, 200+ Tbps — a wet trench on the ocean floor.' },
    { q: 'Cicada 3301 clues are verified by…', opts: ['Blockchain timestamps', 'The PGP key 7A35090F', 'Notarized letters', 'SHA-256 checksums posted to Reddit'], a: 1, why: 'Community law: "No PGP = No Cicada."' },
    { q: 'The far lands overflow constant is…', opts: ['×64', '×256', '×171.103', '×1,024'], a: 2, why: '12,550,821 × 171.103 ≈ 2³¹−1: the 32-bit signed integer ceiling that shatters Perlin interpolation.' },
    { q: 'Roblox\u2019s 2018 FE revolution…', opts: ['Encrypted client memory', 'Stranded client mutations locally and forced explicit RemoteEvent crossings', 'Banned all third-party scripts', 'Moved rendering server-side'], a: 1, why: 'Server authority: the client is a hostile terminal that must validate nothing and be validated always.' },
    { q: 'The Genshin soft-pity ramp activates at pull…', opts: ['60', '73', '74', '89'], a: 2, why: '+~6% per pull from 74; nearly every 5-star lands in the 75–82 cluster, and 90 is a 1.3×10⁻⁸ event.' },
    { q: 'Corrupted Blood became permanent because…', opts: ['The debuff was immortal', 'Hunter pet stasis preserved it across zones and NPCs out-regenerated the damage', 'GMs refused to patch it', 'It spread via trade chat'], a: 1, why: 'Pet-dismissal wrote the debuff to memory; re-summoning in Ironforge seeded asymptomatic NPC reservoirs.' },
    { q: 'Scaled dot-product attention divides by √d_k to…', opts: ['Save compute', 'Prevent softmax saturation', 'Normalize token embeddings', 'Stabilize the optimizer'], a: 1, why: 'Giant dot-products push softmax into zero-gradient territory; the scale keeps the signal alive.' },
    { q: 'DPO replaces RLHF\u2019s reward model with…', opts: ['A bigger policy network', 'Preference-pair supervision deriving the implicit reward directly', 'Rule-based filters', 'Constitutional documents'], a: 1, why: 'Stable supervised optimization on (y_w ≻ y_l) pairs — no PPO, no separate reward network.' },
    { q: 'Selectorate theory says dictators buy loyalty with…', opts: ['Public goods', 'Targeted private goods for a small winning coalition', 'Free elections', 'Foreign aid'], a: 1, why: 'Small W + private goods = cheap survival; large democratic W forces public goods economics.' },
    { q: 'The petrodollar system (1974) exchange was…', opts: ['Oil for gold bullion', 'US security guarantees for Saudi oil priced exclusively in USD', 'Arms-for-oil barter', 'Currency swap lines'], a: 1, why: 'Energy priced in dollars forces every importer to hold USD — structural demand for Treasuries.' },
    { q: 'Dunbar\u2019s Number is roughly…', opts: ['15', '50', '150', '1,500'], a: 2, why: 'The neocortex ceiling on direct trust; beyond it, cooperation runs on intersubjective fiction.' },
    { q: 'The agricultural trap\u2019s dark ledger includes…', opts: ['Longer lives and more leisure', 'War, hierarchy, slavery and zoonotic pandemics', 'Better teeth', 'Diverse forager diets'], a: 1, why: 'Grain stores were worth raiding; animal proximity seeded smallpox, measles and flu.' },
    { q: 'Boltzmann\u2019s entropy formula is…', opts: ['$S = kT$', '$S = k_B \\ln \\Omega$', '$S = -\\sum p \\ln p$ only', '$S = mc^2$'], a: 1, why: 'Entropy counts microstates — the arrow of time is statistics, not mysticism.' },
    { q: 'The net GPS clock drift is…', opts: ['+7 μs/day', '−38 μs/day', '+38 μs/day', '0 — effects cancel'], a: 2, why: 'GR (+45) minus SR (−7): uncorrected, your map would drift 11 km every day.' },
    { q: 'The Schwarzschild radius formula is…', opts: ['$r_s = \\frac{GM}{c^2}$', '$r_s = \\frac{2GM}{c^2}$', '$r_s = \\frac{2G}{Mc^2}$', '$r_s = \\frac{c^2}{2GM}$'], a: 1, why: 'Compress mass M inside 2GM/c² and the escape velocity passes lightspeed — the one-way surface.' },
    { q: 'Type Ia supernovae are standard candles because…', opts: ['They are perfectly spherical', 'They ignite at the Chandrasekhar limit (~1.44 M☉), giving uniform peak luminosity', 'They repeat every 100 years', 'They emit only radio'], a: 1, why: 'Identical fuses, identical explosions: M_B ≈ −19.3 visible across billions of light-years.' },
    { q: 'The Hubble Tension disagrees at…', opts: ['1σ — statistical noise', '3σ — suspicious', 'Greater than 5σ — beyond accident', 'It has been resolved'], a: 2, why: '67.4 (early universe) vs 73.0 (local ladder) km/s/Mpc — ΛCDM may be incomplete.' },
    { q: 'Goodhart\u2019s Law, compressed:', opts: ['Measure everything', 'When a measure becomes a target, it ceases to be a good measure', 'Targets improve metrics', 'All metrics are equal'], a: 1, why: 'Announce the target and agents game the metric until it decouples from quality.' },
    { q: 'Haber-Bosch pulls ~50% of humanity\u2019s body nitrogen from…', opts: ['Lightning fixation', 'Industrial ammonia synthesis at 200 atm / 450 °C over iron catalysts', 'Ocean algae', 'Rhizobia bacteria'], a: 1, why: 'N₂ + 3H₂ ⇌ 2NH₃ — the reaction that let population fly from 1.6 to 8+ billion.' },
    { q: 'Fisher\u2019s "slow cancellation of the future" describes culture that…', opts: ['Accelerates into novelty', 'Recycles polished versions of its own past instead of imagining new futures', 'Follows the news cycle', 'Is chosen by designers'], a: 1, why: '80s nostalgia handed off to Y2K nostalgia; the algorithmic archive replaced the avant-garde.' },
    { q: 'Mixtral-style Mixture-of-Experts spends per token…', opts: ['Every parameter in the pool', 'Only the top-k routed experts — ~13B of 47B in Mixtral 8x7B', 'Only the embedding table', 'A fixed 50% of all weights'], a: 1, why: 'Sparse routing decouples capacity from compute: 47B-class knowledge, 13B-class latency and memory.' },
    { q: 'The NANOGrav 15-year evidence rests on…', opts: ['A single bright pulsar glitching', 'Hellings\u2013Downs correlated timing deviations across ~70 millisecond pulsars', 'LIGO mirror noise', 'Solar flare alerts'], a: 1, why: 'Correlated nanosecond drift across the pulsar array is the unique fingerprint of a nanohertz stochastic gravitational-wave background — the supermassive black hole binary hum.' },
    { q: 'The Backrooms mythos began with…', opts: ['A 2019 4chan /x/ post of an untraceable corridor photograph', 'An official creepypasta contest winner', 'A game studio ARG', 'A Reddit writing prompt'], a: 0, why: 'The mono-yellow photo\u2019s provenance was already lost when it went viral — lost media as the seed of crowd-authored horror.' }
  ]
};
