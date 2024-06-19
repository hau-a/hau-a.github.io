//
//  Suggestions.swift
//  event_search
//
//  Created by Ashley Hau on 4/20/23.
//

import SwiftUI

struct Suggestions: View {
    var suggestions: [String]
    @Binding var keyword: String
    @Binding var showSuggestions: Bool
    
    @StateObject var viewModel = ViewModel()
    
    var body: some View {
        VStack {
            if (suggestions.isEmpty) {
                Loading()
            } else {
                Text("Suggestions")
                    .font(.system(size: 25))
                    .fontWeight(.bold)
                    .padding(.top, 20)
                List (suggestions, id: \.self) { suggestion in
                    Button(action: {
                        // replace keyword field with selected suggestion
                        keyword = suggestion
                        showSuggestions = false // close the Suggestions view
                    }) {
                        Text(suggestion)
                            .foregroundColor(.black)
                    }
                }
            }
        }
    }
}

struct Suggestions_Previews: PreviewProvider {
    @State static var keyword = ""
    @State static var showSuggestions = true
    @State static var suggestionsEnabled = true
    static var previews: some View {
        Suggestions(suggestions: ["suggestion 1", "suggestion 2", "suggestion 3"], keyword: $keyword, showSuggestions: $showSuggestions)
    }
}
