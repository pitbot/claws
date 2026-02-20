import Cocoa

/// Notification posted when tags change.
extension Notification.Name {
    static let tagsDidChange = Notification.Name("tagsDidChange")
}

/// In-memory store for all window tags, with JSON file persistence.
class TagStore {
    private(set) var tags: [WindowTag] = []

    private var savePath: URL {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = appSupport.appendingPathComponent("Tabborama", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("tags.json")
    }

    init() {
        load()
    }

    func addTag(_ tag: WindowTag) {
        // Remove any existing tag on the same window
        tags.removeAll { $0.windowID == tag.windowID }
        tags.append(tag)
        save()
        notifyChange()
    }

    func removeTag(id: UUID) {
        tags.removeAll { $0.id == id }
        save()
        notifyChange()
    }

    func updateColour(id: UUID, colour: NSColor) {
        guard let idx = tags.firstIndex(where: { $0.id == id }) else { return }
        tags[idx].colour = CodableColor(colour)
        save()
        notifyChange()
    }

    func invalidateTag(id: UUID) {
        guard let idx = tags.firstIndex(where: { $0.id == id }) else { return }
        tags[idx].isValid = false
        notifyChange()
    }

    func revalidateTag(id: UUID, windowID: UInt32) {
        guard let idx = tags.firstIndex(where: { $0.id == id }) else { return }
        tags[idx].isValid = true
        tags[idx].windowID = windowID
    }

    /// Group valid tags by colour for the "Bring All to Front" menu.
    func tagsGroupedByColour() -> [(colour: CodableColor, tags: [WindowTag])] {
        var groups: [(colour: CodableColor, tags: [WindowTag])] = []
        for tag in tags where tag.isValid {
            if let idx = groups.firstIndex(where: { $0.colour.isSimilar(to: tag.colour) }) {
                groups[idx].tags.append(tag)
            } else {
                groups.append((colour: tag.colour, tags: [tag]))
            }
        }
        return groups
    }

    // MARK: - Persistence

    func save() {
        do {
            let data = try JSONEncoder().encode(tags)
            try data.write(to: savePath, options: .atomic)
        } catch {
            print("TagStore: Failed to save: \(error)")
        }
    }

    func load() {
        guard FileManager.default.fileExists(atPath: savePath.path) else { return }
        do {
            let data = try Data(contentsOf: savePath)
            tags = try JSONDecoder().decode([WindowTag].self, from: data)
        } catch {
            print("TagStore: Failed to load: \(error)")
        }
    }

    private func notifyChange() {
        NotificationCenter.default.post(name: .tagsDidChange, object: self)
    }
}
