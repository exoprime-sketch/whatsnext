import SwiftUI

struct ImportView: View {
    @ObservedObject var vm: MVPAppViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Hero
                VStack(alignment: .leading, spacing: 6) {
                    Text("Drop a file.")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(Color.wnText)
                    Text("Get your schedule organized.")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(Color.wnText)
                    Text("Upload meeting notes, screenshots, or recordings. We'll find the follow-ups.")
                        .font(.subheadline)
                        .foregroundStyle(Color.wnMuted)
                        .padding(.top, 4)
                }
                .padding(.horizontal)
                .padding(.top, 16)

                // Import cards  2×2 grid
                LazyVGrid(
                    columns: [GridItem(.flexible()), GridItem(.flexible())],
                    spacing: 12
                ) {
                    NavigationLink {
                        ScreenshotImportView(vm: vm)
                    } label: {
                        ImportCard(source: .screenshot, enabled: true)
                    }

                    NavigationLink {
                        FileImportView(vm: vm)
                    } label: {
                        ImportCard(source: .meetingFile, enabled: true)
                    }

                    // Recording: scaffolded, not yet functional
                    ImportCard(source: .recording, enabled: false)

                    NavigationLink {
                        TextImportView(vm: vm)
                    } label: {
                        ImportCard(source: .text, enabled: true)
                    }
                }
                .padding(.horizontal)

                // Schedule summary
                WNCard {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Your schedule")
                                .font(.headline)
                                .foregroundStyle(Color.wnText)
                            Text("\(vm.scheduleItems.count) item\(vm.scheduleItems.count == 1 ? "" : "s") saved")
                                .font(.caption)
                                .foregroundStyle(Color.wnMuted)
                        }
                        Spacer()
                        Button("View today") {
                            vm.selectedTab = .today
                        }
                        .buttonStyle(WNSecondaryButtonStyle())
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 32)
            }
        }
        .background(Color.wnBackground)
        .navigationBarHidden(true)
    }
}

// MARK: - Import card tile

private struct ImportCard: View {
    let source:  ImportSourceType
    let enabled: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: source.systemImage)
                .font(.title2)
                .foregroundStyle(enabled ? Color.wnAccent : Color.wnMuted)

            Text(source.label)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(enabled ? Color.wnText : Color.wnMuted)

            Text(hint)
                .font(.caption)
                .foregroundStyle(Color.wnMuted)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.wnSurface)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .opacity(enabled ? 1.0 : 0.5)
    }

    private var hint: String {
        switch source {
        case .screenshot: "png · jpg · webp"
        case .meetingFile: ".txt · .md"
        case .recording:  "Not available in this version"
        case .text:       "Paste or type"
        }
    }
}
