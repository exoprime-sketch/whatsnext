import SwiftUI

@main
struct WhatsNextApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var viewModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            RootView(viewModel: viewModel)
                .onOpenURL { viewModel.handleDeepLink($0) }
        }
        .onChange(of: scenePhase) { _, newValue in
            if newValue == .active {
                viewModel.refreshForForeground()
            }
        }
    }
}
