<p align="center">
  <img src="https://img.shields.io/badge/Boomi-Unit%20Test%20Tool-00c8ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNWwtNS01IDEuNDEtMS40MUwxMCAxNC4xN2w3LjU5LTcuNTlMMTkgOGwtOSA5eiIvPjwvc3ZnPg==" alt="Boomi Unit Test Tool">
</p>

<h1 align="center">🧪 Boomi Unit Test Tool</h1>

<p align="center">
  <strong>Comprehensive testing suite for Boomi Integration Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square&logo=node.js" alt="Node">
  <img src="https://img.shields.io/badge/react-18.x-61dafb?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/PRs-welcome-ff69b4?style=flat-square" alt="PRs Welcome">
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 🎯 Overview

**Boomi Unit Test Tool** is a powerful, modern testing suite designed specifically for the Boomi Integration Platform. It enables developers and QA teams to test Web Services, Scheduled Jobs, Event Streams, AI Agents, and automate CI/CD deployments—all from a single, intuitive interface.

<p align="center">
  <img src="https://img.shields.io/badge/Web%20Services-Testing-00c8ff?style=for-the-badge" alt="Web Services">
  <img src="https://img.shields.io/badge/Scheduled%20Jobs-Testing-22c55e?style=for-the-badge" alt="Scheduled Jobs">
  <img src="https://img.shields.io/badge/Event%20Streams-Testing-ec4899?style=for-the-badge" alt="Event Streams">
  <img src="https://img.shields.io/badge/AI%20Agents-Testing-7c3aed?style=for-the-badge" alt="AI Agents">
  <img src="https://img.shields.io/badge/CI%2FCD-Automation-f59e0b?style=for-the-badge" alt="CI/CD">
</p>

---

## ✨ Features

### 🌐 Web Services Testing
| Feature | Description |
|---------|-------------|
| **HTTP Methods** | Support for GET, POST, PUT, DELETE, PATCH |
| **Authentication** | Basic Auth, Bearer Token, API Key, Custom Headers |
| **Request Builder** | JSON body editor with syntax highlighting |
| **Assertions** | JSON Path, Status Code, Response Time, Contains |
| **Headers** | Custom request/response header management |

### ⏱️ Scheduled Job Testing
| Feature | Description |
|---------|-------------|
| **Process Execution** | Execute Boomi processes via AtomSphere API |
| **Real-time Polling** | Live status updates during execution |
| **Log Retrieval** | Fetch and analyze execution logs |
| **Status Validation** | Assert on completion status and duration |
| **Dynamic Properties** | Pass runtime properties to processes |

### 📨 Event Streams Testing
| Feature | Description |
|---------|-------------|
| **REST API Publishing** | Publish to Boomi Event Streams via REST |
| **Message Formats** | Single message and multiple message support |
| **Authentication** | Environment token (Bearer) authentication |
| **Message Properties** | Custom headers (x-msg-props-*) |
| **Verification** | Optional consumer endpoint verification |

### 🤖 AI Agent Testing
| Feature | Description |
|---------|-------------|
| **Web Service API** | Test agents via wrapper web services |
| **Multi-turn Conversations** | Context-aware conversation testing |
| **Response Validation** | shouldContain, shouldNotContain assertions |
| **Flexible Auth** | Basic, Bearer, and no-auth options |
| **Request Templates** | Customizable request body templates |

### 🚀 CI/CD Automation
| Feature | Description |
|---------|-------------|
| **Package Creation** | Create versioned packaged components |
| **Deployment** | Deploy to any Boomi environment |
| **Pipeline Orchestration** | Package → Deploy → Test workflows |
| **External Integration** | GitHub Actions, Jenkins, Azure DevOps |
| **Activity Logging** | Full audit trail of CI/CD operations |

### 📊 Test Suite Management
| Feature | Description |
|---------|-------------|
| **Save Tests** | Persist test configurations to suite |
| **Batch Execution** | Run all tests with single click |
| **Result History** | Track all test executions |
| **Export/Import** | Share test suites across teams |

---

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BOOMI UNIT TEST TOOL v0.1                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────┐ │
│    │  React Frontend │────────▶│ Node.js Backend │────────▶│    Boomi    │ │
│    │   (Port 3000)   │  HTTP   │   (Port 3001)   │  REST   │  Platform   │ │
│    │                 │◀────────│                 │◀────────│             │ │
│    └─────────────────┘         └─────────────────┘         └─────────────┘ │
│           │                            │                                    │
│           │                            │                                    │
│           ▼                            ▼                                    │
│    ┌─────────────────┐         ┌─────────────────────────────────────────┐ │
│    │   UI Components │         │              Boomi APIs                  │ │
│    ├─────────────────┤         ├─────────────────────────────────────────┤ │
│    │ • Home Page     │         │ • AtomSphere API (Process Execution)    │ │
│    │ • Web Services  │         │ • Platform API (Packages/Deployments)   │ │
│    │ • Scheduled Jobs│         │ • Event Streams REST API                │ │
│    │ • Event Streams │         │ • Custom Web Services (AI Agents)       │ │
│    │ • AI Agents     │         │                                         │ │
│    │ • CI/CD         │         │                                         │ │
│    │ • Test Results  │         │                                         │ │
│    │ • Test Suite    │         │                                         │ │
│    └─────────────────┘         └─────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Execution Flows

