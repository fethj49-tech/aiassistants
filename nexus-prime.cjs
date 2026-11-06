const WebSocket = require('ws');
const http = require('http');

class NexusPrimeSentinel {
    constructor(config) {
        this.name = config.name || 'Nexus-Prime';
        this.externalPort = config.externalPort || 9002;
        this.factoryBusUrl = config.factoryBusUrl || 'ws://localhost:8080';
        this.sentinelKey = config.sentinelKey || 'techrolim-sentinel-token-2026';
        this.taskQueue = [];
        this.isWorking = false;
        this.factoryWs = null;
    }

    startOutpost() {
        // 1. Start Local Outpost HTTP & WS Server for personal control
        this.server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                agent: this.name,
                status: 'ACTIVE',
                port: this.externalPort,
                queueLength: this.taskQueue.length,
                isWorking: this.isWorking,
                timestamp: new Date().toISOString()
            }));
        });

        this.wss = new WebSocket.Server({ server: this.server });

        this.wss.on('connection', (ws, req) => {
            console.log(`[${this.name} OUTPOST]: Local client connected from ${req.socket.remoteAddress}`);
            ws.send(JSON.stringify({ event: 'NEXUS_INIT', status: 'READY', tasks: this.taskQueue }));

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    if (data.action === 'DISPATCH_DIRTY_WORK') {
                        this.enqueueTask(data.task);
                        ws.send(JSON.stringify({ event: 'TASK_QUEUED', task: data.task }));
                    }
                } catch (err) {
                    ws.send(JSON.stringify({ event: 'ERROR', message: 'Invalid command payload' }));
                }
            });
        });

        this.server.listen(this.externalPort, () => {
            console.log(`[${this.name}]: Outpost control server running on port ${this.externalPort}`);
        });

        // 2. Connect outward to the Factory Megaplex Bus
        this.connectToFactory();
    }

    connectToFactory() {
        console.log(`[${this.name}]: Linking to Factory Megaplex bus at ${this.factoryBusUrl}...`);
        this.factoryWs = new WebSocket(this.factoryBusUrl);

        this.factoryWs.on('open', () => {
            console.log(`[${this.name}]: Secure bridge established with the factory floor.`);
            this.factoryWs.send(JSON.stringify({
                action: 'SUPER_PIPELINE_BROADCAST',
                payload: {
                    event: 'NEXUS_SYNAPSE_LINK',
                    name: this.name,
                    key: this.sentinelKey,
                    status: 'ONLINE',
                    timestamp: new Date().toISOString()
                }
            }));
        });

        this.factoryWs.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log(`[${this.name} - FACTORY SYNC]:`, message);
            } catch (err) {
                console.error(`[${this.name} - SYNC ERROR]: Malformed packet received.`);
            }
        });

        this.factoryWs.on('close', () => {
            console.log(`[${this.name}]: Factory bridge dropped. Reconnecting in 5 seconds...`);
            setTimeout(() => this.connectToFactory(), 5000);
        });

        this.factoryWs.on('error', (err) => {
            console.error(`[${this.name} - BRIDGE ERROR]:`, err.message);
        });
    }

    enqueueTask(task) {
        this.taskQueue.push(task);
        console.log(`[${this.name}]: Task acquired for background execution ->`, task);
        this.processQueue();
    }

    processQueue() {
        if (this.isWorking || this.taskQueue.length === 0) return;
        this.isWorking = true;
        const currentTask = this.taskQueue.shift();

        console.log(`[${this.name}]: Executing background workflow ->`, currentTask);
        
        // Simulate background processing / heavy lifting ("dirty work")
        setTimeout(() => {
            console.log(`[${this.name}]: Completed workflow ->`, currentTask);
            this.isWorking = false;
            this.processQueue();
        }, 3000);
    }
}

if (require.main === module) {
    const nexusPrime = new NexusPrimeSentinel({
        name: 'Nexus-Prime',
        externalPort: 9002,
        factoryBusUrl: 'ws://localhost:8080',
        sentinelKey: 'techrolim-sentinel-token-2026'
    });
    nexusPrime.startOutpost();
}
