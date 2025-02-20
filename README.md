# FireChatAI

FireChatAI is a full-stack Next.js application that integrates **Together AI LLM** and **Firecrawl** to provide AI-generated responses along with web-crawled content. The app also implements rate limiting using **Upstash Redis**.

## Features

- AI-powered responses using **Together AI LLM**.
- Web content crawling using **Firecrawl**.
- Rate limiting with **Upstash Redis**.
- API route `/api/chat` that combines LLM-generated responses with web-crawled data.

## Tech Stack

- **Next.js** (Full-stack framework)
- **Together AI LLM** (Language Model)
- **Firecrawl** (Web Crawler)
- **Upstash Redis** (Rate Limiting)

---

## Setup Instructions

### Prerequisites

- Node.js (>= 16.x recommended)
- npm or yarn
- Upstash Redis account
- Together AI API key
- Firecrawl API key

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/Faizan59khan/firecrawl-powered-ai-chatbot.git
   cd firecrawl-powered-ai-chatbot
   ```

2. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add the following:
   ```env
   UPSTASH_REDIS_URL=
   UPSTASH_REDIS_TOKEN=
   WINDOW_SIZE_IN_SECONDS=
   MAX_WINDOW_REQUEST_COUNT=
   NEXT_PUBLIC_LLM_API_KEY=
   NEXT_PUBLIC_FIRECRAWL_API_KEY=
   ```

4. **Run the development server:**
   ```sh
   npm run dev
   # or
   yarn dev
   ```

5. **Access the app:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Endpoints

### `POST /api/chat`

#### Request Body:
```json
{
"userId": "123",
"message": "What is example.com about?",
"model": "gemini-pro"
}
```

#### Response Example:
```json
{
"response": "Example.com is a technology blog that covers..."
}
```

---

## Deployment

You can deploy the project using **Vercel**:
```sh
vercel deploy
```
Or any other Next.js-compatible hosting service.

---

## License
This project is licensed under the MIT License.

---

## Contributions
Contributions are welcome! Feel free to open an issue or submit a pull request.

---

## Contact
For any inquiries, reach out to **muhammadfaizanse59@gmail.com**.

---

Happy Coding! 🚀

