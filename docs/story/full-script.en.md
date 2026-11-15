# FINAL ORBIT
## The Final Orbit
### Space Mission Design Game

**Main Story and Front-End Production Plan V2.0**

---

> Full story script: main story V2.0 with the concrete dialogue rewrites and NASA facts merged in.
>
> - [NASA Fact] and [Term card] blocks can go in pop-up cards after dialogue, loading screens or the results page. Every NASA fact cites a source.
> - Numbers in the new explanations are written as {braces} for the game to fill in. Numbers in the dialogue ($1,000,000, 6 weeks, 3 W / 7 W, 13 W vs 10 W, 70 kg, funding 196 → 176) are current game settings; replace them when the values change.
> - Sections marked "(Optional)" are suggested additions. The team decides whether to use them.
> - Space Apps requires teams to disclose how AI was used. This document counts as "copy editing and fact-checking".

# 1. Basic Game Settings

## 1.1 Game Title

**FINAL ORBIT**

**Tagline:**

*Every Decision Has a Consequence.*

Every decision has a consequence.

## 1.2 Genre

A story-driven space mission simulation game.

It combines:

- Space engineering design
- Resource and schedule management
- Engineering tests and verification
- Story events and decisions
- Results carried over between missions

Players don't fly the rocket. They play the chief engineer, who brings together the technology, the resources and the mission requirements.

## 1.3 Story Background

The story is set in a fictional near future.

As space technology spreads, more and more private companies are taking part in satellite, launch vehicle and deep-space missions.

Even so, space engineering is still extremely expensive and risky.

For a small space company, one successful mission can bring many partnerships, and one major failure can cost it all of its investors.

The player's company, **ASTRA DYNAMICS**, was once a promising private aerospace startup.

It had an experienced engineering team and support from both government and private investors.

Two years ago, the company was preparing its first uncrewed orbital demonstration.

But in the last system test before launch, the engineering team found an intermittent anomaly in the avionics.

Engineers recommended delaying the launch to investigate.

But the company had already invested heavily, and if the mission slipped, the investors might walk away.

In the end, the player, as chief engineer, approved the launch without enough verification evidence.

After liftoff, the rocket malfunctioned in flight and lost contact with mission control.

The mission failed.

The accident investigation could not fully confirm the cause of the failure.

But the company's weaknesses in engineering review and risk management were publicly questioned.

Investors pulled out one after another, and partnerships were cancelled.

Two years later, the company is on the verge of closing.

Just as the last engineers are about to leave, an urgent mission invitation from the government gives the team one last chance.

---

# 2. Main Characters

To keep art and animation work small, the main story needs only three main NPCs.

The player has a first-person view, so no player character portrait is needed.

## 2.1 Player: Chief Engineer

**Role: Chief Engineer, ASTRA DYNAMICS**

The player is the company's key engineering decision-maker.

Responsible for:

- Engineering system integration
- Confirming mission requirements
- Resource and design trade-offs
- Engineering risk assessment
- Test and verification planning
- Final engineering decisions

Two years ago, the player approved an orbital demonstration with an unresolved anomaly.

Although the cause was never fully explained, the player still carries the responsibility.

The whole story is about how the player comes to understand engineering responsibility again.

## 2.2 Alex Morgan

**Position: Project Manager**

Rational and practical; focused on money and schedule.

Alex has been with the company since its early days.

Two years ago, he warned the player that delaying the launch could cost the company its investors.

Since the accident, he has felt that part of the responsibility is his.

Now he badly wants the company to survive, so he often argues from the cost and business side.

**Signature line:**

"Without money, even the best design never gets finished."

## 2.3 Dr. Elena Carter

**Position: Lead Systems Engineer**

Rigorous and calm; focused on engineering evidence and verification.

Elena was one of the engineers who raised the anomaly warning two years ago.

She recommended delaying the launch, but couldn't change the team's decision.

After the accident, she left the company for a while.

When the new government contract appears, she decides to rejoin the team.

She doesn't distrust the player completely. She just wants the team never to make the same mistake again.

**Signature line:**

"We can't just believe the design will work. We have to prove it can do the job."

## 2.4 Samuel Reed

**Position: Government space program representative**

Samuel is the contact between the government and ASTRA DYNAMICS.

He knows the company's past, so he doesn't fully trust the team.

But the government has an urgent mission need, so he is willing to let the company back into the space program.

He cares about real results and won't lower the requirements because the company is struggling.

**Signature line:**

"We're not here to save your company. We're looking for a team that can get the job done."

---

# 3. Overall Story Structure

The game has five main stages.

| Stage | Title | Core content |
|---|---|---|
| Prologue | The Failed Mission | The orbital accident two years ago |
| Chapter 1 | Redemption | Saving the company with a CubeSat mission |
| Chapter 2 | Ghosts of the Past | Trying for orbit again and facing the past |
| Chapter 3 | Beyond Redemption | A lunar science mission and the final choice |
| Epilogue | A New Beginning | Looking back on three missions and ahead to the company's future |

All three main chapters follow:

**Accept the contract → Mission briefing → Engineering design → Events and adjustments → Design review → Mission execution → Mission record.**

The story provides the mission background and the conflict.

The engineering system decides the final mission result from the player's design and verification.

---

# Game Guide: For First-Time Players

> When members of the public open the game, they don't know what they're supposed to do or what the story is about. Everything in this part can go straight into the game, for example behind a "How to Play" button on the main menu, or as a pop-up the first time someone starts.
> All numbers are written as {braces} so the game can fill in the current settings. If the values change, the text doesn't need to.

### One-line pitch (main menu)

> You're the chief engineer of a small space company. Money and time are limited. You decide which parts go into the satellite and rocket, which tests to run, and then you press launch.
> Before you press it, you have to answer one question: "How do you know it will work?"

### 30-second backstory (before the Prologue)

> Narrator: "Two years ago, an ASTRA DYNAMICS rocket malfunctioned in flight and lost contact with the ground. The mission failed."
> Narrator: "Before launch, engineers had noticed the rocket's computer sometimes rebooted by itself, but they couldn't find out why. The company needed its next payment, so it pressed launch anyway."
> Narrator: "Since that day, nobody has been willing to trust this company with a mission."
> Narrator: "You are the chief engineer who signed that launch approval. Today, someone is giving the company one last chance."

### Character cards

| Character | Role | What they care about | Signature line |
|---|---|---|---|
| You | Chief Engineer | Making technical decisions and signing the review form | — |
| Alex Morgan | Project Manager | Money and time | "Money spent on the camera is money we can't spend on testing." |
| Dr. Elena Carter | Lead Systems Engineer | Evidence | "How do you know it works?" |
| Samuel Reed | Client representative | Results and deadlines | "If you take the picture but can't send it back, it doesn't count." |

### How to play: every chapter follows seven steps

1. **Read the mission briefing**: learn what the client wants and when.
2. **Choose parts**: every part has a price, a power draw or mass, and a capability.
3. **Schedule work**: each task moves time forward and spends money.
4. **Decide what to test**: testing costs money, but tells you whether a part actually has a problem.
5. **Go to review**: reviewers check your evidence and approve the launch only if it holds up.
6. **Launch and operate**: the truth comes out. Hidden problems appear now.
7. **Read the results**: see what each decision led to.

### Winning and losing

| Results screen | Meaning |
|---|---|
| Extra goal achieved | You met the minimum requirement and delivered more |
| Basic contract complete | You met exactly the minimum requirement |
| Launched — delivery short | You reached space, but didn't deliver enough data or didn't reach the target |
| Not launched | Money or time ran out first, or you never passed review |

### The most important idea: testing doesn't make a part better — it tells you whether it's good

> Elena: "Whether a part has a problem was decided the moment it was built."
> Elena: "Testing doesn't fix it. It tells us the truth. Once we know the truth, we can decide to fix it, swap it, or fly and take the risk."
> Elena: "Flying without testing isn't braver. It just means you don't know what you're betting on."

**Example of "estimated risk"** (can be a tutorial screen)
> Elena: "About {1} in {5} reused parts has a problem. We haven't tested yet, so we start at {20}%."
> Elena: "We ran an analysis and found nothing. Now it's about {11}%. Analysis can miss things, so it's not zero."
> Elena: "Then a physical test, still nothing. Down to {4}%. Deeper tests cost more, but miss less."

### Why not test everything as deeply as possible?

> Alex: "If we test everything to the deepest level, we run out of money before launch."
> Elena: "So we choose. Test first whatever would hurt most if it failed, and whatever is most likely to fail."

### What the on-screen words mean (hover tooltips)

