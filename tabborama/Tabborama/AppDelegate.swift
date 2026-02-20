import Cocoa

/// Main application delegate. Wires together all components and manages the app lifecycle.
class AppDelegate: NSObject, NSApplicationDelegate {
    private var tagStore: TagStore!
    private var overlayManager: TagOverlayManager!
    private var windowTracker: WindowTracker!
    private var statusBarController: StatusBarController!

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Prompt for accessibility access (required for raising windows)
        if !AccessibilityHelper.ensureTrusted(prompt: true) {
            // Show a reminder — the app still works for tagging, but "Bring to Front" needs accessibility.
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                let alert = NSAlert()
                alert.messageText = "Accessibility Access Recommended"
                alert.informativeText = "Tabborama needs Accessibility access to bring tagged windows to the front. Please enable it in System Settings > Privacy & Security > Accessibility."
                alert.alertStyle = .informational
                alert.addButton(withTitle: "OK")
                alert.runModal()
            }
        }

        // Initialize core components
        tagStore = TagStore()
        overlayManager = TagOverlayManager(tagStore: tagStore)
        windowTracker = WindowTracker(tagStore: tagStore, overlayManager: overlayManager)
        statusBarController = StatusBarController(tagStore: tagStore, overlayManager: overlayManager)

        // Start tracking window positions
        windowTracker.startTracking()
    }

    func applicationWillTerminate(_ notification: Notification) {
        windowTracker.stopTracking()
        tagStore.save()
    }
}
