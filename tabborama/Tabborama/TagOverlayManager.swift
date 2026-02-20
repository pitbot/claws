import Cocoa

/// Manages all tag overlay windows: creation, destruction, repositioning, and colour editing.
class TagOverlayManager {
    private var overlays: [UUID: TagOverlayWindow] = [:]
    private let tagStore: TagStore
    private let colourPicker = ColourPickerController()

    init(tagStore: TagStore) {
        self.tagStore = tagStore

        // Recreate overlays for any existing tags
        for tag in tagStore.tags where tag.isValid {
            createOverlay(for: tag)
        }
    }

    /// Create and show an overlay window for a tag.
    func createOverlay(for tag: WindowTag) {
        // Get current window bounds to position the tag
        let position: NSPoint
        if let info = WindowEnumerator.windowInfo(for: tag.windowID) {
            let nsRect = CoordinateConverter.cgRectToNS(info.bounds)
            position = NSPoint(x: nsRect.origin.x + 6, y: nsRect.origin.y + nsRect.height + 2)
        } else {
            position = .zero
        }

        let overlay = TagOverlayWindow(tagID: tag.id, colour: tag.colour.nsColor, position: position)

        overlay.tagView.onRemove = { [weak self] tagID in
            self?.removeOverlay(for: tagID)
            self?.tagStore.removeTag(id: tagID)
        }

        overlay.tagView.onEditColour = { [weak self] tagID in
            guard let self = self,
                  let existingTag = self.tagStore.tags.first(where: { $0.id == tagID }) else { return }

            self.colourPicker.pickColour(initialColour: existingTag.colour.nsColor) { [weak self] newColour in
                guard let self = self, let newColour = newColour else { return }
                self.tagStore.updateColour(id: tagID, colour: newColour)
                self.overlays[tagID]?.updateColour(newColour)
            }
        }

        overlay.orderFront(nil)
        overlays[tag.id] = overlay
    }

    /// Remove and close an overlay.
    func removeOverlay(for tagID: UUID) {
        overlays[tagID]?.orderOut(nil)
        overlays.removeValue(forKey: tagID)
    }

    /// Update the position of a tag overlay based on current window bounds.
    func updatePosition(for tagID: UUID, windowBounds: CGRect) {
        overlays[tagID]?.updatePosition(for: windowBounds)
    }

    /// Hide a tag overlay (e.g., window minimized or off-screen).
    func hideOverlay(for tagID: UUID) {
        overlays[tagID]?.orderOut(nil)
    }

    /// Show a previously hidden overlay.
    func showOverlay(for tagID: UUID) {
        overlays[tagID]?.orderFront(nil)
    }

    /// Temporarily hide all overlays (used during window selection mode).
    func hideAllOverlays() {
        for overlay in overlays.values {
            overlay.orderOut(nil)
        }
    }

    /// Show all overlays again.
    func showAllOverlays() {
        for (tagID, overlay) in overlays {
            if let tag = tagStore.tags.first(where: { $0.id == tagID }), tag.isValid {
                overlay.orderFront(nil)
            }
        }
    }

    /// Update all overlay positions. Called periodically by WindowTracker.
    func updateAllPositions() {
        for tag in tagStore.tags {
            if let info = WindowEnumerator.windowInfo(for: tag.windowID), info.isOnScreen {
                updatePosition(for: tag.id, windowBounds: info.bounds)
                if overlays[tag.id]?.isVisible == false {
                    showOverlay(for: tag.id)
                }
                if !tag.isValid {
                    tagStore.revalidateTag(id: tag.id, windowID: tag.windowID)
                }
            } else {
                // Window not visible — hide the overlay
                if overlays[tag.id]?.isVisible == true {
                    hideOverlay(for: tag.id)
                }
            }
        }
    }
}
