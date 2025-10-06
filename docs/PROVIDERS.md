# Provider Setup Guide

Third Eye MCP supports multiple AI providers, both cloud-based and local. This guide covers setup for each provider.

## Supported Providers

| Provider | Type | API Key Required | Base URL |
|----------|------|------------------|----------|
| **Groq** | Cloud | ✅ Yes | https://api.groq.com/openai/v1 |
| **OpenRouter** | Cloud | ✅ Yes | https://openrouter.ai/api/v1 |
| **Ollama** | Local | ❌ No | http://127.0.0.1:11434 |
| **LM Studio** | Local | ❌ No | http://127.0.0.1:1234/v1 |

---

## Groq

**Best for**: Fast inference with Llama models (70B tokens/sec)

### 1. Get API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy the key (starts with `gsk_...`)

### 2. Add to Third Eye

**Via UI** (Recommended):
1. Open Third Eye Portal at http://127.0.0.1:3300
2. Navigate to **Models** page
3. Find **Groq API Key** section
4. Paste your key
5. Click **Save** (key will be encrypted and stored securely)
6. Click **Refresh** to load available models

**Via Environment Variable**:
```bash
export GROQ_API_KEY="gsk_..."
bun run dev
```

### 3. Configure Routing

1. Go to **Models** page → **Eye Routing Matrix**
2. Select an Eye (e.g., Sharingan)
3. Set **Primary Provider** = `groq`
4. Set **Primary Model** = `llama-3.3-70b-versatile` (recommended)
5. Changes auto-save

### Popular Groq Models

| Model ID | Description | Context Window |
|----------|-------------|----------------|
| `llama-3.3-70b-versatile` | Latest Llama 3.3 (best for general tasks) | 128k |
| `llama-3.1-70b-versatile` | Llama 3.1 70B (great balance) | 128k |
| `mixtral-8x7b-32768` | Mixtral MoE (fast, good reasoning) | 32k |
| `gemma2-9b-it` | Google Gemma 2 (efficient) | 8k |

### Example Request

```bash
curl -X POST http://127.0.0.1:7070/mcp/run \
  -H "Content-Type: application/json" \
  -d '{
    "eye": "sharingan",
    "input": "Write a Python function to reverse a string",
    "sessionId": "test-123"
  }'
```

---

## OpenRouter

**Best for**: Access to 200+ models (GPT-4, Claude, Gemini, etc.)

### 1. Get API Key

