import SwiftUI

@main
struct WhatsNextApp: App {
    @Environment(\.scenePhase) private var scenePhase

    // Legacy view model kept for RootView (existing code, not deleted)
    @StateObject private var legacyViewModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            // MVP native product flow — Today/Calendar/Import/Inbox/Settings
            MVPRootView()
        }
        .onChange(of: scenePhase) { _, newValue in
            if newValue == .active {
                legacyViewModel.refreshForForeground()
            }
        }
    }
}
