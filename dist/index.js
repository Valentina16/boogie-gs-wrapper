"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const allowedMethods = ['GET'];
const server = http_1.default.createServer({
    keepAlive: true,
    requestTimeout: 10000,
});
const parseParams = (url = '') => {
    if (!url.includes('?'))
        return null;
    if (!url.includes('endpoint'))
        return null;
    const params = {};
    url.replace('/?', '')
        .split('&')
        .forEach((val) => {
        const keyValue = val.split('=');
        params[keyValue[0]] = decodeURIComponent(keyValue[1]).replace(/\"/g, '');
    });
    return params;
};
const parseHeaders = (headers) => {
    if (headers['x-api-key-player-1']) {
        return { 'x-api-key-player-1': headers['x-api-key-player-1'] };
    }
    if (headers['x-api-key-player-2']) {
        return { 'x-api-key-player-2': headers['x-api-key-player-2'] };
    }
    return {};
};
server.on('request', (request, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!request.method || !allowedMethods.includes(request.method)) {
        sendBadRequest(res, 'Not allowed method');
        return;
    }
    const queryParams = parseParams(request.url);
    if (!queryParams) {
        sendBadRequest(res, 'Missing required params');
        return;
    }
    try {
        const statsHeader = parseHeaders(request.headers);
        const gsLeaderboard = yield getFromGrooveStats(queryParams.endpoint || '', statsHeader);
        const bgLeaderboard = yield getFromBoogieStats(queryParams.endpoint || '', statsHeader);
        if (bgLeaderboard) {
            const isP1 = !!gsLeaderboard['player1'];
            Object.assign(gsLeaderboard[isP1 ? 'player1' : 'player2'], {
                boogie: {
                    name: 'Boogie Stats',
                    bgLeaderboard: (bgLeaderboard['player1'] || bgLeaderboard['player2']).gsLeaderboard,
                },
            });
        }
        res.writeHead(200, {
            'Content-Type': 'application/json',
        });
        res.end(JSON.stringify(gsLeaderboard));
    }
    catch (ex) {
        res.writeHead(500, {
            'Content-Type': 'application/json',
        });
        res.end(JSON.stringify(ex));
    }
}));
const sendBadRequest = (res, message) => {
    console.log(`Bad request: ${message}`);
    res.writeHead(400, {
        'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({
        message,
    }));
};
const getFromGrooveStats = (endpoint, headers) => __awaiter(void 0, void 0, void 0, function* () {
    const values = yield new Promise((resolve, reject) => {
        let resData = '';
        const req = https_1.default.request({
            host: 'api.groovestats.com',
            path: `/${endpoint}`,
            port: 443,
            headers,
            method: 'GET',
            rejectUnauthorized: false,
        }, (result) => {
            result.setEncoding('utf8');
            result.on('data', (chunk) => {
                resData += chunk;
            });
            result.on('end', () => {
                return resolve(resData);
            });
            result.on('error', (err) => {
                return reject(err);
            });
        });
        req.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            return reject(e);
        });
        req.end();
    });
    return JSON.parse(values || '{}');
});
const getFromBoogieStats = (endpoint, headers) => __awaiter(void 0, void 0, void 0, function* () {
    const values = yield new Promise((resolve, reject) => {
        let resData = '';
        const req = https_1.default.request({
            host: 'boogiestats.andr.host',
            path: `/${endpoint}`,
            port: 443,
            headers,
            method: 'GET',
            rejectUnauthorized: false,
        }, (result) => {
            result.setEncoding('utf8');
            result.on('data', (chunk) => {
                resData += chunk;
            });
            result.on('end', () => {
                const p1BoardType = result.headers['bs-leaderboard-player-1'];
                const p2BoardType = result.headers['bs-leaderboard-player-2'];
                console.log(resData);
                if (p1BoardType)
                    return resolve(p1BoardType.toString().toUpperCase() === 'GS'
                        ? ''
                        : resData);
                if (p2BoardType)
                    return resolve(p2BoardType.toString().toUpperCase() === 'GS'
                        ? ''
                        : resData);
            });
            result.on('error', (err) => {
                return reject(err);
            });
        });
        req.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            return reject(e);
        });
        req.end();
    });
    return values ? JSON.parse(values) : null;
});
server.listen(8000);
