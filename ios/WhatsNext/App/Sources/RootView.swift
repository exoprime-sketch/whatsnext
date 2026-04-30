import SwiftUI

private let koreanDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "ko_KR")
    formatter.dateFormat = "M월 d일 EEEE"
    return formatter
}()

private let koreanTimeFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "ko_KR")
    formatter.dateFormat = "a h:mm"
    return formatter
}()

struct RootView: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        TabView(selection: $viewModel.selectedTab) {
            NavigationStack {
                TodayScreen(viewModel: viewModel)
            }
            .tabItem { Label(AppTab.today.label, systemImage: AppTab.today.systemImage) }
            .tag(AppTab.today)

            NavigationStack {
                AddTaskScreen(viewModel: viewModel)
            }
            .tabItem { Label(AppTab.add.label, systemImage: AppTab.add.systemImage) }
            .tag(AppTab.add)

            NavigationStack {
                TaskListScreen(viewModel: viewModel)
            }
            .tabItem { Label(AppTab.list.label, systemImage: AppTab.list.systemImage) }
            .tag(AppTab.list)

            NavigationStack {
                CaptureScreen(viewModel: viewModel)
            }
            .tabItem { Label(AppTab.capture.label, systemImage: AppTab.capture.systemImage) }
            .tag(AppTab.capture)

            NavigationStack {
                SettingsScreen(viewModel: viewModel)
            }
            .tabItem { Label(AppTab.settings.label, systemImage: AppTab.settings.systemImage) }
            .tag(AppTab.settings)
        }
        .tint(Color(red: 0.20, green: 0.15, blue: 0.11))
        .sheet(item: $viewModel.editingTask) { task in
            NavigationStack {
                TaskEditorView(
                    title: "할 일 수정",
                    description: "지금 흐름에 맞게 빠르게 손볼 수 있어요.",
                    submitLabel: "수정 저장",
                    initialDraft: TaskDraft(
                        title: task.title,
                        memo: task.memo,
                        durationMinutes: task.durationMinutes,
                        importance: task.importance,
                        due: task.due,
                        preferredTime: task.preferredTime
                    ),
                    onSubmit: { draft in viewModel.updateTask(task, with: draft) },
                    onCancel: { viewModel.editingTask = nil }
                )
            }
            .presentationDetents([.large])
        }
        .fullScreenCover(isPresented: Binding(get: { viewModel.isOnboardingRequired }, set: { _ in })) {
            OnboardingView(viewModel: viewModel)
                .interactiveDismissDisabled()
        }
        .overlay(alignment: .bottom) {
            if let toast = viewModel.toast {
                ToastBanner(text: toast.text)
                    .padding(.bottom, 26)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .task(id: toast.id) {
                        try? await _Concurrency.Task.sleep(for: .seconds(2.4))
                        if viewModel.toast?.id == toast.id {
                            viewModel.toast = nil
                        }
                    }
            }
        }
    }
}

