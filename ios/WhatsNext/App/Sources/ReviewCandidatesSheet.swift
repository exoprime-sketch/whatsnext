import SwiftUI

struct ReviewCandidatesSheet: View {
    @ObservedObject var vm: MVPAppViewModel
    @Environment(\.dismiss) private var dismiss

    private var selectedCount: Int { vm.candidates.filter { $0.selected }.count }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Sub-header
                    VStack(alignment: .leading, spacing: 4) {
                        Text("We found \(vm.candidates.count) follow-up\(vm.candidates.count == 1 ? "" : "s").")
                            .font(.subheadline)
                            .foregroundStyle(Color.wnMuted)
                        Text("Select the ones to save, adjust alarms and targets.")
                            .font(.caption)
                            .foregroundStyle(Color.wnMuted)
                    }
                    .padding(.horizontal)

                    // Candidate cards
                    ForEach($vm.candidates) { $candidate in
                        CandidateCardView(candidate: $candidate)
                            .padding(.horizontal)
                    }

                    // Bottom spacer so content clears the toolbar
                    Spacer(minLength: 40)
                }
                .padding(.top, 12)
            }
            .background(Color.wnBackground)
            .navigationTitle("Review before saving")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Review later") { dismiss() }
                        .foregroundStyle(Color.wnMuted)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await vm.saveSelected() }
                    } label: {
                        Text("Save \(selectedCount > 0 ? "\(selectedCount)" : "")")
                            .fontWeight(.semibold)
                    }
                    .foregroundStyle(Color.wnAccent)
                    .disabled(selectedCount == 0)
                }
            }
        }
    }
}
