/**
 * WhatsApp Bot Script with Web QR Interface
 * Optimized for Koyeb Hosting with Docker
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const qrcode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

// --- SERVER SETUP ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Koyeb මගින් ලබාදෙන PORT එක ලබාගැනීම
const PORT = process.env.PORT || 8600; 

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize WhatsApp Client (Koyeb/Linux සඳහා විශේෂයෙන් සකස් කරන ලදී)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    }
});

// --- CLIENT EVENTS ---

// Generate QR and send to Web Interface
client.on('qr', (qr) => {
    console.log('QR Code received. Generating for web...');
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Error generating QR', err);
            return;
        }
        io.emit('qr', url);
        io.emit('message', 'QR Code Received. Please Scan.');
    });
});

client.on('ready', () => {
    console.log('✅ WhatsApp bot is ready!');
    io.emit('ready', 'Bot is Ready!');
    io.emit('message', 'Bot is Connected and Ready!');
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
    io.emit('message', 'Authenticated! Getting ready...');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    io.emit('message', 'Auth Failure. Please restart.');
});

// --- BOT LOGIC ---

const WHITELISTED_DOMAINS = [
    "cloudnet.one", "buy.cloudnet.one", "game.cloudnet.one", "cloudnet-movies.store",
    "t.me/jnrgamestore", "t.me/cloudnetv2ray", "youtube.com", "mediafire.com",
    "whatsapp.com", "t.me", "cpaid.rf.gd", "https://chat.whatsapp.com/CbbmLr2vVaTApSBlQ0HElx"
];

const BANNED_WORDS = [
    "fuck", "shit", "bitch", "asshole", "nigga", "wtf", "pussy",
    "rape", "dick", "slut", "sex", "boobs", "cock", "porn",
    "පකයා", "අම්මට", "ගණිකාව", "කමක් නෑ", "කලුකතා"
];

function containsExternalLink(message) {
    const regex = /(https?:\/\/[^\s]+)/g;
    const matches = message.match(regex);
    if (matches) {
        for (let link of matches) {
            try {
                const domain = new URL(link).hostname.replace('www.', '');
                if (!WHITELISTED_DOMAINS.includes(domain)) {
                    return true;
                }
            } catch (_) { }
        }
    }
    return false;
}

function containsBadWords(message) {
    const text = message.toLowerCase();
    return BANNED_WORDS.some(word => text.includes(word));
}

client.on('message', async (message) => {
    const text = message.body.toLowerCase();

    if (containsExternalLink(message.body)) {
        try {
            await message.delete(true);
            const contact = await message.getContact();
            const msg = `🛑 @${contact.number} ඔබගේ පණිවිඩය ඉවත් කරන ලදී. අවසර නොමැති ලින්ක්ස් යොමු කිරීමෙන් වලකින්න.`;
            await client.sendMessage(message.from, msg, { mentions: [contact] });
            return;
        } catch (err) {
            console.log("⚠️ Error deleting link:", err.message);
        }
    }

    if (containsBadWords(message.body)) {
        try {
            await message.delete(true);
            const contact = await message.getContact();
            const msg = `⚠️ @${contact.number} ඔබගේ පණිවිඩය ඉවත් කරන ලදී. කරුණාකර අපහාසජනක වචන භාවිතය වලක්වන්න.`;
            await client.sendMessage(message.from, msg, { mentions: [contact] });
            return;
        } catch (err) {
            console.log("⚠️ Error deleting bad word:", err.message);
        }
    }

    const replyWithMention = async (msgText) => {
        const chat = await message.getChat();
        if (chat.isGroup) {
            const contact = await message.getContact();
            await client.sendMessage(message.from, `@${contact.number} ${msgText}`, {
                mentions: [contact],
                quotedMessageId: message.id._serialized
            });
        } else {
            await message.reply(msgText);
        }
    };

    if (text === '!meme') {
        const memeFolder = path.join(__dirname, 'memes'); 

        try {
            if (!fs.existsSync(memeFolder)) {
                await message.reply('Meme folder not found on server. Please create a "memes" folder in your project.');
                return;
            }
            const files = fs.readdirSync(memeFolder);
            const imageFiles = files.filter(file => {
                const extension = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif'].includes(extension);
            });
            if (imageFiles.length === 0) {
                await message.reply('No images in the meme folder.');
                return;
            }
            const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
            const imagePath = path.join(memeFolder, randomImage);
            const media = MessageMedia.fromFilePath(imagePath);
            await client.sendMessage(message.from, media, { caption: 'Here is a random meme for you!' });
        } catch (error) {
            await message.reply('Error accessing meme folder.');
        }
        return;
    }

    // --- YOUR CUSTOM COMMANDS ---
    if (text === 'hi' || text === 'hello' || text === 'h' || text === 'hy' || text === 'hey'| text === 'v2ray'| text === 'hyperv2ray') {
        replyWithMention(`
            *Hi! 👋 Welcome to Hyper V2Ray. How can we help you today? 😊*

*හායි! 👋 Hyper V2Ray වෙත සාදරයෙන් පිළිගනිමු 😊
ඔබට අද අපෙන් කෙසේ උදව් කළ හැකිද? 💻✨*

 *1️⃣ About*
 *2️⃣ Packages*
 *3️⃣ Plan*
 *4️⃣ Website*
 *5️⃣ Contact*
 *6️⃣ Group*
 *7️⃣ Order*
 *8️⃣ MyUsage*


> *Hyper V2ray*`);
    }

    if (text === 'live walata' || text === 'live karanna') {
        replyWithMention(' 🤔 ඔයා ලයිව් කරනවද ?');
    }

    if (text === '😓' || text === '😭') {
        replyWithMention('🫠 ඇයි දුකෙන් වගේ');
    }

    if (text === 'ado') {
        replyWithMention('ඇයි dow');
    }

    if (text === 'mm') {
        replyWithMention('බකමූනෙක්ද ඔයා 🤦‍♂️');
    }

    if (text === 'gn all') {
        replyWithMention('අනේ ඉන්න යන්න එපා 😗');
    }

    if (text === 'aula' || text === 'awla' || text === 'awula' || text === 'aul' || text === 'ado aula') {
        replyWithMention('ඇයි අවුල මොකක්ද මටත් කියන්නකෝ');
    }

    if (text === 'ai') {
        replyWithMention('ඇයි බන් 🥲');
    }

    if (text === 'mk') {
        replyWithMention('මුකුත් නෑ හලෝ ඔහේ ඉන්නව ඉතින් මමත් 😎 ');
    }

    if (text === 'gm' || text === 'good morning') {
        replyWithMention('Good Morning! ☀️ ඔබට සුභ උදෑසනක් වේවා! 😊');
    }

    if (text === 'good night') {
        replyWithMention('Good night! 🌙 ඔබට සුභ රාත්‍රියක් වේවා! 😊');
    }

    if (text === 'bye') {
        replyWithMention('👋 බායි නැවත හමුවෙමු 😊');
    }

    if (text === '1') {
        replyWithMention(`
        *✅About This..,*

•මේකෙන් වෙන්නේ ඔයා USE කරන පැකේජ් එකේ DATA ඔයාට ANYTIME විදියට USE කරන්න පුලුවන් වෙන විදියට හදල දෙන එක එතකොට ඔයාගේ පැකේජ් එකේ තියෙන DATA තමයි කැපෙන්නේ.

•මේක Gaming වලට තව Streaming ,Downloading වගෙ ඕන දේකට පවිච්චි කරන්නත් පුලුවන්.

*🚀High Speed*
*🔒Full Privacy*
*🛜Low Ping*
*No Data Limit*

📱 භාවිතා කරන්නේ කොහොමද?

අප ලබාදෙන කුඩා Config Code එක App එකට ඇතුළත් කර "Connect" කිරීම පමණක් ප්‍රමාණවත් වේ.

*Android👇*

NetMod
https://play.google.com/store/apps/details?id=com.netmod.syna

*IOS👇*

NPV Tunnel
https://play.google.com/store/apps/details?id=com.napsternetlabs.napsternetv

*Windows Software👇*

NetMod
https://sourceforge.net/projects/netmodhttp/files/Setup/NetMod_x64%28Latest%29.exe/download

*Hyper V2Ray*
        `);
    }

    if (text === '2') {
        replyWithMention(`
        *🛡️Hyper V2Ray🛡️*

The Ultimate High-Speed Solution🚀
ඔබේ සාමාන්‍ය Data පැකේජයෙන් උපරිම ප්‍රයෝජන ගන්න! 💯💥

⚡Features:

📥 High Speed Downloading

📤 High Speed Uploading

📞 WhatsApp Audio/Video Calls Support

🎮 Low-Ping for Online Gaming

📺 YouTube 4K & Netflix 2K/4K Support

🌐 Compatible with All Routers & Mobiles

☁️ Supported Packages:

💫Dialog SIM
•Fun Blaster 348 - 20GB (30Day)
•TikTok 997 - Unlimited (30Day)
•TikTok 297 - Unlimited (7Day)

💫Dialog Router
•Work & Learn 724 - Unlimited (30Day)

💫Hutch
•ZOOM 224 - 30GB (30Day)

💫Airtel
•Youtube 260 - Unlimited (30Day)
•TikTok 997 - Unlimited (30Day)
•TikTok 297 - Unlimited (7Day)

💫Mobitel
•ZOOM 222 - 25GB (30Day)
•ZOOM 874 - NonStop Data (30Day)

💫SLT Fiber
•Netflix 1990 - Unlimited (30Day)
•Meet Lite 195 - 30GB (30Day)
•Meet Max 490 - 100GB (30Day)

💳 Payment Methods:
🏦 Bank Transfer
💰 Ezcash

📩 සම්බන්ධතාවය ලබා ගැනීමට දැන්ම අපිට Message එකක් එවන්න!

Whatsapp👇

https://wa.me/+94766893639?text=Hyper_V2Ray

*Hyper V2Ray*`);
    }

    if (text === '3') {
        replyWithMention(`
        📢 Hyper V2Ray – Updated Plan Prices🌐

Here are our available V2Ray plans with the latest pricing:

🔹 Standard Plan – 400 LKR  
•  Valid for 30 Days
•⁠  ⁠500GB BandWidth
•  High Speed Servers

🔸 VIP Plan – 700 LKR  
•  Valid for 30 Days
•⁠  ⁠800GB BandWidth
•  High Speed Servers

🔺 MVP Plan – 950 LKR 
•  Valid for 30 Days
•⁠  ⁠Unlimited BandWidth
•  High Speed Servers


🌟 Special Plans 🌟  
These are optional premium long-term plans:

🗓️ *3-Month Plan – 1,599 LKR* • *VIP PLAN ONLY*
•  Valid for 3 months  
•  Unlimited BandWidth
•⁠  ⁠High Speed Servers

🗓️ 1-Year Plan – 3,000 LKR 
•⁠  ⁠Valid for 12 months  
•  Unlimited BandWidth
•⁠  ⁠High Speed Servers


💳 Payment Methods:
🏦 Bank Transfer
💰 Ezcash

📩 සම්බන්ධතාවය ලබා ගැනීමට දැන්ම අපිට Message එකක් එවන්න!

Whatsapp👇

https://wa.me/+94766893639?text=Hyper_V2Ray

*Hyper V2Ray*`);
    }

    if (text === '4') {
        replyWithMention(`
        *🚀HyperV2ray සමඟින් සුපිරි වේගවත් ඉන්ටර්නෙට් අත්දැකීමක්!*

ඔයත් Fast සහ Secure connection එකක් සොයන කෙනෙක්ද?
එහෙනම් අදම අපේ වෙබ් අඩවියට පිවිසෙන්න.🔒

🌐 Visit Website: https://hyperv2ray.iceiy.com

අපගේ විශේෂත්වයන්:

✅ High Speed
✅ Privacy
✅ Reliable Service

අදම අපේ සේවාව ලබාගෙන වෙනස වටහා ගන්න! 🌍✨

*Hyper V2Ray*`);
    }

    if (text === '5') {
        replyWithMention(`
        *🚀Hyper V2Ray - Get Connected!*

For more information or support regarding our services, please reach out to us via:

🪀 WhatsApp: 
https://wa.me/+94766893639?text=Hyper_V2Ray

🌐 Website:
https://hyperv2ray.iceiy.com

✉️ Email: dinethinduwara999@gmail.com

Our team is always ready to assist you! 🤝✨

*Hyper V2Ray 🛡️*`);
    }

    if (text === '6') {
        replyWithMention(`
        *🚀 HyperV2ray Chat Group  එකට අදම එකතු වෙන්න! 🌐*

ඔයා ඉතා වේගවත් සහ ආරක්ෂිත V2ray Service එකක් සොයන කෙනෙක්ද? එහෙනම් අපේ official WhatsApp group එකට දැන්ම join වෙන්න!

Group එකට එකතු වීමෙන් ඔබට ලැබෙන වාසි:

✅ අලුත්ම Fast Servers සහ Updates ඉක්මනින්ම ලබාගැනීම.

✅ සේවාවන් සම්බන්ධ ගැටළු වලට ඉක්මන් සහාය.

✅ විශේෂ දීමනා සහ Free accounts ගැන දැනුවත් වීම.

👇 දැන්ම පහත ලින්ක් එකෙන් Join වෙන්න:
🔗 https://chat.whatsapp.com/CbbmLr2vVaTApSBlQ0HElx

Internet ලෝකයේ සුපිරි වේගයක් අත්විඳින්න අපිත් එක්ක එකතු වෙන්න! 💻📱✨


*Hyper V2Ray*`);
    }

    if (text === '7') {
        replyWithMention(`
        *👋Hyper V2Ray Order🌩️*

ඔබේ සීමිත Package  හරහා Unlimited High-Speed Internet ලබා දීමට අප සූදානම්! 🚀💨

✅ Why Choose Us?
🔹 4K Ultra HD Streaming 📺
🔹 Low-Ping Gaming 🎮
🔹 Full Privacy 🛡️

You can place your order quickly and easily our Website:

🌐 Visit Website: 
https://hyperv2ray.iceiy.com

📩 Or Send Us Your Details Below:

1️⃣ Your Name
2️⃣ Plan
3️⃣ Package

Example👇 
> *Name - Induwara*
> *Plan - Standard*
> *Package - Airtel TikTok 997 30Day*

අපි ඉක්මනින්ම ඔබව සම්බන්ධ කරගන්නෙමු! 🤝

*Hyper V2Ray*`);
    }

    if (text === '8') {
        replyWithMention(`
         Check your Data Usage 📊 Click the link below and paste the Config Key we sent you to see your balance.

🔗 Link: https://usage.novalink.lk/

: ඔයාගේ Data Usage එක බලාගන්න 📊 පහත Link එකට ගොස් අපි එවපු Config Key එක එතන Paste කරන්න.

🔗 Link: https://usage.novalink.lk/

*HyperV2ray Powered by Novalink ⚡*`);
    }
});

// START SERVER
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Web Server Running on port: ${PORT}`);
    client.initialize();
});
