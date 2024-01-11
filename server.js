const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT;

const app = express();

var LaunchDarkly = require('@launchdarkly/node-server-sdk');

const sdkKey = process.env.LD_SDK_KEY;
console.log(`LaunchDarkly SDK Key: ${sdkKey}`);

const featureFlagKey = "your-flag-key";

function showMessage(s) {
    console.log("*** " + s);
    console.log("");
}

if (sdkKey == "") {
    showMessage("Please edit index.js to set sdkKey to your LaunchDarkly SDK key first");
    process.exit(1);
}

const ldClient = LaunchDarkly.init(sdkKey);

const context = {
    kind: "server",
    key: "node-server",
    name: "Node.js Server"
};

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

let clients = [];
let  = '';

function eventsHandler(request, response, next) {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
    };
    response.writeHead(200, headers);

    const data = `data: ${JSON.stringify(logos)}\n\n`;

    response.write(data);

    const clientId = Date.now();

    const newClient = {
        id: clientId,
        response
    };

    clients.push(newClient);

    request.on('close', () => {
        console.log(`${clientId} Connection closed`);
        clients = clients.filter(client => client.id !== clientId);
    });
}

app.get('/events', eventsHandler);

function sendEventsToAll(newLogo) {
    clients.forEach(client => client.response.write(`data: ${JSON.stringify(newLogo)}\n\n`))
}

async function addLogo(request, respsonse, next) {
    const newLogo = request.body;
    logos = newLogo;
    respsonse.json(newLogo)
    return sendEventsToAll(newLogo);
}

app.post('/logo', addLogo);

let http = require('http');

let urlparams = {
    host: 'hostname or ip address of this server',
    port: PORT,
    path: '/logo',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json', 
    }
};

function SendRequest(datatosend) {
    function OnResponse(response) {
        var data = '';

        response.on('data', function (chunk) {
            data += chunk;
        });
        response.on('end', function () {
            console.log(data);
        });
    }

    let request = http.request(urlparams, OnResponse);

    request.write(datatosend);
    request.end();
}

ldClient.waitForInitialization().then(() => {
    showMessage("SDK successfully initialized!");

    ldClient.variation(featureFlagKey, context, false, (err, flagValue) => {
        showMessage(`Feature flag '${featureFlagKey}' is ${flagValue} on startup for this context`);
        if (flagValue) {
            SendRequest('{"info": "The initial server-side feature flag evaluation is", "source": "TRUE"}');
        } else {
            SendRequest('{"info": "The initial server-side feature flag evaluation is", "source": "FALSE"}');
        }
    });

    ldClient.on(`update:${featureFlagKey}`, () => {
        showMessage(`a flag was changed: '${featureFlagKey}'`);
        ldClient.variation(featureFlagKey, context, false, (err, flagValue) => {
            showMessage(`Feature flag '${featureFlagKey}' is now ${flagValue} for this context`);
            if (flagValue) {
                SendRequest('{"info": "The server-side feature flag evaluation on flag change event is", "source": "TRUE"}');
            } else {
                SendRequest('{"info": "The server-side feature flag evaluation on flag change event is", "source": "FALSE"}');
            }
        });
    });

}).catch((error) => {
    showMessage(`SDK failed to initialize: ${error}`);
    process.exit(1);
});