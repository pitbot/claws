import Cocoa

/// Delegate for window selection events.
protocol WindowSelectionDelegate: AnyObject {
    func windowSelected(_ windowInfo: CGWindowInfo)
    func windowSelectionCancelled()
}

/// Full-screen transparent overlay that shows outlines of all windows and lets the user click one.
class WindowSelectionOverlay: NSWindow {
    weak var selectionDelegate: WindowSelectionDelegate?
    private let selectionView: WindowSelectionView

    init(screen: NSScreen, windows: [CGWindowInfo]) {
        self.selectionView = WindowSelectionView(windows: windows)

        super.init(
            contentRect: screen.frame,
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )

        self.isOpaque = false
        self.backgroundColor = NSColor.black.withAlphaComponent(0.2)
        self.level = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.overlayWindow)))
        self.ignoresMouseEvents = false
        self.hasShadow = false
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        self.acceptsMouseMovedEvents = true

        selectionView.frame = NSRect(origin: .zero, size: screen.frame.size)
        selectionView.onWindowClicked = { [weak self] info in
            self?.selectionDelegate?.windowSelected(info)
        }
        selectionView.onCancelled = { [weak self] in
            self?.selectionDelegate?.windowSelectionCancelled()
        }

        self.contentView = selectionView

        // Convert CG bounds to local view coordinates for this screen
        selectionView.screenOrigin = screen.frame.origin
    }

    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

/// View that draws window outlines and handles mouse interaction.
class WindowSelectionView: NSView {
    let windows: [CGWindowInfo]
    var screenOrigin: NSPoint = .zero
    var highlightedIndex: Int? = nil
    var onWindowClicked: ((CGWindowInfo) -> Void)?
    var onCancelled: (() -> Void)?

    /// Window rects in this view's coordinate space.
    private var windowRects: [(rect: NSRect, info: CGWindowInfo)] = []

    init(windows: [CGWindowInfo]) {
        self.windows = windows
        super.init(frame: .zero)
        self.wantsLayer = true

        // Add tracking area for mouse movement
        let options: NSTrackingArea.Options = [.activeAlways, .mouseMoved, .mouseEnteredAndExited, .inVisibleRect]
        let trackingArea = NSTrackingArea(rect: .zero, options: options, owner: self, userInfo: nil)
        addTrackingArea(trackingArea)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) not implemented")
    }

    override var acceptsFirstResponder: Bool { true }

    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        computeWindowRects()
        window?.makeFirstResponder(self)
    }

    private func computeWindowRects() {
        windowRects = windows.map { info in
            let nsRect = CoordinateConverter.cgRectToNS(info.bounds)
            // Convert from screen coordinates to view coordinates
            let localRect = NSRect(
                x: nsRect.origin.x - screenOrigin.x,
                y: nsRect.origin.y - screenOrigin.y,
                width: nsRect.width,
                height: nsRect.height
            )
            return (rect: localRect, info: info)
        }
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)

        for (index, entry) in windowRects.enumerated() {
            let rect = entry.rect
            let isHighlighted = (index == highlightedIndex)

            if isHighlighted {
                // Highlighted window: bright outline and subtle fill
                NSColor.systemBlue.withAlphaComponent(0.15).setFill()
                NSBezierPath(roundedRect: rect, xRadius: 4, yRadius: 4).fill()

                NSColor.systemBlue.setStroke()
                let path = NSBezierPath(roundedRect: rect.insetBy(dx: 1, dy: 1), xRadius: 4, yRadius: 4)
                path.lineWidth = 3
                path.stroke()

                // Draw window name label
                let name = entry.info.displayName
                let attrs: [NSAttributedString.Key: Any] = [
                    .font: NSFont.systemFont(ofSize: 14, weight: .semibold),
                    .foregroundColor: NSColor.white,
                    .backgroundColor: NSColor.black.withAlphaComponent(0.7)
                ]
                let size = (name as NSString).size(withAttributes: attrs)
                let labelRect = NSRect(
                    x: rect.midX - size.width / 2 - 6,
                    y: rect.midY - size.height / 2 - 3,
                    width: size.width + 12,
                    height: size.height + 6
                )
                NSColor.black.withAlphaComponent(0.75).setFill()
                NSBezierPath(roundedRect: labelRect, xRadius: 6, yRadius: 6).fill()
                (name as NSString).draw(
                    at: NSPoint(x: labelRect.origin.x + 6, y: labelRect.origin.y + 3),
                    withAttributes: attrs
                )
            } else {
                // Non-highlighted: subtle outline
                NSColor.white.withAlphaComponent(0.4).setStroke()
                let path = NSBezierPath(roundedRect: rect.insetBy(dx: 0.5, dy: 0.5), xRadius: 4, yRadius: 4)
                path.lineWidth = 1.5
                path.stroke()
            }
        }

        // Draw instruction text at top of screen
        let instruction = "Click a window to tag it. Press Escape to cancel."
        let attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 16, weight: .medium),
            .foregroundColor: NSColor.white
        ]
        let size = (instruction as NSString).size(withAttributes: attrs)
        let textRect = NSRect(
            x: bounds.midX - size.width / 2 - 12,
            y: bounds.height - size.height - 50,
            width: size.width + 24,
            height: size.height + 12
        )
        NSColor.black.withAlphaComponent(0.8).setFill()
        NSBezierPath(roundedRect: textRect, xRadius: 8, yRadius: 8).fill()
        (instruction as NSString).draw(
            at: NSPoint(x: textRect.origin.x + 12, y: textRect.origin.y + 6),
            withAttributes: attrs
        )
    }

    override func mouseMoved(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        let previousHighlight = highlightedIndex

        highlightedIndex = nil
        // Search back-to-front; last drawn is visually on top
        for (index, entry) in windowRects.enumerated().reversed() {
            if entry.rect.contains(point) {
                highlightedIndex = index
                break
            }
        }

        if highlightedIndex != previousHighlight {
            needsDisplay = true
        }
    }

    override func mouseDown(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)

        // Find clicked window (front-to-back)
        for entry in windowRects.reversed() {
            if entry.rect.contains(point) {
                onWindowClicked?(entry.info)
                return
            }
        }

        // Clicked empty space — cancel
        onCancelled?()
    }

    override func keyDown(with event: NSEvent) {
        if event.keyCode == 53 { // Escape
            onCancelled?()
        } else {
            super.keyDown(with: event)
        }
    }
}
