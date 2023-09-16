import express from 'express';
import morgan from 'morgan';

export function createServer() {
    const server = express();

    server.use(morgan(('short')));

    server.get('/status', (req, res) => {
        res.status(200).json({ ok: true });
    });

    return server;
}