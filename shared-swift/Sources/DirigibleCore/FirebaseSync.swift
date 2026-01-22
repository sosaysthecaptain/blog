import Foundation
import FirebaseAuth
import FirebaseCore
import FirebaseFirestore
import FirebaseFunctions
import AuthenticationServices
import CommonCrypto

#if os(macOS)
import AppKit

// Context provider for ASWebAuthenticationSession
class WebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = WebAuthContextProvider()

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return NSApplication.shared.keyWindow ?? ASPresentationAnchor()
    }
}
#endif

/// FirebaseSync - Syncs Firestore data to local SQLite cache
@MainActor
public class FirebaseSync: ObservableObject {
    public static let shared = FirebaseSync()

    @Published public private(set) var isAuthenticated = false
    @Published public private(set) var userEmail: String?
    @Published public private(set) var isSyncing = false
    @Published public private(set) var lastSyncTime: Date?
    @Published public private(set) var syncError: Error?

    private var notesListener: ListenerRegistration?
    private var songsListener: ListenerRegistration?
    private var currentFirebaseUser: FirebaseUser?

    private var authStateHandle: AuthStateDidChangeListenerHandle?

    // MARK: - Signed URL Cache
    private var signedUrlCache: [String: (url: String, expiresAt: Date)] = [:]
    private let signedUrlRefreshBuffer: TimeInterval = 5 * 60  // Refresh 5 minutes before expiry

