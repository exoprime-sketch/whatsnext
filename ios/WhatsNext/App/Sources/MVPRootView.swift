import SwiftUI

struct MVPRootView: View {
    @StateObject private var vm = MVPAppViewModel()

    var body: some View {
        ZStack {
            TabView(selection: $vm.selectedTab) {

                NavigationStack { TodayView(vm: vm) }
                    .tabItem { Label(MVPTab.today.label,     systemImage: MVPTab.today.systemImage) }
                    .tag(MVPTab.today)

                NavigationStack { CalendarView(vm: vm) }
                    .tabItem { Label(MVPTab.calendar.label,  systemImage: MVPTab.calendar.systemImage) }
                    .tag(MVPTab.calendar)

                NavigationStack { ImportView(vm: vm) }
                    .tabItem { Label(MVPTab.importTab.label, systemImage: MVPTab.importTab.systemImage) }
                    .tag(MVPTab.importTab)

                NavigationStack { InboxView(vm: vm) }
                    .tabItem { Label(MVPTab.inbox.label,     systemImage: MVPTab.inbox.systemImage) }
                    .tag(MVPTab.inbox)

                NavigationStack { SettingsView(vm: vm) }
                    .tabItem { Label(MVPTab.settings.label,  systemImage: MVPTab.settings.systemImage) }
                    .tag(MVPTab.settings)
            }
            .tint(Color.wnAccent)

            // Toast overlay
            if let message = vm.toastMessage {
                VStack {
                    Spacer()
                    Text(message)
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .background(Color.wnText.opacity(0.9))
                        .foregroundStyle(.white)
                        .font(.subheadline)
                        .clipShape(Capsule())
                        .padding(.bottom, 90)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .animation(.spring(response: 0.3), value: vm.toastMessage)
                .allowsHitTesting(false)
            }
        }
        .sheet(isPresented: $vm.showReviewSheet) {
            ReviewCandidatesSheet(vm: vm)
        }
    }
}
