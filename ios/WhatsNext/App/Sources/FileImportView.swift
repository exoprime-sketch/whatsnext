import SwiftUI
import UniformTypeIdentifiers

struct FileImportView: View {
    @ObservedObject var vm: MVPAppViewModel
    @State private var showPicker = false
    @State private var fileText   = ""
    @State private var fileName   = ""

    private let allowedTypes: [UTType] = [
        .plainText,
        UTType(filenameExtension: "md") ?? .plainText
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Meeting file")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Color.wnText)
                    Text("Import a .txt or .md file — meeting notes, agendas, action items.")
                        .font(.subheadline)
                        .foregroundStyle(Color.wnMuted)
                }
                .padding(.horizontal)

                // File picker button
                Button {
                    showPicker = true
                } label: {
                    Label(
                        fileName.isEmpty ? "Choose file (.txt or .md)" : fileName,
                        systemImage: "doc.badge.plus"
                    )
                }
                .buttonStyle(WNSecondaryButtonStyle())
                .padding(.horizontal)

                // Preview
                if !fileText.isEmpty {
                    WNCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Label("File preview", systemImage: "doc.text")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color.wnMuted)
                            Text(fileText.count > 600
                                 ? String(fileText.prefix(600)) + "…"
                                 : fileText)
                                .font(.subheadline)
                                .foregroundStyle(Color.wnText)
                        }
                    }
                    .padding(.horizontal)

                    Button {
                        vm.extractCandidates(from: fileText, source: .meetingFile)
                    } label: {
                        Text("Extract from file")
                    }
                    .buttonStyle(WNPrimaryButtonStyle())
                    .padding(.horizontal)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 32)
        }
        .background(Color.wnBackground)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .fileImporter(isPresented: $showPicker, allowedContentTypes: allowedTypes) { result in
            switch result {
            case .success(let url):
                guard url.startAccessingSecurityScopedResource() else { return }
                defer { url.stopAccessingSecurityScopedResource() }
                if let text = try? String(contentsOf: url, encoding: .utf8) {
                    fileText  = text
                    fileName  = url.lastPathComponent
                }
            case .failure:
                break
            }
        }
    }
}
