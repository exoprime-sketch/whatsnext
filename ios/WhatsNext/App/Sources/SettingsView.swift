import SwiftUI
import EventKit

struct SettingsView: View {
    @ObservedObject var vm: MVPAppViewModel
    @State private var showResetConfirm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Settings")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundStyle(Color.wnText)
                    .padding(.horizontal)
                    .padding(.top, 16)

                permissionsCard
                privacyCard
                dataCard
                versionCard
            }
            .padding(.bottom, 32)
        }
        .background(Color.wnBackground)
        .navigationBarHidden(true)
        .task { vm.permissionManager.refreshStatuses() }
        .confirmationDialog(
            "Reset all local data?",
            isPresented: $showResetConfirm,
            titleVisibility: .visible
        ) {
            Button("Reset", role: .destructive) {
                vm.candidates    = []
                vm.scheduleItems = []
                vm.showToast("Data cleared.")
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    // MARK: - Cards

    private var permissionsCard: some View {
        WNCard {
            VStack(alignment: .leading, spacing: 14) {
                Text("Permissions")
                    .font(.headline)
                    .foregroundStyle(Color.wnText)

                permissionRow(
                    label: "Calendar",
                    icon: "calendar",
                    granted: vm.permissionManager.hasCalendarAccess
                ) {
                    _Concurrency.Task { await vm.permissionManager.requestCalendarAccess() }
                }

                Divider()

                permissionRow(
                    label: "Reminders",
                    icon: "bell",
                    granted: vm.permissionManager.hasRemindersAccess
                ) {
                    _Concurrency.Task { await vm.permissionManager.requestRemindersAccess() }
                }
            }
        }
        .padding(.horizontal)
    }

    private var privacyCard: some View {
        WNCard {
            VStack(alignment: .leading, spacing: 8) {
                Text("Privacy")
                    .font(.headline)
                    .foregroundStyle(Color.wnText)
                Text("Everything stays on your device. No account. No server. Files are processed locally using Apple Vision and Speech frameworks.")
                    .font(.subheadline)
                    .foregroundStyle(Color.wnMuted)
            }
        }
        .padding(.horizontal)
    }

    private var dataCard: some View {
        WNCard {
            VStack(alignment: .leading, spacing: 12) {
                Text("Data")
                    .font(.headline)
                    .foregroundStyle(Color.wnText)
                Button("Reset local data") {
                    showResetConfirm = true
                }
                .font(.subheadline)
                .foregroundStyle(.red)
            }
        }
        .padding(.horizontal)
    }

    private var versionCard: some View {
        WNCard {
            HStack {
                Text("Version")
                    .foregroundStyle(Color.wnMuted)
                Spacer()
                Text("0.1 MVP")
                    .foregroundStyle(Color.wnMuted)
            }
            .font(.subheadline)
        }
        .padding(.horizontal)
    }

    // MARK: - Permission row

    @ViewBuilder
    private func permissionRow(
        label: String, icon: String, granted: Bool,
        onRequest: @escaping () -> Void
    ) -> some View {
        HStack {
            Label(label, systemImage: icon)
                .font(.subheadline)
                .foregroundStyle(Color.wnText)
            Spacer()
            if granted {
                Label("Granted", systemImage: "checkmark.circle.fill")
                    .font(.caption)
                    .foregroundStyle(.green)
            } else {
                Button("Grant access", action: onRequest)
                    .font(.caption)
                    .foregroundStyle(Color.wnAccent)
            }
        }
    }
}
