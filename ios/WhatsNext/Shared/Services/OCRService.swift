import Foundation
import Vision
import UIKit

// On-device OCR using Apple Vision. No data leaves the device.
@MainActor
final class OCRService: ObservableObject {
    @Published var isProcessing  = false
    @Published var recognizedText = ""
    @Published var errorMessage: String?

    func recognizeText(from image: UIImage) async {
        guard let cgImage = image.cgImage else {
            errorMessage = "Could not decode image."
            return
        }
        isProcessing = true
        errorMessage = nil

        let request = VNRecognizeTextRequest()
        request.recognitionLevel      = .accurate
        request.usesLanguageCorrection = true

        do {
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            try handler.perform([request])
            recognizedText = (request.results ?? [])
                .compactMap { $0.topCandidates(1).first?.string }
                .joined(separator: "\n")
        } catch {
            errorMessage = "Text recognition failed: \(error.localizedDescription)"
        }
        isProcessing = false
    }

    func reset() {
        recognizedText = ""
        errorMessage   = nil
    }
}
