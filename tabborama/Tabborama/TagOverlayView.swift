import Cocoa

/// View that renders a single coloured tag circle, with right-click context menu.
class TagOverlayView: NSView {
    var colour: NSColor {
        didSet { needsDisplay = true }
    }
    var tagID: UUID
    var onRemove: ((UUID) -> Void)?
    var onEditColour: ((UUID) -> Void)?

    init(colour: NSColor, tagID: UUID) {
        self.colour = colour
        self.tagID = tagID
        super.init(frame: .zero)
        self.wantsLayer = true

        // Tracking area for tooltip / hover
        let options: NSTrackingArea.Options = [.activeAlways, .mouseEnteredAndExited, .inVisibleRect]
        let trackingArea = NSTrackingArea(rect: .zero, options: options, owner: self, userInfo: nil)
        addTrackingArea(trackingArea)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) not implemented")
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)

        let inset = bounds.insetBy(dx: 1, dy: 1)

        // Shadow
        let shadow = NSShadow()
        shadow.shadowColor = NSColor.black.withAlphaComponent(0.4)
        shadow.shadowOffset = NSSize(width: 0, height: -1)
        shadow.shadowBlurRadius = 2
        shadow.set()

        // Filled circle
        colour.setFill()
        let circle = NSBezierPath(ovalIn: inset)
        circle.fill()

        // Border
        NSShadow().set() // reset shadow
        NSColor.white.withAlphaComponent(0.8).setStroke()
        let borderPath = NSBezierPath(ovalIn: inset.insetBy(dx: 0.5, dy: 0.5))
        borderPath.lineWidth = 1.5
        borderPath.stroke()
    }

    override func rightMouseDown(with event: NSEvent) {
        let menu = NSMenu()

        let editItem = NSMenuItem(title: "Edit Colour...", action: #selector(editColourAction), keyEquivalent: "")
        editItem.target = self
        menu.addItem(editItem)

        menu.addItem(.separator())

        let removeItem = NSMenuItem(title: "Remove Tag", action: #selector(removeAction), keyEquivalent: "")
        removeItem.target = self
        menu.addItem(removeItem)

        NSMenu.popUpContextMenu(menu, with: event, for: self)
    }

    override func mouseDown(with event: NSEvent) {
        // Allow dragging the tag? For now, just consume the event.
    }

    @objc private func editColourAction() {
        onEditColour?(tagID)
    }

    @objc private func removeAction() {
        onRemove?(tagID)
    }
}
