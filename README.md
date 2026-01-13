🧠 Questify – AI Question Paper Generator

Questify is an AI-powered web application that generates topic-based practice questions and full question papers for school, college, and competitive exam students. It allows users to select their domain, question types, and topics, and then automatically produces structured exam-style papers with optional answers and explanations. Generated question papers can be downloaded in PDF or TXT format for easy sharing and printing.

🚀 Features

🏫 Supports School, College, Competitive Exams

🧩 Select question types

MCQs

Short answers

Long answers

Case-based questions

📝 Enter multiple topics in one prompt

🧠 AI-generated:

Questions only

Questions + answers

Questions + answers + explanations

📄 Download options:

PDF

TXT

🎯 Question paper format with sections and marks distribution

📱 Fully responsive web interface

🛠️ Tech Stack

Frontend

React / Next.js

Tailwind CSS

Backend

Node.js / Express

AI

Large Language Model API (OpenAI or equivalent)

Database

MongoDB / PostgreSQL

File generation

jsPDF / pdf-lib / Puppeteer (PDF)

Node FS / Blob API (TXT)

⚙️ Installation & Setup
1️⃣ Clone the repository
git clone https://github.com/your-username/questify.git
cd questify

2️⃣ Install dependencies

Frontend:

cd frontend
npm install


Backend:

cd backend
npm install

3️⃣ Add environment variables

Create .env in backend:

AI_API_KEY=your_key_here
PORT=5000

4️⃣ Run the app

Frontend:

npm run dev


Backend:

npm start

🎯 How It Works

Select domain (School / College / Competitive exam)

Choose class, course, semester, or exam

Enter topics (comma-separated)

Choose question types

Select whether you need answers/explanations

Click Generate

Download as PDF or TXT

🤝 Contribution

Pull requests are welcome!
For major changes, please open an issue to discuss what you’d like to modify.
