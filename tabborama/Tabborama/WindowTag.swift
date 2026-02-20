import Cocoa

/// A colour wrapper that supports Codable for persistence.
struct CodableColor: Codable, Equatable {
    let red: CGFloat
    let green: CGFloat
    let blue: CGFloat
    let alpha: CGFloat

    init(_ color: NSColor) {
        let c = color.usingColorSpace(.sRGB) ?? color
        self.red = c.redComponent
        self.green = c.greenComponent
        self.blue = c.blueComponent
        self.alpha = c.alphaComponent
    }

    var nsColor: NSColor {
        NSColor(sRGBRed: red, green: green, blue: blue, alpha: alpha)
    }

    /// Check if two colours are visually similar (for grouping).
    func isSimilar(to other: CodableColor, tolerance: CGFloat = 0.05) -> Bool {
        return abs(red - other.red) < tolerance
            && abs(green - other.green) < tolerance
            && abs(blue - other.blue) < tolerance
    }
}

/// Represents a colour tag attached to a window.
struct WindowTag: Codable, Identifiable {
    let id: UUID
    var windowID: UInt32
    var ownerPID: Int32
    var ownerName: String
    var windowTitle: String?
    var colour: CodableColor
    var isValid: Bool

    init(windowInfo: CGWindowInfo, colour: NSColor) {
        self.id = UUID()
        self.windowID = windowInfo.windowID
        self.ownerPID = windowInfo.ownerPID
        self.ownerName = windowInfo.ownerName
        self.windowTitle = windowInfo.windowTitle
        self.colour = CodableColor(colour)
        self.isValid = true
    }

    var displayName: String {
        if let title = windowTitle, !title.isEmpty {
            return "\(ownerName) - \(title)"
        }
        return ownerName
    }
}
