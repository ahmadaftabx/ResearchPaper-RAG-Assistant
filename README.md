# PaperMind AI — Research Paper RAG Assistant

A Data Science and NLP portfolio project that turns text-based research PDFs into a searchable knowledge source. PaperMind combines sentence embeddings with keyword retrieval and uses a Groq-hosted LLM to generate explanations tailored to the reader's level.

## Key features

- PDF upload and page-aware text extraction with heuristic section detection.
- Sentence-based chunking with a character-length target.
- Hybrid retrieval using FAISS and BM25.
- Beginner, college student, and researcher explanation levels.
- Structured answers covering Main Idea, Key Concepts, Equations Explained, Real World Example, and Simple Summary when available.
- Model fallback with retries, loading feedback, and readable error messages.
- Responsive HTML/CSS interface with keyboard controls and safe text rendering.
- Temporary uploaded PDFs are removed after processing, including on failure.

## RAG / NLP architecture

```text
PDF → Text Extraction → Chunking → SentenceTransformer Embeddings
    → FAISS + BM25 Retrieval → LLM → Structured Answer
```

1. **Extract:** PyMuPDF reads each page. A regular expression identifies uppercase section headings; page and section metadata accompany the text.
2. **Chunk:** Sentences are grouped around a 300-character target. This is sentence-based grouping, not semantic boundary detection or token counting; long individual sentences remain intact.
3. **Index:** `all-MiniLM-L6-v2` produces embeddings stored in a FAISS `IndexFlatL2`. BM25 indexes whitespace-separated terms from the same chunks.
4. **Retrieve:** The question is embedded for vector search and split into terms for keyword search.
5. **Generate:** Retrieved text and metadata are included in a prompt requesting document-grounded explanations, page citations, and structured JSON. The OpenAI Python client connects to Groq's compatible endpoint.
6. **Display:** The frontend renders structured sections, or falls back to displaying the raw response if JSON parsing fails.

### How hybrid retrieval works

FAISS retrieves chunks with similar embedding vectors, while BM25 retrieves chunks matching the question's terms. The application takes the union of the top results from both methods and removes duplicate chunk indices. This combines semantic similarity and lexical matching; it does not perform weighted score fusion, reranking, or relevance thresholding. By default, each method retrieves up to five chunks.

## Tech stack

| Area | Tools |
| --- | --- |
| API and validation | Python, FastAPI, Uvicorn, Pydantic |
| PDF extraction | PyMuPDF |
| Embeddings | SentenceTransformers, all-MiniLM-L6-v2 |
| Retrieval | FAISS CPU, rank-bm25, NumPy |
| LLM access | OpenAI Python client, Groq API |
| Configuration and uploads | python-dotenv, python-multipart |
| Frontend | Semantic HTML, CSS, vanilla JavaScript |

## Installation

From the project directory, use your preferred Python environment:

```bash
python -m pip install -r requirements.txt
```

The embedding model may download on first startup. LLM generation requires internet access and a valid Groq API key; available models and service limits depend on your account.

### Environment configuration

Create a local `.env` file in the project root:

```dotenv
GROQ_API_KEY=<your_key_here>
```

Replace the placeholder locally. Never put the real key in source code or documentation.

### Run

Run from the project root so the static and template paths resolve correctly:

```bash
uvicorn main:app --reload
```

Open `http://127.0.0.1:8000`. API documentation is available at `/docs`. The reload option is intended for local development.

## Usage

1. Choose a text-based research PDF and click **Upload paper**.
2. Wait for processing to complete.
3. Select the explanation level and enter a question.
4. Click **Ask PaperMind**, or press Enter. Shift+Enter inserts a new line.
5. Read the answer sections and verify claims against the original paper.

Uploading another PDF replaces the in-memory document index. The UI uses the backend's default question mode; the `/ask` API also accepts an optional `mode` field for `equation` or `analysis` prompts.

## Project structure

```text
AI-Research-Paper-Explainer/
├── main.py                 # Extraction, indexing, retrieval, LLM calls, API
├── requirements.txt        # Python dependencies
├── README.md
├── .gitignore
├── templates/
│   └── index.html           # User interface
└── static/
    ├── script.js           # Uploads, questions, answer rendering
    └── style.css           # Responsive visual design
```

The local `.env`, editor settings, Python caches, and temporary PDFs are excluded from version control.

## Data Science / NLP skills demonstrated

- Designing an end-to-end retrieval-augmented generation pipeline.
- Text preprocessing, sentence grouping, and metadata preservation.
- Applying pretrained sentence embeddings and vector similarity search.
- Combining dense and sparse retrieval approaches.
- Prompt construction, structured response parsing, and model fallback.
- Serving NLP functionality through an API and integrating a usable frontend.
- Managing secrets and temporary artifacts responsibly.

## Limitations and future improvements

- **Single shared index:** Data is stored in process-wide memory, with no user isolation, persistence, or concurrency guarantees. Restarting clears the index.
- **Extraction quality:** Scanned PDFs have no OCR support; complex layouts and equations may extract poorly. Section detection is heuristic.
- **Retrieval quality:** BM25 uses simple whitespace splitting. The union is not ranked by a combined score, and no retrieval evaluation metrics are implemented. Future work could add normalization, reranking, and a benchmark dataset.
- **Chunking:** Character-based sentence grouping can exceed the target for long sentences. Token-aware limits and overlap could improve context handling.
- **Generation:** Document grounding and JSON structure are prompt instructions, not guarantees. Answers and citations require verification. Model fallback does not guarantee provider availability.
- **Deployment:** Blocking model calls, permissive CORS, and the absence of authentication, upload-size limits, and rate limiting make this a local portfolio prototype. Production hardening is future work.

## Security and privacy

`.env` is ignored by Git, as are `.vscode/`, Python caches, and `temp_*.pdf`. Keep API keys local and check staged files before committing; ignore rules do not remove files that were previously tracked. Uploaded PDFs are deleted after processing, but extracted text remains in memory until replaced or the server restarts. Retrieved passages and questions are sent to Groq for answer generation, so use documents you are permitted to share with that service.
