(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33525,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return a}});let a=e=>{}},26633,e=>{"use strict";e.i(36180);var t=e.i(98925),r=e.i(59141);function a(e){let t=e.match(/!\[[^\]]*\]\(([^)]+)\)/);return t?t[1]:null}function n(e,t=160){let r=e.replace(/!\[[^\]]*\]\([^)]+\)/g,"").replace(/^#{1,6}\s+.*$/gm,"").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/[*_`]/g,"").replace(/^\s*[-*+]\s+/gm,"").replace(/^\s*\d+\.\s+/gm,"").replace(/\n+/g," ").replace(/\s+/g," ").trim();if(r.length<=t)return r;let a=r.slice(0,t),i=a.lastIndexOf(" ");return(i>0?a.slice(0,i):a)+"..."}let i="posts";async function o(){let e=(0,t.query)((0,t.collection)(r.db,i),(0,t.where)("status","==","published"));return(await (0,t.getDocs)(e)).docs.map(e=>({id:e.id,...e.data()})).filter(e=>!e.slug.startsWith("_")).sort((e,t)=>(t.date||"").localeCompare(e.date||""))}async function s(){return(await (0,t.getDocs)((0,t.collection)(r.db,i))).docs.map(e=>({id:e.id,...e.data()})).filter(e=>!e.slug.startsWith("_")).sort((e,t)=>(t.date||"").localeCompare(e.date||""))}async function l(e){let a=(0,t.query)((0,t.collection)(r.db,i),(0,t.where)("slug","==",e),(0,t.where)("status","==","published")),n=await (0,t.getDocs)(a);if(n.empty)return null;let o=n.docs[0];return{id:o.id,...o.data()}}async function c(e){let a=t.Timestamp.now();return(await (0,t.addDoc)((0,t.collection)(r.db,i),{...e,createdAt:a,updatedAt:a})).id}async function d(e,a){let n=(0,t.doc)(r.db,i,e);await (0,t.updateDoc)(n,{...a,updatedAt:t.Timestamp.now()})}async function u(e){let a=(0,t.doc)(r.db,i,e);await (0,t.deleteDoc)(a)}async function p(){let e=(0,t.query)((0,t.collection)(r.db,i),(0,t.where)("status","==","published"));return(await (0,t.getDocs)(e)).docs.map(e=>({id:e.id,...e.data()})).filter(e=>!0===e.isProject&&!e.slug.startsWith("_")).sort((e,t)=>(t.date||"").localeCompare(e.date||""))}async function g(e,a){let n=(0,t.query)((0,t.collection)(r.db,i),(0,t.where)("slug","==",e)),o=await (0,t.getDocs)(n);return!o.empty&&(!a||1!==o.docs.length||o.docs[0].id!==a)}async function h(){let e=await (0,t.getDocs)((0,t.collection)(r.db,i)),a=new Set;return e.docs.forEach(e=>{let t=e.data();t.tags&&Array.isArray(t.tags)&&t.tags.forEach(e=>a.add(e))}),Array.from(a).sort()}async function m(e){let t=(await o()).filter(e=>!e.parent),r=t.findIndex(t=>t.slug===e);return -1===r?{prev:null,next:null}:{prev:r>0?{slug:t[r-1].slug,title:t[r-1].title}:null,next:r<t.length-1?{slug:t[r+1].slug,title:t[r+1].title}:null}}let f="_carousel",b=[{id:"1",src:"https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=600&fit=crop",alt:"Circuit board closeup"},{id:"2",src:"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=600&fit=crop",alt:"3D printing in action"},{id:"3",src:"https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=600&fit=crop",alt:"Technology abstract"},{id:"4",src:"https://images.unsplash.com/photo-1504610926078-a1611febcad3?w=1200&h=600&fit=crop",alt:"Space and stars"}];async function y(){try{let e=(0,t.query)((0,t.collection)(r.db,i),(0,t.where)("slug","==",f)),a=await (0,t.getDocs)(e);if(!a.empty)return a.docs[0].data().images||b;return b}catch(e){return console.error("Error loading carousel:",e),b}}async function w(e){let a=(0,t.query)((0,t.collection)(r.db,i),(0,t.where)("slug","==",f)),n=await (0,t.getDocs)(a);if(n.empty)await (0,t.addDoc)((0,t.collection)(r.db,i),{slug:f,title:"Carousel Config",date:"",content:"",status:"draft",images:e,createdAt:t.Timestamp.now(),updatedAt:t.Timestamp.now()});else{let a=(0,t.doc)(r.db,i,n.docs[0].id);await (0,t.updateDoc)(a,{images:e,updatedAt:t.Timestamp.now()})}}e.s(["createPost",()=>c,"deletePost",()=>u,"getAdjacentPosts",()=>m,"getAllPosts",()=>s,"getAllTags",()=>h,"getBlurbFromContent",()=>n,"getCarouselImages",()=>y,"getFirstImageFromContent",()=>a,"getPostBySlug",()=>l,"getProjects",()=>p,"getPublishedPosts",()=>o,"saveCarouselImages",()=>w,"slugExists",()=>g,"updatePost",()=>d])},98183,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={assign:function(){return l},searchParamsToUrlQuery:function(){return i},urlQueryToSearchParams:function(){return s}};for(var n in a)Object.defineProperty(r,n,{enumerable:!0,get:a[n]});function i(e){let t={};for(let[r,a]of e.entries()){let e=t[r];void 0===e?t[r]=a:Array.isArray(e)?e.push(a):t[r]=[e,a]}return t}function o(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function s(e){let t=new URLSearchParams;for(let[r,a]of Object.entries(e))if(Array.isArray(a))for(let e of a)t.append(r,o(e));else t.set(r,o(a));return t}function l(e,...t){for(let r of t){for(let t of r.keys())e.delete(t);for(let[t,a]of r.entries())e.append(t,a)}return e}},95057,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={formatUrl:function(){return s},formatWithValidation:function(){return c},urlObjectKeys:function(){return l}};for(var n in a)Object.defineProperty(r,n,{enumerable:!0,get:a[n]});let i=e.r(90809)._(e.r(98183)),o=/https?|ftp|gopher|file/;function s(e){let{auth:t,hostname:r}=e,a=e.protocol||"",n=e.pathname||"",s=e.hash||"",l=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:r&&(c=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(c+=":"+e.port)),l&&"object"==typeof l&&(l=String(i.urlQueryToSearchParams(l)));let d=e.search||l&&`?${l}`||"";return a&&!a.endsWith(":")&&(a+=":"),e.slashes||(!a||o.test(a))&&!1!==c?(c="//"+(c||""),n&&"/"!==n[0]&&(n="/"+n)):c||(c=""),s&&"#"!==s[0]&&(s="#"+s),d&&"?"!==d[0]&&(d="?"+d),n=n.replace(/[?#]/g,encodeURIComponent),d=d.replace("#","%23"),`${a}${c}${n}${d}${s}`}let l=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function c(e){return s(e)}},18581,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return n}});let a=e.r(71645);function n(e,t){let r=(0,a.useRef)(null),n=(0,a.useRef)(null);return(0,a.useCallback)(a=>{if(null===a){let e=r.current;e&&(r.current=null,e());let t=n.current;t&&(n.current=null,t())}else e&&(r.current=i(e,a)),t&&(n.current=i(t,a))},[e,t])}function i(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},18967,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={DecodeError:function(){return b},MiddlewareNotFoundError:function(){return S},MissingStaticPage:function(){return v},NormalizeError:function(){return y},PageNotFoundError:function(){return w},SP:function(){return m},ST:function(){return f},WEB_VITALS:function(){return i},execOnce:function(){return o},getDisplayName:function(){return u},getLocationOrigin:function(){return c},getURL:function(){return d},isAbsoluteUrl:function(){return l},isResSent:function(){return p},loadGetInitialProps:function(){return h},normalizeRepeatedSlashes:function(){return g},stringifyError:function(){return A}};for(var n in a)Object.defineProperty(r,n,{enumerable:!0,get:a[n]});let i=["CLS","FCP","FID","INP","LCP","TTFB"];function o(e){let t,r=!1;return(...a)=>(r||(r=!0,t=e(...a)),t)}let s=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,l=e=>s.test(e);function c(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function d(){let{href:e}=window.location,t=c();return e.substring(t.length)}function u(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function p(e){return e.finished||e.headersSent}function g(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function h(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await h(t.Component,t.ctx)}:{};let a=await e.getInitialProps(t);if(r&&p(r))return a;if(!a)throw Object.defineProperty(Error(`"${u(e)}.getInitialProps()" should resolve to an object. But found "${a}" instead.`),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0});return a}let m="undefined"!=typeof performance,f=m&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class b extends Error{}class y extends Error{}class w extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class v extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class S extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function A(e){return JSON.stringify({message:e.message,stack:e.stack})}},73668,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return i}});let a=e.r(18967),n=e.r(52817);function i(e){if(!(0,a.isAbsoluteUrl)(e))return!0;try{let t=(0,a.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,n.hasBasePath)(r.pathname)}catch(e){return!1}}},84508,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return a}});let a=e=>{}},22016,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={default:function(){return b},useLinkStatus:function(){return w}};for(var n in a)Object.defineProperty(r,n,{enumerable:!0,get:a[n]});let i=e.r(90809),o=e.r(43476),s=i._(e.r(71645)),l=e.r(95057),c=e.r(8372),d=e.r(18581),u=e.r(18967),p=e.r(5550);e.r(33525);let g=e.r(91949),h=e.r(73668),m=e.r(9396);function f(e){return"string"==typeof e?e:(0,l.formatUrl)(e)}function b(t){var r;let a,n,i,[l,b]=(0,s.useOptimistic)(g.IDLE_LINK_STATUS),w=(0,s.useRef)(null),{href:v,as:S,children:A,prefetch:E=null,passHref:x,replace:T,shallow:I,scroll:P,onClick:k,onMouseEnter:j,onTouchStart:C,legacyBehavior:M=!1,onNavigate:G,ref:O,unstable_dynamicOnHover:D,...N}=t;a=A,M&&("string"==typeof a||"number"==typeof a)&&(a=(0,o.jsx)("a",{children:a}));let F=s.default.useContext(c.AppRouterContext),_=!1!==E,W=!1!==E?null===(r=E)||"auto"===r?m.FetchStrategy.PPR:m.FetchStrategy.Full:m.FetchStrategy.PPR,{href:L,as:B}=s.default.useMemo(()=>{let e=f(v);return{href:e,as:S?f(S):e}},[v,S]);if(M){if(a?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});n=s.default.Children.only(a)}let R=M?n&&"object"==typeof n&&n.ref:O,q=s.default.useCallback(e=>(null!==F&&(w.current=(0,g.mountLinkInstance)(e,L,F,W,_,b)),()=>{w.current&&((0,g.unmountLinkForCurrentNavigation)(w.current),w.current=null),(0,g.unmountPrefetchableInstance)(e)}),[_,L,F,W,b]),U={ref:(0,d.useMergedRef)(q,R),onClick(t){M||"function"!=typeof k||k(t),M&&n.props&&"function"==typeof n.props.onClick&&n.props.onClick(t),!F||t.defaultPrevented||function(t,r,a,n,i,o,l){if("undefined"!=typeof window){let c,{nodeName:d}=t.currentTarget;if("A"===d.toUpperCase()&&((c=t.currentTarget.getAttribute("target"))&&"_self"!==c||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,h.isLocalURL)(r)){i&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),l){let e=!1;if(l({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:u}=e.r(99781);s.default.startTransition(()=>{u(a||r,i?"replace":"push",o??!0,n.current)})}}(t,L,B,w,T,P,G)},onMouseEnter(e){M||"function"!=typeof j||j(e),M&&n.props&&"function"==typeof n.props.onMouseEnter&&n.props.onMouseEnter(e),F&&_&&(0,g.onNavigationIntent)(e.currentTarget,!0===D)},onTouchStart:function(e){M||"function"!=typeof C||C(e),M&&n.props&&"function"==typeof n.props.onTouchStart&&n.props.onTouchStart(e),F&&_&&(0,g.onNavigationIntent)(e.currentTarget,!0===D)}};return(0,u.isAbsoluteUrl)(B)?U.href=B:M&&!x&&("a"!==n.type||"href"in n.props)||(U.href=(0,p.addBasePath)(B)),i=M?s.default.cloneElement(n,U):(0,o.jsx)("a",{...N,...U,children:a}),(0,o.jsx)(y.Provider,{value:l,children:i})}e.r(84508);let y=(0,s.createContext)(g.IDLE_LINK_STATUS),w=()=>(0,s.useContext)(y);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},86909,e=>{"use strict";e.i(51718);var t=e.i(18357),r=e.i(59141);let a=["sosaysthecaptain@gmail.com"];function n(e){return!!e&&a.includes(e.toLowerCase())}async function i(){let e=new t.GoogleAuthProvider;try{let a=await (0,t.signInWithPopup)(r.auth,e);if(!n(a.user.email))throw await (0,t.signOut)(r.auth),Error("Unauthorized email address");return a.user}catch(e){throw console.error("Sign in error:",e),e}}async function o(){await (0,t.signOut)(r.auth)}function s(e){return(0,t.onAuthStateChanged)(r.auth,e)}e.s(["isAdminEmail",()=>n,"onAuthChange",()=>s,"signInWithGoogle",()=>i,"signOut",()=>o])},93379,e=>{"use strict";let t={"hello-world":{slug:"hello-world",title:"Hello World",date:"2026-01-08",content:`This is the first post on my new blog. I've migrated from a static HTML site to Next.js with Firebase.

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

Launch revealed many issues. The most vexing: increasing lags during encounters, eventually crashing and losing the game. The problem: instead of dismissing WarpViewVC, the app fired a segue, stacking copies. Dismissing instead of segueing solved it.`}};e.s(["posts",0,t])},80830,e=>{"use strict";var t=e.i(43476),r=e.i(71645),a=e.i(93379),n=e.i(26633),i=e.i(86909),o=e.i(22016);function s(){let[e,s]=(0,r.useState)(null),[l,c]=(0,r.useState)(!0),[d,u]=(0,r.useState)(""),[p,g]=(0,r.useState)(!1),[h,m]=(0,r.useState)(!1);(0,r.useEffect)(()=>(0,i.onAuthChange)(e=>{e&&(0,i.isAdminEmail)(e.email)?s(e):s(null),c(!1)}),[]);let f=async()=>{g(!0),u("Checking existing posts...");try{let e=await (0,n.getAllPosts)(),t=new Set(e.map(e=>e.slug)),r=Object.values(a.posts).filter(e=>!t.has(e.slug));if(0===r.length){u("All posts already migrated!"),m(!0);return}for(let e of(u(`Migrating ${r.length} posts...`),r)){u(`Migrating: ${e.title}`);let t=e.content;e.images&&e.images.forEach((e,r)=>{t=t.replace(`[IMAGE:${r}]`,`![${e.alt}](${e.src})`)});let r={slug:e.slug,title:e.title,date:e.date||new Date().toISOString().split("T")[0],content:t,status:e.date?"published":"draft"};e.isProject&&(r.isProject=!0),e.parent&&(r.parent=e.parent),await (0,n.createPost)(r)}u(`Successfully migrated ${r.length} posts!`),m(!0)}catch(e){console.error("Migration error:",e),u(`Error: ${e}`)}finally{g(!1)}};return l?(0,t.jsx)("div",{className:"min-h-screen bg-[--background] flex items-center justify-center",children:(0,t.jsx)("p",{className:"text-[--muted]",children:"Loading..."})}):e?(0,t.jsxs)("div",{className:"min-h-screen bg-[--background] flex flex-col items-center justify-center p-8",children:[(0,t.jsx)("h1",{className:"text-2xl font-bold text-[--foreground] mb-4",children:"Migrate Posts to Firestore"}),(0,t.jsx)("p",{className:"text-[--muted] mb-8 text-center max-w-md",children:"This will copy all hardcoded posts from src/lib/posts.ts to your Firestore database. Existing posts with the same slug will be skipped."}),(0,t.jsxs)("div",{className:"space-y-4 text-center",children:[!h&&(0,t.jsx)("button",{onClick:f,disabled:p,className:"px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50",children:p?"Migrating...":"Start Migration"}),d&&(0,t.jsx)("p",{className:"text-[--foreground]",children:d}),h&&(0,t.jsx)(o.default,{href:"/admin",className:"inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700",children:"Go to Admin →"})]}),(0,t.jsx)(o.default,{href:"/admin",className:"mt-8 text-[--muted] hover:text-[--accent] text-sm",children:"← back to admin"})]}):(0,t.jsxs)("div",{className:"min-h-screen bg-[--background] flex flex-col items-center justify-center p-8",children:[(0,t.jsx)("h1",{className:"text-2xl font-bold text-[--foreground] mb-4",children:"Migrate Posts to Firestore"}),(0,t.jsx)("p",{className:"text-[--muted] mb-8",children:"Sign in to continue"}),(0,t.jsx)("button",{onClick:()=>(0,i.signInWithGoogle)(),className:"px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700",children:"Sign in with Google"}),(0,t.jsx)(o.default,{href:"/admin",className:"mt-8 text-[--muted] hover:text-[--accent] text-sm",children:"← back to admin"})]})}e.s(["default",()=>s])}]);