import SwiftUI

struct OnboardingView: View {
    @ObservedObject var viewModel: AppViewModel
    @State private var page = 0
    @State private var isSubmitting = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.98, green: 0.95, blue: 0.91),
                    Color(red: 0.95, green: 0.92, blue: 0.88)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 8) {
                    ForEach(0..<3, id: \.self) { index in
                        Capsule()
                            .fill(index == page ? Color.primary : Color.primary.opacity(0.18))
                            .frame(height: 6)
                    }
                }
                .padding(.top, 16)

                Spacer()

                Group {
                    switch page {
                    case 0:
                        OnboardingCard(
                            eyebrow: "오늘하나",
                            title: "지금 할 일 하나만 정해드릴게요.",
                            subtitle: "앱을 열면 긴 계획표 대신 지금 해야 할 행동 하나를 먼저 보여줍니다.",
                            bullets: [
                                "첫 Now Card를 바로 만들 수 있게 10초 입력 흐름으로 시작합니다.",
                                "생각보다 실행이 먼저 나오도록 설계했습니다.",
                                "모든 데이터는 기기 안에만 저장됩니다."
                            ]
                        )
                    case 1:
                        OnboardingCard(
                            eyebrow: "작동 방식",
                            title: "할 일, 마감, 시간대, 미룸 기록을 같이 봅니다.",
                            subtitle: "중요도와 지금 시간에 맞는 일부터 추천해서 결정을 줄여줍니다.",
                            bullets: [
                                "오늘 마감, 중요도, 선호 시간대를 반영합니다.",
                                "10분 뒤, 오늘 말고, 별로예요 피드백도 학습합니다.",
                                "완료 후엔 다음 후보까지 바로 이어집니다."
                            ]
                        )
                    default:
                        finalStep
                    }
                }

                Spacer()

                VStack(spacing: 12) {
                    if page < 2 {
                        Button {
                            withAnimation(.easeInOut) {
                                page += 1
                            }
                        } label: {
                            Text("다음")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                                        .fill(Color(red: 0.20, green: 0.15, blue: 0.11))
                                )
                                .foregroundStyle(.white)
                        }
                    } else {
                        Button {
                            _Concurrency.Task {
                                isSubmitting = true
                                await viewModel.finishOnboarding()
                                isSubmitting = false
                            }
                        } label: {
                            Text(isSubmitting ? "준비 중..." : "첫 추천 만들기")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                                        .fill(viewModel.onboardingDraft.firstTaskTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Color.gray.opacity(0.2) : Color(red: 0.20, green: 0.15, blue: 0.11))
                                )
                                .foregroundStyle(viewModel.onboardingDraft.firstTaskTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .secondary : .white)
                        }
                        .disabled(viewModel.onboardingDraft.firstTaskTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)

                        Button {
                            _Concurrency.Task {
                                isSubmitting = true
                                await viewModel.finishOnboarding(usingSampleData: true)
                                isSubmitting = false
                            }
                        } label: {
                            Text("샘플로 먼저 둘러보기")
                                .font(.subheadline.weight(.medium))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                                        .fill(Color.white.opacity(0.66))
                                )
                        }
                    }
                }
            }
            .padding(24)
        }
    }

    private var finalStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("시작 설정")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            Text("첫 할 일을 하나만 적어주세요.")
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .lineSpacing(6)

            Text("긴 계획표 대신 지금 할 일 하나. 알림은 지금 고르거나 나중에 바꿀 수 있습니다.")
                .font(.body)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 10) {
                Text("알림 시간")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)

                HStack(spacing: 10) {
                    ForEach(NotificationOnboardingChoice.allCases) { choice in
                        Button {
                            viewModel.onboardingDraft.selectedChoice = choice
                        } label: {
                            Text(choice.label)
                                .font(.subheadline.weight(.medium))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(
                                    Capsule()
                                        .fill(viewModel.onboardingDraft.selectedChoice == choice ? Color(red: 0.20, green: 0.15, blue: 0.11) : Color.white.opacity(0.7))
                                )
                                .foregroundStyle(viewModel.onboardingDraft.selectedChoice == choice ? .white : .primary)
                        }
                    }
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("첫 할 일")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)

                TextField(
                    "예: 오늘 꼭 보낼 메일 답장하기",
                    text: Binding(
                        get: { viewModel.onboardingDraft.firstTaskTitle },
                        set: { viewModel.onboardingDraft.firstTaskTitle = $0 }
                    )
                )
                    .textInputAutocapitalization(.never)
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(Color.white.opacity(0.75))
                    )
            }
        }
    }
}

private struct OnboardingCard: View {
    let eyebrow: String
    let title: String
    let subtitle: String
    let bullets: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text(eyebrow)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            Text(title)
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .lineSpacing(6)

            Text(subtitle)
                .font(.body)
                .foregroundStyle(.secondary)
                .lineSpacing(5)

            VStack(alignment: .leading, spacing: 12) {
                ForEach(bullets, id: \.self) { bullet in
                    HStack(alignment: .top, spacing: 10) {
                        Circle()
                            .fill(Color(red: 0.20, green: 0.15, blue: 0.11))
                            .frame(width: 8, height: 8)
                            .padding(.top, 6)
                        Text(bullet)
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                    }
                }
            }
        }
    }
}
