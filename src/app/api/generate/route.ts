import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { 
      domain, 
      subDomain, 
      subject, 
          topics, 
          questionTypes, 
          programmingLevels,
          numQuestions,
          includeAnswers, 
          includeExplanations 
        } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Gemini/Google API Key. Please configure GEMINI_API_KEY in environment variables." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const context = subject ? `${domain} - ${subDomain} (${subject})` : `${domain} - ${subDomain}`;

    const prompt = `
      You are an expert educational content generator. Generate a high-quality question paper based on the following parameters:
      - Domain: ${domain}
      - Sub-domain/Class/Exam: ${subDomain}
        - Subject: ${subject}
        - Topics: ${topics}
        - Question Types Requested: ${questionTypes.join(", ")}
        - Questions per Section: ${numQuestions}
        ${programmingLevels ? `- Programming Difficulty Levels: ${programmingLevels.join(", ")}` : ""}
        - Include Answers: ${includeAnswers}
        - Include Explanations: ${includeExplanations}
  
        Return the data strictly in the following JSON format:
        {
          "title": "Questify - Practice Paper",
          "domainInfo": "${context}",
          "instructions": "Attempt all questions. Questions are designed to test core conceptual understanding and practical application. Total marks are distributed per section.",
          "sections": [
            {
              "type": "Section Type (e.g., MCQs, Short Answers, Long Answers, Case-based, Programming codes)",
              "questions": [
                {
                  "id": 1,
                  "text": "The question text here",
                  "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MCQs, otherwise empty array
                  "marks": 1, // Suggest appropriate marks
                  "answer": "The correct answer", // For 'Programming codes', provide a complete, well-indented code solution.
                  "explanation": "The explanation" // Include only if includeExplanations is true
                }
              ]
            }
          ]
        }
  
        Special Instructions for 'Programming codes':
        - Provide actual coding problems (e.g., 'Write a Python function to...', 'Implement a binary search in Java...').
        - The 'answer' MUST be a clean, properly indented code block.
        - Match the difficulty levels: ${programmingLevels ? programmingLevels.join(", ") : 'appropriate for the domain'}.
        - For 'Easy', focus on basic syntax and simple algorithms.
        - For 'Mid', focus on intermediate data structures and logical problems.
        - For 'Hard', focus on advanced algorithms, optimization, or complex system design.
        - Ensure a balanced distribution of questions across the selected difficulty levels.

      General Instructions:
      - Ensure the questions are syllabus-aligned.
      - If "Case-based" is requested, provide a short paragraph followed by 2-3 related sub-questions.
      - For MCQs, ensure options are plausible and clear.
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // Clean up response text in case of markdown blocks
    responseText = responseText.replace(/```json\n?|```/g, "").trim();
    
    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch (parseError) {
      console.error("JSON Parse Error:", responseText);
      throw new Error("Invalid response format from AI");
    }
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate question paper" }, { status: 500 });
  }
}