#### 🌐 Web Service Test Flow
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Config  │───▶│  Build   │───▶│ Execute  │───▶│ Validate │───▶│  Result  │
│  Request │    │ Headers  │    │   HTTP   │    │Assertions│    │Pass/Fail │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

#### ⏱️ Scheduled Job Test Flow
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Process  │───▶│ Execute  │───▶│   Poll   │───▶│   Get    │───▶│ Validate │
│    ID    │    │ via API  │    │  Status  │    │   Logs   │    │  Result  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │               │
                     │    ┌──────────┴──────────┐
                     │    │   Real-time Status  │
                     └───▶│   Updates (Polling) │
                          └─────────────────────┘
```

#### 📨 Event Stream Test Flow
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Topic   │───▶│ Build    │───▶│ Publish  │───▶│  Result  │
│ + Token  │    │ Message  │    │ via REST │    │Pass/Fail │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
              ┌─────────────┐                 ┌─────────────┐
              │   Single    │                 │  Multiple   │
              │  /singlemsg │                 │  /rest/...  │
              └─────────────┘                 └─────────────┘
```

#### 🚀 CI/CD Pipeline Flow
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│Component │───▶│  Create  │───▶│  Deploy  │───▶│   Test   │───▶│  Report  │
│    ID    │    │ Package  │    │  to Env  │    │(Optional)│    │  Status  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │               │               │
                     ▼               ▼               ▼
              ┌───────────┐   ┌───────────┐   ┌───────────┐
              │  Version  │   │  Listener │   │  Run Web  │
              │   Notes   │   │   Status  │   │  Service  │
              └───────────┘   └───────────┘   │   Tests   │
                                              └───────────┘
```

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        TECHNOLOGY STACK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   FRONTEND                    BACKEND                           │
│   ┌─────────────────┐        ┌─────────────────┐               │
│   │ React 18        │        │ Node.js 18+     │               │
│   │ JavaScript      │        │ Express.js      │               │
│   │ CSS-in-JS       │        │ node-fetch      │               │
│   │ Single Page App │        │ CORS enabled    │               │
│   └─────────────────┘        └─────────────────┘               │
│                                                                 │
│   BOOMI APIS                  PROTOCOLS                         │
│   ┌─────────────────┐        ┌─────────────────┐               │
│   │ AtomSphere API  │        │ REST/HTTP       │               │
│   │ Platform API    │        │ JSON            │               │
│   │ Event Streams   │        │ Basic Auth      │               │
│   │ Web Services    │        │ Bearer Token    │               │
│   └─────────────────┘        └─────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Boomi Account** with API access

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/boomi-unit-test-tool.git
cd boomi-unit-test-tool

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

1. **Create environment file:**

```bash
cd backend
cp .env.example .env
```

2. **Configure your Boomi credentials:**

```env
# Boomi AtomSphere API Credentials
BOOMI_ACCOUNT_ID=your-boomi-account-id
BOOMI_USERNAME=your-boomi-username
BOOMI_API_TOKEN=your-boomi-api-token

# Default Atom for Process Execution
BOOMI_ATOM_ID=your-default-atom-id

# Optional: Event Streams
EVENT_STREAMS_BASE_URL=https://aus-east-web.eventstreams.boomi.com
EVENT_STREAMS_TOKEN=your-event-streams-token

# Server Configuration
PORT=3001
```

### Running the Application

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
npm start
```

Open your browser at **http://localhost:3000** 🎉

---

## 📖 Usage

### Testing Web Services

1. Navigate to **Web Services** tab
2. Enter the endpoint URL
3. Select HTTP method (GET, POST, etc.)
4. Configure authentication if required
5. Add request headers and body
6. Define assertions (JSON Path, Status Code)
7. Click **Run Test**

**Example Configuration:**
```json
{
  "name": "Get User API Test",
  "method": "GET",
  "url": "https://api.example.com/users/1",
  "authType": "bearer",
  "authToken": "your-api-token",
  "assertions": [
    { "type": "status", "expected": 200 },
    { "type": "jsonPath", "path": "$.name", "operator": "exists" }
  ]
}
```

### Testing Scheduled Jobs

1. Navigate to **Scheduled Jobs** tab
2. Enter the Process ID (from Boomi Build page URL)
3. Optionally specify Atom ID
4. Add dynamic properties if needed
5. Set expected status and timeout
6. Click **Run Test**

### Testing Event Streams

1. Navigate to **Event Streams** tab
2. Enter the REST API URL from Boomi Event Streams
3. Enter your Environment Token
4. Select message format (Single/Multiple)
5. Configure your message payload
6. Click **Publish Message**

**URL Formats:**
- **Single Message:** `https://.../rest/singlemsg/.../TopicName`
- **Multiple Messages:** `https://.../rest/.../TopicName`

