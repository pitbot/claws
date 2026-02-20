import Cocoa

/// Converts between CoreGraphics (top-left origin) and AppKit (bottom-left origin) coordinate systems.
struct CoordinateConverter {
    /// Height of the primary (main) screen.
    private static var primaryScreenHeight: CGFloat {
        NSScreen.screens.first?.frame.height ?? 0
    }

    /// Convert a CGRect (CG top-left origin) to NSRect (AppKit bottom-left origin).
    static func cgRectToNS(_ rect: CGRect) -> NSRect {
        let y = primaryScreenHeight - rect.origin.y - rect.height
        return NSRect(x: rect.origin.x, y: y, width: rect.width, height: rect.height)
    }

    /// Convert an NSRect (AppKit bottom-left origin) to CGRect (CG top-left origin).
    static func nsRectToCG(_ rect: NSRect) -> CGRect {
        let y = primaryScreenHeight - rect.origin.y - rect.height
        return CGRect(x: rect.origin.x, y: y, width: rect.width, height: rect.height)
    }

    /// Convert an NSPoint (AppKit) to CGPoint (CG).
    static func nsPointToCG(_ point: NSPoint) -> CGPoint {
        return CGPoint(x: point.x, y: primaryScreenHeight - point.y)
    }

    /// Convert a CGPoint (CG) to NSPoint (AppKit).
    static func cgPointToNS(_ point: CGPoint) -> NSPoint {
        return NSPoint(x: point.x, y: primaryScreenHeight - point.y)
    }
}
