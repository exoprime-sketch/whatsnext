import SwiftUI

struct CalendarView: View {
    @ObservedObject var vm: MVPAppViewModel
    @State private var displayMonth = Date.now
    @State private var selectedDate: Date? = Date.now

    private let cal = Calendar.current
    private let columns = Array(repeating: GridItem(.flexible()), count: 7)
    private let dowLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Schedule")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundStyle(Color.wnText)
                    .padding(.horizontal)
                    .padding(.top, 16)

                monthGrid
                    .padding(.horizontal)

                if let date = selectedDate {
                    agendaSection(for: date)
                }
            }
            .padding(.bottom, 32)
        }
        .background(Color.wnBackground)
        .navigationBarHidden(true)
    }

    // MARK: - Month grid

    private var monthGrid: some View {
        WNCard {
            VStack(spacing: 12) {
                // Navigation row
                HStack {
                    Button { shiftMonth(-1) } label: {
                        Image(systemName: "chevron.left")
                            .foregroundStyle(Color.wnMuted)
                            .frame(width: 44, height: 44)
                    }
                    Spacer()
                    Text(displayMonth.formatted(.dateTime.month(.wide).year()))
                        .font(.headline)
                        .foregroundStyle(Color.wnText)
                    Spacer()
                    Button { shiftMonth(1) } label: {
                        Image(systemName: "chevron.right")
                            .foregroundStyle(Color.wnMuted)
                            .frame(width: 44, height: 44)
                    }
                }

                // Day-of-week headers
                LazyVGrid(columns: columns, spacing: 0) {
                    ForEach(dowLabels, id: \.self) { dow in
                        Text(dow)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(Color.wnMuted)
                            .frame(height: 28)
                    }
                }

                // Day cells
                LazyVGrid(columns: columns, spacing: 4) {
                    ForEach(Array(daysInMonth().enumerated()), id: \.offset) { _, date in
                        if let date {
                            DayCell(
                                date:       date,
                                isToday:    cal.isDateInToday(date),
                                isSelected: selectedDate.map { cal.isDate($0, inSameDayAs: date) } ?? false,
                                hasDot:     vm.hasItems(on: date)
                            )
                            .onTapGesture { selectedDate = date }
                        } else {
                            Color.clear.frame(height: 40)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Day agenda

    @ViewBuilder
    private func agendaSection(for date: Date) -> some View {
        let items = vm.items(on: date)
        VStack(alignment: .leading, spacing: 12) {
            Text(date.formatted(.dateTime.weekday(.wide).month().day()))
                .font(.headline)
                .foregroundStyle(Color.wnText)
                .padding(.horizontal)

            if items.isEmpty {
                WNCard {
                    Text("Nothing scheduled.")
                        .foregroundStyle(Color.wnMuted)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal)
            } else {
                ForEach(items) { item in
                    WNCard {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(item.title)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(Color.wnText)
                                Spacer()
                                Image(systemName: itemIcon(item.itemType))
                                    .foregroundStyle(Color.wnMuted)
                            }
                            if let start = item.startDate {
                                Label(start.formatted(.dateTime.hour().minute()), systemImage: "clock")
                                    .font(.caption)
                                    .foregroundStyle(Color.wnMuted)
                            }
                            if !item.location.isEmpty {
                                Label(item.location, systemImage: "mappin")
                                    .font(.caption)
                                    .foregroundStyle(Color.wnMuted)
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }

    // MARK: - Helpers

    private func shiftMonth(_ delta: Int) {
        displayMonth = cal.date(byAdding: .month, value: delta, to: displayMonth) ?? displayMonth
    }

    private func daysInMonth() -> [Date?] {
        guard let range    = cal.range(of: .day, in: .month, for: displayMonth),
              let firstDay = cal.date(from: cal.dateComponents([.year, .month], from: displayMonth))
        else { return [] }

        let leadingBlanks = cal.component(.weekday, from: firstDay) - 1
        var cells: [Date?] = Array(repeating: nil, count: leadingBlanks)
        for day in range {
            cells.append(cal.date(bySetting: .day, value: day, of: firstDay))
        }
        return cells
    }

    private func itemIcon(_ type: String) -> String {
        switch type {
        case "event":    return "calendar"
        case "reminder": return "bell"
        default:         return "checkmark.circle"
        }
    }
}

// MARK: - Day cell

private struct DayCell: View {
    let date:       Date
    let isToday:    Bool
    let isSelected: Bool
    let hasDot:     Bool

    var body: some View {
        VStack(spacing: 3) {
            Text(date.formatted(.dateTime.day()))
                .font(.subheadline.weight(isToday ? .bold : .regular))
                .foregroundStyle(isSelected ? .white : isToday ? Color.wnAccent : Color.wnText)
                .frame(width: 36, height: 36)
                .background(isSelected ? Color.wnAccent : Color.clear)
                .clipShape(Circle())

            Circle()
                .fill(hasDot
                    ? (isSelected ? Color.white : Color.wnAccent)
                    : Color.clear)
                .frame(width: 5, height: 5)
        }
    }
}
