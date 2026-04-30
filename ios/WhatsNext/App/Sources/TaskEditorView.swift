import SwiftUI

struct TaskEditorView: View {
    let title: String
    let description: String
    let submitLabel: String
    let onSubmit: (TaskDraft) -> Void
    var onCancel: (() -> Void)?

    @State private var draft: TaskDraft

    init(
        title: String,
        description: String,
        submitLabel: String,
        initialDraft: TaskDraft = TaskDraft(),
        onSubmit: @escaping (TaskDraft) -> Void,
        onCancel: (() -> Void)? = nil
    ) {
        self.title = title
        self.description = description
        self.submitLabel = submitLabel
        self.onSubmit = onSubmit
        self.onCancel = onCancel
        _draft = State(initialValue: initialDraft)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(title)
                                .font(.title3.weight(.semibold))
                            Text(description)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        if let onCancel {
                            Button("닫기", action: onCancel)
                                .font(.subheadline.weight(.medium))
                        }
                    }
                }

                Group {
                    labeledField("할 일 제목") {
                        TextField("예: 팀장님께 회의자료 보내기", text: $draft.title)
                            .textInputAutocapitalization(.never)
                    }

                    labeledField("메모") {
                        TextEditor(text: $draft.memo)
                            .frame(minHeight: 96)
                            .padding(8)
                            .background(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .fill(Color(uiColor: .secondarySystemBackground))
                            )
                    }

                    labeledField("예상 소요시간") {
                        chipWrap(TaskDraft.durationOptions.map(String.init), selection: String(draft.durationMinutes)) { value in
                            draft.durationMinutes = Int(value) ?? 15
                        } labelTransform: { "\($0)분" }
                    }

                    labeledField("중요도") {
                        chipWrap(Importance.allCases.map(\.rawValue), selection: draft.importance.rawValue) { value in
                            draft.importance = Importance(rawValue: value) ?? .medium
                        } labelTransform: { Importance(rawValue: $0)?.label ?? $0 }
                    }

                    labeledField("마감") {
                        chipWrap(DueBucket.allCases.map(\.rawValue), selection: draft.due.rawValue) { value in
                            draft.due = DueBucket(rawValue: value) ?? .none
                        } labelTransform: { DueBucket(rawValue: $0)?.label ?? $0 }
                    }

                    labeledField("선호 시간대") {
                        chipWrap(PreferredTime.allCases.map(\.rawValue), selection: draft.preferredTime.rawValue) { value in
                            draft.preferredTime = PreferredTime(rawValue: value) ?? .anytime
                        } labelTransform: { PreferredTime(rawValue: $0)?.label ?? $0 }
                    }
                }

                Button {
                    let clean = TaskDraft(
                        title: draft.trimmedTitle,
                        memo: draft.trimmedMemo,
                        durationMinutes: draft.durationMinutes,
                        importance: draft.importance,
                        due: draft.due,
                        preferredTime: draft.preferredTime
                    )
                    guard !clean.trimmedTitle.isEmpty else { return }
                    onSubmit(clean)
                    draft = TaskDraft()
                } label: {
                    Text(submitLabel)
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .fill(draft.trimmedTitle.isEmpty ? Color.gray.opacity(0.2) : Color(red: 0.20, green: 0.15, blue: 0.11))
                        )
                        .foregroundColor(draft.trimmedTitle.isEmpty ? Color.secondary : Color.white)
                }
                .disabled(draft.trimmedTitle.isEmpty)

                Text("제목만 입력해도 저장됩니다. 나머지는 기본값으로 추천에 반영합니다.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding(20)
        }
        .background(Color(uiColor: .systemGroupedBackground))
    }

    @ViewBuilder
    private func labeledField<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
            content()
        }
    }

    @ViewBuilder
    private func chipWrap(
        _ values: [String],
        selection: String,
        onSelect: @escaping (String) -> Void,
        labelTransform: @escaping (String) -> String
    ) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 74), spacing: 10)], spacing: 10) {
            ForEach(values, id: \.self) { value in
                Button {
                    onSelect(value)
                } label: {
                    Text(labelTransform(value))
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(selection == value ? Color(red: 0.20, green: 0.15, blue: 0.11) : Color(uiColor: .secondarySystemBackground))
                        )
                        .foregroundStyle(selection == value ? .white : .primary)
                }
            }
        }
    }
}
