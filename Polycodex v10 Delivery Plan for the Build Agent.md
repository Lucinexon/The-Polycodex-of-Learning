Polycodex v10: Delivery Plan (Revised)
For the build agent and the owner · Oct 28, 2026 · Replaces the earlier v10 delivery plan · Baseline: main after PR #6 (lounge overhaul), as described by the earlier plan

0. How to use this document
Reading order. §1 sets the intent and resolves conflicts with the earlier plan. §2 lists the inherited audit claims you must verify. §3–4 cover creative direction and screen specs. §5 covers the lesson lifecycle. §6 covers curriculum. §7 covers data and persistence. §8–9 cover performance and the Lounge. §10 has the contracts. §11 is the recon checklist. §12 is the milestones. §13 is the test matrix. §14 is scope control. §15–16 are risks and decisions. §17 is the definition of done.

Labels used throughout.

Label	Meaning
P0	Core. Required for the gate it belongs to. Never cut.
P1	Important polish. Expected by G2/G3; cut only via §14.
P2	Optional creative extra. Build only when every P0/P1 at the current gate is green.
RECON	An unverified claim from the planning documents. Inspect the repo before you rely on it. If reality differs, use the stated Safe default and note it in docs/v10/recon.md.
AC-x	An acceptance criterion. It must be observable and, where possible, automated.
Quality pillars, in priority order. When two pillars conflict, the higher one wins:

Content integrity. No lesson material is lost, silently altered or fabricated.
Progress correctness. Nothing is forgotten, duplicated or falsely shown as saved or complete.
Learning usability. Learners can find, follow, resume, practise and revisit content without friction.
Visual polish. A distinctive, coherent, premium look and feel.
Performance is not a pillar to trade against the others. It is a gate: nothing ships over budget.

Working rules. Write contracts before code. Build one vertical slice before scaling. Measure before optimizing. Stop at every gate and report. A beautiful lesson screen that loses content or forgets progress counts as a failed design.

1. Product intent and non-negotiables
1.1 Mission
Turn the Codex from a lore library with a game attached into a learning game whose world is the curriculum. The ocean stops being wallpaper and becomes the map. Depth is difficulty, and descending is progress.

1.2 Who it is for (inferred from the baseline; owner confirms in §16)
New learners, grades 6–12 plus first-year college. They are often on low-end phones and short sessions, and need a clear path more than a library.
Existing Codex users who came for the lore lessons. They must not lose access to the 42 lessons or to their progress.
The owner and reviewers, who author, review and maintain content with finite time.
1.3 Observable outcomes
#	Outcome	Proven by
O1	A learner follows a clear path from school foundations to first-year college in the Wave 1 subjects. Lessons are short, original and mapped to standards.	Wave 1 units live and human-reviewed (G2)
O2	The first screen feels like a game's title screen. A returning learner is back in their lesson within 2 taps.	AC-T3, AC-L10
O3	Lessons feel like a learning product: objectives, bite-sized cards, retrieval, feedback, resume, review.	§5 ACs
O4	Progress is never lost, duplicated or faked across refresh, tabs, offline use and migration.	§7 ACs, migration fixtures
O5	All 42 existing lessons survive intact as Wrecks: directly browsable, and also bridged to the new path.	AC-W1–W6, content-integrity checks
O6	It runs smoothly on a low-end phone and stays within budget.	§8 budgets, G1/G3 device pass
O7	It is accessible: WCAG 2.2 AA contrast, full keyboard path, screen-reader labels, reduced motion, 44 px targets.	§13 a11y rows
O8	Unrelated features keep working: chat, avatar, Lounge, notebook, flashcards, account and cloud sync.	Existing ~120 Playwright specs green on all three browsers at gates
1.4 Decisions that revise the earlier plan (challenged and resolved)
Earlier plan	Revision	Why
§2 audit findings were "verified in the repo".	Treated as RECON claims (§2, §11).	The planning environment could not inspect the repo.
The 42 lessons become optional Wrecks "unlocked as a reward".	Wrecks are always browsable from the Reef Map's Wreck layer and are never locked. Bridging adds reward links on top.	Locking content that existing users already had is a regression and a trust break.
The Dive player has "at most four persistent controls".	Five, in two fixed groups. Top: Exit, Progress, Lantern. Bottom: Back, Next.	A gesture-only "previous" fails WCAG 2.5.1 (pointer gestures need a single-pointer alternative). A visible Back is cheap and expected.
Units unlock strictly by prerequisites, with a test-out.	Soft prerequisites. Uncharted units open via test-out or "Dive anyway" (one confirm, no penalty).	Hard locks frustrate strong learners and returning users. Recommendation beats restriction.
Pixel display face plus Atkinson Hyperlegible plus "mono for numbers and code", alongside "two families at most".	Two downloaded families (pixel display plus Atkinson Hyperlegible). Code uses the system monospace stack. Numbers use Atkinson with tabular-nums.	This resolves the three-families-versus-two contradiction at zero download cost.
"Progress store v2 (cx_v10_progress)" plus a "legacy mirror".	One writer module (CodexProgress), with a storage decision rule (§7.1). v10 never writes legacy keys before cutover. Legacy import is incremental and idempotent.	The mission bans a second, conflicting store. The baseline's "mirror" was undefined and risky.
The card schema had no ids.	Cards, checks and prompts carry stable ids, and each dive carries a rev.	Resume, dedupe and content updates are impossible to do safely without stable ids.
"Fresh-context reviewer, then human sign-off", but nothing in the schema enforces it.	Each dive has status: draft | reviewed | published. Production shows only published.	This makes the review gate mechanical, not aspirational.
The Phase 1 lounge room was unspecified ("one lounge room wired both ways").	Kitchen (an existing room, already mapped to Number: ratios and scaling) with a Tune activity, "Recipe Scaler". RECON: confirm that Kitchen exists.	Reusing an existing room de-risks G1. No new room geometry is needed before the slice is proven.
Practice "inline or in a Lounge room".	Every practice must be completable inline. The Lounge is an optional richer venue.	The Lounge may need network or third-party SDKs, and a lesson must never be blocked by them.
Title screen budget of ≤150 KB gz JS, with legacy staying in the same index.html.	The flag must be decided before legacy scripts load (§11, R-BOOT).	Otherwise the budget is unmeasurable while legacy scripts load eagerly.
P0.4 "verify by reading each lesson", alongside "never load js/data/* into context".	Verify via a script-extracted digest (ids, headings, first paragraph, word counts, hashes). Read individual lessons only by targeted view.	This resolves the contradiction and keeps the agent's context bounded.
"KaTeX parses" as a Node lint step.	The KaTeX check runs in the Playwright browser against the app's own KaTeX copy.	KaTeX reportedly comes from a CDN, so a Node check would need a new dependency.
The Reef Map is the primary navigation.	List-first under 600 px, chart-first at 1024 px and wider.	A tappable map on a 360 px screen is a poor navigation surface.
2. Inherited audit claims (RECON: verify before relying on them)
These come from the earlier plan and could not be verified here. M0.1 confirms or corrects each one in docs/v10/recon.md, using greps, file sizes and targeted views.

Content

10 sectors and 42 lessons, about 287 KB of data (95 KB gz), all lore-framed: internet lore, gaming folklore, AI, geopolitics, anthropology, physics, astronomy, psychology, big history and aesthetics. There is no path for algebra, geometry, calculus, statistics, biology, chemistry, writing, civics or economics. Physics, astronomy and psychology enter through advanced angles (the Chandrasekhar limit, Hellings-Downs, Kahneman) with no on-ramp.
There are no prerequisites, grade bands or standards metadata. Progress is sector-level (S.completed[sectorId], one quiz per sector).
Lessons are markdown strings with inline HTML, loaded eagerly. They follow a recurring shape (hook, why it matters, check yourself, go deeper). The prose is jargon-dense and unscaffolded.
None of the roughly 120 Playwright tests cover lessons, quizzes, XP or search. They cover the Lounge, avatar and chat.
UI

The top bar has 13 controls. The sidebar has a profile card and 19 nav items. Home has 4 cards plus 5 buttons. Energy, probes, dispatch, streak, badges, XP and the Lounge XP cap all compete for attention.
There are six stacked stylesheets (195 KB, 42 KB gz): style, codex-plus, v6, v7, lounge-play and lounge-world. Only lounge-world.css has a real token layer (--lg-*).
The look reads as generic AI sci-fi: scanlines, grid overlay, glow borders, glass panels and uppercase mono microcopy.
Performance

First load is about 1.15 MB of local JS (371 KB gz) plus eager CDN loads: three Firebase compat SDKs, Supabase, KaTeX, marked, DOMPurify, Prism plus 7 add-ons, MiniSearch, confetti, three Google font families, an icon font and extra CDN CSS. network.js references both Firebase and Supabase.
style.css has 15 backdrop-filter, 24 blur() and 99 box-shadow declarations. These sit over a full-screen animated canvas (ocean.js, 30 fps, DPR ≤1.5) and the Lounge canvas. rAF appears in 11 files and setInterval in 6.
There is no device-tier logic. Only prefers-reduced-motion is honoured.
Assets worth building on

Lounge registries and seams: registerRoom, addHotspot, setSpawn, defIx, CodexLoungeGames.register, CodexLoungeConsole.registerTab, registerArt/decorate. There is a versioned ledger and --lg-* tokens, and docs/lounge-architecture.md §8 reserves a "v10" redesign.
Mini-games that echo curriculum ideas: Celestial Survey, Ecosystem Keeper, Archive Cipher and Order Up.
NPCs Mira, Orrin and Wren, driven by the wall clock at zero network cost.
engine.js helpers mdBlock, typeset, sfx and save. The SRS store is cx_v5_srs. The state keys are polymath_codex_v1 and cx_lounge_world_v1. The sync hook is NetworkEngine.onStateSave.
playwright.config.js defines Chromium, Firefox and WebKit projects, but reportedly only Chromium has been verified.
3. Creative direction
3.1 Visual thesis: "The Expedition Kit"
You are on an expedition into a living ocean, and the interface is your dive kit. Water is where you are. Paper is what you keep.

Water (cool, deep, quiet) is the world: the Title scene, Reef Map, Descent and Lounge. Its colour shifts with depth: Shallows are bright teal and the Abyss is near-black with bioluminescent life in the illustrations.
Paper (warm, matte, solid) is everything you hold: the dive slate you read lessons on, the Logbook, specimen cards and review cards.
Lantern amber is your one light source. It marks the primary action, hints and rewards, and nothing else.
Why this direction fits. Polycodex already owns an ocean, pixel-art sprites and a Lounge with NPCs. The problems are that the ocean is decorative and the chrome is borrowed from sci-fi dashboards. An expedition kit turns each existing asset into a functional object:

Existing asset	Functional object
Ocean	Map and progress
Top bar	Dive computer
Notebook	Logbook
Hints	Lantern
Search	Sonar
The direction is also cheap to render. Solid surfaces, hard shadows and static illustration are exactly what low-end phones handle well, so the aesthetic and the performance budget push the same way.

Emotional character. Calm curiosity, quiet competence and small wonder. Think a field naturalist's notebook crossed with a well-made indie game menu. It should never feel like a control-room console, a SaaS dashboard or a children's app.

3.2 Design principles
Diegetic, not dashboard. UI elements are objects in the world: dive computer, slate, lantern, sonar, logbook, depth gauge.
One primary action per screen, always lantern amber and always within thumb reach on phones.
The reading surface is solid and calm. There is no glass, blur or motion behind text, and the ocean recedes during lessons.
Composition and contrast before decoration. Hierarchy comes from size, weight, placement and the water/paper contrast. Ornament is the last resort.
Chunky and hand-authored. Solid panels, 2 px borders and hard offset shadows with no blur. Pixel art for illustration and display only. Readable type for everything else.
Motion explains state. Use transform and opacity only, keep it short, gate it by FX tier and reduced motion, and never block input.
Plain names. No faux-terminal microcopy (see the naming map in §3.10).
Honest status. Saved, synced, offline and failed states are always truthful and distinguishable.
Remove everywhere: scanlines, grid overlay, glass blur, glow borders, cyan glow, uppercase mono microcopy, the multi-badge HUD and streak-guilt patterns.

