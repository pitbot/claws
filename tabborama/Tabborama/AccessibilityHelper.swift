import Cocoa
import ApplicationServices

/// Helper for accessibility-related operations.
struct AccessibilityHelper {
    /// Check if the app is trusted for accessibility, optionally prompting the user.
    static func ensureTrusted(prompt: Bool = true) -> Bool {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue(): prompt] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }

    /// Raise a specific window to the front using AXUIElement APIs.
    static func raiseWindow(pid: pid_t, windowID: CGWindowID) {
        let appElement = AXUIElementCreateApplication(pid)

        // Activate the application first
        if let runningApp = NSRunningApplication(processIdentifier: pid) {
            runningApp.activate(options: [.activateIgnoringOtherApps])
        }

        // Get the app's windows via AX
        var windowsRef: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(appElement, kAXWindowsAttribute as CFString, &windowsRef)
        guard result == .success, let axWindows = windowsRef as? [AXUIElement] else { return }

        // Try to find the matching window by comparing position/size with CGWindowInfo
        if let targetInfo = WindowEnumerator.windowInfo(for: windowID) {
            for axWindow in axWindows {
                if windowMatchesCGInfo(axWindow, targetInfo) {
                    AXUIElementPerformAction(axWindow, kAXRaiseAction as CFString)
                    return
                }
            }
        }

        // Fallback: raise the first window
        if let firstWindow = axWindows.first {
            AXUIElementPerformAction(firstWindow, kAXRaiseAction as CFString)
        }
    }

    /// Match an AXUIElement window to CGWindowInfo by comparing position and size.
    private static func windowMatchesCGInfo(_ axWindow: AXUIElement, _ info: CGWindowInfo) -> Bool {
        var positionRef: CFTypeRef?
        var sizeRef: CFTypeRef?

        guard AXUIElementCopyAttributeValue(axWindow, kAXPositionAttribute as CFString, &positionRef) == .success,
              AXUIElementCopyAttributeValue(axWindow, kAXSizeAttribute as CFString, &sizeRef) == .success
        else {
            return false
        }

        var position = CGPoint.zero
        var size = CGSize.zero
        AXValueGetValue(positionRef as! AXValue, .cgPoint, &position)
        AXValueGetValue(sizeRef as! AXValue, .cgSize, &size)

        let tolerance: CGFloat = 5
        return abs(position.x - info.bounds.origin.x) < tolerance
            && abs(position.y - info.bounds.origin.y) < tolerance
            && abs(size.width - info.bounds.width) < tolerance
            && abs(size.height - info.bounds.height) < tolerance
    }
}
