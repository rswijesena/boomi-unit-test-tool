import React, { useState, useEffect } from 'react';

// ============================================
// API SERVICE
// ============================================
const API_BASE = 'http://localhost:3001/api';

const api = {
  async healthCheck() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await res.json();
    } catch {
      return { status: 'error', boomiConfigured: false };
    }
  },
  async testWebService(config) {
    const res = await fetch(`${API_BASE}/test/web-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },
  async testScheduledJob(config, onStatusUpdate) {
    const res = await fetch(`${API_BASE}/test/scheduled-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },
  async testEventStream(config) {
    const res = await fetch(`${API_BASE}/test/event-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },
  async testAIAgent(config) {
    const res = await fetch(`${API_BASE}/test/ai-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },
  // CI/CD APIs
  async getEnvironments() {
    try {
      const res = await fetch(`${API_BASE}/cicd/environments`);
      return await res.json();
    } catch {
      return [];
    }
  },
  async getPackagedComponents(componentId) {
    try {
      const url = componentId 
        ? `${API_BASE}/cicd/packages?componentId=${componentId}`
        : `${API_BASE}/cicd/packages`;
      const res = await fetch(url);
      return await res.json();
    } catch {
      return [];
    }
  },
  async getDeployments(environmentId) {
    try {
      const url = environmentId
        ? `${API_BASE}/cicd/deployments?environmentId=${environmentId}`
        : `${API_BASE}/cicd/deployments`;
      const res = await fetch(url);
      return await res.json();
    } catch {
      return [];
    }
  },
  async createPackage(config) {
    const res = await fetch(`${API_BASE}/cicd/package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },
  async deployPackage(config) {
    const res = await fetch(`${API_BASE}/cicd/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },
  async runPipeline(config) {
    const res = await fetch(`${API_BASE}/cicd/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },
  async getActiveTests() {
    try {
      const res = await fetch(`${API_BASE}/test/active`);
      return await res.json();
    } catch {
      return {};
    }
  },
  async getProcesses() {
    try {
      const res = await fetch(`${API_BASE}/boomi/processes`);
      return await res.json();
    } catch {
      return [];
    }
  },
  async getAtoms() {
    try {
      const res = await fetch(`${API_BASE}/boomi/atoms`);
      return await res.json();
    } catch {
      return [];
    }
  }
};

// ============================================
// MAIN APP COMPONENT
// ============================================
function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [backendStatus, setBackendStatus] = useState({ connected: false, boomiConfigured: false });
  const [isRunning, setIsRunning] = useState(false);
  const [runningStatus, setRunningStatus] = useState(null); // For real-time status display
  const [results, setResults] = useState([]);
  const [savedTests, setSavedTests] = useState([]);
  const [expandedResult, setExpandedResult] = useState(null);

  // Form states
  const [wsForm, setWsForm] = useState({
    name: '', endpoint: '', method: 'GET',
    headers: '{\n  "Content-Type": "application/json"\n}',
    body: '', expectedStatus: '200', timeout: '30000', assertions: []
  });

  const [scheduleForm, setScheduleForm] = useState({
    name: '', processId: '', atomId: '',
    inputData: '{\n  \n}',
    expectedOutput: '{\n  "status": "COMPLETE",\n  "recordsProcessed": ">0"\n}',
    timeout: '60000',
    options: { captureExecutionLogs: true, validateDataIntegrity: false, testRetryLogic: false }
  });

  const [eventForm, setEventForm] = useState({
    name: '', 
    // Real Boomi Event Streams API
    apiUrl: '',        // e.g., https://aus-east-web.eventstreams.boomi.com/rest/singlemsg/.../TopicName
    envToken: '',      // Environment Token for Bearer auth
    // Test type
    testType: 'publish', // 'publish', 'publish-verify', 'roundtrip'
    // Consumer/Verification endpoint (for roundtrip testing)
    consumerEndpoint: '', // Optional: Boomi process that consumes and returns messages
    consumerApiKey: '',   // Optional: Auth for consumer endpoint
    // Legacy fields
    streamName: '', 
    eventType: 'publish', 
    topic: '',
    payload: '{\n  "orderId": "{{uuid}}",\n  "timestamp": "{{now}}",\n  "customerId": "CUST-001",\n  "amount": 99.99\n}',
    expectedEvents: '[]', 
    timeout: '30000', 
    partitionKey: '',
    messageFormat: 'single', // 'single' or 'multiple'
    messageProperties: '{}',
    verifyDelay: '2000', // ms to wait before verifying
    expectedInMessage: '', // Text that should appear in consumed message
    options: { validateEventSchema: true, testEventOrdering: false, maxResponseTime: null }
  });

  const [agentForm, setAgentForm] = useState({
    name: '',
    testType: 'api', // 'api' (recommended - call wrapper web service) or 'process' (execute via AtomSphere API)
    // For API-based testing (RECOMMENDED)
    agentEndpoint: '',
    authType: 'basic', // 'basic', 'bearer', 'none'
    authUsername: '',
    authPassword: '',
    agentApiKey: '', // for bearer token
    httpMethod: 'POST',
    // For process-based testing (legacy - requires specific setup)
    processId: '',
    atomId: '',
    // Common fields
    prompt: 'Hello, can you help me?',
    requestBodyTemplate: '{\n  "prompt": "{{prompt}}"\n}',
    expectedBehavior: '{\n  "shouldContain": ["help", "assist"],\n  "shouldNotContain": ["error"],\n  "maxResponseTime": 30000\n}',
    timeout: '60000',
    conversationHistory: '[]',
    options: {
      validateGuardrails: true,
      testMultiTurn: false,
      captureTrace: true
    }
  });

  // CI/CD State
  const [cicdForm, setCicdForm] = useState({
    action: 'package', // 'package', 'deploy', 'pipeline'
    componentId: '',
    componentType: 'process', // 'process', 'apiservice', 'certificate', etc.
    packageVersion: '',
    packageNotes: '',
    selectedPackageId: '',
    environmentId: '',
    listenerStatus: 'RUNNING', // 'RUNNING', 'PAUSED'
    deployNotes: '',
    // Pipeline config
    pipelineName: '',
    sourceEnv: '',
    targetEnvs: [],
    runTests: true,
    rollbackOnFail: true
  });
  const [environments, setEnvironments] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [cicdResults, setCicdResults] = useState([]);

  // Check backend status
  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load CI/CD data when tab is active
  useEffect(() => {
    if (activeTab === 'cicd' && backendStatus.boomiConfigured) {
      loadCicdData();
    }
  }, [activeTab, backendStatus.boomiConfigured]);

  async function loadCicdData() {
    const [envs, deps, pkgs] = await Promise.all([
      api.getEnvironments(),
      api.getDeployments(),
      api.getPackagedComponents()
    ]);
    setEnvironments(Array.isArray(envs) ? envs : []);
    setDeployments(Array.isArray(deps) ? deps : []);
    setPackages(Array.isArray(pkgs) ? pkgs : []);
  }

  async function checkBackendStatus() {
    const health = await api.healthCheck();
    setBackendStatus({
      connected: health.status === 'ok',
      boomiConfigured: health.boomiConfigured
    });
  }

  // Test runners
  async function runWebServiceTest() {
    setIsRunning(true);
    try {
      const result = await api.testWebService(wsForm);
      setResults(prev => [result, ...prev]);
      setActiveTab('results');
    } catch (error) {
      alert('Test failed: ' + error.message);
    }
    setIsRunning(false);
  }

  async function runScheduledJobTest() {
    setIsRunning(true);
    setRunningStatus({ phase: 'starting', message: 'Starting test...' });
    
    // Start polling for status updates
    const pollInterval = setInterval(async () => {
      try {
        const activeTests = await api.getActiveTests();
        const testIds = Object.keys(activeTests);
        if (testIds.length > 0) {
          const latestStatus = activeTests[testIds[testIds.length - 1]];
          setRunningStatus(latestStatus);
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 1000);
    
    try {
      const result = await api.testScheduledJob(scheduleForm);
      clearInterval(pollInterval);
      setResults(prev => [result, ...prev]);
      setActiveTab('results');
    } catch (error) {
      clearInterval(pollInterval);
      alert('Test failed: ' + error.message);
    }
    
    setIsRunning(false);
    setRunningStatus(null);
  }

  async function runEventStreamTest() {
    setIsRunning(true);
    try {
      const result = await api.testEventStream(eventForm);
      setResults(prev => [result, ...prev]);
      setActiveTab('results');
    } catch (error) {
      alert('Test failed: ' + error.message);
    }
    setIsRunning(false);
  }

  async function runAIAgentTest() {
    setIsRunning(true);
    setRunningStatus({ phase: 'starting', message: 'Starting AI Agent test...' });
    
    // Start polling for status updates
    const pollInterval = setInterval(async () => {
      try {
        const activeTests = await api.getActiveTests();
        const testIds = Object.keys(activeTests);
        if (testIds.length > 0) {
          const latestStatus = activeTests[testIds[testIds.length - 1]];
          setRunningStatus(latestStatus);
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 1000);
    
    try {
      const result = await api.testAIAgent(agentForm);
      clearInterval(pollInterval);
      setResults(prev => [result, ...prev]);
      setActiveTab('results');
    } catch (error) {
      clearInterval(pollInterval);
      alert('Test failed: ' + error.message);
    }
    
    setIsRunning(false);
    setRunningStatus(null);
  }

  // CI/CD Functions
  async function createPackage() {
    if (!cicdForm.componentId) {
      alert('Please enter a Component ID');
      return;
    }
    setIsRunning(true);
    try {
      const result = await api.createPackage({
        componentId: cicdForm.componentId,
        packageVersion: cicdForm.packageVersion || `v${Date.now()}`,
        notes: cicdForm.packageNotes
      });
      setCicdResults(prev => [{
        type: 'package',
        status: 'success',
        timestamp: new Date().toISOString(),
        data: result
      }, ...prev]);
      await loadCicdData(); // Refresh packages list
      alert(`Package created successfully! ID: ${result.packageId}`);
    } catch (error) {
      setCicdResults(prev => [{
        type: 'package',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: error.message
      }, ...prev]);
      alert('Failed to create package: ' + error.message);
    }
    setIsRunning(false);
  }

  async function deployPackage() {
    if (!cicdForm.environmentId) {
      alert('Please select an Environment');
      return;
    }
    const packageId = cicdForm.selectedPackageId;
    if (!packageId) {
      alert('Please select a Package to deploy');
      return;
    }
    setIsRunning(true);
    try {
      const result = await api.deployPackage({
        environmentId: cicdForm.environmentId,
        packageId: packageId,
        notes: cicdForm.deployNotes,
        listenerStatus: cicdForm.listenerStatus
      });
      setCicdResults(prev => [{
        type: 'deploy',
        status: 'success',
        timestamp: new Date().toISOString(),
        data: result
      }, ...prev]);
      await loadCicdData(); // Refresh deployments list
      alert(`Deployed successfully! ID: ${result.deploymentId}`);
    } catch (error) {
      setCicdResults(prev => [{
        type: 'deploy',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: error.message
      }, ...prev]);
      alert('Failed to deploy: ' + error.message);
    }
    setIsRunning(false);
  }

  async function runPipeline() {
    if (!cicdForm.componentId) {
      alert('Please enter a Component ID');
      return;
    }
    if (!cicdForm.environmentId) {
      alert('Please select at least one target environment');
      return;
    }
    setIsRunning(true);
    setRunningStatus({ phase: 'pipeline', message: 'Running CI/CD pipeline...' });
    
    try {
      const result = await api.runPipeline({
        componentId: cicdForm.componentId,
        packageVersion: cicdForm.packageVersion || `v${Date.now()}`,
        packageNotes: cicdForm.packageNotes,
        targetEnvironments: [{ 
          environmentId: cicdForm.environmentId, 
          listenerStatus: cicdForm.listenerStatus 
        }],
        runTestsAfterDeploy: cicdForm.runTests
      });
      setCicdResults(prev => [{
        type: 'pipeline',
        status: result.status,
        timestamp: new Date().toISOString(),
        data: result
      }, ...prev]);
      await loadCicdData();
      alert(`Pipeline ${result.status}! Check results below.`);
    } catch (error) {
      setCicdResults(prev => [{
        type: 'pipeline',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: error.message
      }, ...prev]);
      alert('Pipeline failed: ' + error.message);
    }
    setIsRunning(false);
    setRunningStatus(null);
  }

  function saveTest(type) {
    let test;
    if (type === 'webservice') test = { ...wsForm, type, id: Date.now() };
    else if (type === 'schedule') test = { ...scheduleForm, type, id: Date.now() };
    else if (type === 'event') test = { ...eventForm, type, id: Date.now() };
    else if (type === 'agent') test = { ...agentForm, type, id: Date.now() };
    else return;
    setSavedTests(prev => [...prev, test]);
    alert('Test saved to suite!');
  }

  function addAssertion() {
    setWsForm(prev => ({
      ...prev,
      assertions: [...prev.assertions, { id: Date.now(), type: 'jsonPath', path: '', operator: 'equals', expected: '' }]
    }));
  }

  function updateAssertion(id, field, value) {
    setWsForm(prev => ({
      ...prev,
      assertions: prev.assertions.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  }

  function removeAssertion(id) {
    setWsForm(prev => ({
      ...prev,
      assertions: prev.assertions.filter(a => a.id !== id)
    }));
  }

  async function runSavedTest(test) {
    setIsRunning(true);
    let result;
    if (test.type === 'webservice') result = await api.testWebService(test);
    else if (test.type === 'schedule') result = await api.testScheduledJob(test);
    else if (test.type === 'event') result = await api.testEventStream(test);
    else if (test.type === 'agent') result = await api.testAIAgent(test);
    if (result) {
      setResults(prev => [result, ...prev]);
      setActiveTab('results');
    }
    setIsRunning(false);
  }

  async function runAllTests() {
    setIsRunning(true);
    for (const test of savedTests) {
      let result;
      if (test.type === 'webservice') result = await api.testWebService(test);
      else if (test.type === 'schedule') result = await api.testScheduledJob(test);
      else if (test.type === 'event') result = await api.testEventStream(test);
      else if (test.type === 'agent') result = await api.testAIAgent(test);
      if (result) setResults(prev => [result, ...prev]);
    }
    setIsRunning(false);
    setActiveTab('results');
  }

  // Navigation tabs
  const tabs = [
    { id: 'home', label: 'Home', icon: '⌂' },
    { id: 'webservices', label: 'Web Services', icon: '◇' },
    { id: 'schedules', label: 'Scheduled Jobs', icon: '◈' },
    { id: 'events', label: 'Event Streams', icon: '◉' },
    { id: 'agents', label: 'AI Agents', icon: '◎' },
    { id: 'cicd', label: 'CI/CD', icon: '⚙' },
    { id: 'results', label: 'Test Results', icon: '◆', badge: results.length },
    { id: 'suite', label: 'Test Suite', icon: '▣', badge: savedTests.length }
  ];

  // Styles
  const inputStyle = {
    width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
    color: '#e0e0e0', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box'
  };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };
  const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: '120px', fontSize: '0.85rem' };
  const labelStyle = { display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.8rem', fontWeight: '500' };
  const btnPrimary = {
    background: 'linear-gradient(135deg, #00c8ff 0%, #0099cc 100%)', border: 'none',
    borderRadius: '6px', padding: '0.75rem 1.5rem', color: '#0d0d14',
    fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
  };
  const btnSuccess = {
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none',
    borderRadius: '6px', padding: '0.75rem 1.5rem', color: '#fff',
    fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
  };
  const btnDanger = {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '6px', padding: '0.5rem 1rem', color: '#ef4444',
    fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a1a2e 50%, #0d0d14 100%)',
      fontFamily: '"JetBrains Mono", monospace',
      color: '#e0e0e0'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(0,200,255,0.15)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '42px', height: '42px',
            background: 'linear-gradient(135deg, #00c8ff 0%, #7c3aed 100%)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold', fontSize: '1.3rem', color: '#0d0d14'
          }}>B</div>
          <div>
            <h1 style={{
              margin: 0, fontSize: '1.5rem', fontWeight: '700',
              background: 'linear-gradient(90deg, #00c8ff, #7c3aed)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>Boomi Unit Test Tool</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>Integration Testing Suite</p>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: backendStatus.connected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${backendStatus.connected ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: '20px', fontSize: '0.8rem',
          color: backendStatus.connected ? '#22c55e' : '#ef4444'
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: backendStatus.connected ? '#22c55e' : '#ef4444'
          }} />
          {backendStatus.connected
            ? (backendStatus.boomiConfigured ? 'Connected to Boomi' : 'Backend Ready')
            : 'Backend Offline - Start server.js'}
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 76px)' }}>
        {/* Sidebar */}
        <nav style={{
          width: '240px', background: 'rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem 0'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%', padding: '1rem 1.5rem',
                background: activeTab === tab.id
                  ? 'linear-gradient(90deg, rgba(0,200,255,0.12) 0%, transparent 100%)'
                  : 'transparent',
                border: 'none',
                borderLeft: activeTab === tab.id ? '3px solid #00c8ff' : '3px solid transparent',
                color: activeTab === tab.id ? '#00c8ff' : '#888',
                fontSize: '0.9rem', fontFamily: 'inherit', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'rgba(0,200,255,0.2)',
                  padding: '0.15rem 0.5rem', borderRadius: '10px',
                  fontSize: '0.75rem', color: '#00c8ff'
                }}>{tab.badge}</span>
              )}
            </button>
          ))}

          {/* Stats */}
          <div style={{
            margin: '2rem 1rem', padding: '1rem',
            background: 'rgba(0,200,255,0.05)', borderRadius: '8px',
            border: '1px solid rgba(0,200,255,0.1)'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.75rem' }}>Statistics</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#888', fontSize: '0.8rem' }}>Total</span>
              <span style={{ color: '#00c8ff', fontWeight: '600' }}>{results.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#888', fontSize: '0.8rem' }}>Passed</span>
              <span style={{ color: '#22c55e', fontWeight: '600' }}>
                {results.filter(r => r.status === 'passed').length}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888', fontSize: '0.8rem' }}>Failed</span>
              <span style={{ color: '#ef4444', fontWeight: '600' }}>
                {results.filter(r => r.status === 'failed').length}
              </span>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

          {/* Home Tab */}
          {activeTab === 'home' && (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {/* Hero Section */}
              <div style={{
                textAlign: 'center', marginBottom: '3rem', padding: '2rem',
                background: 'linear-gradient(135deg, rgba(0,200,255,0.1) 0%, rgba(124,58,237,0.1) 100%)',
                borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h1 style={{ 
                  fontSize: '2.5rem', fontWeight: '700', margin: '0 0 1rem',
                  background: 'linear-gradient(135deg, #00c8ff 0%, #7c3aed 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                  Boomi Unit Test Tool
                </h1>
                <p style={{ color: '#888', fontSize: '1.1rem', margin: 0, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
                  Comprehensive testing suite for Boomi integrations - Web Services, Scheduled Jobs, 
                  Event Streams, AI Agents, and CI/CD Pipelines
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                  <button onClick={() => setActiveTab('webservices')} style={{
                    ...btnSuccess, padding: '0.75rem 2rem', fontSize: '1rem'
                  }}>
                    🚀 Start Testing
                  </button>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{
                    ...btnPrimary, padding: '0.75rem 2rem', fontSize: '1rem', textDecoration: 'none',
                    background: 'rgba(255,255,255,0.1)', color: '#888'
                  }}>
                    📖 Documentation
                  </a>
                </div>
              </div>

              {/* Features Grid */}
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#e0e0e0' }}>
                ✨ Features
              </h2>
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '1.5rem', marginBottom: '3rem' 
              }}>
                {[
                  {
                    icon: '◇', color: '#00c8ff', title: 'Web Services Testing',
                    desc: 'Test REST APIs with custom headers, authentication, request bodies, and comprehensive assertions including JSON path validation.',
                    features: ['GET/POST/PUT/DELETE methods', 'Basic/Bearer/API Key auth', 'JSON Path assertions', 'Response time validation']
                  },
                  {
                    icon: '◈', color: '#22c55e', title: 'Scheduled Job Testing',
                    desc: 'Execute and monitor Boomi scheduled processes with real-time status tracking and execution log analysis.',
                    features: ['Process execution via API', 'Real-time polling', 'Execution log retrieval', 'Status validation']
                  },
                  {
                    icon: '◉', color: '#ec4899', title: 'Event Streams Testing',
                    desc: 'Publish messages to Boomi Event Streams topics using the REST API with full authentication support.',
                    features: ['Single/Multiple message formats', 'Bearer token auth', 'Message properties', 'Publish verification']
                  },
                  {
                    icon: '◎', color: '#7c3aed', title: 'AI Agent Testing',
                    desc: 'Test Boomi AI Agents through wrapper web services with prompt validation and response assertions.',
                    features: ['Web Service API calls', 'Multi-turn conversations', 'Response validation', 'Guardrail testing']
                  },
                  {
                    icon: '⚙', color: '#f59e0b', title: 'CI/CD Automation',
                    desc: 'Automate Boomi deployments with package creation, environment management, and pipeline orchestration.',
                    features: ['Package creation', 'Multi-env deployment', 'Pipeline automation', 'External CI/CD integration']
                  },
                  {
                    icon: '▣', color: '#06b6d4', title: 'Test Suite Management',
                    desc: 'Save, organize, and run test suites with batch execution and comprehensive result tracking.',
                    features: ['Save tests to suite', 'Run all tests', 'Export/Import', 'Result history']
                  }
                ].map((feature, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem'
                    }}>
                      <span style={{ 
                        fontSize: '1.5rem', color: feature.color,
                        background: `${feature.color}20`, padding: '0.5rem',
                        borderRadius: '8px', width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>{feature.icon}</span>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#e0e0e0' }}>
                        {feature.title}
                      </h3>
                    </div>
                    <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 1rem', lineHeight: '1.5' }}>
                      {feature.desc}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {feature.features.map((f, j) => (
                        <span key={j} style={{
                          background: `${feature.color}15`, color: feature.color,
                          padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem'
                        }}>{f}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Architecture Section */}
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#e0e0e0' }}>
                🏗️ Architecture
              </h2>
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)', padding: '2rem', marginBottom: '3rem'
              }}>
                <pre style={{
                  color: '#888', fontSize: '0.85rem', lineHeight: '1.6', margin: 0,
                  fontFamily: 'monospace', overflow: 'auto'
                }}>{`
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BOOMI UNIT TEST TOOL                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────────┐         ┌──────────────────┐         ┌────────────────┐  │
│   │   React Frontend │ ──────> │  Node.js Backend │ ──────> │  Boomi Platform│  │
│   │   (Port 3000)    │  HTTP   │   (Port 3001)    │  REST   │                │  │
│   └──────────────────┘         └──────────────────┘         └────────────────┘  │
│                                         │                                        │
│                                         │                                        │
│                    ┌────────────────────┴────────────────────┐                  │
│                    │                                          │                  │
│                    ▼                                          ▼                  │
│   ┌─────────────────────────────┐         ┌─────────────────────────────────┐   │
│   │     AtomSphere API          │         │     Event Streams REST API       │   │
│   │  • Execute Process          │         │  • Publish Messages              │   │
│   │  • Query Executions         │         │  • Single/Multiple Format        │   │
│   │  • Manage Packages          │         │  • Bearer Token Auth             │   │
│   │  • Deploy Components        │         │                                   │   │
│   │  • Environment Management   │         │                                   │   │
│   └─────────────────────────────┘         └─────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TEST FLOW                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. WEB SERVICE TEST                                                            │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│   │  Config  │ -> │  Execute │ -> │ Response │ -> │ Validate │ -> │  Result  │  │
│   │  Request │    │   HTTP   │    │ Received │    │Assertions│    │ Pass/Fail│  │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                                  │
│   2. SCHEDULED JOB TEST                                                          │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│   │ Process  │ -> │ Execute  │ -> │   Poll   │ -> │   Get    │ -> │ Validate │  │
│   │    ID    │    │ via API  │    │  Status  │    │   Logs   │    │  Result  │  │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                                  │
│   3. EVENT STREAM TEST                                                           │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│   │  Topic   │ -> │ Publish  │ -> │ Verify   │ -> │  Result  │                  │
│   │ + Token  │    │ Message  │    │ Response │    │ Pass/Fail│                  │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘                  │
│                                                                                  │
│   4. CI/CD PIPELINE                                                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│   │Component │ -> │ Create   │ -> │  Deploy  │ -> │   Test   │ -> │  Report  │  │
│   │    ID    │    │ Package  │    │  to Env  │    │(Optional)│    │  Status  │  │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                `}</pre>
              </div>

              {/* Quick Start Section */}
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#e0e0e0' }}>
                🚀 Quick Start
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem'
                }}>
                  <h3 style={{ color: '#00c8ff', margin: '0 0 1rem', fontSize: '1.1rem' }}>1. Setup</h3>
                  <pre style={{
                    background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px',
                    fontSize: '0.8rem', color: '#888', overflow: 'auto', margin: 0
                  }}>{`# Backend
cd backend
cp .env.example .env
# Edit .env with your Boomi credentials
npm install && npm start

# Frontend
cd frontend
npm install && npm start`}</pre>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem'
                }}>
                  <h3 style={{ color: '#22c55e', margin: '0 0 1rem', fontSize: '1.1rem' }}>2. Configure .env</h3>
                  <pre style={{
                    background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px',
                    fontSize: '0.8rem', color: '#888', overflow: 'auto', margin: 0
                  }}>{`BOOMI_ACCOUNT_ID=your-account-id
BOOMI_USERNAME=your-username
BOOMI_API_TOKEN=your-api-token
BOOMI_ATOM_ID=your-atom-id

# Optional: Event Streams
EVENT_STREAMS_TOKEN=your-es-token`}</pre>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem'
                }}>
                  <h3 style={{ color: '#ec4899', margin: '0 0 1rem', fontSize: '1.1rem' }}>3. Run Your First Test</h3>
                  <ol style={{ color: '#888', fontSize: '0.9rem', paddingLeft: '1.25rem', margin: 0 }}>
                    <li style={{ marginBottom: '0.5rem' }}>Go to <strong>Web Services</strong> tab</li>
                    <li style={{ marginBottom: '0.5rem' }}>Enter your API endpoint URL</li>
                    <li style={{ marginBottom: '0.5rem' }}>Configure authentication if needed</li>
                    <li style={{ marginBottom: '0.5rem' }}>Add assertions (optional)</li>
                    <li>Click <strong>Run Test</strong></li>
                  </ol>
                </div>
              </div>

              {/* API Reference */}
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#e0e0e0' }}>
                📡 API Reference
              </h2>
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem', marginBottom: '3rem',
                overflow: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#888' }}>Endpoint</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#888' }}>Method</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#888' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { endpoint: '/api/health', method: 'GET', desc: 'Health check and Boomi config status' },
                      { endpoint: '/api/test/web-service', method: 'POST', desc: 'Execute web service test' },
                      { endpoint: '/api/test/scheduled-job', method: 'POST', desc: 'Execute scheduled job test' },
                      { endpoint: '/api/test/event-stream', method: 'POST', desc: 'Execute event stream test' },
                      { endpoint: '/api/test/ai-agent', method: 'POST', desc: 'Execute AI agent test' },
                      { endpoint: '/api/cicd/environments', method: 'GET', desc: 'List Boomi environments' },
                      { endpoint: '/api/cicd/packages', method: 'GET', desc: 'List packaged components' },
                      { endpoint: '/api/cicd/package', method: 'POST', desc: 'Create new package' },
                      { endpoint: '/api/cicd/deploy', method: 'POST', desc: 'Deploy package to environment' },
                      { endpoint: '/api/cicd/pipeline', method: 'POST', desc: 'Run full CI/CD pipeline' },
                    ].map((api, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <code style={{ color: '#00c8ff', background: 'rgba(0,200,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            {api.endpoint}
                          </code>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ 
                            color: api.method === 'GET' ? '#22c55e' : '#f59e0b',
                            fontWeight: '600'
                          }}>{api.method}</span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#888' }}>{api.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Status Section */}
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#e0e0e0' }}>
                📊 Current Status
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                <div style={{
                  background: backendStatus.connected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${backendStatus.connected ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: '12px', padding: '1.5rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{backendStatus.connected ? '✓' : '✗'}</div>
                  <div style={{ color: backendStatus.connected ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                    Backend {backendStatus.connected ? 'Connected' : 'Disconnected'}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem' }}>Port 3001</div>
                </div>
                <div style={{
                  background: backendStatus.boomiConfigured ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                  border: `1px solid ${backendStatus.boomiConfigured ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  borderRadius: '12px', padding: '1.5rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{backendStatus.boomiConfigured ? '✓' : '⚠'}</div>
                  <div style={{ color: backendStatus.boomiConfigured ? '#22c55e' : '#f59e0b', fontWeight: '600' }}>
                    Boomi {backendStatus.boomiConfigured ? 'Configured' : 'Not Configured'}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {backendStatus.boomiConfigured ? 'Ready to test' : 'Check .env file'}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(0,200,255,0.1)',
                  border: '1px solid rgba(0,200,255,0.3)',
                  borderRadius: '12px', padding: '1.5rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#00c8ff' }}>{results.length}</div>
                  <div style={{ color: '#00c8ff', fontWeight: '600' }}>Tests Run</div>
                  <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {results.filter(r => r.status === 'passed').length} passed, {results.filter(r => r.status === 'failed').length} failed
                  </div>
                </div>
                <div style={{
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: '12px', padding: '1.5rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#7c3aed' }}>{savedTests.length}</div>
                  <div style={{ color: '#7c3aed', fontWeight: '600' }}>Saved Tests</div>
                  <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem' }}>In test suite</div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                textAlign: 'center', padding: '2rem',
                borderTop: '1px solid rgba(255,255,255,0.05)', color: '#666', fontSize: '0.85rem'
              }}>
                <p style={{ margin: '0 0 0.5rem' }}>
                  Built for testing Boomi Integration Platform
                </p>
                <p style={{ margin: 0 }}>
                  Version 1.0.0 • React + Node.js • MIT License
                </p>
              </div>
            </div>
          )}

          {/* Web Services Tab */}
          {activeTab === 'webservices' && (
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>Web Service Test</h2>
                <button style={btnPrimary} onClick={() => saveTest('webservice')}>Save to Suite</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Test Name</label>
                  <input type="text" value={wsForm.name} onChange={e => setWsForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Get Customer API" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>HTTP Method</label>
                  <select value={wsForm.method} onChange={e => setWsForm(p => ({ ...p, method: e.target.value }))} style={selectStyle}>
                    <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Endpoint URL</label>
                <input type="text" value={wsForm.endpoint} onChange={e => setWsForm(p => ({ ...p, endpoint: e.target.value }))}
                  placeholder="https://api.example.com/v1/resource" style={{ ...inputStyle, color: '#00c8ff' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Headers (JSON)</label>
                  <textarea value={wsForm.headers} onChange={e => setWsForm(p => ({ ...p, headers: e.target.value }))} style={textareaStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Body (JSON)</label>
                  <textarea value={wsForm.body} onChange={e => setWsForm(p => ({ ...p, body: e.target.value }))}
                    placeholder='{"key": "value"}' style={textareaStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Expected Status</label>
                  <input type="text" value={wsForm.expectedStatus} onChange={e => setWsForm(p => ({ ...p, expectedStatus: e.target.value }))}
                    style={{ ...inputStyle, color: '#22c55e' }} />
                </div>
                <div>
                  <label style={labelStyle}>Timeout (ms)</label>
                  <input type="text" value={wsForm.timeout} onChange={e => setWsForm(p => ({ ...p, timeout: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Auth Type</label>
                  <select style={selectStyle}><option>None</option><option>Basic</option><option>Bearer</option><option>API Key</option></select>
                </div>
              </div>

              {/* Assertions */}
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#7c3aed' }}>Response Assertions</h3>
                  <button onClick={addAssertion} style={{
                    background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: '4px', padding: '0.4rem 0.8rem', color: '#7c3aed',
                    fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>+ Add</button>
                </div>

                {wsForm.assertions.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '0.85rem' }}>No assertions. Add to validate response.</p>
                ) : (
                  wsForm.assertions.map(a => (
                    <div key={a.id} style={{
                      display: 'grid', gridTemplateColumns: '100px 1fr 100px 1fr auto',
                      gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem',
                      padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px'
                    }}>
                      <select value={a.type} onChange={e => updateAssertion(a.id, 'type', e.target.value)} style={{ ...selectStyle, padding: '0.5rem' }}>
                        <option value="jsonPath">JSON Path</option><option value="header">Header</option><option value="responseTime">Time</option>
                      </select>
                      <input type="text" placeholder="$.data.id" value={a.path} onChange={e => updateAssertion(a.id, 'path', e.target.value)}
                        style={{ ...inputStyle, padding: '0.5rem' }} />
                      <select value={a.operator} onChange={e => updateAssertion(a.id, 'operator', e.target.value)} style={{ ...selectStyle, padding: '0.5rem' }}>
                        <option value="equals">Equals</option><option value="contains">Contains</option><option value="exists">Exists</option>
                        <option value="greaterThan">&gt;</option><option value="lessThan">&lt;</option>
                      </select>
                      <input type="text" placeholder="Expected" value={a.expected} onChange={e => updateAssertion(a.id, 'expected', e.target.value)}
                        style={{ ...inputStyle, padding: '0.5rem' }} />
                      <button onClick={() => removeAssertion(a.id)} style={{
                        background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: '4px',
                        padding: '0.4rem 0.6rem', color: '#ef4444', cursor: 'pointer'
                      }}>×</button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button onClick={runWebServiceTest} disabled={isRunning || !wsForm.endpoint}
                  style={{ ...btnSuccess, opacity: isRunning || !wsForm.endpoint ? 0.5 : 1 }}>
                  {isRunning ? '⟳ Running...' : '▶ Run Test'}
                </button>
              </div>
            </div>
          )}

          {/* Scheduled Jobs Tab */}
          {activeTab === 'schedules' && (
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>Scheduled Job Test</h2>
                <button style={btnPrimary} onClick={() => saveTest('schedule')}>Save to Suite</button>
              </div>

              {!backendStatus.boomiConfigured && (
                <div style={{
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem',
                  color: '#f59e0b', fontSize: '0.9rem'
                }}>
                  ⚠️ Boomi not configured. Add credentials to backend/.env file.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Test Name</label>
                  <input type="text" value={scheduleForm.name} onChange={e => setScheduleForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Daily Sync Test" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Process ID (Component ID)</label>
                  <input type="text" value={scheduleForm.processId} onChange={e => setScheduleForm(p => ({ ...p, processId: e.target.value }))}
                    placeholder="Paste your Process Component ID here" style={{ ...inputStyle, color: '#00c8ff' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Atom ID (Optional)</label>
                  <input type="text" value={scheduleForm.atomId} onChange={e => setScheduleForm(p => ({ ...p, atomId: e.target.value }))}
                    placeholder="Uses default from .env" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Timeout (ms)</label>
                  <input type="text" value={scheduleForm.timeout} onChange={e => setScheduleForm(p => ({ ...p, timeout: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Retry Count</label>
                  <input type="text" defaultValue="3" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Input Data (Process Properties)</label>
                  <textarea value={scheduleForm.inputData} onChange={e => setScheduleForm(p => ({ ...p, inputData: e.target.value }))}
                    placeholder='{"startDate": "2024-01-01"}' style={textareaStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Expected Output</label>
                  <textarea value={scheduleForm.expectedOutput} onChange={e => setScheduleForm(p => ({ ...p, expectedOutput: e.target.value }))} style={textareaStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Test Options</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
                  background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={scheduleForm.options.captureExecutionLogs}
                      onChange={e => setScheduleForm(p => ({ ...p, options: { ...p.options, captureExecutionLogs: e.target.checked } }))}
                      style={{ accentColor: '#00c8ff' }} />
                    Capture Logs
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={scheduleForm.options.validateDataIntegrity}
                      onChange={e => setScheduleForm(p => ({ ...p, options: { ...p.options, validateDataIntegrity: e.target.checked } }))}
                      style={{ accentColor: '#00c8ff' }} />
                    Validate Data
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={scheduleForm.options.testRetryLogic}
                      onChange={e => setScheduleForm(p => ({ ...p, options: { ...p.options, testRetryLogic: e.target.checked } }))}
                      style={{ accentColor: '#00c8ff' }} />
                    Test Retry
                  </label>
                </div>
              </div>

              {/* Running Status Display */}
              {isRunning && runningStatus && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(0,200,255,0.1)',
                  border: '1px solid rgba(0,200,255,0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: '#00c8ff',
                      animation: 'pulse 1.5s infinite'
                    }} />
                    <span style={{ color: '#00c8ff', fontWeight: '600', fontSize: '0.9rem' }}>
                      {runningStatus.phase === 'executing' ? 'Executing Process...' :
                       runningStatus.phase === 'polling' ? 'Waiting for Completion...' :
                       runningStatus.phase === 'logs' ? 'Fetching Logs...' :
                       runningStatus.phase === 'validating' ? 'Validating Results...' :
                       'Running...'}
                    </span>
                  </div>
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>
                    {runningStatus.message}
                  </div>
                  {runningStatus.poll && runningStatus.maxPolls && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{
                        height: '4px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(runningStatus.poll / runningStatus.maxPolls) * 100}%`,
                          background: 'linear-gradient(90deg, #00c8ff, #7c3aed)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Poll {runningStatus.poll} of {runningStatus.maxPolls}
                        {runningStatus.boomiStatus && ` • Boomi Status: ${runningStatus.boomiStatus}`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button onClick={runScheduledJobTest} disabled={isRunning || !scheduleForm.processId}
                  style={{ ...btnSuccess, opacity: isRunning || !scheduleForm.processId ? 0.5 : 1 }}>
                  {isRunning ? '⟳ Running...' : '▶ Run Test'}
                </button>
              </div>
            </div>
          )}

          {/* Event Streams Tab */}
          {activeTab === 'events' && (
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>Event Stream Test</h2>
                <button style={btnPrimary} onClick={() => saveTest('event')}>Save to Suite</button>
              </div>

              {/* Test Type Selector */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                  { id: 'publish', label: '📤 Publish Only', desc: 'Send message to topic' },
                  { id: 'publish-verify', label: '📤📥 Publish & Verify', desc: 'Send then check consumer' },
                  { id: 'roundtrip', label: '🔄 Round-Trip', desc: 'Full end-to-end test' }
                ].map(type => (
                  <button key={type.id} onClick={() => setEventForm(p => ({ ...p, testType: type.id }))}
                    style={{
                      padding: '0.75rem 1rem',
                      background: eventForm.testType === type.id 
                        ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' 
                        : 'rgba(255,255,255,0.05)',
                      border: eventForm.testType === type.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: eventForm.testType === type.id ? '#fff' : '#888',
                      fontWeight: eventForm.testType === type.id ? '600' : '400',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
                      flex: 1, textAlign: 'center'
                    }}>
                    <div>{type.label}</div>
                    <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.8 }}>{type.desc}</div>
                  </button>
                ))}
              </div>

              {/* Real Boomi Event Streams API Config */}
              <div style={{
                marginBottom: '1.5rem', padding: '1rem',
                background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)',
                borderRadius: '8px'
              }}>
                <label style={{ ...labelStyle, color: '#ec4899', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>🔗</span> Boomi Event Streams API (Publish)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>
                      REST API URL * 
                      <span style={{ color: '#f59e0b', marginLeft: '0.5rem' }}>
                        (Copy the {eventForm.messageFormat === 'single' ? 'Single Message' : 'Multiple Messages'} URL)
                      </span>
                    </label>
                    <input type="text" value={eventForm.apiUrl} 
                      onChange={e => setEventForm(p => ({ ...p, apiUrl: e.target.value }))}
                      placeholder={eventForm.messageFormat === 'single' 
                        ? "https://.../rest/singlemsg/.../TopicName" 
                        : "https://.../rest/.../TopicName"} 
                      style={{ ...inputStyle, color: '#ec4899' }} />
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#888' }}>
                      Event Streams → Topic → Click "View REST" → Copy URL from "{eventForm.messageFormat === 'single' ? 'Single Message' : 'Multiple Messages'}" tab
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Environment Token *</label>
                    <input type="password" value={eventForm.envToken} 
                      onChange={e => setEventForm(p => ({ ...p, envToken: e.target.value }))}
                      placeholder="Environment token (Bearer auth)" 
                      style={inputStyle} />
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                      From Event Streams → Environment → Tokens
                    </p>
                  </div>
                </div>
              </div>

              {/* Consumer/Verification Config - only for publish-verify and roundtrip */}
              {(eventForm.testType === 'publish-verify' || eventForm.testType === 'roundtrip') && (
                <div style={{
                  marginBottom: '1.5rem', padding: '1rem',
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '8px'
                }}>
                  <label style={{ ...labelStyle, color: '#22c55e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>📥</span> Consumer/Verification Endpoint
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Consumer API Endpoint</label>
                      <input type="text" value={eventForm.consumerEndpoint} 
                        onChange={e => setEventForm(p => ({ ...p, consumerEndpoint: e.target.value }))}
                        placeholder="https://your-atom/ws/rest/consume-messages" 
                        style={{ ...inputStyle, color: '#22c55e' }} />
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                        Boomi process that consumes from the topic and returns messages
                      </p>
                    </div>
                    <div>
                      <label style={labelStyle}>API Auth (Optional)</label>
                      <input type="password" value={eventForm.consumerApiKey} 
                        onChange={e => setEventForm(p => ({ ...p, consumerApiKey: e.target.value }))}
                        placeholder="Basic auth or API key" 
                        style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Verify Delay (ms)</label>
                      <input type="text" value={eventForm.verifyDelay} 
                        onChange={e => setEventForm(p => ({ ...p, verifyDelay: e.target.value }))}
                        placeholder="2000" 
                        style={inputStyle} />
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: '#666' }}>
                        Wait time before checking consumer
                      </p>
                    </div>
                    <div>
                      <label style={labelStyle}>Expected Content (Optional)</label>
                      <input type="text" value={eventForm.expectedInMessage} 
                        onChange={e => setEventForm(p => ({ ...p, expectedInMessage: e.target.value }))}
                        placeholder="orderId or text to find" 
                        style={inputStyle} />
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: '#666' }}>
                        Verify this text appears in consumed message
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Test Name</label>
                  <input type="text" value={eventForm.name} onChange={e => setEventForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Order Event Test" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Topic Name</label>
                  <input type="text" value={eventForm.topic} onChange={e => setEventForm(p => ({ ...p, topic: e.target.value }))}
                    placeholder="Orders" style={{ ...inputStyle, color: '#00c8ff' }} />
                </div>
                <div>
                  <label style={labelStyle}>Message Format</label>
                  <select value={eventForm.messageFormat} onChange={e => setEventForm(p => ({ ...p, messageFormat: e.target.value }))} style={selectStyle}>
                    <option value="single">Single Message (adds /single to URL)</option>
                    <option value="multiple">Multiple Messages (wraps in messages array)</option>
                  </select>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: '#666' }}>
                    {eventForm.messageFormat === 'single' 
                      ? 'Sends raw JSON payload directly' 
                      : 'Wraps payload in {"messages":[{"payload":"..."}]}'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Partition Key</label>
                  <input type="text" value={eventForm.partitionKey} onChange={e => setEventForm(p => ({ ...p, partitionKey: e.target.value }))}
                    placeholder="customerId (optional)" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Timeout (ms)</label>
                  <input type="text" value={eventForm.timeout} onChange={e => setEventForm(p => ({ ...p, timeout: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Event Type</label>
                  <select value={eventForm.eventType} onChange={e => setEventForm(p => ({ ...p, eventType: e.target.value }))} style={selectStyle}>
                    <option value="publish">Publish</option>
                    <option value="subscribe">Subscribe (Simulated)</option>
                    <option value="roundtrip">Round-Trip (Simulated)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Message Payload (JSON)</label>
                  <textarea value={eventForm.payload} onChange={e => setEventForm(p => ({ ...p, payload: e.target.value }))} 
                    style={{ ...textareaStyle, minHeight: '150px' }} />
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                    Use {'{{uuid}}'}, {'{{now}}'}, {'{{timestamp}}'} for dynamic values
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>Message Properties (JSON) - Optional</label>
                  <textarea value={eventForm.messageProperties} 
                    onChange={e => setEventForm(p => ({ ...p, messageProperties: e.target.value }))}
                    placeholder='{"correlationId": "abc123", "source": "test-tool"}'
                    style={{ ...textareaStyle, minHeight: '80px' }} />
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                    Custom headers (x-msg-props-*)
                  </p>
                  
                  <label style={{ ...labelStyle, marginTop: '1rem' }}>Expected Events (for Subscribe/Round-Trip)</label>
                  <textarea value={eventForm.expectedEvents} onChange={e => setEventForm(p => ({ ...p, expectedEvents: e.target.value }))}
                    placeholder='[{"topic": "order.processed"}]' 
                    style={{ ...textareaStyle, minHeight: '60px' }} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Options</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
                  background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={eventForm.options.validateEventSchema}
                      onChange={e => setEventForm(p => ({ ...p, options: { ...p.options, validateEventSchema: e.target.checked } }))}
                      style={{ accentColor: '#ec4899' }} />
                    Validate JSON Schema
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={eventForm.options.testEventOrdering}
                      onChange={e => setEventForm(p => ({ ...p, options: { ...p.options, testEventOrdering: e.target.checked } }))}
                      style={{ accentColor: '#ec4899' }} />
                    Test Event Ordering
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ color: '#888', fontSize: '0.85rem' }}>Max Response Time:</label>
                    <input type="number" 
                      value={eventForm.options.maxResponseTime || ''} 
                      onChange={e => setEventForm(p => ({ 
                        ...p, 
                        options: { ...p.options, maxResponseTime: e.target.value ? parseInt(e.target.value) : null } 
                      }))}
                      placeholder="ms"
                      style={{ ...inputStyle, width: '80px', padding: '0.4rem' }} />
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              {!eventForm.apiUrl && !eventForm.envToken && (
                <div style={{
                  marginTop: '1rem', padding: '0.75rem',
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '6px', fontSize: '0.85rem', color: '#f59e0b'
                }}>
                  ⚠️ No API URL/Token provided - test will run in <strong>simulated mode</strong>. 
                  Add your Boomi Event Streams API URL and Token for real testing.
                </div>
              )}

              {eventForm.apiUrl && eventForm.envToken && (
                <div style={{
                  marginTop: '1rem', padding: '0.75rem',
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '6px', fontSize: '0.85rem', color: '#22c55e'
                }}>
                  ✓ Ready for <strong>real API testing</strong> - Message will be published to Boomi Event Streams
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button onClick={runEventStreamTest} 
                  disabled={isRunning || (!eventForm.apiUrl && !eventForm.topic)}
                  style={{ 
                    ...btnSuccess, 
                    background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                    opacity: isRunning || (!eventForm.apiUrl && !eventForm.topic) ? 0.5 : 1 
                  }}>
                  {isRunning ? '⟳ Publishing...' : '▶ Publish Message'}
                </button>
              </div>

              {/* Info Box */}
              <div style={{
                marginTop: '1.5rem', padding: '1rem',
                background: 'rgba(236,72,153,0.05)',
                border: '1px solid rgba(236,72,153,0.2)',
                borderRadius: '8px', fontSize: '0.85rem', color: '#888'
              }}>
                <strong style={{ color: '#ec4899' }}>How to Get Event Streams API URL & Token:</strong>
                <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                  <li>Go to <strong>Boomi Platform → Event Streams</strong></li>
                  <li>Select your <strong>Environment</strong></li>
                  <li>Click on your <strong>Topic</strong> (e.g., Orders)</li>
                  <li>Copy the <strong>REST API URL</strong></li>
                  <li>Go to <strong>Environment → Tokens</strong> → Create/Copy token</li>
                </ol>
              </div>
            </div>
          )}

          {/* AI Agents Tab */}
          {activeTab === 'agents' && (
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>AI Agent Test</h2>
                <button style={btnPrimary} onClick={() => saveTest('agent')}>Save to Suite</button>
              </div>

              {/* Info Banner */}
              <div style={{
                marginBottom: '1.5rem', padding: '1rem',
                background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: '8px', fontSize: '0.85rem'
              }}>
                <strong style={{ color: '#7c3aed' }}>💡 How to Test Boomi AI Agents:</strong>
                <p style={{ margin: '0.5rem 0 0', color: '#888' }}>
                  Boomi AI Agents don't have direct API endpoints. Create a <strong>wrapper process</strong> with Web Services Server + Agent Step, 
                  deploy it, then test the web service endpoint here.
                </p>
              </div>

              {/* Test Type Selector */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                  { id: 'api', label: '🌐 Web Service API', desc: 'Call wrapper process (Recommended)' },
                  { id: 'process', label: '⚙️ Execute Process', desc: 'Direct AtomSphere API call' }
                ].map(type => (
                  <button key={type.id} onClick={() => setAgentForm(p => ({ ...p, testType: type.id }))}
                    style={{
                      padding: '0.75rem 1rem',
                      background: agentForm.testType === type.id 
                        ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' 
                        : 'rgba(255,255,255,0.05)',
                      border: agentForm.testType === type.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: agentForm.testType === type.id ? '#fff' : '#888',
                      fontWeight: agentForm.testType === type.id ? '600' : '400',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
                      flex: 1, textAlign: 'center'
                    }}>
                    <div>{type.label}</div>
                    <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.8 }}>{type.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Test Name</label>
                  <input type="text" value={agentForm.name} onChange={e => setAgentForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Customer Support Agent Test" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Timeout (ms)</label>
                  <input type="text" value={agentForm.timeout} onChange={e => setAgentForm(p => ({ ...p, timeout: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              {/* API-based config (Recommended) */}
              {agentForm.testType === 'api' && (
                <div style={{
                  marginBottom: '1.5rem', padding: '1rem',
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '8px'
                }}>
                  <label style={{ ...labelStyle, color: '#22c55e', marginBottom: '0.75rem' }}>🌐 Web Service Endpoint</label>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Agent Wrapper URL *</label>
                    <input type="text" value={agentForm.agentEndpoint} onChange={e => setAgentForm(p => ({ ...p, agentEndpoint: e.target.value }))}
                      placeholder="https://c01-usa-east.integrate.boomi.com/ws/rest/YOUR_ACCOUNT/your-agent-process" 
                      style={{ ...inputStyle, color: '#22c55e' }} />
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                      Web Service URL of your wrapper process (with Agent Step)
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Auth Type</label>
                      <select value={agentForm.authType} onChange={e => setAgentForm(p => ({ ...p, authType: e.target.value }))} style={selectStyle}>
                        <option value="basic">Basic Auth</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="none">No Auth</option>
                      </select>
                    </div>
                    {agentForm.authType === 'basic' && (
                      <>
                        <div>
                          <label style={labelStyle}>Username</label>
                          <input type="text" value={agentForm.authUsername} onChange={e => setAgentForm(p => ({ ...p, authUsername: e.target.value }))}
                            placeholder="Boomi username" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Password</label>
                          <input type="password" value={agentForm.authPassword} onChange={e => setAgentForm(p => ({ ...p, authPassword: e.target.value }))}
                            placeholder="Boomi password or token" style={inputStyle} />
                        </div>
                      </>
                    )}
                    {agentForm.authType === 'bearer' && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Bearer Token</label>
                        <input type="password" value={agentForm.agentApiKey} onChange={e => setAgentForm(p => ({ ...p, agentApiKey: e.target.value }))}
                          placeholder="Your API token" style={inputStyle} />
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <label style={labelStyle}>HTTP Method</label>
                    <select value={agentForm.httpMethod} onChange={e => setAgentForm(p => ({ ...p, httpMethod: e.target.value }))} style={{ ...selectStyle, width: '120px' }}>
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Process-based config (Legacy) */}
              {agentForm.testType === 'process' && (
                <div style={{
                  marginBottom: '1.5rem', padding: '1rem',
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '8px'
                }}>
                  <label style={{ ...labelStyle, color: '#f59e0b', marginBottom: '0.75rem' }}>⚙️ Execute Process Configuration</label>
                  <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>
                    ⚠️ This method executes a process directly via AtomSphere API. The process must be deployed and configured to accept input documents.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Process ID *</label>
                      <input type="text" value={agentForm.processId} onChange={e => setAgentForm(p => ({ ...p, processId: e.target.value }))}
                        placeholder="e.g., abc123-def456-ghi789" style={{ ...inputStyle, color: '#f59e0b' }} />
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                        Component ID from Build page URL
                      </p>
                    </div>
                    <div>
                      <label style={labelStyle}>Atom ID</label>
                      <input type="text" value={agentForm.atomId} onChange={e => setAgentForm(p => ({ ...p, atomId: e.target.value }))}
                        placeholder="Uses BOOMI_ATOM_ID from .env" style={inputStyle} />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Test Prompt</label>
                <textarea value={agentForm.prompt} onChange={e => setAgentForm(p => ({ ...p, prompt: e.target.value }))}
                  placeholder="Enter the prompt/question to send to the AI Agent..."
                  style={{ ...textareaStyle, minHeight: '80px', color: '#f59e0b' }} />
              </div>

              {agentForm.testType === 'api' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Request Body Template (JSON)</label>
                  <textarea value={agentForm.requestBodyTemplate} onChange={e => setAgentForm(p => ({ ...p, requestBodyTemplate: e.target.value }))}
                    placeholder='{"prompt": "{{prompt}}", "context": {}}'
                    style={{ ...textareaStyle, minHeight: '80px' }} />
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                    Use <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{'{{prompt}}'}</code> to insert the test prompt
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Expected Behavior (JSON)</label>
                  <textarea value={agentForm.expectedBehavior} onChange={e => setAgentForm(p => ({ ...p, expectedBehavior: e.target.value }))}
                    style={textareaStyle} />
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                    shouldContain, shouldNotContain, maxResponseTime
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>Conversation History (JSON Array)</label>
                  <textarea value={agentForm.conversationHistory} onChange={e => setAgentForm(p => ({ ...p, conversationHistory: e.target.value }))}
                    placeholder='[{"role": "user", "content": "Hi"}]'
                    style={textareaStyle} />
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                    For multi-turn conversation testing
                  </p>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Test Options</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
                  background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={agentForm.options.validateGuardrails}
                      onChange={e => setAgentForm(p => ({ ...p, options: { ...p.options, validateGuardrails: e.target.checked } }))}
                      style={{ accentColor: '#7c3aed' }} />
                    Validate Guardrails
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={agentForm.options.testMultiTurn}
                      onChange={e => setAgentForm(p => ({ ...p, options: { ...p.options, testMultiTurn: e.target.checked } }))}
                      style={{ accentColor: '#7c3aed' }} />
                    Multi-Turn Test
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={agentForm.options.captureTrace}
                      onChange={e => setAgentForm(p => ({ ...p, options: { ...p.options, captureTrace: e.target.checked } }))}
                      style={{ accentColor: '#7c3aed' }} />
                    Capture Trace
                  </label>
                </div>
              </div>

              {/* Running Status Display */}
              {isRunning && runningStatus && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: '#7c3aed',
                      animation: 'pulse 1.5s infinite'
                    }} />
                    <span style={{ color: '#7c3aed', fontWeight: '600', fontSize: '0.9rem' }}>
                      {runningStatus.phase === 'invoking' ? 'Invoking AI Agent...' :
                       runningStatus.phase === 'waiting' ? 'Waiting for Response...' :
                       runningStatus.phase === 'validating' ? 'Validating Response...' :
                       'Running...'}
                    </span>
                  </div>
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>
                    {runningStatus.message}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button onClick={runAIAgentTest} 
                  disabled={isRunning || (agentForm.testType === 'process' ? !agentForm.processId : !agentForm.agentEndpoint)}
                  style={{ 
                    ...btnSuccess, 
                    background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                    opacity: isRunning || (agentForm.testType === 'process' ? !agentForm.processId : !agentForm.agentEndpoint) ? 0.5 : 1 
                  }}>
                  {isRunning ? '⟳ Running...' : '▶ Run Agent Test'}
                </button>
              </div>

              {/* Info Box */}
              <div style={{
                marginTop: '1.5rem', padding: '1rem',
                background: 'rgba(0,200,255,0.05)',
                border: '1px solid rgba(0,200,255,0.2)',
                borderRadius: '8px', fontSize: '0.85rem', color: '#888'
              }}>
                <strong style={{ color: '#00c8ff' }}>How to Test Boomi AI Agents:</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                  <li><strong>Process Method:</strong> Create a Boomi process with an Agent Step that calls your AI Agent, then test that process here.</li>
                  <li><strong>API Method:</strong> If your agent is exposed via REST API (e.g., through API Management), test it directly.</li>
                  <li><strong>Validations:</strong> Check response content, timing, guardrails behavior, and multi-turn conversations.</li>
                </ul>
              </div>
            </div>
          )}

          {/* CI/CD Tab */}
          {activeTab === 'cicd' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
                  CI/CD - Deployment Automation
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={loadCicdData} style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px', padding: '0.5rem 1rem', color: '#e0e0e0',
                    fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>↻ Refresh</button>
                </div>
              </div>

              {!backendStatus.boomiConfigured && (
                <div style={{
                  padding: '1.5rem', marginBottom: '1.5rem',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px', color: '#ef4444'
                }}>
                  <strong>⚠ Boomi Not Configured</strong>
                  <p style={{ margin: '0.5rem 0 0', color: '#888' }}>
                    CI/CD features require Boomi credentials. Please configure your .env file with BOOMI_ACCOUNT_ID, BOOMI_USERNAME, and BOOMI_PASSWORD.
                  </p>
                </div>
              )}

              {/* Action Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {['package', 'deploy', 'pipeline'].map(action => (
                  <button key={action} onClick={() => setCicdForm(p => ({ ...p, action }))}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: cicdForm.action === action 
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                        : 'rgba(255,255,255,0.05)',
                      border: cicdForm.action === action ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: cicdForm.action === action ? '#0d0d14' : '#888',
                      fontWeight: cicdForm.action === action ? '600' : '400',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem'
                    }}>
                    {action === 'package' ? '📦 Create Package' : 
                     action === 'deploy' ? '🚀 Deploy' : 
                     '⚡ Full Pipeline'}
                  </button>
                ))}
              </div>

              {/* Package Action */}
              {cicdForm.action === 'package' && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem'
                }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#f59e0b' }}>Create Packaged Component</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Component ID *</label>
                      <input type="text" value={cicdForm.componentId} 
                        onChange={e => setCicdForm(p => ({ ...p, componentId: e.target.value }))}
                        placeholder="Process or Component ID" 
                        style={{ ...inputStyle, color: '#f59e0b' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Package Version</label>
                      <input type="text" value={cicdForm.packageVersion} 
                        onChange={e => setCicdForm(p => ({ ...p, packageVersion: e.target.value }))}
                        placeholder="e.g., v1.0.0 (auto-generated if empty)" 
                        style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Package Notes</label>
                    <textarea value={cicdForm.packageNotes} 
                      onChange={e => setCicdForm(p => ({ ...p, packageNotes: e.target.value }))}
                      placeholder="Release notes for this package version..."
                      style={{ ...textareaStyle, minHeight: '80px' }} />
                  </div>

                  <button onClick={createPackage} disabled={isRunning || !cicdForm.componentId}
                    style={{ ...btnSuccess, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                      opacity: isRunning || !cicdForm.componentId ? 0.5 : 1 }}>
                    {isRunning ? '⟳ Creating...' : '📦 Create Package'}
                  </button>
                </div>
              )}

              {/* Deploy Action */}
              {cicdForm.action === 'deploy' && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem'
                }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#22c55e' }}>Deploy Package to Environment</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Environment *</label>
                      <select value={cicdForm.environmentId} 
                        onChange={e => setCicdForm(p => ({ ...p, environmentId: e.target.value }))}
                        style={selectStyle}>
                        <option value="">Select Environment...</option>
                        {environments.map(env => (
                          <option key={env.id} value={env.id}>{env.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Package to Deploy *</label>
                      <select value={cicdForm.selectedPackageId || ''} 
                        onChange={e => setCicdForm(p => ({ ...p, selectedPackageId: e.target.value }))}
                        style={selectStyle}>
                        <option value="">Select Package...</option>
                        {packages.map(pkg => (
                          <option key={pkg.packageId} value={pkg.packageId}>
                            {pkg.componentName || pkg.componentId} - {pkg.packageVersion}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Listener Status</label>
                      <select value={cicdForm.listenerStatus} 
                        onChange={e => setCicdForm(p => ({ ...p, listenerStatus: e.target.value }))}
                        style={selectStyle}>
                        <option value="RUNNING">RUNNING - Start listeners immediately</option>
                        <option value="PAUSED">PAUSED - Deploy but don't start listeners</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Deployment Notes</label>
                      <input type="text" value={cicdForm.deployNotes} 
                        onChange={e => setCicdForm(p => ({ ...p, deployNotes: e.target.value }))}
                        placeholder="Deployment notes..." 
                        style={inputStyle} />
                    </div>
                  </div>

                  <button onClick={deployPackage} disabled={isRunning || !cicdForm.environmentId || !cicdForm.selectedPackageId}
                    style={{ ...btnSuccess, opacity: isRunning || !cicdForm.environmentId || !cicdForm.selectedPackageId ? 0.5 : 1 }}>
                    {isRunning ? '⟳ Deploying...' : '🚀 Deploy Package'}
                  </button>
                </div>
              )}

              {/* Pipeline Action */}
              {cicdForm.action === 'pipeline' && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem'
                }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#8b5cf6' }}>Run Full CI/CD Pipeline</h3>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#666' }}>
                    Package component → Deploy to environment → Run tests (optional)
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Component ID *</label>
                      <input type="text" value={cicdForm.componentId} 
                        onChange={e => setCicdForm(p => ({ ...p, componentId: e.target.value }))}
                        placeholder="Process or Component ID" 
                        style={{ ...inputStyle, color: '#8b5cf6' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Package Version</label>
                      <input type="text" value={cicdForm.packageVersion} 
                        onChange={e => setCicdForm(p => ({ ...p, packageVersion: e.target.value }))}
                        placeholder="Auto-generated if empty" 
                        style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Target Environment *</label>
                      <select value={cicdForm.environmentId} 
                        onChange={e => setCicdForm(p => ({ ...p, environmentId: e.target.value }))}
                        style={selectStyle}>
                        <option value="">Select Environment...</option>
                        {environments.map(env => (
                          <option key={env.id} value={env.id}>{env.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Listener Status</label>
                      <select value={cicdForm.listenerStatus} 
                        onChange={e => setCicdForm(p => ({ ...p, listenerStatus: e.target.value }))}
                        style={selectStyle}>
                        <option value="RUNNING">RUNNING</option>
                        <option value="PAUSED">PAUSED</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={cicdForm.runTests}
                        onChange={e => setCicdForm(p => ({ ...p, runTests: e.target.checked }))}
                        style={{ accentColor: '#8b5cf6' }} />
                      Run tests after deployment
                    </label>
                  </div>

                  {/* Pipeline Status */}
                  {isRunning && runningStatus?.phase === 'pipeline' && (
                    <div style={{
                      marginBottom: '1rem', padding: '1rem',
                      background: 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '12px', height: '12px', borderRadius: '50%',
                          background: '#8b5cf6', animation: 'pulse 1.5s infinite'
                        }} />
                        <span style={{ color: '#8b5cf6', fontWeight: '600' }}>{runningStatus.message}</span>
                      </div>
                    </div>
                  )}

                  <button onClick={runPipeline} disabled={isRunning || !cicdForm.componentId || !cicdForm.environmentId}
                    style={{ 
                      ...btnSuccess, 
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                      opacity: isRunning || !cicdForm.componentId || !cicdForm.environmentId ? 0.5 : 1 
                    }}>
                    {isRunning ? '⟳ Running Pipeline...' : '⚡ Run Pipeline'}
                  </button>
                </div>
              )}

              {/* Environment & Deployment Overview */}
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#888' }}>Environments & Deployments</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Environments List */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)', padding: '1rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#00c8ff' }}>
                      Environments ({environments.length})
                    </h4>
                    {environments.length === 0 ? (
                      <p style={{ color: '#666', fontSize: '0.85rem' }}>No environments found</p>
                    ) : (
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {environments.map(env => (
                          <div key={env.id} style={{
                            padding: '0.5rem', marginBottom: '0.5rem',
                            background: 'rgba(0,0,0,0.2)', borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            <div style={{ color: '#e0e0e0', fontWeight: '500' }}>{env.name}</div>
                            <div style={{ color: '#666', fontSize: '0.75rem' }}>{env.id}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Packages */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)', padding: '1rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#f59e0b' }}>
                      Recent Packages ({packages.length})
                    </h4>
                    {packages.length === 0 ? (
                      <p style={{ color: '#666', fontSize: '0.85rem' }}>No packages found</p>
                    ) : (
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {packages.slice(0, 10).map(pkg => (
                          <div key={pkg.packageId} style={{
                            padding: '0.5rem', marginBottom: '0.5rem',
                            background: 'rgba(0,0,0,0.2)', borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            <div style={{ color: '#e0e0e0', fontWeight: '500' }}>
                              {pkg.packageVersion}
                            </div>
                            <div style={{ color: '#666', fontSize: '0.75rem' }}>
                              {pkg.componentName || pkg.componentId}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CI/CD Results */}
              {cicdResults.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#888' }}>CI/CD Activity Log</h3>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {cicdResults.map((result, i) => (
                      <div key={i} style={{
                        padding: '1rem', marginBottom: '0.5rem',
                        background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                        border: `1px solid ${result.status === 'success' ? 'rgba(34,197,94,0.3)' : 
                          result.status === 'partial' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ 
                              color: result.status === 'success' ? '#22c55e' : 
                                result.status === 'partial' ? '#f59e0b' : '#ef4444',
                              fontWeight: '600'
                            }}>
                              {result.type === 'package' ? '📦 Package' : 
                               result.type === 'deploy' ? '🚀 Deploy' : '⚡ Pipeline'}
                            </span>
                            <span style={{ color: '#888', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                              {result.status}
                            </span>
                          </div>
                          <span style={{ color: '#666', fontSize: '0.75rem' }}>
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {result.error && (
                          <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.85rem' }}>
                            {result.error}
                          </div>
                        )}
                        {result.data && (
                          <div style={{ marginTop: '0.5rem', color: '#888', fontSize: '0.8rem' }}>
                            {result.data.packageId && <div>Package ID: {result.data.packageId}</div>}
                            {result.data.deploymentId && <div>Deployment ID: {result.data.deploymentId}</div>}
                            {result.data.pipelineId && <div>Pipeline ID: {result.data.pipelineId}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CI/CD Info Box */}
              <div style={{
                marginTop: '2rem', padding: '1rem',
                background: 'rgba(245,158,11,0.05)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: '8px', fontSize: '0.85rem', color: '#888'
              }}>
                <strong style={{ color: '#f59e0b' }}>CI/CD Automation Guide:</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                  <li><strong>Create Package:</strong> Create a versioned snapshot of your process/component</li>
                  <li><strong>Deploy:</strong> Deploy a package to a specific environment</li>
                  <li><strong>Pipeline:</strong> Automate the full flow: package → deploy → test</li>
                  <li><strong>External CI/CD:</strong> Use the API endpoints with GitHub Actions, Jenkins, or Azure DevOps</li>
                </ul>
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>Test Results</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setResults([])} style={btnDanger}>Clear</button>
                  <button onClick={() => {
                    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'test-results.json';
                    a.click();
                  }} style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px', padding: '0.5rem 1rem', color: '#e0e0e0',
                    fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>Export</button>
                </div>
              </div>

              {results.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>◆</div>
                  <p>No results yet. Run some tests!</p>
                </div>
              ) : (
                results.map((r, i) => (
                  <div key={i}>
                    <div onClick={() => setExpandedResult(expandedResult === i ? null : i)} style={{
                      background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                      border: `1px solid ${r.status === 'passed' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      padding: '1rem', marginBottom: '0.5rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: r.status === 'passed' ? '#22c55e' : '#ef4444'
                        }} />
                        <div>
                          <div style={{ fontWeight: '500' }}>{r.testName}</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            {r.type} • {new Date(r.startTime).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase',
                            color: r.status === 'passed' ? '#22c55e' : '#ef4444'
                          }}>{r.status}</div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>{r.duration}ms</div>
                        </div>
                        <div style={{
                          background: 'rgba(255,255,255,0.05)', borderRadius: '4px',
                          padding: '0.5rem', fontSize: '0.8rem'
                        }}>
                          {r.assertions?.filter(a => a.passed).length || 0}/{r.assertions?.length || 0}
                        </div>
                        <span style={{ color: '#666' }}>{expandedResult === i ? '▼' : '▶'}</span>
                      </div>
                    </div>

                    {expandedResult === i && (
                      <div style={{
                        background: 'rgba(0,0,0,0.2)', borderRadius: '0 0 8px 8px',
                        padding: '1rem', marginTop: '-0.5rem', marginBottom: '1rem'
                      }}>
                        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#888' }}>Assertions</h4>
                        {r.assertions?.map((a, j) => (
                          <div key={j} style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)'
                          }}>
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '50%',
                              background: a.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                              color: a.passed ? '#22c55e' : '#ef4444',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'
                            }}>{a.passed ? '✓' : '✗'}</div>
                            <span style={{ flex: 1, fontSize: '0.85rem' }}>{a.name}</span>
                            <span style={{ fontSize: '0.8rem', color: '#666' }}>Expected: {String(a.expected).slice(0, 30)}</span>
                            <span style={{ fontSize: '0.8rem', color: a.passed ? '#22c55e' : '#ef4444' }}>
                              Actual: {String(a.actual).slice(0, 30)}
                            </span>
                          </div>
                        ))}

                        {r.output && (
                          <>
                            <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.9rem', color: '#888' }}>Output</h4>
                            <div style={{
                              background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '1rem',
                              fontSize: '0.8rem', color: '#888', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap'
                            }}>{JSON.stringify(r.output, null, 2)}</div>
                          </>
                        )}

                        {r.logs && (
                          <>
                            <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.9rem', color: '#888' }}>Logs</h4>
                            <div style={{
                              background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '1rem',
                              fontSize: '0.8rem', color: '#888', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap'
                            }}>{r.logs}</div>
                          </>
                        )}

                        {r.error && (
                          <>
                            <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.9rem', color: '#ef4444' }}>Error</h4>
                            <div style={{
                              background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '1rem',
                              fontSize: '0.8rem', color: '#ef4444'
                            }}>{r.error}</div>
                          </>
                        )}

                        {r.response && (
                          <>
                            <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.9rem', color: '#888' }}>Response</h4>
                            <div style={{
                              background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '1rem',
                              fontSize: '0.8rem', color: '#888', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap'
                            }}>{JSON.stringify(r.response, null, 2)}</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Test Suite Tab */}
          {activeTab === 'suite' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>Test Suite</h2>
                <button onClick={runAllTests} disabled={isRunning || savedTests.length === 0}
                  style={{ ...btnSuccess, opacity: isRunning || savedTests.length === 0 ? 0.5 : 1 }}>
                  {isRunning ? '⟳ Running...' : '▶ Run All'}
                </button>
              </div>

              {savedTests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>▣</div>
                  <p>No tests saved. Create and save tests from other tabs.</p>
                </div>
              ) : (
                savedTests.map((t, i) => (
                  <div key={t.id} style={{
                    background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)', padding: '1rem',
                    marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: t.type === 'webservice' ? 'rgba(0,200,255,0.2)' :
                          t.type === 'schedule' ? 'rgba(245,158,11,0.2)' : 'rgba(236,72,153,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: t.type === 'webservice' ? '#00c8ff' : t.type === 'schedule' ? '#f59e0b' : '#ec4899'
                      }}>
                        {t.type === 'webservice' ? '◇' : t.type === 'schedule' ? '◈' : '◉'}
                      </div>
                      <div>
                        <div style={{ fontWeight: '500' }}>{t.name || `Test ${i + 1}`}</div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          {t.type === 'webservice' ? `${t.method} ${t.endpoint?.slice(0, 35)}...` :
                            t.type === 'schedule' ? `Process: ${t.processId?.slice(0, 20)}...` :
                              `Topic: ${t.topic}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => runSavedTest(t)} style={{
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: '4px', padding: '0.4rem 0.8rem', color: '#22c55e',
                        fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
                      }}>Run</button>
                      <button onClick={() => setSavedTests(prev => prev.filter(x => x.id !== t.id))} style={btnDanger}>Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}

export default App;
