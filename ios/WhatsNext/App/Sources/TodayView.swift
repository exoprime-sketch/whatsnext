import SwiftUI

struct TodayView: View {
    @ObservedObject var vm: MVPAppViewModel

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMMM d"
        return f
    }()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                heroHeader
                if let next = vm.todayItems.first { nextCard(next) }
                if !vm.todayItems.isEmpty { agendaSection }
                importCTA
            }
            .padding(.top, 16)
            .padding(.bottom, 32)
        }
        .background(Color.wnBackground)
        .navigationBarHidden(true)
    }

    // MARK: - Sections

    private var heroHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(Self.dateFormatter.string(from: Date.now).uppercased())
                .font(.caption.weight(.bold)).kerning(1)
                .foregroundStyle(Color.wnAccent)

            Text("Today")
                .font(.system(size: 36, weight: .bold))
                .foregroundStyle(Color.wnText)

            if vm.needsReviewCount > 0 {
                Label(
                    "\(vm.needsReviewCount) item\(vm.needsReviewCount == 1 ? "" : "s") need review",
                    systemImage: "exclamationmark.circle"
                )
                .font(.subheadline)
                .foregroundStyle(.orange)
                .onTapGesture { vm.selectedTab = .inbox }
            }
        }
        .padding(.horizontal)
    }

    private func nextCard(_ item: ScheduleItem) -> some View {
        WNCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("NEXT")
                    .font(.caption.weight(.bold)).kerning(1)
                    .foregroundStyle(Color.wnAccent)

                Text(item.title)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(Color.wnText)

                if let start = item.startDate {
                    Label(
                        start.formatted(.dateTime.hour().minute()),
                        systemImage: "clock"
                    )
                    .font(.subheadline)
                    .foregroundStyle(Color.wnMuted)
                }

                if !item.location.isEmpty {
                    Label(item.location, systemImage: "mappin")
                        .font(.subheadline)
                        .foregroundStyle(Color.wnMuted)
                }

                HStack(spacing: 10) {
                    Button("Done") {}
                        .buttonStyle(WNPrimaryButtonStyle())
                    Button("Later") {}
                        .buttonStyle(WNSecondaryButtonStyle())
                }
            }
        }
        .padding(.horizontal)
    }

    private var agendaSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            WNSectionHeader(title: "Today's schedule")

            ForEach(vm.todayItems) { item in
                WNCard {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Color.wnText)
                            if let start = item.startDate {
                                Text(start.formatted(.dateTime.hour().minute()))
                                    .font(.caption)
                                    .foregroundStyle(Color.wnMuted)
                            }
                            if !item.location.isEmpty {
                                Label(item.location, systemImage: "mappin")
                                    .font(.caption)
                                    .foregroundStyle(Color.wnMuted)
                            }
                        }
                        Spacer()
                        Image(systemName: itemIcon(item.itemType))
                            .foregroundStyle(Color.wnMuted)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    private var importCTA: some View {
        Button {
            vm.selectedTab = .importTab
        } label: {
            Label("Import notes or screenshot", systemImage: "square.and.arrow.down")
        }
        .buttonStyle(WNSecondaryButtonStyle())
        .padding(.horizontal)
        .padding(.bottom, 8)
    }

    // MARK: - Helper

    private func itemIcon(_ type: String) -> String {
        switch type {
        case "event":    return "calendar"
        case "reminder": return "bell"
        default:         return "checkmark.circle"
        }
    }
}
