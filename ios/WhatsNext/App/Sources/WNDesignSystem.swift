import SwiftUI

// MARK: - Brand palette
extension Color {
    static let wnBackground = Color(wnHex: 0xF7F4EF)  // warm off-white
    static let wnSurface    = Color.white
    static let wnAccent     = Color(wnHex: 0x5B6CFF)   // periwinkle blue
    static let wnText       = Color(wnHex: 0x1E1C1A)   // near-black
    static let wnMuted      = Color(wnHex: 0x706A63)   // warm grey

    init(wnHex hex: UInt32) {
        self.init(
            red:   Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >>  8) & 0xFF) / 255,
            blue:  Double( hex        & 0xFF) / 255
        )
    }
}

// MARK: - Card container
struct WNCard<Content: View>: View {
    let content: Content
    init(@ViewBuilder _ content: () -> Content) { self.content = content() }

    var body: some View {
        content
            .padding(16)
            .background(Color.wnSurface)
            .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}

// MARK: - Primary button  (accent fill)
struct WNPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 20).padding(.vertical, 13)
            .frame(maxWidth: .infinity)
            .background(isEnabled ? Color.wnAccent : Color.wnMuted.opacity(0.3))
            .foregroundStyle(.white)
            .font(.subheadline.weight(.semibold))
            .clipShape(Capsule())
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Secondary button (soft background)
struct WNSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 20).padding(.vertical, 13)
            .background(Color.wnBackground)
            .foregroundStyle(Color.wnText)
            .font(.subheadline.weight(.medium))
            .clipShape(Capsule())
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Type badge
struct TypeBadge: View {
    let itemType: CandidateItemType
    var body: some View {
        Label(itemType.label, systemImage: itemType.systemImage)
            .font(.caption.weight(.medium))
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(Color.wnAccent.opacity(0.12))
            .foregroundStyle(Color.wnAccent)
            .clipShape(Capsule())
    }
}

// MARK: - Review badge
struct ReviewBadge: View {
    let label: String
    var body: some View {
        Text(label)
            .font(.caption.weight(.medium))
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(Color.orange.opacity(0.12))
            .foregroundStyle(.orange)
            .clipShape(Capsule())
    }
}

// MARK: - Target chip
struct TargetChip: View {
    let target: CandidateTarget
    let selected: Bool
    let action: () -> Void
    var body: some View {
        Button(target.label, action: action)
            .font(.caption.weight(.medium))
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(selected ? Color.wnAccent : Color.wnBackground)
            .foregroundStyle(selected ? .white : Color.wnMuted)
            .clipShape(Capsule())
    }
}

// MARK: - Section header
struct WNSectionHeader: View {
    let title: String
    var body: some View {
        Text(title)
            .font(.headline)
            .foregroundStyle(Color.wnText)
            .padding(.horizontal)
    }
}
