import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { FileService } from './core/index.js';

const port = process.env.PORT || 3000;
const app = express();

app.use(bodyParser.json());


app.post('/accounts/:accountId/files', async (req, res) => {
    console.log('req body', req.body);
    const accountId = req.params.accountId;
    const fileService = new FileService(accountId);
    const result = await fileService.initFileUpload(req.body);
    return res.status(200).send(result);
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
