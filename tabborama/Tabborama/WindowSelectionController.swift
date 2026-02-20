import Cocoa

/// Orchestrates the window selection flow: shows overlays, handles selection, then triggers tag creation.
class WindowSelectionController: WindowSelectionDelegate {
    private var overlays: [WindowSelectionOverlay] = []
    private let tagStore: TagStore
    private let overlayManager: TagOverlayManager
    private let colourPicker = ColourPickerController()

    init(tagStore: TagStore, overlayManager: TagOverlayManager) {
        self.tagStore = tagStore
        self.overlayManager = overlayManager
    }

    /// Begin window selection mode: dim the screen and outline all windows.
    func beginSelection() {
        let windows = WindowEnumerator.visibleWindows()
        guard !windows.isEmpty else {
            let alert = NSAlert()
            alert.messageText = "No Windows Found"
            alert.informativeText = "There are no visible windows to tag."
            alert.alertStyle = .informational
            alert.runModal()
            return
        }

        // Hide any existing tag overlays temporarily so they don't interfere
        overlayManager.hideAllOverlays()

        // Create a selection overlay for each screen
        for screen in NSScreen.screens {
            let overlay = WindowSelectionOverlay(screen: screen, windows: windows)
            overlay.selectionDelegate = self
            overlay.orderFrontRegardless()
            overlay.makeKeyAndOrderFront(nil)
            overlays.append(overlay)
        }

        NSApp.activate(ignoringOtherApps: true)
    }

    /// Dismiss all selection overlays.
    private func dismissOverlays() {
        for overlay in overlays {
            overlay.orderOut(nil)
        }
        overlays.removeAll()
        overlayManager.showAllOverlays()
    }

    // MARK: - WindowSelectionDelegate

    func windowSelected(_ windowInfo: CGWindowInfo) {
        dismissOverlays()

        // Show colour picker
        colourPicker.pickColour(initialColour: .systemBlue) { [weak self] colour in
            guard let self = self, let colour = colour else { return }
            let tag = WindowTag(windowInfo: windowInfo, colour: colour)
            self.tagStore.addTag(tag)
            self.overlayManager.createOverlay(for: tag)
        }
    }

    func windowSelectionCancelled() {
        dismissOverlays()
    }
}