private struct TodayScreen: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(koreanDateFormatter.string(from: viewModel.now))
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.secondary)
                            Text(viewModel.greetingTitle)
                                .font(.largeTitle.bold())
                            Text(viewModel.greetingSubtitle)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }

                    HStack(spacing: 8) {
                        CapsuleTag(text: koreanTimeFormatter.string(from: viewModel.now))
                        CapsuleTag(text: "\(viewModel.now.timeBand.label) 흐름")
                        CapsuleTag(text: "긴 계획표 대신 지금 할 일 하나")
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(22)
                .background(
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [Color.white, Color(red: 0.98, green: 0.95, blue: 0.91)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )

                NowCardView(viewModel: viewModel)

                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 12) {
                        summaryCards
                    }
                    VStack(spacing: 12) {
                        summaryCards
                    }
                }

                SectionCard(title: "다음 후보", subtitle: "지금 카드 다음으로 이어지면 좋은 일들입니다.") {
                    if viewModel.nextCandidates.isEmpty {
                        EmptyStateView(
                            title: "아직 할 일이 없어요.",
                            detail: "하나만 추가해보면 바로 추천을 만들어둘게요."
                        )
                    } else {
                        VStack(spacing: 12) {
                            ForEach(viewModel.nextCandidates) { task in
                                TaskRowView(
                                    task: task,
                                    showStatus: false,
                                    onComplete: { viewModel.completeTask(task) },
                                    onEdit: { viewModel.editingTask = task },
                                    onDelete: { viewModel.deleteTask(task) }
                                )
                            }
                        }
                    }
                }
            }
            .padding()
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("오늘")
        .toolbarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    HistoryScreen(viewModel: viewModel)
                } label: {
                    Label("기록", systemImage: "clock.arrow.circlepath")
                }
            }
        }
    }

    private var summaryCards: some View {
        Group {
            SummaryCard(
                title: "오늘 남은 일",
                value: "\(viewModel.remainingActiveTasks.count)개",
                detail: "예상 \(viewModel.remainingActiveTasks.reduce(0) { $0 + $1.durationMinutes })분 정도면 오늘 목록을 한 번 훑을 수 있어요."
            )
            SummaryCard(
                title: "가장 많이 미룬 일",
                value: viewModel.postponedTasks.first?.title ?? "없음",
                detail: viewModel.postponedTasks.isEmpty ? "아직 반복해서 미룬 일은 없습니다." : "미룸 기록이 가장 많이 쌓인 일입니다."
            )
        }
    }
}

private struct AddTaskScreen: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        TaskEditorView(
            title: "10초 안에 추가",
            description: "제목만 적어도 저장되고 바로 Today 화면 추천에 반영됩니다.",
            submitLabel: "저장하고 Today로"
        ) { draft in
            viewModel.addTask(draft: draft)
        }
        .navigationTitle("추가")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct TaskListScreen: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        List {
            Picker("필터", selection: $viewModel.taskFilter) {
                ForEach(TaskFilter.allCases) { filter in
                    Text(filter.label).tag(filter)
                }
            }
            .pickerStyle(.segmented)
            .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))

            if viewModel.filteredTasks.isEmpty {
                EmptyStateView(
                    title: "표시할 할 일이 없어요.",
                    detail: "필터를 바꾸거나 새로운 할 일을 추가해보세요."
                )
                .listRowBackground(Color.clear)
            } else {
                ForEach(viewModel.filteredTasks) { task in
                    TaskRowView(
                        task: task,
                        showStatus: true,
                        onComplete: task.status == .active ? { viewModel.completeTask(task) } : nil,
                        onEdit: task.status == .active ? { viewModel.editingTask = task } : nil,
                        onDelete: { viewModel.deleteTask(task) }
                    )
                    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                }
            }
        }
        .listStyle(.plain)
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("목록")
    }
}

private struct CaptureScreen: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                SectionCard(title: "복붙해서 정리", subtitle: "카톡, 메일, 메모 문장을 직접 붙여넣으면 할 일 후보로 바꿔드려요.") {
                    VStack(spacing: 12) {
                        TextEditor(text: $viewModel.captureText)
                            .frame(minHeight: 140)
                            .padding(10)
                            .background(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .fill(Color(uiColor: .secondarySystemBackground))
                            )

                        Text("오늘하나는 메시지를 자동으로 읽지 않습니다.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)

                        Button("후보 추출하기") {
                            viewModel.parseCaptureText()
                        }
                        .buttonStyle(FilledButtonStyle())
                    }
                }

