import SwiftUI
import PhotosUI

struct ScreenshotImportView: View {
    @ObservedObject var vm: MVPAppViewModel
    @StateObject private var ocr = OCRService()
    @State private var pickerItem: PhotosPickerItem?
    @State private var selectedImage: UIImage?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Screenshot")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Color.wnText)
                    Text("Select a screenshot and we'll extract the text on-device.")
                        .font(.subheadline)
                        .foregroundStyle(Color.wnMuted)
                }
                .padding(.horizontal)

                // Image picker / preview
                PhotosPicker(selection: $pickerItem, matching: .images) {
                    imagePlaceholder
                }
                .padding(.horizontal)
                .onChange(of: pickerItem) { _, item in
                    Task {
                        ocr.reset()
                        if let data = try? await item?.loadTransferable(type: Data.self),
                           let image = UIImage(data: data) {
                            selectedImage = image
                        }
                    }
                }

                // Extract button
                if selectedImage != nil {
                    Button {
                        Task {
                            guard let image = selectedImage else { return }
                            await ocr.recognizeText(from: image)
                            if !ocr.recognizedText.isEmpty {
                                vm.extractCandidates(from: ocr.recognizedText, source: .screenshot)
                            }
                        }
                    } label: {
                        if ocr.isProcessing {
                            HStack {
                                ProgressView().tint(.white)
                                Text("Extracting…")
                            }
                        } else {
                            Text("Extract from screenshot")
                        }
                    }
                    .buttonStyle(WNPrimaryButtonStyle())
                    .disabled(ocr.isProcessing)
                    .padding(.horizontal)
                }

                if let error = ocr.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }

                // Recognized text preview
                if !ocr.recognizedText.isEmpty {
                    WNCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Label("Recognized text", systemImage: "text.quote")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color.wnMuted)
                            Text(ocr.recognizedText)
                                .font(.subheadline)
                                .foregroundStyle(Color.wnText)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 32)
        }
        .background(Color.wnBackground)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private var imagePlaceholder: some View {
        if let image = selectedImage {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .clipShape(RoundedRectangle(cornerRadius: 12))
        } else {
            WNCard {
                VStack(spacing: 12) {
                    Image(systemName: "photo.badge.plus")
                        .font(.system(size: 40))
                        .foregroundStyle(Color.wnMuted)
                    Text("Tap to select screenshot")
                        .font(.subheadline)
                        .foregroundStyle(Color.wnMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
            }
        }
    }
}
