// Konfigurasi
require('dotenv').config(); // Load konfigurasi dari .env
const botName = 'Shironeko';
const ownerBotIG = 'yeftaasyel_';
const adminPage = 'http://localhost:3000/admin';
const landingPgLink = 'https://yeftakun.github.io/mybotwa';

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const os = require('os');
const { createCanvas, loadImage } = require('canvas'); // Untuk teks di gambar

const app = express();
app.use(bodyParser.urlencoded({ extended: true })); // Untuk parsing form
app.set('view engine', 'ejs'); // Gunakan EJS
app.use(express.static('public')); // Untuk file statis (CSS)

// Simpan waktu saat bot dimulai
const botStartTime = Date.now();

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('Scan QR ini untuk login WhatsApp:');
    require('qrcode-terminal').generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Bot sudah terhubung!');
    console.log('Matikan bot lewat: ', adminPage);

    // Ubah status "About" bot
    try {
        await client.setStatus("🤖 Online");
        // console.log("Status bot berhasil diubah.");
    } catch (error) {
        console.error("Gagal mengubah status bot:", error);
    }
});

// ROUTING: Halaman Admin Panel
app.get('/admin', (req, res) => {
    res.render('admin', { uptime: getBotUptime(), error: null });
});

// ROUTING: Handle form untuk terminate bot
app.post('/terminate', async (req, res) => {
    const password = req.body.password;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (password !== adminPassword) {
        return res.render('admin', { uptime: getBotUptime(), error: "Password salah!" });
    }

    console.log("Bot sedang dimatikan melalui panel admin...");
    try {
        await client.setStatus("❌ Bot offline");
        console.log("Status bot berhasil diubah menjadi Offline.");
    } catch (error) {
        console.error("Gagal mengubah status bot:", error);
    }

    // Redirect ke GitHub Pages sebelum bot mati
    res.redirect(landingPgLink);

    setTimeout(() => {
        process.exit();
    }, 2000);
});

// Fungsi untuk mendapatkan informasi server
function getServerInfo() {
    return `OS: ${os.type()} ${os.release()} 
CPU: ${os.cpus()[0].model}
RAM: ${(os.totalmem() / 1073741824).toFixed(2)} GB
Node.js: ${process.version}`;
}

// Fungsi untuk mendapatkan uptime bot
function getBotUptime() {
    let uptimeMs = Date.now() - botStartTime;
    let seconds = Math.floor((uptimeMs / 1000) % 60);
    let minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
    let hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
    let days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

    return `${days > 0 ? `${days} hari ` : ''}${hours} jam ${minutes} menit ${seconds} detik`;
}

// Fungsi untuk menambahkan teks ke gambar
async function addTextToImage(imageBuffer, topText, bottomText) {
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Gambar asli
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Konfigurasi teks
    const { registerFont } = require('canvas');
    registerFont('C:/Windows/Fonts/impact.ttf', { family: 'Impact' });
    ctx.font = `${Math.floor(canvas.height / 10)}px Impact`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.textAlign = 'center';

    // Tambahkan teks atas
    if (topText) {
        ctx.strokeText(topText, canvas.width / 2, canvas.height * 0.1);
        ctx.fillText(topText, canvas.width / 2, canvas.height * 0.1);
    }

    // Tambahkan teks bawah
    if (bottomText) {
        ctx.strokeText(bottomText, canvas.width / 2, canvas.height * 0.9);
        ctx.fillText(bottomText, canvas.width / 2, canvas.height * 0.9);
    }

    return canvas.toBuffer();
}

client.on('message', async (msg) => {
    if (msg.hasMedia && msg.body.startsWith('.s')) {
        let processingMessage;
        try {
            processingMessage = await msg.reply('_Memproses..._');
        } catch (error) {
            console.error('Gagal mengirim pesan "Memproses...":', error);
        }

        const media = await msg.downloadMedia();
        const mimeType = media.mimetype;
        const timestamp = Date.now();
        const stickerPath = path.join(__dirname, `sticker_${msg.from}_${timestamp}.webp`);

        if (mimeType.startsWith('image/')) {
            try {
                let imageBuffer = Buffer.from(media.data, 'base64');

                // Cek apakah perintah adalah ".smeme Caption1|Caption2"
                if (msg.body.startsWith('.smeme')) {
                    const args = msg.body.replace('.smeme', '').trim();
                    const [topText, bottomText] = args.split('|').map(t => t.trim());

                    if (!topText && !bottomText) {
                        return msg.reply('Format salah! Gunakan: *.smeme Caption1|Caption2*');
                    }

                    // Tambahkan teks ke gambar
                    imageBuffer = await addTextToImage(imageBuffer, topText, bottomText);
                }

                // Konversi ke stiker
                await sharp(imageBuffer)
                    .resize(512, 512, { fit: 'inside' })
                    .toFormat('webp')
                    .toFile(stickerPath);

                const stickerData = fs.readFileSync(stickerPath);
                const stickerMedia = new MessageMedia('image/webp', stickerData.toString('base64'));

                await msg.reply(stickerMedia, undefined, {
                    sendMediaAsSticker: true,
                    stickerAuthor: botName
                });

                fs.unlinkSync(stickerPath);
            } catch (error) {
                console.error('Gagal membuat stiker:', error);
                await msg.reply('Maaf, terjadi kesalahan saat membuat stiker.');
            }
        } else {
            await msg.reply('Maaf, hanya gambar yang bisa dijadikan stiker.');
        }

        if (processingMessage) {
            try {
                await processingMessage.delete(true);
            } catch (error) {
                console.error('Gagal menghapus pesan "Memproses...":', error);
            }
        }
    } else if (msg.body === '.info') {
        const serverInfo = getServerInfo();
        const uptime = getBotUptime();
        const info = `*Selamat datang di Shironeko Bot🤖*

🔧 *Command:*
- *.s*: Stiker
- *.smeme Caption1|Caption2:* Stiker dengan caption
- *.info*: Informasi bot
- *.owner*: Owner bot

📡 *Hosted at:*
${serverInfo}

⏳ *Runtime Bot:* ${uptime}`;

        await msg.reply(info);
    }  else if (msg.body === '.owner') {
        const ownerInfo = `👤 *Owner Bot*\n\nFollow IG @${ownerBotIG}:\n🔗 https://instagram.com/${ownerBotIG}\n\nheheL:D`;
        await msg.reply(ownerInfo);
    }
});

client.initialize();

app.listen(3000, () => {
    console.log('Server berjalan di http://localhost:3000');
});