                SectionCard(title: "추출된 후보", subtitle: "필요한 것만 선택해서 바로 저장할 수 있습니다.") {
                    if viewModel.captureCandidates.isEmpty {
                        EmptyStateView(
                            title: "아직 후보가 없습니다.",
                            detail: "문장을 붙여넣고 추출 버튼을 누르면 후보가 나타납니다."
                        )
                    } else {
                        VStack(spacing: 12) {
                            ForEach($viewModel.captureCandidates) { $candidate in
                                VStack(alignment: .leading, spacing: 10) {
                                    Toggle(isOn: $candidate.isSelected) {
                                        Text("저장하기")
                                            .font(.subheadline.weight(.medium))
                                    }

                                    TextField("후보 제목", text: $candidate.title)
                                        .textFieldStyle(.roundedBorder)

                                    HStack(spacing: 8) {
                                        CapsuleTag(text: "\(candidate.durationMinutes)분")
                                        CapsuleTag(text: candidate.due.label)
                                        CapsuleTag(text: candidate.preferredTime.label)
                                    }

                                    Text(candidate.rawText)
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)

                                    Button("이 후보 바로 저장") {
                                        let draft = TaskDraft(
                                            title: candidate.title,
                                            memo: candidate.memo,
                                            durationMinutes: candidate.durationMinutes,
                                            importance: candidate.importance,
                                            due: candidate.due,
                                            preferredTime: candidate.preferredTime
                                        )
                                        viewModel.addTask(draft: draft, source: .capture)
                                    }
                                    .buttonStyle(SecondaryButtonStyle())
                                }
                                .padding(16)
                                .background(
                                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                                        .fill(Color(uiColor: .secondarySystemBackground))
                                )
                            }

                            Button("선택한 후보 저장") {
                                viewModel.saveSelectedCandidates()
                            }
                            .buttonStyle(FilledButtonStyle())
                        }
                    }
                }
            }
            .padding()
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("캡처")
    }
}

private struct HistoryScreen: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HStack(spacing: 12) {
                    SummaryCard(
                        title: "오늘 완료",
                        value: "\(viewModel.completedToday.count)개",
                        detail: viewModel.completedToday.first?.title ?? "아직 오늘 완료한 일이 없습니다."
                    )
                    SummaryCard(
                        title: "주간 인사이트",
                        value: "\(viewModel.weeklyInsight.completedCount)개 완료",
                        detail: viewModel.weeklyInsight.summary
                    )
                }

                SectionCard(title: "오늘 완료한 일", subtitle: "Today 화면에서 완료한 기록이 여기 쌓입니다.") {
                    if viewModel.completedToday.isEmpty {
                        EmptyStateView(title: "아직 비어 있어요.", detail: "하나 끝내면 바로 기록이 남습니다.")
                    } else {
                        VStack(spacing: 12) {
                            ForEach(viewModel.completedToday) { task in
                                TaskRowView(task: task, showStatus: true, onComplete: nil, onEdit: nil, onDelete: {
                                    viewModel.deleteTask(task)
                                })
                            }
                        }
                    }
                }

                SectionCard(title: "최근 완료한 일", subtitle: "최근 성취 흐름을 짧게 볼 수 있습니다.") {
                    if viewModel.recentCompleted.isEmpty {
                        EmptyStateView(title: "아직 완료 기록이 없습니다.", detail: "작은 완료부터 쌓아보세요.")
                    } else {
                        VStack(spacing: 12) {
                            ForEach(viewModel.recentCompleted) { task in
                                TaskRowView(task: task, showStatus: true, onComplete: nil, onEdit: nil, onDelete: {
                                    viewModel.deleteTask(task)
                                })
                            }
                        }
                    }
                }

                SectionCard(title: "자주 미룬 일", subtitle: "패턴이 보이는 일부터 먼저 손볼 수 있게 정리했습니다.") {
                    if viewModel.postponedTasks.isEmpty {
                        EmptyStateView(title: "반복해서 미룬 일은 아직 없어요.", detail: "기록이 쌓이면 미루는 패턴도 보여드릴게요.")
                    } else {
                        VStack(spacing: 12) {
                            ForEach(viewModel.postponedTasks) { task in
                                TaskRowView(
                                    task: task,
                                    showStatus: true,
                                    onComplete: { viewModel.completeTask(task) },
                                    onEdit: { viewModel.editingTask = task },
                                    onDelete: { viewModel.deleteTask(task) }
                                )
                            }
                        }
                    }
                }
            }
            .padding()
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("기록")
    }
}

