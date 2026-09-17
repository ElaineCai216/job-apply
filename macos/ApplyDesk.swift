import Cocoa
import WebKit
import UserNotifications

final class ApplyDeskSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root = Bundle.main.resourceURL!.appendingPathComponent("public", isDirectory: true)

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else { return }
        let path = requestURL.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let relativePath = path.isEmpty ? "index.html" : path
        let fileURL = root.appendingPathComponent(relativePath).standardizedFileURL
        guard fileURL.path.hasPrefix(root.path),
              let data = try? Data(contentsOf: fileURL) else {
            urlSchemeTask.didFailWithError(NSError(domain: "ApplyDesk", code: 404))
            return
        }
        let ext = fileURL.pathExtension.lowercased()
        let mime = ["html": "text/html", "js": "text/javascript", "css": "text/css", "json": "application/json", "webmanifest": "application/manifest+json", "svg": "image/svg+xml", "png": "image/png", "pdf": "application/pdf"][ext] ?? "application/octet-stream"
        let response = URLResponse(url: requestURL, mimeType: mime, expectedContentLength: data.count, textEncodingName: mime.hasPrefix("text/") ? "utf-8" : nil)
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

final class ApplyDeskDelegate: NSObject, NSApplicationDelegate, WKUIDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private let schemeHandler = ApplyDeskSchemeHandler()

    func applicationDidFinishLaunching(_ notification: Notification) {
        scheduleDailyReminder()
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: "applydesk")
        let view = WKWebView(frame: .zero, configuration: configuration)
        webView = view
        view.uiDelegate = self
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

        view.load(URLRequest(url: URL(string: "applydesk://local/index.html")!))
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = navigationAction.request.url else { return nil }
        if url.scheme == "https" || url.scheme == "http" { NSWorkspace.shared.open(url) }
        return nil
    }

    private func scheduleDailyReminder() {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
            guard granted else { return }
            let content = UNMutableNotificationContent()
            content.title = "Apply Desk"
            content.body = "每日岗位已更新，打开查看真实新增数。"
            content.sound = .default
            var components = DateComponents()
            components.hour = 8
            components.minute = 5
            let request = UNNotificationRequest(identifier: "apply-desk-daily-discovery", content: content, trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: true))
            center.add(request)
        }
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        guard let callback = urls.first(where: { $0.scheme == "applydesk" }) else { return }
        var parts = URLComponents(url: URL(string: "applydesk://local/index.html")!, resolvingAgainstBaseURL: false)!
        parts.query = callback.query
        parts.fragment = callback.fragment
        if let url = parts.url { webView.load(URLRequest(url: url)) }
    }
}

let app = NSApplication.shared
let delegate = ApplyDeskDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
