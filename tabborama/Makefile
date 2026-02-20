# Tabborama - macOS Window Tagger
# Build with: make
# Run with: make run
# Clean with: make clean

APP_NAME = Tabborama
BUILD_DIR = build
APP_BUNDLE = $(BUILD_DIR)/$(APP_NAME).app
CONTENTS = $(APP_BUNDLE)/Contents
MACOS_DIR = $(CONTENTS)/MacOS
RESOURCES = $(CONTENTS)/Resources

SWIFT_FILES = $(wildcard Tabborama/*.swift)
FRAMEWORKS = -framework Cocoa -framework ApplicationServices

# Detect SDK path
SDKROOT := $(shell xcrun --sdk macosx --show-sdk-path 2>/dev/null)

SWIFTC = swiftc
SWIFTC_FLAGS = -O -target arm64-apple-macos13 -sdk $(SDKROOT) $(FRAMEWORKS)

.PHONY: all clean run debug

all: $(APP_BUNDLE)

$(APP_BUNDLE): $(SWIFT_FILES) Tabborama/Info.plist
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(MACOS_DIR) $(RESOURCES)
	$(SWIFTC) $(SWIFTC_FLAGS) $(SWIFT_FILES) -o $(MACOS_DIR)/$(APP_NAME)
	@cp Tabborama/Info.plist $(CONTENTS)/Info.plist
	@echo "Build complete: $(APP_BUNDLE)"

debug: SWIFTC_FLAGS = -g -Onone -target arm64-apple-macos13 -sdk $(SDKROOT) $(FRAMEWORKS)
debug: $(APP_BUNDLE)

run: $(APP_BUNDLE)
	@open $(APP_BUNDLE)

clean:
	@rm -rf $(BUILD_DIR)
	@echo "Clean complete."
