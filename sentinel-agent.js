const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { saveBriefcase, loadBriefcase } = require('./briefcase-manager');

class SentinelAgent {
  constructor(config) {
    this.name = config.name || 'Out-of-Factory-Sentinel';
    this.externalPort = config.externalPort || 9000;
    this.sentinelKey = config.sentinelKey || crypto.randomBytes(32).toString('hex');
    this.state = loadBriefcase(`${this.name}-state`) || { missionsCompleted: 0, remoteLogs: [] };

    console.log(`[SENTINEL INITIALIZED] ${this.name} online for external operations.`);
    console.log(`[SENTINEL API KEY] ${this.sentinelKey}`);
  }

  startServer() {
    const server = http.createServer((req, res) => {
      const authHeader = req.headers['authorization'];
      const expectedAuth = `Bearer ${this.sentinelKey}`;

      if (!authHeader || authHeader !== expectedAuth) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access Denied: Invalid Sentinel Token.' }));
        return;
      }

      if (req.method === 'POST' && req.url === '/external-task') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            const result = this.processExternalMission(payload);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              sentinel: this.name,
              status: 'mission-accomplished',
              result: result,
              state: this.state
            }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Malformed external payload' }));
          }
        });
      } else if (req.method === 'GET' && req.url === '/telemetry') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          name: this.name,
          status: 'active',
          missionsCompleted: this.state.missionsCompleted,
          uptime: process.uptime()
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Sentinel endpoint unknown' }));
      }
    });

    server.listen(this.externalPort, () => {
      console.log(`[SENTINEL LISTENING] External node active on port ${this.externalPort}`);
    });
  }

  processExternalMission(mission) {
    console.log(`[SENTINEL MISSION] Executing external objective: "${mission.objective || 'General Recon'}"`);
    this.state.missionsCompleted += 1;
    this.state.remoteLogs.push({
      objective: mission.objective,
      timestamp: new Date().toISOString()
    });

    saveBriefcase(`${this.name}-state`, this.state);
    return `External mission successfully completed by ${this.name}.`;
  }
}

module.exports = SentinelAgent;
