import SwiftUI

struct TextImportView: View {
    @ObservedObject var vm: MVPAppViewModel
    @State private var text = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Paste text")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Color.wnText)
                    Text("Meeting notes, a message, or a list of follow-ups.")
                        .font(.subheadline)
                        .foregroundStyle(Color.wnMuted)
                }
                .padding(.horizontal)

                WNCard {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Meeting notes, message, or plan")
                            .font(.caption)
                            .foregroundStyle(Color.wnMuted)
                        TextEditor(text: $text)
                            .frame(minHeight: 160)
                            .font(.subheadline)
                            .foregroundStyle(Color.wnText)
                            .scrollContentBackground(.hidden)
                    }
                }
                .padding(.horizontal)

                HStack(spacing: 10) {
                    Button {
                        vm.extractCandidates(from: text, source: .text)
                    } label: {
                        Text("Extract")
                    }
                    .buttonStyle(WNPrimaryButtonStyle())
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    Button {
                        text = sampleText
                        vm.extractCandidates(from: sampleText, source: .text)
                    } label: {
                        Text("Try sample")
                    }
                    .buttonStyle(WNSecondaryButtonStyle())
                }
                .padding(.horizontal)

                Text("Only what you paste. Processed on-device. No account.")
                    .font(.caption)
                    .foregroundStyle(Color.wnMuted)
                    .padding(.horizontal)
                    .padding(.bottom, 32)
            }
            .padding(.top, 16)
        }
        .background(Color.wnBackground)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }

    private let sampleText = """
    Meeting notes: Q2 planning sync
    - Follow up with Sarah about budget approval by Friday
    - Schedule design review for next Tuesday at 2pm
    - Dinner with Mina on Saturday at 7 PM near Gangnam Station
    - Call Alex tomorrow at 3 PM to confirm the schedule
    """
}
