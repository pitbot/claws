import Cocoa

/// Enumerates visible on-screen windows using the CGWindowList APIs.
class WindowEnumerator {
    /// Returns all visible, normal-layer windows on screen, excluding our own app's windows.
    static func visibleWindows() -> [CGWindowInfo] {
        let myPID = ProcessInfo.processInfo.processIdentifier

        guard let infoList = CGWindowListCopyWindowInfo(
            [.optionOnScreenOnly, .excludeDesktopElements],
            kCGNullWindowID
        ) as? [[String: Any]] else {
            return []
        }

        return infoList.compactMap { CGWindowInfo(from: $0) }
            .filter { info in
                info.layer == 0
                && info.isOnScreen
                && info.ownerPID != myPID
                && info.bounds.width > 50
                && info.bounds.height > 50
            }
    }

    /// Returns info for a specific window ID, or nil if it no longer exists.
    static func windowInfo(for windowID: CGWindowID) -> CGWindowInfo? {
        guard let infoList = CGWindowListCopyWindowInfo(
            [.optionIncludingWindow],
            windowID
        ) as? [[String: Any]] else {
            return nil
        }
        return infoList.compactMap { CGWindowInfo(from: $0) }.first
    }

    /// Find the topmost window at a given point (in CG coordinates, top-left origin).
    static func windowAtPoint(_ point: CGPoint) -> CGWindowInfo? {
        let windows = visibleWindows()
        // Windows are returned front-to-back, so first match is topmost.
        return windows.first { $0.bounds.contains(point) }
    }
}
