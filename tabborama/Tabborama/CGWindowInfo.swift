import Cocoa

/// Typed wrapper around the dictionary returned by CGWindowListCopyWindowInfo.
struct CGWindowInfo {
    let windowID: CGWindowID
    let ownerPID: pid_t
    let ownerName: String
    let windowTitle: String?
    let bounds: CGRect
    let layer: Int
    let isOnScreen: Bool

    init?(from dict: [String: Any]) {
        guard let windowNumber = dict[kCGWindowNumber as String] as? Int,
              let pid = dict[kCGWindowOwnerPID as String] as? Int,
              let name = dict[kCGWindowOwnerName as String] as? String,
              let boundsDict = dict[kCGWindowBounds as String] as? [String: Any],
              let layerValue = dict[kCGWindowLayer as String] as? Int
        else {
            return nil
        }

        self.windowID = CGWindowID(windowNumber)
        self.ownerPID = pid_t(pid)
        self.ownerName = name
        self.windowTitle = dict[kCGWindowName as String] as? String
        self.layer = layerValue
        self.isOnScreen = (dict[kCGWindowIsOnscreen as String] as? Bool) ?? false

        guard let rect = CGRect(dictionaryRepresentation: boundsDict as CFDictionary) else {
            return nil
        }
        self.bounds = rect
    }

    /// Human-readable display name for this window.
    var displayName: String {
        if let title = windowTitle, !title.isEmpty {
            return "\(ownerName) - \(title)"
        }
        return ownerName
    }
}
