import express from 'express';
import { FileService } from './core/index';


const app = express();

app.post('accounts/:accountId/files', async (req, res) => {
    const accountId = req.params.accountId;
    const fileService = new FileService(accountId);
    const result = await fileService.initFileUpload(req.body);
    return res.status(200).send(result);
});
