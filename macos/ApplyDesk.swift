import Cocoa
import WebKit

final class ApplyDeskDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!

    func applicationDidFinishLaunching(_ notification: Notification) {
        let view = WKWebView(frame: .zero)
        view.setValue(false, forKey: "drawsBackground")
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1320, height: 860),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Apply Desk"
        window.minSize = NSSize(width: 960, height: 640)
        window.center()
        window.contentView = view
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        guard let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "public"),
              let root = Bundle.main.url(forResource: "public", withExtension: nil) else {
            fatalError("Bundled Apply Desk web assets are missing.")
        }
        view.loadFileURL(index, allowingReadAccessTo: root)
    }
}

let app = NSApplication.shared
let delegate = ApplyDeskDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