1. Visit [openrouter.ai](https://openrouter.ai)
2. Sign up with GitHub or email
3. Go to **Settings** → **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-or-...`)

### 2. Add to Third Eye

**Via UI**:
1. Open **Models** page
2. Find **OpenRouter API Key** section
3. Paste key and click **Save**
4. Click **Refresh** to load 200+ models

**Via Environment Variable**:
```bash
export OPENROUTER_API_KEY="sk-or-..."
bun run dev
```

### 3. Configure Routing

1. Set **Primary Provider** = `openrouter`
2. Set **Primary Model** = `meta-llama/llama-3.1-70b-instruct` (recommended)
3. Or choose from:
   - `anthropic/claude-3.5-sonnet` (best reasoning)
   - `google/gemini-2.0-flash-exp` (fast, multimodal)
   - `openai/gpt-4-turbo` (powerful, expensive)

### Pricing

OpenRouter charges per-token pricing. Check current rates at [openrouter.ai/models](https://openrouter.ai/models).

**Cost Tracking**:
Third Eye displays token usage in the UI after each run.

---

## Ollama (Local)

**Best for**: Privacy, offline use, no API keys, free inference

### 1. Install Ollama

**macOS/Linux**:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows**:
Download from [ollama.com/download](https://ollama.com/download)

**Verify Installation**:
```bash
ollama --version
# ollama version is 0.1.x
```

### 2. Pull Models

**Recommended models**:
```bash
# Llama 3.2 (3B, fast for coding)
ollama pull llama3.2

# Llama 3.1 (8B, balanced)
ollama pull llama3.1

# CodeLlama (7B, specialized for code)
ollama pull codellama

# DeepSeek Coder (6.7B, excellent for programming)
ollama pull deepseek-coder

# Qwen 2.5 Coder (7B, latest coding model)
ollama pull qwen2.5-coder
```

**List installed models**:
```bash
ollama list
```

### 3. Start Ollama Server

**Default** (runs on 127.0.0.1:11434):
```bash
ollama serve
```

**Custom port**:
```bash
OLLAMA_HOST=127.0.0.1:8080 ollama serve
```

### 4. Configure Third Eye

**UI Setup**:
1. Go to **Models** page
2. Find **Ollama** section
3. Click **Refresh** to load models
4. Set routing to `ollama` / `llama3.2` (or your preferred model)

**No API key required!**

### 5. Docker Setup (Optional)

Run Ollama in Docker alongside Third Eye:

```bash
cd docker
docker compose up -d ollama
docker exec -it third-eye-ollama ollama pull llama3.2
```

---

## LM Studio (Local)

**Best for**: GUI-based local model management

### 1. Install LM Studio

1. Download from [lmstudio.ai](https://lmstudio.ai)
2. Install and launch the app
3. Accept terms and complete setup

### 2. Download Models

1. Click **Search** tab in LM Studio
2. Search for models (e.g., "llama-3.2-3b")
3. Click **Download** for your preferred model
4. Wait for download to complete

**Recommended models**:
- `Meta-Llama-3.2-3B-Instruct-GGUF` (fast, 3B)
- `Qwen2.5-Coder-7B-Instruct-GGUF` (coding)
- `DeepSeek-Coder-V2-Lite-Instruct-GGUF` (coding)

### 3. Start Local Server

1. Click **Local Server** tab in LM Studio
2. Select downloaded model from dropdown
3. Click **Start Server**
4. Server starts on `http://127.0.0.1:1234/v1` (default)

### 4. Configure Third Eye

**UI Setup**:
1. Go to **Models** page
2. Find **LM Studio** section
3. Click **Refresh** to load running model
4. Set routing to `lmstudio` / `<model-name>`

**No API key required!**

### 5. Advanced Settings

LM Studio allows:
- **GPU Acceleration**: Offload layers to GPU
- **Context Length**: Adjust max context window
- **Temperature**: Control randomness (0.0-2.0)

Set these in LM Studio before starting server.

---

## Provider Comparison

| Feature | Groq | OpenRouter | Ollama | LM Studio |
|---------|------|------------|--------|-----------|
| **Speed** | ⚡ Fastest | 🟢 Fast | 🟡 Medium | 🟡 Medium |
| **Cost** | 💰 Paid | 💰 Paid | ✅ Free | ✅ Free |
| **Privacy** | ❌ Cloud | ❌ Cloud | ✅ Local | ✅ Local |
| **Model Variety** | ~10 models | 200+ models | 100+ models | 100+ models |
| **Setup Difficulty** | Easy | Easy | Medium | Easy (GUI) |
| **GPU Required** | No | No | Optional | Optional |
| **Offline Use** | No | No | Yes | Yes |

---

## Routing Strategies

### Strategy 1: Speed First (Groq Primary, Ollama Fallback)

```
Primary:  groq / llama-3.3-70b-versatile
Fallback: ollama / llama3.2
```

**Use Case**: Fast cloud inference with free local fallback.

### Strategy 2: Privacy First (Ollama Primary, LM Studio Fallback)

```
Primary:  ollama / qwen2.5-coder
Fallback: lmstudio / DeepSeek-Coder-V2-Lite
```

**Use Case**: 100% local, no data leaves your machine.

### Strategy 3: Quality First (OpenRouter Primary, Groq Fallback)

```
Primary:  openrouter / anthropic/claude-3.5-sonnet
Fallback: groq / llama-3.1-70b-versatile
```

**Use Case**: Best quality with fast fallback.

### Strategy 4: Cost-Conscious (Ollama Primary, Groq Fallback)

```
Primary:  ollama / llama3.1
Fallback: groq / mixtral-8x7b-32768
```

**Use Case**: Free local first, pay only when needed.

---

## Troubleshooting

### Groq/OpenRouter: 401 Unauthorized

**Cause**: Invalid API key

**Fix**:
1. Go to **Models** page
2. Re-enter API key
3. Click **Save**
4. Verify key starts with `gsk_` (Groq) or `sk-or-` (OpenRouter)

### Ollama: Connection Refused

**Cause**: Ollama server not running

**Fix**:
```bash
# Start Ollama
ollama serve

# Verify health
curl http://127.0.0.1:11434/api/tags
```

### LM Studio: No Models Found

**Cause**: Server not started or model not loaded

**Fix**:
1. Open LM Studio
2. Go to **Local Server** tab
3. Select model from dropdown
4. Click **Start Server**

### General: Slow Responses

**Local Providers**:
- Enable GPU acceleration (if available)
- Use smaller models (3B instead of 70B)
- Increase RAM allocation

**Cloud Providers**:
- Check internet connection
- Try different model (smaller = faster)
- Switch providers (Groq is fastest)

---

## Advanced Configuration

### Custom Provider Base URLs

Edit `.env` to override default URLs:

```bash
GROQ_BASE_URL=https://api.groq.com/openai/v1
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OLLAMA_BASE_URL=http://127.0.0.1:11434
LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1
```

### Per-Eye Routing

Different Eyes can use different providers:

```
Sharingan (Code Gen):
  Primary: ollama / qwen2.5-coder
  Fallback: groq / llama-3.3-70b-versatile

Rinnegan (Planning):
  Primary: openrouter / anthropic/claude-3.5-sonnet
  Fallback: groq / llama-3.1-70b-versatile

Tenseigan (Testing):
  Primary: lmstudio / DeepSeek-Coder-V2-Lite
  Fallback: ollama / codellama
```

### Health Checks

Verify provider connectivity:

```bash
# Test provider via Third Eye
curl http://127.0.0.1:7070/api/models/groq
curl http://127.0.0.1:7070/api/models/ollama

# Direct provider health checks
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

curl http://127.0.0.1:11434/api/tags
```

---

## Next Steps

- [Architecture Overview](./ARCHITECTURE.md)
- [FAQ & Troubleshooting](./FAQ.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Main README](../README.md)