| On-screen text | What it is | Why it matters |
|---|---|---|
| Remaining budget / credits | Money left to spend. 1 credit = {amount} | Parts, tests and repairs all cost money. When it runs out, you can't continue |
| Weeks remaining | Weeks until the rocket leaves | The rocket won't wait. If you don't pass review in time, you don't launch |
| Payload | The instrument that does the actual job. In Chapter 1 it's a camera (imager) | Decides how many image sets you get and how sharp they are |
| Power supply | How many watts the solar panels and battery can provide | Everything running at once can't use more than this |
| Peak demand / peak power | The most power needed at any one moment | Like running the air conditioner, microwave and hair dryer at once and tripping the breaker |
| Schedule: together / staggered | Take pictures and send data at the same time, or take turns | Together uses a lot of power; taking turns saves power but captures less |
| Transmit timer / radio silence | How many minutes the satellite must wait after leaving the rocket before turning on its radio | When you ride someone else's rocket, you follow their rules. Transmitting too early fails the check |
| Batch | One package of observation data | The client needs enough batches for the mission to count |
| Contact / downlink | Sending data down while the satellite passes over the ground station | Each contact can only carry so much |
| Design freeze | The design is final and parts are ordered | Changing parts after the freeze costs extra money and time |
| Risk item | A part or function that might be hiding a problem | The problem was decided at the start; you just don't know yet |
| Your estimated risk % | The chance it has a problem, based on your evidence | The more you test, the more you can trust this number |
| Analysis / unit test / end-to-end test | Three levels of verification, each deeper and more expensive | Deeper tests are less likely to miss a problem |
| Fix | Repairing a problem you found | Costs time and money; only after the fix do you know it's fine |
| Sign to accept risk | Choosing to fly while knowing a risk exists | It goes on the record, and you own the result |
| Waiver (Chapter 3) | Reviewers allow one failed item to fly anyway | It has a cost and shows up in the results |
| Team reputation / mission record | The missions you've completed | Affects the partnership terms you get in the next chapter |
| Seed | The ID for which hidden problems this run has | Enter the same seed to replay the same run |

### Game stages vs the NASA process

| Game stage | What happens | NASA phase |
|---|---|---|
| Feasibility | Choose payload and power; check whether it can work | Pre-Phase A / Phase A |
| Detailed design | Set the schedule and transmit timer, then freeze the design | Phase B / Phase C |
| Build and verify | Assemble and test each part separately | Phase C/D |
| Integration test | Put everything together and run the real sequence once | Phase D |
| Flight review (FRR) | Hand in the evidence and decide whether it flies | Final review of Phase D |
| Mission simulation | Launch and contact; the results are revealed | Phase E |
| Mission results | Review what each decision led to | Phase F (closeout) |

### Writing a results page the public can follow

Write every line in three parts: **your decision → what it caused → what if you had…**

> "You chose the {high-resolution imager}. Imaging and sending data together needs {13} W, but your power supply gives only {10} W. You switched to taking turns and captured {1} fewer batch."
> "You didn't test {on-orbit charging}. This run it really was faulty, so you lost {1} batch. If you had run '{power charging test with a light source}' ({7} credits), you would have had an {85}% chance of catching it before launch."
> "You tested {imager calibration} and it was fine. That money wasn't wasted: when you signed, you knew how big a risk you were taking."

---

# Opening: Learn the Mission Flow Before You Launch

> Based on the phases in Chapter 7, "Mission Inception", of NASA's *Basics of Space Flight*. Place it after the player presses "Start" and before the Prologue, or make it a "Mission Handbook" button the player can reopen at any time.
> Each phase has three parts: **In-game explanation** (goes straight into the game), **[Note]** (for writers), and **[NASA Fact]** (cards or loading screens).

### Opening lines

> Elena: "We're up! Let's take a few minutes to learn how a space mission works."
> Elena: "At NASA, a mission usually goes through five phases, from an idea on paper to a spacecraft working in space."
> Elena: "Every phase ends with a review. The reviewers ask one thing: 'Can you show me the evidence?'"

### The five phases at a glance

| Phase | NASA name | In one sentence | Where it appears in the game |
|---|---|---|---|
| 1 | Pre-Phase A: Conceptual Study | You have an idea. Is it worth doing? | Chapter 1, scenes 102–103: the request and the mission briefing |
| 2 | Phase A: Preliminary Analysis | Draft the plan: what to build, when to launch, how to fly, what it costs | Scene 103: write down what success means; check the budget |
| 3 | Phase B: Definition | Lock in requirements, schedule and specifications | Scene 104: choose the camera and power; handle the new request |
| 4 | Phase C/D: Design and Development | Assemble, test, launch | Scene 105: vibration, vacuum and communication tests, plus the review |
| 5 | Phase E: Operations | Work in space and send data back to Earth | Scenes 106–107, Chapter 2 orbit attempt, Chapter 3 Moon landing |

