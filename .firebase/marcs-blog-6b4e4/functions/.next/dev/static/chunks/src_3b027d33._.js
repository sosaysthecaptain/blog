(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/firebase.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auth",
    ()=>auth,
    "db",
    ()=>db,
    "default",
    ()=>__TURBOPACK__default__export__,
    "storage",
    ()=>storage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/app/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/app/dist/esm/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$storage$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/storage/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/storage/dist/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/auth/dist/esm/index.js [app-client] (ecmascript)");
;
;
;
;
const firebaseConfig = {
    apiKey: "AIzaSyBueCOsB9el4gw0kF1TCp-maa2mfeunHxU",
    authDomain: "marcs-blog-6b4e4.firebaseapp.com",
    projectId: "marcs-blog-6b4e4",
    storageBucket: "marcs-blog-6b4e4.firebasestorage.app",
    messagingSenderId: "341793197828",
    appId: "1:341793197828:web:8b49351c34e3f5e5194a51",
    measurementId: "G-5V8Q0659LH"
};
// Initialize Firebase (prevent re-initialization in dev)
const app = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getApps"])().length === 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initializeApp"])(firebaseConfig) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getApps"])()[0];
const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFirestore"])(app);
const storage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getStorage"])(app);
const auth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAuth"])(app);
const __TURBOPACK__default__export__ = app;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/firestore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createPost",
    ()=>createPost,
    "deletePost",
    ()=>deletePost,
    "getAdjacentPosts",
    ()=>getAdjacentPosts,
    "getAllPosts",
    ()=>getAllPosts,
    "getAllTags",
    ()=>getAllTags,
    "getBlurbFromContent",
    ()=>getBlurbFromContent,
    "getCarouselImages",
    ()=>getCarouselImages,
    "getFirstImageFromContent",
    ()=>getFirstImageFromContent,
    "getPostById",
    ()=>getPostById,
    "getPostBySlug",
    ()=>getPostBySlug,
    "getProjects",
    ()=>getProjects,
    "getPublishedPosts",
    ()=>getPublishedPosts,
    "saveCarouselImages",
    ()=>saveCarouselImages,
    "slugExists",
    ()=>slugExists,
    "updatePost",
    ()=>updatePost
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/firebase.ts [app-client] (ecmascript)");
;
;
function getFirstImageFromContent(content) {
    const match = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
    return match ? match[1] : null;
}
function getBlurbFromContent(content, maxLength = 160) {
    // Remove images, headers, and other markdown syntax
    let text = content.replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
    .replace(/^#{1,6}\s+.*$/gm, '') // Remove headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/[*_`]/g, '') // Remove emphasis markers
    .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
    if (text.length <= maxLength) return text;
    // Truncate at word boundary
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}
const POSTS_COLLECTION = "posts";
async function getPublishedPosts() {
    const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["where"])("status", "==", "published"));
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])(q);
    const posts = snapshot.docs.map((doc)=>({
            id: doc.id,
            ...doc.data()
        })).filter((p)=>!p.slug.startsWith("_")); // Exclude system docs
    // Sort by date descending in JavaScript to avoid needing a composite index
    return posts.sort((a, b)=>(b.date || "").localeCompare(a.date || ""));
}
async function getAllPosts() {
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION));
    const posts = snapshot.docs.map((doc)=>({
            id: doc.id,
            ...doc.data()
        })).filter((p)=>!p.slug.startsWith("_")); // Exclude system docs
    // Sort by date descending (chronological, newest first)
    return posts.sort((a, b)=>(b.date || "").localeCompare(a.date || ""));
}
async function getPostBySlug(slug) {
    const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["where"])("slug", "==", slug), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["where"])("status", "==", "published"));
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return {
        id: doc.id,
        ...doc.data()
    };
}
async function getPostById(id) {
    const docRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION, id);
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDoc"])(docRef);
    if (!snapshot.exists()) return null;
    return {
        id: snapshot.id,
        ...snapshot.data()
    };
}
async function createPost(post) {
    const now = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Timestamp"].now();
    const docRef = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDoc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), {
        ...post,
        createdAt: now,
        updatedAt: now
    });
    return docRef.id;
}
async function updatePost(id, post) {
    const docRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION, id);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateDoc"])(docRef, {
        ...post,
        updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Timestamp"].now()
    });
}
async function deletePost(id) {
    const docRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION, id);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteDoc"])(docRef);
}
async function getProjects() {
    // Fetch published posts and filter by isProject in JavaScript to avoid composite index
    const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["where"])("status", "==", "published"));
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])(q);
    const posts = snapshot.docs.map((doc)=>({
            id: doc.id,
            ...doc.data()
        })).filter((p)=>p.isProject === true && !p.slug.startsWith("_"));
    return posts.sort((a, b)=>(b.date || "").localeCompare(a.date || ""));
}
async function slugExists(slug, excludeId) {
    const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["where"])("slug", "==", slug));
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])(q);
    if (snapshot.empty) return false;
    if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) {
        return false;
    }
    return true;
}
async function getAllTags() {
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION));
    const tagSet = new Set();
    snapshot.docs.forEach((doc)=>{
        const data = doc.data();
        if (data.tags && Array.isArray(data.tags)) {
            data.tags.forEach((tag)=>tagSet.add(tag));
        }
    });
    return Array.from(tagSet).sort();
}
async function getAdjacentPosts(currentSlug) {
    const posts = await getPublishedPosts();
    // Filter out child posts (posts with parent)
    const topLevelPosts = posts.filter((p)=>!p.parent);
    const currentIndex = topLevelPosts.findIndex((p)=>p.slug === currentSlug);
    if (currentIndex === -1) {
        return {
            prev: null,
            next: null
        };
    }
    // Posts are sorted newest first, so "next" is older (higher index), "prev" is newer (lower index)
    const prev = currentIndex > 0 ? {
        slug: topLevelPosts[currentIndex - 1].slug,
        title: topLevelPosts[currentIndex - 1].title
    } : null;
    const next = currentIndex < topLevelPosts.length - 1 ? {
        slug: topLevelPosts[currentIndex + 1].slug,
        title: topLevelPosts[currentIndex + 1].title
    } : null;
    return {
        prev,
        next
    };
}
// Store carousel as a special post with slug "_carousel"
const CAROUSEL_SLUG = "_carousel";
// Default carousel images (used as fallback)
const DEFAULT_CAROUSEL = [
    {
        id: "1",
        src: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=600&fit=crop",
        alt: "Circuit board closeup"
    },
    {
        id: "2",
        src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=600&fit=crop",
        alt: "3D printing in action"
    },
    {
        id: "3",
        src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=600&fit=crop",
        alt: "Technology abstract"
    },
    {
        id: "4",
        src: "https://images.unsplash.com/photo-1504610926078-a1611febcad3?w=1200&h=600&fit=crop",
        alt: "Space and stars"
    }
];
async function getCarouselImages() {
    try {
        const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["where"])("slug", "==", CAROUSEL_SLUG));
        const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])(q);
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            return data.images || DEFAULT_CAROUSEL;
        }
        return DEFAULT_CAROUSEL;
    } catch (error) {
        console.error("Error loading carousel:", error);
        return DEFAULT_CAROUSEL;
    }
}
async function saveCarouselImages(images) {
    // Check if carousel doc exists
    const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["where"])("slug", "==", CAROUSEL_SLUG));
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDocs"])(q);
    if (snapshot.empty) {
        // Create new
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDoc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), {
            slug: CAROUSEL_SLUG,
            title: "Carousel Config",
            date: "",
            content: "",
            status: "draft",
            images,
            createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Timestamp"].now(),
            updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Timestamp"].now()
        });
    } else {
        // Update existing
        const docRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION, snapshot.docs[0].id);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateDoc"])(docRef, {
            images,
            updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Timestamp"].now()
        });
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/posts.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAllPosts",
    ()=>getAllPosts,
    "getAllSlugs",
    ()=>getAllSlugs,
    "getPost",
    ()=>getPost,
    "getProjects",
    ()=>getProjects,
    "posts",
    ()=>posts
]);
const posts = {
    // ============ SAMPLE BLOG POSTS ============
    "hello-world": {
        slug: "hello-world",
        title: "Hello World",
        date: "2026-01-08",
        content: `This is the first post on my new blog. I've migrated from a static HTML site to Next.js with Firebase.

## What's New

The site now features:

- Next.js for static generation
- Firebase for hosting and future CMS
- Monospace aesthetic throughout
- All my old project writeups, preserved

## What's Next

I'll be adding new posts about current projects and experiments. Stay tuned.`
    },
    "building-this-site": {
        slug: "building-this-site",
        title: "Building This Site",
        date: "2026-01-07",
        content: `A quick note on how this site was built.

## Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- Firebase (hosting, future Firestore for posts)
- JetBrains Mono font

## Design

I wanted something that felt like a terminal or engineering notebook. Monospace fonts, box-drawing characters for lists, minimal color. The aesthetic was inspired by sites like owickstrom.github.io/the-monospace-web and hyperturing.com.

## Content

All posts are currently hardcoded in a TypeScript file. Eventually I'll wire up Firestore so I can add posts through an admin UI, but for now this works.`
    },
    // ============ ABOUT ============
    about: {
        slug: "about",
        title: "About",
        date: "",
        content: `I build hardware and software. CTO @ Tickerbot, first eng hire @ Bubble, UChicago.`
    },
    // ============ FDM STARTUP ============
    "fdm-startup": {
        slug: "fdm-startup",
        title: "FDM Startup",
        date: "2018-02-25",
        isProject: true,
        images: [
            {
                src: "/images/fdm-startup/gyroid.jpg",
                alt: "Gyroid printed with soluble support",
                caption: "Gyroid, printed with soluble support"
            },
            {
                src: "/images/fdm-startup/isisOneDual.jpg",
                alt: "Isis One 3D Printer",
                caption: "The Isis One"
            },
            {
                src: "/images/fdm-startup/printhead.jpg",
                alt: "Dual extruder printhead",
                caption: "Dual extruder printhead"
            }
        ],
        content: `From 2012 to 2014, I cofounded and led engineering at a startup that produced an FDM 3D printer, one of the first on the prosumer market to achieve reliability and professional print quality, and to feature soluble support.

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
- [The Printhead](/blog/fdm-printhead)`
    },
    "fdm-print-bed": {
        slug: "fdm-print-bed",
        title: "The Print Bed",
        date: "2018-02-25",
        parent: "fdm-startup",
        images: [
            {
                src: "/images/fdm-print-bed/firstLayerGears.jpg",
                alt: "First layer gears",
                caption: "Testing first layers"
            },
            {
                src: "/images/fdm-print-bed/bedHeater.png",
                alt: "Kapton bed heater",
                caption: "Borosilicate bed with Kapton heater and glued feet"
            },
            {
                src: "/images/fdm-print-bed/luxo-1.jpg",
                alt: "Luxo lamp print",
                caption: "Lots of parts, all at once"
            },
            {
                src: "/images/fdm-print-bed/gears.png",
                alt: "Bed full of gears",
                caption: "Edge to edge!"
            }
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

[IMAGE:3]`
    },
    "fdm-linear-systems": {
        slug: "fdm-linear-systems",
        title: "Linear Systems",
        date: "2018-02-25",
        parent: "fdm-startup",
        images: [
            {
                src: "/images/fdm-linear-systems/layerStacking.jpg",
                alt: "Layer stacking comparison",
                caption: "Layer stacking, good and bad"
            },
            {
                src: "/images/fdm-linear-systems/linearTesting.jpg",
                alt: "Testing linear rails",
                caption: "Testing linear rails"
            },
            {
                src: "/images/fdm-linear-systems/zSpring.jpg",
                alt: "Z wobble absorption spring",
                caption: "Z wobble absorption spring"
            },
            {
                src: "/images/fdm-linear-systems/mk1Rods.png",
                alt: "Mk. I design with rods",
                caption: "Mk. I design, with rods"
            },
            {
                src: "/images/fdm-linear-systems/mk2rails.png",
                alt: "Mk. II design with V-Slot",
                caption: "Mk. II design, with V-Slot rails"
            }
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

We learned that crowds are frequently wrong, price and quality often show little correlation, and one's own empirical data is essential.`
    },
    "fdm-software-settings": {
        slug: "fdm-software-settings",
        title: "Software Settings",
        date: "2018-02-25",
        parent: "fdm-startup",
        images: [
            {
                src: "/images/fdm-software-settings/birdcages.png",
                alt: "Birdcages print",
                caption: "Tiny columns—historically the bane of FDM"
            },
            {
                src: "/images/fdm-software-settings/noWobble.jpg",
                alt: "Corners without wobble",
                caption: "Corners without wobble artifacts"
            },
            {
                src: "/images/fdm-software-settings/eiffel.png",
                alt: "Eiffel Tower print",
                caption: "Eiffel Tower"
            }
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

Stringing—spiderweb-like fibers during crossing moves—is solved by retracting filament. We had good luck with small, jerky retracts and wiping the extruder across the finished region. Combined with printhead improvements, we almost entirely eliminated stringing.`
    },
    "fdm-printhead": {
        slug: "fdm-printhead",
        title: "The Printhead",
        date: "2018-02-25",
        parent: "fdm-startup",
        images: [
            {
                src: "/images/fdm-printhead/printheadFront.jpg",
                alt: "Printhead front view",
                caption: "New printhead, front view"
            },
            {
                src: "/images/fdm-printhead/breakaway-collage.png",
                alt: "Breakaway support",
                caption: "Breakaway support—labor intensive with poor results"
            },
            {
                src: "/images/fdm-printhead/printheadPrototype.png",
                alt: "Printhead prototype",
                caption: "A prototype of the new printhead"
            },
            {
                src: "/images/fdm-printhead/printheadCutaway.jpg",
                alt: "Printhead cutaway",
                caption: "Cutaway view showing feedwheels and thin-walled barrel"
            },
            {
                src: "/images/fdm-printhead/heatGradientRig.jpg",
                alt: "Heat gradient test rig",
                caption: "Test rig for heat gradient problems"
            },
            {
                src: "/images/fdm-printhead/feedWheel.jpg",
                alt: "Feedwheel",
                caption: "The feedwheel"
            },
            {
                src: "/images/fdm-printhead/solubleTesting.jpg",
                alt: "Soluble support testing",
                caption: "Testing adhesion with soluble support"
            },
            {
                src: "/images/fdm-printhead/injectionMould.png",
                alt: "Injection mould",
                caption: "Soluble support enabled useful injection mould prototypes"
            }
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

[IMAGE:7]`
    },
    // ============ PROFILOMETER ============
    profilometer: {
        slug: "profilometer",
        title: "Optical Profilometer",
        date: "2018-03-14",
        isProject: true,
        images: [
            {
                src: "/images/profilometer/profilometerOverview.png",
                alt: "Profilometer overview",
                caption: "System overview"
            }
        ],
        content: `I'm building an optical profilometer using a microscope, projector, camera, and computer vision to measure 3D surface topography via focus stacking.

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
- [Circuit Board](/blog/profilometer-board)`
    },
    "profilometer-architecture": {
        slug: "profilometer-architecture",
        title: "Software Architecture",
        date: "2018-03-15",
        parent: "profilometer",
        images: [
            {
                src: "/images/profilometer-architecture/uiSketch.jpg",
                alt: "Early UI sketches",
                caption: "Early sketches"
            },
            {
                src: "/images/profilometer-architecture/uiSpitballing.png",
                alt: "UI spitballing",
                caption: "Spitballing..."
            }
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

[Firebase](https://firebase.google.com/) handles everything—realtime Firestore for communications, file storage for images and meshes.

Frontend in Angular. The Tinkerboard app uses Angular/Electron, connecting to Firebase via a service.

Machine vision will use [OpenCV](https://opencv.org/), probably in Python.`
    },
    "profilometer-board": {
        slug: "profilometer-board",
        title: "Circuit Board",
        date: "2018-03-15",
        parent: "profilometer",
        images: [
            {
                src: "/images/profilometer-board/routedBoard.png",
                alt: "Routed board",
                caption: "Routed board"
            },
            {
                src: "/images/profilometer-board/a4988Scematic.png",
                alt: "A4988 schematic",
                caption: "A4988 connection schematic"
            },
            {
                src: "/images/profilometer-board/mosfetSchematic.png",
                alt: "MOSFET schematic",
                caption: "MOSFET connection schematic"
            }
        ],
        content: `[IMAGE:0]

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

[SeeedStudio](http://www.seeedstudio.com)—$5 for 10x two-layer boards up to 100x100mm. Under $25 including shipping from China, better than two weeks turnaround.`
    },
    // ============ SPACE TRADER ============
    "space-trader": {
        slug: "space-trader",
        title: "Space Trader",
        date: "2018-02-25",
        isProject: true,
        images: [
            {
                src: "/images/space-trader/screenshots.png",
                alt: "Space Trader screenshots",
                caption: "Game screenshots"
            },
            {
                src: "/images/space-trader/spacetraderSplash.png",
                alt: "Splash screen",
                caption: "Splash screen"
            }
        ],
        content: `Space Trader is a text-based RPG for iOS where you captain an interstellar merchant spacecraft, buying and selling goods, performing quests, and encountering pirates and police.

[IMAGE:0]

It was once a [Palm Pilot game](http://www.spronck.net/spacetrader/STFrames.html) I wasted many hours on as a kid. Its lineage goes back to "[Elite](https://en.wikipedia.org/wiki/Elite_(video_game))" on Atari. When I needed to learn Swift, I decided to recreate it for iPhone.

[IMAGE:1]

## Links

- [App Store](https://itunes.apple.com/us/app/space-trader-2018/id1106932709?mt=8)
- [Source on GitHub](https://github.com/sosaysthecaptain/spacetrader)

## Related Posts

- [Gameplay & Implementation](/blog/space-trader-implementation)
- [Encounters](/blog/space-trader-encounters)
- [Quests, Data Persistence, Debugging](/blog/space-trader-quests)`
    },
    "space-trader-implementation": {
        slug: "space-trader-implementation",
        title: "Gameplay & Implementation",
        date: "2018-02-25",
        parent: "space-trader",
        images: [
            {
                src: "/images/space-trader-implementation/systemInfo.png",
                alt: "System Info",
                caption: "System Info"
            },
            {
                src: "/images/space-trader-implementation/sellCargo.png",
                alt: "Sell Cargo",
                caption: "Sell Cargo"
            },
            {
                src: "/images/space-trader-implementation/buyCargo.png",
                alt: "Buy Cargo",
                caption: "Buy Cargo"
            },
            {
                src: "/images/space-trader-implementation/shipyard.png",
                alt: "Shipyard",
                caption: "Shipyard"
            },
            {
                src: "/images/space-trader-implementation/warp.png",
                alt: "Warp",
                caption: "Warp"
            },
            {
                src: "/images/space-trader-implementation/galacticChart.png",
                alt: "Galactic Chart",
                caption: "Galactic Chart"
            }
        ],
        content: `## Gameplay Overview

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

Game data lives in Commander (player data) and Galaxy (generated galaxy, planet locations, market conditions). Additional classes: Ship, CrewMember, Gadget, HighScore, Journey, Newspaper, PoliticsType, SavedGame, Shield, SpecialEvent, StarSystem, TradeItem, UniversalGadget.`
    },
    "space-trader-encounters": {
        slug: "space-trader-encounters",
        title: "Encounters",
        date: "2018-02-25",
        parent: "space-trader",
        images: [
            {
                src: "/images/space-trader-encounters/encounter.png",
                alt: "Encounter screen",
                caption: "Encounter screen"
            }
        ],
        content: `The encounter sequence presented considerable challenge in handling control flow between view controllers and the data model. Encounters begin after dropping out of hyperspace, on the final 20 clicks to destination.

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
- At zero clicks, journey.completeJourney() resets planet and dismisses WarpViewVC`
    },
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

Launch revealed many issues. The most vexing: increasing lags during encounters, eventually crashing and losing the game. The problem: instead of dismissing WarpViewVC, the app fired a segue, stacking copies. Dismissing instead of segueing solved it.`
    }
};
function getPost(slug) {
    return posts[slug];
}
function getAllPosts() {
    return Object.values(posts).filter((p)=>p.date && !p.parent) // Only top-level posts with dates
    .sort((a, b)=>new Date(b.date).getTime() - new Date(a.date).getTime());
}
function getProjects() {
    return Object.values(posts).filter((p)=>p.isProject).sort((a, b)=>new Date(b.date).getTime() - new Date(a.date).getTime());
}
function getAllSlugs() {
    return Object.keys(posts);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Footer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Footer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
;
;
function Footer() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
        className: "mt-16 pt-8 pb-8 border-t border-[--border]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-col items-center gap-1.5 text-[--muted]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 text-xs",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            href: "mailto:contact@marcauger.com",
                            className: "hover:text-[--foreground] transition-colors",
                            children: "contact"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Footer.tsx",
                            lineNumber: 8,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "·"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Footer.tsx",
                            lineNumber: 11,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/",
                            className: "hover:text-[--foreground] transition-colors",
                            children: "home"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Footer.tsx",
                            lineNumber: 12,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Footer.tsx",
                    lineNumber: 7,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs",
                    children: "© 2025 Marc Auger"
                }, void 0, false, {
                    fileName: "[project]/src/components/Footer.tsx",
                    lineNumber: 16,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Footer.tsx",
            lineNumber: 6,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/Footer.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
_c = Footer;
var _c;
__turbopack_context__.k.register(_c, "Footer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/blog/[slug]/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BlogPost
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$markdown$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Markdown__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/react-markdown/lib/index.js [app-client] (ecmascript) <export Markdown as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/firestore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$posts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/posts.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Footer.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
// Extract all image URLs from markdown content
function extractImages(content) {
    const regex = /!\[[^\]]*\]\(([^)]+)\)/g;
    const images = [];
    let match;
    while((match = regex.exec(content)) !== null){
        images.push(match[1]);
    }
    return images;
}
// Lightbox Modal Component
function ImageModal({ images, currentIndex, onClose, onNext, onPrev }) {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ImageModal.useEffect": ()=>{
            const handleKeyDown = {
                "ImageModal.useEffect.handleKeyDown": (e)=>{
                    if (e.key === "Escape") onClose();
                    if (e.key === "ArrowRight") onNext();
                    if (e.key === "ArrowLeft") onPrev();
                }
            }["ImageModal.useEffect.handleKeyDown"];
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
            return ({
                "ImageModal.useEffect": ()=>{
                    window.removeEventListener("keydown", handleKeyDown);
                    document.body.style.overflow = "";
                }
            })["ImageModal.useEffect"];
        }
    }["ImageModal.useEffect"], [
        onClose,
        onNext,
        onPrev
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 bg-black/90 flex items-center justify-center",
        onClick: onClose,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: onClose,
                className: "absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10",
                "aria-label": "Close",
                children: "×"
            }, void 0, false, {
                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            images.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: (e)=>{
                            e.stopPropagation();
                            onPrev();
                        },
                        className: "absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl z-10 p-4",
                        "aria-label": "Previous image",
                        children: "‹"
                    }, void 0, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 67,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: (e)=>{
                            e.stopPropagation();
                            onNext();
                        },
                        className: "absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl z-10 p-4",
                        "aria-label": "Next image",
                        children: "›"
                    }, void 0, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 77,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: images[currentIndex],
                alt: "",
                className: "max-h-[90vh] max-w-[90vw] object-contain",
                onClick: (e)=>e.stopPropagation()
            }, void 0, false, {
                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                lineNumber: 91,
                columnNumber: 7
            }, this),
            images.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm",
                children: [
                    currentIndex + 1,
                    " / ",
                    images.length
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                lineNumber: 100,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/blog/[slug]/page.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
}
_s(ImageModal, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = ImageModal;
function BlogPost() {
    _s1();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"])();
    const slug = params.slug;
    const [post, setPost] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [notFound, setNotFound] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [modalOpen, setModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [modalIndex, setModalIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [adjacentPosts, setAdjacentPosts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        prev: null,
        next: null
    });
    // Get all images from current post
    const allImages = post ? extractImages(post.content) : [];
    const openModal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BlogPost.useCallback[openModal]": (imageSrc)=>{
            const idx = allImages.indexOf(imageSrc);
            setModalIndex(idx >= 0 ? idx : 0);
            setModalOpen(true);
        }
    }["BlogPost.useCallback[openModal]"], [
        allImages
    ]);
    const closeModal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BlogPost.useCallback[closeModal]": ()=>{
            setModalOpen(false);
        }
    }["BlogPost.useCallback[closeModal]"], []);
    const nextImage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BlogPost.useCallback[nextImage]": ()=>{
            setModalIndex({
                "BlogPost.useCallback[nextImage]": (i)=>(i + 1) % allImages.length
            }["BlogPost.useCallback[nextImage]"]);
        }
    }["BlogPost.useCallback[nextImage]"], [
        allImages.length
    ]);
    const prevImage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BlogPost.useCallback[prevImage]": ()=>{
            setModalIndex({
                "BlogPost.useCallback[prevImage]": (i)=>(i - 1 + allImages.length) % allImages.length
            }["BlogPost.useCallback[prevImage]"]);
        }
    }["BlogPost.useCallback[prevImage]"], [
        allImages.length
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BlogPost.useEffect": ()=>{
            async function loadPost() {
                try {
                    // Try Firestore first
                    const firestorePost = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPostBySlug"])(slug);
                    if (firestorePost) {
                        setPost(firestorePost);
                        // Load adjacent posts for navigation
                        const adjacent = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAdjacentPosts"])(slug);
                        setAdjacentPosts(adjacent);
                    } else {
                        // Fall back to hardcoded posts
                        const fallback = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$posts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["posts"][slug];
                        if (fallback) {
                            // Convert hardcoded format to Firestore format
                            let content = fallback.content;
                            if (fallback.images) {
                                fallback.images.forEach({
                                    "BlogPost.useEffect.loadPost": (img, i)=>{
                                        content = content.replace(`[IMAGE:${i}]`, `![${img.alt}](${img.src})`);
                                    }
                                }["BlogPost.useEffect.loadPost"]);
                            }
                            setPost({
                                slug: fallback.slug,
                                title: fallback.title,
                                date: fallback.date,
                                content,
                                isProject: fallback.isProject,
                                parent: fallback.parent,
                                status: "published"
                            });
                        } else {
                            setNotFound(true);
                        }
                    }
                } catch (error) {
                    console.error("Error loading post:", error);
                    // Try fallback on error
                    const fallback = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$posts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["posts"][slug];
                    if (fallback) {
                        let content = fallback.content;
                        if (fallback.images) {
                            fallback.images.forEach({
                                "BlogPost.useEffect.loadPost": (img, i)=>{
                                    content = content.replace(`[IMAGE:${i}]`, `![${img.alt}](${img.src})`);
                                }
                            }["BlogPost.useEffect.loadPost"]);
                        }
                        setPost({
                            slug: fallback.slug,
                            title: fallback.title,
                            date: fallback.date,
                            content,
                            isProject: fallback.isProject,
                            parent: fallback.parent,
                            status: "published"
                        });
                    } else {
                        setNotFound(true);
                    }
                } finally{
                    setLoading(false);
                }
            }
            loadPost();
        }
    }["BlogPost.useEffect"], [
        slug
    ]);
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-[--background] flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[--muted]",
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                lineNumber: 216,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/blog/[slug]/page.tsx",
            lineNumber: 215,
            columnNumber: 7
        }, this);
    }
    if (notFound || !post) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-[--background] flex flex-col items-center justify-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-2xl font-bold text-[--foreground] mb-4",
                    children: "Not Found"
                }, void 0, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 224,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "/",
                    className: "text-[--accent] hover:underline",
                    children: "← back to home"
                }, void 0, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 225,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/blog/[slug]/page.tsx",
            lineNumber: 223,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-[--background]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "mx-auto max-w-3xl px-6 py-12",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "text-[--muted] hover:text-[--accent] text-sm",
                        children: "← back"
                    }, void 0, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 235,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                        className: "mt-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                                className: "mb-8 pb-4 border-b border-[--border]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "text-2xl font-bold text-[--foreground] mb-2",
                                        children: post.title
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                        lineNumber: 244,
                                        columnNumber: 13
                                    }, this),
                                    post.date && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("time", {
                                        className: "text-sm text-[--muted]",
                                        children: post.date
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                        lineNumber: 245,
                                        columnNumber: 27
                                    }, this),
                                    post.parent && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-2",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: `/blog/${post.parent}`,
                                            className: "text-sm text-[--accent]",
                                            children: [
                                                "← Part of: ",
                                                post.parent.replace(/-/g, " ")
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                            lineNumber: 248,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                        lineNumber: 247,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                lineNumber: 243,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "prose-terminal font-serif",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$markdown$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Markdown__as__default$3e$__["default"], {
                                    components: {
                                        h1: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                className: "text-2xl font-bold text-[--foreground] mt-8 mb-4 font-sans",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 259,
                                                columnNumber: 19
                                            }, void 0),
                                        h2: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-xl font-bold text-[--foreground] mt-8 mb-4 font-sans",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 262,
                                                columnNumber: 19
                                            }, void 0),
                                        h3: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-lg font-bold text-[--foreground] mt-6 mb-3 font-sans",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 265,
                                                columnNumber: 19
                                            }, void 0),
                                        p: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[--foreground] text-base my-4 leading-relaxed",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 268,
                                                columnNumber: 19
                                            }, void 0),
                                        a: ({ href, children })=>{
                                            const isInternal = href?.startsWith("/");
                                            if (isInternal) {
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                    href: href || "/",
                                                    className: "text-[--accent] hover:underline",
                                                    children: children
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                    lineNumber: 274,
                                                    columnNumber: 23
                                                }, void 0);
                                            }
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: href,
                                                target: "_blank",
                                                rel: "noopener noreferrer",
                                                className: "text-[--accent] hover:underline",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 280,
                                                columnNumber: 21
                                            }, void 0);
                                        },
                                        strong: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                className: "font-bold",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 286,
                                                columnNumber: 19
                                            }, void 0),
                                        em: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                                                className: "italic",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 289,
                                                columnNumber: 19
                                            }, void 0),
                                        code: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                className: "bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 292,
                                                columnNumber: 19
                                            }, void 0),
                                        pre: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                                                className: "bg-gray-100 p-4 rounded overflow-x-auto my-4 text-sm",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 295,
                                                columnNumber: 19
                                            }, void 0),
                                        ul: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                className: "list-disc list-inside my-4 space-y-1 text-[--foreground]",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 298,
                                                columnNumber: 19
                                            }, void 0),
                                        ol: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                                                className: "list-decimal list-inside my-4 space-y-1 text-[--foreground]",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 301,
                                                columnNumber: 19
                                            }, void 0),
                                        li: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                className: "text-[--foreground]",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 304,
                                                columnNumber: 19
                                            }, void 0),
                                        blockquote: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("blockquote", {
                                                className: "border-l-4 border-[--accent] pl-4 my-4 italic text-[--muted]",
                                                children: children
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 307,
                                                columnNumber: 19
                                            }, void 0),
                                        img: ({ src, alt })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("figure", {
                                                className: "my-6 flex flex-col items-center",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                        src: typeof src === 'string' ? src : undefined,
                                                        alt: alt || "",
                                                        className: "max-w-full h-auto border border-[--border] rounded cursor-pointer hover:opacity-90 transition-opacity",
                                                        style: {
                                                            width: 'auto',
                                                            maxWidth: '100%'
                                                        },
                                                        onClick: ()=>typeof src === 'string' && openModal(src)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                        lineNumber: 311,
                                                        columnNumber: 21
                                                    }, void 0),
                                                    alt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("figcaption", {
                                                        className: "text-sm text-[--muted] mt-2 text-center",
                                                        children: alt
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                        lineNumber: 319,
                                                        columnNumber: 23
                                                    }, void 0)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 310,
                                                columnNumber: 19
                                            }, void 0),
                                        hr: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("hr", {
                                                className: "my-8 border-[--border]"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                                lineNumber: 326,
                                                columnNumber: 19
                                            }, void 0)
                                    },
                                    children: post.content
                                }, void 0, false, {
                                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                    lineNumber: 256,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                lineNumber: 255,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 242,
                        columnNumber: 9
                    }, this),
                    (adjacentPosts.prev || adjacentPosts.next) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        className: "mt-12 pt-8 border-t border-[--border]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between items-start gap-4",
                            children: [
                                adjacentPosts.prev ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: `/blog/${adjacentPosts.prev.slug}`,
                                    className: "group flex-1 max-w-[45%]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs text-[--muted] uppercase tracking-wide",
                                            children: "← Newer"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                            lineNumber: 344,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-[--foreground] group-hover:text-[--accent] transition-colors mt-1 line-clamp-2",
                                            children: adjacentPosts.prev.title
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                            lineNumber: 345,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                    lineNumber: 340,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                    lineNumber: 350,
                                    columnNumber: 17
                                }, this),
                                adjacentPosts.next && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: `/blog/${adjacentPosts.next.slug}`,
                                    className: "group flex-1 max-w-[45%] text-right",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs text-[--muted] uppercase tracking-wide",
                                            children: "Older →"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                            lineNumber: 357,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-[--foreground] group-hover:text-[--accent] transition-colors mt-1 line-clamp-2",
                                            children: adjacentPosts.next.title
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                            lineNumber: 358,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                    lineNumber: 353,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/blog/[slug]/page.tsx",
                            lineNumber: 338,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 337,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 367,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                lineNumber: 234,
                columnNumber: 7
            }, this),
            modalOpen && allImages.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ImageModal, {
                images: allImages,
                currentIndex: modalIndex,
                onClose: closeModal,
                onNext: nextImage,
                onPrev: prevImage
            }, void 0, false, {
                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                lineNumber: 372,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/blog/[slug]/page.tsx",
        lineNumber: 233,
        columnNumber: 5
    }, this);
}
_s1(BlogPost, "Toc+P6tRclDpjAqhIja8iQC5ACA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"]
    ];
});
_c1 = BlogPost;
var _c, _c1;
__turbopack_context__.k.register(_c, "ImageModal");
__turbopack_context__.k.register(_c1, "BlogPost");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_3b027d33._.js.map