const { Client, LocalAuth } = require('whatsapp-web.js');
const readline = require('readline');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('Scan QR ini untuk login WhatsApp:');
    require('qrcode-terminal').generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Bot sudah terhubung!');
});

app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;

    const targetNumber = `${number}@c.us`;

    // Periksa apakah nomor terdaftar di WhatsApp
    const isRegistered = await client.isRegisteredUser(targetNumber);
    if (isRegistered) {
        try {
            await client.sendMessage(targetNumber, message);
            res.status(200).json({ status: 'success', message: `Pesan berhasil dikirim ke ${number}` });
        } catch (error) {
            res.status(500).json({ status: 'error', message: `Gagal mengirim pesan ke ${number}` });
        }
    } else {
        res.status(404).json({ status: 'error', message: `${number} tidak ditemukan di WhatsApp.` });
    }
});

client.initialize();

app.listen(3000, () => {
    console.log('Server berjalan di http://localhost:3000');
});