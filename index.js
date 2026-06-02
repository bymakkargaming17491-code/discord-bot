const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================= STOCK =================
let stock = {
    "1m": [],
    "3m": []
};

function saveStock() {
    fs.writeFileSync("./stock.json", JSON.stringify(stock, null, 2));
}

// ================= AUCTION =================
let activeAuction = false;

// ================= READY =================
client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ================= COMMANDS =================
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(" ");
    const cmd = args[0];

    // HELP
    if (cmd === "!help") {
        return message.reply(`
🛒 الأوامر:
!stock - عرض المخزون
!buy 1m - شراء نيترو شهر
!buy 3m - شراء نيترو 3 شهور
!add 1m - إضافة نيترو (أدمن)
!مزاد - إنشاء مزاد
        `);
    }

    // STOCK
    if (cmd === "!stock") {
        return message.reply(`📦 المخزون:
1m: ${stock["1m"].length}
3m: ${stock["3m"].length}`);
    }

    // ADD STOCK
    if (cmd === "!add") {
        const type = args[1];

        if (!stock[type]) return message.reply("❌ نوع غير صحيح");

        const code = `NITRO-${Math.random().toString(36).slice(2, 10)}`;

        stock[type].push(code);
        saveStock();

        return message.reply(`✅ تم إضافة ${type}`);
    }

    // BUY SYSTEM
    if (cmd === "!buy") {
        const type = args[1];

        if (!stock[type] || stock[type].length === 0)
            return message.reply("❌ لا يوجد مخزون");

        const code = stock[type].shift();
        saveStock();

        try {
            await message.author.send(`🎉 تم الشراء:\n${type}\nالكود: ${code}`);
            message.reply("📩 تم الإرسال في الخاص");
        } catch {
            message.reply("❌ ما قدرت أرسل لك خاص");
        }
    }

    // ================= AUCTION =================
    if (cmd === "!مزاد") {
        if (activeAuction) return message.reply("❌ يوجد مزاد شغال");

        activeAuction = true;

        let step = 0;
        let item = "";
        let startPrice = 0;

        message.reply("📦 اكتب اسم السلعة:");

        const collector = message.channel.createMessageCollector({
            filter: m => m.author.id === message.author.id,
            time: 60000
        });

        collector.on("collect", msg => {
            step++;

            if (step === 1) {
                item = msg.content;
                msg.channel.send("💰 اكتب السعر:");
            }

            if (step === 2) {
                startPrice = Number(msg.content);

                if (!startPrice) {
                    step = 1;
                    return msg.channel.send("❌ رقم غير صحيح");
                }

                collector.stop();
                startAuction(message.channel, message.author, item, startPrice);
            }
        });
    }
});

// ================= START AUCTION =================
function startAuction(channel, owner, item, startPrice) {
    let currentBid = startPrice;
    let lastBidder = null;

    channel.send(`
🏆 مزاد جديد
👤 صاحب المزاد: <@${owner.id}>
📦 السلعة: ${item}
💰 السعر: ${startPrice}
`);

    const collector = channel.createMessageCollector({
        filter: m => !m.author.bot
    });

    collector.on("collect", msg => {
        const amount = Number(msg.content);

        if (!amount) return;

        if (amount <= currentBid) {
            msg.react("❌");
            return;
        }

        currentBid = amount;
        lastBidder = msg.author.id;

        msg.react("✅");
    });

    setTimeout(() => {
        channel.send("⏳ باقي دقيقتين على نهاية المزاد");
    }, 240000);

    setTimeout(() => {
        collector.stop();

        channel.send(`
🏁 انتهى المزاد

🏆 الفائز: ${lastBidder ? `<@${lastBidder}>` : "لا يوجد"}
💰 السعر النهائي: ${currentBid}
👤 صاحب المزاد: <@${owner.id}>
        `);

        activeAuction = false;
    }, 300000);
}

client.login(process.env.TOKEN);
