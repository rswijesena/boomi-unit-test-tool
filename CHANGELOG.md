# Changelog

All notable changes to the Boomi Unit Test Tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-15

### 🎉 Initial Release

This is the first public release of the Boomi Unit Test Tool - a comprehensive testing suite for the Boomi Integration Platform.

### ✨ Added

#### 🌐 Web Services Testing
- HTTP methods support (GET, POST, PUT, DELETE, PATCH)
- Multiple authentication types (Basic, Bearer, API Key, None)
- Custom request headers management
- JSON request body editor
- Response assertions (JSON Path, Status Code, Response Time, Contains)
- Request/Response history

#### ⏱️ Scheduled Job Testing
- Execute Boomi processes via AtomSphere API
- Real-time execution status polling
- Execution log retrieval and analysis
- Status validation (COMPLETE, ERROR, etc.)
- Dynamic process properties support
- Configurable timeout and polling intervals

#### 📨 Event Streams Testing
- Publish messages via Boomi Event Streams REST API
- Single message format (`/singlemsg/` endpoint)
- Multiple messages format (standard endpoint)
- Environment token (Bearer) authentication
- Custom message properties (`x-msg-props-*` headers)
- Dynamic value replacement (`{{uuid}}`, `{{now}}`, `{{timestamp}}`)
- Optional consumer endpoint verification
- Publish & Verify test pattern

#### 🤖 AI Agent Testing
- Test AI Agents via wrapper web services
- Multiple authentication options (Basic, Bearer, None)
- Request body templates with `{{prompt}}` placeholder
- Multi-turn conversation support
- Response validation (shouldContain, shouldNotContain)
- Configurable timeout
- Guardrail validation options

#### 🚀 CI/CD Automation
- Create packaged components with versioning
- Deploy packages to Boomi environments
- Full pipeline orchestration (Package → Deploy → Test)
- Environment management and listing
- Deployment history tracking
- Listener status control (RUNNING/PAUSED)
- External CI/CD integration support:
  - GitHub Actions workflow generator
  - Jenkins pipeline generator
  - Azure DevOps pipeline generator
  - curl command generator

#### 📊 Test Suite Management
- Save tests to reusable test suite
- Run all tests with single click
- Test result history with detailed assertions
- Pass/Fail statistics dashboard

#### 🏠 Home Page
- Feature overview and documentation
- Architecture diagrams
- Quick start guide
- API reference
- Real-time status dashboard
- Backend/Boomi connection status

### 🏗️ Architecture
- React 18 frontend (Port 3000)
- Node.js/Express backend (Port 3001)
- RESTful API design
- Boomi AtomSphere API integration
- Boomi Event Streams REST API integration

### 📦 Dependencies
- **Frontend:** React 18, CSS-in-JS
- **Backend:** Node.js 18+, Express, node-fetch, cors, dotenv

---

## [Unreleased]

### 🔮 Planned Features
- Test report export (PDF/HTML)
- Scheduled test runs (cron-based)
- Slack/Teams notifications
- Docker container support
- Performance testing
- Load testing
- Test data parameterization
- Environment variable sets
- Test case tagging and filtering

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | 2024-12-15 | Initial release with core testing features |

---

<p align="center">
  <strong>Made with ❤️ for the Boomi Community</strong>
</p>
