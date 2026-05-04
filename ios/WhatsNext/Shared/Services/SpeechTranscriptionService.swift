import Foundation
import Speech

// On-device speech transcription scaffold using Apple Speech framework.
// Authorization and file-based transcription are implemented.
// Live microphone recording is scaffolded — see TODO below.
@MainActor
final class SpeechTranscriptionService: ObservableObject {
    @Published var transcript        = ""
    @Published var isTranscribing    = false
    @Published var authStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined
    @Published var errorMessage: String?

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))

    init() {
        authStatus = SFSpeechRecognizer.authorizationStatus()
    }

    // MARK: - Authorization

    func requestAuthorization() async {
        let status = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
        authStatus = status
    }

    // MARK: - File transcription

    // Pass a local audio file URL (m4a, mp3, wav, caf).
    // Call requestAuthorization() first.
    func transcribeFile(url: URL) async {
        guard authStatus == .authorized else {
            errorMessage = "Speech recognition not authorized. Grant access in Settings."
            return
        }
        guard let recognizer, recognizer.isAvailable else {
            errorMessage = "Speech recognizer is not available on this device."
            return
        }

        isTranscribing = true
        errorMessage   = nil

        let request = SFSpeechURLRecognitionRequest(url: url)
        request.shouldReportPartialResults = false

        do {
            let result: SFSpeechRecognitionResult = try await withCheckedThrowingContinuation { continuation in
                recognizer.recognitionTask(with: request) { result, error in
                    if let error {
                        continuation.resume(throwing: error)
                    } else if let result, result.isFinal {
                        continuation.resume(returning: result)
                    }
                }
            }
            transcript = result.bestTranscription.formattedString
        } catch {
            errorMessage = "Transcription failed: \(error.localizedDescription)"
        }
        isTranscribing = false
    }

    // TODO: Add live microphone recording using AVAudioEngine + SFSpeechAudioBufferRecognitionRequest
    // This requires NSMicrophoneUsageDescription in Info.plist.
}
