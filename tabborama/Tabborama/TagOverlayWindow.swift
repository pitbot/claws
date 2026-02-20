import Cocoa

/// A small borderless window that displays a single coloured tag above a target window.
class TagOverlayWindow: NSWindow {
    static let tagSize = NSSize(width: 16, height: 16)

    let tagID: UUID
    let tagView: TagOverlayView

    init(tagID: UUID, colour: NSColor, position: NSPoint) {
        self.tagID = tagID
        self.tagView = TagOverlayView(colour: colour, tagID: tagID)

        super.init(
            contentRect: NSRect(origin: position, size: Self.tagSize),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )

        self.isOpaque = false
        self.backgroundColor = .clear
        self.level = .floating
        self.ignoresMouseEvents = false
        self.hasShadow = false
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        self.isMovableByWindowBackground = false

        tagView.frame = NSRect(origin: .zero, size: Self.tagSize)
        self.contentView = tagView
    }

    /// Update the tag position to sit at the top-left of the given CG window bounds.
    func updatePosition(for windowBounds: CGRect) {
        let nsRect = CoordinateConverter.cgRectToNS(windowBounds)
        let tagPos = NSPoint(
            x: nsRect.origin.x + 6,
            y: nsRect.origin.y + nsRect.height + 2
        )
        self.setFrameOrigin(tagPos)
    }

    func updateColour(_ colour: NSColor) {
        tagView.colour = colour
    }
}
