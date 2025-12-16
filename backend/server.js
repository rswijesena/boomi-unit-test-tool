/**
 * ============================================
 * BOOMI UNIT TEST TOOL - BACKEND SERVER
 * ============================================
 * 
 * Setup:
 *   1. npm install
 *   2. cp .env.example .env
 *   3. Edit .env with your Boomi credentials
 *   4. npm start
 * 
 * The server runs on http://localhost:3001
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  boomi: {
    accountId: process.env.BOOMI_ACCOUNT_ID || '',
    username: process.env.BOOMI_USERNAME || '',
    password: process.env.BOOMI_PASSWORD || '',
    defaultAtomId: process.env.BOOMI_DEFAULT_ATOM_ID || '',
    baseUrl: 'https://api.boomi.com/api/rest/v1'
  },
  server: {
    port: process.env.PORT || 3001
  }
};

function isBoomiConfigured() {
  return CONFIG.boomi.accountId && CONFIG.boomi.username && CONFIG.boomi.password;
}

// ============================================
// BOOMI API SERVICE
// ============================================

class BoomiApiService {
  constructor(config) {
    this.config = config;
    if (config.username && config.password) {
      this.authHeader = 'Basic ' + Buffer.from(
        `${config.username}:${config.password}`
      ).toString('base64');
    }
  }

  async call(endpoint, method = 'GET', body = null) {
    if (!this.authHeader) {
      throw new Error('Boomi credentials not configured');
    }

    const url = `${this.config.baseUrl}/${this.config.accountId}${endpoint}`;
    console.log(`[Boomi API] ${method} ${url}`);

    const options = {
      method,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
      console.log(`[Boomi API] Request body:`, JSON.stringify(body, null, 2));
    }

    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`[Boomi API] Response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`[Boomi API] Error response:`, responseText);
      
      // Parse error for better message
      let errorMessage = `Boomi API Error ${response.status}: ${responseText}`;
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.message) {
          errorMessage = `Boomi API Error ${response.status}: ${errorJson.message}`;
        }
      } catch (e) {}
      
      // Add helpful hints based on status code
      if (response.status === 400) {
        errorMessage += '\n\nPossible causes:\n- Invalid Process ID\n- Invalid Atom ID\n- Process not deployed to Atom';
      } else if (response.status === 401) {
        errorMessage += '\n\nCheck: BOOMI_USERNAME format should be BOOMI_TOKEN.your.email@company.com';
      } else if (response.status === 403) {
        errorMessage += '\n\nCheck: User needs API Access role in Boomi';
      } else if (response.status === 404) {
        errorMessage += '\n\nCheck: Account ID, Process ID, or Atom ID may be incorrect';
      }
      
      throw new Error(errorMessage);
    }

    // Parse response
    try {
      return JSON.parse(responseText);
    } catch (e) {
      return responseText;
    }
  }

  async executeProcess(processId, atomId, properties = {}) {
    // Validate inputs
    if (!processId) {
      throw new Error('Process ID is required');
    }

    const effectiveAtomId = atomId || this.config.defaultAtomId;
    if (!effectiveAtomId) {
      throw new Error('Atom ID is required. Set BOOMI_DEFAULT_ATOM_ID in .env or provide atomId in the test');
    }

    // Build the ExecutionRequest payload
    const payload = {
      '@type': 'ExecutionRequest',
      processId: processId.trim(),
      atomId: effectiveAtomId.trim()
    };

    // Add process properties if provided
    if (Object.keys(properties).length > 0) {
      payload.ProcessProperties = {
        '@type': 'ProcessProperties',
        ProcessProperty: Object.entries(properties).map(([key, value]) => ({
          '@type': 'ProcessProperty',
          Name: key,
          Value: String(value)
        }))
      };
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('[Execute Process] Attempting to execute:');
    console.log('  Process ID:', payload.processId);
    console.log('  Atom ID:', payload.atomId);
    console.log('='.repeat(60));
    
    // Use ExecutionRequest endpoint (POST to create)
    const result = await this.call('/ExecutionRequest', 'POST', payload);
    
    console.log('[Execute Process] Raw response:', JSON.stringify(result, null, 2));
    
    // Boomi returns requestId, not executionId
    const executionId = result.requestId || result.executionId || result.id;
    
    if (!executionId) {
      console.error('[Execute Process] No requestId/executionId in response!');
      console.error('[Execute Process] Response keys:', Object.keys(result || {}));
      
      // Check if there's an error message in the response
      if (result && result.message) {
        throw new Error(`Boomi error: ${result.message}`);
      }
      if (result && result['@type'] === 'Error') {
        throw new Error(`Boomi error: ${result.message || JSON.stringify(result)}`);
      }
      
      throw new Error(`Boomi did not return an execution ID. Response: ${JSON.stringify(result)}`);
    }
    
    console.log('[Execute Process] Success! Execution ID:', executionId);
    
    // Normalize the response to always have executionId
    return { 
      ...result, 
      executionId: executionId 
    };
  }

  async getExecutionByUrl(recordUrl) {
    // Use the recordUrl provided by Boomi to poll for execution status
    console.log(`[Boomi API] GET ${recordUrl}`);
    
    const response = await fetch(recordUrl, {
      method: 'GET',
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json'
      }
    });
    
    console.log(`[Boomi API] Response status: ${response.status}`);
    
    // 202 means still processing
    if (response.status === 202) {
      console.log('[Boomi API] Execution still in progress (202)');
      return { status: 'INPROCESS' };
    }
    
    // 200 means we got a response
    if (response.ok) {
      const data = await response.json();
      console.log('[Boomi API] Raw response:', JSON.stringify(data, null, 2));
      
      // Handle AsyncOperationResult wrapper
      // The actual execution record is in data.result[0]
      if (data['@type'] === 'AsyncOperationResult' && data.result && data.result.length > 0) {
        const executionRecord = data.result[0];
        console.log('[Boomi API] Extracted execution record, status:', executionRecord.status);
        
        // Handle executionDuration which comes as ["Long", value]
        let duration = executionRecord.executionDuration;
        if (Array.isArray(duration)) {
          duration = duration[1]; // Get the actual value
        }
        
        return {
          ...executionRecord,
          executionDuration: duration
        };
      }
      
      // If it's a direct ExecutionRecord response
      if (data['@type'] === 'ExecutionRecord') {
        return data;
      }
      
      // Return as-is if unknown format
      console.log('[Boomi API] Unknown response format:', data['@type']);
      return data;
    }
    
    const errorText = await response.text();
    throw new Error(`Failed to get execution status: ${response.status} - ${errorText}`);
  }

  async queryExecutionRecords(filter) {
    return await this.call('/ExecutionRecord/query', 'POST', { QueryFilter: filter });
  }

  async getExecution(executionId) {
    // Try to query by the execution ID
    // Note: The executionId format from ExecutionRequest is different
    // We should use the recordUrl instead when available
    const result = await this.queryExecutionRecords({
      expression: {
        operator: 'EQUALS',
        property: 'executionId',
        argument: [executionId]
      }
    });
    return result.result?.[0] || null;
  }

  async getExecutionLogs(executionId) {
    try {
      // Use ProcessLog endpoint instead of ExecutionRecord/log
      // POST to create a log download request
      const logRequest = {
        '@type': 'ProcessLog',
        executionId: executionId,
        logLevel: 'ALL'
      };
      
      console.log(`[Boomi API] Requesting logs for execution: ${executionId}`);
      
      const result = await this.call('/ProcessLog', 'POST', logRequest);
      
      // The response contains a download URL
      if (result && result.url) {
        console.log(`[Boomi API] Log download URL: ${result.url}`);
        
        // Fetch the actual log content
        const logResponse = await fetch(result.url, {
          method: 'GET',
          headers: {
            'Authorization': this.authHeader
          }
        });
        
        if (logResponse.ok) {
          const logText = await logResponse.text();
          return logText || null;
        }
      }
      
      return null; // Logs not available
    } catch (error) {
      console.log(`[Boomi API] Logs not available: ${error.message}`);
      return null; // Silently fail - logs are optional
    }
  }

  async listProcesses() {
    // Query all processes (no filter needed for basic list)
    const result = await this.call('/Process/query', 'POST', {
      QueryFilter: {
        expression: {
          operator: 'NOT_EQUALS',
          property: 'id',
          argument: ['']
        }
      }
    });
    return result.result || [];
  }

  async listAtoms() {
    // Query all atoms
    const result = await this.call('/Atom/query', 'POST', {
      QueryFilter: {
        expression: {
          operator: 'NOT_EQUALS',
          property: 'id',
          argument: ['']
        }
      }
    });
    return result.result || [];
  }
}

const boomiApi = new BoomiApiService(CONFIG.boomi);

// ============================================
// REAL-TIME TEST STATUS TRACKING
// ============================================

const activeTests = new Map();

function updateTestStatus(testId, status) {
  activeTests.set(testId, { ...status, timestamp: Date.now() });
}

function getTestStatus(testId) {
  return activeTests.get(testId);
}

function clearTestStatus(testId) {
  activeTests.delete(testId);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

function evaluateNumeric(actual, expected) {
  const str = String(expected);
  if (str.startsWith('>=')) return actual >= parseInt(str.slice(2));
  if (str.startsWith('<=')) return actual <= parseInt(str.slice(2));
  if (str.startsWith('>')) return actual > parseInt(str.slice(1));
  if (str.startsWith('<')) return actual < parseInt(str.slice(1));
  if (str.startsWith('=')) return actual === parseInt(str.slice(1));
  return actual === parseInt(str);
}

function getJsonPathValue(obj, path) {
  if (!path || !obj) return undefined;
  const cleanPath = path.replace(/^\$\.?/, '');
  const parts = cleanPath.split(/\.|\[|\]/).filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

// ============================================
// SCHEDULED JOB TEST SERVICE
// ============================================

async function runScheduledJobTest(testConfig) {
  const {
    name,
    processId,
    atomId,
    inputData,
    expectedOutput,
    timeout = 60000,
    options = {}
  } = testConfig;

  const testId = `test-${Date.now()}`;
  const startTime = Date.now();
  const result = {
    testName: name || 'Scheduled Job Test',
    type: 'schedule',
    startTime: new Date().toISOString(),
    status: 'running',
    executionId: null,
    assertions: [],
    output: null,
    logs: null,
    error: null,
    testId
  };

  // Update status: Starting
  updateTestStatus(testId, { phase: 'starting', message: 'Initializing test...' });

  // Check if Boomi is configured
  if (!isBoomiConfigured()) {
    result.status = 'failed';
    result.error = 'Boomi credentials not configured. Please set up .env file.';
    result.duration = Date.now() - startTime;
    clearTestStatus(testId);
    return result;
  }

  try {
    // Parse input data
    let processProperties = {};
    if (inputData) {
      processProperties = typeof inputData === 'string'
        ? JSON.parse(inputData)
        : inputData;
    }

    // Step 1: Execute the process
    updateTestStatus(testId, { phase: 'executing', message: 'Sending execution request to Boomi...' });
    console.log(`[Test] Executing process: ${processId}`);
    const execResult = await boomiApi.executeProcess(
      processId,
      atomId || CONFIG.boomi.defaultAtomId,
      processProperties
    );

    result.executionId = execResult.executionId;
    const recordUrl = execResult.recordUrl;
    
    console.log(`[Test] Execution started: ${result.executionId}`);
    console.log(`[Test] Record URL: ${recordUrl}`);
    
    updateTestStatus(testId, { 
      phase: 'polling', 
      message: 'Process started, waiting for completion...', 
      executionId: result.executionId 
    });

    // Step 2: Poll for completion using recordUrl
    const pollInterval = 2000;
    const maxPolls = Math.ceil(timeout / pollInterval);
    let execution = null;

    for (let i = 0; i < maxPolls; i++) {
      await sleep(pollInterval);
      
      const pollNum = i + 1;
      updateTestStatus(testId, { 
        phase: 'polling', 
        message: `Polling for status (${pollNum}/${maxPolls})...`,
        poll: pollNum,
        maxPolls,
        executionId: result.executionId
      });
      
      console.log(`[Test] Poll ${pollNum}/${maxPolls}...`);
      
      try {
        execution = await boomiApi.getExecutionByUrl(recordUrl);
        const status = execution?.status || 'PENDING';
        console.log(`[Test] Status: ${status}`);
        
        updateTestStatus(testId, { 
          phase: 'polling', 
          message: `Status: ${status} (${pollNum}/${maxPolls})`,
          poll: pollNum,
          maxPolls,
          executionId: result.executionId,
          boomiStatus: status
        });

        // Check if execution is complete
        if (execution && !['STARTED', 'PENDING', 'INPROCESS'].includes(status)) {
          console.log(`[Test] Execution finished with status: ${status}`);
          break;
        }
      } catch (pollError) {
        console.log(`[Test] Poll error (will retry): ${pollError.message}`);
      }
    }

    // Check if timed out
    if (!execution || ['STARTED', 'PENDING', 'INPROCESS'].includes(execution.status)) {
      result.status = 'failed';
      result.error = `Execution timed out after ${timeout}ms. Last status: ${execution?.status || 'unknown'}`;
      result.duration = Date.now() - startTime;
      clearTestStatus(testId);
      return result;
    }

    // Step 3: Get logs if requested
    if (options.captureExecutionLogs && execution.executionId) {
      updateTestStatus(testId, { phase: 'logs', message: 'Fetching execution logs...' });
      try {
        result.logs = await boomiApi.getExecutionLogs(execution.executionId);
      } catch (logError) {
        // Silently ignore log errors
      }
    }

    // Step 4: Build output
    updateTestStatus(testId, { phase: 'validating', message: 'Validating results...' });
    
    result.output = {
      status: execution.status,
      executionTime: execution.executionTime,
      executionDuration: execution.executionDuration,
      inboundDocumentCount: execution.inboundDocumentCount || 0,
      outboundDocumentCount: execution.outboundDocumentCount || 0,
      errorDocumentCount: execution.errorDocumentCount || 0,
      message: execution.message || ''
    };

    // Step 5: Validate assertions
    // Default: check process completed
    result.assertions.push({
      name: 'Process Status',
      type: 'status',
      passed: result.output.status === 'COMPLETE',
      expected: 'COMPLETE',
      actual: result.output.status
    });

    // Custom expected output validations
    if (expectedOutput) {
      let exp = typeof expectedOutput === 'string'
        ? JSON.parse(expectedOutput)
        : expectedOutput;

      if (exp.recordsProcessed !== undefined) {
        const check = evaluateNumeric(result.output.outboundDocumentCount, exp.recordsProcessed);
        result.assertions.push({
          name: 'Records Processed',
          type: 'recordCount',
          passed: check,
          expected: String(exp.recordsProcessed),
          actual: result.output.outboundDocumentCount
        });
      }

      if (exp.errorCount !== undefined) {
        result.assertions.push({
          name: 'Error Count',
          type: 'errorCount',
          passed: result.output.errorDocumentCount === exp.errorCount,
          expected: exp.errorCount,
          actual: result.output.errorDocumentCount
        });
      }

      if (exp.maxDuration !== undefined) {
        result.assertions.push({
          name: 'Max Duration',
          type: 'duration',
          passed: result.output.executionDuration <= exp.maxDuration,
          expected: `<= ${exp.maxDuration}ms`,
          actual: `${result.output.executionDuration}ms`
        });
      }
    }

    // Determine overall status
    result.status = result.assertions.every(a => a.passed) ? 'passed' : 'failed';
    result.duration = Date.now() - startTime;
    clearTestStatus(testId);

  } catch (error) {
    console.error(`[Test] Error: ${error.message}`);
    result.status = 'failed';
    result.error = error.message;
    result.duration = Date.now() - startTime;
    clearTestStatus(testId);
  }

  return result;
}

// ============================================
// WEB SERVICE TEST SERVICE
// ============================================

async function runWebServiceTest(testConfig) {
  const {
    name,
    endpoint,
    method = 'GET',
    headers,
    body,
    expectedStatus,
    timeout = 30000,
    assertions = [],
    auth
  } = testConfig;

  const startTime = Date.now();
  const result = {
    testName: name || 'Web Service Test',
    type: 'webservice',
    startTime: new Date().toISOString(),
    status: 'running',
    assertions: [],
    response: null,
    error: null
  };

  try {
    // Build headers
    let reqHeaders = { 'Content-Type': 'application/json' };
    if (headers) {
      const parsed = typeof headers === 'string' ? JSON.parse(headers) : headers;
      reqHeaders = { ...reqHeaders, ...parsed };
    }

    // Add authentication if provided
    if (auth) {
      if (auth.type === 'basic' && auth.username && auth.password) {
        reqHeaders['Authorization'] = 'Basic ' +
          Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      } else if (auth.type === 'bearer' && auth.token) {
        reqHeaders['Authorization'] = `Bearer ${auth.token}`;
      } else if (auth.type === 'apikey' && auth.key) {
        reqHeaders[auth.headerName || 'X-API-Key'] = auth.key;
      }
    }

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const fetchOptions = {
      method: method.toUpperCase(),
      headers: reqHeaders,
      signal: controller.signal
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    console.log(`[Test] ${method} ${endpoint}`);
    const response = await fetch(endpoint, fetchOptions);
    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    // Parse response
    let responseBody;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    result.response = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      responseTime
    };

    // Validate status code
    if (expectedStatus) {
      result.assertions.push({
        name: 'Status Code',
        type: 'status',
        passed: response.status === parseInt(expectedStatus),
        expected: expectedStatus,
        actual: response.status
      });
    }

    // Validate custom assertions
    for (const assertion of assertions) {
      let actual;

      switch (assertion.type) {
        case 'jsonPath':
          actual = getJsonPathValue(result.response.body, assertion.path);
          break;
        case 'header':
          actual = result.response.headers[assertion.path.toLowerCase()];
          break;
        case 'responseTime':
          actual = result.response.responseTime;
          break;
        default:
          actual = undefined;
      }

      let passed = false;
      switch (assertion.operator) {
        case 'equals':
          passed = actual == assertion.expected;
          break;
        case 'notEquals':
          passed = actual != assertion.expected;
          break;
        case 'contains':
          passed = String(actual).includes(assertion.expected);
          break;
        case 'exists':
          passed = actual !== undefined && actual !== null;
          break;
        case 'isNull':
          passed = actual === null;
          break;
        case 'greaterThan':
          passed = parseFloat(actual) > parseFloat(assertion.expected);
          break;
        case 'lessThan':
          passed = parseFloat(actual) < parseFloat(assertion.expected);
          break;
        case 'matches':
          passed = new RegExp(assertion.expected).test(String(actual));
          break;
        default:
          passed = false;
      }

      result.assertions.push({
        name: `${assertion.type}: ${assertion.path || ''} ${assertion.operator} ${assertion.expected || ''}`.trim(),
        type: assertion.type,
        passed,
        expected: assertion.expected ?? '(exists)',
        actual: actual ?? '(undefined)'
      });
    }

    // Determine overall status
    result.status = result.assertions.every(a => a.passed) ? 'passed' : 'failed';
    result.duration = Date.now() - startTime;

  } catch (error) {
    result.status = 'failed';
    result.error = error.name === 'AbortError' ? 'Request timed out' : error.message;
    result.duration = Date.now() - startTime;
  }

  return result;
}

// ============================================
// EVENT STREAM TEST SERVICE (Real Boomi Event Streams REST API)
// ============================================

async function runEventStreamTest(testConfig) {
  const {
    name,
    // Real Event Streams API config
    apiUrl,           // e.g., https://aus-east-web.eventstreams.boomi.com/rest/singlemsg/.../TopicName
    envToken,         // Environment Token for Bearer auth
    // Test type
    testType = 'publish', // 'publish', 'publish-verify', 'roundtrip'
    // Consumer/Verification config
    consumerEndpoint, // Boomi process endpoint that consumes messages
    consumerApiKey,   // Auth for consumer endpoint
    verifyDelay = 2000, // ms to wait before verifying
    expectedInMessage, // Text that should appear in consumed message
    // Legacy/simulated config
    streamName,
    eventType = 'publish',
    topic,
    payload,
    expectedEvents,
    timeout = 30000,
    partitionKey,
    messageFormat = 'single', // 'single' or 'multiple'
    messageProperties = {},   // Custom message properties (x-msg-props-*)
    options = {}
  } = testConfig;

  const startTime = Date.now();
  const testId = `event-test-${Date.now()}`;
  const result = {
    testName: name || 'Event Stream Test',
    type: 'event',
    testType: testType,
    startTime: new Date().toISOString(),
    status: 'running',
    eventType,
    apiUrl: apiUrl || null,
    assertions: [],
    events: [],
    response: null,
    error: null
  };

  updateTestStatus(testId, { phase: 'starting', message: 'Initializing Event Stream test...' });

  try {
    // Parse and process payload - replace dynamic variables
    let eventPayload = payload;
    if (typeof payload === 'string') {
      eventPayload = payload
        .replace(/\{\{uuid\}\}/g, generateUUID())
        .replace(/\{\{now\}\}/g, new Date().toISOString())
        .replace(/\{\{timestamp\}\}/g, Date.now().toString());

      try {
        eventPayload = JSON.parse(eventPayload);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    // Validate payload
    result.assertions.push({
      name: 'Valid Payload',
      type: 'validation',
      passed: eventPayload !== null && eventPayload !== undefined,
      expected: 'Non-empty payload',
      actual: eventPayload ? 'Valid' : 'Empty'
    });

    // Check if using real Boomi Event Streams API
    if (apiUrl && envToken) {
      // ========================================
      // REAL BOOMI EVENT STREAMS API CALL
      // ========================================
      updateTestStatus(testId, { phase: 'publishing', message: 'Publishing to Boomi Event Streams...' });

      console.log(`[Event Stream] Original URL: ${apiUrl}`);
      console.log(`[Event Stream] Message Format: ${messageFormat}`);

      // Parse messageProperties if it's a string
      let parsedMessageProperties = {};
      if (messageProperties) {
        if (typeof messageProperties === 'string') {
          try {
            parsedMessageProperties = JSON.parse(messageProperties);
          } catch {
            parsedMessageProperties = {};
          }
        } else {
          parsedMessageProperties = messageProperties;
        }
      }

      // Build headers
      const headers = {
        'Authorization': `Bearer ${envToken}`
      };

      let requestBody;
      // Use the URL exactly as provided - don't modify it
      // User should copy the correct URL from Boomi (Single or Multiple)
      let finalUrl = apiUrl.trim();

      if (messageFormat === 'single') {
        // ========================================
        // SINGLE MESSAGE FORMAT
        // Send raw payload directly with x-msg-props-* headers
        // User should use the Single Message URL from Boomi
        // ========================================
        
        // Set Content-Type based on payload type
        if (typeof eventPayload === 'object') {
          headers['Content-Type'] = 'application/json';
          requestBody = JSON.stringify(eventPayload);
        } else {
          headers['Content-Type'] = 'text/plain';
          requestBody = String(eventPayload);
        }

        // Add custom message properties as x-msg-props-* headers
        if (parsedMessageProperties && typeof parsedMessageProperties === 'object') {
          for (const [key, value] of Object.entries(parsedMessageProperties)) {
            headers[`x-msg-props-${key}`] = String(value);
          }
        }

        // Add partition key as message property if provided
        if (partitionKey) {
          headers['x-msg-props-partitionKey'] = partitionKey;
        }

        console.log(`[Event Stream] Single message - sending raw payload`);
        console.log(`[Event Stream] Content-Type: ${headers['Content-Type']}`);

      } else {
        // ========================================
        // MULTIPLE MESSAGES FORMAT  
        // Send JSON with messages array wrapper
        // User should use the Multiple Messages URL from Boomi
        // ========================================
        
        headers['Content-Type'] = 'application/json';

        // Format: { "messages": [ { "payload": "...", "properties": {...} } ] }
        const payloadString = typeof eventPayload === 'object' 
          ? JSON.stringify(eventPayload) 
          : String(eventPayload);

        // Add partition key to properties if provided
        const allProperties = { ...parsedMessageProperties };
        if (partitionKey) {
          allProperties.partitionKey = partitionKey;
        }

        const messageObj = {
          payload: payloadString
        };
        
        // Only add properties if there are any
        if (Object.keys(allProperties).length > 0) {
          messageObj.properties = allProperties;
        }

        requestBody = JSON.stringify({
          messages: [messageObj]
        });

        console.log(`[Event Stream] Multiple messages - wrapped in messages array`);
      }

      // Log the request for debugging
      console.log(`[Event Stream] Final URL: ${finalUrl}`);
      console.log(`[Event Stream] Request body preview: ${requestBody.substring(0, 100)}...`);
      
      result.requestDetails = {
        url: finalUrl,
        format: messageFormat,
        headers: Object.keys(headers).filter(h => h !== 'Authorization'),
        bodyPreview: requestBody.substring(0, 500) + (requestBody.length > 500 ? '...' : '')
      };

      // Make the API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), parseInt(timeout));

      try {
        const response = await fetch(finalUrl, {
          method: 'POST',
          headers,
          body: requestBody,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseTime = Date.now() - startTime;
        const responseText = await response.text();

        result.response = {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
          headers: Object.fromEntries(response.headers.entries()),
          responseTime
        };

        // Log the event
        result.events.push({
          direction: 'outbound',
          topic: topic || apiUrl.split('/').pop(),
          payload: eventPayload,
          timestamp: new Date().toISOString(),
          status: response.status
        });

        // Assert on HTTP status
        const isSuccess = response.status >= 200 && response.status < 300;
        result.assertions.push({
          name: 'HTTP Status',
          type: 'status',
          passed: isSuccess,
          expected: '2xx Success',
          actual: `${response.status} ${response.statusText}`
        });

        // Assert on response time
        if (options.maxResponseTime) {
          result.assertions.push({
            name: 'Response Time',
            type: 'timing',
            passed: responseTime <= options.maxResponseTime,
            expected: `<= ${options.maxResponseTime}ms`,
            actual: `${responseTime}ms`
          });
        }

        // Parse response if JSON
        if (responseText && isSuccess) {
          try {
            const responseJson = JSON.parse(responseText);
            result.response.parsed = responseJson;
            
            // Check for message ID in response
            if (responseJson.messageId || responseJson.id) {
              result.assertions.push({
                name: 'Message ID Returned',
                type: 'response',
                passed: true,
                expected: 'Message ID',
                actual: responseJson.messageId || responseJson.id
              });
            }
          } catch {
            // Response is not JSON, that's OK
          }
        }

        // If not successful, capture error
        if (!isSuccess) {
          result.assertions.push({
            name: 'Publish Success',
            type: 'publish',
            passed: false,
            expected: 'Message published',
            actual: `Error: ${responseText || response.statusText}`
          });
        } else {
          result.assertions.push({
            name: 'Message Published',
            type: 'publish',
            passed: true,
            expected: 'Message published to Event Stream',
            actual: 'Success'
          });

          // ========================================
          // VERIFICATION STEP (for publish-verify and roundtrip)
          // ========================================
          if ((testType === 'publish-verify' || testType === 'roundtrip') && consumerEndpoint) {
            updateTestStatus(testId, { phase: 'waiting', message: `Waiting ${verifyDelay}ms before verification...` });
            
            // Wait for message to be processed
            await new Promise(resolve => setTimeout(resolve, parseInt(verifyDelay) || 2000));
            
            updateTestStatus(testId, { phase: 'verifying', message: 'Calling consumer endpoint...' });
            
            try {
              // Build consumer request headers
              const consumerHeaders = {
                'Content-Type': 'application/json'
              };
              
              if (consumerApiKey) {
                // Support both Basic auth and Bearer token
                if (consumerApiKey.toLowerCase().startsWith('basic ') || consumerApiKey.toLowerCase().startsWith('bearer ')) {
                  consumerHeaders['Authorization'] = consumerApiKey;
                } else {
                  consumerHeaders['Authorization'] = `Basic ${Buffer.from(consumerApiKey).toString('base64')}`;
                }
              }

              const consumerResponse = await fetch(consumerEndpoint, {
                method: 'GET',
                headers: consumerHeaders
              });

              const consumerResponseText = await consumerResponse.text();
              const consumerSuccess = consumerResponse.status >= 200 && consumerResponse.status < 300;

              result.consumerResponse = {
                status: consumerResponse.status,
                statusText: consumerResponse.statusText,
                body: consumerResponseText.substring(0, 1000)
              };

              // Log consume event
              result.events.push({
                direction: 'inbound',
                topic: topic || 'consumer',
                payload: consumerResponseText.substring(0, 500),
                timestamp: new Date().toISOString(),
                status: consumerResponse.status
              });

              result.assertions.push({
                name: 'Consumer Endpoint Reached',
                type: 'consume',
                passed: consumerSuccess,
                expected: '2xx Success',
                actual: `${consumerResponse.status} ${consumerResponse.statusText}`
              });

              // Check if expected content is in the response
              if (expectedInMessage && consumerSuccess) {
                const contentFound = consumerResponseText.toLowerCase().includes(expectedInMessage.toLowerCase());
                result.assertions.push({
                  name: 'Expected Content Found',
                  type: 'content',
                  passed: contentFound,
                  expected: `Contains: "${expectedInMessage}"`,
                  actual: contentFound ? 'Found' : 'Not found in response'
                });
              }

              // Try to parse and check for the original message
              if (consumerSuccess && consumerResponseText) {
                try {
                  const consumerData = JSON.parse(consumerResponseText);
                  result.consumerResponse.parsed = consumerData;
                  
                  // Check if it's an array of messages or single message
                  const messages = Array.isArray(consumerData) ? consumerData : 
                                   consumerData.messages ? consumerData.messages :
                                   consumerData.result ? consumerData.result : [consumerData];
                  
                  result.assertions.push({
                    name: 'Messages Retrieved',
                    type: 'consume',
                    passed: messages.length > 0,
                    expected: 'At least 1 message',
                    actual: `${messages.length} message(s)`
                  });
                } catch {
                  // Not JSON, that's OK
                }
              }

            } catch (consumerError) {
              result.assertions.push({
                name: 'Consumer Endpoint',
                type: 'consume',
                passed: false,
                expected: 'Successful response',
                actual: `Error: ${consumerError.message}`
              });
            }
          }
        }

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout}ms`);
        }
        throw fetchError;
      }

    } else {
      // ========================================
      // SIMULATED EVENT STREAM (No API URL)
      // ========================================
      updateTestStatus(testId, { phase: 'simulating', message: 'Running simulated event test...' });

      console.log(`[Event Stream] Simulated ${eventType} to topic: ${topic}`);

      switch (eventType) {
        case 'publish':
          // Simulate publishing
          result.events.push({
            direction: 'outbound',
            topic: topic,
            payload: eventPayload,
            partitionKey,
            timestamp: new Date().toISOString(),
            simulated: true
          });

          result.assertions.push({
            name: 'Event Published (Simulated)',
            type: 'publish',
            passed: true,
            expected: 'Event published',
            actual: `Simulated publish to ${topic}`
          });
          break;

        case 'subscribe':
          // Simulate subscription
          result.events.push({
            direction: 'inbound',
            topic: topic,
            payload: eventPayload,
            timestamp: new Date().toISOString(),
            simulated: true
          });

          result.assertions.push({
            name: 'Subscription Active (Simulated)',
            type: 'subscribe',
            passed: true,
            expected: 'Subscribed to topic',
            actual: `Simulated subscription to ${topic}`
          });
          break;

        case 'roundtrip':
          // Simulate round-trip
          result.events.push({
            direction: 'outbound',
            topic: topic,
            payload: eventPayload,
            partitionKey,
            timestamp: new Date().toISOString(),
            simulated: true
          });

          result.assertions.push({
            name: 'Trigger Event Published (Simulated)',
            type: 'publish',
            passed: true,
            expected: 'Event published',
            actual: 'Simulated publish to ' + topic
          });
          break;
      }

      // Process expected events (for subscribe/roundtrip)
      let expected = [];
      if (expectedEvents) {
        expected = typeof expectedEvents === 'string'
          ? JSON.parse(expectedEvents)
          : expectedEvents;
      }

      for (const exp of expected) {
        const receivedEvent = {
          direction: 'inbound',
          topic: exp.topic,
          payload: exp.contains || exp.payload || {},
          timestamp: new Date().toISOString(),
          simulated: true
        };
        result.events.push(receivedEvent);

        result.assertions.push({
          name: `Event on ${exp.topic} (Simulated)`,
          type: 'receive',
          passed: true,
          expected: JSON.stringify(exp.contains || exp.payload || {}).slice(0, 50) + '...',
          actual: 'Simulated event received'
        });
      }

      // Add notice about simulation
      result.assertions.push({
        name: 'Mode',
        type: 'info',
        passed: true,
        expected: 'Real API call',
        actual: 'Simulated (provide API URL and Token for real testing)'
      });
    }

    // Optional: Test event ordering
    if (options.testEventOrdering && result.events.length > 1) {
      const timestamps = result.events.map(e => new Date(e.timestamp).getTime());
      const inOrder = timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1]);

      result.assertions.push({
        name: 'Event Ordering',
        type: 'ordering',
        passed: inOrder,
        expected: 'Chronological order',
        actual: inOrder ? 'Correct order' : 'Out of order'
      });
    }

    // Determine overall status
    result.status = result.assertions.filter(a => a.type !== 'info').every(a => a.passed) ? 'passed' : 'failed';
    result.duration = Date.now() - startTime;
    clearTestStatus(testId);

  } catch (error) {
    result.status = 'failed';
    result.error = error.message;
    result.duration = Date.now() - startTime;
    clearTestStatus(testId);
  }

  return result;
}

// ============================================
// AI AGENT TEST SERVICE
// ============================================

async function runAIAgentTest(testConfig) {
  const {
    name,
    testType = 'api', // 'api' (recommended) or 'process'
    // API config
    agentEndpoint,
    authType = 'basic',
    authUsername,
    authPassword,
    agentApiKey,
    httpMethod = 'POST',
    requestBodyTemplate = '{"prompt": "{{prompt}}"}',
    // Process config
    processId,
    atomId,
    // Common
    prompt,
    expectedBehavior,
    timeout = 60000,
    conversationHistory = '[]',
    options = {}
  } = testConfig;

  const testId = `agent-test-${Date.now()}`;
  const startTime = Date.now();
  const result = {
    testName: name || 'AI Agent Test',
    type: 'agent',
    testType,
    startTime: new Date().toISOString(),
    status: 'running',
    prompt,
    response: null,
    assertions: [],
    trace: null,
    error: null,
    testId
  };

  updateTestStatus(testId, { phase: 'starting', message: 'Initializing AI Agent test...' });

  try {
    let agentResponse;
    
    if (testType === 'api') {
      // ========================================
      // TEST VIA WEB SERVICE API (Recommended)
      // ========================================
      if (!agentEndpoint) {
        throw new Error('Agent API endpoint URL is required');
      }

      updateTestStatus(testId, { phase: 'invoking', message: 'Calling agent web service...' });

      // Build headers
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Handle authentication
      if (authType === 'basic' && authUsername && authPassword) {
        const credentials = Buffer.from(`${authUsername}:${authPassword}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (authType === 'bearer' && agentApiKey) {
        headers['Authorization'] = agentApiKey.startsWith('Bearer ') ? agentApiKey : `Bearer ${agentApiKey}`;
      }

      // Build request body from template
      let requestBody = requestBodyTemplate || '{"prompt": "{{prompt}}"}';
      requestBody = requestBody.replace(/\{\{prompt\}\}/g, prompt);
      
      // Parse conversation history and inject if template has placeholder
      try {
        const history = typeof conversationHistory === 'string' 
          ? JSON.parse(conversationHistory) 
          : conversationHistory;
        requestBody = requestBody.replace(/\{\{history\}\}/g, JSON.stringify(history));
        requestBody = requestBody.replace(/\{\{conversationHistory\}\}/g, JSON.stringify(history));
      } catch (e) {
        // If can't parse, just remove the placeholder
        requestBody = requestBody.replace(/\{\{history\}\}/g, '[]');
        requestBody = requestBody.replace(/\{\{conversationHistory\}\}/g, '[]');
      }

      console.log(`[Agent Test] Calling API: ${agentEndpoint}`);
      console.log(`[Agent Test] Method: ${httpMethod}`);
      console.log(`[Agent Test] Auth Type: ${authType}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), parseInt(timeout));
      const apiStartTime = Date.now();
      
      try {
        const fetchOptions = {
          method: httpMethod,
          headers,
          signal: controller.signal
        };

        // Only add body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(httpMethod.toUpperCase())) {
          fetchOptions.body = requestBody;
        }

        const apiResponse = await fetch(agentEndpoint, fetchOptions);
        clearTimeout(timeoutId);

        const apiResponseTime = Date.now() - apiStartTime;
        const responseText = await apiResponse.text();
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { content: responseText };
        }

        // Extract the actual content from various response formats
        const content = responseData.content || 
                       responseData.response || 
                       responseData.message || 
                       responseData.result ||
                       responseData.output ||
                       responseData.text ||
                       responseData.answer ||
                       (typeof responseData === 'string' ? responseData : responseText);

        agentResponse = {
          content: content,
          status: apiResponse.ok ? 'success' : 'error',
          statusCode: apiResponse.status,
          statusText: apiResponse.statusText,
          executionTime: apiResponseTime,
          raw: responseData
        };

        // Add HTTP status assertion
        result.assertions.push({
          name: 'HTTP Status',
          type: 'status',
          passed: apiResponse.ok,
          expected: '2xx Success',
          actual: `${apiResponse.status} ${apiResponse.statusText}`
        });

      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout}ms`);
        }
        throw fetchError;
      }

    } else if (testType === 'process') {
      // ========================================
      // TEST VIA PROCESS EXECUTION (Legacy)
      // ========================================
      if (!isBoomiConfigured()) {
        throw new Error('Boomi credentials not configured. Please set up .env file.');
      }
      if (!processId) {
        throw new Error('Process ID is required for process-based agent testing');
      }

      updateTestStatus(testId, { phase: 'invoking', message: 'Executing process with Agent Step...' });
      
      // Build process properties with the prompt
      const processProperties = {
        agentPrompt: prompt,
        conversationHistory: conversationHistory
      };

      // Execute the process
      console.log(`[Agent Test] Executing process: ${processId}`);
      const execResult = await boomiApi.executeProcess(
        processId,
        atomId || CONFIG.boomi.defaultAtomId,
        processProperties
      );

      result.executionId = execResult.executionId;
      const recordUrl = execResult.recordUrl;
      
      updateTestStatus(testId, { 
        phase: 'waiting', 
        message: 'Waiting for agent response...',
        executionId: result.executionId
      });

      // Poll for completion
      const pollInterval = 2000;
      const maxPolls = Math.ceil(timeout / pollInterval);
      let execution = null;

      for (let i = 0; i < maxPolls; i++) {
        await sleep(pollInterval);
        
        updateTestStatus(testId, { 
          phase: 'waiting', 
          message: `Waiting for response (${i + 1}/${maxPolls})...`,
          poll: i + 1,
          maxPolls
        });

        try {
          execution = await boomiApi.getExecutionByUrl(recordUrl);
          const status = execution?.status || 'PENDING';

          if (execution && !['STARTED', 'PENDING', 'INPROCESS'].includes(status)) {
            break;
          }
        } catch (pollError) {
          console.log(`[Agent Test] Poll error (will retry): ${pollError.message}`);
        }
      }

      if (!execution || ['STARTED', 'PENDING', 'INPROCESS'].includes(execution.status)) {
        throw new Error(`Agent execution timed out after ${timeout}ms`);
      }

      // The agent response would typically be in the execution output or a document
      agentResponse = {
        content: execution.message || 'Agent process completed',
        status: execution.status,
        executionTime: execution.executionDuration,
        trace: options.captureTrace ? execution : null
      };
    }

    result.response = agentResponse;
    updateTestStatus(testId, { phase: 'validating', message: 'Validating agent response...' });

    // Parse expected behavior
    let expected = {};
    try {
      expected = typeof expectedBehavior === 'string' 
        ? JSON.parse(expectedBehavior) 
        : expectedBehavior;
    } catch (e) {
      console.log('[Agent Test] Could not parse expected behavior');
    }

    // Validate response content
    const responseContent = String(agentResponse.content || '').toLowerCase();

    // Check shouldContain
    if (expected.shouldContain && Array.isArray(expected.shouldContain)) {
      for (const term of expected.shouldContain) {
        const found = responseContent.includes(term.toLowerCase());
        result.assertions.push({
          name: `Response contains "${term}"`,
          type: 'contains',
          passed: found,
          expected: term,
          actual: found ? 'Found' : 'Not found'
        });
      }
    }

    // Check shouldNotContain
    if (expected.shouldNotContain && Array.isArray(expected.shouldNotContain)) {
      for (const term of expected.shouldNotContain) {
        const found = responseContent.includes(term.toLowerCase());
        result.assertions.push({
          name: `Response does NOT contain "${term}"`,
          type: 'notContains',
          passed: !found,
          expected: `Not contain: ${term}`,
          actual: found ? 'Found (FAIL)' : 'Not found (OK)'
        });
      }
    }

    // Check response time
    if (expected.maxResponseTime && agentResponse.executionTime) {
      const withinLimit = agentResponse.executionTime <= expected.maxResponseTime;
      result.assertions.push({
        name: 'Response Time',
        type: 'timing',
        passed: withinLimit,
        expected: `<= ${expected.maxResponseTime}ms`,
        actual: `${agentResponse.executionTime}ms`
      });
    }

    // Check response not empty
    result.assertions.push({
      name: 'Agent Responded',
      type: 'exists',
      passed: !!agentResponse.content && agentResponse.content.length > 0,
      expected: 'Non-empty response',
      actual: agentResponse.content ? `${agentResponse.content.length} characters` : 'Empty'
    });

    // Add trace if captured
    if (options.captureTrace && agentResponse.trace) {
      result.trace = agentResponse.trace;
    }

    // Determine overall status
    result.status = result.assertions.length > 0 
      ? (result.assertions.every(a => a.passed) ? 'passed' : 'failed')
      : (agentResponse.status === 'success' || agentResponse.status === 'COMPLETE' ? 'passed' : 'failed');
    
    result.duration = Date.now() - startTime;
    clearTestStatus(testId);

  } catch (error) {
    console.error(`[Agent Test] Error: ${error.message}`);
    result.status = 'failed';
    result.error = error.message;
    result.duration = Date.now() - startTime;
    clearTestStatus(testId);
  }

  return result;
}

// ============================================
// CI/CD SERVICE - Boomi Deployment Automation
// ============================================

const cicdApi = {
  /**
   * List all environments in the account
   */
  async listEnvironments() {
    console.log('[CI/CD] Fetching environments...');
    const result = await boomiApi.call('/Environment/query', 'POST', {
      QueryFilter: {
        expression: {
          operator: 'NOT_EQUALS',
          property: 'id',
          argument: ['']
        }
      }
    });
    return result.result || [];
  },

  /**
   * Get environment by ID
   */
  async getEnvironment(environmentId) {
    console.log(`[CI/CD] Getting environment: ${environmentId}`);
    const result = await boomiApi.call(`/Environment/${environmentId}`, 'GET');
    return result;
  },

  /**
   * List packaged components
   */
  async listPackagedComponents(componentId = null) {
    console.log('[CI/CD] Fetching packaged components...');
    const filter = componentId 
      ? {
          QueryFilter: {
            expression: {
              operator: 'EQUALS',
              property: 'componentId',
              argument: [componentId]
            }
          }
        }
      : {
          QueryFilter: {
            expression: {
              operator: 'NOT_EQUALS',
              property: 'packageId',
              argument: ['']
            }
          }
        };
    
    const result = await boomiApi.call('/PackagedComponent/query', 'POST', filter);
    return result.result || [];
  },

  /**
   * Get a specific packaged component
   */
  async getPackagedComponent(packageId) {
    console.log(`[CI/CD] Getting package: ${packageId}`);
    const result = await boomiApi.call(`/PackagedComponent/${packageId}`, 'GET');
    return result;
  },

  /**
   * Create a packaged component from a process/component
   */
  async createPackage(componentId, packageVersion, notes = '') {
    console.log(`[CI/CD] Creating package for component: ${componentId}, version: ${packageVersion}`);
    
    const payload = {
      componentId: componentId,
      packageVersion: packageVersion,
      notes: notes || `Package created via CI/CD at ${new Date().toISOString()}`
    };

    const result = await boomiApi.call('/PackagedComponent', 'POST', payload);
    console.log(`[CI/CD] Package created: ${result.packageId}`);
    return result;
  },

  /**
   * List deployments for an environment
   */
  async listDeployments(environmentId = null) {
    console.log('[CI/CD] Fetching deployments...');
    const filter = environmentId
      ? {
          QueryFilter: {
            expression: {
              operator: 'EQUALS',
              property: 'environmentId',
              argument: [environmentId]
            }
          }
        }
      : {
          QueryFilter: {
            expression: {
              operator: 'NOT_EQUALS',
              property: 'deploymentId',
              argument: ['']
            }
          }
        };

    const result = await boomiApi.call('/DeployedPackage/query', 'POST', filter);
    return result.result || [];
  },

  /**
   * Deploy a packaged component to an environment
   */
  async deployPackage(environmentId, packageId, notes = '', listenerStatus = 'RUNNING') {
    console.log(`[CI/CD] Deploying package ${packageId} to environment ${environmentId}`);
    
    const payload = {
      environmentId: environmentId,
      packageId: packageId,
      notes: notes || `Deployed via CI/CD at ${new Date().toISOString()}`,
      listenerStatus: listenerStatus // 'RUNNING' or 'PAUSED'
    };

    const result = await boomiApi.call('/DeployedPackage', 'POST', payload);
    console.log(`[CI/CD] Deployment created: ${result.deploymentId}`);
    return result;
  },

  /**
   * Undeploy a package from an environment
   */
  async undeployPackage(deploymentId) {
    console.log(`[CI/CD] Undeploying: ${deploymentId}`);
    await boomiApi.call(`/DeployedPackage/${deploymentId}`, 'DELETE');
    return { success: true, deploymentId };
  },

  /**
   * Get deployment history for a component
   */
  async getDeploymentHistory(componentId) {
    console.log(`[CI/CD] Getting deployment history for: ${componentId}`);
    const result = await boomiApi.call('/DeployedPackage/query', 'POST', {
      QueryFilter: {
        expression: {
          operator: 'EQUALS',
          property: 'componentId',
          argument: [componentId]
        }
      }
    });
    return result.result || [];
  },

  /**
   * Query component by name to get ID
   */
  async getComponentByName(processName, componentType = 'process') {
    console.log(`[CI/CD] Looking up component: ${processName}`);
    const objectType = componentType === 'process' ? 'Process' : 'Component';
    
    const result = await boomiApi.call(`/${objectType}/query`, 'POST', {
      QueryFilter: {
        expression: {
          operator: 'EQUALS',
          property: 'name',
          argument: [processName]
        }
      }
    });
    
    if (result.result && result.result.length > 0) {
      return result.result[0];
    }
    return null;
  },

  /**
   * Execute a full CI/CD pipeline
   * Package -> Deploy to multiple environments with optional testing
   */
  async runPipeline(config) {
    const {
      componentId,
      componentName,
      packageVersion,
      packageNotes,
      targetEnvironments, // Array of { environmentId, listenerStatus }
      runTestsAfterDeploy = false,
      testConfig = null
    } = config;

    const pipelineId = `pipeline-${Date.now()}`;
    const results = {
      pipelineId,
      startTime: new Date().toISOString(),
      status: 'running',
      steps: [],
      package: null,
      deployments: [],
      tests: [],
      errors: []
    };

    updateTestStatus(pipelineId, { phase: 'starting', message: 'Initializing pipeline...' });

    try {
      // Step 1: Resolve component ID if name provided
      let resolvedComponentId = componentId;
      if (!componentId && componentName) {
        updateTestStatus(pipelineId, { phase: 'lookup', message: `Looking up component: ${componentName}` });
        const component = await this.getComponentByName(componentName);
        if (!component) {
          throw new Error(`Component not found: ${componentName}`);
        }
        resolvedComponentId = component.id;
        results.steps.push({ step: 'lookup', status: 'success', componentId: resolvedComponentId });
      }

      // Step 2: Create package
      updateTestStatus(pipelineId, { phase: 'packaging', message: 'Creating package...' });
      const pkg = await this.createPackage(
        resolvedComponentId,
        packageVersion || `v${Date.now()}`,
        packageNotes
      );
      results.package = pkg;
      results.steps.push({ step: 'package', status: 'success', packageId: pkg.packageId });

      // Step 3: Deploy to each target environment
      for (let i = 0; i < targetEnvironments.length; i++) {
        const target = targetEnvironments[i];
        updateTestStatus(pipelineId, { 
          phase: 'deploying', 
          message: `Deploying to environment ${i + 1}/${targetEnvironments.length}...`,
          environment: target.environmentId
        });

        try {
          const deployment = await this.deployPackage(
            target.environmentId,
            pkg.packageId,
            `Pipeline ${pipelineId} deployment`,
            target.listenerStatus || 'RUNNING'
          );
          results.deployments.push({
            environmentId: target.environmentId,
            status: 'success',
            deployment
          });
          results.steps.push({ 
            step: 'deploy', 
            status: 'success', 
            environmentId: target.environmentId,
            deploymentId: deployment.deploymentId 
          });
        } catch (deployError) {
          results.deployments.push({
            environmentId: target.environmentId,
            status: 'failed',
            error: deployError.message
          });
          results.errors.push(`Deploy to ${target.environmentId} failed: ${deployError.message}`);
        }
      }

      // Step 4: Run tests if configured
      if (runTestsAfterDeploy && testConfig) {
        updateTestStatus(pipelineId, { phase: 'testing', message: 'Running post-deployment tests...' });
        try {
          const testResult = await runScheduledJobTest(testConfig);
          results.tests.push(testResult);
          results.steps.push({ step: 'test', status: testResult.status, testResult });
        } catch (testError) {
          results.errors.push(`Post-deploy test failed: ${testError.message}`);
        }
      }

      results.status = results.errors.length === 0 ? 'success' : 'partial';
      results.endTime = new Date().toISOString();

    } catch (error) {
      results.status = 'failed';
      results.errors.push(error.message);
      results.endTime = new Date().toISOString();
    }

    clearTestStatus(pipelineId);
    return results;
  }
};

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    boomiConfigured: isBoomiConfigured(),
    config: {
      accountId: CONFIG.boomi.accountId ? '✓ Set' : '✗ Missing',
      username: CONFIG.boomi.username ? '✓ Set' : '✗ Missing',
      password: CONFIG.boomi.password ? '✓ Set' : '✗ Missing',
      defaultAtomId: CONFIG.boomi.defaultAtomId ? '✓ Set' : '✗ Missing (optional)'
    },
    version: '1.0.0'
  });
});

