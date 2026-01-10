module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/process [external] (process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("process", () => require("process"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/http2 [external] (http2, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http2", () => require("http2"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/dns [external] (dns, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("dns", () => require("dns"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[project]/src/lib/firebase.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$app$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/app/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/app/dist/esm/index.esm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.node.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$storage$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/storage/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$node$2d$esm$2f$index$2e$node$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/storage/dist/node-esm/index.node.esm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/auth/dist/node-esm/index.js [app-ssr] (ecmascript)");
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
const app = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getApps"])().length === 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initializeApp"])(firebaseConfig) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getApps"])()[0];
const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFirestore"])(app);
const storage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$node$2d$esm$2f$index$2e$node$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getStorage"])(app);
const auth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAuth"])(app);
const __TURBOPACK__default__export__ = app;
}),
"[project]/src/lib/firestore.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createPost",
    ()=>createPost,
    "deletePost",
    ()=>deletePost,
    "getAllPosts",
    ()=>getAllPosts,
    "getPostById",
    ()=>getPostById,
    "getPostBySlug",
    ()=>getPostBySlug,
    "getProjects",
    ()=>getProjects,
    "getPublishedPosts",
    ()=>getPublishedPosts,
    "slugExists",
    ()=>slugExists,
    "updatePost",
    ()=>updatePost
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.node.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/firebase.ts [app-ssr] (ecmascript)");
;
;
const POSTS_COLLECTION = "posts";
async function getPublishedPosts() {
    const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["where"])("status", "==", "published"));
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDocs"])(q);
    const posts = snapshot.docs.map((doc)=>({
            id: doc.id,
            ...doc.data()
        }));
    // Sort by date descending in JavaScript to avoid needing a composite index
    return posts.sort((a, b)=>(b.date || "").localeCompare(a.date || ""));
}
async function getAllPosts() {
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDocs"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION));
    const posts = snapshot.docs.map((doc)=>({
            id: doc.id,
            ...doc.data()
        }));
    // Sort by date descending (chronological, newest first)
    return posts.sort((a, b)=>(b.date || "").localeCompare(a.date || ""));
}
async function getPostBySlug(slug) {
    const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["where"])("slug", "==", slug), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["where"])("status", "==", "published"));
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDocs"])(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return {
        id: doc.id,
        ...doc.data()
    };
}
async function getPostById(id) {
    const docRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION, id);
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDoc"])(docRef);
    if (!snapshot.exists()) return null;
    return {
        id: snapshot.id,
        ...snapshot.data()
    };
}
async function createPost(post) {
    const now = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Timestamp"].now();
    const docRef = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addDoc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), {
        ...post,
        createdAt: now,
        updatedAt: now
    });
    return docRef.id;
}
async function updatePost(id, post) {
    const docRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION, id);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["updateDoc"])(docRef, {
        ...post,
        updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Timestamp"].now()
    });
}
async function deletePost(id) {
    const docRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION, id);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteDoc"])(docRef);
}
async function getProjects() {
    // Fetch published posts and filter by isProject in JavaScript to avoid composite index
    const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["where"])("status", "==", "published"));
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDocs"])(q);
    const posts = snapshot.docs.map((doc)=>({
            id: doc.id,
            ...doc.data()
        })).filter((p)=>p.isProject === true);
    return posts.sort((a, b)=>(b.date || "").localeCompare(a.date || ""));
}
async function slugExists(slug, excludeId) {
    const q = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], POSTS_COLLECTION), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["where"])("slug", "==", slug));
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDocs"])(q);
    if (snapshot.empty) return false;
    if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) {
        return false;
    }
    return true;
}
}),
"[project]/src/lib/posts.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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

├─ Next.js for static generation
├─ Firebase for hosting and future CMS
├─ Monospace aesthetic throughout
└─ All my old project writeups, preserved

## What's Next