Source: [NASA Basics of Space Flight, Ch.7 p.1](https://science.nasa.gov/learn/basics-of-space-flight/chapter7-1/)

---

### Phase 1: Pre-Phase A, Conceptual Study — Is this idea worth doing?

**In-game explanation**
> Elena: "Every mission starts with a question. Ours is: how much does the same farmland change before and after the dry season?"
> Elena: "Then we have to convince the people paying for it. They look at mass, power use, how much science we bring back, and whether it's safe."

**[NASA Fact] How does NASA pick experiments?**
NASA sends out an "Announcement of Opportunity" inviting universities and research groups around the world to propose experiments. Proposals are reviewed for science merit, with mass, power use, science return and safety among the key criteria.
Source: [Basics of Space Flight, Ch.7 p.1](https://science.nasa.gov/learn/basics-of-space-flight/chapter7-1/)

---

### Phase 2: Phase A, Preliminary Analysis — Draw the whole plan

**In-game explanation**
> Alex: "The first plan has to answer six questions: what we build, when we launch, which path we fly, what we do when we arrive, where we test, and who operates it."
> Alex: "And it needs a price. A plan without a price isn't a plan."
> Elena: "We also decide which parts we build ourselves and which we buy off the shelf."

**[NASA Fact] Rockets: fly straight there, or take a detour and borrow speed?**
To reach a distant target, you can use a very large rocket and go directly, or take a longer path past other planets and use their gravity for "free" acceleration. The second option saves propellant and money but takes more time. Mission designers have to trade money against time.
Source: [Basics of Space Flight, Ch.7 p.2](https://science.nasa.gov/learn/basics-of-space-flight/chapter7-2/)

**[NASA Fact] Orbits: Mars has a waiting line**
Earth and Mars both orbit the Sun. The lowest-energy chance to launch to Mars comes about once every 25 months. It's like throwing a dart at a moving target: you aim where Mars will be, not where it is. Miss it, and you wait more than two years.
Source: [Basics of Space Flight, Ch.4](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/)

---

### Phase 3: Phase B, Definition — Write the requirements down

**In-game explanation**
> Elena: "Now we turn requirements into sentences we can check. Not 'the pictures must be clear', but 'two image sets, field ridges visible, returned to the ground within two weeks of launch'."
> Elena: "Once the requirements are written, we can set the schedule and specifications. Every part will be checked against this list."
> Alex: "Changing the design now is still cheap. The later we change it, the more it costs."

**[NASA Fact] Late design changes are expensive**
NASA's training text says plainly: late design changes are always costly. The Galileo mission to Jupiter went through many significant and costly changes before launch. Space Station Freedom spent tens of billions of dollars over several years before a major redesign turned it into the International Space Station.
Source: [Basics of Space Flight, Ch.7 p.2](https://science.nasa.gov/learn/basics-of-space-flight/chapter7-2/)

---

### Phase 4: Phase C/D, Design and Development — Build it, then test it until something breaks

**In-game explanation**
> Elena: "We build the parts one by one, then put them together into one satellite. NASA calls this ATLO: Assembly, Test, and Launch Operations."
> Elena: "Before launch, the whole satellite goes into a space-like environment: no air, bright light, then deep cold."
> Elena: "The ground station has to be ready at the same time and tested with the satellite. If the satellite reaches space and nobody on the ground can hear it, it's useless."

**[NASA Fact] A spacecraft "oven and freezer"**
Voyager, Ulysses, Galileo, Cassini and many other spacecraft were tested extensively in JPL's 25-foot (about 7.6 m) solar-thermal-vacuum chamber before launch. The chamber removes the air and uses bright light to simulate the Sun.
Source: [Basics of Space Flight, Ch.7 p.2](https://science.nasa.gov/learn/basics-of-space-flight/chapter7-2/)

**[NASA Fact] Testing is supposed to break things**
NASA's CubeSat handbook says a new satellite design will almost certainly break something during testing, usually during vibration testing. That is normal. Better to break it on the ground than in space (see also scene 105).
Source: [NASA CubeSat 101, p.24](https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=24)

---

### Phase 5: Phase E, Operations — Working in space

NASA splits operations into four parts: **Launch → Cruise → Encounter → Extended Operations**, followed by **Closeout**.

#### 5-1 Launch

**In-game explanation**
> Elena: "A rocket can't just leave whenever it wants. There's only a certain span of time each day when it can launch. That's the launch window. Miss it and you wait for the next one."
> Elena: "Launch sites close to the equator are better, because Earth's spin gives you a free push."

**[NASA Fact] Rockets: launching from the equator gives you free speed**
Earth spins. A rocket sitting on a launch pad near the equator is already moving at over 1,650 km per hour before it ignites. The same rocket launched near the equator needs less propellant, or can carry a heavier spacecraft.
Source: [Basics of Space Flight, Ch.14](https://science.nasa.gov/learn/basics-of-space-flight/chapter14-1/)

**[NASA Fact] Launch windows**
A launch window is the span of time when a launch can meet both safety and mission requirements. Sometimes it is only a few hours a day, so the rocket can make the best use of Earth's rotation.
Source: [Basics of Space Flight, Ch.14](https://science.nasa.gov/learn/basics-of-space-flight/chapter14-1/)

**[NASA Fact] Rockets come in stages**
NASA's Delta II rocket could fly with two or three stages. Two-stage versions usually carried payloads to low Earth orbit. Three-stage versions had an extra push for missions to Mars, comets or asteroids. Each used-up stage is dropped, so the rocket gets lighter as it climbs.
Source: [Basics of Space Flight, Ch.14](https://science.nasa.gov/learn/basics-of-space-flight/chapter14-1/)

#### 5-2 Cruise (after launch, before arrival)

**In-game explanation**
> Elena: "To fit inside the rocket, the antennas and solar panels are folded up at launch. They unfold once we're in space."
> Elena: "If they don't unfold, the satellite has no power and no voice. That's why we test the deployment mechanism on the ground many times."
> Elena: "On the way, we fire the engine a few times to correct our course. We also switch on and calibrate the instruments so we can trust their numbers."

**[NASA Fact] Orbits: always falling, never landing**
The International Space Station circles Earth about every 90 minutes and sees 16 sunrises a day. It is actually falling toward Earth the whole time. It just moves forward so fast that the ground keeps curving away beneath it, so it never hits.
Source: [NASA Space Station Facts and Figures](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/)

**[NASA Fact] Course corrections**
Even with a precise launch, spacecraft still make several Trajectory Correction Maneuvers (TCMs) on the way to fine-tune their path. While orbiting Saturn, Cassini had more than 400 chances to adjust its orbit and used about 300 of them.
Source: [Basics of Space Flight, Ch.13](https://science.nasa.gov/learn/basics-of-space-flight/chapter13-1/)

#### 5-3 Antennas and communication

**In-game explanation**
> Elena: "Every time the distance doubles, the signal from the spacecraft drops to a quarter of its strength."
> Elena: "So spacecraft use dish antennas to focus the signal into a beam and point it right at Earth."
> Elena: "Our CubeSat is close, but it only passes overhead for a few minutes at a time. If the pictures are too big, we can't send them all down."

**[NASA Fact] Antennas: signals fade with distance**
Radio energy spreads out over a sphere that keeps getting bigger. At 2 times the distance the signal is 1/4 as strong; at 10 times the distance it is only 1/100 as strong.
Source: [Basics of Space Flight, Ch.6](https://science.nasa.gov/learn/basics-of-space-flight/chapter6-1/)

**[NASA Fact] Antennas: dishes must point at Earth**
A spacecraft usually uses a dish antenna a few meters across (a high-gain antenna), pointed precisely at Earth. This greatly improves its ability to communicate.
Source: [Basics of Space Flight, Ch.10](https://science.nasa.gov/learn/basics-of-space-flight/chapter10-1/)

**[NASA Fact] Antennas: Earth's three giant ears**
NASA's Deep Space Network (DSN) has three communication complexes in California (USA), near Madrid (Spain) and near Canberra (Australia), about 120 degrees apart. As Earth turns, at least one can always see a distant spacecraft. It is the largest and most sensitive scientific telecommunications system in the world.
Source: [Basics of Space Flight, Ch.18](https://science.nasa.gov/learn/basics-of-space-flight/chapter18-1/)

**[NASA Fact] If the data isn't sent in time, it gets overwritten**
When Magellan mapped Venus by radar, the data from each orbit had to be sent to Earth before the next orbit began, or new data would overwrite it. That's why designers must make sure from the start that ground antennas have enough time to receive the data.
Source: [Basics of Space Flight, Ch.7 p.2](https://science.nasa.gov/learn/basics-of-space-flight/chapter7-2/)

**[NASA Fact] Antennas are shared**
Many spacecraft compete for time on DSN antennas. Years before launch, mission designers study whether the antennas will be too busy, and use the results to choose the launch date.
Source: [Basics of Space Flight, Ch.7 p.2](https://science.nasa.gov/learn/basics-of-space-flight/chapter7-2/)

#### 5-4 Encounter

**In-game explanation**
> Elena: "All those course corrections are so we arrive at the right place at the right time."
> Elena: "On a flyby, you get one chance to take pictures. Miss it and it's gone. To stay and orbit, you have to slow down so the target's gravity can catch you."

**[NASA Fact] Using the atmosphere as a brake**
After Mars Global Surveyor entered orbit around Mars, it dipped through the thin upper atmosphere again and again, using air drag to slow down and turn a long, stretched orbit into a close, circular one. This is called aerobraking, and it saves a lot of propellant. The Moon has no atmosphere, so this trick doesn't work there.
Source: [Basics of Space Flight, Ch.16](https://science.nasa.gov/learn/basics-of-space-flight/chapter16-1/)

#### 5-5 Extended operations and closeout

**In-game explanation**
> Elena: "When the mission is done, a healthy spacecraft sometimes gets a new job. It's already out there, so that's much cheaper than launching a new one."
> Elena: "But propellant and power always run out eventually. When they do, the mission ends."

**[NASA Fact] Voyager is still working**
Voyager 1 and 2 finished their original missions long ago and are still working on extended missions. Voyager 2 took five years to fly from Saturn to Uranus, and on the way engineers gave it new abilities through new software, such as data compression.
Source: [Basics of Space Flight, Ch.17](https://science.nasa.gov/learn/basics-of-space-flight/chapter17-1/)

**[NASA Fact] No propellant, no mission**
Pioneer 12 ran out of propellant in 1993 and could no longer resist drag from Venus's thin upper atmosphere, so its orbit slowly decayed. To save power, Pioneer 10 and 11 had to turn off the heaters on their propellant lines. The propellant froze, and the spacecraft could never maneuver again.
Source: [Basics of Space Flight, Ch.17](https://science.nasa.gov/learn/basics-of-space-flight/chapter17-1/)

---

### Reference: How much do NASA missions cost?

> Alex: "We have one million dollars. Sounds like a lot? Take a look at NASA's bills."

| Mission | What it is | Cost (USD) | How many of our budgets ($1,000,000) |
|---|---|---|---|
| CubeSat launch (CSLI) | NASA pays the launch for a school CubeSat; enough for a 3U to low Earth orbit | Up to $300,000 | 0.3 |
| CAPSTONE | A CubeSat of about 25 kg that flew to the Moon to test a new orbit | $13.7M to build and operate + $9.95M launch | About 24 |
| CLPS Moon delivery (2019 contracts) | Commercial landers carry NASA instruments to the Moon | Astrobotic $79.5M; Intuitive Machines $77M | About 80 |
| Perseverance Mars rover | Searches for signs of ancient life on Mars | About $2.4B to build and launch | About 2,400 |
| SLS rocket + Orion spacecraft | Artemis Moon rocket, one launch | About $4.1B | About 4,100 |
| James Webb Space Telescope | Studies the earliest galaxies in the universe | About $9.66B lifecycle (2018 estimate) | About 9,660 |

(M = million, B = billion)

**[NASA Fact] Saving money now can cost money later**
Cassini went through an early design change that simplified its hardware and saved a lot of money at first. But the simpler hardware made operating the mission somewhat more expensive later.
Source: [Basics of Space Flight, Ch.7 p.2](https://science.nasa.gov/learn/basics-of-space-flight/chapter7-2/)

**Sources**:
- CubeSat launch: [NASA CubeSat 101, p.19](https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=19)
- CAPSTONE: [NASA: Awards Contract to Launch CubeSat to Moon](https://www.nasa.gov/news-release/nasa-awards-contract-to-launch-cubesat-to-moon-from-virginia/)
- CLPS: [NASA: Selects First Commercial Moon Landing Services](https://www.nasa.gov/news-release/nasa-selects-first-commercial-moon-landing-services-for-artemis-program/)
- Perseverance: [NASA Mars 2020 Launch Press Kit](https://www.jpl.nasa.gov/news/press_kits/mars_2020/download/mars_2020_launch_press_kit.pdf)
- SLS/Orion: [NASA OIG IG-22-003](https://oig.nasa.gov/docs/IG-22-003.pdf)
- Webb: [NASA: Completes Webb Telescope Review](https://www.nasa.gov/news-release/nasa-completes-webb-telescope-review-commits-to-launch-in-early-2021/)

---

---

# 4. Prologue: The Failed Launch

## PROLOGUE — THE FAILED MISSION

### Story purpose

Show the player the company's past and the major engineering decision they once made.

The Prologue is a fixed story; the player can't change the past.

### Scene P01: Ten minutes before launch

**Location: Mission control**

**Visual needs:**

One pixel-art mission control background.

Screens show the mission name, the countdown and system status.

No real rocket launch animation is needed.

#### On-screen text

**ASTRA DYNAMICS**

**ORBITAL DEMONSTRATION 01**

**T-00:10:00**

#### Dialogue

**Alex:**

"Ten minutes to the scheduled launch."

"The investors are waiting for the result of this demonstration."

"If it works, we get the funding for the next development phase."

**Elena:**

"Wait. The final system check found an anomaly."

The screen shows:

**WARNING — AVIONICS ANOMALY**

**Elena:**

"The flight computer just rebooted itself again. Only for two seconds."

"That's the third time this week. We've tried to make it happen again, and we can't."

"If the rocket reboots for two seconds in flight, nobody is controlling it for those two seconds."

"I recommend holding the launch until we finish investigating."

**Alex:**

"The investors were clear: no launch today, no next payment."

"Next month's salaries and the lab rent all depend on that money."

"But it's true the problem hasn't been confirmed yet."

**Elena:**

"We can't assume it won't affect the mission."

Both wait for the player's decision.

The screen shows:

**FINAL LAUNCH AUTHORIZATION**

The player clicks:

**[AUTHORIZE LAUNCH]**

The system shows:

**AUTHORIZATION CONFIRMED**

**(Optional) show that the player had a choice**

Show two buttons. **[DELAY LAUNCH]** is greyed out; hovering over it shows Alex: "If we delay, the company won't survive next month." The player can only press **[AUTHORIZE LAUNCH]**.

**[NASA Fact] Challenger (1986)**
The night before Space Shuttle Challenger launched, engineers at Morton Thiokol, the contractor for the solid rocket boosters, objected to launching in cold weather. They were worried the rubber O-ring seals in the booster joints would lose flexibility in the cold. The official investigation found that the people who made the final launch decision were not told about the engineers' objections or the seals' history of problems. 73 seconds after liftoff, a seal in the right booster joint failed, the shuttle broke apart, and all seven astronauts were killed.
Source: [Rogers Commission Report, Chapter V](https://history.nasa.gov/rogersrep/v1ch5.htm), [Chapter IV](https://history.nasa.gov/rogersrep/v1ch4.htm)

---

### Scene P02: Losing the signal

**Location: Same mission control**

The screen shows:

**T-00:00:10**

The countdown begins.

**10... 9... 8... 7...**

The screen briefly goes black, then shows:

**LIFTOFF CONFIRMED**

The numbers start changing.

**Alex:**

"The rocket has cleared the launch pad."

**Elena:**

"Telemetry is good. Speed, altitude, engine temperature, battery voltage — all in the green."

A few seconds later, a yellow warning appears on screen.

**WARNING — TELEMETRY ANOMALY**

**Elena:**

"Wait..."

**Elena:**

"Forty-seven seconds — the altitude reading froze... voltage is dropping!"

"It's not sending anything new — we've lost it!"

**Alex:**

"Check the communication link!"

The screen starts flashing.

**SIGNAL UNSTABLE**

**Elena:**

"We're losing the signal!"

The screen shows:

**SIGNAL LOST**

Then it goes black.

**MISSION FAILED**

[Term card] **Telemetry**: the "health report" a spacecraft sends to the ground, such as speed, altitude, temperature and battery charge. It's the only way the ground knows what's happening up there.

---

### Scene P03: After the accident

**Screen: Black news screen**

No news animation needed.

Just show three headlines one after another.

**ORBITAL DEMONSTRATION ENDS IN FAILURE**

**INVESTORS WITHDRAW FUNDING**

**ACCIDENT CAUSE REMAINS UNCONFIRMED**

Narration:

"The investigation found that the team had recorded an unresolved anomaly before launch."

**Narrator:**

"The wreckage fell into the sea. The last three seconds of flight data never reached the ground."

"Investigators could only confirm that the problem was somewhere near the avionics. Which part failed, no one will ever know."

"The failure cost ASTRA DYNAMICS the trust of its investors."

"The company's space program was shut down."

Fade out.

**TWO YEARS LATER**

**[NASA Fact] Sometimes the cause is never found: Mars Polar Lander (1999)**
In 1999, NASA's Mars Polar Lander sent its last telemetry just before entering the Martian atmosphere, and was never heard from again. The official record says the reason for the loss of contact is unknown.
Source: [NASA NSSDCA: Mars Polar Lander](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1999-001A)

---

# 5. Chapter 1: One Last Chance

## MISSION 01 — REDEMPTION
### Mission name: FIRST LIGHT

**Mission type: CubeSat Earth observation**

**Story theme: Rebuilding trust**

**Core engineering conflict: Science needs vs resource limits**

---

### [Chapter card] What is Chapter 1 about?

- **Your mission**: build a CubeSat and send at least {M} sets of clear ground images back to Earth within {N} weeks.
- **You choose**: the camera (basic or high-resolution), the power supply (basic or reinforced), whether to take pictures and send data together or take turns, when to turn on the radio, and what to test.
- **The core trade-off**: a better camera uses more power, makes bigger files and costs more. Money spent on the camera is money you can't spend on testing.
- **Where problems might hide**: whether the camera is calibrated properly, and whether the solar panels can charge the battery in space.
- **How you lose**: money or time runs out, you fail review, or you reach space but don't get enough images.
- **Real-world link**: NASA's CubeSat Launch Initiative lets school-built CubeSats ride to space on other rockets.

---

## Scene 101: The lab about to close

**Location: Company lab**

Use the existing pixel-art lab background.

Consider turning off some screens to show the company in decline.

### Dialogue

**Alex:**

"The board has made its decision."

**Alex:**

"No new contract by the end of the month, and we close."

"Someone's coming next week to price the vibration table and the vacuum chamber."

The player looks around the lab.

**Alex:**

"Two years ago, we thought we could change the space industry."

"Now we can't even keep this lab."

A notification suddenly appears.

**NEW EMAIL RECEIVED**

**Alex:**

"Wait..."

"This letter is from the government?"

### Player action

**[OPEN EMAIL]**

---

## Scene 102: The government's final offer

**Screen: Email window**

From:

**National Space Development Office**

Subject:

**URGENT — CUBESAT MISSION PROPOSAL**

Message:

"The contractor originally assigned to the Earth observation satellite mission cannot deliver on time because of technical and contract problems."

"This satellite will ride on someone else's rocket. The rocket leaves in **6 weeks** and will not wait for any passenger."

"Total mission budget: **$1,000,000**. No additional funds."

"Because ASTRA DYNAMICS took part in early technical studies for this work, we would like to invite your company to take over the mission."

"If you are interested, please confirm whether you accept a mission assessment."

The player clicks:

**[ACCEPT INVITATION]**

Cut to the company lab.

### Dialogue

**Alex:**

"The government really wants to give us another chance?"

Elena appears.

**Elena:**

"I heard you took on a new space mission."

**Alex:**

"Elena?"

**Elena:**

"I'm not here to celebrate."

"If we're really starting over, I want us to do it right this time."

She looks at the player.

"Especially the problems we never finished verifying."

**[NASA Fact] What is a CubeSat?**
CubeSats are measured in "U". 1U is a cube about 10 cm on each side, weighing about 1–1.33 kg, roughly the size of a large mug. Common sizes also include 3U, 6U and 12U. Because the sizes are standard, teams can use off-the-shelf parts and standard deployers on the rocket, which costs much less than a custom satellite.
Source: [NASA CubeSat 101, p.12](https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=12)

**[NASA Fact] Hitching a ride to space**
NASA's CubeSat Launch Initiative lets CubeSats from schools and nonprofits fly on rockets arranged by NASA. It has launched more than 150 CubeSats.
Source: [NASA CubeSat Launch Initiative](https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/)

---

## Scene 103: FIRST LIGHT mission briefing

**Screen: Mission briefing interface**

**MISSION 01 — FIRST LIGHT**

Mission description:

The government asks the team to develop a CubeSat for an Earth observation mission.

The player must design the satellite within the given size, mass, power, budget and schedule limits.

Once in orbit, the satellite must complete the required observations and send usable data back to the ground.

### Dialogue

**Samuel:**

"The goal of this mission is clear."

**Samuel:**

"The research group needs **two** sets of clear ground images, to compare the same farmland before and after the dry season."

"If you take the pictures but can't send them back, or they come back blurry, they don't count."

"You must develop and deliver the satellite within the agreed limits."

**Alex:**

"One million total. A basic camera alone costs $140,000. A high-resolution one costs $210,000."

"Money spent on the camera is money we can't spend on testing."

**Elena:**

"First we write 'what counts as success' on the whiteboard: two sets, clear, sent back."

"Then we choose the camera. Not the other way around — we don't pick the best camera and then try to squeeze it in."

"This time, schedule pressure must not drive the engineering judgment."

The player clicks:

**[BEGIN MISSION DESIGN]**

Enter the Chapter 1 engineering system.

**[NASA Fact] Landsat: Earth's longest-serving eyes**
The Landsat satellites, run by NASA and the U.S. Geological Survey (USGS), have imaged Earth's land since 1972, the longest continuous record of Earth's land surface from space. Scientists use it to track changes in forests, farms and cities.
Source: [NASA Landsat](https://landsat.gsfc.nasa.gov/about/)

---

## Scene 104: A new science request

**Location: Company lab**

Triggered after some time in engineering design.

The screen shows:

**NEW REQUIREMENT RECEIVED**

### Dialogue

**Samuel:**

"The research team looked at the early design. They want sharper pictures — ideally sharp enough to see the ridges between fields."

"However, we know this may affect your current design."

**Elena:**

"Make the picture twice as sharp, and the same patch of ground needs four times as many pixels. The file gets about four times bigger."

"The high-resolution camera needs 7 watts. The current one needs 3. Taking pictures while sending data needs 13 watts in total, but the solar panels only supply 10."

"And the satellite only passes over us for a few minutes at a time. If the files are too big, we can't send them all."

**Alex:**

"A new camera costs $70,000 more, and changing the circuits takes another week. We only have X weeks left."

### Branch direction

The branch team designs the different engineering options here.

The focus is the trade-off between science results and engineering limits.

Return to the shared main story afterwards.

[Term card] **Resolution**: how much ground one pixel covers. The smaller the area per pixel, the sharper the picture and the bigger the file.

---

## Scene 105: Design review

**Screen: Engineering review interface**

Title:

**DESIGN REVIEW**

### Dialogue

**Elena:**

"The design has completed preliminary integration."

"Next we have to confirm that every key requirement is met."

**Alex:**

"Nine days until the satellite gets packed and shipped to the launch site."

**Elena:**

"I know."

"We said the same thing two years ago."

A short pause.

**Elena:**

"This time I want to see three pieces of evidence:"

"One: put the satellite on the vibration table, shake it like a rocket launch, and show nothing came loose."

"Two: put it in the vacuum chamber, pump out the air, heat it and freeze it again and again like space, and show it still turns on."

"Three: use the ground station antenna and actually talk to it."

"Missing even one, and I don't sign."

The player enters the engineering review.

**[BEGIN DESIGN REVIEW]**

If the conditions aren't met, return to engineering design.

After passing the required review, go to mission execution.

[Term card] **Design review**: before launch, experts go down a checklist item by item. Every item needs evidence; if it doesn't pass, it doesn't fly. Like a driving test: the examiner has to see you park, not just hear you say you can.

**[NASA Fact] Things will break — better on the ground**
NASA's CubeSat handbook says that no matter how well you plan, something will almost certainly break, usually during vibration testing. For a new design, that's normal. So shake it until it breaks on the ground, not on the rocket.
Source: [NASA CubeSat 101, p.24](https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=24)

**[NASA Fact] Test as you fly**
NASA's Systems Engineering Handbook says: "Test as you fly, and fly as you test." In other words, test the hardware the way it will fly, and fly it the way it was tested. The handbook also notes that physical testing is the most resource-intensive verification method, so choose what to test carefully.
Source: [NASA Systems Engineering Handbook §5.3](https://www.nasa.gov/reference/5-3-product-verification/)

---

## Scene 106: Back in space for the first time

**Location: Mission control**

No rocket animation needed.

Show mission progress and communication status.

**SATELLITE DEPLOYMENT**

**MISSION OPERATIONS STARTED**

### Dialogue

**Alex:**

"The satellite has entered its planned mission phase."

**Elena:**

"It goes around Earth about every 90 minutes, but we can only talk to it during the few minutes it flies over our antenna."

"Next pass is at 14:32. About eight minutes."

The screen shows:

**ESTABLISHING CONNECTION...**

Show the satellite's communication and operating status based on the game simulation.

If communication is established:

**SIGNAL ACQUIRED**

**Elena:**

"Telemetry received."

"Now let's check the satellite's health and the observation results."

After the mission, go to the results report.

**[NASA Fact] Around the world in 90 minutes**
The International Space Station flies in low Earth orbit at about 8 km per second, circling Earth about every 90 minutes and seeing 16 sunrises and 16 sunsets a day. Most CubeSats orbit at similar altitudes.
Source: [NASA Space Station Facts and Figures](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/)

**[NASA Fact] Amateur radio can talk to satellites**
Many school CubeSats use off-the-shelf amateur radio equipment as their ground station, and local amateur radio clubs are often happy to help. NASA's handbook recommends building the ground station as early as possible, because it takes more time than you expect.
Source: [NASA CubeSat 101, p.30](https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=30)

---

## Scene 107: The first mission record

**Screen: Mission results report**

**MISSION REPORT — FIRST LIGHT**

Show the actual results.

### Shared dialogue

**Samuel:**

"We've received the results report for this mission."

"These records will be an important basis for future partnership decisions."

**Elena:**

"If someone asks us now, 'How do you know it works?'"

"We can lay the vibration test, vacuum test and communication test records on the table, one by one."

**Alex:**

"We finally have a new space mission on our record."

If the minimum requirement is met, Chapter 2 unlocks.

---

## Scene 108: A new invitation

**Location: Company lab**

The screen shows:

**NEW CONTRACT AVAILABLE**

**ORBITAL DEMONSTRATION PROGRAM**

### Dialogue

**Alex:**

"Some investors have contacted us."

"They want us to take part in a new uncrewed orbital demonstration."

**Elena:**

"An orbital demonstration..."

"You know what that means, right?"

Alex looks at the old rocket photo on the wall.

**Alex:**

"We started out building rockets. Satellites just kept us alive."

"Now... we have to go back to that launch pad."

Fade out.

**MISSION 02 UNLOCKED**

---

### [Chapter recap] What did you learn in Chapter 1?

- Write down what counts as success first, then choose parts.
- A better camera isn't always better: it can leave you short on power, data capacity and money.
- Testing costs money, but tells you the truth before launch.
- Decisions backed by evidence are the ones people trust.

---

# 6. Chapter 2: Ghosts of the Past

## MISSION 02 — GHOSTS OF THE PAST
### Mission name: SECOND ATTEMPT

**Mission type: Uncrewed orbital demonstration**

**Story theme: Facing the past**

**Core engineering conflict: Funding, schedule and engineering verification**

---

### [Chapter card] What is Chapter 2 about?

- **Your mission**: use the company's own rocket to put a {70} kg test payload into the target orbit, and send back data proving it got there.
- **You choose**:
  - Upper stage (the top section of the rocket, which does the final push): the proven design or the new lightweight design;
  - Telemetry: only the orbit confirmation data, or an extra flight diagnostics package;
  - Payload adapter (the frame that holds the payload on the rocket): standard or lightweight;
  - Ground stations: one or two.
- **The core trade-off**: a rocket can only lift so much. Every extra kilogram you carry is a kilogram less margin. The new design can lift more, but how much it really lifts is less certain.
- **Surprise event**: in week {2}, the funder cuts the budget.
- **How you lose**: not enough thrust to reach orbit; the ground doesn't receive enough confirmation data; money or time runs out.

[Term card] **Margin**: what the rocket can lift minus what it has to carry. Like the empty space left in a moving truck: if the margin is negative, the load doesn't fit.

[Term card] **Hot-fire test**: bolting the rocket engine down on the ground and actually firing it, to measure how much it can really push. You learn the rocket's true ability without launching it.

[Term card] **Upper stage**: rockets come in sections, and each used-up section is dropped. The upper stage is the top section, which carries the payload into its final orbit.

---

## Scene 201: Trying for orbit again

**Location: Company lab**

### Dialogue

**Alex:**

"The funder wants two things. One: the rocket puts a 70 kg test payload into the target orbit. Two: we have data that proves it got there."

"'Almost reached orbit' means 'didn't reach orbit'."

"If it works, the company could qualify again for large launch program partnerships."

**Elena:**

"This mission is too much like the one two years ago."

**Alex:**

"But it may be our best chance to rebuild our technical reputation."

**Elena:**

"Then let's start with the most basic engineering requirements."

"Having done it before doesn't mean we already understand every risk."

The player clicks:

**[BEGIN ROCKET DESIGN]**

[Term card] **Reaching orbit**: the rocket speeds something up to about 8 km per second, so it keeps "falling" forward but never hits the ground. That's what circling Earth is. Too slow, and it falls back down.

[Term card] **Payload**: the thing a rocket or satellite actually carries to do the job, such as a camera or science instrument. Everything else exists to get it there and keep it working.

---

## Scene 202: The funding cut

**Location: Company lab**

Triggered after some time in engineering design.

The screen shows:

**URGENT FUNDING UPDATE**

### Dialogue

**Alex:**

"We have a problem."

**Alex:**

"The funder just wrote. They cut 20 from the second round, so our total drops from 196 to 176."

"About ten percent less, and the launch date still can't move."

**Elena:**

"So what happens to our original test and design plan?"

**Alex:**

"We have to replan it."

"And they don't want the demonstration date to move."

**Elena:**

"We can't just assume all of the original work can be cut."

**Elena:**

"For every test we cut, we have to answer one question:"

"'If this part really is faulty, do we still have a chance to find out before launch?'"

"Any test where the answer is 'no' — that's one we can't cut."

The player clicks:

**[REVISE PROJECT PLAN]**

Enter the budget and engineering adjustment system.

---

## Scene 203: A familiar anomaly

**Location: Lab**

A warning suddenly appears on one screen.

**SYSTEM ANOMALY DETECTED**

### Dialogue

**Elena:**

"Wait..."

**Elena:**

"Three hours into the test, the flight computer rebooted itself again. Two seconds, same as before."

"I pulled up the records from two years ago... the length, the voltage change just before it — almost identical."

Cut to the archived data window.

**ARCHIVED DATA — TWO YEARS AGO**

**Alex:**

"You mean we've run into the same problem again?"

**Elena:**

"We can't be sure yet."

"But we have to find the cause."

The player enters the engineering investigation phase.

**(Optional) add the investigation result (the script is missing this)**

> Elena: "We put the avionics in the cold chamber at minus 20 degrees and ran it 20 times in a row."
> Elena: "Found it. When it gets cold, the metal in one connector shrinks a tiny bit, the contact goes bad, the computer loses power and reboots."
> Elena: "Two years ago, we never tested it in the cold."

---

## Scene 204: The decision back then

**Location: Lab**

The screen shows the engineering review record from two years ago.

**FINAL AUTHORIZATION — CHIEF ENGINEER**

### Dialogue

**Elena:**

"I went back through the data from back then."

**Elena:**

"This is the review record from back then."

**Screen:**

**ANOMALY #07 — NOT REPRODUCED. RISK ACCEPTED.**

Signature: **Chief Engineer**

**Elena:**

"'We couldn't make it happen again' was treated as 'there's no problem'."

**Alex:**

"Because we were afraid a delay would cost us the funding,"

**Elena:**

"we decided to accept a risk we didn't understand."

She looks at the player.

"I don't know if that was the direct cause of the accident."

"But back then, we didn't have enough evidence to support the launch decision."

A short silence.

**Elena:**

"This time, I want us to do better."

**[NASA Fact] An error nobody caught: Hubble's mirror (1990)**
Two months after the Hubble Space Telescope launched, NASA found its images were blurry. The investigation found that the test instrument used to check the mirror's shape while it was being polished had been assembled wrong: one lens was 1.3 mm out of position. The mirror was polished to the wrong shape, and the problem wasn't found until Hubble was in space.
Source: [NASA Science: Hubble's Mirror Flaw](https://science.nasa.gov/mission/hubble/observatory/design/optics/hubbles-mirror-flaw/)

**[NASA Fact] One unit apart: Mars Climate Orbiter (1999)**
Ground software used English units while the spacecraft's software used metric units. Because the two didn't match, the calculated path took the spacecraft too close to Mars, and the mission was lost.
Source: [NASA Science: Mars Climate Orbiter](https://science.nasa.gov/mission/mars-climate-orbiter/)

---

## Scene 205: The second launch

**Location: Mission control**

Use the same background as the Prologue.

The screen shows:

**ORBITAL DEMONSTRATION 02**

**FINAL FLIGHT READINESS REVIEW**

The player must first pass the required engineering review.

Then show:

**READY FOR LAUNCH**

### Dialogue

**Alex:**

"All required review steps are complete."

**Elena:**

"After we replaced the connector, we ran it in the cold chamber 20 more times. Not one reboot."

"We know why it failed, how to fix it, and we've proven the fix works."

"This time, pressing the button isn't gambling."

The screen shows:

**FINAL LAUNCH AUTHORIZATION**

The player clicks:

**[AUTHORIZE LAUNCH]**

The countdown starts on screen.

**10... 9... 8...**

**LIFTOFF CONFIRMED**

Then show flight progress and simulation results on the console.

**[NASA Fact] Delaying is not failing**
On September 3, 2022, NASA called off the Artemis I Moon rocket launch during the countdown because of a liquid hydrogen leak. NASA launched only after the problem was fixed. In spaceflight, delays are normal, not shameful.
Source: [NASA Blog: Artemis I Launch Attempt Scrubbed](https://www.nasa.gov/blogs/missions/2022/09/03/artemis-i-launch-attempt-scrubbed/)

---

## Scene 206: The engineering record

**Screen: Mission report**

**MISSION REPORT — SECOND ATTEMPT**

Based on the game results, show:

Orbit result, engineering verification record, schedule and cost, technical risks, and partnership terms.

### Shared dialogue

**Alex:**

"Whatever happens, we've finally completed an engineering assessment of an orbital mission again."

**Elena:**

"This mission won't erase the mistakes of the past."

"But at least we've started to change."

If the minimum requirement is met, Chapter 3 unlocks.

---

## Scene 207: The lunar invitation

**Location: Lab**

A new email appears.

**INTERNATIONAL LUNAR SCIENCE PROGRAM**

### Dialogue

**Samuel:**

"We've been following your recent engineering results."

"There's a new international lunar science program, and we'd like to invite you to join."

**Alex:**

"A lunar mission?"

**Samuel:**

"This program has to bring together the technical and science requirements of several partners."

"Your past mission record will decide which partnership resources you can get."

**Elena:**

"Looks like the problems ahead are more complicated than before."

**MISSION 03 UNLOCKED**

---

### [Chapter recap] What did you learn in Chapter 2?

- "We couldn't make it happen again" does not mean "there's no problem".
- Find the cause, fix it, prove the fix works. You need all three.
- When the budget is cut, ask first: if we cut this test, can we still catch the problem before launch?
- Mass is a rocket's most expensive resource. Every kilogram needs a reason.

---

# 7. Chapter 3: The Real Test

## MISSION 03 — BEYOND REDEMPTION
### Mission name: LUNAR CONTRACT

**Mission type: Uncrewed lunar science payload mission**

**Story theme: Engineering responsibility and partner conflicts**

**Core engineering conflict: Science results, partner interests and mission limits**

---

### [Chapter card] What is Chapter 3 about?

- **Your mission**: deliver an uncrewed science instrument to the Moon's surface and send back at least {1} batch of usable data.
- **First, choose a partnership**:
  - Advance-payment partner: more money, but you must spend time doing work for them;
  - Technical-support partner: expert help, but the tightest budget;
  - Decline: the most time, the least money.
- **You choose**: the science instrument (two kinds of spectrometer), the landing sensor (with or without a backup), surface power (daytime only, or extended operations), the route to the Moon (direct, or a longer route that saves fuel), and the payload mount.
- **The core trade-off**: total launch mass is fixed. Every extra kilogram of hardware is a kilogram less fuel. Fuel is your safety budget for correcting course during landing.
- **Limited time on the surface**: daytime on the Moon lasts about two weeks. After sunset, the solar panels stop producing power.
- **The flight has seven stages**: each one may reveal a hidden problem, and when something goes wrong you decide how to respond.
- **How you lose**: failing review, running out of fuel, a failed landing, or no data sent back.

[Term card] **Spectrometer**: an instrument that splits light into its colors to work out what lunar soil is made of.

[Term card] **Backup (redundancy)**: carrying a second unit that does the same job, so if the main one fails you still have one. The cost is extra mass and money.

---

## Scene 301: The lunar partnership

**Location: Company lab**

The computer shows the Moon and the program data.

**LUNAR SCIENCE INITIATIVE**

### Dialogue

**Samuel:**

"The goal of this mission is to deliver an uncrewed science payload to the lunar surface."

"We want to obtain the specified science observations."

"But this program involves several organizations."

**Alex:**

"That means we have to coordinate more resources and partnership terms."

**Elena:**

"The government wants an earlier launch to make its public announcement. The science team wants to bring one more instrument. Our industry partner wants to fly its new hardware as a demo."

"If we say yes to all three, the lander will be too heavy."

**Samuel:**

"Exactly."

"You need to propose a mission plan that can actually be carried out."

The player enters mission design.

**[NASA Fact] NASA hires companies to deliver to the Moon too**
NASA's CLPS (Commercial Lunar Payload Services) program buys delivery services from private companies to carry NASA science instruments to the Moon. That's exactly ASTRA DYNAMICS' role in Chapter 3.
Source: [NASA CLPS](https://www.nasa.gov/commercial-lunar-payload-services/commercial-lunar-payload-services-update/)

---

## Scene 302: Different expectations

**Screen: Shared event window**

Show three messages in order.

**GOVERNMENT REQUEST**

"Please launch two weeks earlier so we can show the first photo from the lunar surface at our annual press conference."

**SCIENCE TEAM REQUEST**

"Please add a spectrometer. It can analyze what lunar soil is made of, but it adds {X} kg."

**INDUSTRIAL PARTNER REQUEST**

"Please carry our new battery. We'll cover part of the cost."

### Dialogue

**Alex:**

"These partnership terms could bring more resources."

"But they also add cost and management work."

**Elena:**

"The rocket can only carry so much in total. One more kilogram of instruments means one less kilogram of propellant."

"Less propellant means less room to correct our course during landing. The Moon has no air, so no parachutes — the engine has to slow us all the way down to a stop."

"We need to re-evaluate the mission architecture."

The player enters the branch decision phase.

**[NASA Fact] How far and how extreme is the Moon?**
The Moon is on average 384,400 km from Earth — about 30 Earths could fit in between. Its surface gravity is one-sixth of Earth's. In direct sunlight it reaches about 127°C; in darkness it drops to about −173°C.
Source: [NASA Science: Moon Facts](https://science.nasa.gov/moon/facts/)

---

## Scene 303: Final engineering review

**Screen: Engineering review interface**

**FINAL MISSION REVIEW**

### Dialogue

**Samuel:**

"All partners have submitted their final requirements."

"Now we need to confirm the whole mission is feasible."

**Alex:**

"If we rework the design, it may affect the original schedule."

**Elena:**

"There are still two red lights on the list: the spectrometer's power draw hasn't been tested, and the landing radar has only been simulated on a computer."

"The deadline is close, but red lights don't turn green just because time runs out."

She looks at the player.

"We already learned that lesson two years ago."

The player enters the final engineering review.

After meeting the required conditions, go to the lunar mission.

---

## Scene 304: Lunar mission execution

**Location: Mission control**

No full landing animation needed.

Use the mission progress screen.

Show in order:

**EARTH DEPARTURE**

**LUNAR TRANSFER**

**LUNAR APPROACH**

**LANDING SEQUENCE**

**SCIENCE OPERATIONS**

Update the status of each mission phase based on the player's design and the simulation results.

After the mission, show the results report.

Add one line of plain-language explanation under each English phase title:

| On-screen title | Explanation (suggested on-screen text) |
|---|---|
| EARTH DEPARTURE | Fire the engine and leave Earth orbit |
| LUNAR TRANSFER | Fly to the Moon, about 380,000 km away. A direct trip takes days; fuel-saving routes take longer |
| LUNAR APPROACH | Get close to the Moon and slow down so its gravity can "catch" us |
| LANDING SEQUENCE | No air, no parachutes. The engine slows us down until we're almost still |
| SCIENCE OPERATIONS | Collect data during the lunar day (about two weeks). The night gets colder than −100°C |

**[NASA Fact] Landing on the Moon is really hard**
In 2024, a few hours before landing, Intuitive Machines' Odysseus lander had a problem with its own navigation sensors. It landed with help from an experimental NASA laser navigation instrument it was carrying. The same year, Astrobotic's Peregrine lander had a problem after launch and could not reach the Moon. After a little over 10 days in space, it re-entered Earth's atmosphere and burned up.
Source: [NASA: Odysseus landing](https://www.nasa.gov/news-release/nasa-tech-contributes-to-soft-moon-landing-agency-science-underway/), [NASA: Peregrine Mission One](https://www.nasa.gov/news-release/nasa-science-astrobotic-peregrine-mission-one-concludes/)

---

## Scene 305: The final results

**Screen: Mission report**

**MISSION REPORT — LUNAR CONTRACT**

### Dialogue

**Samuel:**

"We've received the results report for this mission."

"Every partner will evaluate the work that was actually completed."

**Alex:**

"From our first CubeSat to now..."

"We've really come a long way."

**Elena:**

"Two years ago, we only wanted to prove we could launch."

"But now I think we finally understand what really matters."

**Elena:**

"Engineering isn't a promise that nothing will ever break."

"It's being able to say three things before you press launch: what we tested, what we didn't test, and what happens if it fails."

"If you can say those three things, that's what taking responsibility means."

---

### [Chapter recap] What did you learn in Chapter 3?

- Everyone's request makes sense, but you can't say yes to all of them. An engineer's job is to explain what each choice costs.
- A backup adds mass, but it can save the mission.
- You can fly with things you haven't tested, but you need to know what you're betting on, and sign your name to it.

---

# 8. Epilogue: A New Beginning

## EPILOGUE — A NEW BEGINNING

### Scene E01: Back in the lab

**Location: The same lab as Chapter 1**

But the scene has changed.

The screens that were off are lit again.

The engineering equipment is running.

Team members are back at their desks.

### Dialogue

**Alex:**

"Remember two years ago?"

"Back then we didn't even know if the company would survive."

**Elena:**

"And now we've completed three different space missions."

**Alex:**

"We used to think a successful launch was enough to prove ourselves."

**Elena:**

"But what really matters isn't only mission success."

**Elena:**

"Two years ago, the record said: 'Anomaly not reproduced. Risk accepted.'"

"In the records from these three missions, every signature has test data attached."

"That's the difference."

---

### Scene E02: The final mission record

The screen shows:

**ASTRA DYNAMICS**

**FINAL MISSION PORTFOLIO**

The system summarizes the results of all three missions.

Including:

- Mission completion
- Science results
- Engineering verification record
- Cost and schedule performance
- Partnership and reputation record
- Major engineering decisions

The player can look back on their engineering journey.

---

### Scene E03: The next mission

**Location: Lab**

A new email notification suddenly appears on the computer.

**NEW MISSION PROPOSAL RECEIVED**

**Alex:**

"Looks like we've got new work again."

**Elena:**

"This time... at least we can read the requirements before deciding whether to take it."

They both smile.

Fade out.

Finally show:

# FINAL ORBIT

**Every Decision Has a Consequence.**

**Every decision has a consequence.**

**THE END**

---

# Appendix A: Glossary (ready to use as hover tooltips)

| Term | One-sentence explanation |
|---|---|
| CubeSat | A small satellite built from 10 cm cubes; 1U weighs a little over 1 kg |
| Payload | What a rocket or satellite actually carries to do the job, such as a camera |
| Reaching orbit | Moving so fast that you keep "falling" forward without hitting the ground, so you circle Earth |
| Avionics | The spacecraft's brain and nerves: computers, sensors and wiring |
| Telemetry | The health report a spacecraft sends home: speed, temperature, battery charge |
| Ground station | The antenna and radio on the ground used to talk to a satellite |
| Communication window | The few minutes when the satellite passes over the ground station and can talk |
| Resolution | How much ground one pixel covers; smaller is sharper, but files get bigger |
| Verification | Proving by test or analysis that it really can do the job |
| Vibration test | Shaking the satellite on a table to simulate the violent shaking of launch |
| Thermal vacuum test | Heating and freezing it again and again in a vacuum chamber to simulate space |
| Design review | Experts check the evidence item by item; fail, and you don't move on |
| FRR (Flight Readiness Review) | The last review before launch that decides whether it flies |
| Launch slot | A seat on someone else's rocket; the rocket won't wait for you |
| Propellant | Fuel for rockets and landers, used to speed up, turn and slow down |
| Launch window | The time span when a launch meets both safety and mission needs |
| High-gain antenna | A dish antenna that focuses the signal into a beam aimed at Earth |
| Deep Space Network (DSN) | NASA's three large antenna sites around the world for talking to distant spacecraft |
| Trajectory correction (TCM) | A small engine burn during flight to fine-tune the path |

---

# Appendix B: Loading-screen facts (one sentence each, for rotation)

1. A 1U CubeSat is about 10 cm on each side and weighs about 1–1.33 kg. ([CubeSat 101](https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=12))
2. NASA's CubeSat Launch Initiative has launched more than 150 CubeSats. ([CSLI](https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/))
3. The International Space Station circles Earth about every 90 minutes and sees 16 sunrises a day. ([ISS Facts](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/))
4. NASA's handbook says a new satellite design will almost certainly break something during vibration testing — and that's normal. ([CubeSat 101](https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=24))
5. "Test as you fly, and fly as you test." — NASA Systems Engineering Handbook. ([§5.3](https://www.nasa.gov/reference/5-3-product-verification/))
6. Landsat satellites have imaged Earth's land continuously since 1972. ([Landsat](https://landsat.gsfc.nasa.gov/about/))
7. Hubble's main mirror was polished to the wrong shape because of a 1.3 mm spacing error in a test instrument. ([NASA](https://science.nasa.gov/mission/hubble/observatory/design/optics/hubbles-mirror-flaw/))
8. Mars Climate Orbiter was lost because English and metric units didn't match. ([NASA](https://science.nasa.gov/mission/mars-climate-orbiter/))
9. The Moon reaches about 127°C in daytime and drops to about −173°C at night. ([Moon Facts](https://science.nasa.gov/moon/facts/))
10. The Moon is on average 384,400 km away — about 30 Earths could fit in between. ([Moon Facts](https://science.nasa.gov/moon/facts/))
11. NASA's CLPS program buys delivery services from companies to send science instruments to the Moon. ([CLPS](https://www.nasa.gov/commercial-lunar-payload-services/commercial-lunar-payload-services-update/))
12. Artemis I was once called off because of a fuel leak. In spaceflight, delays are normal. ([NASA](https://www.nasa.gov/blogs/missions/2022/09/03/artemis-i-launch-attempt-scrubbed/))
13. A rocket on a pad near the equator is already moving at over 1,650 km/h thanks to Earth's spin. ([Basics of Space Flight Ch.14](https://science.nasa.gov/learn/basics-of-space-flight/chapter14-1/))
14. The best chance to launch to Mars comes only about once every 25 months. ([Ch.4](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/))
15. Twice as far away, a radio signal is only a quarter as strong. ([Ch.6](https://science.nasa.gov/learn/basics-of-space-flight/chapter6-1/))
16. NASA's Deep Space Network has three sites about 120 degrees apart, so one can always see a distant spacecraft. ([Ch.18](https://science.nasa.gov/learn/basics-of-space-flight/chapter18-1/))
17. Antennas and solar panels are folded to fit inside the rocket and unfold in space. ([Ch.15](https://science.nasa.gov/learn/basics-of-space-flight/chapter15-1/))
18. Voyager 1 and 2 finished their original missions long ago and are still working. ([Ch.17](https://science.nasa.gov/learn/basics-of-space-flight/chapter17-1/))

---

# 9. Branches in the Three Chapters

The main story is fixed, but every mission keeps engineering decisions and different outcomes.

| Chapter | Main branches | Affects |
|---|---|---|
| Chapter 1: CubeSat | Science observation requirements, mass and power limits, test and verification | Observation results, research institution trust, later partnership resources |
| Chapter 2: Orbital Rocket | Funding cut, engineering design changes, anomaly investigation | Orbit result, schedule, reliability evidence, lunar partnership terms |
| Chapter 3: Lunar Mission | Science payload, partnership terms, mission architecture | Lunar observation results, partner relations, final record |

Branch design principles:

Design options can be combined freely, but they share the main engineering review and mission execution points.

A mission that misses the minimum requirement can be replayed.

Meeting the minimum requirement unlocks the next chapter.

Extra results and verification records affect the partnership terms available in later missions.

---

# 10. Pixel-Art Front-End Plan

## 10.1 Art and animation principles

All story scenes use the existing pixel-art style.

Mainly using:

1. Static backgrounds.
2. Dialogue box changes.
3. Typewriter text.
4. Email and warning windows.
5. Screen status changes.
6. Simple fade in and fade out.

Not needed:

- A full rocket launch animation.
- Explosion effects.
- Complex character motion.
- A long lunar landing animation.
- Many different backgrounds.

## 10.2 Main scene assets

| Asset | Count | Notes |
|---|---:|---|
| Company lab | 1 | Use the existing screen |
| Mission control | 1 | Shared by launches and mission execution |
| Alex | 1 | Reusable |
| Elena | 1 | Reusable |
| Samuel | 1 | Can be an email or video-call avatar |
| Dialogue box | 1 set | Shared across the game |
| Email interface | 1 set | Shared by all contracts and notices |
| Warning event window | 1 set | Funding, anomaly and request events |
| Mission report interface | 1 set | Shared by all three chapter results |
| Mission progress interface | 1 set | Shared by orbit and lunar missions |

## 10.3 Front-end pages

Suggested six page templates:

**A. Dialogue Scene**

Story dialogue page.

**B. Mission Briefing**

Mission briefing page.

**C. Engineering Workspace**

Engineering design page.

**D. Review & Verification**

Design review and test page.

**E. Mission Execution**

Mission execution and status display.

**F. Mission Portfolio**

Mission results and record page.

---

# 11. Full Story Flow

**Prologue:**

The accident two years ago  
↓  
Launch authorization  
↓  
Communication anomaly  
↓  
Mission failure  
↓  
The company loses its funding

**Chapter 1:**

Two years later, the company is about to close  
↓  
The government offers an urgent CubeSat contract  
↓  
The engineering team regroups  
↓  
Satellite engineering design  
↓  
A new science request  
↓  
Engineering review  
↓  
Satellite mission execution  
↓  
The first mission record  
↓  
An orbital demonstration invitation

**Chapter 2:**

Trying the orbital mission again  
↓  
Rocket engineering design  
↓  
The second funding round is cut  
↓  
Replanning  
↓  
A familiar anomaly appears  
↓  
Investigating the accident records from two years ago  
↓  
Engineering verification and launch review  
↓  
Orbital demonstration  
↓  
Mission record  
↓  
Invitation to a lunar science program

**Chapter 3:**

Accepting the lunar mission  
↓  
Bringing together different partners' requirements  
↓  
Lunar mission planning  
↓  
Partnership terms and engineering conflicts  
↓  
Final design review  
↓  
Lunar mission execution  
↓  
Delivering science results

**Epilogue:**

Back in the company lab  
↓  
Looking back on three missions  
↓  
Final mission record  
↓  
A new partnership invitation  
↓  
Game over

---

# 12. The Heart of the Story

*FINAL ORBIT* is not about a space company growing from nothing.

It is about a company that once failed, and how it rebuilds its engineering reputation by facing its past.

In a rush to finish a mission, the player once accepted a risk without enough evidence.

Now that the company has another chance, the player must learn to make sound judgments between money, schedule and engineering limits.

The three chapters are three stages of growth:

**Chapter 1: Proving we still have what it takes.**

**Chapter 2: Facing and correcting the mistakes of the past.**

**Chapter 3: Holding to responsible engineering decisions under even greater pressure.**

In the end, the player should understand:

**A successful space mission isn't just getting the vehicle to its destination. It's delivering something truly valuable through complete engineering design, verification and teamwork.**

---

## FINAL ORBIT

### Every Decision Has a Consequence.

**Two years ago, you ignored the risk to finish the mission.**

**Two years later, you have to prove you've learned how to face risk.**