// Get active test status (for real-time UI updates)
app.get('/api/test/status/:testId', (req, res) => {
  const status = getTestStatus(req.params.testId);
  if (status) {
    res.json(status);
  } else {
    res.json({ phase: 'unknown', message: 'Test not found or completed' });
  }
});

// Get all active tests
app.get('/api/test/active', (req, res) => {
  const tests = {};
  activeTests.forEach((value, key) => {
    tests[key] = value;
  });
  res.json(tests);
});

// Test Boomi connection
app.get('/api/boomi/test-connection', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.status(400).json({
      success: false,
      error: 'Boomi credentials not configured in .env file',
      config: {
        accountId: CONFIG.boomi.accountId ? '✓' : '✗ Missing BOOMI_ACCOUNT_ID',
        username: CONFIG.boomi.username ? '✓' : '✗ Missing BOOMI_USERNAME',
        password: CONFIG.boomi.password ? '✓' : '✗ Missing BOOMI_PASSWORD',
        defaultAtomId: CONFIG.boomi.defaultAtomId || '(not set - optional)'
      }
    });
  }
  
  try {
    // Try to list atoms as a connection test
    console.log('[Test Connection] Testing Boomi API connection...');
    const atoms = await boomiApi.listAtoms();
    const processes = await boomiApi.listProcesses();
    
    res.json({
      success: true,
      message: 'Successfully connected to Boomi!',
      data: {
        atomsFound: atoms.length,
        processesFound: processes.length,
        atoms: atoms.map(a => ({ id: a.id, name: a.name, status: a.status })),
        defaultAtomId: CONFIG.boomi.defaultAtomId || '(not set)'
      }
    });
  } catch (error) {
    console.error('[Test Connection] Failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check your credentials in .env file'
    });
  }
});