    private init() {
        // Listen for auth state changes
        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] auth, user in
            print("[AUTH-LISTENER] Auth state changed!")
            print("[AUTH-LISTENER] user = \(user?.email ?? "nil")")
            print("[AUTH-LISTENER] user.uid = \(user?.uid ?? "nil")")
        }

        // Restore saved auth state
        Task { @MainActor in
            await restoreAuthState()
        }
    }

    /// Restore auth state from Firebase Auth SDK or UserDefaults
    private func restoreAuthState() async {
        // First check if Firebase Auth SDK has a current user
        if let user = Auth.auth().currentUser {
            print("[AUTH] Firebase Auth SDK has current user: \(user.email ?? "no email")")

            currentFirebaseUser = FirebaseUser(
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                idToken: "",  // SDK manages tokens internally
                refreshToken: user.refreshToken ?? ""
            )

            isAuthenticated = true
            userEmail = user.email

            await startSync()
            return
        }

        // Fall back to UserDefaults (for REST API auth)
        guard let savedEmail = UserDefaults.standard.string(forKey: "firebase_user_email"),
              let savedUid = UserDefaults.standard.string(forKey: "firebase_user_uid"),
              let savedIdToken = UserDefaults.standard.string(forKey: "firebase_id_token"),
              let savedRefreshToken = UserDefaults.standard.string(forKey: "firebase_refresh_token")
        else {
            print("[AUTH] No saved auth state found")
            return
        }

        print("[AUTH] Restoring saved auth state for: \(savedEmail)")

        // Try to sign in to Firebase Auth SDK using saved tokens
        if let savedAccessToken = UserDefaults.standard.string(forKey: "firebase_access_token") {
            print("[AUTH] Attempting to sign in to Firebase Auth SDK with saved tokens...")
            do {
                let credential = GoogleAuthProvider.credential(withIDToken: savedIdToken, accessToken: savedAccessToken)
                let authResult = try await Auth.auth().signIn(with: credential)
                print("[AUTH] SUCCESS - Firebase Auth SDK signed in: \(authResult.user.email ?? "no email")")

                currentFirebaseUser = FirebaseUser(
                    uid: authResult.user.uid,
                    email: authResult.user.email,
                    displayName: authResult.user.displayName,
                    idToken: savedIdToken,
                    refreshToken: authResult.user.refreshToken ?? savedRefreshToken
                )

                isAuthenticated = true
                userEmail = authResult.user.email

                await startSync()
                return
            } catch {
                print("[AUTH] Firebase Auth SDK sign-in failed: \(error)")
                print("[AUTH] User may need to sign out and sign back in for write access")
            }
        }

        // Fall back to local state only (reads will work, writes may fail)
        print("[AUTH] Using local state only - writes may fail")

        currentFirebaseUser = FirebaseUser(
            uid: savedUid,
            email: savedEmail,
            displayName: nil,
            idToken: savedIdToken,
            refreshToken: savedRefreshToken
        )

        isAuthenticated = true
        userEmail = savedEmail

        // Start sync (read-only will work, writes may fail)
        await startSync()
    }

    /// Save auth state to UserDefaults
    private func saveAuthState(_ user: FirebaseUser, accessToken: String? = nil) {
        UserDefaults.standard.set(user.email, forKey: "firebase_user_email")
        UserDefaults.standard.set(user.uid, forKey: "firebase_user_uid")
        UserDefaults.standard.set(user.idToken, forKey: "firebase_id_token")
        UserDefaults.standard.set(user.refreshToken, forKey: "firebase_refresh_token")
        if let accessToken = accessToken {
            UserDefaults.standard.set(accessToken, forKey: "firebase_access_token")
        }
        print("[AUTH] Saved auth state to UserDefaults")
    }

    /// Clear auth state from UserDefaults
    private func clearAuthState() {
        UserDefaults.standard.removeObject(forKey: "firebase_user_email")
        UserDefaults.standard.removeObject(forKey: "firebase_user_uid")
        UserDefaults.standard.removeObject(forKey: "firebase_id_token")
        UserDefaults.standard.removeObject(forKey: "firebase_refresh_token")
        print("[AUTH] Cleared auth state from UserDefaults")
    }

    // MARK: - Authentication

    public func signIn(email: String, password: String) async throws {
        try await Auth.auth().signIn(withEmail: email, password: password)
    }

    // iOS OAuth client (supports custom URL schemes with PKCE)
    private let iOSClientID = "341793197828-gii5rq2g1vf6kjr2fdthstivvol3kjic.apps.googleusercontent.com"

    public func signInWithGoogle() async throws {
        #if os(macOS)
        print("[AUTH] Step 1: Starting Google Sign-In")

        // Generate PKCE code verifier and challenge
        let codeVerifier = generateCodeVerifier()
        let codeChallenge = generateCodeChallenge(from: codeVerifier)
        print("[AUTH] Step 2: Generated PKCE codes")

        // Get auth code via browser
        print("[AUTH] Step 3: Opening browser for OAuth...")
        let authCode: String
        do {
            authCode = try await getGoogleAuthCode(codeChallenge: codeChallenge)
            print("[AUTH] Step 4: Got auth code from Google (length: \(authCode.count))")
        } catch {
            print("[AUTH] Step 4 FAILED: Browser auth error: \(error)")
            print("[AUTH] Error type: \(type(of: error))")
            print("[AUTH] Error localizedDescription: \(error.localizedDescription)")
            throw error
        }

        // Exchange code for tokens using PKCE
        print("[AUTH] Step 5: Exchanging code for tokens...")
        let tokens: Tokens
        do {
            tokens = try await exchangeCodeForTokens(authCode, codeVerifier: codeVerifier)
            print("[AUTH] Step 6: Got tokens - idToken length: \(tokens.idToken.count), accessToken length: \(tokens.accessToken.count)")
        } catch {
            print("[AUTH] Step 6 FAILED: Token exchange error: \(error)")
            print("[AUTH] Error type: \(type(of: error))")
            print("[AUTH] Error localizedDescription: \(error.localizedDescription)")
            throw error
        }

        // Sign in to Firebase Auth SDK using Google credential
        // This is required for Firestore write permissions
        print("[AUTH] Step 7: Signing in to Firebase Auth SDK...")
        do {
            let credential = GoogleAuthProvider.credential(withIDToken: tokens.idToken, accessToken: tokens.accessToken)
            let authResult = try await Auth.auth().signIn(with: credential)
            print("[AUTH] Step 8: SUCCESS - Firebase Auth SDK signed in: \(authResult.user.email ?? "no email")")

            // Create FirebaseUser for local storage
            let firebaseUser = FirebaseUser(
                uid: authResult.user.uid,
                email: authResult.user.email,
                displayName: authResult.user.displayName,
                idToken: tokens.idToken,
                refreshToken: authResult.user.refreshToken ?? ""
            )

            // Store tokens for future use and persist
            self.currentFirebaseUser = firebaseUser
            saveAuthState(firebaseUser, accessToken: tokens.accessToken)

            // Update auth state
            await MainActor.run {
                self.isAuthenticated = true
                self.userEmail = firebaseUser.email
            }
            print("[AUTH] Step 9: Auth state updated, user is signed in!")
            print("[AUTH] Auth.auth().currentUser = \(Auth.auth().currentUser?.email ?? "nil")")

            // Start Firestore sync
            print("[AUTH] Step 10: Starting Firestore sync...")
            await startSync()
        } catch {
            print("[AUTH] Step 7 FAILED: Firebase Auth SDK error: \(error)")
            print("[AUTH] Falling back to REST API...")

            // Fall back to REST API if SDK fails (keeps read-only access)
            do {
                let firebaseUser = try await signInWithFirebaseREST(idToken: tokens.idToken, accessToken: tokens.accessToken)
                self.currentFirebaseUser = firebaseUser
                saveAuthState(firebaseUser)

                await MainActor.run {
                    self.isAuthenticated = true
                    self.userEmail = firebaseUser.email
                }

                await startSync()
            } catch {
                print("[AUTH] REST API fallback also failed: \(error)")
                throw error
            }
        }
        #endif
    }

    // Firebase Auth REST API response
    private struct FirebaseAuthResponse: Codable {
        let localId: String
        let email: String?
        let displayName: String?
        let idToken: String
        let refreshToken: String
        let expiresIn: String
    }

    private struct FirebaseUser {
        let uid: String
        let email: String?
        let displayName: String?
        let idToken: String
        let refreshToken: String
    }

    private func signInWithFirebaseREST(idToken: String, accessToken: String) async throws -> FirebaseUser {
        // Get API key from Firebase config
        guard let apiKey = FirebaseApp.app()?.options.apiKey else {
            print("[AUTH] REST API: No Firebase API key found")
            throw AuthError.missingClientID
        }
        print("[AUTH] REST API: Using API key: \(apiKey.prefix(10))...")

        let url = URL(string: "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=\(apiKey)")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "postBody": "id_token=\(idToken)&providerId=google.com",
            "requestUri": "http://localhost",
            "returnIdpCredential": true,
            "returnSecureToken": true
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        print("[AUTH] REST API: Making request to Firebase...")
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.tokenExchangeFailed
        }

        print("[AUTH] REST API: HTTP status = \(httpResponse.statusCode)")
        let responseBody = String(data: data, encoding: .utf8) ?? "Unable to decode"
        print("[AUTH] REST API: Response = \(responseBody.prefix(500))...")

        guard httpResponse.statusCode == 200 else {
            throw AuthError.tokenExchangeFailed
        }

        let authResponse = try JSONDecoder().decode(FirebaseAuthResponse.self, from: data)

        return FirebaseUser(
            uid: authResponse.localId,
            email: authResponse.email,
            displayName: authResponse.displayName,
            idToken: authResponse.idToken,
            refreshToken: authResponse.refreshToken
        )
    }

    #if os(macOS)
    private func generateCodeVerifier() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return Data(bytes).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private func generateCodeChallenge(from verifier: String) -> String {
        let data = Data(verifier.utf8)
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes { bytes in
            _ = CC_SHA256(bytes.baseAddress, CC_LONG(data.count), &hash)
        }
        return Data(hash).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private func getGoogleAuthCode(codeChallenge: String) async throws -> String {
        // Use the reversed client ID as the redirect scheme (standard for iOS OAuth)
        let redirectURI = "com.googleusercontent.apps.341793197828-gii5rq2g1vf6kjr2fdthstivvol3kjic:/oauth2callback"
        let scope = "openid email profile"

        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: iOSClientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: scope),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
        ]

        guard let authURL = components.url else {
            throw AuthError.invalidURL
        }

        print("[AUTH] Browser: Opening ASWebAuthenticationSession...")
        print("[AUTH] Browser: Auth URL = \(authURL)")

        return try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: "com.googleusercontent.apps.341793197828-gii5rq2g1vf6kjr2fdthstivvol3kjic"
            ) { callbackURL, error in
                print("[AUTH] Browser: Callback received")

                if let error = error {
                    print("[AUTH] Browser: ERROR from callback: \(error)")
                    print("[AUTH] Browser: Error type: \(type(of: error))")
                    print("[AUTH] Browser: Error localizedDescription: \(error.localizedDescription)")
                    continuation.resume(throwing: error)
                    return
                }

                print("[AUTH] Browser: Callback URL = \(callbackURL?.absoluteString ?? "nil")")

                guard let callbackURL = callbackURL,
                      let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                      let code = components.queryItems?.first(where: { $0.name == "code" })?.value
                else {
                    print("[AUTH] Browser: Failed to extract auth code from callback URL")
                    if let url = callbackURL {
                        print("[AUTH] Browser: Query items = \(URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? [])")
                    }
                    continuation.resume(throwing: AuthError.missingAuthCode)
                    return
                }

                print("[AUTH] Browser: Successfully extracted auth code (length: \(code.count))")
                continuation.resume(returning: code)
            }

            session.presentationContextProvider = WebAuthContextProvider.shared
            session.prefersEphemeralWebBrowserSession = false
            print("[AUTH] Browser: Starting session...")
            session.start()
        }
    }

    private struct TokenResponse: Codable {
        let access_token: String
        let id_token: String
        let refresh_token: String?
        let expires_in: Int
        let token_type: String
    }

    private struct Tokens {
        let accessToken: String
        let idToken: String
    }

    private func exchangeCodeForTokens(_ code: String, codeVerifier: String) async throws -> Tokens {
        let redirectURI = "com.googleusercontent.apps.341793197828-gii5rq2g1vf6kjr2fdthstivvol3kjic:/oauth2callback"
        print("[AUTH] Token exchange: redirect_uri = \(redirectURI)")
        print("[AUTH] Token exchange: client_id = \(iOSClientID)")
        print("[AUTH] Token exchange: code length = \(code.count)")
        print("[AUTH] Token exchange: code_verifier length = \(codeVerifier.count)")

        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "client_id": iOSClientID,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirectURI,
            "code_verifier": codeVerifier
        ]

        request.httpBody = body
            .map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.value)" }
            .joined(separator: "&")
            .data(using: .utf8)

        print("[AUTH] Token exchange: Making HTTP request...")
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            print("[AUTH] Token exchange: Response is not HTTPURLResponse")
            throw AuthError.tokenExchangeFailed
        }

        print("[AUTH] Token exchange: HTTP status = \(httpResponse.statusCode)")
        let responseBody = String(data: data, encoding: .utf8) ?? "Unable to decode response"
        print("[AUTH] Token exchange: Response body = \(responseBody)")

        guard httpResponse.statusCode == 200 else {
            print("[AUTH] Token exchange: FAILED with status \(httpResponse.statusCode)")
            throw AuthError.tokenExchangeFailed
        }

        let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data)
        print("[AUTH] Token exchange: Successfully decoded tokens")
        return Tokens(accessToken: tokenResponse.access_token, idToken: tokenResponse.id_token)
    }
    #endif

    public func signOut() throws {
        clearAuthState()
        stopSync()
        currentFirebaseUser = nil
        isAuthenticated = false
        userEmail = nil
        try? Auth.auth().signOut()
    }

    public enum AuthError: Error, LocalizedError {
        case noWindow
        case missingToken
        case missingClientID
        case invalidURL
        case missingAuthCode
        case tokenExchangeFailed

        public var errorDescription: String? {
            switch self {
            case .noWindow:
                return "No window available for sign-in"
            case .missingToken:
                return "Failed to get authentication token"
            case .missingClientID:
                return "Missing Google client ID in configuration"
            case .invalidURL:
                return "Failed to construct authentication URL"
            case .missingAuthCode:
                return "Failed to get authorization code from Google"
            case .tokenExchangeFailed:
                return "Failed to exchange authorization code for tokens"
            }
        }
    }

    // MARK: - Sync

    /// Start listening to Firestore changes
    public func startSync() async {
        guard isAuthenticated else { return }

        isSyncing = true
        syncError = nil

        // Initialize local cache
        do {
            try await LocalCache.shared.initialize()
        } catch {
            syncError = error
            isSyncing = false
            print("[FirebaseSync] Failed to initialize cache: \(error)")
            return
        }

        // Start notes listener
        print("[FirebaseSync] Starting notes listener...")
        let notesRef = Firestore.firestore().collection("notes")
        notesListener = notesRef.addSnapshotListener { [weak self] snapshot, error in
            Task { @MainActor in
                if let error {
                    self?.syncError = error
                    print("[FirebaseSync] Notes listener error: \(error)")
                    return
                }

                guard let snapshot else {
                    print("[FirebaseSync] Notes snapshot is nil")
                    return
                }

                print("[FirebaseSync] Notes snapshot received: \(snapshot.documents.count) documents, \(snapshot.documentChanges.count) changes")
                await self?.handleNotesSnapshot(snapshot)
            }
        }

        // Start songs listener
        print("[FirebaseSync] Starting songs listener...")
        let songsRef = Firestore.firestore().collection("songs")
        songsListener = songsRef.addSnapshotListener { [weak self] snapshot, error in
            Task { @MainActor in
                if let error {
                    self?.syncError = error
                    print("[FirebaseSync] Songs listener error: \(error)")
                    return
                }

                guard let snapshot else {
                    print("[FirebaseSync] Songs snapshot is nil")
                    return
                }

                print("[FirebaseSync] Songs snapshot received: \(snapshot.documents.count) documents, \(snapshot.documentChanges.count) changes")
                await self?.handleSongsSnapshot(snapshot)
            }
        }

        print("[FirebaseSync] Started sync listeners")
    }

    /// Stop listening to Firestore changes
    public func stopSync() {
        notesListener?.remove()
        songsListener?.remove()
        notesListener = nil
        songsListener = nil
        isSyncing = false
        print("[FirebaseSync] Stopped sync listeners")
    }

    private func handleNotesSnapshot(_ snapshot: QuerySnapshot) async {
        var addedCount = 0
        var modifiedCount = 0
        var removedCount = 0
        var skippedCount = 0

        for change in snapshot.documentChanges {
            let doc = change.document
            let id = doc.documentID

            // Skip special documents like _tagColors
            if id.hasPrefix("_") {
                skippedCount += 1
                continue
            }

            switch change.type {
            case .added:
                addedCount += 1
                if let note = parseNoteDocument(doc) {
                    do {
                        try await LocalCache.shared.upsertNote(note)
                    } catch {
                        print("[FirebaseSync] Failed to upsert note \(id): \(error)")
                    }
                } else {
                    print("[FirebaseSync] Failed to parse note: \(id)")
                }
            case .modified:
                modifiedCount += 1
                if let note = parseNoteDocument(doc) {
                    do {
                        try await LocalCache.shared.upsertNote(note)
                    } catch {
                        print("[FirebaseSync] Failed to upsert note \(id): \(error)")
                    }
                }
            case .removed:
                removedCount += 1
                do {
                    try await LocalCache.shared.deleteNote(id)
                } catch {
                    print("[FirebaseSync] Failed to delete note \(id): \(error)")
                }
            }
        }

        print("[FirebaseSync] Notes processed: \(addedCount) added, \(modifiedCount) modified, \(removedCount) removed, \(skippedCount) skipped")
        lastSyncTime = Date()
    }

    private func handleSongsSnapshot(_ snapshot: QuerySnapshot) async {
        var addedCount = 0
        var modifiedCount = 0
        var removedCount = 0
        var failedCount = 0

        for change in snapshot.documentChanges {
            let doc = change.document
            let id = doc.documentID

            switch change.type {
            case .added:
                addedCount += 1
                if let song = parseSongDocument(doc) {
                    do {
                        try await LocalCache.shared.upsertSong(song)
                    } catch {
                        print("[FirebaseSync] Failed to upsert song \(id): \(error)")
                        failedCount += 1
                    }
                } else {
                    print("[FirebaseSync] Failed to parse song: \(id)")
                    failedCount += 1
                }
            case .modified:
                modifiedCount += 1
                if let song = parseSongDocument(doc) {
                    do {
                        try await LocalCache.shared.upsertSong(song)
                    } catch {
                        print("[FirebaseSync] Failed to upsert song \(id): \(error)")
                        failedCount += 1
                    }
                } else {
                    print("[FirebaseSync] Failed to parse song: \(id)")
                    failedCount += 1
                }
            case .removed:
                removedCount += 1
                do {
                    try await LocalCache.shared.deleteSong(id)
                } catch {
                    print("[FirebaseSync] Failed to delete song \(id): \(error)")
                    failedCount += 1
                }
            }
        }

        print("[FirebaseSync] Songs processed: \(addedCount) added, \(modifiedCount) modified, \(removedCount) removed, \(failedCount) failed")
        lastSyncTime = Date()
    }

    // MARK: - Parsing

    private func parseNoteDocument(_ doc: QueryDocumentSnapshot) -> NoteItem? {
        let data = doc.data()
        let id = doc.documentID

        guard let typeStr = data["type"] as? String,
              let type = NoteType(rawValue: typeStr),
              let title = data["title"] as? String
        else {
            print("[FirebaseSync] Invalid note document: \(id)")
            return nil
        }

        let createdAt = (data["createdAt"] as? Timestamp)?.dateValue() ?? Date()
        let updatedAt = (data["updatedAt"] as? Timestamp)?.dateValue() ?? Date()

        // Parse tags
        var tags: [String]?
        if let tagsArray = data["tags"] as? [String] {
            tags = tagsArray
        }

        // Parse images (moodboard)
        var images: [MoodboardImage]?
        if let imagesArray = data["images"] as? [[String: Any]] {
            images = imagesArray.compactMap { parseImage($0) }
        }

        // Parse embedded media
        var embeddedMedia: [EmbeddedMedia]?
        if let mediaArray = data["embeddedMedia"] as? [[String: Any]] {
            embeddedMedia = mediaArray.compactMap { parseEmbeddedMedia($0) }
        }

        return NoteItem(
            id: id,
            type: type,
            title: title,
            parentId: data["parentId"] as? String,
            createdAt: createdAt,
            updatedAt: updatedAt,
            content: data["content"] as? String,
            date: data["date"] as? String,
            time: data["time"] as? String,
            tags: tags,
            embeddedMedia: embeddedMedia,
            images: images,
            gridSize: (data["gridSize"] as? String).flatMap { GridSize(rawValue: $0) },
            sortMode: (data["sortMode"] as? String).flatMap { SortMode(rawValue: $0) },
            musicSortColumn: (data["musicSortColumn"] as? String).flatMap { MusicSortColumn(rawValue: $0) },
            musicSortDirection: (data["musicSortDirection"] as? String).flatMap { SortDirection(rawValue: $0) },
            published: data["published"] as? Bool,
            slug: data["slug"] as? String,
            sortOrder: data["sortOrder"] as? Int
        )
    }

    private func parseImage(_ data: [String: Any]) -> MoodboardImage? {
        guard let id = data["id"] as? String,
              let url = data["url"] as? String,
              let width = data["width"] as? Int,
              let height = data["height"] as? Int
        else { return nil }

        return MoodboardImage(
            id: id,
            url: url,
            thumbnailUrl: data["thumbnailUrl"] as? String,
            caption: data["caption"] as? String,
            source: data["source"] as? String,
            width: width,
            height: height,
            fileSize: data["fileSize"] as? Int ?? 0,
            order: data["order"] as? Int ?? 0,
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? Date()
        )
    }

    private func parseEmbeddedMedia(_ data: [String: Any]) -> EmbeddedMedia? {
        guard let id = data["id"] as? String,
              let url = data["url"] as? String,
              let path = data["path"] as? String,
              let typeStr = data["type"] as? String,
              let type = MediaType(rawValue: typeStr)
        else { return nil }

        return EmbeddedMedia(
            id: id,
            url: url,
            path: path,
            type: type,
            filename: data["filename"] as? String,
            fileSize: data["fileSize"] as? Int ?? 0
        )
    }

    private func parseSongDocument(_ doc: QueryDocumentSnapshot) -> Song? {
        let data = doc.data()
        let id = doc.documentID

        // Check each required field and log which is missing
        guard let libraryId = data["libraryId"] as? String else {
            print("[FirebaseSync] Song \(id) missing libraryId")
            return nil
        }
        guard let title = data["title"] as? String else {
            print("[FirebaseSync] Song \(id) missing title")
            return nil
        }
        guard let artist = data["artist"] as? String else {
            print("[FirebaseSync] Song \(id) missing artist")
            return nil
        }
        guard let album = data["album"] as? String else {
            print("[FirebaseSync] Song \(id) missing album")
            return nil
        }
        guard let storageUrl = data["storageUrl"] as? String else {
            print("[FirebaseSync] Song \(id) missing storageUrl")
            return nil
        }
        guard let storagePath = data["storagePath"] as? String else {
            print("[FirebaseSync] Song \(id) missing storagePath")
            return nil
        }
        guard let fileName = data["fileName"] as? String else {
            print("[FirebaseSync] Song \(id) missing fileName")
            return nil
        }
        guard let fileType = data["fileType"] as? String else {
            print("[FirebaseSync] Song \(id) missing fileType")
            return nil
        }

        return Song(
            id: id,
            libraryId: libraryId,
            title: title,
            artist: artist,
            album: album,
            year: data["year"] as? Int,
            trackNumber: data["trackNumber"] as? Int,
            discNumber: data["discNumber"] as? Int,
            originalTrackNumber: data["originalTrackNumber"] as? Int,
            genre: data["genre"] as? String ?? "",
            duration: data["duration"] as? Double ?? 0,
            fileSize: data["fileSize"] as? Int ?? 0,
            albumArtUrl: data["albumArtUrl"] as? String,
            albumArtThumbUrl: data["albumArtThumbUrl"] as? String,
            storageUrl: storageUrl,
            storagePath: storagePath,
            fileName: fileName,
            fileType: fileType,
            dateAdded: (data["dateAdded"] as? Timestamp)?.dateValue() ?? Date(),
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? Date(),
            updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue() ?? Date()
        )
    }

    // MARK: - Write Operations

    // MARK: - Firestore REST API Constants
    private let firestoreProjectId = "marcs-blog-6b4e4"
    private var firestoreBaseUrl: String {
        "https://firestore.googleapis.com/v1/projects/\(firestoreProjectId)/databases/(default)/documents"
    }

    /// Create a new note using REST API (bypasses keychain issues)
    public func createNote(_ note: NoteItem) async throws {
        print("[WRITE] Creating note \(note.id) via REST API")

        guard let idToken = currentFirebaseUser?.idToken, !idToken.isEmpty else {
            print("[WRITE] ERROR: No Firebase ID token available")
            throw NSError(domain: "FirebaseSync", code: 401, userInfo: [NSLocalizedDescriptionKey: "Not authenticated"])
        }

        let url = URL(string: "\(firestoreBaseUrl)/notes/\(note.id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"  // PATCH creates or updates
        request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = noteToFirestoreRESTData(note)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        if httpResponse.statusCode != 200 {
            let errorBody = String(data: data, encoding: .utf8) ?? "unknown"
            print("[WRITE] REST API error: \(httpResponse.statusCode) - \(errorBody)")
            throw NSError(domain: "FirebaseSync", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Write failed: \(errorBody)"])
        }

        print("[WRITE] Note created successfully via REST API")
    }

    /// Update an existing note using REST API
    public func updateNote(_ note: NoteItem) async throws {
        print("[WRITE] Updating note \(note.id) via REST API")

        guard let idToken = currentFirebaseUser?.idToken, !idToken.isEmpty else {
            throw NSError(domain: "FirebaseSync", code: 401, userInfo: [NSLocalizedDescriptionKey: "Not authenticated"])
        }

        let url = URL(string: "\(firestoreBaseUrl)/notes/\(note.id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var noteWithUpdatedTime = note
        noteWithUpdatedTime.updatedAt = Date()
        let body = noteToFirestoreRESTData(noteWithUpdatedTime)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        if httpResponse.statusCode != 200 {
            let errorBody = String(data: data, encoding: .utf8) ?? "unknown"
            print("[WRITE] REST API error: \(httpResponse.statusCode) - \(errorBody)")
            throw NSError(domain: "FirebaseSync", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Update failed: \(errorBody)"])
        }

        print("[WRITE] Note updated successfully via REST API")
    }

    /// Delete a note using REST API
    public func deleteNote(_ id: String) async throws {
        print("[WRITE] Deleting note \(id) via REST API")

        guard let idToken = currentFirebaseUser?.idToken, !idToken.isEmpty else {
            throw NSError(domain: "FirebaseSync", code: 401, userInfo: [NSLocalizedDescriptionKey: "Not authenticated"])
        }

        let url = URL(string: "\(firestoreBaseUrl)/notes/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        if httpResponse.statusCode != 200 && httpResponse.statusCode != 204 {
            let errorBody = String(data: data, encoding: .utf8) ?? "unknown"
            print("[WRITE] REST API error: \(httpResponse.statusCode) - \(errorBody)")
            throw NSError(domain: "FirebaseSync", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Delete failed: \(errorBody)"])
        }

        print("[WRITE] Note deleted successfully via REST API")
    }

    /// Convert note to Firestore REST API format
    private func noteToFirestoreRESTData(_ note: NoteItem) -> [String: Any] {
        var fields: [String: Any] = [
            "type": ["stringValue": note.type.rawValue],
            "title": ["stringValue": note.title],
            "createdAt": ["timestampValue": ISO8601DateFormatter().string(from: note.createdAt)],
            "updatedAt": ["timestampValue": ISO8601DateFormatter().string(from: note.updatedAt)],
            "published": ["booleanValue": note.published ?? false]
        ]

        if let parentId = note.parentId {
            fields["parentId"] = ["stringValue": parentId]
        } else {
            fields["parentId"] = ["nullValue": NSNull()]
        }

        if let content = note.content { fields["content"] = ["stringValue": content] }
        if let date = note.date { fields["date"] = ["stringValue": date] }
        if let time = note.time { fields["time"] = ["stringValue": time] }
        if let slug = note.slug { fields["slug"] = ["stringValue": slug] }
        if let sortOrder = note.sortOrder { fields["sortOrder"] = ["integerValue": String(sortOrder)] }
        if let gridSize = note.gridSize { fields["gridSize"] = ["stringValue": gridSize.rawValue] }
        if let sortMode = note.sortMode { fields["sortMode"] = ["stringValue": sortMode.rawValue] }
        if let column = note.musicSortColumn { fields["musicSortColumn"] = ["stringValue": column.rawValue] }
        if let direction = note.musicSortDirection { fields["musicSortDirection"] = ["stringValue": direction.rawValue] }

        if let tags = note.tags {
            fields["tags"] = ["arrayValue": ["values": tags.map { ["stringValue": $0] }]]
        }

        // TODO: Add images and embeddedMedia support if needed

        return ["fields": fields]
    }

    private func noteToFirestoreData(_ note: NoteItem) -> [String: Any] {
        var data: [String: Any] = [
            "type": note.type.rawValue,
            "title": note.title,
            "createdAt": Timestamp(date: note.createdAt),
            "updatedAt": Timestamp(date: note.updatedAt),
            "published": note.published ?? false
        ]

        // Optional fields
        if let parentId = note.parentId {
            data["parentId"] = parentId
        } else {
            data["parentId"] = NSNull()
        }

        if let content = note.content { data["content"] = content }
        if let date = note.date { data["date"] = date }
        if let time = note.time { data["time"] = time }
        if let tags = note.tags { data["tags"] = tags }
        if let gridSize = note.gridSize { data["gridSize"] = gridSize.rawValue }
        if let sortMode = note.sortMode { data["sortMode"] = sortMode.rawValue }
        if let column = note.musicSortColumn { data["musicSortColumn"] = column.rawValue }
        if let direction = note.musicSortDirection { data["musicSortDirection"] = direction.rawValue }
        if let slug = note.slug { data["slug"] = slug }
        if let sortOrder = note.sortOrder { data["sortOrder"] = sortOrder }

        // Complex fields
        if let images = note.images {
            data["images"] = images.map { image in
                var imgData: [String: Any] = [
                    "id": image.id,
                    "url": image.url,
                    "width": image.width,
                    "height": image.height,
                    "fileSize": image.fileSize,
                    "order": image.order,
                    "createdAt": Timestamp(date: image.createdAt)
                ]
                if let thumbnailUrl = image.thumbnailUrl { imgData["thumbnailUrl"] = thumbnailUrl }
                if let caption = image.caption { imgData["caption"] = caption }
                if let source = image.source { imgData["source"] = source }
                return imgData
            }
        }

        if let embeddedMedia = note.embeddedMedia {
            data["embeddedMedia"] = embeddedMedia.map { media in
                var mediaData: [String: Any] = [
                    "id": media.id,
                    "url": media.url,
                    "path": media.path,
                    "type": media.type.rawValue,
                    "fileSize": media.fileSize
                ]
                if let filename = media.filename { mediaData["filename"] = filename }
                return mediaData
            }
        }

        return data
    }

    // MARK: - Signed URLs for Backblaze B2

    /// Get a signed URL for a Backblaze B2 file path
    /// - Parameter path: The file path (e.g., "images/abc123.jpg" or "/api/files/images/abc123.jpg")
    /// - Returns: A signed URL that can be used to download the file
    public func getSignedUrl(for path: String) async throws -> String {
        let normalizedPath = extractPathFromUrl(path)

        // Check cache first
        if let cached = signedUrlCache[normalizedPath],
           Date() < cached.expiresAt.addingTimeInterval(-signedUrlRefreshBuffer) {
            return cached.url
        }

        // Fetch new signed URL
        let urls = try await getSignedUrls(for: [normalizedPath])
        return urls[normalizedPath] ?? path
    }

    /// Get signed URLs for multiple Backblaze B2 file paths
    /// - Parameter paths: Array of file paths
    /// - Returns: Dictionary mapping original paths to signed URLs
    public func getSignedUrls(for paths: [String]) async throws -> [String: String] {
        guard !paths.isEmpty else { return [:] }

        let normalizedPaths = paths.map { extractPathFromUrl($0) }

        // Check which paths need fetching
        var result: [String: String] = [:]
        var pathsToFetch: [String] = []

        for path in normalizedPaths {
            if let cached = signedUrlCache[path],
               Date() < cached.expiresAt.addingTimeInterval(-signedUrlRefreshBuffer) {
                result[path] = cached.url
            } else {
                pathsToFetch.append(path)
            }
        }

        guard !pathsToFetch.isEmpty else { return result }

        // Use Firebase Functions SDK to call the callable function
        // This handles authentication properly via Firebase Auth
        let functions = Functions.functions()
        let callable = functions.httpsCallable("getSignedUrls")

        print("[SignedURL] Fetching signed URLs for \(pathsToFetch.count) paths via Firebase SDK")

        do {
            let callResult = try await callable.call(["paths": pathsToFetch])

            guard let data = callResult.data as? [String: Any],
                  let urls = data["urls"] as? [String: String],
                  let expiresAt = data["expiresAt"] as? Double else {
                print("[SignedURL] Failed to parse response: \(callResult.data)")
                throw NSError(domain: "FirebaseSync", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response format"])
            }

            let expiryDate = Date(timeIntervalSince1970: expiresAt / 1000)

            // Cache the results
            for (path, url) in urls {
                signedUrlCache[path] = (url: url, expiresAt: expiryDate)
                result[path] = url
            }

            print("[SignedURL] Cached \(urls.count) signed URLs, expires at \(expiryDate)")
            return result
        } catch {
            print("[SignedURL] Firebase Functions error: \(error)")
            throw error
        }
    }

    /// Extract the file path from various URL formats
    private func extractPathFromUrl(_ url: String) -> String {
        // Handle /api/files/ URLs
        if url.hasPrefix("/api/files/") {
            return String(url.dropFirst("/api/files/".count))
        }

        // Handle direct B2 URLs
        if let match = url.range(of: #"backblazeb2\.com/file/[^/]+/(.+)$"#, options: .regularExpression) {
            let pathStart = url.index(match.lowerBound, offsetBy: url[match].firstIndex(of: "/")!.utf16Offset(in: url[match]))
            // Extract the path after bucket name
            if let bucketEnd = url[match].range(of: "/", range: url.index(match.lowerBound, offsetBy: 20)..<match.upperBound) {
                return String(url[bucketEnd.upperBound..<match.upperBound])
            }
        }

        // Already a path
        return url
    }

    /// Clear the signed URL cache
    public func clearSignedUrlCache() {
        signedUrlCache.removeAll()
    }
}
