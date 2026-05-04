import SwiftUI

struct InboxView: View {
    @ObservedObject var vm: MVPAppViewModel

    private let groups = ["Ready", "Needs date", "Needs time", "Low confidence"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    Text("Inbox")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundStyle(Color.wnText)
                    if !vm.candidates.isEmpty {
                        Text("\(vm.candidates.count) item\(vm.candidates.count == 1 ? "" : "s") waiting for review")
                            .font(.subheadline)
                            .foregroundStyle(Color.wnMuted)
                    }
                }
                .padding(.horizontal)
                .padding(.top, 16)

                if vm.candidates.isEmpty {
                    emptyState
                } else {
                    // Save bar
                    saveBar

                    // Grouped candidates
                    ForEach(groups, id: \.self) { group in
                        let items = vm.candidates.filter { $0.reviewGroup == group }
                        if !items.isEmpty {
                            groupSection(label: group, indices: indicesFor(group))
                        }
                    }
                }
            }
            .padding(.bottom, 32)
        }
        .background(Color.wnBackground)
        .navigationBarHidden(true)
        .sheet(isPresented: $vm.showReviewSheet) {
            ReviewCandidatesSheet(vm: vm)
        }
    }

    // MARK: - Sub-views

    private var emptyState: some View {
        WNCard {
            VStack(spacing: 16) {
                Image(systemName: "tray")
                    .font(.system(size: 40))
                    .foregroundStyle(Color.wnMuted)
                Text("Nothing to review yet.")
                    .font(.headline)
                    .foregroundStyle(Color.wnMuted)
                Button("Go to Import") {
                    vm.selectedTab = .importTab
                }
                .buttonStyle(WNSecondaryButtonStyle())
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
        }
        .padding(.horizontal)
    }

    private var saveBar: some View {
        WNCard {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    let selected = vm.candidates.filter { $0.selected }.count
                    Text("\(selected) ready to save")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.wnText)
                    Text(summaryLine)
                        .font(.caption)
                        .foregroundStyle(Color.wnMuted)
                }
                Spacer()
                Button {
                    Swift.Task { await vm.saveSelected() }
                } label: {
                    Text("Save selected")
                }
                .buttonStyle(WNPrimaryButtonStyle())
                .frame(maxWidth: 140)
            }
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private func groupSection(label: String, indices: [Int]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(label)
                    .font(.headline)
                    .foregroundStyle(Color.wnText)
                Text("· \(indices.count)")
                    .font(.subheadline)
                    .foregroundStyle(Color.wnMuted)
            }
            .padding(.horizontal)

            ForEach(indices, id: \.self) { idx in
                CandidateCardView(candidate: $vm.candidates[idx])
                    .padding(.horizontal)
            }
        }
    }

    // MARK: - Helpers

    private func indicesFor(_ group: String) -> [Int] {
        vm.candidates.indices.filter { vm.candidates[$0].reviewGroup == group }
    }

    private var summaryLine: String {
        let ready  = vm.candidates.filter { $0.isReady }.count
        let review = vm.candidates.filter { !$0.isReady }.count
        var parts: [String] = []
        if ready  > 0 { parts.append("\(ready) calendar-ready") }
        if review > 0 { parts.append("\(review) need review") }
        return parts.joined(separator: " · ")
    }
}
