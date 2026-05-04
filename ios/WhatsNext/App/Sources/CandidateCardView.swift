import SwiftUI

// Reusable card for a single ExtractedCandidate.
// Used both in InboxView and ReviewCandidatesSheet.
struct CandidateCardView: View {
    @Binding var candidate: ExtractedCandidate

    var body: some View {
        WNCard {
            VStack(alignment: .leading, spacing: 12) {
                // Top row: type badge + review badge + toggle
                HStack(spacing: 8) {
                    TypeBadge(itemType: candidate.itemType)
                    if !candidate.isReady {
                        ReviewBadge(label: candidate.reviewGroup)
                    }
                    Spacer()
                    Toggle("", isOn: $candidate.selected)
                        .labelsHidden()
                        .tint(Color.wnAccent)
                }

                // Title
                Text(candidate.title.isEmpty ? "(no title)" : candidate.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.wnText)

                // Date / Time chips
                if !candidate.dateText.isEmpty || !candidate.timeText.isEmpty {
                    HStack(spacing: 8) {
                        if !candidate.dateText.isEmpty {
                            Label(candidate.dateText, systemImage: "calendar")
                                .font(.caption).foregroundStyle(Color.wnMuted)
                        }
                        if !candidate.timeText.isEmpty {
                            Label(candidate.timeText, systemImage: "clock")
                                .font(.caption).foregroundStyle(Color.wnMuted)
                        }
                    }
                }

                // Location
                if !candidate.location.isEmpty {
                    Label(candidate.location, systemImage: "mappin")
                        .font(.caption)
                        .foregroundStyle(Color.wnMuted)
                }

                // Alarm picker
                HStack {
                    Text("Alarm")
                        .font(.caption)
                        .foregroundStyle(Color.wnMuted)
                    Picker("Alarm", selection: $candidate.alarmOption) {
                        ForEach(AlarmOption.allCases) { opt in
                            Text(opt.label).tag(opt)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(Color.wnAccent)
                    .font(.caption)
                }

                // Target picker
                VStack(alignment: .leading, spacing: 6) {
                    Text("Save to")
                        .font(.caption)
                        .foregroundStyle(Color.wnMuted)
                    HStack(spacing: 8) {
                        ForEach(CandidateTarget.allCases) { target in
                            TargetChip(
                                target:   target,
                                selected: candidate.target == target
                            ) {
                                candidate.target = target
                            }
                        }
                    }
                }

                // Original text disclosure
                if !candidate.originalText.isEmpty {
                    DisclosureGroup {
                        Text(candidate.originalText)
                            .font(.caption)
                            .foregroundStyle(Color.wnMuted)
                            .padding(.top, 4)
                    } label: {
                        Text("Original text")
                            .font(.caption)
                            .foregroundStyle(Color.wnMuted)
                    }
                }
            }
        }
    }
}
