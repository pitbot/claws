import Cocoa

/// Manages the menu bar status item and its dropdown menu.
class StatusBarController: NSObject, NSMenuDelegate {
    private var statusItem: NSStatusItem!
    private let tagStore: TagStore
    private let overlayManager: TagOverlayManager
    private var selectionController: WindowSelectionController!

    init(tagStore: TagStore, overlayManager: TagOverlayManager) {
        self.tagStore = tagStore
        self.overlayManager = overlayManager
        super.init()

        self.selectionController = WindowSelectionController(tagStore: tagStore, overlayManager: overlayManager)

        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "tag.fill", accessibilityDescription: "Tabborama")
            button.image?.size = NSSize(width: 18, height: 18)
            button.image?.isTemplate = true
        }

        let menu = NSMenu()
        menu.delegate = self
        statusItem.menu = menu
    }

    // MARK: - NSMenuDelegate

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()

        // Tag a Window
        let tagItem = NSMenuItem(title: "Tag a Window...", action: #selector(tagWindow), keyEquivalent: "t")
        tagItem.target = self
        menu.addItem(tagItem)

        menu.addItem(.separator())

        // Current tags
        let validTags = tagStore.tags.filter { $0.isValid }
        if validTags.isEmpty {
            let noTagsItem = NSMenuItem(title: "No Tags", action: nil, keyEquivalent: "")
            noTagsItem.isEnabled = false
            menu.addItem(noTagsItem)
        } else {
            let headerItem = NSMenuItem(title: "Tagged Windows:", action: nil, keyEquivalent: "")
            headerItem.isEnabled = false
            menu.addItem(headerItem)

            for tag in validTags {
                let item = NSMenuItem()
                item.attributedTitle = tagMenuTitle(for: tag)

                let submenu = NSMenu()

                let bringItem = NSMenuItem(title: "Bring to Front", action: #selector(bringToFront(_:)), keyEquivalent: "")
                bringItem.target = self
                bringItem.representedObject = tag
                submenu.addItem(bringItem)

                let editItem = NSMenuItem(title: "Edit Colour...", action: #selector(editColour(_:)), keyEquivalent: "")
                editItem.target = self
                editItem.representedObject = tag
                submenu.addItem(editItem)

                submenu.addItem(.separator())

                let removeItem = NSMenuItem(title: "Remove Tag", action: #selector(removeTag(_:)), keyEquivalent: "")
                removeItem.target = self
                removeItem.representedObject = tag
                submenu.addItem(removeItem)

                item.submenu = submenu
                menu.addItem(item)
            }
        }

        // Bring All to Front (grouped by colour)
        let groups = tagStore.tagsGroupedByColour()
        if !groups.isEmpty {
            menu.addItem(.separator())

            let groupHeader = NSMenuItem(title: "Bring All to Front:", action: nil, keyEquivalent: "")
            groupHeader.isEnabled = false
            menu.addItem(groupHeader)

            for group in groups {
                let colour = group.colour.nsColor
                let count = group.tags.count
                let title = "\(colour.readableName) (\(count) window\(count == 1 ? "" : "s"))"

                let item = NSMenuItem()
                item.attributedTitle = colourGroupTitle(colour: colour, text: title)
                item.target = self
                item.action = #selector(bringAllToFront(_:))
                item.representedObject = group.tags
                menu.addItem(item)
            }
        }

        menu.addItem(.separator())

        // Quit
        let quitItem = NSMenuItem(title: "Quit Tabborama", action: #selector(quit), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)
    }

    // MARK: - Menu Actions

    @objc private func tagWindow() {
        selectionController.beginSelection()
    }

    @objc private func bringToFront(_ sender: NSMenuItem) {
        guard let tag = sender.representedObject as? WindowTag else { return }
        AccessibilityHelper.raiseWindow(pid: tag.ownerPID, windowID: tag.windowID)
    }

    @objc private func editColour(_ sender: NSMenuItem) {
        guard let tag = sender.representedObject as? WindowTag else { return }
        let picker = ColourPickerController()
        picker.pickColour(initialColour: tag.colour.nsColor) { [weak self] newColour in
            guard let self = self, let newColour = newColour else { return }
            self.tagStore.updateColour(id: tag.id, colour: newColour)
            self.overlayManager.removeOverlay(for: tag.id)
            if var updatedTag = self.tagStore.tags.first(where: { $0.id == tag.id }) {
                updatedTag.colour = CodableColor(newColour)
                self.overlayManager.createOverlay(for: updatedTag)
            }
        }
    }

    @objc private func removeTag(_ sender: NSMenuItem) {
        guard let tag = sender.representedObject as? WindowTag else { return }
        overlayManager.removeOverlay(for: tag.id)
        tagStore.removeTag(id: tag.id)
    }

    @objc private func bringAllToFront(_ sender: NSMenuItem) {
        guard let tags = sender.representedObject as? [WindowTag] else { return }
        for tag in tags {
            AccessibilityHelper.raiseWindow(pid: tag.ownerPID, windowID: tag.windowID)
        }
    }

    @objc private func quit() {
        tagStore.save()
        NSApp.terminate(nil)
    }

    // MARK: - Helpers

    private func tagMenuTitle(for tag: WindowTag) -> NSAttributedString {
        let str = NSMutableAttributedString()

        // Colour dot
        let dot = colourDot(tag.colour.nsColor)
        str.append(dot)

        // Window name
        str.append(NSAttributedString(string: " \(tag.displayName)", attributes: [
            .font: NSFont.menuFont(ofSize: 13)
        ]))

        return str
    }

    private func colourGroupTitle(colour: NSColor, text: String) -> NSAttributedString {
        let str = NSMutableAttributedString()
        str.append(colourDot(colour))
        str.append(NSAttributedString(string: " \(text)", attributes: [
            .font: NSFont.menuFont(ofSize: 13)
        ]))
        return str
    }

    private func colourDot(_ colour: NSColor) -> NSAttributedString {
        let attachment = NSTextAttachment()
        let size = NSSize(width: 12, height: 12)
        let image = NSImage(size: size, flipped: false) { rect in
            colour.setFill()
            NSBezierPath(ovalIn: rect.insetBy(dx: 1, dy: 1)).fill()
            NSColor.black.withAlphaComponent(0.2).setStroke()
            NSBezierPath(ovalIn: rect.insetBy(dx: 1, dy: 1)).stroke()
            return true
        }
        attachment.image = image
        attachment.bounds = NSRect(origin: CGPoint(x: 0, y: -1.5), size: size)
        return NSAttributedString(attachment: attachment)
    }
}