I'll be adding new posts about current projects and experiments. Stay tuned.`
    },
    "building-this-site": {
        slug: "building-this-site",
        title: "Building This Site",
        date: "2026-01-07",
        content: `A quick note on how this site was built.

## Stack

├─ Next.js 16 with App Router
├─ TypeScript
├─ Tailwind CSS
├─ Firebase (hosting, future Firestore for posts)
└─ JetBrains Mono font

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
        content: `I'm a mechatronics and software engineer.

I have a background in JavaScript (Angular, Node/Express, Mongo, Electron), Swift, C, Python, Arduino, RasPi, CAD (SolidWorks and Onshape), robotics, electronics, circuit board design (Upverter and Eagle), machine building & design, and DFM.

## Links

├─ [GitHub](https://github.com/sosaysthecaptain)
├─ [LinkedIn](https://linkedin.com/in/marc-auger-3481a4104)
└─ [Space Trader on App Store](https://itunes.apple.com/us/app/space-trader-2018/id1106932709?mt=8)`
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

├─ [The Print Bed](/blog/fdm-print-bed)
├─ [Linear Systems](/blog/fdm-linear-systems)
├─ [Software Settings](/blog/fdm-software-settings)
└─ [The Printhead](/blog/fdm-printhead)`
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

├─ [Software Architecture](/blog/profilometer-architecture)
└─ [Circuit Board](/blog/profilometer-board)`
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

├─ [App Store](https://itunes.apple.com/us/app/space-trader-2018/id1106932709?mt=8)
└─ [Source on GitHub](https://github.com/sosaysthecaptain/spacetrader)

## Related Posts

├─ [Gameplay & Implementation](/blog/space-trader-implementation)
├─ [Encounters](/blog/space-trader-encounters)
└─ [Quests, Data Persistence, Debugging](/blog/space-trader-quests)`
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
└─ At zero clicks, journey.completeJourney() resets planet and dismisses WarpViewVC`
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
}),
"[project]/src/app/blog/[slug]/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BlogPost
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/firestore.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$posts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/posts.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
// Parse inline markdown (bold, italic, links, code) into JSX
function parseInlineMarkdown(text) {
    const parts = [];
    let remaining = text;
    let keyIdx = 0;
    while(remaining.length > 0){
        // Check for links [text](url)
        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
            const [full, linkText, url] = linkMatch;
            const isInternal = url.startsWith("/");
            if (isInternal) {
                parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    href: url,
                    className: "text-[--accent] hover:underline",
                    children: linkText
                }, keyIdx++, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 24,
                    columnNumber: 11
                }, this));
            } else {
                parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                    href: url,
                    className: "text-[--accent] hover:underline",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    children: linkText
                }, keyIdx++, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 30,
                    columnNumber: 11
                }, this));
            }
            remaining = remaining.slice(full.length);
            continue;
        }
        // Check for bold **text**
        const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
        if (boldMatch) {
            const [full, boldText] = boldMatch;
            parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                children: boldText
            }, keyIdx++, false, {
                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                lineNumber: 43,
                columnNumber: 18
            }, this));
            remaining = remaining.slice(full.length);
            continue;
        }
        // Check for italic *text*
        const italicMatch = remaining.match(/^\*([^*]+)\*/);
        if (italicMatch) {
            const [full, italicText] = italicMatch;
            parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                children: italicText
            }, keyIdx++, false, {
                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                lineNumber: 52,
                columnNumber: 18
            }, this));
            remaining = remaining.slice(full.length);
            continue;
        }
        // Check for inline code `code`
        const codeMatch = remaining.match(/^`([^`]+)`/);
        if (codeMatch) {
            const [full, codeText] = codeMatch;
            parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                className: "bg-gray-100 px-1 rounded text-sm font-mono",
                children: codeText
            }, keyIdx++, false, {
                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                lineNumber: 61,
                columnNumber: 18
            }, this));
            remaining = remaining.slice(full.length);
            continue;
        }
        // No match, add next character
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
    }
    // Merge adjacent strings
    const merged = [];
    let currentStr = "";
    for (const part of parts){
        if (typeof part === "string") {
            currentStr += part;
        } else {
            if (currentStr) {
                merged.push(currentStr);
                currentStr = "";
            }
            merged.push(part);
        }
    }
    if (currentStr) merged.push(currentStr);
    return merged.length > 0 ? merged : [
        text
    ];
}
// Parse markdown images ![alt](url) into JSX
function parseImages(text) {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;
    while((match = imageRegex.exec(text)) !== null){
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        const [, alt, url] = match;
        parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("figure", {
            className: "my-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative w-full border border-[--border]",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        src: url,
                        alt: alt,
                        width: 800,
                        height: 500,
                        className: "w-full h-auto",
                        unoptimized: url.startsWith("http")
                    }, void 0, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 105,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 104,
                    columnNumber: 9
                }, this),
                alt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("figcaption", {
                    className: "text-sm text-[--muted] mt-2 text-center",
                    children: alt
                }, void 0, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 115,
                    columnNumber: 11
                }, this)
            ]
        }, keyIndex++, true, {
            fileName: "[project]/src/app/blog/[slug]/page.tsx",
            lineNumber: 103,
            columnNumber: 7
        }, this));
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : [
        text
    ];
}
function BlogPost() {
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useParams"])();
    const slug = params.slug;
    const [post, setPost] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [notFound, setNotFound] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        async function loadPost() {
            try {
                // Try Firestore first
                const firestorePost = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firestore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPostBySlug"])(slug);
                if (firestorePost) {
                    setPost(firestorePost);
                } else {
                    // Fall back to hardcoded posts
                    const fallback = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$posts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["posts"][slug];
                    if (fallback) {
                        // Convert hardcoded format to Firestore format
                        let content = fallback.content;
                        if (fallback.images) {
                            fallback.images.forEach((img, i)=>{
                                content = content.replace(`[IMAGE:${i}]`, `![${img.alt}](${img.src})`);
                            });
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
                const fallback = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$posts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["posts"][slug];
                if (fallback) {
                    let content = fallback.content;
                    if (fallback.images) {
                        fallback.images.forEach((img, i)=>{
                            content = content.replace(`[IMAGE:${i}]`, `![${img.alt}](${img.src})`);
                        });
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
    }, [
        slug
    ]);
    const renderContent = ()=>{
        if (!post) return null;
        // First parse images, then for text parts parse inline markdown
        const parts = parseImages(post.content);
        return parts.map((part, i)=>{
            if (typeof part !== "string") {
                return part; // Already a JSX element (image)
            }
            return part.split("\n\n").map((paragraph, j)=>{
                if (!paragraph.trim()) return null;
                if (paragraph.startsWith("# ") && !paragraph.startsWith("## ")) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-[--foreground] font-bold mt-8 mb-4 text-2xl",
                        children: parseInlineMarkdown(paragraph.replace("# ", ""))
                    }, `${i}-${j}`, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 222,
                        columnNumber: 13
                    }, this);
                }
                if (paragraph.startsWith("## ")) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-[--foreground] font-bold mt-8 mb-4 text-xl",
                        children: parseInlineMarkdown(paragraph.replace("## ", ""))
                    }, `${i}-${j}`, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 229,
                        columnNumber: 13
                    }, this);
                }
                if (paragraph.startsWith("├─") || paragraph.startsWith("└─") || paragraph.startsWith("│")) {
                    const lines = paragraph.split("\n");
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                        className: "text-[--foreground] my-1 whitespace-pre-wrap",
                        children: lines.map((line, k)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    parseInlineMarkdown(line),
                                    k < lines.length - 1 && "\n"
                                ]
                            }, k, true, {
                                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                lineNumber: 239,
                                columnNumber: 17
                            }, this))
                    }, `${i}-${j}`, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 237,
                        columnNumber: 13
                    }, this);
                }
                if (paragraph.match(/^\d+\./)) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[--foreground] my-2 pl-4",
                        children: parseInlineMarkdown(paragraph)
                    }, `${i}-${j}`, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 249,
                        columnNumber: 13
                    }, this);
                }
                if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "text-[--foreground] my-1 ml-4",
                        children: parseInlineMarkdown(paragraph.slice(2))
                    }, `${i}-${j}`, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 256,
                        columnNumber: 13
                    }, this);
                }
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-[--foreground] my-4 leading-relaxed",
                    children: parseInlineMarkdown(paragraph)
                }, `${i}-${j}`, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 262,
                    columnNumber: 11
                }, this);
            });
        });
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-[--background] flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[--muted]",
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/src/app/blog/[slug]/page.tsx",
                lineNumber: 273,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/blog/[slug]/page.tsx",
            lineNumber: 272,
            columnNumber: 7
        }, this);
    }
    if (notFound || !post) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-[--background] flex flex-col items-center justify-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-2xl font-bold text-[--foreground] mb-4",
                    children: "Not Found"
                }, void 0, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 281,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    href: "/",
                    className: "text-[--accent] hover:underline",
                    children: "← back to home"
                }, void 0, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 282,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/blog/[slug]/page.tsx",
            lineNumber: 280,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-[--background]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "mx-auto max-w-3xl px-6 py-12",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    href: "/",
                    className: "text-[--muted] hover:text-[--accent] text-sm",
                    children: "← back"
                }, void 0, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 292,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                    className: "mt-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                            className: "mb-8 pb-4 border-b border-[--border]",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-2xl font-bold text-[--foreground] mb-2",
                                    children: post.title
                                }, void 0, false, {
                                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                    lineNumber: 301,
                                    columnNumber: 13
                                }, this),
                                post.date && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("time", {
                                    className: "text-sm text-[--muted]",
                                    children: post.date
                                }, void 0, false, {
                                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                    lineNumber: 302,
                                    columnNumber: 27
                                }, this),
                                post.parent && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-2",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: `/blog/${post.parent}`,
                                        className: "text-sm text-[--accent]",
                                        children: [
                                            "← Part of: ",
                                            post.parent.replace(/-/g, " ")
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                        lineNumber: 305,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                                    lineNumber: 304,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/blog/[slug]/page.tsx",
                            lineNumber: 300,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "prose-terminal",
                            children: renderContent()
                        }, void 0, false, {
                            fileName: "[project]/src/app/blog/[slug]/page.tsx",
                            lineNumber: 312,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 299,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                    className: "mt-16 pt-8 border-t border-[--border]",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "text-[--muted] hover:text-[--accent] text-sm",
                        children: "← back to home"
                    }, void 0, false, {
                        fileName: "[project]/src/app/blog/[slug]/page.tsx",
                        lineNumber: 318,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/blog/[slug]/page.tsx",
                    lineNumber: 317,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/blog/[slug]/page.tsx",
            lineNumber: 291,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/blog/[slug]/page.tsx",
        lineNumber: 290,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7c30c5de._.js.map