private struct SettingsScreen: View {
    @ObservedObject var viewModel: AppViewModel
    @State private var showClearAlert = false
    @State private var showRestoreAlert = false

    var body: some View {
        Form {
            Section("앱 설명") {
                Text("사용자가 직접 입력한 할 일과 피드백을 바탕으로 지금 할 일 하나를 추천합니다.")
                Text("모든 데이터는 기기 내에 저장됩니다.")
                    .foregroundStyle(.secondary)
            }

            Section("사용 기록 요약") {
                ForEach(viewModel.usageSummaryLines, id: \.self) { line in
                    Text(line)
                }
            }

            Section("알림 시간") {
                ForEach(NotificationSlot.allCases) { slot in
                    VStack(alignment: .leading, spacing: 8) {
                        Toggle(isOn: Binding(
                            get: { viewModel.settings.enabledNotificationSlots.contains(slot) },
                            set: { viewModel.toggleNotification(slot, isEnabled: $0) }
                        )) {
                            Text(slot.label)
                        }

                        Picker("\(slot.label) 시각", selection: Binding(
                            get: { viewModel.settings.notificationHour(for: slot) },
                            set: { viewModel.updateNotificationHour($0, for: slot) }
                        )) {
                            ForEach(6..<23, id: \.self) { hour in
                                Text("\(hour)시").tag(hour)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                }
            }

            Section("개인정보") {
                Text("로그인, 외부 서버 전송, 광고 SDK, 사용자 추적을 사용하지 않습니다.")
                if let privacyPolicyURL = URL(string: viewModel.settings.privacyPolicyURL),
                   let scheme = privacyPolicyURL.scheme?.lowercased(),
                   ["http", "https"].contains(scheme) {
                    Link("개인정보 처리방침", destination: privacyPolicyURL)
                } else {
                    Text("개인정보 처리방침 URL을 출시 전 실제 주소로 설정해 주세요.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            Section("문의") {
                Text(viewModel.settings.operatorName)
                Text(viewModel.settings.contactEmail)
                Text("심사 제출 전 실제 문의 이메일과 정책 링크로 교체해 주세요.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("데이터 관리") {
                Button("샘플 데이터 다시 불러오기") {
                    showRestoreAlert = true
                }

                Button("전체 데이터 삭제", role: .destructive) {
                    showClearAlert = true
                }
            }

            Section("버전") {
                Text("v\(viewModel.settings.version)")
            }
        }
        .navigationTitle("설정")
        .alert("샘플 데이터를 다시 불러올까요?", isPresented: $showRestoreAlert) {
            Button("취소", role: .cancel) {}
            Button("불러오기") { viewModel.restoreSampleData() }
        } message: {
            Text("현재 할 일 목록을 샘플 데이터로 덮어씁니다.")
        }
        .alert("모든 데이터를 삭제할까요?", isPresented: $showClearAlert) {
            Button("취소", role: .cancel) {}
            Button("삭제", role: .destructive) { viewModel.clearAllData() }
        } message: {
            Text("이 작업은 되돌릴 수 없습니다.")
        }
    }
}

private struct NowCardView: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("지금은 이것부터")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)

            if let task = viewModel.todayRecommendation.task {
                Text(task.title)
                    .font(.title.bold())
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 8) {
                    CapsuleTag(text: "\(task.durationMinutes)분")
                    CapsuleTag(text: task.due.label)
                }

                if !task.memo.isEmpty {
                    Text(task.memo)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 8) {
                    ForEach(viewModel.todayRecommendation.reasons, id: \.self) { reason in
                        Text(reason)
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .fill(Color.white.opacity(0.7))
                            )
                    }
                }

                VStack(spacing: 10) {
                    Button("완료") { viewModel.completeTask(task) }
                        .buttonStyle(FilledButtonStyle())

                    HStack(spacing: 10) {
                        Button("10분 뒤") { viewModel.snoozeTask(task) }
                            .buttonStyle(SecondaryButtonStyle())
                        Button("오늘 말고") { viewModel.skipToday(task) }
                            .buttonStyle(SecondaryButtonStyle())
                        Button("별로예요") { viewModel.negativeFeedback(task) }
                            .buttonStyle(SecondaryButtonStyle())
                    }

                    Text("하나를 끝내면 다음 후보도 바로 골라둘게요.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                EmptyStateView(
                    title: "지금 추천할 일이 없습니다.",
                    detail: "첫 할 일을 하나 추가해보면 바로 지금 할 일 하나로 정리해둘게요."
                )
            }
        }
        .padding(22)
        .background(
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 1.00, green: 0.98, blue: 0.95),
                            Color(red: 0.98, green: 0.93, blue: 0.86)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
    }
}

private struct TaskRowView: View {
    let task: Task
    let showStatus: Bool
    let onComplete: (() -> Void)?
    let onEdit: (() -> Void)?
    let onDelete: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(task.title)
                        .font(.headline)
                    HStack(spacing: 8) {
                        CapsuleTag(text: "\(task.durationMinutes)분")
                        CapsuleTag(text: task.importance.label)
                        CapsuleTag(text: task.due.label)
                        CapsuleTag(text: task.preferredTime.label)
                    }
                }
                Spacer()
                if showStatus {
                    Text(task.status == .completed ? "완료" : "진행 중")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(task.status == .completed ? Color.green.opacity(0.14) : Color.orange.opacity(0.15))
                        )
                }
            }

            if !task.memo.isEmpty {
                Text(task.memo)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if task.snoozeCount > 0 || task.negativeFeedbackCount > 0 {
                Text("미룸 \(task.snoozeCount)회 · 별로예요 \(task.negativeFeedbackCount)회")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 10) {
                if let onComplete {
                    Button("완료", action: onComplete)
                        .buttonStyle(SecondaryButtonStyle())
                }
                if let onEdit {
                    Button("수정", action: onEdit)
                        .buttonStyle(SecondaryButtonStyle())
                }
                if let onDelete {
                    Button("삭제", role: .destructive, action: onDelete)
                        .buttonStyle(SecondaryButtonStyle())
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color(uiColor: .secondarySystemBackground))
        )
    }
}

private struct SectionCard<Content: View>: View {
    let title: String
    let subtitle: String
    let content: Content

    init(title: String, subtitle: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.title3.weight(.semibold))
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            content
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(Color(uiColor: .systemBackground))
        )
    }
}

private struct SummaryCard: View {
    let title: String
    let value: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title3.weight(.bold))
                .lineLimit(2)
            Text(detail)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .lineLimit(4)
        }
        .padding(18)
        .frame(maxWidth: .infinity, minHeight: 140, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color(uiColor: .systemBackground))
        )
    }
}

private struct EmptyStateView: View {
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            Text(detail)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color(uiColor: .tertiarySystemBackground))
        )
    }
}

private struct CapsuleTag: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption.weight(.medium))
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(
                Capsule()
                    .fill(Color(uiColor: .tertiarySystemBackground))
            )
    }
}

private struct ToastBanner: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                Capsule()
                    .fill(Color.black.opacity(0.88))
            )
            .foregroundStyle(.white)
            .padding(.horizontal, 24)
    }
}

private struct FilledButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color(red: 0.20, green: 0.15, blue: 0.11))
            )
            .foregroundStyle(.white)
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

private struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color(uiColor: .tertiarySystemBackground))
            )
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}
