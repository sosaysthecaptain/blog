module.exports=[24361,(a,b,c)=>{b.exports=a.x("util",()=>require("util"))},14747,(a,b,c)=>{b.exports=a.x("path",()=>require("path"))},42602,(a,b,c)=>{"use strict";b.exports=a.r(18622)},87924,(a,b,c)=>{"use strict";b.exports=a.r(42602).vendored["react-ssr"].ReactJsxRuntime},72131,(a,b,c)=>{"use strict";b.exports=a.r(42602).vendored["react-ssr"].React},9270,(a,b,c)=>{"use strict";b.exports=a.r(42602).vendored.contexts.AppRouterContext},38783,(a,b,c)=>{"use strict";b.exports=a.r(42602).vendored["react-ssr"].ReactServerDOMTurbopackClient},18622,(a,b,c)=>{b.exports=a.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(a,b,c)=>{b.exports=a.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(a,b,c)=>{b.exports=a.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},20635,(a,b,c)=>{b.exports=a.x("next/dist/server/app-render/action-async-storage.external.js",()=>require("next/dist/server/app-render/action-async-storage.external.js"))},36313,(a,b,c)=>{"use strict";b.exports=a.r(42602).vendored.contexts.HooksClientContext},18341,(a,b,c)=>{"use strict";b.exports=a.r(42602).vendored.contexts.ServerInsertedHtml},46058,(a,b,c)=>{"use strict";function d(a){if("function"!=typeof WeakMap)return null;var b=new WeakMap,c=new WeakMap;return(d=function(a){return a?c:b})(a)}c._=function(a,b){if(!b&&a&&a.__esModule)return a;if(null===a||"object"!=typeof a&&"function"!=typeof a)return{default:a};var c=d(b);if(c&&c.has(a))return c.get(a);var e={__proto__:null},f=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var g in a)if("default"!==g&&Object.prototype.hasOwnProperty.call(a,g)){var h=f?Object.getOwnPropertyDescriptor(a,g):null;h&&(h.get||h.set)?Object.defineProperty(e,g,h):e[g]=a[g]}return e.default=a,c&&c.set(a,e),e}},39118,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0});var d={DEFAULT_SEGMENT_KEY:function(){return l},NOT_FOUND_SEGMENT_KEY:function(){return m},PAGE_SEGMENT_KEY:function(){return k},addSearchParamsIfPageSegment:function(){return i},computeSelectedLayoutSegment:function(){return j},getSegmentValue:function(){return f},getSelectedLayoutSegmentPath:function(){return function a(b,c,d=!0,e=[]){let g;if(d)g=b[1][c];else{let a=b[1];g=a.children??Object.values(a)[0]}if(!g)return e;let h=f(g[0]);return!h||h.startsWith(k)?e:(e.push(h),a(g,c,!1,e))}},isGroupSegment:function(){return g},isParallelRouteSegment:function(){return h}};for(var e in d)Object.defineProperty(c,e,{enumerable:!0,get:d[e]});function f(a){return Array.isArray(a)?a[1]:a}function g(a){return"("===a[0]&&a.endsWith(")")}function h(a){return a.startsWith("@")&&"@children"!==a}function i(a,b){if(a.includes(k)){let a=JSON.stringify(b);return"{}"!==a?k+"?"+a:k}return a}function j(a,b){if(!a||0===a.length)return null;let c="children"===b?a[0]:a[a.length-1];return c===l?null:c}let k="__PAGE__",l="__DEFAULT__",m="/_not-found"},77929,a=>{"use strict";a.i(69387);var b=a.i(60574),c=a.i(20237);function d(a){let b=a.match(/!\[[^\]]*\]\(([^)]+)\)/);return b?b[1]:null}function e(a,b=160){let c=a.replace(/!\[[^\]]*\]\([^)]+\)/g,"").replace(/^#{1,6}\s+.*$/gm,"").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/[*_`]/g,"").replace(/^\s*[-*+]\s+/gm,"").replace(/^\s*\d+\.\s+/gm,"").replace(/\n+/g," ").replace(/\s+/g," ").trim();if(c.length<=b)return c;let d=c.slice(0,b),f=d.lastIndexOf(" ");return(f>0?d.slice(0,f):d)+"..."}let f="posts";async function g(){let a=(0,b.query)((0,b.collection)(c.db,f),(0,b.where)("status","==","published"));return(await (0,b.getDocs)(a)).docs.map(a=>({id:a.id,...a.data()})).filter(a=>!a.slug.startsWith("_")).sort((a,b)=>(b.date||"").localeCompare(a.date||""))}async function h(){return(await (0,b.getDocs)((0,b.collection)(c.db,f))).docs.map(a=>({id:a.id,...a.data()})).filter(a=>!a.slug.startsWith("_")).sort((a,b)=>(b.date||"").localeCompare(a.date||""))}async function i(a){let d=(0,b.query)((0,b.collection)(c.db,f),(0,b.where)("slug","==",a),(0,b.where)("status","==","published")),e=await (0,b.getDocs)(d);if(e.empty)return null;let g=e.docs[0];return{id:g.id,...g.data()}}async function j(a){let d=b.Timestamp.now();return(await (0,b.addDoc)((0,b.collection)(c.db,f),{...a,createdAt:d,updatedAt:d})).id}async function k(a,d){let e=(0,b.doc)(c.db,f,a);await (0,b.updateDoc)(e,{...d,updatedAt:b.Timestamp.now()})}async function l(a){let d=(0,b.doc)(c.db,f,a);await (0,b.deleteDoc)(d)}async function m(){let a=(0,b.query)((0,b.collection)(c.db,f),(0,b.where)("status","==","published"));return(await (0,b.getDocs)(a)).docs.map(a=>({id:a.id,...a.data()})).filter(a=>!0===a.isProject&&!a.slug.startsWith("_")).sort((a,b)=>(b.date||"").localeCompare(a.date||""))}async function n(a,d){let e=(0,b.query)((0,b.collection)(c.db,f),(0,b.where)("slug","==",a)),g=await (0,b.getDocs)(e);return!g.empty&&(!d||1!==g.docs.length||g.docs[0].id!==d)}async function o(){let a=await (0,b.getDocs)((0,b.collection)(c.db,f)),d=new Set;return a.docs.forEach(a=>{let b=a.data();b.tags&&Array.isArray(b.tags)&&b.tags.forEach(a=>d.add(a))}),Array.from(d).sort()}async function p(a){let b=(await g()).filter(a=>!a.parent),c=b.findIndex(b=>b.slug===a);return -1===c?{prev:null,next:null}:{prev:c>0?{slug:b[c-1].slug,title:b[c-1].title}:null,next:c<b.length-1?{slug:b[c+1].slug,title:b[c+1].title}:null}}let q="_carousel",r=[{id:"1",src:"https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=600&fit=crop",alt:"Circuit board closeup"},{id:"2",src:"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=600&fit=crop",alt:"3D printing in action"},{id:"3",src:"https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=600&fit=crop",alt:"Technology abstract"},{id:"4",src:"https://images.unsplash.com/photo-1504610926078-a1611febcad3?w=1200&h=600&fit=crop",alt:"Space and stars"}];async function s(){try{let a=(0,b.query)((0,b.collection)(c.db,f),(0,b.where)("slug","==",q)),d=await (0,b.getDocs)(a);if(!d.empty)return d.docs[0].data().images||r;return r}catch(a){return console.error("Error loading carousel:",a),r}}async function t(a){let d=(0,b.query)((0,b.collection)(c.db,f),(0,b.where)("slug","==",q)),e=await (0,b.getDocs)(d);if(e.empty)await (0,b.addDoc)((0,b.collection)(c.db,f),{slug:q,title:"Carousel Config",date:"",content:"",status:"draft",images:a,createdAt:b.Timestamp.now(),updatedAt:b.Timestamp.now()});else{let d=(0,b.doc)(c.db,f,e.docs[0].id);await (0,b.updateDoc)(d,{images:a,updatedAt:b.Timestamp.now()})}}a.s(["createPost",()=>j,"deletePost",()=>l,"getAdjacentPosts",()=>p,"getAllPosts",()=>h,"getAllTags",()=>o,"getBlurbFromContent",()=>e,"getCarouselImages",()=>s,"getFirstImageFromContent",()=>d,"getPostBySlug",()=>i,"getProjects",()=>m,"getPublishedPosts",()=>g,"saveCarouselImages",()=>t,"slugExists",()=>n,"updatePost",()=>k])},56283,a=>{"use strict";var b=a.i(87924),c=a.i(38246);function d(){return(0,b.jsx)("footer",{className:"mt-16 pt-8 pb-8 border-t border-[--border]",children:(0,b.jsxs)("div",{className:"flex flex-col items-center gap-1.5 text-[--muted]",children:[(0,b.jsxs)("div",{className:"flex items-center gap-2 text-xs",children:[(0,b.jsx)("a",{href:"mailto:contact@marcauger.com",className:"hover:text-[--foreground] transition-colors",children:"contact"}),(0,b.jsx)("span",{children:"·"}),(0,b.jsx)(c.default,{href:"/",className:"hover:text-[--foreground] transition-colors",children:"home"})]}),(0,b.jsx)("p",{className:"text-xs",children:"© 2025 Marc Auger"})]})})}a.s(["default",()=>d])},87839,a=>{"use strict";let b={"hello-world":{slug:"hello-world",title:"Hello World",date:"2026-01-08",content:`This is the first post on my new blog. I've migrated from a static HTML site to Next.js with Firebase.

## What's New

The site now features:

- Next.js for static generation
- Firebase for hosting and future CMS
- Monospace aesthetic throughout
- All my old project writeups, preserved

## What's Next

I'll be adding new posts about current projects and experiments. Stay tuned.`},"building-this-site":{slug:"building-this-site",title:"Building This Site",date:"2026-01-07",content:`A quick note on how this site was built.

## Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- Firebase (hosting, future Firestore for posts)
- JetBrains Mono font

## Design

I wanted something that felt like a terminal or engineering notebook. Monospace fonts, box-drawing characters for lists, minimal color. The aesthetic was inspired by sites like owickstrom.github.io/the-monospace-web and hyperturing.com.

## Content

All posts are currently hardcoded in a TypeScript file. Eventually I'll wire up Firestore so I can add posts through an admin UI, but for now this works.`},about:{slug:"about",title:"About",date:"",content:"I build hardware and software. CTO @ Tickerbot, first eng hire @ Bubble, UChicago."},"fdm-startup":{slug:"fdm-startup",title:"FDM Startup",date:"2018-02-25",isProject:!0,images:[{src:"/images/fdm-startup/gyroid.jpg",alt:"Gyroid printed with soluble support",caption:"Gyroid, printed with soluble support"},{src:"/images/fdm-startup/isisOneDual.jpg",alt:"Isis One 3D Printer",caption:"The Isis One"},{src:"/images/fdm-startup/printhead.jpg",alt:"Dual extruder printhead",caption:"Dual extruder printhead"}],content:`From 2012 to 2014, I cofounded and led engineering at a startup that produced an FDM 3D printer, one of the first on the prosumer market to achieve reliability and professional print quality, and to feature soluble support.

Our original website, preserved for posterity, can be seen at [isis3d.net](http://www.isis3d.net). (Regarding the name: it seemed fantastic in 2012: short, and relevant to making things. We had no idea of the world events that would soon unfold.)

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

- [The Print Bed](/blog/fdm-print-bed)
- [Linear Systems](/blog/fdm-linear-systems)
- [Software Settings](/blog/fdm-software-settings)
- [The Printhead](/blog/fdm-printhead)`},"fdm-print-bed":{slug:"fdm-print-bed",title:"The Print Bed",date:"2018-02-25",parent:"fdm-startup",images:[{src:"/images/fdm-print-bed/firstLayerGears.jpg",alt:"First layer gears",caption:"Testing first layers"},{src:"/images/fdm-print-bed/bedHeater.png",alt:"Kapton bed heater",caption:"Borosilicate bed with Kapton heater and glued feet"},{src:"/images/fdm-print-bed/luxo-1.jpg",alt:"Luxo lamp print",caption:"Lots of parts, all at once"},{src:"/images/fdm-print-bed/gears.png",alt:"Bed full of gears",caption:"Edge to edge!"}],content:`[IMAGE:0]

## Adhesion

The first and most vexing problem to solve was the first layer. For an FDM print to succeed, it must stay well adhered throughout the print, but then come off the bed with minimum effort. Stratasys solved this with soluble support on replaceable ABS beds. We needed our print surface to be indefinitely reusable.

We ran dozens of tests trying surfaces of different glass and plastic, heated to different temperatures, treated with various substances. After many hours, we found PLA stuck reliably to borosilicate glass at 50℃ treated with AquaNet hairspray.

## Bed Levelness and Rigidity

The bed must be perfectly level relative to the extruder's plane of travel, with vertical offset of 100 \xb1 25 microns for a good first layer. Getting correct settings usually required five false starts, and popping a completed print off threw it out of kilter.

[IMAGE:1]

We ended up with a double-decker design: an aluminum undercarriage on two linear rails connected to the borosilicate bed by polycarbonate corner blocks on neoprene washers for adjustable leveling.

[IMAGE:2]

The notion of gluing directly to borosilicate was novel at the time. We replaced PCB heaters with a custom high-wattage Kapton heater, solving the differential expansion problem.

## Dynamic Bed Leveling

No matter how assiduously we leveled, first layer height was never reliable at the margins. We implemented dynamic bed leveling—measuring actual offset at multiple points and compensating in real time. This had not yet made it to the consumer market.

[IMAGE:3]`},"fdm-linear-systems":{slug:"fdm-linear-systems",title:"Linear Systems",date:"2018-02-25",parent:"fdm-startup",images:[{src:"/images/fdm-linear-systems/layerStacking.jpg",alt:"Layer stacking comparison",caption:"Layer stacking, good and bad"},{src:"/images/fdm-linear-systems/linearTesting.jpg",alt:"Testing linear rails",caption:"Testing linear rails"},{src:"/images/fdm-linear-systems/zSpring.jpg",alt:"Z wobble absorption spring",caption:"Z wobble absorption spring"},{src:"/images/fdm-linear-systems/mk1Rods.png",alt:"Mk. I design with rods",caption:"Mk. I design, with rods"},{src:"/images/fdm-linear-systems/mk2rails.png",alt:"Mk. II design with V-Slot",caption:"Mk. II design, with V-Slot rails"}],content:`[IMAGE:0]

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

We learned that crowds are frequently wrong, price and quality often show little correlation, and one's own empirical data is essential.`},"fdm-software-settings":{slug:"fdm-software-settings",title:"Software Settings",date:"2018-02-25",parent:"fdm-startup",images:[{src:"/images/fdm-software-settings/birdcages.png",alt:"Birdcages print",caption:"Tiny columns—historically the bane of FDM"},{src:"/images/fdm-software-settings/noWobble.jpg",alt:"Corners without wobble",caption:"Corners without wobble artifacts"},{src:"/images/fdm-software-settings/eiffel.png",alt:"Eiffel Tower print",caption:"Eiffel Tower"}],content:`[IMAGE:0]

Modern hardware is 90% software. Small software modifications contributed major improvements to print quality, speed, and reliability.

## Speed

FDM printers are inherently slow. Conventional wisdom was that good quality couldn't be obtained past 35 mm/s.

[IMAGE:1]

The mechanism limiting speed was "wobble artifacts"—as the nozzle turned corners, it would wobble slightly. By reducing speed and acceleration of outer perimeters to conservative values, we completely eliminated wobble artifacts. The rest could proceed at 150 mm/s, a 2-3x improvement.

## Cooling, Bridging, and Overhang

FDM printers are surprisingly capable of overhangs with good cooling. Judicious control of temperature and fan settings bought massive improvements.

## Extrusion/Retract

[IMAGE:2]

Stringing—spiderweb-like fibers during crossing moves—is solved by retracting filament. We had good luck with small, jerky retracts and wiping the extruder across the finished region. Combined with printhead improvements, we almost entirely eliminated stringing.`},"fdm-printhead":{slug:"fdm-printhead",title:"The Printhead",date:"2018-02-25",parent:"fdm-startup",images:[{src:"/images/fdm-printhead/printheadFront.jpg",alt:"Printhead front view",caption:"New printhead, front view"},{src:"/images/fdm-printhead/breakaway-collage.png",alt:"Breakaway support",caption:"Breakaway support—labor intensive with poor results"},{src:"/images/fdm-printhead/printheadPrototype.png",alt:"Printhead prototype",caption:"A prototype of the new printhead"},{src:"/images/fdm-printhead/printheadCutaway.jpg",alt:"Printhead cutaway",caption:"Cutaway view showing feedwheels and thin-walled barrel"},{src:"/images/fdm-printhead/heatGradientRig.jpg",alt:"Heat gradient test rig",caption:"Test rig for heat gradient problems"},{src:"/images/fdm-printhead/feedWheel.jpg",alt:"Feedwheel",caption:"The feedwheel"},{src:"/images/fdm-printhead/solubleTesting.jpg",alt:"Soluble support testing",caption:"Testing adhesion with soluble support"},{src:"/images/fdm-printhead/injectionMould.png",alt:"Injection mould",caption:"Soluble support enabled useful injection mould prototypes"}],content:`[IMAGE:0]

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

[IMAGE:7]`},profilometer:{slug:"profilometer",title:"Optical Profilometer",date:"2018-03-14",isProject:!0,images:[{src:"/images/profilometer/profilometerOverview.png",alt:"Profilometer overview",caption:"System overview"}],content:`I'm building an optical profilometer using a microscope, projector, camera, and computer vision to measure 3D surface topography via focus stacking.

[IMAGE:0]

The process:

- Begin with a fluorescence microscope. Replace the light source with a DLP projector.
- Project crosshatches onto the substrate—each corresponds to a vertical pixel.
- Step through all Z values, capturing images.
- Score each region for focus quality.
- Choose the Z value with highest focus score for each pixel.
- Create a 3D mesh.

## Hardware

Built around a metallurgical fluorescence microscope. The UV source is replaced with a pico DLP projector. I mechanized the stage with NEMA 17 steppers using GT2 belts, controlled by a custom board with A4988 drivers.

Everything runs on a Tinkerboard (souped-up RasPi clone).

## Related Posts

- [Software Architecture](/blog/profilometer-architecture)
- [Circuit Board](/blog/profilometer-board)`},"profilometer-architecture":{slug:"profilometer-architecture",title:"Software Architecture",date:"2018-03-15",parent:"profilometer",images:[{src:"/images/profilometer-architecture/uiSketch.jpg",alt:"Early UI sketches",caption:"Early sketches"},{src:"/images/profilometer-architecture/uiSpitballing.png",alt:"UI spitballing",caption:"Spitballing..."}],content:`The software has two components: one on the Tinkerboard doing most work, and a user interface. For ease of use and the Tinkerboard's single graphics output, these are separate applications.

[IMAGE:0]

The link is via WiFi and a server. The machine runs on a full computer and ought to stand alone.

## Distribution of Labor

The Tinkerboard software handles primitive operations—graphics output, motors via GPIO, image capture—and higher-level functionality: machine vision, mesh assembly, and the scanning procedure. It takes commands from the server, sends status updates, and uploads output files.

The server passes messages and stores files. Commands are marked as executed by the Tinkerboard.

[IMAGE:1]

The frontend allows manual commands, initiating scans, and viewing output.

## Tech Stack

[Firebase](https://firebase.google.com/) handles everything—realtime Firestore for communications, file storage for images and meshes.

Frontend in Angular. The Tinkerboard app uses Angular/Electron, connecting to Firebase via a service.

Machine vision will use [OpenCV](https://opencv.org/), probably in Python.`},"profilometer-board":{slug:"profilometer-board",title:"Circuit Board",date:"2018-03-15",parent:"profilometer",images:[{src:"/images/profilometer-board/routedBoard.png",alt:"Routed board",caption:"Routed board"},{src:"/images/profilometer-board/a4988Scematic.png",alt:"A4988 schematic",caption:"A4988 connection schematic"},{src:"/images/profilometer-board/mosfetSchematic.png",alt:"MOSFET schematic",caption:"MOSFET connection schematic"}],content:`[IMAGE:0]

I designed the circuit board for the profilometer. Core functionality: driving three stepper motors off the Tinkerboard's GPIO pins and taking input from endstops. With spare pins, I added three more stepper drivers and six MOSFETs.

## Stepper Drivers

[IMAGE:1]

[A4988s](https://www.pololu.com/product/1182)—super common, familiar to anyone who's assembled a 3D printer. They cost $2-3, drive up to 2A with cooling, rated to 35V. Two input pins (step and direction) plus stepper enable. We're using 1/16th microstepping.

## MOSFETs

[IMAGE:2]

PHT4NQ10LT surface mount N-Channel MOSFETs—100V, 3.5A, logic level (driven directly from TTL). The LED indicates on/off, and a high-value resistor between gate and ground helps shutoff.

## Designing the Board

I used [Upverter](http://www.upverter.com) (online e-CAD). Create schematic, lay out on board, route, do a ground pour, export gerbers.

## Manufacturing

[SeeedStudio](http://www.seeedstudio.com)—$5 for 10x two-layer boards up to 100x100mm. Under $25 including shipping from China, better than two weeks turnaround.`},"space-trader":{slug:"space-trader",title:"Space Trader",date:"2018-02-25",isProject:!0,images:[{src:"/images/space-trader/screenshots.png",alt:"Space Trader screenshots",caption:"Game screenshots"},{src:"/images/space-trader/spacetraderSplash.png",alt:"Splash screen",caption:"Splash screen"}],content:`Space Trader is a text-based RPG for iOS where you captain an interstellar merchant spacecraft, buying and selling goods, performing quests, and encountering pirates and police.

[IMAGE:0]

It was once a [Palm Pilot game](http://www.spronck.net/spacetrader/STFrames.html) I wasted many hours on as a kid. Its lineage goes back to "[Elite](https://en.wikipedia.org/wiki/Elite_(video_game))" on Atari. When I needed to learn Swift, I decided to recreate it for iPhone.

[IMAGE:1]

## Links

- [App Store](https://itunes.apple.com/us/app/space-trader-2018/id1106932709?mt=8)
- [Source on GitHub](https://github.com/sosaysthecaptain/spacetrader)

## Related Posts

- [Gameplay & Implementation](/blog/space-trader-implementation)
- [Encounters](/blog/space-trader-encounters)
- [Quests, Data Persistence, Debugging](/blog/space-trader-quests)`},"space-trader-implementation":{slug:"space-trader-implementation",title:"Gameplay & Implementation",date:"2018-02-25",parent:"space-trader",images:[{src:"/images/space-trader-implementation/systemInfo.png",alt:"System Info",caption:"System Info"},{src:"/images/space-trader-implementation/sellCargo.png",alt:"Sell Cargo",caption:"Sell Cargo"},{src:"/images/space-trader-implementation/buyCargo.png",alt:"Buy Cargo",caption:"Buy Cargo"},{src:"/images/space-trader-implementation/shipyard.png",alt:"Shipyard",caption:"Shipyard"},{src:"/images/space-trader-implementation/warp.png",alt:"Warp",caption:"Warp"},{src:"/images/space-trader-implementation/galacticChart.png",alt:"Galactic Chart",caption:"Galactic Chart"}],content:`## Gameplay Overview

Gameplay splits between on-planet and in-transit events. On-planet uses a five-part tab view:

- System: Orientation, quests, refuel and repair
- Sell: Sell cargo with profit/loss per unit
- Buy: Purchase goods, see prices across systems
- Shipyard: Shop for ships and equipment
- Warp: Consult charts, choose destination, initiate warp

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

Game data lives in Commander (player data) and Galaxy (generated galaxy, planet locations, market conditions). Additional classes: Ship, CrewMember, Gadget, HighScore, Journey, Newspaper, PoliticsType, SavedGame, Shield, SpecialEvent, StarSystem, TradeItem, UniversalGadget.`},"space-trader-encounters":{slug:"space-trader-encounters",title:"Encounters",date:"2018-02-25",parent:"space-trader",images:[{src:"/images/space-trader-encounters/encounter.png",alt:"Encounter screen",caption:"Encounter screen"}],content:`The encounter sequence presented considerable challenge in handling control flow between view controllers and the data model. Encounters begin after dropping out of hyperspace, on the final 20 clicks to destination.

[IMAGE:0]

The logic:

- WarpVC calls Galaxy.warp() after verifying debts/fuel
- Galaxy.warp() instantiates a Journey and calls beginJourney()
- NSNotification fires segue to WarpViewVC (blank starfield background)
- journey.resumeJourney() calls executeClick(), determining encounters
- When encounter happens:
  - Encounter class is instantiated
  - NSNotification launches EncounterVC modal
  - EncounterVC shows images, labels, four buttons
  - Buttons call appropriate Encounter functions
  - Subsequent stages happen within same EncounterVC via NSNotifications
  - On conclusion, EncounterVC is popped from stack
- At zero clicks, journey.completeJourney() resets planet and dismisses WarpViewVC`},"space-trader-quests":{slug:"space-trader-quests",title:"Quests, Data Persistence, Debugging",date:"2018-02-25",parent:"space-trader",content:`## Quests and Special Events

A "Special" button occasionally appears, enabling quests involving long journeys, wild goose chases, special opponents, and people to take home.

A specialEventID assigned to a system causes the button to appear, loading SpecialVC with appropriate text. When accepted, information logs to the specialEvent class. Immediate actions—adding crewmembers or equipment—happen from SpecialVC.

The difficulty: notifications and interactions scattered through the game. Tribbles eat food, devalue your ship, cause fine warnings, and die from radiation if you're also carrying an unstable reactor. All had to be manually coded throughout.

## Data Persistence

After exploring CoreData, I used NSCoding encode/decode on each class. A game wraps up by encoding Commander and Galaxy. AppDelegate handles loading/unloading on applicationWillResignActive() and applicationWillBecomeActive().

## Debugging

Launch revealed many issues. The most vexing: increasing lags during encounters, eventually crashing and losing the game. The problem: instead of dismissing WarpViewVC, the app fired a segue, stacking copies. Dismissing instead of segueing solved it.`}};a.s(["posts",0,b])},33579,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(38246),e=a.i(50944),f=a.i(62180),g=a.i(77929),h=a.i(87839),i=a.i(56283);function j({images:a,currentIndex:d,onClose:e,onNext:f,onPrev:g}){return(0,c.useEffect)(()=>{let a=a=>{"Escape"===a.key&&e(),"ArrowRight"===a.key&&f(),"ArrowLeft"===a.key&&g()};return window.addEventListener("keydown",a),document.body.style.overflow="hidden",()=>{window.removeEventListener("keydown",a),document.body.style.overflow=""}},[e,f,g]),(0,b.jsxs)("div",{className:"fixed inset-0 z-50 bg-black/90 flex items-center justify-center",onClick:e,children:[(0,b.jsx)("button",{onClick:e,className:"absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10","aria-label":"Close",children:"×"}),a.length>1&&(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)("button",{onClick:a=>{a.stopPropagation(),g()},className:"absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl z-10 p-4","aria-label":"Previous image",children:"‹"}),(0,b.jsx)("button",{onClick:a=>{a.stopPropagation(),f()},className:"absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl z-10 p-4","aria-label":"Next image",children:"›"})]}),(0,b.jsx)("img",{src:a[d],alt:"",className:"max-h-[90vh] max-w-[90vw] object-contain",onClick:a=>a.stopPropagation()}),a.length>1&&(0,b.jsxs)("div",{className:"absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm",children:[d+1," / ",a.length]})]})}function k(){let a=(0,e.useParams)().slug,[k,l]=(0,c.useState)(null),[m,n]=(0,c.useState)(!0),[o,p]=(0,c.useState)(!1),[q,r]=(0,c.useState)(!1),[s,t]=(0,c.useState)(0),[u,v]=(0,c.useState)({prev:null,next:null}),w=k?function(a){let b,c=/!\[[^\]]*\]\(([^)]+)\)/g,d=[];for(;null!==(b=c.exec(a));)d.push(b[1]);return d}(k.content):[],x=(0,c.useCallback)(a=>{let b=w.indexOf(a);t(b>=0?b:0),r(!0)},[w]),y=(0,c.useCallback)(()=>{r(!1)},[]),z=(0,c.useCallback)(()=>{t(a=>(a+1)%w.length)},[w.length]),A=(0,c.useCallback)(()=>{t(a=>(a-1+w.length)%w.length)},[w.length]);return((0,c.useEffect)(()=>{!async function(){try{let b=await (0,g.getPostBySlug)(a);if(b){l(b);let c=await (0,g.getAdjacentPosts)(a);v(c)}else{let b=h.posts[a];if(b){let a=b.content;b.images&&b.images.forEach((b,c)=>{a=a.replace(`[IMAGE:${c}]`,`![${b.alt}](${b.src})`)}),l({slug:b.slug,title:b.title,date:b.date,content:a,isProject:b.isProject,parent:b.parent,status:"published"})}else p(!0)}}catch(c){console.error("Error loading post:",c);let b=h.posts[a];if(b){let a=b.content;b.images&&b.images.forEach((b,c)=>{a=a.replace(`[IMAGE:${c}]`,`![${b.alt}](${b.src})`)}),l({slug:b.slug,title:b.title,date:b.date,content:a,isProject:b.isProject,parent:b.parent,status:"published"})}else p(!0)}finally{n(!1)}}()},[a]),m)?(0,b.jsx)("div",{className:"min-h-screen bg-[--background] flex items-center justify-center",children:(0,b.jsx)("p",{className:"text-[--muted]",children:"Loading..."})}):o||!k?(0,b.jsxs)("div",{className:"min-h-screen bg-[--background] flex flex-col items-center justify-center",children:[(0,b.jsx)("h1",{className:"text-2xl font-bold text-[--foreground] mb-4",children:"Not Found"}),(0,b.jsx)(d.default,{href:"/",className:"text-[--accent] hover:underline",children:"← back to home"})]}):(0,b.jsxs)("div",{className:"min-h-screen bg-[--background]",children:[(0,b.jsxs)("main",{className:"mx-auto max-w-3xl px-6 py-12",children:[(0,b.jsx)(d.default,{href:"/",className:"text-[--muted] hover:text-[--accent] text-sm",children:"← back"}),(0,b.jsxs)("article",{className:"mt-8",children:[(0,b.jsxs)("header",{className:"mb-8 pb-4 border-b border-[--border]",children:[(0,b.jsx)("h1",{className:"text-2xl font-bold text-[--foreground] mb-2",children:k.title}),k.date&&(0,b.jsx)("time",{className:"text-sm text-[--muted]",children:k.date}),k.parent&&(0,b.jsx)("div",{className:"mt-2",children:(0,b.jsxs)(d.default,{href:`/blog/${k.parent}`,className:"text-sm text-[--accent]",children:["← Part of: ",k.parent.replace(/-/g," ")]})})]}),(0,b.jsx)("div",{className:"prose-terminal font-serif",children:(0,b.jsx)(f.default,{components:{h1:({children:a})=>(0,b.jsx)("h1",{className:"text-2xl font-bold text-[--foreground] mt-8 mb-4 font-sans",children:a}),h2:({children:a})=>(0,b.jsx)("h2",{className:"text-xl font-bold text-[--foreground] mt-8 mb-4 font-sans",children:a}),h3:({children:a})=>(0,b.jsx)("h3",{className:"text-lg font-bold text-[--foreground] mt-6 mb-3 font-sans",children:a}),p:({children:a})=>(0,b.jsx)("p",{className:"text-[--foreground] text-base my-4 leading-relaxed",children:a}),a:({href:a,children:c})=>a?.startsWith("/")?(0,b.jsx)(d.default,{href:a||"/",className:"text-[--accent] hover:underline",children:c}):(0,b.jsx)("a",{href:a,target:"_blank",rel:"noopener noreferrer",className:"text-[--accent] hover:underline",children:c}),strong:({children:a})=>(0,b.jsx)("strong",{className:"font-bold",children:a}),em:({children:a})=>(0,b.jsx)("em",{className:"italic",children:a}),code:({children:a})=>(0,b.jsx)("code",{className:"bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono",children:a}),pre:({children:a})=>(0,b.jsx)("pre",{className:"bg-gray-100 p-4 rounded overflow-x-auto my-4 text-sm",children:a}),ul:({children:a})=>(0,b.jsx)("ul",{className:"list-disc list-inside my-4 space-y-1 text-[--foreground]",children:a}),ol:({children:a})=>(0,b.jsx)("ol",{className:"list-decimal list-inside my-4 space-y-1 text-[--foreground]",children:a}),li:({children:a})=>(0,b.jsx)("li",{className:"text-[--foreground]",children:a}),blockquote:({children:a})=>(0,b.jsx)("blockquote",{className:"border-l-4 border-[--accent] pl-4 my-4 italic text-[--muted]",children:a}),img:({src:a,alt:c})=>(0,b.jsxs)("figure",{className:"my-6 flex flex-col items-center",children:[(0,b.jsx)("img",{src:"string"==typeof a?a:void 0,alt:c||"",className:"max-w-full h-auto border border-[--border] rounded cursor-pointer hover:opacity-90 transition-opacity",style:{width:"auto",maxWidth:"100%"},onClick:()=>"string"==typeof a&&x(a)}),c&&(0,b.jsx)("figcaption",{className:"text-sm text-[--muted] mt-2 text-center",children:c})]}),hr:()=>(0,b.jsx)("hr",{className:"my-8 border-[--border]"})},children:k.content})})]}),(u.prev||u.next)&&(0,b.jsx)("nav",{className:"mt-12 pt-8 border-t border-[--border]",children:(0,b.jsxs)("div",{className:"flex justify-between items-start gap-4",children:[u.prev?(0,b.jsxs)(d.default,{href:`/blog/${u.prev.slug}`,className:"group flex-1 max-w-[45%]",children:[(0,b.jsx)("span",{className:"text-xs text-[--muted] uppercase tracking-wide",children:"← Newer"}),(0,b.jsx)("p",{className:"text-sm text-[--foreground] group-hover:text-[--accent] transition-colors mt-1 line-clamp-2",children:u.prev.title})]}):(0,b.jsx)("div",{className:"flex-1"}),u.next&&(0,b.jsxs)(d.default,{href:`/blog/${u.next.slug}`,className:"group flex-1 max-w-[45%] text-right",children:[(0,b.jsx)("span",{className:"text-xs text-[--muted] uppercase tracking-wide",children:"Older →"}),(0,b.jsx)("p",{className:"text-sm text-[--foreground] group-hover:text-[--accent] transition-colors mt-1 line-clamp-2",children:u.next.title})]})]})}),(0,b.jsx)(i.default,{})]}),q&&w.length>0&&(0,b.jsx)(j,{images:w,currentIndex:s,onClose:y,onNext:z,onPrev:A})]})}a.s(["default",()=>k])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__751ad1f3._.js.map