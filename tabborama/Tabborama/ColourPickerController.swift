import Cocoa

/// Manages colour selection for tags, offering both a preset palette and the system colour picker.
class ColourPickerController {
    /// Preset palette colours.
    static let presetColours: [NSColor] = [
        .systemRed,
        .systemOrange,
        .systemYellow,
        .systemGreen,
        .systemTeal,
        .systemBlue,
        .systemPurple,
        .systemPink,
        .white,
        .systemGray,
    ]

    /// Show a colour palette menu near the mouse cursor and call completion with the chosen colour.
    func pickColour(relativeTo view: NSView? = nil, initialColour: NSColor? = nil, completion: @escaping (NSColor?) -> Void) {
        let menu = NSMenu(title: "Pick Colour")

        for colour in Self.presetColours {
            let item = NSMenuItem()
            item.attributedTitle = attributedTitle(for: colour)
            item.representedObject = ColourAction(colour: colour, completion: completion)
            item.target = self
            item.action = #selector(colourSelected(_:))
            menu.addItem(item)
        }

        menu.addItem(.separator())

        let customItem = NSMenuItem(title: "Custom Colour...", action: #selector(customColourSelected(_:)), keyEquivalent: "")
        customItem.representedObject = ColourAction(colour: initialColour ?? .systemBlue, completion: completion)
        customItem.target = self
        menu.addItem(customItem)

        // Keep a strong reference to self while the menu is open
        objc_setAssociatedObject(menu, "controller", self, .OBJC_ASSOCIATION_RETAIN)

        if let view = view {
            menu.popUp(positioning: nil, at: .zero, in: view)
        } else {
            let mouseLocation = NSEvent.mouseLocation
            menu.popUp(positioning: nil, at: mouseLocation, in: nil)
        }
    }

    private func attributedTitle(for colour: NSColor) -> NSAttributedString {
        let circle = NSTextAttachment()
        let size = NSSize(width: 14, height: 14)
        let image = NSImage(size: size, flipped: false) { rect in
            colour.setFill()
            NSBezierPath(ovalIn: rect.insetBy(dx: 1, dy: 1)).fill()
            NSColor.black.withAlphaComponent(0.3).setStroke()
            NSBezierPath(ovalIn: rect.insetBy(dx: 1, dy: 1)).stroke()
            return true
        }
        circle.image = image
        circle.bounds = NSRect(origin: CGPoint(x: 0, y: -2), size: size)

        let str = NSMutableAttributedString(attachment: circle)
        let colourName = " " + colour.readableName
        str.append(NSAttributedString(string: colourName, attributes: [
            .font: NSFont.menuFont(ofSize: 13)
        ]))
        return str
    }

    @objc private func colourSelected(_ sender: NSMenuItem) {
        guard let action = sender.representedObject as? ColourAction else { return }
        action.completion(action.colour)
    }

    @objc private func customColourSelected(_ sender: NSMenuItem) {
        guard let action = sender.representedObject as? ColourAction else { return }
        let panel = NSColorPanel.shared
        panel.color = action.colour
        panel.setTarget(self)
        panel.setAction(#selector(colorPanelChanged(_:)))
        panel.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // Store completion for the panel
        objc_setAssociatedObject(panel, "completion", action.completion as Any, .OBJC_ASSOCIATION_RETAIN)
        objc_setAssociatedObject(panel, "controller", self, .OBJC_ASSOCIATION_RETAIN)
    }

    @objc private func colorPanelChanged(_ sender: NSColorPanel) {
        if let completion = objc_getAssociatedObject(sender, "completion") as? (NSColor?) -> Void {
            completion(sender.color)
        }
    }
}

/// Wraps a colour + completion for use as NSMenuItem representedObject.
private class ColourAction {
    let colour: NSColor
    let completion: (NSColor?) -> Void

    init(colour: NSColor, completion: @escaping (NSColor?) -> Void) {
        self.colour = colour
        self.completion = completion
    }
}

extension NSColor {
    /// Human-readable colour name.
    var readableName: String {
        switch self {
        case .systemRed: return "Red"
        case .systemOrange: return "Orange"
        case .systemYellow: return "Yellow"
        case .systemGreen: return "Green"
        case .systemTeal: return "Teal"
        case .systemBlue: return "Blue"
        case .systemPurple: return "Purple"
        case .systemPink: return "Pink"
        case .white: return "White"
        case .systemGray: return "Gray"
        default:
            let c = self.usingColorSpace(.sRGB) ?? self
            return String(format: "#%02X%02X%02X",
                          Int(c.redComponent * 255),
                          Int(c.greenComponent * 255),
                          Int(c.blueComponent * 255))
        }
    }
}