### Testing AI Agents

1. Navigate to **AI Agents** tab
2. Select **Web Service API** (recommended)
3. Enter your wrapper process endpoint URL
4. Configure authentication
5. Set request body template with `{{prompt}}` placeholder
6. Enter test prompt and expected behavior
7. Click **Run Agent Test**

### CI/CD Automation

1. Navigate to **CI/CD** tab
2. Choose action: Package, Deploy, or Pipeline
3. **Package:** Enter Component ID and version
4. **Deploy:** Select environment and package
5. **Pipeline:** Configure full automation flow
6. Execute and monitor progress

---

## 📡 API Reference

### Health Check
```http
GET /api/health
```
**Response:**
```json
{
  "status": "ok",
  "boomiConfigured": true,
  "timestamp": "2024-12-15T10:30:00.000Z"
}
```

### Test Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/test/web-service` | POST | Execute web service test |
| `/api/test/scheduled-job` | POST | Execute scheduled job test |
| `/api/test/event-stream` | POST | Execute event stream test |
| `/api/test/ai-agent` | POST | Execute AI agent test |

### CI/CD Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cicd/environments` | GET | List all environments |
| `/api/cicd/environments/:id` | GET | Get environment details |
| `/api/cicd/packages` | GET | List packaged components |
| `/api/cicd/packages/:id` | GET | Get package details |
| `/api/cicd/package` | POST | Create new package |
| `/api/cicd/deploy` | POST | Deploy package to environment |
| `/api/cicd/deployments` | GET | List deployments |
| `/api/cicd/deployments/:id` | DELETE | Undeploy package |
| `/api/cicd/pipeline` | POST | Run full CI/CD pipeline |
| `/api/cicd/history/:componentId` | GET | Get deployment history |

### Boomi Info Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/boomi/processes` | GET | List all processes |
| `/api/boomi/atoms` | GET | List all atoms |
| `/api/boomi/executions` | GET | Query execution records |

---

## 🔧 Configuration Options

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BOOMI_ACCOUNT_ID` | Yes | Your Boomi account ID |
| `BOOMI_USERNAME` | Yes | Boomi username (usually email) |
| `BOOMI_API_TOKEN` | Yes | Boomi API token |
| `BOOMI_ATOM_ID` | No | Default Atom ID for executions |
| `EVENT_STREAMS_BASE_URL` | No | Event Streams base URL |
| `EVENT_STREAMS_TOKEN` | No | Default Event Streams token |
| `PORT` | No | Backend server port (default: 3001) |

### Getting Boomi Credentials

1. **Account ID:** Settings → Account Information
2. **API Token:** Settings → Account Information → API Tokens → Generate
3. **Atom ID:** Manage → Atom Management → Click Atom → Copy ID from URL
4. **Process ID:** Build → Open Process → Copy `componentId` from URL

---

## 📁 Project Structure

```
boomi-unit-test-tool/
├── backend/
│   ├── server.js           # Express server & API routes
│   ├── package.json        # Node dependencies
│   └── .env.example        # Environment template
│
├── frontend/
│   ├── public/
│   │   └── index.html      # HTML template
│   ├── src/
│   │   ├── App.js          # Main React component
│   │   └── index.js        # React entry point
│   └── package.json        # React dependencies
│
├── README.md               # This file
├── LICENSE                 # MIT License
└── CHANGELOG.md            # Version history
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/boomi-unit-test-tool.git

# Create a branch
git checkout -b feature/your-feature

# Make changes and test
npm run dev

# Submit PR
```

---

## 📋 Roadmap

- [x] Web Services Testing
- [x] Scheduled Job Testing
- [x] Event Streams Testing (REST API)
- [x] AI Agent Testing
- [x] CI/CD Automation
- [x] Test Suite Management
- [ ] Test Report Export (PDF/HTML)
- [ ] Scheduled Test Runs
- [ ] Slack/Teams Notifications
- [ ] Docker Container Support
- [ ] Performance Testing
- [ ] Load Testing

---

## 🐛 Troubleshooting

### Common Issues

**Backend not connecting:**
```bash
# Check if port 3001 is available
lsof -i :3001

# Restart backend
cd backend && npm start
```

**Boomi API errors:**
- Verify credentials in `.env` file
- Check API token hasn't expired
- Ensure account has API access enabled

**Event Streams 400 error:**
- Use correct URL format (singlemsg vs regular)
- Verify Environment Token is valid
- Check message format matches URL type

**CORS issues:**
- Backend must be running on port 3001
- Frontend must be running on port 3000

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built for the Boomi Integration Platform
- Inspired by Postman and other API testing tools
- Thanks to the Boomi developer community

---

<p align="center">
  <strong>Made with ❤️ for the Boomi Community</strong>
</p>

<p align="center">
  <a href="https://github.com/yourusername/boomi-unit-test-tool/issues">Report Bug</a> •
  <a href="https://github.com/yourusername/boomi-unit-test-tool/issues">Request Feature</a>
</p>