3.3 Signature motifs (few, used consistently)
Motif	Where	Rule
Bathymetric contour lines	Reef Map, Title backdrop, empty states, Logbook endpapers	Replaces the old grid overlay. It is static SVG, drawn in one line colour per zone at 1–2 px.
Depth gauge	Descent rail, dive computer, Surface	Progress expressed as metres within the current reef. It ticks down when a dive is completed.
The slate	Dive cards, Wreck reader	A matte paper panel with a 2 px ink border and a hard 4 px shadow.
The lantern	Primary buttons, hint/glossary button, rewards	Amber is reserved for this. A screen never shows more than one amber filled button.
Sonar ping	Search	One concentric ring on focus (≤400 ms, High/Med tier only).
Logbook stamps	Surface results, Logbook progress	A pixel "SURFACED · date" stamp. The stamp animation uses stepped easing.
Specimen cards	Collectibles (species log)	A procedural pixel creature on paper, with a short real fact and source attribution.
Lamps	Lounge scenery, unit sheet	A lit lamp marks a concept that has reached Recalled.
3.4 Tokens (css/v10/tokens.css, contract C3)
The hex values are starting points. M1a must verify every text/background pair with the contrast script (§13). Change a value if it fails, but keep its role.

Colour roles

Token	Start value	Role
--c-water-0	#1b5e73	Shallows surface, top of the gradient
--c-water-1	#0f3a52	Twilight; raised panels on water
--c-water-2	#0a2238	Midnight; the default app background
--c-water-3	#060e1a	Abyss
--c-mist	#c9d7e0	Secondary text on water
--c-foam	#f2f6f8	Primary text on water
--c-paper	#f4ecd8	Slate and Logbook surface (day)
--c-paper-2	#e7dbbf	Paper inset and dividers
--c-ink	#1a1d22	Text on paper; borders
--c-ink-2	#4a4f57	Secondary text on paper
--c-slate-night	#17212c	Slate surface in Night mode
--c-lantern	#ffb547	Primary action fill, focus ring, rewards
--c-lantern-ink	#1f1405	Text on a lantern fill
--c-coral / --c-coral-ink	#ff7a6b / #a8281c	Error on water / error on paper
--c-kelp / --c-kelp-ink	#7fd18b / #2c6a37	Correct or mastered on water / on paper
--c-biolum	#9be7d8	Illustration only (scene life, map markers). Never used for borders, glows or text.
--c-shadow	#02060c (water), #1a1d22 (paper)	Hard shadows
Each zone sets data-zone="shallows|twilight|midnight|abyss" on the shell root. That attribute remaps --c-bg, --c-bg-raised and --c-line, so the whole chrome tints with depth. On Low and Off tiers the change is instant; elsewhere it fades over 600 ms.

Type

Display: one OFL-licensed pixel face (candidates: Pixelify Sans, Silkscreen, VT323; choose in G1a after checking the licence and glyph coverage). Use it only for the logo, screen titles, reef names, the depth readout and stamps. Render at integer multiples of its design grid, at 20 px or larger, and never for sentences.
Reading and UI: Atkinson Hyperlegible (self-hosted and subset). Body text is 18 px on phones and 19 px on desktop, with line-height 1.55 and a maximum measure of 66ch.
Code: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace (no download).
Numbers: font-variant-numeric: tabular-nums on gauges, timers and scores.
Scale:
Token	Size
--fs-1	14
--fs-2	16
--fs-3	18 (body)
--fs-4	22
--fs-5	28
--fs-6	36
--fs-d1 / --fs-d2 / --fs-d3	32 / 48 / 64 (display)
Text-size setting: three steps (100%, 115%, 130%) that scale the --fs-* tokens. Layouts must reflow without clipping at 130%.
Space, shape and elevation

Group	Tokens
Spacing	--sp-1…8 = 4, 8, 12, 16, 24, 32, 48, 64
Radii	--r-0 0, --r-1 4, --r-2 8 (panels), --r-pill 999 (chips and rings only). No large rounded corners.
Borders	--bw 2px solid. Use solid colours only, with no alpha over moving backgrounds.
Elevation	--e-0 none; --e-1 2px 2px 0 var(--c-shadow); --e-2 4px 4px 0 var(--c-shadow). No blur, ever.
Pressed	transform: translate(2px,2px) and the shadow steps down one level, for a tactile, physical press.
Motion durations	--dur-1 120ms, --dur-2 180ms, --dur-3 280ms, --dur-4 600ms
Easing	--ease-out cubic-bezier(.2,.8,.2,1); --ease-step steps(4) (pixel-flavoured reward frames)
Z-index	--z-scene 0, --z-content 10, --z-hud 20, --z-sheet 30, --z-toast 40, --z-modal 50
Lounge aliases	--lg-* points at these tokens, so the Lounge inherits the new look without a rewrite (RECON: list the --lg-* names first).
3.5 Iconography and illustration
Icons use the existing inline SVG sprite system (RECON: check coverage; this replaces the icon-font CDN). They sit on a 16 px grid with 2 px strokes and square caps. Navigation icons always carry a visible text label; icon-only buttons need an aria-label and a tooltip on hover or focus.
Illustration is procedural (SVG, or canvas painters). ocean.js remains the scene generator. A Playwright-driven script (scripts/render-scenes.js, using the existing dev dependency) pre-renders one WebP per zone (≤60 KB each) for the Med, Low and Off tiers.
Specimen art is procedural pixel sprites, seeded by the collectible id.
3.6 Information density by surface
Surface	Density	Rationale
Title, Dive card	Very low	One decision, or one idea.
Reef Map, Descent	Medium	Orientation: where am I and what is next.
Surface	Medium-low	Results, then one clear next step.
Logbook, Search	Higher	Reference and management; tables and lists are acceptable.
3.7 Themes
The earlier plan defines no light/dark theme (RECON: check whether legacy has a theme toggle; if it does, map it to the slate setting).

Chrome is depth-driven, not theme-driven. The world gets darker as you descend. This is the product's thesis, so the app does not get a full light theme in P0.
The slate has Day and Night modes. Day is paper with ink text. Night is --c-slate-night with paper-coloured text. The default follows prefers-color-scheme, and the learner can override it in Logbook > Settings (P0).
High-contrast slate (pure white or black, 3 px borders) is P1.
3.8 Responsive system
Range	Name	Layout rules
< 600 px	Narrow (phone)	One column. The primary action sits in a bottom bar with env(safe-area-inset-bottom). Sheets slide up from the bottom. The Reef Map is list-first.
600–1023 px	Medium (tablet, landscape phone)	Two panes where useful (Descent plus the unit sheet as a side panel). Dive card max 640 px, centred.
≥ 1024 px	Wide (desktop)	The Dive player gets an optional left outline rail and a right Lantern drawer that pushes content rather than overlaying it. The Reef Map is chart-first. Full keyboard shortcuts.
The required test viewports are 360×640, 390×844, 640×360 (landscape phone), 768×1024, 1280×720 and 1440×900.

Sticky UI must never take more than 15% of the viewport height on narrow screens. The Wreck reader header hides when scrolling down and reappears when scrolling up.

3.9 Interaction language
Control states (every interactive element)

State	Treatment
Default	Solid fill or outline, 2 px border, --e-1
Hover (pointer only)	Shadow grows to --e-2 and the element lifts by translate(-1px,-1px)
Focus-visible	3 px --c-lantern outline at 2 px offset. It is never removed, and it sits on top of the hover style.
Pressed	translate(2px,2px) with --e-0
Disabled	40% ink-on-paper contrast, no shadow, aria-disabled, plus a reason shown on tap ("Answer the prompt first" or "Coming in Wave 2"). Never a silent dead button.
Loading	The label stays and a stepped pixel ellipsis is added. Width stays fixed (no layout shift).
Touch targets are at least 44×44 CSS px, with at least 8 px between adjacent targets.

Microinteractions (the full list; do not add others without a reason)

Moment	Motion (High/Med)	Low/Off and reduced motion
Screen change, going deeper (Map → Descent → Dive)	New screen rises from below while the background darkens, 280 ms	120 ms crossfade on Low; instant on Off or reduced motion
Screen change, going back up	Reverse direction, 280 ms	Same fallbacks
Card advance	Slide 24 px plus fade, 180 ms	Instant swap; focus moves to the card heading
Correct answer	Kelp check-stamp, 4 stepped frames, 150 ms	Static stamp
Wrong answer	A coral underline appears and the explanation expands, 180 ms. No shake.	Instant
Dive surfaced	Depth gauge ticks to the new depth (≤800 ms), then the stamp lands	Final values shown instantly
Collectible reveal	Paper card flips, ≤1.2 s, skippable with a tap or any key	Card shown face-up
Search focus	One sonar ring, 400 ms	None
Save status	"Saved" fades in 1.5 s after the change settles	Same, without the fade
Rules:

No animation delays input. A tap during a transition completes the transition immediately.
Nothing loops continuously outside the active interaction on the Low tier.
Every rAF loop runs through CodexLoop (§8).
Loading, skeleton and empty conventions

Skeletons are static "sonar outline" blocks in --c-bg-raised. There is no shimmer. The High tier gets one slow pulse.
Loading text: if a load takes more than 300 ms, show specific text such as "Loading Ratios · Dive 3…". After 8 s, show the reason and actions ("Still loading. You may be offline." with Try again and Back).
Empty states are illustrated with contour lines plus one sentence and one action. They never show a blank panel.
3.10 UI copy and naming map
Copy uses second person, plain verbs and sentence case. Errors say what happened, what is safe, and what to do next.

Legacy	v10
Dispatch	Daily Dive
Operator Console	Settings
Query the codex…	Search (Sonar)
Sectors	Reefs (new curriculum) and Wrecks (legacy lessons)
Void Trial	Zone Trial (legacy exam kept as a Wreck challenge)
Neural Matrix / Flashcards	Review
Sys-Log	Logbook > Reference
Chrono Matrix	Sequence activity (Chronicle Reef)
3.11 References (study their grammar; never copy their assets)
Hades, Stardew Valley and Hollow Knight: menu simplicity, and a hub that works as the menu.
Subnautica and Abzû: depth as progression, and the palette shifting with depth.
Duolingo: path clarity. Avoid its streak-guilt patterns.
Animal Crossing: a hub that reflects the time of day.
Field guides and naturalists' notebooks: paper artifacts, stamps and specimen plates.
4. Screen specifications
Routing (P0). v10 uses hash routes so that refresh, deep links and the browser Back button all work:

Route	Screen
#/	Title
#/map	Reef Map
#/reef/<reef>/<zone>	Reef Descent
#/unit/<unitId>	Unit sheet
#/dive/<diveId>/<cardId>	Dive player
#/surface/<diveId>	Surface
#/wreck/<lessonId>/<anchor>	Wreck reader
#/logbook/<tab>	Logbook
#/search?q=	Search
Screen changes use pushState. Card changes use replaceState, so moving through cards does not flood the history. RECON: check whether legacy uses hash routing. Safe default: namespace the routes as #/v10/....

UI build order (highest impact first):

Dive player
Surface
Descent and the unit sheet
Title and Continue
Save-status and error system
Reef Map
Wreck reader
Logbook
Search
Review and Daily Dive
Lounge handoff polish
4.1 Title screen
Purpose: a game start screen, and the fastest possible route back into learning.

Layout.

