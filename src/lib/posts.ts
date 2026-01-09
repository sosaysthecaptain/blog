export interface PostImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface Post {
  slug: string;
  title: string;
  date: string;
  content: string;
  images?: PostImage[];
  parent?: string;
}

export const posts: Record<string, Post> = {
  // About page
  about: {
    slug: "about",
    title: "About",
    date: "",
    content: `I'm a mechatronics and software engineer.

I have a background in JavaScript (Angular, Node/Express, Mongo, Electron), Swift, C, Python, Arduino, RasPi, CAD (SolidWorks and Onshape), robotics, electronics, circuit board design (Upverter and Eagle), machine building & design, and DFM.

## Links

├─ GitHub: github.com/sosaysthecaptain
├─ LinkedIn: linkedin.com/in/marc-auger-3481a4104
└─ App Store: Space Trader 2018`,
  },

  // FDM STARTUP - Main
  "fdm-startup": {
    slug: "fdm-startup",
    title: "FDM Startup",
    date: "2018-02-25",
    images: [
      { src: "/images/fdm-startup/gyroid.jpg", alt: "Gyroid printed with soluble support", caption: "Gyroid, printed with soluble support" },
      { src: "/images/fdm-startup/isisOneDual.jpg", alt: "Isis One 3D Printer", caption: "The Isis One" },
      { src: "/images/fdm-startup/printhead.jpg", alt: "Dual extruder printhead", caption: "Dual extruder printhead" },
    ],
    content: `From 2012 to 2014, I cofounded and led engineering at a startup that produced an FDM 3D printer, one of the first on the prosumer market to achieve reliability and professional print quality, and to feature soluble support.

Our original website, preserved for posterity, can be seen at isis3d.net. (Regarding the name: it seemed fantastic in 2012: short, and relevant to making things. We had no idea of the world events that would soon unfold.)

[IMAGE:0]

Though it has become a poster child for undeserved hype, 3D printing looked in 2012 like a technology with fundamentally transformative potential. We believed (and still do), that additive manufacturing would play a major role in the world economy by making it possible to produce highly complex physical objects very cheaply.

We decided to begin at the consumer end, where the 3D printers of the day were notoriously unreliable—prints required constant babysitting and still failed more often than not. The printers of 2012 were toys and little more.

[IMAGE:1]

The new design we set out to create had to be useful as something more than a toy:

1. It had to produce useful engineering prototypes, with fit and finish suitable for meaningful design work.
2. It had to produce any geometry. Soluble support was essential.
3. It had to be reliable. If a print could not be counted on to go to completion, nothing else mattered.

[IMAGE:2]

We created the Isis One, achieving good layer stacking by testing over a dozen linear systems, designing a rigid heated borosilicate print bed with dynamic bed leveling, and creating a robust dual-extruder printhead for soluble support.

## Related Posts

├─ The Print Bed
├─ Linear Systems
├─ Software Settings
└─ The Printhead`,
  },

  // FDM STARTUP - Print Bed
  "fdm-print-bed": {
    slug: "fdm-print-bed",
    title: "The Print Bed",
    date: "2018-02-25",
    parent: "fdm-startup",
    images: [
      { src: "/images/fdm-print-bed/firstLayerGears.jpg", alt: "First layer gears", caption: "Testing first layers" },
      { src: "/images/fdm-print-bed/bedHeater.png", alt: "Kapton bed heater", caption: "Borosilicate bed with Kapton heater and glued feet" },
      { src: "/images/fdm-print-bed/luxo-1.jpg", alt: "Luxo lamp print", caption: "Lots of parts, all at once" },
      { src: "/images/fdm-print-bed/gears.png", alt: "Bed full of gears", caption: "Edge to edge!" },
    ],
    content: `[IMAGE:0]

## Adhesion

The first and most vexing problem to solve was the first layer. For an FDM print to succeed, it must stay well adhered throughout the print, but then come off the bed with minimum effort. Stratasys solved this with soluble support on replaceable ABS beds. We needed our print surface to be indefinitely reusable.

We ran dozens of tests trying surfaces of different glass and plastic, heated to different temperatures, treated with various substances. After many hours, we found PLA stuck reliably to borosilicate glass at 50℃ treated with AquaNet hairspray.

## Bed Levelness and Rigidity

The bed must be perfectly level relative to the extruder's plane of travel, with vertical offset of 100 ± 25 microns for a good first layer. Getting correct settings usually required five false starts, and popping a completed print off threw it out of kilter.

[IMAGE:1]

We ended up with a double-decker design: an aluminum undercarriage on two linear rails connected to the borosilicate bed by polycarbonate corner blocks on neoprene washers for adjustable leveling.

[IMAGE:2]

The notion of gluing directly to borosilicate was novel at the time. We replaced PCB heaters with a custom high-wattage Kapton heater, solving the differential expansion problem.

## Dynamic Bed Leveling

No matter how assiduously we leveled, first layer height was never reliable at the margins. We implemented dynamic bed leveling—measuring actual offset at multiple points and compensating in real time. This had not yet made it to the consumer market.

[IMAGE:3]`,
  },

  // FDM STARTUP - Linear Systems
  "fdm-linear-systems": {
    slug: "fdm-linear-systems",
    title: "Linear Systems",
    date: "2018-02-25",
    parent: "fdm-startup",
    images: [
      { src: "/images/fdm-linear-systems/layerStacking.jpg", alt: "Layer stacking comparison", caption: "Layer stacking, good and bad" },
      { src: "/images/fdm-linear-systems/linearTesting.jpg", alt: "Testing linear rails", caption: "Testing linear rails" },
      { src: "/images/fdm-linear-systems/zSpring.jpg", alt: "Z wobble absorption spring", caption: "Z wobble absorption spring" },
      { src: "/images/fdm-linear-systems/mk1Rods.png", alt: "Mk. I design with rods", caption: "Mk. I design, with rods" },
      { src: "/images/fdm-linear-systems/mk2rails.png", alt: "Mk. II design with V-Slot", caption: "Mk. II design, with V-Slot rails" },
    ],
    content: `[IMAGE:0]

One of the most obvious determiners of print quality is the linear systems. A good linear system is repeatable enough for excellent layer stacking and rigid enough for adequate speed. We spent more time on this than almost any other aspect.

## Rods, and the Linear Rails Fad

Early consumer FDM printers almost all used rods, though none had well-implemented systems. Bearings were seldom good and alignment was difficult.

[IMAGE:1]

We ordered many different options and were surprised to see poor results from linear rails, even expensive ones. All had too much slop for good layer stacking.

## Solving the Binding Problem

[IMAGE:2]

We floated the Z leadscrew nut with a spring arrangement, giving it play in X and Y but not Z. For the linear bearings, floating one bearing—giving it a few hundred microns of play—achieved truly smooth motion without hurting print quality.

[IMAGE:3]

## V-Slot

A new product called V-slot appeared: aluminum extrusion with beveled slot edges, using Delrin V-wheels tensioned with eccentric spacers. We were blown away by the quality.

[IMAGE:4]

We learned that crowds are frequently wrong, price and quality often show little correlation, and one's own empirical data is essential.`,
  },

  // FDM STARTUP - Software Settings
  "fdm-software-settings": {
    slug: "fdm-software-settings",
    title: "Software Settings",
    date: "2018-02-25",
    parent: "fdm-startup",
    images: [
      { src: "/images/fdm-software-settings/birdcages.png", alt: "Birdcages print", caption: "Tiny columns—historically the bane of FDM" },
      { src: "/images/fdm-software-settings/noWobble.jpg", alt: "Corners without wobble", caption: "Corners without wobble artifacts" },
      { src: "/images/fdm-software-settings/eiffel.png", alt: "Eiffel Tower print", caption: "Eiffel Tower" },
    ],
    content: `[IMAGE:0]

Modern hardware is 90% software. Small software modifications contributed major improvements to print quality, speed, and reliability.

## Speed

FDM printers are inherently slow. Conventional wisdom was that good quality couldn't be obtained past 35 mm/s.

[IMAGE:1]

The mechanism limiting speed was "wobble artifacts"—as the nozzle turned corners, it would wobble slightly. By reducing speed and acceleration of outer perimeters to conservative values, we completely eliminated wobble artifacts. The rest could proceed at 150 mm/s, a 2-3x improvement.

## Cooling, Bridging, and Overhang

FDM printers are surprisingly capable of overhangs with good cooling. Judicious control of temperature and fan settings bought massive improvements.

## Extrusion/Retract

[IMAGE:2]

Stringing—spiderweb-like fibers during crossing moves—is solved by retracting filament. We had good luck with small, jerky retracts and wiping the extruder across the finished region. Combined with printhead improvements, we almost entirely eliminated stringing.`,
  },

  // FDM STARTUP - Printhead
  "fdm-printhead": {
    slug: "fdm-printhead",
    title: "The Printhead",
    date: "2018-02-25",
    parent: "fdm-startup",
    images: [
      { src: "/images/fdm-printhead/printheadFront.jpg", alt: "Printhead front view", caption: "New printhead, front view" },
      { src: "/images/fdm-printhead/breakaway-collage.png", alt: "Breakaway support", caption: "Breakaway support—labor intensive with poor results" },
      { src: "/images/fdm-printhead/printheadPrototype.png", alt: "Printhead prototype", caption: "A prototype of the new printhead" },
      { src: "/images/fdm-printhead/printheadCutaway.jpg", alt: "Printhead cutaway", caption: "Cutaway view showing feedwheels and thin-walled barrel" },
      { src: "/images/fdm-printhead/heatGradientRig.jpg", alt: "Heat gradient test rig", caption: "Test rig for heat gradient problems" },
      { src: "/images/fdm-printhead/feedWheel.jpg", alt: "Feedwheel", caption: "The feedwheel" },
      { src: "/images/fdm-printhead/solubleTesting.jpg", alt: "Soluble support testing", caption: "Testing adhesion with soluble support" },
      { src: "/images/fdm-printhead/injectionMould.png", alt: "Injection mould", caption: "Soluble support enabled useful injection mould prototypes" },
    ],
    content: `[IMAGE:0]

Soluble support would enable truly geometry-agnostic printing. Stratasys had implemented it, but it hadn't reached the consumer market.

[IMAGE:1]

## Design Considerations

We needed to reduce printhead mass by half (for two extruders), keep nozzles within 15mm, improve throughput, reduce melt chamber size (causing dribbling), and make the feed wheel more robust.

[IMAGE:2]

## The New Design

The design delivered massive torque through two driven feedwheels via a custom gearbox on a NEMA 17 stepper. A thin stainless steel barrel (rather than aluminum) enabled a steep heat gradient.

[IMAGE:3]

Heat traveled up the barrel aggressively, causing swelling. Airflow from the print cooling fan plus a teflon liner solved it.

[IMAGE:4]

## Getting Parts Machined

After expensive dalliances in Chicago ($200/set) and Utah, we landed with a shop in Shenzhen—professional, responsive, fast, excellent parts for less than a quarter the cost.

[IMAGE:5]

## Soluble Support

[IMAGE:6]

We got a dual extruder working at 150 mm/s with almost no stringing. Using PVA support material, we achieved soluble support.

[IMAGE:7]`,
  },

  // PROFILOMETER - Main
  profilometer: {
    slug: "profilometer",
    title: "Optical Profilometer",
    date: "2018-03-14",
    images: [
      { src: "/images/profilometer/profilometerOverview.png", alt: "Profilometer overview", caption: "System overview" },
    ],
    content: `I'm building an optical profilometer using a microscope, projector, camera, and computer vision to measure 3D surface topography via focus stacking.

[IMAGE:0]

The process:

├─ Begin with a fluorescence microscope. Replace the light source with a DLP projector.
├─ Project crosshatches onto the substrate—each corresponds to a vertical pixel.
├─ Step through all Z values, capturing images.
├─ Score each region for focus quality.
├─ Choose the Z value with highest focus score for each pixel.
└─ Create a 3D mesh.

## Hardware

Built around a metallurgical fluorescence microscope. The UV source is replaced with a pico DLP projector. I mechanized the stage with NEMA 17 steppers using GT2 belts, controlled by a custom board with A4988 drivers.

Everything runs on a Tinkerboard (souped-up RasPi clone).

## Related Posts

├─ Software Architecture
└─ Circuit Board`,
  },

  // PROFILOMETER - Architecture
  "profilometer-architecture": {
    slug: "profilometer-architecture",
    title: "Software Architecture",
    date: "2018-03-15",
    parent: "profilometer",
    images: [
      { src: "/images/profilometer-architecture/uiSketch.jpg", alt: "Early UI sketches", caption: "Early sketches" },
      { src: "/images/profilometer-architecture/uiSpitballing.png", alt: "UI spitballing", caption: "Spitballing..." },
    ],
    content: `The software has two components: one on the Tinkerboard doing most work, and a user interface. For ease of use and the Tinkerboard's single graphics output, these are separate applications.

[IMAGE:0]

The link is via WiFi and a server. The machine runs on a full computer and ought to stand alone.

## Distribution of Labor

The Tinkerboard software handles primitive operations—graphics output, motors via GPIO, image capture—and higher-level functionality: machine vision, mesh assembly, and the scanning procedure. It takes commands from the server, sends status updates, and uploads output files.

The server passes messages and stores files. Commands are marked as executed by the Tinkerboard.

[IMAGE:1]

The frontend allows manual commands, initiating scans, and viewing output.

## Tech Stack

Firebase handles everything—realtime Firestore for communications, file storage for images and meshes.

Frontend in Angular. The Tinkerboard app uses Angular/Electron, connecting to Firebase via a service.

Machine vision will use OpenCV, probably in Python.`,
  },

  // PROFILOMETER - Board
  "profilometer-board": {
    slug: "profilometer-board",
    title: "Circuit Board",
    date: "2018-03-15",
    parent: "profilometer",
    images: [
      { src: "/images/profilometer-board/routedBoard.png", alt: "Routed board", caption: "Routed board" },
      { src: "/images/profilometer-board/a4988Scematic.png", alt: "A4988 schematic", caption: "A4988 connection schematic" },
      { src: "/images/profilometer-board/mosfetSchematic.png", alt: "MOSFET schematic", caption: "MOSFET connection schematic" },
    ],
    content: `[IMAGE:0]

I designed the circuit board for the profilometer. Core functionality: driving three stepper motors off the Tinkerboard's GPIO pins and taking input from endstops. With spare pins, I added three more stepper drivers and six MOSFETs.

## Stepper Drivers

[IMAGE:1]

A4988s—super common, familiar to anyone who's assembled a 3D printer. They cost $2-3, drive up to 2A with cooling, rated to 35V. Two input pins (step and direction) plus stepper enable. We're using 1/16th microstepping.

## MOSFETs

[IMAGE:2]

PHT4NQ10LT surface mount N-Channel MOSFETs—100V, 3.5A, logic level (driven directly from TTL). The LED indicates on/off, and a high-value resistor between gate and ground helps shutoff.

## Designing the Board

I used Upverter (online e-CAD). Create schematic, lay out on board, route, do a ground pour, export gerbers.

## Manufacturing

SeeedStudio—$5 for 10x two-layer boards up to 100x100mm. Under $25 including shipping from China, better than two weeks turnaround.`,
  },

  // SPACE TRADER - Main
  "space-trader": {
    slug: "space-trader",
    title: "Space Trader",
    date: "2018-02-25",
    images: [
      { src: "/images/space-trader/screenshots.png", alt: "Space Trader screenshots", caption: "Game screenshots" },
      { src: "/images/space-trader/spacetraderSplash.png", alt: "Splash screen", caption: "Splash screen" },
    ],
    content: `Space Trader is a text-based RPG for iOS where you captain an interstellar merchant spacecraft, buying and selling goods, performing quests, and encountering pirates and police.

[IMAGE:0]

It was once a Palm Pilot game I wasted many hours on as a kid. Its lineage goes back to "Elite" on Atari. When I needed to learn Swift, I decided to recreate it for iPhone.

[IMAGE:1]

## Links

├─ App Store: Available on iOS
└─ Source: github.com/sosaysthecaptain/spacetrader

## Related Posts

├─ Gameplay & Implementation
├─ Encounters
└─ Quests, Data Persistence, Debugging`,
  },

  // SPACE TRADER - Implementation
  "space-trader-implementation": {
    slug: "space-trader-implementation",
    title: "Gameplay & Implementation",
    date: "2018-02-25",
    parent: "space-trader",
    images: [
      { src: "/images/space-trader-implementation/systemInfo.png", alt: "System Info", caption: "System Info" },
      { src: "/images/space-trader-implementation/sellCargo.png", alt: "Sell Cargo", caption: "Sell Cargo" },
      { src: "/images/space-trader-implementation/buyCargo.png", alt: "Buy Cargo", caption: "Buy Cargo" },
      { src: "/images/space-trader-implementation/shipyard.png", alt: "Shipyard", caption: "Shipyard" },
      { src: "/images/space-trader-implementation/warp.png", alt: "Warp", caption: "Warp" },
      { src: "/images/space-trader-implementation/galacticChart.png", alt: "Galactic Chart", caption: "Galactic Chart" },
    ],
    content: `## Gameplay Overview

Gameplay splits between on-planet and in-transit events. On-planet uses a five-part tab view:

├─ System: Orientation, quests, refuel and repair
├─ Sell: Sell cargo with profit/loss per unit
├─ Buy: Purchase goods, see prices across systems
├─ Shipyard: Shop for ships and equipment
└─ Warp: Consult charts, choose destination, initiate warp

[IMAGE:0]
[IMAGE:1]
[IMAGE:2]

During warp, you experience encounters with pirates and police. You may fight or flee, potentially disabling opponents and earning reputation.

Buy and sell screens use grids of manually arranged UIButtons and UILabels subclasses to recreate the text-based feel.

[IMAGE:3]
[IMAGE:4]
[IMAGE:5]

Navigation charts use custom UIView objects with draw functions rendering planets, crosshairs, and range circles.

## Data Structure

Game data lives in Commander (player data) and Galaxy (generated galaxy, planet locations, market conditions). Additional classes: Ship, CrewMember, Gadget, HighScore, Journey, Newspaper, PoliticsType, SavedGame, Shield, SpecialEvent, StarSystem, TradeItem, UniversalGadget.`,
  },

  // SPACE TRADER - Encounters
  "space-trader-encounters": {
    slug: "space-trader-encounters",
    title: "Encounters",
    date: "2018-02-25",
    parent: "space-trader",
    images: [
      { src: "/images/space-trader-encounters/encounter.png", alt: "Encounter screen", caption: "Encounter screen" },
    ],
    content: `The encounter sequence presented considerable challenge in handling control flow between view controllers and the data model. Encounters begin after dropping out of hyperspace, on the final 20 clicks to destination.

[IMAGE:0]

The logic:

├─ WarpVC calls Galaxy.warp() after verifying debts/fuel
├─ Galaxy.warp() instantiates a Journey and calls beginJourney()
├─ NSNotification fires segue to WarpViewVC (blank starfield background)
├─ journey.resumeJourney() calls executeClick(), determining encounters
├─ When encounter happens:
│  ├─ Encounter class is instantiated
│  ├─ NSNotification launches EncounterVC modal
│  ├─ EncounterVC shows images, labels, four buttons
│  ├─ Buttons call appropriate Encounter functions
│  ├─ Subsequent stages happen within same EncounterVC via NSNotifications
│  └─ On conclusion, EncounterVC is popped from stack
└─ At zero clicks, journey.completeJourney() resets planet and dismisses WarpViewVC`,
  },

  // SPACE TRADER - Quests
  "space-trader-quests": {
    slug: "space-trader-quests",
    title: "Quests, Data Persistence, Debugging",
    date: "2018-02-25",
    parent: "space-trader",
    content: `## Quests and Special Events

A "Special" button occasionally appears, enabling quests involving long journeys, wild goose chases, special opponents, and people to take home.

A specialEventID assigned to a system causes the button to appear, loading SpecialVC with appropriate text. When accepted, information logs to the specialEvent class. Immediate actions—adding crewmembers or equipment—happen from SpecialVC.

The difficulty: notifications and interactions scattered through the game. Tribbles eat food, devalue your ship, cause fine warnings, and die from radiation if you're also carrying an unstable reactor. All had to be manually coded throughout.

## Data Persistence

After exploring CoreData, I used NSCoding encode/decode on each class. A game wraps up by encoding Commander and Galaxy. AppDelegate handles loading/unloading on applicationWillResignActive() and applicationWillBecomeActive().

## Debugging

Launch revealed many issues. The most vexing: increasing lags during encounters, eventually crashing and losing the game. The problem: instead of dismissing WarpViewVC, the app fired a segue, stacking copies. Dismissing instead of segueing solved it.`,
  },
};

export function getPost(slug: string): Post | undefined {
  return posts[slug];
}

export function getAllPosts(): Post[] {
  return Object.values(posts)
    .filter((p) => p.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getAllSlugs(): string[] {
  return Object.keys(posts);
}
