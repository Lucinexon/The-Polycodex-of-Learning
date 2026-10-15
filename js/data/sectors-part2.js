/* ==========================================================================
   THE POLYMATH CODEX — data/sectors-part2.js
   SECTORS_PART2 : Sector 04 Geopolitics · Sector 05 Anthropology ·
                   Sector 06 Physics & Astrophysics · Sector 07 Astronomy
   Content ingested from Curriculum_part2.md (Modules 4–7).
   ========================================================================== */
'use strict';
window.SECTORS_PART2 = [

/* ================= SECTOR 04 : GEOPOLITICS ================= */
{
  id: 'sec4', num: '04', icon: 'building', label: 'Geopolitics',
  kick: 'SECTOR 04 · POWER', title: 'Politics, Power & Geopolitics',
  sub: 'Selectorate math, chokepoints and weaponized money',
  intro: "Politics runs on one question: who keeps the ruler in power? Usually it's a small group with **guns, cash and logistics**. This sector treats power like engineering: who must be paid, which sea lanes matter, and how money becomes a weapon.",
  blocks: [
    {
      id: 's4-1', title: 'Selectorate Theory: The Power Taxonomy', tags: ['N/S/W', 'DICTATORSHIP'],
      md: String.raw`
<p class="hook">Every government has three circles: everyone, the people who count, and the few who truly decide, and a ruler survives by keeping the smallest circle happy.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It explains why some leaders spend on public goods and others on loyal insiders, and why many dictatorships last.</p></aside>

#### The core idea
- **Three sets** (Bueno de Mesquita and Smith, The Dictator's Handbook): the nominal selectorate N (the "Interchangeables", such as registered voters), the real selectorate S (the "Influentials") and the winning coalition W (the "Essentials" a ruler can't lose).
- **Autocracies:** W is tiny compared with N, so rulers survive by giving targeted private rewards to a few Essentials.
- **Democracies:** W is large, so rulers do better by providing public goods that help many people.
- **The Mineral Paradox:** when wealth comes straight out of the ground, rulers don't need productive, educated citizens for tax revenue. They pay a small military coalition and ignore everyone else, so resource-rich dictatorships rarely democratize.

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>In an autocracy, which group is tiny: W or N?</p>
<details><summary>Show answer</summary><p>W, the winning coalition, is tiny relative to N.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

Bruce Bueno de Mesquita and Alastair Smith (*The Dictator's Handbook*) model every sovereign state through three nested demographic sets:

<div class="flow">
  <div class="fstep"><span class="fwho">[N]</span><span class="fdoc">NOMINAL</span><span class="fsm">The Interchangeables — registered voters / party members</span></div>
  <div class="farrow"><span class="flab">selects</span></div>
  <div class="fstep"><span class="fwho">[S]</span><span class="fdoc">REAL</span><span class="fsm">The Influentials — party elites, donors, oligarchs</span></div>
  <div class="farrow"><span class="flab">sustains</span></div>
  <div class="fstep"><span class="fwho">[W]</span><span class="fdoc">WINNING</span><span class="fsm">The Essentials — generals, key ministers, mercenaries</span></div>
</div>

<div class="duo">
  <div class="lane c-red">
    <h4><i class="pixelart-icons-font-lock pi-red"></i> AUTOCRATIC ADVANTAGE</h4>
    <p>$W$ is tiny relative to $N$. Survival means rewarding the Essentials with targeted <b>private goods</b>: tax exemptions, offshore assets, mining monopolies. Roads, schools and hospitals are an existential <b>waste</b> of finite revenue that could be buying generals.</p>
  </div>
  <div class="lane c-teal">
    <h4><i class="pixelart-icons-font-user pi-teal"></i> DEMOCRATIC TRAP</h4>
    <p>$W$ is massive — millions of voters. You cannot bribe millions individually; it is mathematically cheaper to distribute <b>public goods</b>: universal infrastructure, healthcare, legal protections. A democrat who starves public goods is voted out.</p>
  </div>
</div>

<div class="fx-box">
$$\text{Ruler Survival Mandate:} \quad R \ge W \times P_{\text{private}} + (N - W) \times P_{\text{public}}$$
<div class="fx-cap">Pay the coalition that keeps you alive, first</div>
</div>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>KEY INSIGHT · THE MINERAL PARADOX</span>
<p>Resource-rich dictatorships rarely democratize. When wealth bubbles straight out of the ground, rulers do not need productive, educated citizens to generate tax revenue — the population shifts from a productive resource into an administrative liability. Extract commodities, pay the small military coalition, ignore everyone else.</p></aside>

</details>
`
    },
    {
      id: 's4-2', title: 'Strategic Maritime Chokepoints', tags: ['MALACCA', 'HORMUZ', 'TSMC'],
      md: String.raw`
<p class="hook">Most of the world's goods and fuel squeeze through a few narrow sea lanes, so closing one can shake the whole economy.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>Fuel prices, product delays and many conflicts trace back to these straits.</p></aside>

#### The core idea
- **Malacca:** a blockade would paralyze industrial supply chains within weeks.
- **Hormuz:** any anti-ship missile or mine campaign shocks global energy markets.
- **Bab-el-Mandeb:** Houthi attacks force container ships around the Cape of Good Hope, spiking fuel burn and wrecking schedules.
- **Why it matters:** despite digital finance, civilization still runs on bulk shipping funneled through a handful of absurdly narrow waterways.

#### Try it: close the arteries yourself

Five toggles, one planetary circulatory system. Flip blockades and watch the model recompute the Brent index, container schedule slip and reroute bunker burn in real time — the leverage you just read about, made tactile:

<div class="interactive-sim" data-sim="chokepoint">
<div class="sim-head"><span class="sim-kick">SIMULATION · SUPPLY LINES</span><b class="sim-title">MARITIME CHOKEPOINT DISRUPTION CONSOLE</b><span class="sim-badge">GLOBAL GRID STABLE</span></div>
<div class="sim-body">
<div class="ck-grid">
<button class="ck-strait" data-mg="ck-toggle" data-strait="malacca"><b>MALACCA</b><span>25% container · 23% oil · 1.5 nm at Phillips Channel</span></button>
<button class="ck-strait" data-mg="ck-toggle" data-strait="hormuz"><b>HORMUZ</b><span>20% petroleum liquids + LNG · 21 nm wide</span></button>
<button class="ck-strait" data-mg="ck-toggle" data-strait="suez"><b>SUEZ</b><span>12% global trade · canal + SUMED pipeline</span></button>
<button class="ck-strait" data-mg="ck-toggle" data-strait="bab"><b>BAB-EL-MANDEB</b><span>12% container · Gate of Tears, Red Sea approach</span></button>
<button class="ck-strait" data-mg="ck-toggle" data-strait="taiwan"><b>TAIWAN STRAIT</b><span>~50% of container traffic in range · sub-10 nm chips</span></button>
</div>
<div class="ck-reads">
<div class="ck-read"><b data-mg-el="ck-oil">$80</b><span>BRENT INDEX</span></div>
<div class="ck-read"><b data-mg-el="ck-delay">0 DAYS</b><span>CONTAINER DELAY</span></div>
<div class="ck-read"><b data-mg-el="ck-fuel">+0%</b><span>REROUTE FUEL BURN</span></div>
</div>
<div class="ck-status mono" data-mg-el="ck-status">ALL STRAITS GREEN — SEABORNE TRADE NOMINAL</div>
<p class="sim-note dim">Simplified additive model for play — real routing re-optimizes nonlinearly (Cape reroutes add ~10–14 days per vessel and bunker burn climbs with every extra nautical mile). Try Hormuz alone, then everything at once.</p>
</div>
</div>

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>WATCH OUT · WEAPONIZED INTERDEPENDENCE</span>
<p>The 1990s "End of History" idea said trade would make war obsolete. Instead, globalization concentrated supply chains into leverage points, like TSMC's advanced chips in Hsinchu, close to the Taiwan Strait.</p></aside>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Why can one narrow strait shock the world economy?</p>
<details><summary>Show answer</summary><p>Huge shares of bulk shipping and energy pass through it, so closing it forces delays, reroutes and price spikes.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

Despite digital finance, civilization still runs on bulk maritime transport — funneled through a handful of absurdly narrow waterways.

<div class="grid4">
  <div class="stat"><span class="stat-n c1">1.5 nm</span><span class="stat-l"><i class="pixelart-icons-font-globe"></i> Malacca's narrowest width — 25%+ of global sea trade, ~80% of China-bound crude</span></div>
  <div class="stat"><span class="stat-n c1">21 nm</span><span class="stat-l">Strait of Hormuz — ~20% of global petroleum liquids</span></div>
  <div class="stat"><span class="stat-n c3">10–14 days</span><span class="stat-l">Diversion cost around the Cape when Suez/Bab-el-Mandeb is threatened</span></div>
  <div class="stat"><span class="stat-n c3">~50%</span><span class="stat-l">Global container traffic passing near Taiwan — plus sub-10nm foundry chips</span></div>
</div>

A blockade at **Malacca** paralyzes industrial supply chains within weeks. Any anti-ship missile or mine campaign at **Hormuz** shocks global energy markets. Houthi campaigns at **Bab-el-Mandeb** force container ships around the Cape of Good Hope — spiking bunker-fuel burn and shredding schedules.

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>SYSTEM TRAP · WEAPONIZED INTERDEPENDENCE</span>
<p>The 1990s "End of History" narrative promised that interconnected trade would make war obsolete. Instead, globalization <b>concentrated</b> supply chains into leverage points — TSMC's advanced nodes sit in Hsinchu, directly in the crosshairs of the Taiwan Strait. Trade did not neutralize conflict; it armed the network's own topology.</p></aside>

</details>
`
    },
    {
      id: 's4-3', title: 'Money as Statecraft', tags: ['PETRODOLLAR', 'SWIFT', 'DUTCH DISEASE'],
      md: String.raw`
<p class="hook">The dollar system isn't just money: it's a tool that can be switched off, and countries can be cut off from it.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>News about sanctions, oil prices and "de-dollarization" makes sense once you see the plumbing.</p></aside>

#### The core idea
- **Petrodollar (1974):** after Bretton Woods collapsed, the US and Saudi Arabia struck a bargain: America guarantees the security of the House of Saud, and all global oil exports are priced in US dollars. Importers must therefore hold dollar reserves, which creates structural demand for US Treasury debt.
- **SWIFT:** the network that carries messages between 11,000+ banks. Cutting a country off (Iran, Russia) blocks international payments while its infrastructure stays standing.
- **Dutch Disease:** a big resource discovery raises the currency's value, which hurts farms and factory exports and leaves a brittle single-commodity economy.

#### Tap to explore
<div class="tiles">
  <button class="tile"><span class="t-front"><b>PETRODOLLAR</b><span class="t-hint">1974</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Oil priced in USD</b><span>Security for the House of Saud ↔ structural global demand for dollars and Treasuries.</span></span></button>
  <button class="tile"><span class="t-front"><b>SWIFT BAN</b><span class="t-hint">FINANCIAL EXILE</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>11,000+ banks</b><span>Removal from the messaging network isolates a state from clearance and settlement — the sanctions lever of first resort.</span></span></button>
  <button class="tile"><span class="t-front"><b>DUTCH DISEASE</b><span class="t-hint">RESOURCE CURSE</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Strong currency, weak nation</b><span>Resource windfalls appreciate the currency and hollow out every other export sector — prosperity that eats its own foundations.</span></span></button>
</div>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What is the 1974 petrodollar bargain?</p>
<details><summary>Show answer</summary><p>The US guarantees Saudi security and oil is priced in dollars, so importers need dollar reserves.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

The post-WWII order runs on financial architecture that doubles as weaponry.

#### The petrodollar framework (1974)

After Bretton Woods collapsed, the US and Saudi Arabia struck the grand bargain: America guarantees the security of the House of Saud; in exchange, **all global oil exports are priced in USD**. Every energy-importing nation must therefore hold deep dollar reserves — manufacturing artificial structural demand for US Treasury debt.

#### The SWIFT lever

The Society for Worldwide Interbank Financial Telecommunication routes messaging between 11,000+ banks. Disconnecting a nation from SWIFT (Iran, Russia) cuts it off from international clearance and trade settlement — a monetary neutron bomb that leaves infrastructure standing but the economy sterile.

#### Dutch Disease

A massive resource discovery (oil, gas) appreciates the currency, gutting domestic agriculture and manufacturing exports — leaving a brittle, single-commodity petro-economy that cannot diversify even when it wants to.

</details>
`
    },
    {
      id: 's4-4', title: 'Subsea Warfare & the Mineral Chokepoints', tags: ['CABLES', 'GALLIUM', 'REE'],
      md: String.raw`
<p class="hook">The internet's cables and the world's critical minerals are narrow, mapped and easy to disrupt, which makes them tools of quiet pressure.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>Your connection and the chips in your phone depend on both.</p></aside>

#### The core idea
- **Cables:** about 1.4 million km of subsea fiber across 500+ systems carries roughly 99% of intercontinental data. Anchors and bottom trawling cause about two-thirds of the ~150–200 yearly faults.
- **Gray-zone sabotage:** damage below the threshold of war, such as a dragged anchor. Examples: the 2023 Balticconnector and the 2024 C-Lion1 incidents.
- **Minerals:** China refines about 98% of the world's gallium and much of its germanium. Export controls began in July 2023 and became a ban on US-bound shipments by December 2024.
- **Rare earths:** China holds about 85–90% of processing capacity, and 2025 export controls on dysprosium and terbium hit Western defense and EV supply chains.

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>WATCH OUT · THE PROCESS IS THE CHOKEPOINT</span>
<p>You can't surge gallium: it's a byproduct of aluminum and zinc refining, and capacity takes years to build. The refining process, not the element, is the choke point.</p></aside>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What causes about two-thirds of subsea cable faults?</p>
<details><summary>Show answer</summary><p>Anchors and bottom trawling.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

Weaponized interdependence has two physical layers: the glass under the sea that carries the packets, and the ore under the ground that carries the electrons. Both are narrow, both are mapped, and both are being tested.

#### Cutting the internet's tendons

Roughly **1.4 million km of subsea fiber** across 500+ cable systems carries ~99% of intercontinental data. The system is resilient by design (traffic re-routes) but fragile by geography (cables funnel through the same shallow choke points). Most faults are boring — **anchors and bottom trawling cause about two-thirds** of the ~150–200 annual faults. But the boring vector is the deniable one:

<div class="flow">
  <div class="fstep"><span class="fwho">2023-10</span><span class="fdoc">BALTICCONNECTOR</span><span class="fsm">Finland–Estonia gas + telecom link torn by a dragged anchor</span></div>
  <div class="farrow"><span class="flab">pattern</span></div>
  <div class="fstep"><span class="fwho">2024-11</span><span class="fdoc">C-LION1 + BSC EW</span><span class="fsm">Two Baltic cables cut in days — suspect vessels trail anchors for kilometers</span></div>
  <div class="farrow"><span class="flab">response</span></div>
  <div class="fstep"><span class="fwho">2025-01</span><span class="fdoc">BALTIC SENTRY</span><span class="fsm">NATO patrols the sea floor; AIS spoofing becomes cable-era tradecraft</span></div>
  <div class="farrow"><span class="flab">parallel</span></div>
  <div class="fstep"><span class="fwho">RED SEA</span><span class="fdoc">AAE-1 · SEACOM</span><span class="fsm">Feb 2024 — anchor/anchor-chain damage rerouted a quarter of Asia–Europe capacity</span></div>
</div>

The doctrine is **gray-zone sabotage**: damage beneath the attribution threshold, executed with a ship's anchor instead of a torpedo. Insurance premiums on Baltic routes repriced before navies even agreed on the vocabulary.

#### The periodic table of leverage

Finance has SWIFT; industry has gallium. China refines **~98% of the world's gallium** and a dominant share of germanium — a position built over decades of undercutting Western smelters on price until they closed. The bill came due in **July 2023**: export controls on Ga and Ge, tightened into an outright ban on US-bound shipments by December 2024. Rare earths run the same play at the refining stage — China holds **~85–90% of processing capacity**, and the 2025 export controls on heavy elements (dysprosium, terbium) landed directly on Western defense and EV supply chains.

<div class="grid4">
  <div class="stat"><span class="stat-n c1">~98%</span><span class="stat-l">China's share of refined gallium — GaAs radar, GaN 5G &amp; power chips</span></div>
  <div class="stat"><span class="stat-n c1">~60%</span><span class="stat-l">China's share of germanium — IR optics, fiber doping, satellites</span></div>
  <div class="stat"><span class="stat-n c3">85–90%</span><span class="stat-l">China's share of rare-earth REFINING (mining alone is ~60%)</span></div>
  <div class="stat"><span class="stat-n c3">~417 kg</span><span class="stat-l">Rare-earth content per F-35 — magnets, motors, coatings</span></div>
</div>

Gallium is a byproduct of aluminum and zinc refining — you cannot "surge" it; capacity takes years and mountains of ore. That asymmetry is the point: the chokepoint is not the element but the **industrial process**, and processes are slower to rebuild than stockpiles are to release.

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>KEY INSIGHT · THE ANCHOR AND THE ORE</span>
<p>Cables and minerals are the same weapon at two depths: <b>critical infrastructure whose disruption is cheap, deniable, and slow to repair</b>. The anchor drag costs nothing but a propeller's wash; the export license costs nothing but a signature. Both impose costs measured in months — and both work precisely because globalization optimized everything for a world where nobody would ever dare touch the plumbing.</p></aside>

</details>
`
    }
  ],
  quiz: {
    title: 'SECTOR 04 · EVALUATION', desc: 'Coalitions, chokepoints, currencies', icon: 'building', next: 'sec5', qs: [
      { q: 'In Selectorate Theory, the "Winning Coalition" (W) is…', opts: ['The electorate at large', 'The minimal group whose active loyalty keeps the incumbent in power', 'The international community', 'The bureaucracy'], a: 1, why: 'W = the Essentials: generals, intelligence chiefs, key ministers. Rulers survive by paying W first — with private goods in autocracies, public goods in democracies.' },
      { q: 'Autocrats prefer private goods over public goods because…', opts: ['They hate citizens personally', 'A tiny coalition is cheapest to reward with targeted spoils', 'Public goods are more expensive to produce', 'International law forbids them'], a: 1, why: 'When W is small relative to N, targeted private goods (monopolies, offshore accounts) buy loyalty more efficiently than broad welfare.' },
      { q: 'Roughly what share of China-bound crude oil transits the Strait of Malacca?', opts: ['20%', '50%', '80%', '100%'], a: 2, why: 'About 80% of Chinese hydrocarbon ingress — plus a quarter of all global sea trade — threads a waterway just 1.5 nm wide at its narrowest.' },
      { q: 'The 1974 petrodollar deal exchanged…', opts: ['Oil for gold', 'US security guarantees for Saudi oil priced exclusively in dollars', 'Arms for hostages', 'Grain for natural gas'], a: 1, why: 'The House of Saud got protection; the US got structural global demand for USD — every importer must hold dollars to buy energy.' },
      { q: 'Disconnecting a country from SWIFT primarily…', opts: ['Blocks its internet traffic', 'Cuts it off from interbank clearance and settlement messaging', 'Seizes its gold reserves', 'Sanctions its shipping fleet'], a: 1, why: 'SWIFT is the messaging layer between 11,000+ banks — exile from it means monetary sterility even with intact infrastructure.' },
      { q: 'Dutch Disease describes…', opts: ['A tulip futures crash', 'Resource-driven currency appreciation that guts other export sectors', 'A contagious banking crisis', 'Hyperinflation from money printing'], a: 1, why: 'The resource windfall strengthens the currency, making agriculture and manufacturing uncompetitive — a brittle single-commodity economy results.' },
      { q: 'The Mineral Paradox explains why resource-rich dictatorships rarely democratize: …', opts: ['Oil poisons drinking water', 'Rulers need no productive tax base, so citizens become a liability instead of a resource', 'Minerals are owned by the UN', 'Elections are technically impossible'], a: 1, why: 'Wealth bubbling from the ground removes the need for a productive, educated populace — extraction plus a paid-off coalition suffices.' },
      { q: 'Weaponized interdependence means…', opts: ['Trade automatically prevents war', 'Concentrated supply-chain nodes become geopolitical leverage', 'Sanctions only hurt the sender', 'Interdependence is always symmetric'], a: 1, why: 'Globalization concentrated critical capacity (e.g., TSMC sub-10nm nodes) into chokepoints — turning network topology itself into a weapon.' },
      { q: 'The dominant share of the world\u2019s refined gallium is produced in…', opts: ['China (~98%) — enabling Ga/Ge export controls from July 2023', 'Chile', 'Australia', 'The United States'], a: 0, why: 'Gallium is a smelting byproduct China accumulated by undercutting rivals for decades; the 2023 controls and the 2024 US-bound ban turned process dominance into statecraft.' },
      { q: 'Most subsea cable faults worldwide are caused by…', opts: ['Shark bites', 'Anchors and bottom trawling — roughly two-thirds of ~150–200 faults per year', 'Solar storms alone', 'Deliberate sabotage'], a: 1, why: 'The boring vector is the deniable one: dragged anchors can cut gas pipelines (Balticconnector 2023) and data cables (C-Lion1 / BSC East-West 2024) beneath the attribution threshold.' },
      { q: 'Why is the rare-earth chokepoint the refining stage rather than mining?', opts: ['Mining is illegal outside China', 'China holds ~85–90% of processing capacity even though mining is more widely distributed', 'Rare earths cannot be shipped', 'Mines deplete instantly'], a: 1, why: 'The West mines (Mountain Pass, Mt Weld) but mostly ships concentrate to China for separation — the hard-won, dirty, patented process chemistry is the true moat.' }
    ]
  }
},

/* ================= SECTOR 05 : ANTHROPOLOGY ================= */
{
  id: 'sec5', num: '05', icon: 'speech', label: 'Anthropology',
  kick: 'SECTOR 05 · SPECIES', title: 'Anthropology & Human Nature',
  sub: 'Cognitive revolution, the wheat trap and evolutionary mismatch',
  intro: "We are Stone Age bodies and brains living in a world of glass and notifications. Modern humans appeared about 300,000 years ago and lived almost all that time in small bands of 50–150 people. This sector looks at how language let us cooperate in huge groups, what farming cost us, and why our ancient wiring clashes with modern life.",
  blocks: [
    {
      id: 's5-1', title: 'The Cognitive Revolution & Intersubjective Reality', tags: ['70 KA', 'DUNBAR'],
      md: String.raw`
<p class="hook">About 70,000 years ago humans learned to talk about things that don't physically exist, like gods, money and nations, and that let millions of strangers cooperate.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>Money, laws and companies work only because we all believe in them, which is why trust and stories matter so much.</p></aside>

#### The core idea
- **The language leap:** around 70,000 years ago, mutations in neural wiring gave rise to fully symbolic, recursive language. Green monkeys warn about real things ("eagle above!"), but humans can talk about things outside material reality.
- **Intersubjective reality:** a dollar bill has value only because we share the belief. If the belief vanishes, it's dyed paper.
- **Dunbar's number:** about 150 people is the limit of stable direct relationships, set by neocortex volume.
- **The trick:** shared stories let us cooperate far beyond 150. Groups grew from bands (5–15) to clans (~50) to tribes (~150) and beyond.

#### Try it: shatter the trust gauge

Slide the population past 150 and watch primate neurology fail in real time. Then do what *Homo sapiens* actually did — patch the stack with a shared fiction:

<div class="interactive-sim" data-sim="dunbar">
<div class="sim-head"><span class="sim-kick">SIMULATION · SOCIAL FIRMWARE</span><b class="sim-title">DUNBAR’S TRIBE SCALE &amp; COHESION</b><span class="sim-badge">NEOCORTEX MONITOR</span></div>
<div class="sim-body">
<div class="mg-row"><label class="mg-lab">POPULATION <b data-mg-el="du-pop">120</b></label><input type="range" class="mg-slider" data-mg="dunbar-pop" min="10" max="500" step="5" value="120" aria-label="Settlement population"></div>
<div class="du-layers">
<div class="du-layer"><b>BAND</b><em>5–15</em><span>core unit</span></div>
<div class="du-layer"><b>CLAN</b><em>~50</em><span>shared camp</span></div>
<div class="du-layer"><b>TRIBE</b><em>~150</em><span>DUNBAR LIMIT</span></div>
<div class="du-layer"><b>NATION</b><em>150M+</em><span>FICTION REQUIRED</span></div>
</div>
<div class="du-gaugerow"><span class="mg-lab">COHESION</span><div class="du-gauge"><i></i></div><b class="du-word" data-mg-el="du-word">STABLE</b></div>
<div class="mg-btn-row">
<button class="btn primary" data-mg="dunbar-myth">INJECT SHARED MYTH</button>
<button class="btn" data-mg="dunbar-reset">RESET</button>
</div>
<p class="sim-note dim">Past N = 150, personal trust cannot scale — only intersubjective fiction (gods, flags, law, currency) restores cohesion. First injection banks +5 XP.</p>
</div>
</div>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Why does a dollar bill have value?</p>
<details><summary>Show answer</summary><p>Because people share the belief that it does. That is an intersubjective reality.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

Around **70,000 years ago**, mutations in neural wiring gave rise to fully symbolic, recursive language. Unlike green monkeys — whose calls convey direct, objective warnings ("eagle above!") — humans gained the capacity to communicate concepts that exist **outside material reality**:

<div class="fx-box">
$$\text{Material: } \{\text{Trees, Rivers, Predators}\} \quad \cap \quad \text{Intersubjective: } \{\text{Gods, Nations, Currency, Laws}\}$$
<div class="fx-cap">The second set rules the world — and exists only by collective agreement</div>
</div>

A dollar bill has value only because we share the belief. If collective belief evaporates, it reverts to dyed paper. This trick allowed flexible cooperation in massive groups, vaulting past **Dunbar's Number** — the ~150-person cognitive ceiling on stable direct relationships imposed by neocortex volume.

<div class="flow">
  <div class="fstep"><span class="fwho">BAND</span><span class="fdoc">5–15</span><span class="fsm">Core survival &amp; hunting unit</span></div>
  <div class="farrow"><span class="flab">grows</span></div>
  <div class="fstep"><span class="fwho">CLAN</span><span class="fdoc">~50</span><span class="fsm">Shared-resource camp</span></div>
  <div class="farrow"><span class="flab">hits</span></div>
  <div class="fstep"><span class="fwho">TRIBE</span><span class="fdoc">~150</span><span class="fsm">Dunbar's limit of direct personal trust</span></div>
  <div class="farrow"><span class="flab">exceeds via</span></div>
  <div class="fstep"><span class="fwho">NATION</span><span class="fdoc">150M+</span><span class="fsm">Requires intersubjective fiction: flags, laws, myths</span></div>
</div>

</details>
`
    },
    {
      id: 's5-2', title: 'The Agricultural Trap', tags: ['NEOLITHIC', 'WHEAT'],
      md: String.raw`
<p class="hook">Farming made populations explode, but for most individuals it meant worse health, harder work and less freedom.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It teaches you to question stories of "progress": ask who gained and who paid.</p></aside>

#### The core idea
- **The common story:** the Neolithic Transition (~12,000 BP) is told as an escape from starvation into comfort.
- **What the record shows:** foragers ate diverse diets (dozens of gathered species per week) and worked shorter hours than farmers.
- **The trade-off:** yield per acre and population climbed, but individual health, autonomy and lifespan collapsed. The species won; the individuals lost.
- **A memorable flip:** Homo sapiens didn't domesticate wheat. Wheat domesticated Homo sapiens.

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What does "wheat domesticated us" mean?</p>
<details><summary>Show answer</summary><p>Farming's demands shaped human lives, and populations grew while individual health, autonomy and lifespan declined.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

The Neolithic Transition (~12,000 BP) is framed as humanity's ascent from starvation to sedentary ease. The anthropological record tells a darker story.

<div class="duo">
  <div class="lane c-teal">
    <h4><i class="pixelart-icons-font-sun pi-teal"></i> THE FORAGER LIFE</h4>
    <ul>
      <li>Diverse diets — dozens of gathered species per week</li>
      <li>Shorter working hours than any farmer society</li>
      <li>Low rates of communicable disease (small, mobile bands)</li>
      <li>Weak hierarchy — hard to hoard what you carry</li>
    </ul>
  </div>
  <div class="lane c-red">
    <h4><i class="pixelart-icons-font-chart pi-red"></i> THE WHEAT BARGAIN</h4>
    <ul>
      <li>Back-breaking labor: weeding, irrigation, tilling — warped primate spines</li>
      <li>Grain stores created <b>centralized wealth worth raiding</b> → organized warfare</li>
      <li>Stratification, chiefs and chattel slavery</li>
      <li>Dense proximity to cattle, fowl and swine → zoonotic pandemics (smallpox, measles, flu)</li>
    </ul>
  </div>
</div>

</details>
`
    },
    {
      id: 's5-3', title: 'Evolutionary Mismatch & the Loneliness Epidemic', tags: ['DOPAMINE', 'MISMATCH'],
      md: String.raw`
<p class="hook">Our brains were built for scarcity and small tribes, so modern abundance and apps press buttons that were never meant to be pressed.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It reframes cravings, doom-scrolling and loneliness as predictable mismatches instead of personal failures.</p></aside>

#### The core idea
- **Dopamine** motivates survival behavior, and now supernormal stimuli like junk food and feeds hijack it.
- **Food:** sweet and fat were rare, so craving them was adaptive. With high-fructose corn syrup, the same drive contributes to metabolic syndrome and type-2 diabetes.
- **Status:** exile once meant death, so we constantly monitor status. Likes, retweets and follower counts trigger the same circuitry.
- **Loneliness:** you can sit among 10,000 people and be linked to 8 billion online and still feel isolated, because the brain needs low-latency, in-person tribal contact.
- **Slot-machine design:** apps, dating platforms and brokerages use variable-ratio reinforcement because our dopamine pathways are predictable.

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>WATCH OUT · SUPERSTIMULUS</span>
<p>The bug isn't weak willpower. It's Pleistocene code running on 21st-century inputs.</p></aside>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What is a supernormal stimulus?</p>
<details><summary>Show answer</summary><p>An exaggerated version of an ancestral reward, such as junk food or endless feeds, that hijacks instincts built for scarcity.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

Our neurobiology evolved under severe caloric and social scarcity. The reward system runs on **dopamine** — a neurotransmitter designed to motivate survival behaviors, now besieged by supernormal stimuli:

<div class="grid4">
  <div class="stat"><span class="stat-n c5">2% / 20%</span><span class="stat-l">Brain's share of body mass / share of resting glucose burn</span></div>
  <div class="stat"><span class="stat-n c5">~150</span><span class="stat-l">Dunbar's Number — the tribal trust ceiling</span></div>
  <div class="stat"><span class="stat-n c4">300 ka</span><span class="stat-l">Age of anatomically modern Homo sapiens</span></div>
  <div class="stat"><span class="stat-n c4">70 ka</span><span class="stat-l">Cognitive revolution — symbolic language</span></div>
</div>

#### The mismatch catalog

- **Caloric density**: Sweet and fat were rare and precious; craving them was adaptive. In the age of high-fructose corn syrup the same drive manifests as metabolic syndrome and type-2 diabetes.
- **Parasocial validation**: Inclusion in a Paleolithic tribe was survival; exile meant death. Today the *same* status-monitoring circuitry processes likes, retweets and follower counts — leaving users permanently stressed by the judgment of digital phantoms.
- **Loneliness in megacities**: A person can sit in a building surrounded by 10,000 people, connected to 8 billion via fiber, and experience total isolation — the brain registers thousands of digital inputs while starving for the low-latency, non-verbal tribal interaction it was built to require.
- **Gamified existence**: App developers, dating platforms and brokerages exploit **variable-ratio reinforcement schedules** — the slot-machine mechanism — because our dopamine pathways are predictable. Scroll, spin, trade, repeat.

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>SYSTEM TRAP · SUPERSTIMULUS</span>
<p>Every addiction vector of the modern world is a <b>supernormal stimulus</b> — exaggerated versions of ancestral payoffs that hijack firmware written for scarcity. The bug is not weak willpower; the bug is running Pleistocene code on 21st-century inputs.</p></aside>

</details>
`
    }
  ],
  quiz: {
    title: 'SECTOR 05 · EVALUATION', desc: 'Fictions, farming, firmware', icon: 'speech', next: 'sec6', qs: [
      { q: 'Intersubjective realities are…', opts: ['Optical illusions shared by crowds', 'Concepts that exist only through collective belief — gods, nations, currency, laws', 'Dreams verified by psychologists', 'Physical laws governing societies'], a: 1, why: 'A dollar reverts to dyed paper the moment collective belief evaporates; this shared fiction is what lets strangers cooperate at national scale.' },
      { q: 'Dunbar\u2019s Number is approximately…', opts: ['15', '50', '150', '1,500'], a: 2, why: '≈150 — the cognitive ceiling on stable direct relationships imposed by primate neocortex volume; beyond it, cooperation requires shared fictions.' },
      { q: 'The Cognitive Revolution (~70,000 BP) gave humans…', opts: ['Fire', 'Fully symbolic, recursive language enabling fiction', 'Agriculture', 'Bipedalism'], a: 1, why: 'Recursive symbolic language let sapiens communicate concepts outside material reality — the load-bearing trick of nations and gods.' },
      { q: 'According to the agricultural-trap thesis, wheat…', opts: ['Was domesticated slowly and painlessly', 'Domesticated humans — chaining them to labor while population grew and individual health fell', 'Was first cultivated for beer only', 'Caused no social change'], a: 1, why: 'Grain stores created raidable wealth → warfare, hierarchy, slavery; animal proximity → zoonoses. Yield up, autonomy down.' },
      { q: 'A major zoonotic consequence of sedentary farming was…', opts: ['Vitamin D deficiency', 'Pandemic pathogens crossing from domesticated animals (smallpox, measles, influenza)', 'Fewer cavities', 'Better eyesight'], a: 1, why: 'Dense cohabitation with cattle, fowl and swing exposed humanity to the disease pool that later shaped history.' },
      { q: 'Parasocial stress on social media is an evolutionary mismatch because…', opts: ['Screens emit blue light', 'Status circuitry built for 150-person tribes now processes follower counts of millions', 'Humans cannot read text quickly', 'Phones damage posture'], a: 1, why: 'The same status-monitoring dopamine loops that kept you alive in a band now run on likes and retweets — permanent ambient social threat.' },
      { q: 'Variable-ratio reinforcement explains…', opts: ['Crop rotation schedules', 'Why slot machines, gacha pulls and infinite scrolls are compulsive', 'Why birds migrate', 'Memory consolidation during sleep'], a: 1, why: 'Unpredictable reward timing produces the highest response persistence — the shared engine of pachinko, banners and feeds.' },
      { q: 'The loneliness epidemic persists in dense cities because…', opts: ['Cities are too loud', 'The brain needs low-latency, non-verbal tribal interaction that digital contact does not provide', 'People lack vocabulary', 'Urban air reduces serotonin'], a: 1, why: 'Thousands of digital inputs cannot substitute the high-touch, embodied interaction the social firmware requires.' }
    ]
  }
},
/* ================= SECTOR 06 : PHYSICS & ASTROPHYSICS ================= */
{
  id: 'sec6', num: '06', icon: 'atom', label: 'Physics & Astrophysics',
  kick: 'SECTOR 06 · SPACETIME', title: 'Physics & Astrophysics',
  sub: 'Entropy, relativity, collapse horizons',
  intro: "Physics keeps peeling away comfortable illusions: time doesn't tick evenly, space isn't an empty stage, and gravity isn't a pull. Sitting on a chair, you're following a straight path through spacetime curved by the mass beneath you. This sector covers why time has a direction, how relativity bends clocks, how stars die, and how pulsars let us hear the universe's slowest hum.",
  blocks: [
    {
      id: 's6-1', title: 'Thermodynamics & the Arrow of Time', tags: ['ENTROPY', 'BOLTZMANN'],
      md: String.raw`
<p class="hook">Time seems to run forward because disorder is overwhelmingly more likely than order, not because of any mystical force.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It explains why messes grow, why engines waste heat and why the universe is slowly running down.</p></aside>

#### The core idea
- **The three laws:** energy is conserved, entropy never decreases overall, and there's a floor at zero temperature.
- **Boltzmann's idea:** entropy counts the microstates (arrangements) that look the same. A clean room has few valid arrangements; a messy room has trillions.
- **Arrow of time:** systems drift toward the states with the most arrangements, so time seems to point forward.
- **Heat death:** the final state has maximal entropy, no gradients and no extractable work.
- **Maxwell's Demon:** a tiny being sorting fast and slow particles seems to beat the Second Law. Szilárd and Landauer showed it must measure, store and erase information, and erasing a bit costs at least k_B T ln 2 of energy (Landauer's Principle).

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Why does time seem to move forward?</p>
<details><summary>Show answer</summary><p>Disordered states are statistically overwhelming, so systems drift toward them and entropy rises.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

The three laws govern cosmic energy — conservation ($dU = \delta Q - \delta W$), entropy non-decrease ($\Delta S \ge 0$), and the zero-temperature entropy floor. Ludwig Boltzmann's revelation: entropy is not mystical decay but **statistics over microstates**:

<div class="fx-box">
$$S = k_B \ln \Omega$$
<div class="fx-cap">A clean room has few valid arrangements; a messy room has trillions — disorder is simply more probable</div>
</div>

The arrow of time moves forward because disordered states are statistically overwhelming. The universe's endgame is **Heat Death**: maximal entropy, no gradients, no extractable work — forever.

#### Maxwell's Demon, deflated

A tiny being sorting fast particles from slow ones through a door seems to violate the Second Law. Szilárd and Landauer broke the paradox: the Demon must **measure, store and erase** information — and erasure has a hard thermodynamic price:

<div class="fx-box">
$$Q_{\text{dissipated}} = k_B T \ln 2 \quad (\text{Landauer's Principle})$$
<div class="fx-cap">Deleting one bit costs the universe a minimum of k_B·T·ln2 — information is physical</div>
</div>

</details>
`
    },
    {
      id: 's6-2', title: 'Special & General Relativity', tags: ['LORENTZ', 'E=MC²'],
      md: String.raw`
<p class="hook">Relativity says time and space bend, and your phone's GPS corrects for it every day.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It isn't just theory: without relativity corrections GPS would drift by kilometers within a day.</p></aside>

#### The core idea
- **Special relativity** rests on two ideas: the laws of physics are the same in every inertial frame, and the speed of light is constant for all observers. So moving clocks run slow and lengths contract (by the Lorentz factor).
- **General relativity:** gravity isn't a force but the curve of spacetime. Mass-energy tells spacetime how to curve, and spacetime tells matter how to move.
- **GPS numbers:** satellites move at about 3.9 km/s, which slows their clocks by ≈7 μs/day. They sit higher in Earth's gravity well, which speeds them up by ≈45 μs/day. The net drift is +38 μs/day.

#### In practice
Uncorrected, GPS positions would drift by more than 11 km per day, and aviation, navigation and logistics would collapse within days. Your phone is a relativity laboratory.

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Why do GPS satellites need relativity corrections?</p>
<details><summary>Show answer</summary><p>Their speed slows their clocks (special relativity) and their height speeds them up (general relativity). The net +38 μs/day would drift positions by more than 11 km per day.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

**Special Relativity** stands on two postulates: the laws of physics are invariant across inertial frames, and the vacuum speed of light is constant for all observers. Consequence: time dilates and lengths contract by the Lorentz factor:

<div class="fx-box">
$$\gamma = \frac{1}{\sqrt{1 - \frac{v^2}{c^2}}}, \quad \Delta t' = \gamma \Delta t, \quad L' = \frac{L}{\gamma}$$
$$E^2 = (pc)^2 + (m_0 c^2)^2 \;\;\implies\;\; \text{Rest frame: } E = mc^2$$
<div class="fx-cap">c ≈ 299,792,458 m/s — the universe's hard speed limit</div>
</div>

**General Relativity** replaces Newton's force with geometry — mass-energy curves four-dimensional spacetime:

<div class="fx-box">
$$G_{\mu\nu} + \Lambda g_{\mu\nu} = \frac{8\pi G}{c^4} T_{\mu\nu}$$
<div class="fx-cap">"Spacetime tells matter how to move; matter tells spacetime how to curve."</div>
</div>

</details>
`
    },
    {
      id: 's6-3', title: 'Stellar Death & Black Holes', tags: ['CHANDRASEKHAR', 'SCHWARZSCHILD'],
      md: String.raw`
<p class="hook">When a star runs out of fuel, gravity wins: depending on its mass it becomes a white dwarf, a neutron star or a black hole.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It's where physics' two biggest theories meet, and where they clash.</p></aside>

#### The core idea
- **White dwarfs** hold up against gravity through electron degeneracy pressure (the Pauli Exclusion Principle). There's a limit: about 1.44 solar masses (the Chandrasekhar limit).
- **Past the limit:** collapse continues to a neutron star, or, if the mass is squeezed inside the Schwarzschild radius (r_s = 2GM/c²), to a black hole, where escape speed exceeds the speed of light.
- **Hawking radiation:** quantum effects at the horizon let a black hole slowly evaporate. Smaller holes are hotter and evaporate faster.
- **Spaghettification:** falling in, your feet are pulled much harder than your head.
- **The dark side of the universe:** Vera Rubin's flat galactic rotation curves revealed dark matter, and 1998's Type Ia supernovae revealed dark energy (Λ).

#### Try it: fall toward the horizon

Two sliders, one inescapable geometry. Mass sets $r_s = 2GM/c^2$; your orbit radius sets the time dilation $\gamma = 1/\sqrt{1 - r_s/r}$. Cross the boundary and your proper-time clock freezes for the outside universe:

<div class="interactive-sim" data-sim="blackhole">
<div class="sim-head"><span class="sim-kick">SIMULATION · SPACETIME</span><b class="sim-title">SCHWARZSCHILD EVENT HORIZON CALCULATOR</b><span class="sim-badge">GEODESIC TRACKER</span></div>
<div class="sim-body">
<div class="mg-row"><label class="mg-lab">MASS <b data-mg-el="bh-m">10</b> M☉</label><input type="range" class="mg-slider" data-mg="bh-mass" min="1" max="1000" step="1" value="10" aria-label="Black hole mass in solar masses"></div>
<div class="mg-row"><label class="mg-lab">ORBIT RADIUS <b data-mg-el="bh-r">5,000</b> km</label><input type="range" class="mg-slider" data-mg="bh-radius" min="1" max="30000" step="10" value="5000" aria-label="Orbit radius in kilometers"></div>
<div class="bh-reads">
<div class="bh-read"><span class="mg-katex" data-mg-el="bh-rs">r_s</span><span class="mg-lab">SCHWARZSCHILD RADIUS</span></div>
<div class="bh-read"><span class="mg-katex" data-mg-el="bh-gamma">γ</span><span class="mg-lab">TIME DILATION FACTOR</span></div>
<div class="bh-read"><span class="bh-clock mono" data-mg-el="bh-clock">T+0.0s</span><span class="mg-lab">PROPER MISSION CLOCK</span></div>
</div>
<div class="bh-track"><i class="bh-disc" data-mg-el="bh-disc"></i><i class="bh-you" data-mg-el="bh-you"></i></div>
<div class="bh-verdict mono" data-mg-el="bh-verdict">SAFE ORBIT — SPACETIME CURVATURE NOMINAL</div>
<p class="sim-note dim">r_s = 2GM/c² ≈ 2.953 km per solar mass. Cross r ≤ r_s and escape velocity exceeds c — the clock stops for everyone watching you. Track bar: horizon width vs your marker, 30,000 km scale.</p>
</div>
</div>

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>WATCH OUT · THE INFORMATION PARADOX</span>
<p>Quantum mechanics says information can't be destroyed, but a fully evaporated black hole seems to erase it. This clash led to the Holographic Principle and is still unresolved.</p></aside>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What stops a white dwarf from collapsing, and when does that fail?</p>
<details><summary>Show answer</summary><p>Electron degeneracy pressure holds it up, but it fails above about 1.44 solar masses.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

When stars exhaust nuclear fuel, radiation pressure drops and gravity wins. White dwarfs survive on **electron degeneracy pressure** — the Pauli Exclusion Principle refusing to let electrons share quantum states. But the support has a load limit:

<div class="fx-box">
$$M_{\text{Ch}} \approx \frac{\omega_3^0}{4\pi}\left(\frac{hc}{G}\right)^{3/2}\left(\frac{1}{\mu_e m_u}\right)^2 \approx 1.44\, M_\odot$$
<div class="fx-cap">The Chandrasekhar Limit — beyond it, degeneracy fails and the core collapses</div>
</div>

Past the limit, collapse proceeds to a neutron star — or, past the Schwarzschild threshold, to a black hole:

<div class="fx-box">
$$r_s = \frac{2GM}{c^2}$$
<div class="fx-cap">Compress mass inside r_s and escape velocity exceeds c — a one-way surface</div>
</div>

<div class="grid4">
  <div class="stat"><span class="stat-n c1">$1.44\,M_\odot$</span><span class="stat-l">Chandrasekhar limit for white dwarf cores</span></div>
  <div class="stat"><span class="stat-n c1">$c$</span><span class="stat-l">299,792,458 m/s — the causal speed limit</span></div>
  <div class="stat"><span class="stat-n c4">$T_H$</span><span class="stat-l">Hawking temperature — black holes evaporate, eventually</span></div>
  <div class="stat"><span class="stat-n c4">~68%</span><span class="stat-l">Dark energy's share of the universe's mass-energy budget</span></div>
</div>

#### The evaporation equations

Quantum fluctuations at the horizon let one virtual particle escape while its negative-energy partner falls in, shrinking the hole over immense epochs:

<div class="fx-box">
$$T_H = \frac{\hbar c^3}{8\pi G M k_B}, \quad \frac{dM}{dt} = -\frac{\hbar c^4}{15360 \pi G^2 M^2}$$
<div class="fx-cap">Smaller hole → hotter → faster evaporation → final blaze</div>
</div>

Infalling matter suffers **spaghettification** — differential gravity pulls your feet vastly harder than your head. Vera Rubin's flat galactic rotation curves revealed the invisible **dark matter** halo; 1998's Type Ia supernovae revealed **dark energy** (Λ) accelerating the expansion.

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>SYSTEM TRAP · THE INFORMATION PARADOX</span>
<p>Quantum mechanics says states cannot be destroyed (unitarity). General relativity says infalling matter is crushed to a singularity and radiated away as featureless thermal Hawking radiation. <b>If the hole evaporates completely, where did the information go?</b> The tension drove the Holographic Principle — all 3D bulk physics encoded on a 2D boundary. Unresolved at the seams of the two greatest theories.</p></aside>

</details>
`
    },
    {
      id: 's6-4', title: 'The Nanohertz Cosmos: NANOGrav\u2019s Galaxy-Sized Detector', tags: ['PTA', 'SMBHB', 'HELLINGS-DOWNS'],
      md: String.raw`
<p class="hook">Astronomers built a galaxy-sized gravitational-wave detector out of pulsars, and in 2023 it detected a low, constant hum across the universe.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It opened a third "ear" on the cosmos, next to LIGO and future space detectors.</p></aside>

#### The core idea
- **LIGO vs. this:** LIGO hears fast chirps from small black-hole mergers. Supermassive black hole pairs make waves so slow that one vibration takes years (nanohertz).
- **Pulsars as clocks:** millisecond pulsars are spinning neutron stars with extremely regular radio pulses. A passing wave shifts their arrival times by tens to hundreds of nanoseconds.
- **Proof needs the whole sky:** one pulsar proves nothing because of noise. The signature is a pattern across many pulsars, the Hellings–Downs correlation curve.
- **June 2023:** NANOGrav's 15-year dataset (nearly 70 millisecond pulsars) gave decisive evidence for the background, and EPTA+InPTA, PPTA and CPTA saw the same signal.
- **Best guess:** supermassive black hole binaries. The catch: the models need heavier or more numerous binaries, or inspirals sped up by gas and stars.

#### Three ears on the universe
Ground interferometers (LIGO/Virgo/KAGRA) hear stellar collisions, space interferometers (LISA, planned) hear intermediate masses, and pulsar timing arrays hear the nanohertz bass. Together they span seven orders of magnitude of frequency.

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Why can't a single pulsar prove a gravitational-wave background?</p>
<details><summary>Show answer</summary><p>Clock noise and interstellar effects look similar. Only a correlated pattern across many pulsars (Hellings–Downs) is a reliable fingerprint.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

LIGO hears the *crash* — kilohertz chirps from merging stellar-mass black holes. But the universe's loudest gravitational-wave source is a bassline so deep one vibration takes **years**: supermassive black hole binaries, hundreds of millions of solar masses, orbiting across parsec-scale separations. To hear it you need a detector the size of a galaxy — so astronomers built one out of the galaxy itself.

#### Pulsar timing arrays

Millisecond pulsars are nature's atomic clocks — spinning neutron stars whose radio sweeps arrive with **nanosecond-scale regularity**. A passing nanohertz gravitational wave alternately stretches and squeezes the Earth–pulsar light path, nudging time-of-arrival by tens to hundreds of nanoseconds. No single pulsar proves anything (clock noise, interstellar dispersion); the signature is <b>correlated deviation across the whole sky</b> — the **Hellings–Downs angular correlation curve**, the fingerprint only a stochastic gravitational-wave background can print:

<div class="fx-box">
$$\text{PTA signal} = \delta t \sim \frac{h}{2\pi f}, \qquad h_c(f) \sim \left(\frac{f}{f_{\mathrm{ref}}}\right)^{\alpha}$$
<div class="fx-cap">Strain amplitude ~10⁻¹⁵ at nanohertz frequencies — timing residual ~100 ns</div>
</div>

#### The 15-year dataset (June 2023)

NANOGrav's 15-year campaign — nearly 70 millisecond pulsars observed for fifteen years at cadences of weeks — announced decisive evidence for the background. Within months, every pulsar-timing array on Earth (EPTA+InPTA, PPTA, CPTA) independently converged on the same signal, and the combined IPTA datasets sealed it.

<div class="grid4">
  <div class="stat"><span class="stat-n c1">15 yr</span><span class="stat-l">Observing baseline — the low-frequency sensitivity floor</span></div>
  <div class="stat"><span class="stat-n c1">~70</span><span class="stat-l">Millisecond pulsars timed to nanosecond precision</span></div>
  <div class="stat"><span class="stat-n c3">nHz</span><span class="stat-l">Frequency band — wave periods of years to decades</span></div>
  <div class="stat"><span class="stat-n c3">kpc</span><span class="stat-l">"Detector arms" — Earth to pulsar baselines</span></div>
</div>

The leading interpretation: the cosmic hum of **supermassive black hole binaries** integrated across cosmic history. The catch — the inferred binary population wants binaries that are *heavier or more numerous* than standard galaxy-merger models predict, or inspirals sped by gas discs and stellar scattering faster than pure gravitational-wave emission allows. Cosmologists are now doing galaxy-merger census work with a clock made of dead stars.

</details>
`
    }
  ],
  quiz: {
    title: 'SECTOR 06 · EVALUATION', desc: 'Entropy, light cones, horizons', icon: 'atom', next: 'sec7', qs: [
      { q: 'Boltzmann\u2019s entropy formula is…', opts: ['$S = kT$', '$S = k_B \\ln \\Omega$', '$E = mc^2$', '$F = ma$'], a: 1, why: 'Entropy counts microstates: a clean room admits few arrangements, a messy one trillions — the arrow of time is probability, not mysticism.' },
      { q: 'Landauer\u2019s principle sets the minimum cost of…', opts: ['Computing a floating-point operation', 'Erasing one bit of information: k_B·T·ln2 dissipated as heat', 'Cooling a qubit', 'Transmitting one photon'], a: 1, why: 'Szilárd and Landauer deflated Maxwell\u2019s Demon — measurement and erasure make information physical.' },
      { q: 'The net relativistic drift of GPS satellite clocks is…', opts: ['−7 μs/day', '+45 μs/day', '+38 μs/day', 'Zero — relativity cancels out'], a: 2, why: '+45 μs (general, gravity well) − 7 μs (special, velocity) = +38 μs/day. Uncorrected, positions drift >11 km daily.' },
      { q: 'The Chandrasekhar limit is approximately…', opts: ['$0.08\\,M_\\odot$', '$1.44\\,M_\\odot$', '$8\\,M_\\odot$', '$150\\,M_\\odot$'], a: 1, why: 'Beyond ~1.44 solar masses, relativistic effects soften the electron degeneracy equation of state and core collapse proceeds.' },
      { q: 'Calculate: for a mass $M$, the Schwarzschild radius is…', opts: ['$r_s = \\frac{2GM}{c^2}$', '$r_s = \\frac{GM}{c}$', '$r_s = \\frac{c^2}{2GM}$', '$r_s = 2GMc^2$'], a: 0, badge: 'astrophysics', why: 'r_s = 2GM/c² — compress mass inside this radius and escape velocity exceeds lightspeed. SINGULARITY DIVER badge: you computed the horizon.' },
      { q: 'Hawking radiation causes black holes to…', opts: ['Grow by absorbing vacuum energy', 'Evaporate slowly — hotter as they shrink', 'Emit visible light steadily', 'Explode immediately'], a: 1, why: 'T_H ∝ 1/M and dM/dt ∝ −1/M²: small holes run hot and end in a final blaze.' },
      { q: 'Dark energy makes up roughly what fraction of the universe\u2019s mass-energy budget?', opts: ['5%', '27%', '68%', '95%'], a: 2, why: 'ΛCDM: ~68% dark energy, ~27% dark matter, ~5% ordinary baryonic matter.' },
      { q: 'The black hole information paradox opposes…', opts: ['Thermodynamics against electromagnetism', 'Quantum unitarity against general relativity\u2019s destruction of infalling information', 'Newton against Kepler', 'Two interpretations of dark matter'], a: 1, why: 'QM forbids state destruction; GR + thermal Hawking radiation seemingly destroys it — the tension birthed the Holographic Principle.' },
      { q: 'The NANOGrav 15-year signal is interpreted as…', opts: ['The cosmic microwave background echoing', 'A stochastic nanohertz gravitational-wave background — most plausibly the hum of supermassive black hole binaries', 'Instrument timing noise', 'Dark matter decay'], a: 1, why: 'Correlated nanosecond timing deviations across ~70 millisecond pulsars trace the Hellings–Downs curve — the unique signature of a gravitational-wave background at nHz frequencies.' },
      { q: 'Pulsar timing arrays detect gravitational waves via…', opts: ['Laser interferometry between spacecraft', 'Correlated time-of-arrival deviations across many pulsars over decades', 'Radio bursts from magnetars', 'Changes in cable propagation delay'], a: 1, why: 'A passing wave stretches Earth–pulsar paths differentially by sky angle; only the correlated pattern (not any single pulsar drift) identifies the background.' }
    ]
  }
},
/* ================= SECTOR 07 : ASTRONOMY ================= */
{
  id: 'sec7', num: '07', icon: 'moon', label: 'Astronomy',
  kick: 'SECTOR 07 · DEEP FIELD', title: 'Astronomy & Deep Space Exploration',
  sub: 'Distance ladders, cosmic forges and silent skies',
  intro: "Looking up means looking back in time, and the hard part is distance: how far away is a pinprick of light? Astronomers built a **ladder** where each rung calibrates the next, from radar bounces off Venus to the edge of the observable universe. This sector climbs the ladder, follows a star's life, hunts planets and checks what the newest telescope is finding.",
  blocks: [
    {
      id: 's7-1', title: 'The Cosmic Distance Ladder', tags: ['PARALLAX', 'CEPHEID', 'H₀'],
      md: String.raw`
<p class="hook">We measure the universe with a ladder of methods, where each rung is calibrated by the one below it.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It shows how science builds confidence step by step, and why one small disagreement, the Hubble tension, matters.</p></aside>

#### The core idea
- **Rung 1, radar:** bounce radio off Venus to set the astronomical unit (1.496×10⁸ km).
- **Rung 2, parallax:** use Earth's orbit as a 2 AU baseline to see how nearby stars shift. Distance in parsecs is 1 divided by the parallax in arcseconds.
- **Cepheids:** Henrietta Leavitt found that a Cepheid star's pulsation period reveals its true brightness. Compare that with how bright it looks and the inverse-square law gives distance.
- **Redshift:** stretched light measures how fast a galaxy recedes, and v = H₀ d turns that speed into distance.

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>WATCH OUT · THE HUBBLE TENSION</span>
<p>Planck's early-universe measurement gives H₀ ≈ 67.4 ± 0.5 km/s/Mpc, while the local ladder (SH0ES) gives ≈ 73.0 ± 1.0. They disagree by more than 5σ. Either the ladder has a hidden error, or our standard cosmology (ΛCDM) is incomplete.</p></aside>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>What does parallax measure?</p>
<details><summary>Show answer</summary><p>How much a nearby star appears to shift against distant stars as Earth orbits. Distance in parsecs is 1/p.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

Five rungs, each anchoring the next:

<div class="flow">
  <div class="fstep"><span class="fwho">RUNG 1</span><span class="fdoc">RADAR</span><span class="fsm">Bounce radio off Venus → calibrate the AU (1.496×10⁸ km)</span></div>
  <div class="farrow"><span class="flab">anchors</span></div>
  <div class="fstep"><span class="fwho">RUNG 2</span><span class="fdoc">PARALLAX</span><span class="fsm">2 AU baseline; d = 1/p parsecs (Gaia: 1 billion+ stars)</span></div>
  <div class="farrow"><span class="flab">calibrates</span></div>
  <div class="fstep"><span class="fwho">RUNG 3</span><span class="fdoc">CEPHEIDS</span><span class="fsm">Leavitt's period–luminosity law → standard candles</span></div>
  <div class="farrow"><span class="flab">calibrates</span></div>
  <div class="fstep"><span class="fwho">RUNG 4</span><span class="fdoc">SN Ia</span><span class="fsm">Chandrasekhar-limited white dwarf detonations, M_B ≈ −19.3</span></div>
  <div class="farrow"><span class="flab">calibrates</span></div>
  <div class="fstep"><span class="fwho">RUNG 5</span><span class="fdoc">REDSHIFT</span><span class="fsm">v = H₀·d — the Hubble-Lemaître law</span></div>
</div>

#### The governing equations

Parallax — the inverse relation that defined the parsec:

<div class="fx-box">
$$d = \frac{1}{p} \quad (d \text{ in parsecs}, \; p \text{ in arcseconds})$$
</div>

Henrietta Leavitt's Cepheid law and the inverse-square bridge from luminosity to flux:

<div class="fx-box">
$$M_v = -2.81 \log_{10}(P) - 1.43 \qquad F = \frac{L}{4\pi d^2}$$
<div class="fx-cap">Measure the pulsation period → know the intrinsic brightness → solve for d</div>
</div>

And cosmological redshift — stretched photons as a speedometer:

<div class="fx-box">
$$z = \frac{\lambda_{\text{obs}} - \lambda_{\text{emit}}}{\lambda_{\text{emit}}}, \qquad v = cz = H_0 d$$
</div>

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>SYSTEM TRAP · THE HUBBLE TENSION</span>
<p>Planck's early-universe CMB measurement: $H_0 \approx 67.4 \pm 0.5$ km/s/Mpc. SH0ES' local Cepheid+ladder measurement: $H_0 \approx 73.0 \pm 1.0$ km/s/Mpc. The two disagree at <b>greater than 5σ</b> — beyond statistical accident. Either the ladder has a hidden systematic, or ΛCDM is incomplete and pointing toward undiscovered physics: early dark energy, decaying dark matter, exotic geometry.</p></aside>

</details>
`
    },
    {
      id: 's7-2', title: 'Stellar Life Cycles & Cosmic Forges', tags: ['H-R', 'IRON PEAK', 'KILONOVA'],
      md: String.raw`
<p class="hook">Stars are element factories that stop at iron, and everything heavier is forged in rarer, more violent events.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>The atoms in your body were made in stars and stellar collisions.</p></aside>

#### The core idea
- **Burning:** stars fuse hydrogen into helium (the p-p chain or CNO cycle), then helium, carbon, neon, oxygen and silicon in onion-like layers.
- **The Iron Wall:** iron-56 has the peak binding energy per nucleon, so fusing it consumes energy. The core's support collapses and the star explodes as a core-collapse supernova.
- **Beyond iron:** gold, platinum and uranium need the r-process (neutron capture faster than beta decay), seen in neutron-star collisions called kilonovae, first witnessed through gravitational-wave event GW170817.
- **The telescope triad:** the Hubble Deep Field (1995) revealed 3,000+ galaxies in a tiny patch. JWST sees infrared (which passes through dust, and carries redshifted early-universe light) with a 6.5 m beryllium mirror coated with 100 nm of gold. The Event Horizon Telescope linked radio dishes into an Earth-sized aperture and imaged M87\* and Sagittarius A\*.

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Why does fusion stop producing energy at iron?</p>
<details><summary>Show answer</summary><p>Iron-56 sits at the peak of binding energy per nucleon, so fusing it absorbs energy instead of releasing it.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

Stars fuse hydrogen into helium via the **p-p chain** or **CNO cycle**, then climb the Hertzsprung-Russell diagram fusing helium, carbon, neon, oxygen and silicon in concentric onion layers.

#### The Iron Wall

Fusion pays out energy only until the core synthesizes **Iron-56** — the peak of binding energy per nucleon. Fusing iron *consumes* energy; the core's outward radiation pressure starves instantly, and the star detonates as a core-collapse supernova.

Everything heavier than iron — gold, platinum, uranium — requires the **r-process**: neutron capture faster than beta decay, forged in binary neutron-star collisions (**kilonovae**), first witnessed via gravitational-wave event **GW170817**.

<div class="grid4">
  <div class="stat"><span class="stat-n c1">$^{56}$Fe</span><span class="stat-l">Highest binding energy per nucleon — fusion's finish line</span></div>
  <div class="stat"><span class="stat-n c1">GW170817</span><span class="stat-l">Kilonova observed in both gravitational waves and light</span></div>
  <div class="stat"><span class="stat-n c3">3,000+</span><span class="stat-l">Galaxies in the 1995 Hubble Deep Field's pinhead of "empty" sky</span></div>
  <div class="stat"><span class="stat-n c3">6.5 m / 100 nm</span><span class="stat-l">JWST beryllium mirror diameter / gold coating thickness</span></div>
</div>

#### The telescope triad

- **Hubble Deep Field (1995)**: ten days of staring at a blank patch revealed 3,000 galaxies in a frame the size of a pinhead at arm's length.
- **JWST**: infrared vision through dust, a 6.5 m beryllium mirror electroplated with 100 nm of gold (optimal IR reflectivity, 0.6–28 μm), parked at Sun-Earth L2.
- **Event Horizon Telescope**: **VLBI** — atomic-clock-synchronized radio dishes from Chile to the South Pole synthesized a virtual Earth-sized aperture and imaged the event horizons of M87* and Sagittarius A*.

</details>
`
    },
    {
      id: 's7-3', title: 'Exoplanets & the Fermi Paradox', tags: ['TRANSIT', 'RV', 'GREAT FILTER'],
      md: String.raw`
<p class="hook">We find planets by the faint dimming of a star or the wobble it causes, and so far we've found plenty of worlds but no neighbors who talk.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It frames the big question of whether life is common, and what the silence might mean.</p></aside>

#### The core idea
- **Transit method (Kepler, TESS):** a planet crossing its star blocks a little light. The dip is about (planet radius ÷ star radius)². Earth crossing the Sun would dim it by about 0.0084%.
- **Radial velocity:** a planet's tug makes its star wobble, shifting the star's spectral lines (Doppler spectroscopy).
- **The Fermi paradox:** billions of stars and billions of years, yet silence. Where is everybody?
- **The Great Filter:** if the hard step is behind us, the galaxy is ours to seed. If it's ahead, every starfaring dream is a countdown timer.

#### Tap to explore
<div class="tiles">
  <button class="tile"><span class="t-front"><b>FERMI PARADOX</b><span class="t-hint">WHERE IS EVERYBODY?</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>Silence vs. scale</b><span>Billions of stars, many billions of years older than the Sun — yet zero unambiguous technosignatures.</span></span></button>
  <button class="tile"><span class="t-front"><b>GREAT FILTER · BEHIND</b><span class="t-hint">OPTIMISTIC</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>We already passed it</b><span>Prokaryote → eukaryote was a freak accident; the galaxy's silence means the hard step is behind us.</span></span></button>
  <button class="tile"><span class="t-front"><b>GREAT FILTER · AHEAD</b><span class="t-hint">PESSIMISTIC</span><span class="t-hint">TAP TO DECRYPT</span></span><span class="t-back"><b>The wall is future</b><span>Every civilization inevitably destroys itself with its own technology — the silence is a graveyard ahead of us.</span></span></button>
</div>

#### Try it: run your own transit survey

Scrub the orbit, pick the planet, and read the photometer. The depth obeys $\Delta F/F \approx (R_p/R_*)^2$ — the only reason 21st-century hardware can "see" a planet at all:

<div class="interactive-sim" data-sim="transit">
<div class="sim-head"><span class="sim-kick">SIMULATION · PHOTOMETRY</span><b class="sim-title">EXOPLANET TRANSIT PHOTOMETER</b><span class="sim-badge">KEPLER-CLASS</span></div>
<div class="sim-body">
<canvas class="tr-canvas" width="640" height="210" data-mg-el="tr-canvas">Canvas unavailable — photometry requires a browser with canvas support.</canvas>
<div class="mg-row"><label class="mg-lab">ORBITAL PHASE <b data-mg-el="tr-ph">180°</b></label><input type="range" class="mg-slider" data-mg="tr-phase" min="0" max="360" step="1" value="180" aria-label="Orbital phase in degrees"></div>
<div class="tr-radii mg-btn-row">
<button class="btn on" data-mg="tr-planet" data-rad="earth">EARTH-SIZE</button>
<button class="btn" data-mg="tr-planet" data-rad="neptune">NEPTUNE</button>
<button class="btn" data-mg="tr-planet" data-rad="jupiter">JUPITER</button>
</div>
<div class="tr-reads">
<div class="tr-read"><b class="dip" data-mg-el="tr-depth">0.0084%</b><span>TRANSIT DEPTH ΔF/F</span></div>
<div class="tr-read"><b data-mg-el="tr-dmag">0.09 mmag</b><span>DEPTH MAGNITUDE</span></div>
<div class="tr-read"><b data-mg-el="tr-state">MID-TRANSIT</b><span>STATUS</span></div>
</div>
<p class="sim-note dim">Earth transiting the Sun dips 84 ppm — Kepler hunted 40-ppm dips from 10th-magnitude stars, four years of stare included. The curve's y-axis is auto-magnified so you can see what the photometer integrates.</p>
</div>
</div>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>How big is the dip when Earth transits the Sun?</p>
<details><summary>Show answer</summary><p>About 0.0084%, from (R_planet ÷ R_star)².</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

#### Hunting worlds

- **Transit photometry** (Kepler, TESS): a planet crossing its star dims the light curve by the ratio of cross-sectional areas:

<div class="fx-box">
$$\frac{\Delta F}{F} \approx \left(\frac{R_p}{R_*}\right)^2$$
<div class="fx-cap">Earth transiting the Sun: a ~0.0084% dip</div>
</div>

- **Radial velocity** (Doppler spectroscopy): the planet's gravitational tug wobbles the star, shifting its spectral lines:

<div class="fx-box">
$$\Delta v_r \propto \left(\frac{2\pi G}{P}\right)^{1/3} \frac{M_p \sin i}{M_*^{2/3}}$$
</div>

#### The silent skies

</details>
`
    },
    {
      id: 's7-4', title: 'Universe Breakers: JWST at Cosmic Dawn', tags: ['JWST', 'Z>10', 'ΛCDM'],
      md: String.raw`
<p class="hook">Webb found galaxies so big and so early that they strained our models, until careful measurements separated real surprises from false alarms.</p>

<aside class="co key"><span class="co-tag"><span data-sprite="star" data-px="12"></span>WHY IT MATTERS</span>
<p>It's a live lesson in how science treats big claims: spectra beat photos.</p></aside>

#### The core idea
- **The record:** spectroscopy has confirmed galaxies at cosmic dawn with redshifts beyond z = 13 (including z = 13.32 and z = 14.32). Their light has been stretched into the infrared by billions of years of expansion, which is why JWST observes in infrared.
- **The shock (February 2023):** Ivo Labbé's team announced six candidates at z ≈ 8–10 with stellar masses up to 10¹⁰ solar masses, within 500 million years of the Big Bang. "Universe breakers" became the nickname.
- **Why it strains models:** standard ΛCDM builds structure small-first, and these galaxies would need baryon conversion efficiency near 100%.
- **False alarms:** CEERS-93316 looked like z ≈ 16.4 but spectroscopy showed z = 4.9. Some of Labbé's six turned out to be tighter knots, AGN cores or lensing-boosted masses. The confirmed record, GS-z14-0 (290 Myr after the Big Bang), still strains models.

<aside class="co warn"><span class="co-tag"><span data-sprite="shield" data-px="12"></span>WATCH OUT · SPECTROSCOPY OR IT DIDN'T HAPPEN</span>
<p>Photometric redshift is a photograph of a rumor. Spectroscopic redshift is a sworn deposition.</p></aside>

<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>CHECK YOURSELF</span>
<p>Why was the "z = 16.4" claim for CEERS-93316 dropped?</p>
<details><summary>Show answer</summary><p>One spectroscopic measurement showed it was a z = 4.9 galaxy whose emission line had mimicked the high-redshift signal.</p></details></aside>

<details class="deep"><summary>Go deeper: the full technical story</summary>

The James Webb Space Telescope was designed to see the first galaxies. It complied — and then overshot the schedule of the universe itself. In its first two years, spectroscopy pushed confirmed redshifts past $z = 13$:

<div class="grid4">
  <div class="stat"><span class="stat-n c1">z = 13.32</span><span class="stat-l">GS-z13-0 — light from ~320 Myr after the Big Bang</span></div>
  <div class="stat"><span class="stat-n c1">z = 14.32</span><span class="stat-l">GS-z14-0 — ~290 Myr after the Big Bang, shockingly luminous</span></div>
  <div class="stat"><span class="stat-n c3">z = 11.4</span><span class="stat-l">Maisie’s Galaxy — spectroscopically confirmed 2023</span></div>
  <div class="stat"><span class="stat-n c3">6</span><span class="stat-l">Massive early candidates in Labbé et al. 2023 — "too big, too early"</span></div>
</div>

#### The problem with too much, too early

February 2023: Ivo Labbé's team announced six galaxy candidates at $z \approx 8$–10 with stellar masses up to $10^{10}\,M_\odot$ — <b>as massive as the Milky Way's early self, assembled within 500 million years of the Big Bang.</b> His quote ran worldwide: <i>"We were like, 'these are breaking the universe — what's going on?'"</i> — and "universe breakers" stuck as the nickname. The tension is quantitative: standard $\Lambda$CDM structure formation builds dark-matter halos hierarchically — small things first — and those halo assembly rates struggle to host such massive, mature stellar systems so soon. Baryon conversion efficiency would need to run near <b>100%</b>: virtually every gas atom that fell in became a star, which no feedback model comfortably permits.

#### Hype filtered from breaking

The discipline of spectroscopy (and JWST's own gravitational lensing surveys) has since pruned the field. Early photometric shockers at $z \sim 16$+ resolved into lower-redshift interlopers — CEERS-93316, the famous "z = 16.4 galaxy", turned out to be a $z = 4.9$ galaxy whose oxygen emission masqueraded as Lyman-break color. Some of Labbé's six resolved into tighter knots, AGN cores or lensing-boosted masses. But the *confirmed* edge — GS-z14-0, absurdly bright 290 Myr in — still strains models. The survivors demand at least one of: a top-heavy early IMF, wildly suppressed early feedback, efficient early black-hole seeds, or a warmer early universe.

</details>
`
    }
  ],
  quiz: {
    title: 'SECTOR 07 · EVALUATION', desc: 'Ladders, forges, silence', icon: 'moon', next: 'sec8', qs: [
      { q: 'Stellar parallax computes distance as…', opts: ['$d = p$ parsecs', '$d = 1/p$ parsecs for parallax angle p in arcseconds', '$d = p^2$ light-years', '$d = 2p$ AU'], a: 1, why: 'Using a 2 AU baseline, nearby stars shift against the backdrop; the parsec is defined as the inverse of the parallax angle.' },
      { q: 'Leavitt\u2019s Law connects a Cepheid\u2019s…', opts: ['Color and temperature', 'Pulsation period and intrinsic luminosity', 'Mass and radius', 'Metallicity and age'], a: 1, why: 'Measure the period → know the luminosity → compare with observed flux via F = L/(4πd²) → distance solved.' },
      { q: 'Type Ia supernovae work as standard candles because…', opts: ['They are the brightest explosions in the universe', 'They detonate at the Chandrasekhar mass limit, giving a uniform peak magnitude (M_B ≈ −19.3)', 'They recur every 100 years', 'Their spectra contain no hydrogen'], a: 1, why: 'Accreting white dwarfs all ignite at ~1.44 M☉ — same fuse length, same luminosity.' },
      { q: 'Fusion stops releasing energy at…', opts: ['Helium', 'Carbon', 'Iron-56', 'Uranium'], a: 2, why: 'Iron-56 has the highest binding energy per nucleon; fusing it consumes energy, so the core collapses instantly.' },
      { q: 'Gold and platinum originate chiefly from…', opts: ['Ordinary stellar fusion', 'The r-process in neutron-star collisions (kilonovae) such as GW170817', 'Supernova shock waves alone', 'Primordial nucleosynthesis'], a: 1, why: 'Elements heavier than iron need neutron capture faster than beta decay — kilonovae are the primary forge.' },
      { q: 'JWST observes in the infrared partly because…', opts: ['Infrared telescopes are cheaper to build', 'Early-universe light has been redshifted by billions of years of expansion, and IR penetrates dust', 'Stars emit only infrared', 'The Sun blocks visible light at L2'], a: 1, why: 'Cosmic dawn photons are stretched into the infrared; its 6.5 m gold-coated (100 nm) beryllium mirror is optimized for 0.6–28 μm.' },
      { q: 'The Event Horizon Telescope imaged M87* using…', opts: ['A single 100-meter dish in Chile', 'Very Long Baseline Interferometry across atomic-clock-synced telescopes planet-wide', 'X-ray optics aboard the ISS', 'Gravitational-wave detectors'], a: 1, why: 'VLBI synthesized an Earth-sized virtual aperture — resolution sharp enough to resolve an event horizon.' },
      { q: 'The Hubble Tension is the >5σ disagreement between…', opts: ['Hubble and JWST mirror shapes', 'Early-universe (CMB/Planck) and local (Cepheid/SN Ia) measurements of H₀', 'Two measurements of the Sun\u2019s age', 'Dark matter detectors'], a: 1, why: '67.4 vs 73.0 km/s/Mpc — the discrepancy suggests ΛCDM may be incomplete, pointing toward new physics.' },
      { q: 'JWST\u2019s spectroscopically confirmed z>10 galaxies (GS-z13-0, GS-z14-0) strain…', opts: ['The speed of light', 'ΛCDM hierarchical halo assembly — massive mature galaxies appear too early', 'The periodic table', 'Only stellar physics'], a: 1, why: 'Baryon conversion efficiency near 100% within 300 Myr is hard for feedback models; the "universe breakers" nickname came from Labbé\u2019s team.' },
      { q: 'The famous CEERS-93316 "z≈16.4 galaxy" was eventually shown to be…', opts: ['A quasar at z=20', 'A z=4.9 interloper whose oxygen emission mimicked the Lyman break', 'A lensing artifact with no real counterpart', 'Two galaxies superimposed'], a: 1, why: 'Spectroscopy collapsed the redshift by ~11 units — photometric redshift is a rumor until an emission line is measured.' }
    ]
  }
}
];
