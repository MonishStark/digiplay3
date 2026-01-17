/**
 * Upload Playwright report to Google Drive
 * 
 * Environment variables required:
 * - GDRIVE_CLIENT_ID: Google OAuth Client ID
 * - GDRIVE_CLIENT_SECRET: Google OAuth Client Secret
 * - GDRIVE_REFRESH_TOKEN: Google OAuth Refresh Token
 * - REPORT_ZIP: Path to the ZIP file to upload
 * - REPORT_NAME_PREFIX: Prefix for the report name (will add timestamp)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const REPORT_ZIP = process.env.REPORT_ZIP;
const REPORT_NAME_PREFIX = process.env.REPORT_NAME_PREFIX || 'playwright-report';
const CLIENT_ID = process.env.GDRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GDRIVE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GDRIVE_REFRESH_TOKEN;

if (!REPORT_ZIP || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('❌ Missing required environment variables');
  console.error(`REPORT_ZIP: ${REPORT_ZIP}`);
  console.error(`CLIENT_ID: ${CLIENT_ID ? '✓' : '✗'}`);
  console.error(`CLIENT_SECRET: ${CLIENT_SECRET ? '✓' : '✗'}`);
  console.error(`REFRESH_TOKEN: ${REFRESH_TOKEN ? '✓' : '✗'}`);
  process.exit(1);
}

function makeRequest(method, path, headers, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function getAccessToken() {
  console.log('🔄 Getting access token...');
  const body = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: 'refresh_token'
  };

  const response = await makeRequest(
    'POST',
    '/oauth2/v4/token',
    {},
    body
  );

  if (response.status !== 200) {
    throw new Error(`Failed to get access token: ${response.data}`);
  }

  const data = JSON.parse(response.data);
  console.log('✅ Got access token');
  return data.access_token;
}

async function uploadFile(accessToken, fileName, fileStream, mimeType = 'application/zip') {
  console.log(`📤 Uploading ${fileName}...`);

  const metadata = {
    name: fileName,
    mimeType: 'application/zip'
  };

  return new Promise((resolve, reject) => {
    const boundary = '===============7330845974216740156==';
    let body = '';

    body += `--${boundary}\r\n`;
    body += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
    body += JSON.stringify(metadata) + '\r\n';
    body += `--${boundary}\r\n`;
    body += `Content-Type: ${mimeType}\r\n\r\n`;

    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: '/upload/drive/v3/files?uploadType=multipart',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
        'Content-Length': Buffer.byteLength(body) + fs.statSync(REPORT_ZIP).size + `\r\n--${boundary}--\r\n`.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Upload failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);

    req.write(body);
    const fileContent = fs.readFileSync(REPORT_ZIP);
    req.write(fileContent);
    req.write(`\r\n--${boundary}--\r\n`);
    req.end();
  });
}

async function main() {
  try {
    // Check if report ZIP exists
    if (!fs.existsSync(REPORT_ZIP)) {
      throw new Error(`Report ZIP not found: ${REPORT_ZIP}`);
    }

    console.log(`📦 Report file size: ${(fs.statSync(REPORT_ZIP).size / 1024 / 1024).toFixed(2)} MB`);

    // Get access token
    const accessToken = await getAccessToken();

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `${REPORT_NAME_PREFIX}-${timestamp}.zip`;

    // Upload file
    const uploadResult = await uploadFile(accessToken, fileName, REPORT_ZIP);

    if (!uploadResult.id) {
      throw new Error('Upload response missing file ID');
    }

    // Make file publicly shareable (optional)
    console.log('🔗 Making file publicly accessible...');
    const shareResponse = await makeRequest(
      'POST',
      `/drive/v3/files/${uploadResult.id}/permissions`,
      { 'Authorization': `Bearer ${accessToken}` },
      {
        role: 'reader',
        type: 'anyone'
      }
    );

    if (shareResponse.status !== 200) {
      console.warn('⚠️ Warning: Could not make file public');
    } else {
      console.log('✅ File is now publicly accessible');
    }

    // Generate shareable link
    const driveLink = `https://drive.google.com/file/d/${uploadResult.id}/view`;
    console.log(`✅ Upload successful!`);
    console.log(`📂 File ID: ${uploadResult.id}`);
    console.log(`🔗 File name: ${fileName}`);
    console.log(`📥 Download link: ${driveLink}`);

    // Output environment variable for GitHub Actions
    console.log(`\nREPORT_LINK=${driveLink}`);

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

main();