One pre-rendered zone scene (the learner's current depth) and the pixel logo.
Four large stacked items: Continue (default focus), Dive (Reef Map), Lounge and Logbook.
Corner icons: sound, graphics quality and account.
Narrow screens: the items are stacked full-width in the lower half, within thumb reach. Wide screens: the items sit left-aligned over the scene, which reads as a menu.
No search bar, XP bar or streak on this screen.
Continue label: shows the exact location, for example "Number Reef · Ratios · Dive 3 · Card 4 of 7". Enter or a tap activates it. The scene has gentle idle motion on High only, and ambient audio is off by default.

State	Behaviour
First visit (no progress, no legacy data)	Begin replaces Continue and opens onboarding (§4.2).
Returning, dive in progress	Continue resumes that dive at the saved card.
Returning, nothing in progress	Continue reads "Next: <dive>" and starts the next recommended dive.
Reviews due	A small chip on Logbook ("6 to review"). It never blocks Continue.
Legacy user, first v10 visit	A one-time paper card: "Your progress moved into the Logbook: N lessons read, N XP, N review cards. Your 42 lessons are now Wrecks on the map." Buttons: Got it and Show me Wrecks.
Loading	The static scene and logo paint first (they are the LCP). Menu items appear when the progress store has loaded (target ≤300 ms). There is no spinner.
Store unreadable or corrupt	Continue changes to "Start fresh (your old save is backed up)", with a Details link. The raw data is never overwritten (§7.6).
Save failing (storage blocked)	A persistent coral banner: "Progress can't be saved on this device right now." Actions: Why? and Try again.
Offline	A small corner indicator only. Cached content works normally.
AC-T1: On the throttled profile, the Title screen reaches LCP ≤2.5 s with zero third-party scripts loaded.
AC-T2: Continue's label matches the actual resume target in 100% of resume tests.
AC-T3: From the Title screen, a returning learner reaches their saved card in 1 tap (Continue). From a cold app start, it takes at most 2 interactions.
AC-T4: All four items and the corner icons are reachable and activatable by keyboard alone, with a visible focus ring.
4.2 Onboarding (first dive)
Goal: a new learner reaches the first card in ≤3 taps and ≤30 seconds, with no account required.

"Where do you want to start?" Six reef tiles: Wave 1 tiles are live. Not-yet-built reefs appear as non-interactive "Charting soon" tiles, each with one line describing what they will cover.
"How deep?" Three choices: "Grades 6–8 (Shallows)", "Grades 9–10 (Twilight)" and "Not sure, start shallow" (the default). Picking a depth leads into the first unit's first dive. The test-out is offered on the unit sheet, not forced here.
Skip sends the learner to Number Reef · Shallows · Unit 1.
There is no survey, name prompt or permission prompt.

4.3 Reef Map (#/map)
Purpose: orientation across subjects and depth, plus the home of the Wrecks.

Wide: a bathymetric chart (SVG) showing six reef outlines. Each live reef shows its name, a progress fill along its contour, and the learner's marker. Planned reefs appear as dashed outlines labelled "Charting in Wave 2". A Wrecks layer toggle shows the 42 legacy lessons as wreck markers clustered by their legacy sector.
Narrow: a list of reef cards (each with a mini contour glyph, the current zone, "3 of 12 dives surfaced" and a status chip). Underneath is a Wrecks section listing the 10 legacy sectors, which expand into their lessons.
Semantics: whatever the visual, the content is a navigable list (<nav> containing <ul>). The chart is an enhancement.
State	Behaviour
First visit	The recommended reef is highlighted. Wrecks default to collapsed.
Populated	Per-reef progress, the last-visited reef first on narrow screens, and Wrecks marked "Read" or "Charted (legacy)" where legacy completion exists.
Loading the manifest	Skeleton reef cards. The manifest is small and cached.
Manifest failed	"Couldn't load the map." Actions: Try again, plus Open your last dive if one is cached.
Planned reef tapped	A non-modal note explaining what's coming. It is never presented as a working, interactive tile.
AC-M1: All 42 Wrecks are reachable from the Map in at most 3 taps, with none locked.

4.4 Reef Descent (#/reef/<reef>/<zone>) and the unit sheet
Purpose: see the path, see where you are, and pick the next unit.

Narrow: a vertical <ol> of unit cards (72 px minimum height) beside a 24 px depth rail on the left. Thermocline bands mark zone boundaries, with the colour shifting at each one. The current unit gets a lantern marker, and the page opens scrolled to it.
Wide: the same list rendered over a cross-section illustration, with units as stations on a descending line. The unit sheet opens as a right-hand panel rather than covering the list.
Unit card states (each has an icon and a text label; colour is never the only signal):

State	Display
Charted, not started	Outline
In progress	Lantern marker and "Dive 2 of 5"
Surfaced	Logbook stamp
Mastered (all concepts Recalled)	Lit lamp
Tested out	Stamp reading "Tested out"
Uncharted (prerequisites unmet)	Dashed outline and "Recommended after: Fractions"
The unit sheet (a bottom sheet on narrow screens, a side panel on wide ones) contains:

Title, the reef and zone breadcrumb, and the time estimate.
"You'll be able to…", with 2–4 objectives from the content.
The dive list, with an estimated time and a status for each dive.
Prerequisites, as links.
The collectible preview as a silhouette.
Linked Wrecks.
The primary action: Start, Continue Dive N or Review.
Secondary actions: Test out (3 questions) and, for uncharted units only, Dive anyway.
AC-D1: The Descent opens scrolled to the current unit, and the current unit's card is fully visible at 360×640.

4.5 Dive player (#/dive/<diveId>/<cardId>): the core screen
Layout (narrow).

Top strip (48 px): Exit (icon plus "Descent" label) on the left. Progress in the centre: a segmented line, "3 / 7"; tapping it opens the outline sheet. Lantern on the right: hints, glossary and note.
Body: the slate card fills the space between the strips. The slate scrolls internally if its content overflows; it never clips.
Bottom bar (64 px plus safe area): Back (secondary, small) and Next (primary, lantern, wide).
Swipe left/right mirrors Next/Back. Background: a static, dimmed zone scene. The ocean canvas is paused.
Layout (wide).

The slate is centred at a 680 px maximum.
An optional left outline rail lists each card's title with a visited or prompt-done check. It is collapsible, and the choice is remembered.
The Lantern opens a 320 px right drawer that pushes the slate rather than overlaying it.
Keyboard:

Key	Action
← / →	Previous / next card
Enter	Activate the primary action
1–4	Choose an answer option
H	Open the Lantern (hint)
G	Open the glossary
O	Open the outline
Esc	Close the sheet, or exit to the Descent (exit saves; no confirm needed)
/	Search
Card anatomy. Card title (Atkinson bold, --fs-4); one idea in 120 words or fewer; one visual or interactive; an optional prompt. Glossary terms are dotted-underlined and open their definition in the Lantern when tapped. Card types are listed in §5.3.

Prompts.

A Predict, Fill or Choose prompt appears inline. The learner answers, then the explanation is revealed.
If the prompt is unanswered, Next is labelled "Skip prompt", which is honest. A skipped prompt records no retrieval.
"Show me" reveals the answer and counts as a skip.
State	Behaviour
Loading the unit file	Skeleton slate with "Loading Ratios · Dive 3…". After 8 s: an offline/failed message with Try again and Back to Descent.
Unit file failed or missing	"This dive didn't load." Explains whether the learner is offline or the dive is unavailable. Progress is untouched. Actions: Try again and Back.
Resumed	A small note: "Picked up where you left off · Card 4". It dismisses itself.
Content updated since last visit	"This dive was updated. We kept your place." The learner resumes at the same card id, or the nearest earlier card if that id is gone.
Last card	Next becomes "Surface", which leads to the checks.
Replay of a surfaced dive	A "Replay" chip on the progress strip. Nothing is reset (§5.10).
Save failed	The dive computer status turns coral (§4.10). The learner can keep going, and in-memory state is retried.
Text size 130% / landscape phone	The slate scrolls internally, and the bottom bar stays visible.
AC-P1: At 360×640, 130% text size and the longest card in the unit, no content is clipped. Every card is reachable and scrollable.
AC-P2: Each card change moves focus to the card heading and announces "Card N of M: <title>" via aria-live="polite".
AC-P3: Every gesture has a visible single-pointer alternative.
AC-P4: No backdrop-filter, and no running rAF loop other than an active interactive, while the Dive player is open on any tier.
4.6 Surface (#/surface/<diveId>)
Sequence:

Three checks, shown one at a time: one on the new concept, one from the previous dive, and one from an earlier unit.
Each check offers its options plus "I don't know".
After every answer, an explanation appears: why the right answer is right, and, for the chosen wrong option, why it was tempting.
Results panel:
The depth gauge ticks down and the "SURFACED" stamp lands.
Per-concept chips: "Got it", or "Revisit soon".
"2 review cards added".
The collectible reveal, which can be skipped.
Next actions:
Primary: Next dive.
Secondary: Practice in the Lounge, if this dive is linked to a room.
Tertiary: the Wreck link ("You just learned probability. Explore the gacha-math wreck.").
Also: Back to Descent.
Rules:

A dive is Surfaced once all three checks are answered, whatever the score (§5.7).
A low score is never a fail screen. It says "Surfaced. Two ideas to revisit." and schedules those concepts sooner.
Leaving mid-check saves the answered checks. Returning resumes at the next unanswered one.
AC-S1: Double-tapping Submit, or reloading during the results animation, produces exactly one surfacing record and one set of XP events (§7.4).

4.7 Wreck reader (#/wreck/<lessonId>/<anchor>): legacy lessons
Purpose: a comfortable long-form reader for the 42 legacy lessons, with content rendered in full.

Content is rendered through the same renderer path as legacy (mdBlock plus typeset; RECON), so the output is faithful. There are no rewrites in P0.
Layout: a paper slate with a maximum measure of 66ch.
Slim header (44 px): back, title, outline and Lantern. It hides on scroll down and shows on scroll up. A 2 px progress hairline runs along it.
Outline sheet: generated from the lesson's headings, and used to jump between sections.
Legacy section shapes: "Hook", "Why it matters", "Check yourself" and "Go deeper" are recognised by heading text where present and given light styling. "Check yourself" gets a paper inset. If the heading is missing, the section renders as a normal section; the reader never fails because of a missing heading.
Resume: the reader resumes at the nearest heading plus paragraph index, not at a raw pixel offset. A "You left off here" marker is shown.
Finishing: at the end, an explicit Finish wreck button marks it read. Scrolling to the bottom does not finish it. After that: bridged concepts ("This connects to: Probability · Number Reef"), the legacy sector quiz as Wreck challenge (RECON: confirm the quiz data shape), and Back to map.
Legacy sector completion (S.completed) is shown as "Charted (legacy)" and is never reset.
Acceptance criteria:

AC-W1: For all 42 lessons, the v10 render's heading count equals the legacy renderer's.
AC-W2: The normalized text content matches the legacy render at ≥99.5% token overlap, and any difference is listed in a report.
AC-W3: No raw markdown or TeX leaks: there are no visible **, $$ or \frac sequences, nor unrendered HTML tags.
AC-W4: Resume restores the same section after a refresh.
AC-W5: Finish happens only on explicit action.
AC-W6: Every Wreck is readable at 360×640 with no horizontal page scroll. Wide tables and code scroll inside their own container.
4.8 Logbook (#/logbook/<tab>)
The Logbook uses the paper surface throughout. On wide screens the tabs form a book-spine rail on the left. On narrow screens they are a horizontally scrollable segmented row at the top.

Tab	Contents	Empty state
Progress	A mastery map per reef: concepts as dots grouped by unit, coloured by stage with text labels, which can be filtered by reef. Also the Wreck reading list.	"Your first dive will chart this page." with Start a dive
Collection	Species log: specimen cards in a grid, with silhouettes for uncollected cards in started units only.	"Specimens you collect on dives live here."
Review	Due review cards (existing SRS) and the Daily Dive entry.	"Nothing due. Next review: tomorrow."
Notes	The existing Notebook (RECON: its storage and API), plus notes captured from dive cards (P1), each with a deep link back to the card.	"Notes you take on cards show up here."
Settings	Graphics tier (Auto / High / Med / Low / Off), text size, slate Day/Night, reduced motion (follows the OS; overridable), sound, account and BYOK (RECON: the existing account and BYOK UI), and Export progress (P1).	n/a
Extras	Probes, Energy and other legacy features retained by the P0.3 audit.	n/a
Reference	The former Sys-Log.	n/a
4.9 Sonar search (#/search)
Open it with: the dive computer icon, the / key, or the Map header. On narrow screens it is a full-screen sheet; on wide screens it is a 560 px panel.
Empty query: shows Continue (the current dive), recent searches and reviews due.
Index:
Dive titles, concept labels, glossary terms, unit objectives and Wreck titles and headings, all built from the manifest.
Legacy lesson bodies, using MiniSearch, which is loaded on first focus (RECON: what the current index covers).
Results are grouped into Dives, Concepts and Glossary, and Wrecks. Each result shows a breadcrumb (e.g. "Number Reef › Shallows › Ratios › Dive 3"), a status chip and an estimated time.
Filter chips: Reef, Zone, Status (New / In progress / Surfaced / Review due) and Type (Dive / Wreck).
Sort: relevance by default, or "Path order".
No results: fuzzy suggestions plus "Browse the map".
AC-Q1: Searching "ratio" returns the Ratios unit and its dives first, along with the s2-4 gacha-math Wreck if the bridge map lists it.

4.10 Dive computer (replaces the 13-control top bar)
Present on the Map, the Descent and the Logbook (hidden on Title; reduced to the progress strip inside a dive).

Contents:

The depth in the current reef.
One daily-goal ring. The default goal is one dive per day.
Search.
The Logbook.
The save status glyph.
Save status (P0, always truthful):

Status	Shown when	Visual
Saved	The local write succeeded	Quiet slate glyph; "Saved" text for 1.5 s after a change
Saving…	Only if the write takes more than 300 ms	Stepped ellipsis
Saved on this device	Saved locally, while cloud sync is off, offline or pending	Glyph with a small "device" mark; tapping explains
Synced	The cloud acknowledged the write (RECON: whether the sync hook exposes an acknowledgement; if not, never show "Synced")	Glyph with a cloud mark
Couldn't save	The local write threw (quota, private mode, security error)	Coral glyph plus a persistent banner with Try again and Export progress (P1)
4.11 Lounge handoff
From a dive or Surface, "Practice in the Lounge" calls CodexLounge.setRoom(roomId, opts) (§9). The learner spawns at the activity, and a persistent "Back to dive" pill (top-left, lantern outline) returns them to the stored route.
Fallback: if the Lounge is not ready within 8 s, or it errors, the learner sees "The Lounge isn't available right now. Practice here instead." and the activity opens inline.
From the Lounge, each linked object offers "How does this work?", which opens the dive or glossary card in an info card.
4.12 Global feedback system
Toasts (bottom on narrow screens, bottom-left on wide) are for non-blocking news: "Graphics lowered to keep things smooth · Settings". They last 4 s and can be dismissed. They are never used for errors that need action.
Banners are for persistent problems (a failing save, migration read-only mode). They sit under the dive computer and stay until resolved.
Modals are used only for destructive or irreversible choices. v10 has almost none, because nothing deletes user data.
5. Lesson lifecycle and requirements
5.1 Content hierarchy and terms
Level	Definition	Example
Reef	A subject area	Number Reef
Zone	A grade band, expressed as depth. Defaults: Shallows 6–8, Twilight 9–10, Midnight 11–12/AP, Abyss first-year college; Tide Pools (3–5) later. The owner can change these.	Shallows
Unit	The unit of delivery: 4–8 dives, about 45 min, with objectives, prerequisites and standards	Ratios
Dive	One lesson: 5–8 min, made of a hook, cards, practice, surface and an optional Wreck link	Ratios · Dive 3
Card	One idea, with one visual or interactive and an optional prompt	"Scaling a recipe"
Concept	The unit of mastery. Tagged on cards, prompts, checks and activities.	num.ratio.equivalent
Wreck	A legacy lesson. A long-form optional deep dive, bridged to concepts.	s2-4 Gacha Math
Activity	A practice module made from one of six templates, run inline or in a Lounge room	Tune: Recipe Scaler
5.2 Lifecycle flow
Discover (Title · Map · Descent · Search · Wreck bridge)
   → Preview (Unit sheet: objectives, time, dives, prereqs)
   → Open (Dive player: hook → cards with prompts)
   → Practice (inline activity, or the Lounge room with inline fallback)
   → Surface (3 checks + explanations → review cards + collectible)
   → Continue (next dive) or Leave (state saved at every step)
   → Return (Continue / resume at the exact card or check)
   → Review (SRS due cards · Daily Dive · Recalled/Applied stages)
   → Revisit (replay any surfaced dive or Wreck without corrupting progress)
5.3 Card types (rendering must adapt; do not force one pattern)
kind	Use	Presentation rules
concept	An explanation	Text plus an optional visual. The visual goes above the text on narrow screens and beside it at ≥1024 px.
worked	A worked example	Steps revealed one at a time ("Next step" within the card). A faded example has its last step(s) as fill-in prompts.
figure	A diagram or image that carries the idea	The figure is maximised. Its caption is required, and alt text is required (enforced by lint). Tap to enlarge, with pinch-zoom.
formula	A KaTeX-heavy explanation	Display math scrolls horizontally inside its container and never overflows the page. A "Read aloud" description is required (lint).
code	A code sample (Signal Reef)	System mono, Prism (loaded only for code units). Horizontal scroll and a copy button.
interactive	A small live model on the card	Built from a template, with a keyboard-operable fallback.
prompt	A retrieval-only card	Large options and "I don't know".
Long or mixed content goes into multiple cards; it is never truncated to fit one. Content always beats the 120-word style rule. Lint warns about overlong cards and a reviewer decides whether to split them. Nothing is cut silently.

5.4 Dive anatomy and pedagogy (preserved from the earlier plan)
Hook (≤60 words): a puzzle, phenomenon or question. Concrete before abstract.
Descent: 3–5 cards, each ≤120 words with one idea, one visual or interactive, and one retrieval prompt (predict, fill or choose).
Practice: one activity template, run inline or in a Lounge room.
Surface: three checks (new, previous dive and earlier unit, for interleaving), 2–4 auto-generated review cards, and a collectible.
Optional Wreck link.
Pedagogy rules:

Concrete, then pictorial, then abstract.
Worked example, then faded example, then an independent problem.
Retrieval before re-reading.
Feedback always explains why.
Spaced review uses the existing SRS (cx_v5_srs, RECON).
XP rewards retrieval success, not page views.
Each unit states 2–4 objectives in "You'll be able to…" form. Each objective is covered by at least one check (enforced by lint).

5.5 Learning actions: what is core and what is optional
Action	Priority	Notes
Card prompts (predict, fill, choose) with reveal	P0	Can be skipped honestly
Surface checks with explanations and "I don't know"	P0	 
Inline practice activity	 	 
Thought
| Inline practice activity | P0 | One template by G1; all six by G2 |
| Lounge practice venue | P0 for one room by G1 (Kitchen); P1 for rooms 1–2 by G2 | Always has an inline fallback |
| Auto-generated review cards into the existing SRS | P0 | Idempotent ids (§7.4) |
| Glossary, opened from the Lantern and from term taps | P0 | Defined once per concept |
| Tiered hints (hint 1, then hint 2) via the Lantern | P1 | Using a hint halves that item's XP; mastery is still granted |
| Unit test-out (3 questions) | P1 by G2 | Passing marks the unit "Tested out"; its concepts reach Practiced, not Recalled |
| Daily Dive (5 min of mixed spaced review) | P1 by G2 | Replaces Dispatch |
| Note on a card (into the existing Notebook, with a deep link) | P1 | RECON: Notebook API |
| Bookmark or pin a card | P2 | |
| Zone Trials | P2 (Phase 2b) | The legacy exam becomes a Wreck challenge |
| Audio narration, Dive together co-op | P2 | §14 cut order |

5.6 Feedback and mistakes
Every answer gets an explanation. A correct answer shows a one-sentence reason. A wrong answer explains why the correct option is right and, where authored (why_wrong[optIndex]), why the chosen option was tempting.
Retry.
Prompts: after a wrong answer the learner may try once more. The mastery record counts only the first attempt.
Checks: there is no immediate retry, because that turns a check into a guessing game. Instead, the concept enters review sooner, and if a variant exists (variants[]) a "Try a similar one" option appears on Surface (P1).
"I don't know" counts as incorrect for scheduling but is shown neutrally ("Good call. Here's how it works."). It discourages blind guessing.
Numeric input accepts equivalent forms (0.75, 3/4, 75% where accept allows it) within the authored tolerance. Feedback names the specific error class where it is detectable, for example "That's the reciprocal."
Tone. Praise is plain and specific ("Right, 3 cups scales to 4.5"), there are no exclamation stacks, and nothing makes the learner feel judged. There is at most one joke per dive.
5.7 Two axes of progress: reading is not mastery
Axis 1: completion status (dives, units and Wrecks). This answers where you are.

Entity	States	Transition rule
Dive	not_started → in_progress → surfaced	in_progress when the first card renders. surfaced when all 3 checks have been answered, whatever the score. It never goes backwards.
Unit	not_started → in_progress → surfaced / tested_out	surfaced when every published dive is surfaced. tested_out when the test-out is passed (default ≥2/3; configurable).
Wreck	not_started → in_progress → read	read only via an explicit Finish wreck. Legacy S.completed is shown separately as "Charted (legacy)".
Axis 2: concept mastery (per concept). This answers what you can do.

Stage	Earned by	Does not count
Seen	A card tagged with the concept has rendered	n/a
Practiced	A correct first-attempt prompt, or a completed practice activity, on this concept	Skipped prompts and "Show me"
Recalled	A correct retrieval (check, review or Daily Dive) ≥20 hours after the previous exposure to the concept	Same-session repeats
Applied	A correct answer on an item flagged transfer: true	Non-transfer items
Stages are monotonic (they only rise).
"Review due" is computed from the SRS due date. A recent wrong retrieval marks the concept "Shaky", which is shown but never lowers the stage.
A unit shows a lit lamp (mastered) when all of its concepts are ≥ Recalled.
Nothing on axis 2 is ever earned by opening, scrolling or reading.
5.8 Unlocking and navigation
Within a unit: dives are sequential. Dive N+1 is "Charted" once dive N is surfaced. Earlier dives can always be replayed.
Between units: prerequisites are soft. An uncharted unit offers Test out, or Dive anyway (one confirm: "This builds on Fractions. Dive anyway?"). There is no penalty, and the choice is remembered.
Wrecks: always open.
Previous/next: Back and Next move between cards. At the last card, Next becomes "Surface". After Surface, the primary action is "Next dive". From the first card of dive N, Back offers "Back to Descent".
What remains: the progress strip shows N of M cards; the unit sheet shows dives left and their minutes; the Descent shows units left in the zone.
5.9 Resume and exit rules
Situation	Behaviour
Exit mid-dive (Exit, Esc, browser Back, tab close)	State saves immediately (§7.3). The Descent shows "In progress · Card 4 of 7". There is no confirm dialog.
Refresh mid-dive	The route #/dive/<id>/<cardId> restores the same card, the prompt answers already given, and the activity state if the template supports serialize().
Exit mid-Surface	The answered checks are kept and locked, and the learner resumes at the next unanswered check.
Continue target	1. The most recently updated in-progress dive or Wreck from the last 14 days. 2. Otherwise, the first not-yet-surfaced dive in the last-touched unit. 3. Otherwise, the next recommended unit. 4. With no progress at all, onboarding.
Dive rev changed	Resume at the same cardId if it still exists. Otherwise, resume at the nearest earlier existing card in the old order. Show the "updated" note. Answered prompts whose ids still exist keep their results.
Dive removed from the manifest	The progress record is kept (orphaned). The Logbook lists it as "Retired dive", and Continue skips it. Nothing crashes, and no record is deleted.
Two tabs open	storage events trigger a merge (§7.5). The tab you are viewing never jumps you to another card on its own; it shows "Updated in another tab · Jump there?"
5.10 Revisit and replay rules
Opening a surfaced dive starts at card 1 in Replay mode. Its status stays surfaced, and its card position is not saved over the record.
In Replay, prompts and checks feed the SRS only if the concept is due. They award XP only for event keys not already awarded (§7.4).
A replayed Wreck keeps its read status. Only the resume position updates.
No replay ever lowers a stage, a status or XP.
5.11 Review and Daily Dive
Review cards are generated from each dive's review[] items and written into the existing SRS with ids v10:<diveId>:<itemId>, so they are created once. RECON: inspect the cx_v5_srs format. Safe default: if the format cannot hold extra metadata, keep a side map v10SrsMeta inside the progress store.
Daily Dive (P1): about 5 minutes, up to 8 items mixed from due cards, Shaky concepts and one older concept. It has no timer pressure and always ends with a summary and "Back to your dive".
Streak (P1): a forgiving weekly rhythm. A week counts when the daily goal is met on any 3 days, plus two automatic grace days. It is never framed as a loss, and there are no "you'll lose your streak" messages.
5.12 Lesson acceptance criteria
AC-L1: Every card renders its full source content, at every supported viewport and text size.
AC-L2: Refreshing mid-dive at card k returns to card k, with prior prompt answers visible.
AC-L3: Exiting and re-entering a dive by any path (Exit, Back button, deep link, Continue) never changes its status to surfaced and never creates a second progress record.
AC-L4: A skipped prompt does not raise mastery. A correct first attempt raises it to Practiced.
AC-L5: A dive becomes surfaced only after 3 answered checks, including "I don't know" answers.
AC-L6: Recalled requires a correct retrieval ≥20 h after the last exposure (tested with a mocked clock).
AC-L7: Replay never changes status, never lowers stages, and never awards XP twice for the same event key.
AC-L8: After a content rev change, resume lands on the same card id, or the nearest earlier card. An orphaned dive never crashes the Logbook or Continue.
AC-L9: Back and Next, swipe, and the keyboard keys all behave as in §4.5, and the browser Back button goes to the previous screen, not the previous card.
AC-L10: A returning learner reaches their saved card from the Title screen in 1 tap.
AC-L11: Every check shows an explanation after every answer.
AC-L12: A unit sheet's "You'll be able to…" objectives each map to at least one check (enforced by lint).
AC-L13: At 360×640 and 130% text, the Dive player's persistent chrome takes up ≤15% of the viewport height.
AC-L14: Uncharted units open via test-out or Dive anyway, and neither path blocks or penalises the learner.
6. Curriculum and content production
6.1 Principle and scope (preserved)
Keep the 42 lessons and reframe them as Wrecks. Build the missing curriculum around them.
The first pass is metadata only: bridge: [conceptIds]. No lessons are rewritten.
The draft bridge map is in Appendix A.
Scope is controlled by units.
Phase 1 builds exactly one unit: Number Reef · Shallows · Ratios (5 dives). It is the shared example in this plan and pairs with Kitchen.
Wave 1 is 3 reefs (Number, Life, Matter & Motion) × 2 zones (Shallows, Twilight) × 2 units, about 60 dives.
Do not start Wave 2 content until Wave 1 passes human review.
6.2 Voice guide (preserved and sharpened)
Write like a person. Lead with concrete nouns and people. Use short sentences, second person, and at most one joke per dive.
Banned phrases: "delve", "tapestry", "unlock the power", "in today's fast-paced world", "it's important to note", stacked em-dash asides, triple-adjective strings, and the same rhetorical-question opener across dives. Lint enforces this list.
Guide voices: reefs get voices from the Lounge NPCs. Mira, Orrin and Wren come first; add more as reefs come online. RECON: confirm each NPC's character before assigning a reef.
Jargon: introduce each term once and define it in the glossary, reachable with a tap.
6.3 Standards and sources (preserved)
Standards: each dive carries standards: [{fw, code}] as metadata only. Default frameworks are CCSS, NGSS and C3 for school, and AP frameworks plus OpenStax for college.
Never copy standards text or textbook prose.
Sources: each dive lists 1–3 sources used to ground it, for example OpenStax, NASA, NOAA or USGS.
Collectible facts must cite one of the dive's sources.
6.4 Activity templates (the efficiency lever, preserved)
Six data-driven modules are written once. Authors only write the parameters.

Template	What the learner does	Wraps this existing game
Sort/Match	Group or pair items	Celestial Survey
Tune	Move sliders on a live model	(new) Phase 1 Recipe Scaler
Sequence	Put items in order	Order Up. Classic Order Up stays frozen; wrap it, never modify it.
Estimate	Guess, then see the answer	(new)
Decode	Turn evidence into a claim	Archive Cipher
Balance	Keep a small system stable	Ecosystem Keeper
Every template must implement the following.

Required interface (contract C5):

mount(el, params, ctx)
serialize() and restore(state), for resume
onComplete(result), which reports a concept result
unmount()
Required behaviour:

Full keyboard operation
Reduced-motion behaviour
A text alternative for any canvas
No continuous animation on the Low tier
6.5 Authoring pipeline (per unit, in order)
Outline. Concept graph, dives, prerequisites, standards and objectives.
Draft as js/units/<reef>/<unit>.js, registering with CodexUnits. Start with status: "draft".
npm run lint:units checks:
Schema validity
Unique ids, including card, check and prompt ids
Prerequisite cycles
Word limits (warn only)
Reading level (warn only): Shallows ≤ grade 7, Twilight ≤ 9, Midnight ≤ 11, Abyss ≤ 13. Use a dependency-free Flesch-Kincaid heuristic, and skip math and code blocks.
The banned-phrase list
Required alt text and math descriptions
Every objective is covered by a check
Numeric answers are recomputed from their verify expression by a restricted arithmetic evaluator (no eval)
Assets and links exist
Gzipped unit size ≤30 KB
In-browser checks (Playwright):
KaTeX parses every expression
Every card renders at 360×640 without clipping
Fresh-context reviewer pass. Fact-check every claim against the cited sources and write js/units/<reef>/<unit>.review.md. Then set status: "reviewed".
Human sign-off. The owner or a teacher reviews all Wave 1 units, then a 20% random sample of later units. Only after sign-off does a unit get status: "published" plus reviewedBy and a date.
Merge, then start the next unit. Work on at most three units in parallel.
Be honest in reports. Lint catches structure and arithmetic, not every conceptual error. Human sampling is part of the plan, not optional.

6.6 Legacy content integrity (P0)
Inventory. scripts/content-inventory.js (dependency-free; it loads js/data/* in a Node vm sandbox without printing bodies) writes docs/v10/content-inventory.json. For each lesson it records:
id, sector, order index and title
heading list and word count
KaTeX and code block counts
a SHA-256 of the body
Change detection. CI or a pre-merge script recomputes the hashes. Any change to legacy bodies fails the check unless the change is listed in docs/v10/content-changes.md with a reason.
Integrity checks. The inventory fails if any of these are found:
missing or duplicate ids
a changed order
empty bodies
unresolved cross-references
Bridge-map verification (P0.4). Use the inventory's headings plus the first paragraph of each lesson. Read a full lesson only by targeted view, one at a time, and only when its digest is ambiguous.
7. Data, persistence and integrity
7.1 One writer and a storage decision rule
CodexProgress (in js/v10/progress/) is the only module that writes v10 progress.
Before cutover, v10 never writes the legacy keys (polymath_codex_v1, cx_lounge_world_v1). Legacy code continues to own them.
Where v10 data lives is decided in M0.1, using this rule:

Option	When to choose it	Risk
B (default): a separate key cx_v10_progress, added to the cloud payload as an additive field or separate document	Unless every Option A condition is proven	Two keys exist, but only one is written per UI
A: a namespaced field inside the existing saved state	Only if recon proves all three: (1) save() serialises the whole object, (2) legacy code preserves unknown fields on every write path, including other tabs, and (3) cloud sync round-trips unknown fields from older clients	If any condition fails, a legacy tab silently wipes v10 data
Lounge XP: the Lounge ledger keeps its daily cap of 30 for replay grinding. First clears of unit-linked activities pay through CodexProgress events. There is no second currency.

7.2 C2 draft schema (a proposal; adapt field names after recon, but keep the semantics)
{
  "v": 2,
  "deviceId": "random-uuid",
  "updatedAt": "ISO",
  "dives":    { "<diveId>":   { "status": "in_progress|surfaced", "cardId": "c4", "rev": 3,
                                "prompts": { "<promptId>": { "ok": true, "first": true, "at": "ISO" } },
                                "checks":  { "<checkId>":  { "ok": false, "idk": true, "at": "ISO" } },
                                "activity": { "state": {}, "at": "ISO" },
                                "startedAt": "ISO", "surfacedAt": "ISO", "updatedAt": "ISO" } },
  "units":    { "<unitId>":   { "testedOut": true, "diveAnyway": true, "at": "ISO" } },
  "wrecks":   { "<lessonId>": { "status": "in_progress|read", "anchor": "h-3", "para": 2,
                                "updatedAt": "ISO", "readAt": "ISO" } },
  "concepts": { "<conceptId>":{ "stage": 0, "seenAt": "ISO", "practicedAt": "ISO",
                                "recalledAt": "ISO", "appliedAt": "ISO",
                                "lastResult": "ok|miss", "lastExposureAt": "ISO" } },
  "xp":       { "<eventKey>": { "amt": 10, "at": "ISO" } },
  "goal":     { "daily": 1, "days": { "YYYY-MM-DD": 2 } },
  "collection": { "<itemId>": "ISO" },
  "prefs":    { "fx": "auto", "text": 1, "slate": "auto", "sound": false },
  "legacy":   { "importedAt": "ISO", "sourceHashes": { "polymath_codex_v1": "sha" },
                "imported": { "<importKey>": "ISO" } }
}
Rules:

XP total is always computed as the sum of xp events. It is never stored, so it cannot drift.
Pruning. goal.days keeps 60 days. activity.state is cleared once a dive is surfaced.
Size. Target ≤100 KB at the end of Wave 2. A test asserts this with a synthetic full-progress fixture.
7.3 When progress is saved
Save immediately, writing synchronously to localStorage behind a 250 ms coalescing debounce, on each of these:

card rendered
prompt answered
check answered
activity completed
surfaced
Wreck finished
settings changed
Wreck scroll position is saved with a 1 s debounce.

Flush on visibilitychange (hidden) and on pagehide.

Cloud sync goes through NetworkEngine.onStateSave, or its equivalent (RECON), after a successful local write. It is never a precondition for showing "Saved on this device".

7.4 Idempotency and dedupe
Every reward and record is keyed by a deterministic event key:

Event	Key pattern
A dive is surfaced	dive:<id>:surface
A check is first answered correctly	check:<id>:first-ok
A prompt is first answered correctly	prompt:<id>:first-ok
An activity is cleared for the first time	act:<diveId>:<template>:first
A unit is tested out	unit:<id>:testout
A legacy record is imported	legacy:<source>:<recordId>
Rules:

Writing an existing key is a no-op.
Taps: buttons disable on press until the state transition commits. A double-tap test asserts there is exactly one event.
Review cards: SRS writes use stable ids (§5.11).
7.5 Merge rules (multi-tab, cloud and stale data)
Field	Merge
Statuses	Take the furthest along (surfaced > in_progress > not_started; read > in_progress)
Position (cardId, anchor)	Take the record with the latest updatedAt
Concept stage	Take the max; timestamps take the max per field
xp, collection, legacy.imported, prompts and checks	Union by key; for duplicate keys, keep the earliest at
prefs	The latest updatedAt wins
Missing on one side	Keep the side that has it. Absence never deletes.
Precedence:

Older cloud payloads can never downgrade newer local data. The same merge applies in both directions.
A payload with v greater than the supported version is read-only: show a "Newer version detected" banner, and never write over it. This matches the Lounge ledger policy (RECON).
7.6 Migration and legacy import (P0)
On v10 boot, read polymath_codex_v1, cx_lounge_world_v1 and cx_v5_srs. These are read-only, and are never modified or deleted.
Before the first import, write cx_v10_progress_bak (a backup of any existing v10 data) and cx_legacy_snapshot_<date> (a verbatim copy of the legacy strings), if storage allows. If the backup fails, abort the import and show a banner. Never import without a backup.
Import legacy XP, sector completion (shown as "Charted (legacy)"), read lessons (if tracked) and SRS references. Each item gets an legacy:* event key, so re-running the import is idempotent.
Incremental re-import. On each boot, compare the stored sourceHashes. If the legacy data changed (for example, the learner used ?ui=legacy), import only the new keys.
Corrupt legacy JSON. Skip the import. Keep the raw string untouched. Show "Some old progress couldn't be read. It's backed up and untouched." Continue with a fresh v10 store.
Fixtures (P0) in tests/fixtures/saves/:
at least five real legacy save shapes (RECON: collect them from the code paths that write saves, or from the owner)
one corrupt save
one with a newer schema version
one empty save
one huge save
7.7 Failure handling and honest status
Wrap every setItem call. On QuotaExceededError or SecurityError (for example, Safari private mode):
keep the state in memory
show the coral "Couldn't save" status (§4.10)
retry on the next change
never show "Saved"
Export progress (P1) downloads a JSON file. Import validates it and then merges it using §7.5.
If the cloud sync rejects or fails, show "Saved on this device" and retry quietly. Never show "Synced" without an acknowledgement.
7.8 Acceptance criteria (progress correctness)
AC-D1: After a refresh at any point in the lifecycle, the state matches the state before the refresh. This is tested at each of 8 lifecycle points.
AC-D2: A double-tap on Next, Submit or Surface, or a reload during a transition, yields exactly one record and exactly one event per key.
AC-D3: Two tabs that make conflicting updates converge to the §7.5 result. No data is lost.
AC-D4: Every migration fixture imports with the expected counts, the legacy keys stay byte-identical afterwards, and running the import a second time adds zero events.
AC-D5: The corrupt fixture triggers the backup and the banner, and nothing is overwritten.
AC-D6: The newer-schema fixture puts the app in read-only mode, and no writes occur.
AC-D7: A stubbed setItem failure shows "Couldn't save" within 1 s, and "Saved" never appears.
AC-D8: Existing cloud sync still works for both the legacy UI and v10, and an older client's payload does not erase v10 data (RECON: decides whether this is tested end to end or against a stub).
8. Performance plan
8.1 Measure first (Phase 0, P0)
docs/v10/baseline.md records the following, all measured with the harness in §8.2:

LCP
INP, from scripted interactions
long tasks (count and total)
JS heap
frame times
transfer size by type, gzipped
Each is measured on three screens: legacy Home, a legacy lesson, and the Lounge.

Throttled profile: 4× and 6× CPU throttling, Slow 4G.
Real device: one real low-end phone if the owner has one. This is the single most valuable measurement.
Rank the top three offenders before cutting anything.

8.2 Harness (dependency-free beyond the existing Playwright)
scripts/serve.js. A static server built on Node's http module. Performance and service-worker runs need HTTP. Functional tests may stay on file://.
scripts/perf-budget.js. Uses Playwright Chromium plus CDP:
Emulation.setCPUThrottlingRate and Network.emulateNetworkConditions
LCP and long tasks via PerformanceObserver, and INP via the Event Timing API during a scripted tap sequence
byte budgets by summing the gzipped sizes of the requests captured on each route
Output: a JSON report plus a Markdown table, compared against the budgets. Any route over budget fails the run.
8.3 Budgets (proposed gates; validate against the baseline before locking at G0)
Target	Budget
Title screen (v10 path)	≤150 KB gz JS, zero third-party scripts, ≤25 KB gz CSS, LCP ≤2.5 s, INP ≤200 ms (throttled profile)
Dive player first card (from Descent)	≤300 ms to render with the unit cached; ≤1.5 s uncached on Slow 4G
Each unit file	≤30 KB gz, loaded on demand
Low tier	No continuous animation outside the active interaction. No backdrop-filter. The Lounge holds ≥30 fps or drops to idle redraw.
Memory	No unbounded heap growth over a 10-minute session that includes room changes. Measured as heap after GC at 10 min ≤ 1.2× heap at 2 min.
8.4 Quality tiers (CodexFX, contract C4)
Tiers are high | med | low | off.

Auto-detection combines:

deviceMemory, hardwareConcurrency
saveData / effectiveType
prefers-reduced-motion
a 30-frame frame-time probe run during idle time
Downgrade ratchet: if the average frame time exceeds about 24 ms for 2 s, drop one tier and show a toast linking to Settings. The ratchet never upgrades automatically.

Manual override is in Settings. The current tier is exposed as <html data-fx> and CodexFX.tier, and every effect reads it.

Tier	Background and effects
High	Layered parallax and ambient particles (the ocean.js painter)
Med	Pre-rendered layers with slow CSS drift. No canvas loop.
Low / Off	One static WebP (≤60 KB) or a CSS gradient. No continuous animation. The Lounge redraws only on interaction.
On every tier, the ocean is paused during dives and Wrecks.

8.5 Cuts, by expected payoff (verify against the baseline)
Effects. The default path loses backdrop-filter, large blur shadows, scanlines and the grid.
Ocean. Replace the per-frame full-screen canvas ocean with pre-rendered layers and CSS transforms. ocean.js remains the generator and the High-tier painter.
Lazy-load third parties:
Firebase, Supabase and network.js: load only when the Lounge or the account is first opened. Also audit whether both backends are needed (RECON).
KaTeX: only for units flagged math.
Prism: only for code units, and only the languages used.
MiniSearch: on first search focus.
confetti: on first reward. Better still, replace it with the stepped stamp.
marked and DOMPurify: only for Wrecks.
Unit loading. Load unit files by injecting a <script>, not via fetch. Tests run from file://, and Chromium blocks fetching local files. CodexUnits.load(id) appends a script tag and resolves when the file registers itself. It has a timeout and an error path, and works under file://, HTTP and a service worker.
Fonts. Self-host and subset, use two families, set font-display: swap, and preload only the face visible above the fold. Replace the icon-font CDN stylesheet with the inline sprite system after checking coverage.
CSS. One tokenized stack (core, title, map, lesson, lounge), ≤25 KB gz. Delete style, codex-plus, v6 and v7 at cutover.
Service worker (HTTP/HTTPS only; skipped under file://).
Cache-first for the shell and unit files; stale-while-revalidate for the manifest; a versioned cache.
Gives offline lessons and fast repeat loads on weak networks.
P1: vendor the lazy third-party libraries locally, so offline caching does not depend on opaque CDN responses.
Lounge. DPR 1 on Low, a 20 fps cap when idle on Med, a full pause when the tab is hidden, and pooled effects.
CodexLoop. One scheduler replaces the scattered setInterval and rAF loops. It obeys the tier and page visibility, and exposes activeCount() for tests.
Bundler: none in Phases 0–2. If budgets are missed at hardening, reassess esbuild for minification only.

9. Lounge expansion
Rule: lessons teach, rooms let you do. Every room and every interaction is a place to practise a named concept, not decoration.

Use the existing seams; don't modify core (RECON: confirm each signature):

registerRoom, addHotspot, setSpawn, defIx
CodexLoungeGames.register, CodexLoungeConsole.registerTab
registerArt / decorate
A ledger bump to v2, with a migration step and the same backup and read-only rules as §7.6
9.1 Phase 1 (P0): Kitchen and Recipe Scaler
Placement. Kitchen is the existing room mapped to Number (ratios, scaling, units). It hosts one Tune activity, Recipe Scaler, which is also available inline in Ratios Dive 3.
Practice link. CodexLounge.setRoom(roomId, opts). Inspect setRoom in lounge2.js, then either extend opts or add a thin wrapper so that it can carry {activity, params, returnTo}.
Safe default: a wrapper in js/v10/practice/link.js that calls the existing setRoom and then positions the player through setSpawn. This avoids touching core.
Two-way wiring. The learner spawns at the activity with parameters from the dive, and a persistent "Back to dive" control is shown. The Kitchen object's "How does this work?" opens Ratios Dive 3 in the info card.
Results. Activity results report through onComplete, then CodexProgress. The first clear is paid once, via act:*:first.
9.2 New side rooms
Add these as side rooms, so the main-room ring and presence stay compatible: r is always a main room and sr is optional (RECON).
Verify door geometry in CodexLoungeArt.GEO.
Room	Reef	Activities	Wave
Workshop	Matter & Motion	Tune with ramps, springs, circuits and mixing	1 (P1 by G2)
Tide-Pool Lab	Life	Sort and Balance with cells, food webs and specimens; feeds the aquarium collection	1 (P1 by G2)
Exchange	Number, Chronicle	Estimate with probability, rates and markets. Gacha math becomes a stats lab.	2 (P2-cuttable)
Map Room	Chronicle, Sky & Sea	Sequence and Decode with timelines, chokepoints, primary sources and star charts	2 (P2-cuttable)
Existing rooms get a subject:

Dome → Sky & Sea
Conservatory → Life
Archive → Signal
Kitchen → Number
9.3 Integration features
"Your Dive" console tab (P1). Shows the current unit, the linked activities and the reviews due.
NPCs read CodexProgress (P1). Mira, Orrin and Wren reference what you just studied, and hand out unit-linked quests through the existing quest system (RECON).
Scenery reflects progress (P1). Aquarium specimens and lamps lit per mastered concept, via decorate.
Dive together (P2 stretch). Co-op review through the existing Study rooms. This is first in the cut order.
AC-LG1: The Kitchen loop works both ways: from a dive into the Kitchen activity, back to the same card, with the result recorded exactly once. If the Lounge is blocked (its scripts fail), the inline fallback appears within 8 s and the dive can still be completed.

10. Contracts (write in docs/v10/ before any feature code; owner reviews at G0)
Id	Contract	Key content
C1	Unit schema	See below
C2	Progress store v2	The §7.2 schema, plus the §7.3 save rules, §7.4 event keys, §7.5 merge, §7.6 migration and §7.7 failures. Decide the storage option (A or B) per §7.1. Must keep NetworkEngine.onStateSave sync working: extend the payload; don't break older clients.
C3	Tokens	§3.4. The --lg-* alias table. The contrast-pair table, generated by script.
C4	CodexFX and CodexLoop	Tiers, detection, ratchet, override, data-fx, loop registration, visibility pause, activeCount()
C5	Practice link and activity templates	The setRoom wrapper, {activity, params, returnTo}, inline fallback, and the template interface from §6.4
C6	Routes and UI states	The §4 route table. For each screen, the list of states, with copy, as the checklist for state screenshots.
C1 (unit schema):

{id, v, reef, zone, title, objectives[], est, prereqs[unitId], standards[{fw,code}],
 sources[], flags:{math,code}, status, reviewedBy?, reviewedAt?,
 dives:[{id, rev, title, est, hook,
   cards:[{id, kind, title, body, visual?{alt}, mathDesc?, concepts[], prompt?{id, type, q, opts?, a, accept?, verify?, tol?, why, why_wrong?, hints?}}],
   practice:{template, room?, params},
   check:[{id, q, opts, a, why, why_wrong?, concept, transfer?, verify?, variants?}],
   review:[{id, front, back, concept}],
   collect:{id, name, art, fact, source},
   wreck?:[lessonId]}],
 glossary:[{term, def, concept}]}
A dependency-free Node script generates js/units/manifest.json. It contains ids, titles, objectives, estimates, statuses, concepts and search fields, but no lesson bodies.

11. Architecture and compatibility recon checklist (Phase 0, M0.1)
Answer every row in docs/v10/recon.md, citing the file and line of the evidence. Do not change a system until its row is answered.

Id	Inspect	Baseline claim	How to verify	Safe default if different or unclear
R-BOOT	Script loading order in index.html	Legacy loads eagerly, with CDN tags in the head	View index.html; list every script and link tag	Separate entry document app.html for v10 during Phases 1–2. An inline snippet at the top of index.html redirects when cx_ui=10 or ?ui=10. Swap at cutover. Dynamic-injecting legacy scripts is a fallback option only, because legacy code may assume DOMContentLoaded ordering.
R-STATE	save() and the state object S, and the key polymath_codex_v1	save() exists in engine.js	grep save(, localStorage.setItem, polymath_codex_v1	Option B storage (§7.1)
R-SYNC	NetworkEngine.onStateSave payload, acknowledgement and backends	Firebase and Supabase both referenced	Read the network.js hook surface only. Its transport is frozen.	Additive field; never show "Synced" without an acknowledgement
R-SRS	cx_v5_srs format and flashcard UI	SRS exists	grep the key; read the read/write functions	Side map v10SrsMeta
R-RENDER	mdBlock and typeset; KaTeX and Prism usage	Helpers exist in engine.js	Targeted view	v10 Wreck reader calls the same functions
R-DATA	Lesson registration format in js/data/*	Markdown strings, eagerly loaded	content-inventory.js digest only	Read-only adapter
R-QUIZ	Sector quiz data and completion	One quiz per sector; S.completed	grep completed[	Wreck challenge reuses the legacy quiz renderer
R-SEARCH	MiniSearch index fields	Indexes lessons	grep MiniSearch	v10 builds its own index from the manifest; legacy index reused for Wreck bodies
R-NOTE	Notebook storage and API	Notebook exists	grep "notebook"	P1 card notes stored in the progress store, with an export to the Notebook later
R-ROUTE	Legacy hash or router use	Unknown	grep location.hash and hashchange	Namespace #/v10/
R-LOUNGE	setRoom opts, registerRoom, sr side rooms, GEO, Kitchen room, ledger version, NPC and quest system, XP cap 30	As in §2	Read docs/lounge-architecture.md in full; targeted views	Wrapper; no core edits
R-SPRITE	Inline sprite coverage versus icon-font usage	Sprite system exists	List the icons in use and diff them against the sprite set	Add missing glyphs to the sprite
R-TEST	Test commands, config, fixtures; ~120 specs; browser projects	Chromium only verified	Run the suite on all three browsers and record the results	Record failures as pre-existing; don't fix legacy code beyond what's needed to unblock
R-THEME	Any existing theme toggle	Unknown	grep "theme" and prefers-color-scheme	Map it to the slate setting
R-FRAMES	rAF and interval sites (11 / 6)	As in §2	grep	Register them through CodexLoop in v10 paths only
12. Milestones
Every task report must include: what changed, how it was verified, measurements against budget, and open risks. PRs stay at about 400 lines excluding content data, and each comes with tests. Run the targeted spec while developing, the full suite before merge, and all three browsers at gates.

If a gate fails, stop and report. Never advance past a failed gate.

Phase 0: Safety, recon and baseline (S0; blocks everything)
Id	Deliverable	Verification
M0.1	docs/v10/recon.md answering every §11 row	The owner can trace each answer to a file and line
M0.2 (P0.1)	Characterization tests for the legacy learning loop: open a lesson, answer a quiz, XP and level, persistence across reload, search, flashcards	New specs pass in Chromium. Results on Firefox and WebKit are recorded.
M0.3 (P0.2)	Perf harness (§8.2) and baseline.md, with the top three offenders ranked	Harness runs repeatably (±10% across 3 runs)
M0.4 (P0.3)	Feature inventory: keep, merge, hide or cut for every nav item and HUD element, with a one-line reason. Applies the §3.10 disposition.	Owner review
M0.5 (P0.4)	content-inventory.json, hash check and the verified bridge map	42 lessons, no duplicates or empties; bridge map diffed against Appendix A
M0.6 (P0.5)	Contracts C1–C6, lint-units.js, the manifest script and migration fixtures	Lint passes on a sample unit, and fails on a deliberately broken one
M0.7 (P0.6)	v10 branch, the flag, and the boot strategy per R-BOOT	?ui=10 shows an empty v10 shell, and the legacy default is unchanged (full suite green)
Gate G0:

tests green
baseline saved
recon, inventories and contracts reviewed by the owner
budgets locked or adjusted with evidence
Phase 1a: Design brief (G1a, before any UI code)
Deliverables:

docs/v10/design-brief.md:
rationale
token sheet
type specimen with the chosen pixel face and its licence
icon list
motion table
copy samples
docs/v10/mock/*.html (static, using the real tokens.css):
six screens: Title, Reef Map, Descent and unit sheet, Dive card (concept, worked, formula), Surface, Logbook
each rendered at 360×640 and 1280×720
plus a states sheet per screen covering first visit, loading, empty, error, in progress, completed, save failed and offline
Screenshots of the mocks, captured by Playwright.
Contrast report from the token script: every text pair meets AA (4.5:1 for body, 3:1 for large text and UI).
Gate G1a: the owner approves the direction. This is the cheapest place to change it.

Mocks are not progress toward G1.

Phase 1b: Golden Path, the vertical slice (build in this order)
Id	Deliverable	Verification
M1.1	CodexProgress: store, save rules, event keys, merge, migration, failure handling. Headless, with no UI.	AC-D1–D7 as unit and spec tests; all migration fixtures pass
M1.2	CodexUnits loader, plus the Ratios unit (5 dives) taken through the full §6.5 pipeline to published	Lint green, review file present, owner sign-off, ≤30 KB gz
M1.3	v10 shell: router, tokens.css, CodexFX, minimal CodexLoop, dive computer with save status	Routes deep-link; AC-P4; tier forcing test
M1.4	Dive player and Surface, including every §4.5 and §4.6 state	AC-P1–P3, AC-L1–L11, AC-S1
M1.5	Descent and unit sheet (Number Reef, Shallows)	AC-D1 (Descent), AC-L14 (Dive anyway only; test-out is P1)
M1.6	Title, Continue, onboarding and the legacy migration notice	AC-T1–T4, AC-L10
M1.7	Reef Map with one live reef, planned reefs and the Wreck list linking to the legacy reader (temporary)	AC-M1 (via the legacy view)
M1.8	Tune template, Recipe Scaler inline and in Kitchen, and the Lounge fallback	AC-LG1
M1.9	Lazy loading on the v10 path (Firebase, Supabase, network.js, KaTeX, MiniSearch) and the static zone WebP scenes	Perf harness: Title budget passes
Gate G1 (the most important gate; do not scale anything before it passes):

the owner playtests on a real phone
budgets pass on the throttled profile
all tests are green, both new and the existing ~120 specs
migration fixtures pass
the a11y checks for the slice pass (§13)
Phase 2a: Scale Wave 1 (streams may run in parallel)
Id	Deliverable	Gate criteria
M2.1	Wreck reader and Wreck layer, covering all 42 lessons	AC-W1–W6
M2.2	Logbook: Progress, Collection, Review, Settings and Extras; Notes (P1)	Every tab's empty and populated states covered
M2.3	Sonar search	AC-Q1; keyboard and screen-reader pass
M2.4	Review and Daily Dive (P1), forgiving streak (P1)	SRS ids idempotent; mocked-clock tests
M2.5	The remaining five templates (one already exists)	Each meets the C5 interface, keyboard operation and serialize/restore requirements
M2.6	Workshop and Tide-Pool Lab (P1)	Two-way links, with fallbacks
M2.7	Wave 1 content: the remaining 11 units, at most three in parallel	Every unit published after human review
M2.8	Test-out (P1); "Your Dive" console tab and NPC hooks (P1)	AC-L14 complete
M2.9	Service worker, self-hosted subset fonts, CSS consolidation for v10	Offline replay of a cached dive; CSS ≤25 KB gz
Gate G2:

Wave 1 human-reviewed
every learning-path screen running on the new UI and within budget
the Wreck fidelity report clean
Phase 2b: Wave 2
Build in this order:

Sky & Sea and Signal
Chronicle
The Midnight and Abyss zones
Rooms 3–4 (cuttable)
Wreck bridging links on Surface
Zone Trials (P2)
Human review uses a 20% sample per unit batch.

Phase 3: Cutover and hardening (G3)
Accessibility pass: WCAG 2.2 AA contrast, a keyboard path through the player, screen-reader labels, reduced motion, 44 px targets, and text at 130%.
Firefox and WebKit projects green. A real low-end device pass.
Delete the legacy CSS and JS that the inventory marked "cut" or "replaced".
Flip the default to v10. Keep ?ui=legacy for one release. Document the rollback (flag flip, with data unaffected because legacy keys were never written).
Gate G3: all of the above, plus the full §17 checklist.

Phase 4: Learn from users
Privacy-light, local-first analytics: drop-off per card and retrieval accuracy per concept. Owner approval is required before anything leaves the device.
Fix the weakest dives first, and iterate weekly.
Streams and file ownership (prevents merge conflicts)
Stream	Owns
S0 Foundations	Recon, contracts, fixtures. Reviews every hook-in to shared files.
S1 Shell and UI	The v10 entry and root, js/v10/shell/*, css/v10/*
S2 Curriculum	js/units/**, scripts/lint-units.js, scripts/content-inventory.js
S3 Lounge and templates	js/features/lounge-*, js/v10/practice/*
S4 Performance and data	Loading logic in js/core/*, sw.js, js/v10/fx/*, js/v10/progress/*, scripts/perf-budget.js, scripts/serve.js
Shared files (index.html, engine.js) take one-line hook-ins only, reviewed by S0.
With one agent, run the streams in the milestone order above. With several, give each its own worktree and rebase daily.
Path caveat (RECON): the js/features/lounge-* and js/core/* paths come from the earlier plan. Confirm them in M0.1.
13. Test matrix
Notation used below:

Browsers: C = Chromium, F = Firefox, W = WebKit.
Viewports: "all VP" = the six viewports in §3.8.
Gate: the first gate at which the row is required.
Area	Test	Type	Browsers / viewports	Gate
Regression	Existing ~120 specs (Lounge, avatar, chat)	Playwright	C·F·W	Every gate
Regression	Legacy learning-loop characterization (M0.2)	Playwright	C (F·W at G3)	G0
Regression	?ui=legacy full smoke	Playwright	C·F·W	G1, G3
Data	Migration fixtures (5 real, plus corrupt, newer, empty, huge)	Unit + spec	C	G1
Data	Idempotency: double-tap, reload mid-transition, re-surface	Spec	C	G1
Data	Two-tab merge	Spec (two pages)	C	G1
Data	Save failure (stubbed setItem) shows honest status	Spec	C·W	G1
Data	Store size with a full-progress fixture (≤100 KB)	Unit	n/a	G2
Lesson	Resume at card, at check, after a rev change, with a removed dive	Spec	C	G1
Lesson	Navigation: keyboard, swipe, browser Back, deep links	Spec	C·F·W, all VP	G1
Lesson	Mastery rules, with a mocked clock (≥20 h Recalled)	Unit	n/a	G1
Lesson	Card rendering without clipping (every published card, 130% text)	Spec	C, 360×640 + 640×360	G1 (one unit), G2 (all)
Lesson	Unit load failure, offline, retry	Spec (route blocked)	C	G1
Lesson	Wreck fidelity: headings, text parity, no raw-markup leaks, all 42	Spec + report	C	G2
Lesson	Wreck resume and explicit finish	Spec	C·W	G2
Search	Ranking, filters, empty state	Spec	C	G2
Lounge	Kitchen handoff both ways; inline fallback when Lounge is blocked	Spec	C	G1
UI	Screenshot snapshots per screen and state (C6)	toHaveScreenshot	C only (cross-OS variance), all VP	G1 (slice), G2
UI	Tier forcing: no backdrop-filter on low; CodexLoop.activeCount() is 0 in dives	Spec	C	G1
A11y	Automated audit (axe via @axe-core/playwright if approved, §16; otherwise scripted role, name and focus checks)	Spec	C·F·W	G1 (slice), G3
A11y	Token contrast pairs	Script	n/a	G1a
A11y	Reduced motion: computed transition and animation durations ≤ 1 ms on dive and surface	Spec (emulateMedia)	C	G1
A11y	Keyboard-only lifecycle: Title → dive → Surface → next dive	Spec	C·F·W	G1
A11y	Screen-reader announcements on card change (aria-live content asserted)	Spec	C	G1
Content	lint:units, KaTeX in-browser parse, content-inventory hash check	Script + spec	C	Every merge
Perf	Budgets per route (throttled); 10-minute heap check	perf-budget.js	C (HTTP)	G0 baseline, G1, G2, G3
Offline	Service worker: cached dive works offline; cache-version bump	Spec (HTTP)	C	G2
Device	Real low-end phone playtest, with notes	Manual	n/a	G1, G3
14. Scope control
14.1 Priorities
P0 (core; never cut)	P1 (important polish)	P2 (optional extras)
Recon, characterization tests, baseline	Test-out	Dive together co-op
CodexProgress: migration, idempotency, merge, honest status	Daily Dive, forgiving streak	Rooms 3–4 (Exchange, Map Room)
Unit schema, lint, review pipeline, Ratios unit, Wave 1 content	Tiered hints, card notes	Zone Trials
Dive player, Surface, Descent, unit sheet, Title, onboarding	Workshop and Tide-Pool Lab, "Your Dive" tab, NPC hooks, progress scenery	Audio and narration, High-tier ambient extras
Wreck reader for all 42 lessons, with fidelity checks	Export and import of progress	Bookmarks
Reef Map, Logbook core tabs, Sonar search	High-contrast slate	Tide Pools zone (K–5)
Kitchen and Recipe Scaler with inline fallback; six templates by G2	Vendored libraries for offline	Specimen-card flip polish beyond the base
Tokens, tiers, CodexLoop, lazy loading, budgets, service worker	Snapshot coverage beyond the slice	Logbook extras
Accessibility basics, cutover with rollback	 	 
14.2 Cut order under time or budget pressure (from the earlier plan, extended)
Dive-together co-op
Rooms 3–4
Tide Pools zone and K–5
Audio and High-tier ambient extras
Chronicle Reef and Midnight/Abyss content. Ship Wave 1 and Wave 2a, and label the rest "Charting soon".
Logbook extras
P1 items in reverse table order
14.3 Never cut
The new UI on every learning-path screen
Wave 1's quality bar and human review
Performance gates
Migration safety and progress correctness
Wreck access and content fidelity
Basic accessibility
Honest save status
14.4 Frozen (do not touch)
The transport in network.js
The presence format
Avatar catalogs (append-only)
Classic Order Up behaviour
The chat-avatar contracts
14.5 Rules
Dependencies: no new runtime dependencies or frameworks without approval.
Assets: prefer procedural art over binary assets.
Legacy code: don't polish legacy code that is being retired. Wrap it.
Context: read docs/lounge-architecture.md in full. Read everything else by grep or targeted view. Never load js/data/* (about 290 KB) into context; use the inventory script instead.
15. Risks
Risk	Mitigation
Curriculum is unbounded	Units, waves and gates. Phase 1 builds exactly one unit.
AI-written errors	Cited sources, script-verified arithmetic, a reviewer pass, human sign-off, and status gating in production
Progress loss in migration	Read-only legacy data, backups before import, idempotent import, fixtures, and read-only handling of newer schemas
A second, conflicting store, or legacy tabs wiping v10 data	One writer, Option B by default, merge rules where absence never deletes
Two UIs doubling the work	Flag now, hard cutover in Phase 3, no legacy polish
The v10 budget is unmeasurable while legacy loads eagerly	The R-BOOT decision in M0.7
Content lost during re-presentation	Same renderer path, fidelity tests, hash check
Performance regressions from new art	Budgets as gates, tiers, static WebP scenes, procedural art
The pixel aesthetic hurts legibility	Pixel type only at ≥20 px and only for display; Atkinson Hyperlegible for everything readable
The Lounge blocks learning	Mandatory inline fallback, with an 8 s timeout
Test coverage limited to the Lounge	M0.2 closes the gap before changes start
Parallel merge conflicts	File ownership, daily rebase
Engagement dark patterns	No streak guilt or pressure timers; XP comes from retrieval
Licensing	Original prose. Standards cited as codes only. Fonts must be OFL. Attribute any open material used.
Unverified assumptions from planning	The RECON checklist with safe defaults. Reports must state what was verified.
16. Owner decisions (defaults assumed until changed)
Framework: US (CCSS, NGSS, C3, AP, OpenStax).
Audience: grades 6–12 plus first-year college. K–5 is deferred.
Wave 1 reefs: Number, Life, Matter & Motion. The Phase 1 unit is Number · Shallows · Ratios.
Design brief: approved before any UI code (G1a), including the choice of pixel face.
Test device: a real low-end device, if one is available.
Feature disposition: confirm the list after the P0.3 audit.
Storage option: confirm the A/B result from recon (default: B).
Dev dependency: approve @axe-core/playwright as a dev-only dependency (default: request approval; scripted checks if it is declined).
Soft prerequisites: confirm "Dive anyway" (default: on).
Analytics: Phase 4 analytics stay local-only unless approved.
Appendix A. Legacy lessons to curriculum bridge
This is a draft built from lesson titles. M0.5 verifies it against the content inventory. The format is: lesson id, title, then the reef(s) and the school or college concept it can hook.

Sector 01 Internet Lore

s1-1 Layer Cake of Digital Abstraction: Signal (networks, how the internet works); Matter & Motion (light, refraction, total internal reflection).
s1-2 Cicada 3301: Signal (cryptography, logic puzzles); Number (primes, modular arithmetic).
s1-3 Weaponized OSINT: Signal (evaluating evidence, source reliability).
s1-4 Evolution of Memes: Signal (media literacy, rhetoric); Chronicle (culture).
s1-5 Bellingcat and GeoGuessr: Signal (verification); Chronicle (geography, map skills).
s1-6 Backrooms and the Lost Seed: Signal (narrative, media). Lowest priority.
Sector 02 Gaming Folklore

s2-1 Game Loop and Netcode: Number (functions, rates, vectors); Signal (CS).
s2-2 Far Lands and 2b2t: Number (number systems, overflow, pseudorandomness).
s2-3 Roblox FilteringEnabled: Signal (client and server, security basics).
s2-4 Gacha Math: Number (probability, expected value, geometric distributions). Best statistics hook in the library.
s2-5 Virtual Social Disasters: Life (epidemiology, models); Chronicle (economics).
s2-6 Cosmic Rays and Collapsed Platforms: Matter & Motion (radiation); Signal (reliability).
Sector 03 AI and Neural Mind

s3-1 Perceptrons to Transformers: Number (linear functions, weighted sums); Signal.
s3-2 Pre-training vs Post-training: Signal (CS, feedback loops).
s3-3 Alignment Folklore: Signal (ethics, argument).
s3-4 MoE, KV-Cache, Test-Time Compute: Signal, Abyss zone only.
s3-5 Injection and Sleeper Agents: Signal (security).
Sector 04 Geopolitics

s4-1 Selectorate Theory: Chronicle (civics, forms of government).
s4-2 Maritime Chokepoints: Chronicle (geography, trade); Sky & Sea (oceans).
s4-3 Money as Statecraft: Chronicle (economics, exchange rates).
s4-4 Subsea Warfare and Mineral Chokepoints: Chronicle (resources); Matter & Motion (periodic table link).
Sector 05 Anthropology

s5-1 Cognitive Revolution: Chronicle (world history, prehistory).
s5-2 Agricultural Trap: Chronicle (Neolithic revolution); Life (human biology, diet).
s5-3 Evolutionary Mismatch: Life (evolution, adaptation).
Sector 06 Physics and Astrophysics

s6-1 Thermodynamics and Arrow of Time: Matter & Motion (energy, entropy; HS physics and chemistry).
s6-2 Special and General Relativity: Matter & Motion (Midnight and Abyss).
s6-3 Stellar Death and Black Holes: Sky & Sea.
s6-4 NANOGrav: Sky & Sea (waves, signals in noise).
Sector 07 Astronomy

s7-1 Cosmic Distance Ladder: Number (ratios, similar triangles, trig via parallax); Sky & Sea. A natural Wreck link from the Ratios unit.
s7-2 Stellar Life Cycles: Sky & Sea; Matter & Motion (fusion).
s7-3 Exoplanets and Fermi Paradox: Sky & Sea; Number (estimation).
s7-4 JWST at Cosmic Dawn: Sky & Sea (Abyss).
Sector 08 Psychology and Game Theory

s8-1 Dual-Process Architecture: Signal (reasoning).
s8-2 Bias Armory and Fallacy Bestiary: Signal (logic, argument).
s8-3 Bayesian Updating: Number (conditional probability).
s8-4 Goodhart and the Prisoner's Dilemma: Chronicle (economics, game theory).
Sector 09 Big History

s9-1 Four Thresholds of Complexity: Chronicle; Life (origin of life); Matter & Motion (chemistry of stars and life).
s9-2 Great Accelerators of Modernity: Chronicle (industrial revolution); Matter & Motion (Haber-Bosch, nitrogen).
Sector 10 Vibes and Aesthetics

s10-1 to s10-4: Chronicle (art and cultural history, 1880 to the 2020s); Signal (media literacy).
What the map shows.

Signal and Sky & Sea already have plenty of hooks. Chronicle has about half the hooks it needs.
Number, Life and Matter & Motion have thin or indirect coverage. That is why they are Wave 1: the most basic school subjects are where the gap is widest.
Appendix B. Kickoff prompt for the build agent
Paste this as the agent's first message, with this document attached or saved in the repo at docs/v10/plan.md.

You are the build agent for Polycodex v10, a redesign and curriculum overhaul of the repo Lucinexon/The-Polycodex-of-Learning (vanilla JS and CSS, no build step, Playwright tests).

Read the attached delivery plan fully, then read docs/lounge-architecture.md fully. Read any other code only by grep or targeted view; never load js/data/* into context. Use the content-inventory script instead.

This plan was written without access to the repository. Every claim marked RECON, and every finding in §2, is unverified. Your first job is M0.1: answer every row of the §11 checklist in docs/v10/recon.md, citing file and line. Where reality differs from the plan, apply the stated safe default and say so.

Work strictly in phase order on a v10 branch. Do not write any v10 UI or curriculum content until Gate G0 passes. Do not write UI code until the design brief passes G1a.

Quality pillars, in priority order: content integrity, progress correctness, learning usability, visual polish. Performance budgets are gates. Legacy user data is never deleted or overwritten. The frozen areas in §14.4 are not touched. No new runtime dependencies or frameworks without asking.

For every task, report: what changed, how you verified it, measurements against budget, and open risks. Never describe mocks, CSS-only passes, placeholder buttons or unrun tests as completed work. If a gate fails, stop and report instead of continuing.

Your first deliverable is a single report containing:

the recon document
the test coverage added for the legacy learning loop
the performance baseline, with the harness and throttling method
the feature inventory with keep, merge, hide or cut recommendations
the content inventory and verified bridge map
drafts of contracts C1 to C6
Ask me for decisions only where §16 lists them.

17. Definition of done (prioritized; every box must be checked with evidence)
These do not count as done: a plan, a mockup, a screenshot, a CSS-only pass, a placeholder or dead button, a feature behind a flag that has no test, or a claim with no linked test run or measurement.

1. Content integrity

Incomplete to-do item
content-inventory.json lists all 42 legacy lessons with stable ids and order. The hash check passes, and any intended change is documented.

Incomplete to-do item
All 42 Wrecks are reachable from the Reef Map in ≤3 taps, with none locked (AC-M1).

Incomplete to-do item
The Wreck fidelity report shows heading parity, ≥99.5% text parity and zero raw-markup leaks for all 42 (AC-W1–W3).

Incomplete to-do item
Every published unit has passed lint, the in-browser KaTeX and clipping checks, has a review file, and carries human sign-off (status: published, reviewedBy).

Incomplete to-do item
No lesson, card or check has been silently truncated. Every overlong-card lint warning is resolved by splitting the card or by a documented reviewer decision.
2. Progress correctness

Incomplete to-do item
CodexProgress is the only v10 writer. Before cutover, v10 never writes the legacy keys (verified by test).

Incomplete to-do item
Migration fixtures pass. Legacy keys stay byte-identical. Re-running the import adds zero events. The corrupt and newer-schema cases behave safely (AC-D4–D6).

Incomplete to-do item
Refresh, double-tap, two-tab and reload-during-transition tests show no lost, duplicated or false progress (AC-D1–D3, AC-S1).

Incomplete to-do item
Save failure shows "Couldn't save" and never "Saved". "Synced" appears only after an acknowledgement (AC-D7).

Incomplete to-do item
Cloud sync works for both the legacy UI and v10, and older clients do not erase v10 data (AC-D8).

Incomplete to-do item
Reading never raises mastery. The stage rules hold under mocked-clock tests (AC-L4–L7).
3. Learning usability

Incomplete to-do item
A new learner reaches their first card in ≤3 taps. A returning learner reaches their saved card in 1 tap from the Title screen (AC-T3, AC-L10).

Incomplete to-do item
Resume works at a card, at a check, after a content rev change, and with a removed dive (AC-L2, AC-L8).

Incomplete to-do item
Every check explains every answer, and "I don't know" is available (AC-L11).

Incomplete to-do item
Wave 1 (12 units, about 60 dives) is live, along with all six activity templates and inline practice for every dive.

Incomplete to-do item
Kitchen practice works both ways, and the inline fallback works with the Lounge blocked (AC-LG1).

Incomplete to-do item
Logbook, Sonar search, Review and Settings work in their empty, populated and error states.
4. Performance (gate)

Incomplete to-do item
The perf harness report shows every route within §8.3 on the throttled profile, including the Title screen at ≤150 KB gz JS with zero third-party scripts.

Incomplete to-do item
Low tier: no backdrop-filter, CodexLoop.activeCount() is 0 in dives, and the Lounge stays at ≥30 fps or idles.

Incomplete to-do item
The 10-minute heap check passes, and the real low-end device pass is recorded with notes.
5. Accessibility

Incomplete to-do item
Token contrast pairs meet WCAG 2.2 AA, and the automated audit shows zero serious or critical issues on every learning-path screen.

Incomplete to-do item
The full lifecycle can be completed by keyboard only on Chromium, Firefox and WebKit, with a focus ring always visible.

Incomplete to-do item
Card changes are announced to screen readers, every gesture has a single-pointer alternative, and targets are ≥44 px.

Incomplete to-do item
Reduced motion and text at 130% are verified, with no clipping at 360×640 (AC-P1, AC-L13).
6. Visual and UX polish

Incomplete to-do item
Every screen implements its C6 state list (first visit, loading, empty, populated, in progress, completed, error, offline, save failed, disabled with a stated reason), and each state has a snapshot.

Incomplete to-do item
Tokens are the only source of colour, spacing, radius, shadow and motion values (a lint or grep check finds no raw hex values in css/v10 outside tokens.css).

Incomplete to-do item
No scanlines, grid, blur, glow, glass, cyan glow or uppercase mono microcopy remain on v10 screens. The naming map is applied.

Incomplete to-do item
The owner has playtested on a phone and approved the look and feel against the G1a brief.
7. Regression and release

Incomplete to-do item
The existing ~120 specs and all new specs are green on Chromium, Firefox and WebKit.

Incomplete to-do item
Chat, avatar, Lounge, notebook, flashcards, account and BYOK all work under v10 and under ?ui=legacy.

Incomplete to-do item
The frozen areas are untouched (diff check).

Incomplete to-do item
The default is flipped to v10, ?ui=legacy works for one release, and the rollback is documented and rehearsed.

Incomplete to-do item
Legacy CSS and JS marked "cut" in the inventory are deleted, and the suite is still green.
8. Reporting honesty

Incomplete to-do item
Every RECON row has been answered with evidence, and any deviation from the plan is recorded.

Incomplete to-do item
Every gate report lists what changed, how it was verified, measurements against budget, and open risks. Nothing is reported as done without a linked test run or measurement.