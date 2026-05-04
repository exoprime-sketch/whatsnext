import Foundation

enum ImportSourceType: String, Codable, CaseIterable, Identifiable {
    case screenshot
    case meetingFile
    case recording
    case text

    var id: String { rawValue }

    var label: String {
        switch self {
        case .screenshot: "Screenshot"
        case .meetingFile: "Meeting file"
        case .recording:  "Recording"
        case .text:       "Text"
        }
    }

    var systemImage: String {
        switch self {
        case .screenshot: "photo"
        case .meetingFile: "doc.text"
        case .recording:  "mic"
        case .text:       "text.alignleft"
        }
    }
}