// Scheduled job test
app.post('/api/test/scheduled-job', async (req, res) => {
  try {
    const result = await runScheduledJobTest(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Web service test
app.post('/api/test/web-service', async (req, res) => {
  try {
    const result = await runWebServiceTest(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Event stream test
app.post('/api/test/event-stream', async (req, res) => {
  try {
    const result = await runEventStreamTest(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Agent test
app.post('/api/test/ai-agent', async (req, res) => {
  try {
    const result = await runAIAgentTest(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List Boomi processes
app.get('/api/boomi/processes', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.json([]);
  }
  try {
    const processes = await boomiApi.listProcesses();
    res.json(processes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List Boomi atoms
app.get('/api/boomi/atoms', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.json([]);
  }
  try {
    const atoms = await boomiApi.listAtoms();
    res.json(atoms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get execution history
app.get('/api/boomi/executions', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.json([]);
  }
  try {
    const { processId, limit = 20 } = req.query;

    const filter = processId ? {
      expression: {
        operator: 'EQUALS',
        property: 'processId',
        argument: [processId]
      }
    } : {};

    const result = await boomiApi.queryExecutionRecords(filter);
    res.json((result.result || []).slice(0, parseInt(limit)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CI/CD API ROUTES
// ============================================

// List all environments
app.get('/api/cicd/environments', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.json([]);
  }
  try {
    const environments = await cicdApi.listEnvironments();
    res.json(environments);
  } catch (error) {
    console.error('[CI/CD] Error listing environments:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get specific environment
app.get('/api/cicd/environments/:id', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.status(400).json({ error: 'Boomi not configured' });
  }
  try {
    const environment = await cicdApi.getEnvironment(req.params.id);
    res.json(environment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List packaged components
app.get('/api/cicd/packages', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.json([]);
  }
  try {
    const { componentId } = req.query;
    const packages = await cicdApi.listPackagedComponents(componentId);
    res.json(packages);
  } catch (error) {
    console.error('[CI/CD] Error listing packages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get specific package
app.get('/api/cicd/packages/:id', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.status(400).json({ error: 'Boomi not configured' });
  }
  try {
    const pkg = await cicdApi.getPackagedComponent(req.params.id);
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new package
app.post('/api/cicd/package', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.status(400).json({ error: 'Boomi not configured' });
  }
  try {
    const { componentId, packageVersion, notes } = req.body;
    if (!componentId) {
      return res.status(400).json({ error: 'componentId is required' });
    }
    const result = await cicdApi.createPackage(
      componentId,
      packageVersion || `v${Date.now()}`,
      notes
    );
    res.json(result);
  } catch (error) {
    console.error('[CI/CD] Error creating package:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List deployments
app.get('/api/cicd/deployments', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.json([]);
  }
  try {
    const { environmentId } = req.query;
    const deployments = await cicdApi.listDeployments(environmentId);
    res.json(deployments);
  } catch (error) {
    console.error('[CI/CD] Error listing deployments:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Deploy a package
app.post('/api/cicd/deploy', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.status(400).json({ error: 'Boomi not configured' });
  }
  try {
    const { environmentId, packageId, notes, listenerStatus } = req.body;
    if (!environmentId || !packageId) {
      return res.status(400).json({ error: 'environmentId and packageId are required' });
    }
    const result = await cicdApi.deployPackage(
      environmentId,
      packageId,
      notes,
      listenerStatus || 'RUNNING'
    );
    res.json(result);
  } catch (error) {
    console.error('[CI/CD] Error deploying package:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Undeploy a package
app.delete('/api/cicd/deployments/:id', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.status(400).json({ error: 'Boomi not configured' });
  }
  try {
    const result = await cicdApi.undeployPackage(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('[CI/CD] Error undeploying:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get deployment history for a component
app.get('/api/cicd/history/:componentId', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.json([]);
  }
  try {
    const history = await cicdApi.getDeploymentHistory(req.params.componentId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lookup component by name
app.get('/api/cicd/component/lookup', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.status(400).json({ error: 'Boomi not configured' });
  }
  try {
    const { name, type } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const component = await cicdApi.getComponentByName(name, type || 'process');
    if (component) {
      res.json(component);
    } else {
      res.status(404).json({ error: 'Component not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run a full CI/CD pipeline
app.post('/api/cicd/pipeline', async (req, res) => {
  if (!isBoomiConfigured()) {
    return res.status(400).json({ error: 'Boomi not configured' });
  }
  try {
    const result = await cicdApi.runPipeline(req.body);
    res.json(result);
  } catch (error) {
    console.error('[CI/CD] Pipeline error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate CLI command for external CI/CD tools
app.post('/api/cicd/generate-cli', (req, res) => {
  const { action, componentId, packageVersion, environmentId, tool } = req.body;
  
  const accountId = CONFIG.boomi.accountId || 'YOUR_ACCOUNT_ID';
  const baseUrl = 'https://api.boomi.com/api/rest/v1';
  
  let commands = {};
  
  if (tool === 'curl' || !tool) {
    commands.curl = {
      package: `curl -X POST "${baseUrl}/${accountId}/PackagedComponent" \\
  -H "Content-Type: application/json" \\
  -u "USERNAME:PASSWORD" \\
  -d '{"componentId":"${componentId}","packageVersion":"${packageVersion}"}'`,
      deploy: `curl -X POST "${baseUrl}/${accountId}/DeployedPackage" \\
  -H "Content-Type: application/json" \\
  -u "USERNAME:PASSWORD" \\
  -d '{"environmentId":"${environmentId}","packageId":"PACKAGE_ID","listenerStatus":"RUNNING"}'`
    };
  }
  
  if (tool === 'github' || !tool) {
    commands.github = `# .github/workflows/boomi-deploy.yml
name: Boomi Deployment
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'dev'
        type: choice
        options:
          - dev
          - test
          - prod

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Create Package
        run: |
          curl -X POST "https://api.boomi.com/api/rest/v1/\${{ secrets.BOOMI_ACCOUNT_ID }}/PackagedComponent" \\
            -H "Content-Type: application/json" \\
            -u "\${{ secrets.BOOMI_USERNAME }}:\${{ secrets.BOOMI_PASSWORD }}" \\
            -d '{"componentId":"${componentId}","packageVersion":"\${{ github.sha }}"}'
      
      - name: Deploy to Environment
        run: |
          curl -X POST "https://api.boomi.com/api/rest/v1/\${{ secrets.BOOMI_ACCOUNT_ID }}/DeployedPackage" \\
            -H "Content-Type: application/json" \\
            -u "\${{ secrets.BOOMI_USERNAME }}:\${{ secrets.BOOMI_PASSWORD }}" \\
            -d '{"environmentId":"${environmentId}","packageId":"PACKAGE_ID","listenerStatus":"RUNNING"}'`;
  }
  
  if (tool === 'jenkins' || !tool) {
    commands.jenkins = `// Jenkinsfile
pipeline {
    agent any
    
    environment {
        BOOMI_ACCOUNT = credentials('boomi-account-id')
        BOOMI_CREDS = credentials('boomi-credentials')
    }
    
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'test', 'prod'], description: 'Target environment')
    }
    
    stages {
        stage('Create Package') {
            steps {
                script {
                    def response = httpRequest(
                        url: "https://api.boomi.com/api/rest/v1/\${BOOMI_ACCOUNT}/PackagedComponent",
                        httpMode: 'POST',
                        contentType: 'APPLICATION_JSON',
                        authentication: 'boomi-credentials',
                        requestBody: """{"componentId":"${componentId}","packageVersion":"\${BUILD_NUMBER}"}"""
                    )
                    def pkg = readJSON text: response.content
                    env.PACKAGE_ID = pkg.packageId
                }
            }
        }
        
        stage('Deploy') {
            steps {
                httpRequest(
                    url: "https://api.boomi.com/api/rest/v1/\${BOOMI_ACCOUNT}/DeployedPackage",
                    httpMode: 'POST',
                    contentType: 'APPLICATION_JSON',
                    authentication: 'boomi-credentials',
                    requestBody: """{"environmentId":"${environmentId}","packageId":"\${PACKAGE_ID}","listenerStatus":"RUNNING"}"""
                )
            }
        }
    }
}`;
  }
  
  if (tool === 'azure' || !tool) {
    commands.azure = `# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: boomi-credentials

stages:
  - stage: Package
    jobs:
      - job: CreatePackage
        steps:
          - task: Bash@3
            displayName: 'Create Boomi Package'
            inputs:
              targetType: 'inline'
              script: |
                response=$(curl -s -X POST "https://api.boomi.com/api/rest/v1/$(BOOMI_ACCOUNT_ID)/PackagedComponent" \\
                  -H "Content-Type: application/json" \\
                  -u "$(BOOMI_USERNAME):$(BOOMI_PASSWORD)" \\
                  -d '{"componentId":"${componentId}","packageVersion":"$(Build.BuildNumber)"}')
                echo "##vso[task.setvariable variable=PACKAGE_ID;isOutput=true]$(echo $response | jq -r '.packageId')"

  - stage: Deploy
    dependsOn: Package
    jobs:
      - deployment: DeployToEnv
        environment: '\${{ parameters.environment }}'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: Bash@3
                  displayName: 'Deploy Package'
                  inputs:
                    targetType: 'inline'
                    script: |
                      curl -X POST "https://api.boomi.com/api/rest/v1/$(BOOMI_ACCOUNT_ID)/DeployedPackage" \\
                        -H "Content-Type: application/json" \\
                        -u "$(BOOMI_USERNAME):$(BOOMI_PASSWORD)" \\
                        -d '{"environmentId":"${environmentId}","packageId":"$(PACKAGE_ID)","listenerStatus":"RUNNING"}'`;
  }

  res.json(commands);
});

// ============================================
// START SERVER
// ============================================

app.listen(CONFIG.server.port, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           BOOMI UNIT TEST TOOL - BACKEND SERVER              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Status:  ✓ Running                                          ║`);
  console.log(`║  URL:     http://localhost:${CONFIG.server.port}                            ║`);
  console.log(`║  Boomi:   ${isBoomiConfigured() ? '✓ Configured' : '✗ Not configured (optional)'}                          ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('API Endpoints:');
  console.log('  GET  /api/health              - Health check');
  console.log('  POST /api/test/web-service    - Run web service test');
  console.log('  POST /api/test/scheduled-job  - Run scheduled job test');
  console.log('  POST /api/test/event-stream   - Run event stream test');
  console.log('  POST /api/test/ai-agent       - Run AI agent test');
  console.log('');
  console.log('CI/CD Endpoints:');
  console.log('  GET  /api/cicd/environments   - List environments');
  console.log('  GET  /api/cicd/packages       - List packaged components');
  console.log('  POST /api/cicd/package        - Create package');
  console.log('  GET  /api/cicd/deployments    - List deployments');
  console.log('  POST /api/cicd/deploy         - Deploy package');
  console.log('  POST /api/cicd/pipeline       - Run full pipeline');
  console.log('  POST /api/cicd/generate-cli   - Generate CI/CD scripts');
  console.log('');
  console.log('  GET  /api/boomi/processes     - List Boomi processes');
  console.log('  GET  /api/boomi/atoms         - List Boomi atoms');
  console.log('');
  if (!isBoomiConfigured()) {
    console.log('💡 Tip: To use CI/CD features, configure .env with your Boomi credentials.');
    console.log('');
  }
});

module.exports = app;
