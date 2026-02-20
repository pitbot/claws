import Cocoa

/// Periodically polls window positions and updates tag overlays to follow their target windows.
class WindowTracker {
    private var timer: DispatchSourceTimer?
    private let tagStore: TagStore
    private let overlayManager: TagOverlayManager

    /// Tracking interval in seconds (5 Hz).
    private let interval: TimeInterval = 0.2

    init(tagStore: TagStore, overlayManager: TagOverlayManager) {
        self.tagStore = tagStore
        self.overlayManager = overlayManager
    }

    func startTracking() {
        guard timer == nil else { return }

        let timer = DispatchSource.makeTimerSource(queue: .main)
        timer.schedule(deadline: .now(), repeating: interval)
        timer.setEventHandler { [weak self] in
            self?.tick()
        }
        timer.resume()
        self.timer = timer
    }

    func stopTracking() {
        timer?.cancel()
        timer = nil
    }

    private func tick() {
        overlayManager.updateAllPositions()
    }
}
