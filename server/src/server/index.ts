import express from 'express';

export function createServer() {
    const server = express();

    server.get('/status', (req, res) => {
        res.status(200).json({ ok: true });
    });

    return server;
}