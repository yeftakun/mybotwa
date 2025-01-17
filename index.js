const { Client, LocalAuth } = require('whatsapp-web.js');
const readline = require('readline');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('Scan QR ini untuk login WhatsApp:');
    require('qrcode-terminal').generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Bot sudah terhubung!');

    const targetNumber = '628123456789@c.us';

    // Periksa apakah nomor terdaftar di WhatsApp
    const isRegistered = await client.isRegisteredUser(targetNumber);
    if (isRegistered) {
        console.log('Nomor ditemukan, mengirim pesan...');
        try {
            await client.sendMessage(targetNumber, 'Pesan otomatis dari bot!');
            console.log('Pesan berhasil dikirim!');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.on('line', async (input) => {
            if (input.trim().toLowerCase() === 'p') {
                console.log('Mengirim pesan lagi...');
                try {
                    await client.sendMessage(targetNumber, 'Pesan otomatis dari bot!');
                    console.log('Pesan berhasil dikirim!');
                } catch (err) {
                    console.error('Gagal mengirim pesan:', err);
                }
            }
        });
        } catch (err) {
            console.error('Gagal mengirim pesan:', err);
        }
    } else {
        console.log('Nomor tidak ditemukan di WhatsApp.');
    }
});

client.on('disconnected', (reason) => {
    console.log('Bot terputus:', reason);
});

client.initialize();
