import React, { useState } from "react";
import "./VisionScanner.css";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- IMPORTANT ---
// It is NOT secure to hardcode API keys in your front-end code.
// Use environment variables or a backend server to protect your keys.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const VisionScanner = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [simplifiedExplanation, setSimplifiedExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File is too large. Please select a file under 10MB.");
        return;
      }
      setSelectedFile(file);
      setSimplifiedExplanation("");
      setError("");
    }
  };

  /**
   * Converts a File object to a base64-encoded string.
   */
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        // reader.result is like "data:application/pdf;base64,JVBERi0..."
        // We need only the base64 part after the comma.
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
    });
  };

  /**
   * Sends the file directly to Gemini as multimodal input.
   * Gemini natively handles PDFs and images — no separate OCR step needed.
   */
  const analyzeDocument = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError("");
    setSimplifiedExplanation("");

    try {
      const base64Data = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type; // e.g., "application/pdf" or "image/png"

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are a helpful medical assistant. Analyze the following medical report document and explain it in simple, clear, and reassuring terms for a patient who has no medical background. 

Structure your explanation with:
1. A clear title 
2. A brief summary of what the report is about
3. Key findings explained in simple terms using bullet points
4. Any recommendations or next steps mentioned in the report
5. A reassuring closing note

Use bold text to highlight important terms. If the document doesn't appear to be a medical report, let the user know politely.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      if (!text) {
        setError("The AI could not extract any information from this document. Please try a different file.");
      } else {
        setSimplifiedExplanation(text);
      }
    } catch (err) {
      console.error("Analysis Error:", err);
      setError(`Analysis failed: ${err.message}. Please check the document or try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vision-body">
      <div className="vision-container">
        <div className="header">
          <span className="header-icon">🩺</span>
          <h2>Medical Report Summarizer</h2>
          <p>Upload a PDF or image of your medical report for a simple, easy-to-understand summary.</p>
        </div>

        <div className="upload-section">
          <label htmlFor="file-upload" className="custom-file-upload">
            {selectedFile ? "Change Document" : "Select Document"}
          </label>
          <input id="file-upload" type="file" accept=".pdf,image/*" onChange={handleFileChange} />
          {selectedFile && <span className="file-name">{selectedFile.name}</span>}
        </div>

        <button onClick={analyzeDocument} disabled={loading || !selectedFile} className="scan-button">
          {loading ? "Analyzing..." : "✨ Get Simplified Explanation"}
        </button>

        <div className="result-area">
          {loading && <div className="loader"></div>}
          {error && <div className="error-message">{error}</div>}
          {!loading && !error && simplifiedExplanation && (
            <div className="explanation-box">
              <pre className="explanation-text">{simplifiedExplanation}</pre>
            </div>
          )}
          {!loading && !simplifiedExplanation && !error && (
            <div className="placeholder-text">
              Your simplified explanation will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisionScanner;