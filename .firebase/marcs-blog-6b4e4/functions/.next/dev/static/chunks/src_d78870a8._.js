(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
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
"[project]/src/lib/storage.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "deleteImage",
    ()=>deleteImage,
    "deletePostImages",
    ()=>deletePostImages,
    "listPostImages",
    ()=>listPostImages,
    "uploadImage",
    ()=>uploadImage,
    "uploadImageFromBlob",
    ()=>uploadImageFromBlob
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$storage$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/storage/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/storage/dist/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/firebase.ts [app-client] (ecmascript)");
;
;
async function uploadImage(file, path) {
    const storageRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ref"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["storage"], path);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["uploadBytes"])(storageRef, file);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDownloadURL"])(storageRef);
}
async function uploadImageFromBlob(blob, slug) {
    const timestamp = Date.now();
    const extension = blob.type.split("/")[1] || "png";
    const path = `posts/${slug}/${timestamp}.${extension}`;
    return uploadImage(blob, path);
}
async function deleteImage(url) {
    try {
        const storageRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ref"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["storage"], url);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteObject"])(storageRef);
    } catch (error) {
        console.error("Error deleting image:", error);
    }
}
async function listPostImages(slug) {
    const listRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ref"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["storage"], `posts/${slug}`);
    try {
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listAll"])(listRef);
        return Promise.all(result.items.map((item)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDownloadURL"])(item)));
    } catch  {
        return [];
    }
}
async function deletePostImages(slug) {
    const listRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ref"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["storage"], `posts/${slug}`);
    try {
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listAll"])(listRef);
        await Promise.all(result.items.map((item)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteObject"])(item)));
    } catch (error) {
        console.error("Error deleting post images:", error);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/admin/(tabs)/cms/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CMSPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$markdown$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Markdown__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/react-markdown/lib/index.js [app-client] (ecmascript) <export Markdown as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/firestore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/storage.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jszip$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jszip/lib/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
function CMSPage() {
    _s();
    const [posts, setPosts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedPost, setSelectedPost] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isNew, setIsNew] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [availableTags, setAvailableTags] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // Form state
    const [title, setTitle] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [slug, setSlug] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [content, setContent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [date, setDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [isProject, setIsProject] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [parent, setParent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [tags, setTags] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tagInput, setTagInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [tagDropdownIndex, setTagDropdownIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    // Original values for dirty checking
    const [originalValues, setOriginalValues] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        title: "",
        slug: "",
        content: "",
        date: "",
        isProject: false,
        parent: "",
        tags: []
    });
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [showPreview, setShowPreview] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const textareaRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Check if form has unsaved changes
    const isDirty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CMSPage.useMemo[isDirty]": ()=>{
            if (isNew) return true;
            return title !== originalValues.title || slug !== originalValues.slug || content !== originalValues.content || date !== originalValues.date || isProject !== originalValues.isProject || parent !== originalValues.parent || JSON.stringify(tags) !== JSON.stringify(originalValues.tags);
        }
    }["CMSPage.useMemo[isDirty]"], [
        title,
        slug,
        content,
        date,
        isProject,
        parent,
        tags,
        originalValues,
        isNew
    ]);
    // Load posts and tags
    const loadPosts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "CMSPage.useCallback[loadPosts]": async ()=>{
            try {
                const [allPosts, allTags] = await Promise.all([
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAllPosts"])(),
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAllTags"])()
                ]);
                setPosts(allPosts);
                setAvailableTags(allTags);
            } catch (error) {
                console.error("Error loading posts:", error);
            }
        }
    }["CMSPage.useCallback[loadPosts]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CMSPage.useEffect": ()=>{
            loadPosts();
        }
    }["CMSPage.useEffect"], [
        loadPosts
    ]);
    // Generate slug from title
    const generateSlug = (text)=>{
        return text.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "");
    };
    // New post
    const handleNewPost = ()=>{
        setSelectedPost(null);
        setIsNew(true);
        setTitle("");
        setSlug("");
        setContent("");
        setDate(new Date().toISOString().split("T")[0]);
        setIsProject(false);
        setParent("");
        setTags([]);
        setTagInput("");
        setStatus("");
        setOriginalValues({
            title: "",
            slug: "",
            content: "",
            date: new Date().toISOString().split("T")[0],
            isProject: false,
            parent: "",
            tags: []
        });
    };
    // Select post for editing
    const handleSelectPost = (post)=>{
        setSelectedPost(post);
        setIsNew(false);
        setTitle(post.title);
        setSlug(post.slug);
        setContent(post.content);
        setDate(post.date);
        setIsProject(post.isProject || false);
        setParent(post.parent || "");
        setTags(post.tags || []);
        setTagInput("");
        setStatus("");
        setOriginalValues({
            title: post.title,
            slug: post.slug,
            content: post.content,
            date: post.date,
            isProject: post.isProject || false,
            parent: post.parent || "",
            tags: post.tags || []
        });
    };
    // Handle image paste
    const handlePaste = async (e)=>{
        const items = e.clipboardData.items;
        for (const item of items){
            if (item.type.startsWith("image/")) {
                e.preventDefault();
                const blob = item.getAsFile();
                if (!blob) continue;
                const currentSlug = slug || "temp-" + Date.now();
                setStatus("Uploading image...");
                try {
                    const url = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["uploadImageFromBlob"])(blob, currentSlug);
                    const textarea = textareaRef.current;
                    if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newContent = content.slice(0, start) + `\n![Image](${url})\n` + content.slice(end);
                        setContent(newContent);
                    } else {
                        setContent(content + `\n![Image](${url})\n`);
                    }
                    setStatus("Image uploaded!");
                    setTimeout(()=>setStatus(""), 2000);
                } catch (error) {
                    console.error("Upload error:", error);
                    setStatus("Failed to upload image");
                }
            }
        }
    };
    // Handle image drag and drop
    const handleDrop = async (e)=>{
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter((f)=>f.type.startsWith("image/"));
        if (files.length === 0) return;
        const currentSlug = slug || "temp-" + Date.now();
        for (const file of files){
            setStatus("Uploading image...");
            try {
                const url = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["uploadImageFromBlob"])(file, currentSlug);
                const textarea = textareaRef.current;
                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newContent = content.slice(0, start) + `\n![Image](${url})\n` + content.slice(end);
                    setContent(newContent);
                } else {
                    setContent(content + `\n![Image](${url})\n`);
                }
                setStatus("Image uploaded!");
                setTimeout(()=>setStatus(""), 2000);
            } catch (error) {
                console.error("Upload error:", error);
                setStatus("Failed to upload image");
            }
        }
    };
    // Save as draft
    const handleSaveDraft = async ()=>{
        if (!title || !slug) {
            setStatus("Title and slug are required");
            return;
        }
        setSaving(true);
        setStatus("Saving draft...");
        try {
            const exists = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slugExists"])(slug, selectedPost?.id);
            if (exists) {
                setStatus("Slug already exists");
                setSaving(false);
                return;
            }
            const postData = {
                title,
                slug,
                content,
                date,
                isProject,
                tags,
                status: "draft"
            };
            if (parent) postData.parent = parent;
            if (isNew) {
                const id = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createPost"])(postData);
                setSelectedPost({
                    slug,
                    title,
                    date,
                    content,
                    isProject,
                    tags,
                    parent: parent || undefined,
                    status: "draft",
                    id,
                    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Timestamp"].now(),
                    updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Timestamp"].now()
                });
                setIsNew(false);
            } else if (selectedPost?.id) {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updatePost"])(selectedPost.id, postData);
            }
            await loadPosts();
            setOriginalValues({
                title,
                slug,
                content,
                date,
                isProject,
                parent,
                tags
            });
            setStatus("Draft saved!");
            setTimeout(()=>setStatus(""), 2000);
        } catch (error) {
            console.error("Save error:", error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            setStatus(`Failed to save: ${errorMsg}`);
        } finally{
            setSaving(false);
        }
    };
    // Publish
    const handlePublish = async ()=>{
        if (!title || !slug) {
            setStatus("Title and slug are required");
            return;
        }
        setSaving(true);
        setStatus("Publishing...");
        try {
            const exists = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slugExists"])(slug, selectedPost?.id);
            if (exists) {
                setStatus("Slug already exists");
                setSaving(false);
                return;
            }
            const postData = {
                title,
                slug,
                content,
                date,
                isProject,
                tags,
                status: "published"
            };
            if (parent) postData.parent = parent;
            if (isNew) {
                const id = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createPost"])(postData);
                setSelectedPost({
                    slug,
                    title,
                    date,
                    content,
                    isProject,
                    tags,
                    parent: parent || undefined,
                    status: "published",
                    id,
                    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Timestamp"].now(),
                    updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Timestamp"].now()
                });
                setIsNew(false);
            } else if (selectedPost?.id) {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updatePost"])(selectedPost.id, postData);
            }
            await loadPosts();
            setOriginalValues({
                title,
                slug,
                content,
                date,
                isProject,
                parent,
                tags
            });
            setStatus(selectedPost?.status === "published" ? "Updated!" : "Published!");
            setTimeout(()=>setStatus(""), 2000);
        } catch (error) {
            console.error("Publish error:", error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            setStatus(`Failed to publish: ${errorMsg}`);
        } finally{
            setSaving(false);
        }
    };
    // Unpublish (convert to draft)
    const handleUnpublish = async ()=>{
        if (!selectedPost?.id) return;
        if (!confirm("Unpublish this post? It will become a draft.")) return;
        setSaving(true);
        setStatus("Unpublishing...");
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updatePost"])(selectedPost.id, {
                status: "draft"
            });
            await loadPosts();
            setSelectedPost({
                ...selectedPost,
                status: "draft"
            });
            setOriginalValues({
                ...originalValues
            });
            setStatus("Unpublished!");
            setTimeout(()=>setStatus(""), 2000);
        } catch (error) {
            console.error("Unpublish error:", error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            setStatus(`Failed to unpublish: ${errorMsg}`);
        } finally{
            setSaving(false);
        }
    };
    // Delete post
    const handleDelete = async ()=>{
        if (!selectedPost?.id) return;
        if (!confirm("Are you sure you want to delete this post?")) return;
        setSaving(true);
        setStatus("Deleting...");
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deletePostImages"])(selectedPost.slug);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deletePost"])(selectedPost.id);
            await loadPosts();
            handleNewPost();
            setStatus("Deleted!");
            setTimeout(()=>setStatus(""), 2000);
        } catch (error) {
            console.error("Delete error:", error);
            setStatus("Failed to delete");
        } finally{
            setSaving(false);
        }
    };
    // Export all posts as zip with images
    const handleExportAll = async ()=>{
        setStatus("Preparing export...");
        try {
            const zip = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jszip$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]();
            const imagesFolder = zip.folder("images");
            const publishedPosts = posts.filter((p)=>p.status === "published");
            const imageMap = {};
            const allImageUrls = new Set();
            for (const post of publishedPosts){
                const imageMatches = post.content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
                for (const match of imageMatches){
                    const url = match[2];
                    if (url.startsWith("http")) {
                        allImageUrls.add(url);
                    }
                }
            }
            setStatus(`Downloading ${allImageUrls.size} images...`);
            let imageCount = 0;
            for (const url of allImageUrls){
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const blob = await response.blob();
                        const urlPath = new URL(url).pathname;
                        const ext = urlPath.split(".").pop()?.split("?")[0] || "jpg";
                        const filename = `image-${imageCount}.${ext}`;
                        imageMap[url] = filename;
                        imagesFolder?.file(filename, blob);
                        imageCount++;
                    }
                } catch (e) {
                    console.warn(`Failed to download: ${url}`, e);
                }
            }
            for (const post of publishedPosts){
                let postContent = post.content;
                for (const [url, filename] of Object.entries(imageMap)){
                    postContent = postContent.replace(new RegExp(`!\\[([^\\]]*)\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`, "g"), `![$1](./images/${filename})`);
                }
                let markdown = `---
title: "${post.title}"
slug: "${post.slug}"
date: "${post.date}"
${post.isProject ? "isProject: true" : ""}
${post.parent ? `parent: "${post.parent}"` : ""}
---

${postContent}`;
                zip.file(`${post.slug}.md`, markdown);
            }
            const blob = await zip.generateAsync({
                type: "blob"
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `blog-export-${new Date().toISOString().split("T")[0]}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            setStatus(`Export complete! ${imageCount} images included.`);
            setTimeout(()=>setStatus(""), 3000);
        } catch (error) {
            console.error("Export error:", error);
            setStatus("Export failed");
        }
    };
    const projectPosts = posts.filter((p)=>p.isProject);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-64 border-r border-[--border] flex flex-col h-screen bg-white",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-4 border-b border-[--border]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleNewPost,
                            className: "w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700",
                            children: "+ New Post"
                        }, void 0, false, {
                            fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                            lineNumber: 469,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                        lineNumber: 468,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto",
                        children: posts.map((post)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>handleSelectPost(post),
                                className: `w-full text-left px-4 py-3 border-b border-[--border] hover:bg-blue-50 transition-colors ${selectedPost?.id === post.id ? "bg-blue-50 border-l-4 border-l-blue-600 pl-3" : ""}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: `w-2 h-2 rounded-full flex-shrink-0 ${post.status === "published" ? "bg-green-500" : "bg-yellow-500"}`
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 489,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: `text-sm font-medium truncate ${selectedPost?.id === post.id ? "text-blue-700" : "text-[--foreground]"}`,
                                                children: post.title || "Untitled"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 494,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                        lineNumber: 488,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-xs text-[--muted] mt-1",
                                        children: [
                                            post.date,
                                            " ",
                                            post.isProject && "• Project"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                        lineNumber: 500,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, post.id, true, {
                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                lineNumber: 479,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                        lineNumber: 477,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-4 border-t border-[--border]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleExportAll,
                            className: "w-full px-4 py-2 border border-[--border] rounded text-sm text-[--foreground] hover:bg-[--border]/50",
                            children: "Export All"
                        }, void 0, false, {
                            fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                            lineNumber: 508,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                        lineNumber: 507,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                lineNumber: 467,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 flex flex-col h-screen",
                children: selectedPost || isNew ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "p-4 border-b border-[--border] flex items-center gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleSaveDraft,
                                    disabled: saving || !isDirty,
                                    className: "px-4 py-2 border border-[--border] rounded text-sm text-[--foreground] hover:bg-[--border]/50 disabled:opacity-50 disabled:cursor-not-allowed",
                                    children: "Save Draft"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                    lineNumber: 523,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handlePublish,
                                    disabled: saving || selectedPost?.status === "published" && !isDirty,
                                    className: "px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
                                    children: selectedPost?.status === "published" ? "Update" : "Publish"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                    lineNumber: 530,
                                    columnNumber: 15
                                }, this),
                                selectedPost?.status === "published" && !isNew && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleUnpublish,
                                    disabled: saving,
                                    className: "px-4 py-2 text-orange-500 text-sm hover:underline disabled:opacity-50",
                                    children: "Unpublish"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                    lineNumber: 538,
                                    columnNumber: 17
                                }, this),
                                selectedPost && !isNew && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleDelete,
                                    disabled: saving,
                                    className: "px-4 py-2 text-red-500 text-sm hover:underline disabled:opacity-50",
                                    children: "Delete"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                    lineNumber: 547,
                                    columnNumber: 17
                                }, this),
                                status && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-sm text-[--muted]",
                                    children: status
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                    lineNumber: 556,
                                    columnNumber: 17
                                }, this),
                                isDirty && !isNew && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs text-orange-500",
                                    children: "Unsaved changes"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                    lineNumber: 559,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                    lineNumber: 561,
                                    columnNumber: 15
                                }, this),
                                selectedPost?.status === "published" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: `/blog/${selectedPost.slug}`,
                                    target: "_blank",
                                    className: "text-sm text-[--accent] hover:underline",
                                    children: "View post →"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                    lineNumber: 563,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                            lineNumber: 522,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 overflow-y-auto p-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "max-w-3xl space-y-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm text-[--muted] mb-1",
                                                children: "Title"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 577,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                value: title,
                                                onChange: (e)=>{
                                                    setTitle(e.target.value);
                                                    if (isNew && !slug) {
                                                        setSlug(generateSlug(e.target.value));
                                                    }
                                                },
                                                className: "w-full px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground]",
                                                placeholder: "Post title"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 578,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                        lineNumber: 576,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "block text-sm text-[--muted] mb-1",
                                                        children: "Slug"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                        lineNumber: 594,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "text",
                                                        value: slug,
                                                        onChange: (e)=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")),
                                                        className: "w-full px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground]",
                                                        placeholder: "post-slug"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                        lineNumber: 595,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 593,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-40",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "block text-sm text-[--muted] mb-1",
                                                        children: "Date"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                        lineNumber: 604,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "date",
                                                        value: date,
                                                        onChange: (e)=>setDate(e.target.value),
                                                        className: "w-full px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground]"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                        lineNumber: 605,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 603,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                        lineNumber: 592,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-4 items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "flex items-center gap-2 text-sm text-[--foreground]",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        checked: isProject,
                                                        onChange: (e)=>setIsProject(e.target.checked),
                                                        className: "rounded"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                        lineNumber: 616,
                                                        columnNumber: 21
                                                    }, this),
                                                    "Is Project"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 615,
                                                columnNumber: 19
                                            }, this),
                                            !isProject && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "block text-sm text-[--muted] mb-1",
                                                        children: "Parent Project"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                        lineNumber: 626,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        value: parent,
                                                        onChange: (e)=>setParent(e.target.value),
                                                        className: "w-full px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground]",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "",
                                                                children: "None"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 632,
                                                                columnNumber: 25
                                                            }, this),
                                                            projectPosts.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: p.slug,
                                                                    children: p.title
                                                                }, p.id, false, {
                                                                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                    lineNumber: 634,
                                                                    columnNumber: 27
                                                                }, this))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                        lineNumber: 627,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 625,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                        lineNumber: 614,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm text-[--muted] mb-1",
                                                children: "Tags"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 644,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-wrap gap-2 mb-2",
                                                children: tags.map((tag)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded",
                                                        children: [
                                                            tag,
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                onClick: ()=>setTags(tags.filter((t)=>t !== tag)),
                                                                className: "hover:text-gray-900",
                                                                children: "×"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 652,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, tag, true, {
                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                        lineNumber: 647,
                                                        columnNumber: 23
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 645,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative",
                                                children: (()=>{
                                                    const filteredTags = availableTags.filter((t)=>!tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase()));
                                                    const showCreate = tagInput.trim() && !availableTags.some((t)=>t.toLowerCase() === tagInput.toLowerCase());
                                                    const totalItems = filteredTags.length + (showCreate ? 1 : 0);
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "text",
                                                                value: tagInput,
                                                                onChange: (e)=>{
                                                                    setTagInput(e.target.value);
                                                                    setTagDropdownIndex(0);
                                                                },
                                                                onKeyDown: (e)=>{
                                                                    if (e.key === "ArrowDown") {
                                                                        e.preventDefault();
                                                                        setTagDropdownIndex((i)=>Math.min(i + 1, totalItems - 1));
                                                                    } else if (e.key === "ArrowUp") {
                                                                        e.preventDefault();
                                                                        setTagDropdownIndex((i)=>Math.max(i - 1, 0));
                                                                    } else if (e.key === "Enter" && tagInput.trim()) {
                                                                        e.preventDefault();
                                                                        if (tagDropdownIndex < filteredTags.length) {
                                                                            const selectedTag = filteredTags[tagDropdownIndex];
                                                                            if (!tags.includes(selectedTag)) {
                                                                                setTags([
                                                                                    ...tags,
                                                                                    selectedTag
                                                                                ]);
                                                                            }
                                                                        } else {
                                                                            const newTag = tagInput.trim().toLowerCase();
                                                                            if (!tags.includes(newTag)) {
                                                                                setTags([
                                                                                    ...tags,
                                                                                    newTag
                                                                                ]);
                                                                            }
                                                                        }
                                                                        setTagInput("");
                                                                        setTagDropdownIndex(0);
                                                                    } else if (e.key === "Escape") {
                                                                        setTagInput("");
                                                                        setTagDropdownIndex(0);
                                                                    }
                                                                },
                                                                className: "w-full px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground]",
                                                                placeholder: "Type to add or search tags..."
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 672,
                                                                columnNumber: 27
                                                            }, this),
                                                            tagInput.trim() && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "absolute z-10 left-0 right-0 mt-1 bg-white border border-[--border] rounded shadow-lg max-h-48 overflow-y-auto",
                                                                children: [
                                                                    filteredTags.map((tag, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            type: "button",
                                                                            onClick: ()=>{
                                                                                setTags([
                                                                                    ...tags,
                                                                                    tag
                                                                                ]);
                                                                                setTagInput("");
                                                                                setTagDropdownIndex(0);
                                                                            },
                                                                            className: `w-full text-left px-3 py-2 text-sm transition-colors ${idx === tagDropdownIndex ? "bg-gray-100" : "hover:bg-gray-50"}`,
                                                                            children: tag
                                                                        }, tag, false, {
                                                                            fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                            lineNumber: 713,
                                                                            columnNumber: 33
                                                                        }, this)),
                                                                    showCreate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        onClick: ()=>{
                                                                            const newTag = tagInput.trim().toLowerCase();
                                                                            if (!tags.includes(newTag)) {
                                                                                setTags([
                                                                                    ...tags,
                                                                                    newTag
                                                                                ]);
                                                                            }
                                                                            setTagInput("");
                                                                            setTagDropdownIndex(0);
                                                                        },
                                                                        className: `w-full text-left px-3 py-2 text-sm text-[--muted] transition-colors border-t border-[--border] ${tagDropdownIndex === filteredTags.length ? "bg-gray-100" : "hover:bg-gray-50"}`,
                                                                        children: [
                                                                            'Create "',
                                                                            tagInput.trim().toLowerCase(),
                                                                            '"'
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                        lineNumber: 729,
                                                                        columnNumber: 33
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 711,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true);
                                                })()
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 662,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                        lineNumber: 643,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between mb-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "text-sm text-[--muted]",
                                                        children: [
                                                            "Content ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-xs",
                                                                children: "(paste images directly)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 757,
                                                                columnNumber: 31
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                        lineNumber: 756,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setShowPreview(!showPreview),
                                                        className: "text-sm text-blue-600 hover:underline",
                                                        children: showPreview ? "Edit" : "Preview"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                        lineNumber: 759,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 755,
                                                columnNumber: 19
                                            }, this),
                                            showPreview ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-full min-h-96 px-4 py-3 border border-[--border] rounded bg-white overflow-y-auto",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$markdown$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Markdown__as__default$3e$__["default"], {
                                                    components: {
                                                        h1: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                                className: "text-2xl font-bold mt-6 mb-3",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 771,
                                                                columnNumber: 49
                                                            }, void 0),
                                                        h2: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                                className: "text-xl font-bold mt-6 mb-3",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 772,
                                                                columnNumber: 49
                                                            }, void 0),
                                                        h3: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                                className: "text-lg font-bold mt-4 mb-2",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 773,
                                                                columnNumber: 49
                                                            }, void 0),
                                                        p: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "my-3 leading-relaxed",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 774,
                                                                columnNumber: 48
                                                            }, void 0),
                                                        a: ({ href, children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                                href: href,
                                                                className: "text-blue-600 hover:underline",
                                                                target: "_blank",
                                                                rel: "noopener noreferrer",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 775,
                                                                columnNumber: 54
                                                            }, void 0),
                                                        strong: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                className: "font-bold",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 776,
                                                                columnNumber: 53
                                                            }, void 0),
                                                        em: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                                                                className: "italic",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 777,
                                                                columnNumber: 49
                                                            }, void 0),
                                                        code: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                                className: "bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 778,
                                                                columnNumber: 51
                                                            }, void 0),
                                                        pre: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                                                                className: "bg-gray-100 p-4 rounded overflow-x-auto my-4 text-sm",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 779,
                                                                columnNumber: 50
                                                            }, void 0),
                                                        ul: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                className: "list-disc list-inside my-3 space-y-1",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 780,
                                                                columnNumber: 49
                                                            }, void 0),
                                                        ol: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                                                                className: "list-decimal list-inside my-3 space-y-1",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 781,
                                                                columnNumber: 49
                                                            }, void 0),
                                                        li: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 782,
                                                                columnNumber: 49
                                                            }, void 0),
                                                        blockquote: ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("blockquote", {
                                                                className: "border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600",
                                                                children: children
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 783,
                                                                columnNumber: 57
                                                            }, void 0),
                                                        img: ({ src, alt })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("figure", {
                                                                className: "my-4",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                        src: src,
                                                                        alt: alt || "",
                                                                        className: "max-w-full h-auto border border-gray-200 rounded",
                                                                        style: {
                                                                            width: 'auto'
                                                                        }
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                        lineNumber: 786,
                                                                        columnNumber: 31
                                                                    }, void 0),
                                                                    alt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("figcaption", {
                                                                        className: "text-sm text-gray-500 mt-1 text-center",
                                                                        children: alt
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                        lineNumber: 787,
                                                                        columnNumber: 39
                                                                    }, void 0)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                                lineNumber: 785,
                                                                columnNumber: 29
                                                            }, void 0)
                                                    },
                                                    children: content || "*No content to preview*"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                    lineNumber: 769,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 768,
                                                columnNumber: 21
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                ref: textareaRef,
                                                value: content,
                                                onChange: (e)=>setContent(e.target.value),
                                                onPaste: handlePaste,
                                                onDrop: handleDrop,
                                                onDragOver: (e)=>e.preventDefault(),
                                                className: "w-full h-96 px-3 py-2 border border-[--border] rounded bg-[--background] text-[--foreground] font-mono text-sm resize-y",
                                                placeholder: "Write your post content here. Use markdown syntax. Paste or drag images."
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                                lineNumber: 796,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                        lineNumber: 754,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-xs text-[--muted] space-y-1",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "Markdown supported: ## Headings, **bold**, *italic*, [links](url), ![images](url)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                            lineNumber: 810,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                        lineNumber: 809,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                                lineNumber: 575,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                            lineNumber: 574,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 flex items-center justify-center text-[--muted]",
                    children: "Select a post or create a new one"
                }, void 0, false, {
                    fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                    lineNumber: 816,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/admin/(tabs)/cms/page.tsx",
                lineNumber: 518,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(CMSPage, "UFla6v9Pxwcx/JhnOg/1UxZJgoQ=");
_c = CMSPage;
var _c;
__turbopack_context__.k.register(_c, "CMSPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_d78870a8._.js.map