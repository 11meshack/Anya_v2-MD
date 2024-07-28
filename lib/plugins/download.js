const Config = require('../../config');
const axios = require('axios');
const { mediafiredl, ttdl, facebookdl, twitterdl } = require('@bochilteam/scraper');
const {
    anya,
    UI,
    getBuffer,
    delay,
    PinterestDownloader,
    formatDate,
    fancy11,
    writeExifInVid
 } = require('../lib');
let pinterestImageCount = 3; // Should be more than 1

//༺─────────────────────────────────────

anya({
    name: "pinterest",
    alias: ["pint"],
    react: "🍸",
    need: "query",
    category: "download",
    desc: "Search images from Pinterest",
    filename: __filename
},
async (anyaV2, pika, { args }) => {
    if (args.length < 1) return pika.reply("_Enter a query!_");
    const text = args.join(" ");
    if (/^https:\/\/(www\.)?pinterest\.com\/.+/i.test(text)) return pika.reply("_Use `" + prefix + "pinturl <url>` for URLs");
    if (/https:/.test(text)) return pika.reply("_❌ Invalid pinterest url!_");
    const { key } = await pika.keyMsg("```Searching...```");
    try {
        const downloader = new PinterestDownloader();
        downloader.searchPinterest(text)
        .then(async r => {
            if (r.length < 1) return pika.edit("_🅾️No results found!_", key);
            const ui = await UI.findOne({ id: "userInterface" }) || (await new UI({ id: "userInterface" }).save());
            if (ui.buttons) {
                const list = [];
                for (const i of r) {
                    list.push(`{\"header\":\"\",\"title\":\"${Config.themeemoji} ${i.grid_title !== "" ? i.grid_title : "No_Title"}\",\"description\":\"Creation Date: ${i.created_at}\",\"id\":\"${prefix}pinturl ${i.pin}\"}`);
                }
                const caption = `
\`📌 »» Pinterest Search!\`

*👤 Name:* _@${pika.sender.split("@")[0]}_
*🏮 Search Term:* _${text}_

_click on the button below and choose image!_
`;
                await anyaV2.sendButtonImage(pika.chat, {
                    caption: caption,
                    image: await getBuffer(r[0].images_url),
                    footer: Config.footer,
                    buttons: [{
                        "name": "single_select",
                        "buttonParamsJson": `{\"title\":\"Tap to choose 📌\",\"sections\":[{\"title\":\"Term: ${text}\",\"highlight_label\":\"Pinterest\",\"rows\":[${list.join(",")}]}]}`
                    },
                    {
                        "name": "quick_reply",
                        "buttonParamsJson": `{\"display_text\":\"Script 🔖\",\"id\":\"${prefix}sc\"}`
                    },
                    {
                        "name": "quick_reply",
                        "buttonParamsJson": `{\"display_text\":\"Owner 👤\",\"id\":\"${prefix}owner\"}`
                    }],
                    contextInfo: { mentionedJid: [pika.sender] }
                }, { quoted: pika });
            } else {
                let num = 1;
                for (const i of r) {
                    if (num === pinterestImageCount) return;
                    await anyaV2.sendMessage(pika.chat, {
                        image: await getBuffer(i.images_url),
                        caption: `
*💖 Title:* ${i.grid_title !== "" ? i.grid_title : "No_Title"}
*⛩️ Uploaded On:* ${i.created_at}

> Url: ${i.pin}
> ${Config.footer}
`.trim()
                    }, { quoted:pika });
                    num++
                }
            }
        });
        return pika.edit("> ✅ Searched!", key);
    } catch (err) {
        console.error(err);
        return pika.edit("ERROR!: " + err.message, key);
    }
});

//༺─────────────────────────────────────

anya({
    name: "pinturl",
    alias: ["pinteresturl"],
    react: "🏮",
    need: "url",
    category: "download",
    desc: "Search images from Pinterest using url",
    filename: __filename
},
async (anyaV2, pika, { args }) => {
    if (args.length < 1) return pika.reply("_Enter a pinterest image url!_");
    if (!/^https:\/\/(www\.)?pinterest\.com\/.+/i.test(args[0])) return pika.reply("_Invalid url!_");
    const { key } = await pika.keyMsg("```Downloading...```");
    try {
        const downloader = new PinterestDownloader();
        downloader.imageDown(args[0])
        .then(async r => {
            if (!r.url) return pika.edit("_🅾️No image found!_", key);
            await anyaV2.sendMessage(pika.chat, {
                image: await getBuffer(r.url)
            }, { quoted:pika });
            pika.edit("> ✅ Downloaded!", key);
        });
    } catch (err) {
        console.error(err);
        return pika.edit("ERROR!: " + err.message, key);
    }
});

//༺─────────────────────────────────────

anya({
    name: "igdl",
    react: "🌠",
    need: "url",
    category: "download",
    desc: "Download Instagram Posts",
    filename: __filename
},
async (anyaV2, pika, { args, prefix, command }) => {
    if (!args[0]) return pika.reply(`Post URL needed..!`);
    if (!/instagram.com/.test(args[0])) return pika.reply(`❌Invalid Url..!`);
    const { key } = await pika.keyMsg(Config.message.wait);
    try {
        const fetch = await axios.get(`${Config.api.api1}/api/igdlv1?url=${args.join(" ")}`);
        const response = fetch.data.data;
        for (let i = 0; i < response.length; i++) {
            await anyaV2.sendFileUrl(pika.chat, response[i].url_download, `> Downloaded from Instagram`, pika);
        }
    } catch (error) {
        pika.deleteMsg(key);
        return pika.reply(`Failed to download post: ${error.message}`);
    }
});

//༺─────────────────────────────────────

anya({
    name: "twittervid",
    alias: ['twittervideo', 'twitvid'],
    react: "💫",
    need: "url",
    category: "download",
    desc: "Download Twitter videos without watermark",
    cooldown: 10,
    filename: __filename
},
async (anyaV2, pika, { args, prefix, command }) => {
    if (args.length < 1) return pika.reply(`*${Config.themeemoji} Example:* ${prefix + command} https://twitter.com/someone/status/1234567890123456789`);
    if (!/twitter\.com\/\w+\/status\/\d+|x\.com\/\w+\/status\/\d+/.test(args[0])) return pika.reply("❎ Invalid URL, baka!");
    const { key } = await pika.keyMsg(Config.message.wait);
    twitterdl(args[0])
    .then(async res => {
        if (!res) return pika.reply("❎ No results found!");
        const videoBuffer = await getBuffer(res.video);
        await anyaV2.sendMessage(pika.chat, {
            video: videoBuffer,
            caption: `
*⎙ Twitter*

▢ *User:* ${res.username}
▢ *Description:* ${res.description ? res.description : "N/A"}
▢ *Quality:* HD
▢ *Link:* ${res.url}

${Config.footer}
`.trim()
        }, { quoted: pika });
        return pika.edit("> ✅ Downloaded!", key);
    })
    .catch(err => {
        console.error(err);
        pika.edit("Error! Be sure if it's a *video* url or not, or try again in 30 seconds.", key);
    });
});

//༺─────────────────────────────────────

anya({
    name: "twitdoc",
    alias: ['twitterdoc', 'xdoc'],
    react: "📄",
    need: "url",
    category: "download",
    desc: "Download Twitter/X videos as documents",
    cooldown: 10,
    filename: __filename
},
async (anyaV2, pika, { args, prefix, command }) => {
    if (args.length < 1) return pika.reply(`_Onii-chan, provide a Twitter/X video URL!_`);    
    if (!/twitter\.com\/\w+\/status\/\d+|x\.com\/\w+\/status\/\d+/.test(args[0])) return pika.reply("❎ Invalid URL, baka!");
    const { key } = await pika.keyMsg("_Processing your request, senpai..._");
    twitterdl(args[0])
    .then(async response => {
        if (!response) return pika.reply("❎ No results found, gomen!");
        const videoBuffer = await getBuffer(response.video);
        await anyaV2.sendMessage(pika.chat, {
            document: videoBuffer,
            mimetype: "video/mp4",
            fileName: `Twitter_video_${Date.now()}.mp4`,
            caption: `*🗣️ User:* ${response.username}\n\n*🍂 Description:* ${response.description ? response.description : "N/A"}\n\n> ${Config.footer}`,
            contextInfo: {
                externalAdReply: {
                    title: "𝗔𝗻𝘆𝗮 𝗧𝘄𝗶𝘁𝘁𝗲𝗿 𝗘𝗻𝗴𝗶𝗻𝗲",
                    body: response.description,
                    thumbnailUrl: response.thumb,
                    showAdAttribution: true,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: pika })
        .then(() => pika.edit("> ✅ Downloaded, enjoy! 💕", key));
    })
    .catch(err => {
        console.error(err);
        pika.edit("❎ Error occurred, try again in 30 seconds, senpai.", key);
    });
});

//༺─────────────────────────────────────

anya({
    name: "twitaudio",
    alias: ['twitteraudio', 'xaudio'],
    react: "🎶",
    need: "url",
    category: "download",
    desc: "Download Twitter/X videos as audio files",
    cooldown: 10,
    filename: __filename
},
async (anyaV2, pika, { args, prefix, command }) => {
    if (args.length < 1) return pika.reply(`_Onii-chan, provide a Twitter/X video URL!_`); 
    if (!/twitter\.com\/\w+\/status\/\d+|x\.com\/\w+\/status\/\d+/.test(args[0])) return pika.reply("❎ Invalid URL, baka!");
    const { key } = await pika.keyMsg("_Processing your request, senpai..._");
    twitterdl(args[0])
    .then(async response => {
        if (!response) return pika.reply("❎ No results found, gomen!");
        const audioBuffer = await getBuffer(response.audio);
        await anyaV2.sendMessage(pika.chat, {
            audio: audioBuffer,
            contextInfo: {
                externalAdReply: {
                    title: "𝗔𝗻𝘆𝗮 𝗧𝘄𝗶𝘁𝘁𝗲𝗿 𝗘𝗻𝗴𝗶𝗻𝗲",
                    body: response.description,
                    thumbnailUrl: response.thumb,
                    showAdAttribution: true,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: pika })
        .then(() => pika.edit("> ✅ Downloaded, enjoy! 💕", key));
    })
    .catch(err => {
        console.error(err);
        pika.edit("❎ Error occurred, try again in 30 seconds, senpai.", key);
    });
});

//༺─────────────────────────────────────

anya({
    name: "twitauddoc",
    alias: ['twitteraudiodoc', 'xaudiodoc'],
    react: "🎶",
    need: "url",
    category: "download",
    desc: "Download Twitter/X videos as audio documents",
    cooldown: 10,
    filename: __filename
},
async (anyaV2, pika, { args, prefix, command }) => {
    if (args.length < 1) return pika.reply(`_Onii-chan, provide a Twitter/X video URL!_`); 
    if (!/twitter\.com\/\w+\/status\/\d+|x\.com\/\w+\/status\/\d+/.test(args[0])) return pika.reply("❎ Invalid URL, baka!");
    const { key } = await pika.keyMsg("_Processing your request, senpai..._");
    twitterdl(args[0])
    .then(async response => {
        if (!response) return pika.reply("❎ No results found, gomen!");
        const audioBuffer = await getBuffer(response.audio);
        await anyaV2.sendMessage(pika.chat, {
            document: audioBuffer,
            mimetype: "audio/mpeg",
            fileName: "Anya_Twitter_Audio.mp3",
            caption: `*🗣️ User:* ${response.username}\n\n*🍂 Description:* ${response.description ? response.description : "N/A"}\n\n> ${Config.footer}`,
            contextInfo: {
                externalAdReply: {
                    title: "𝗔𝗻𝘆𝗮 𝗧𝘄𝗶𝘁𝘁𝗲𝗿 𝗘𝗻𝗴𝗶𝗻𝗲",
                    body: response.description,
                    thumbnailUrl: response.thumb,
                    showAdAttribution: true,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: pika })
        .then(() => pika.edit("> ✅ Downloaded, enjoy! 💕", key));
    })
    .catch(err => {
        console.error(err);
        pika.edit("❎ Error occurred, try again in 30 seconds, senpai.", key);
    });
});

//༺─────────────────────────────────────

anya({
    name: "facebook",
    alias: ['fb', 'fbdl'],
    react: "💠",
    need: "url",
    category: "download",
    desc: "Download Videos From Facebook",
    cooldown: 10,
    filename: __filename
},
async (anyaV2, pika, { args, prefix, command }) => {
    if (args.length < 1) return pika.reply(`_Onii-chan, provide a Facebook video URL!_`);    
    if (!/facebook\.com\/\d+/.test(args[0])) return pika.reply("❎ Invalid URL, baka!");
    const { key } = await pika.keyMsg("_Processing your request, senpai..._");
    facebookdl(args[0])
    .then(async response => {
        if (!response) return pika.reply("❎ No results found, gomen!");
        const videoBuffer = await getBuffer(response.video);
        await anyaV2.sendMessage(pika.chat, {
            video: videoBuffer,
            caption: `
*⎙ Facebook*

▢ *Title:* ${response.title}            
▢ *Quality:* HD
▢ *Link:* ${response.url}
              
${Config.footer}
`.trim()
        }, { quoted: pika })
        .then(() => pika.edit("> ✅ Downloaded, enjoy! 💕", key));
    })
    .catch(err => {
        console.error(err);
        pika.edit("❎ Error occurred, try again in 30 seconds, senpai.", key);
    });
});

//༺─────────────────────────────────────

anya({
    name: "facebookdoc",
    alias: ['fbdoc', 'fbdldoc'],
    react: "💠",
    need: "url",
    category: "download",
    desc: "Download Facebook videos as documents",
    cooldown: 10,
    filename: __filename
},
async (anyaV2, pika, { args, prefix, command }) => {
    if (args.length < 1) return pika.reply(`_Onii-chan, provide a Facebook video URL!_`);   
    if (!/facebook\.com\/\d+/.test(args[0])) return pika.reply("❎ Invalid URL, baka!");
    const { key } = await pika.keyMsg("_Processing your request, senpai..._");
    facebookdl(args[0])
    .then(async response => {
        if (!response) return pika.reply("❎ No results found, gomen!");
        const videoBuffer = await getBuffer(response.video);
        await anyaV2.sendMessage(pika.chat, {
            document: videoBuffer,
            mimetype: "video/mp4",
            fileName: "Anya_Facebook_Download.mp4",
            caption: `
*⎙ Facebook*

▢ *Title:* ${response.title}            
▢ *Quality:* HD
▢ *Link:* ${response.url}
              
${Config.footer}
`.trim(),
            contextInfo: {
                externalAdReply: {
                    title: "𝗔𝗻𝘆𝗮 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸 𝗘𝗻𝗴𝗶𝗻𝗲",
                    body: response.title,
                    thumbnailUrl: response.thumb,
                    showAdAttribution: true,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: pika })
        .then(() => pika.edit("> ✅ Downloaded, enjoy! 💕", key));
    })
    .catch(err => {
        console.error(err);
        pika.edit("❎ Error occurred, try again in 30 seconds, senpai.", key);
    });
});

//༺─────────────────────────────────────

anya({
    name: "ttdl",
    alias: ['ttvid'],
    react: "🎵",
    need: "url",
    category: "download",
    desc: "Download TikTok videos",
    cooldown: 10,
    filename: __filename
},
async (anyaV2, pika, { args, prefix, command }) => {
    if (args.length < 1) return pika.reply(`_Senpai, please provide a TikTok video URL!_`);    
    if (!/tiktok\.com\/@\w+\/video\/\d+/.test(args[0])) return pika.reply("❎ Invalid URL, baka!");
    const { key } = await pika.keyMsg("_Processing your request, senpai..._");
    tiktokdl(args[0])
    .then(async response => {
        if (!response) return pika.reply("❎ No results found, gomen!");
        const videoBuffer = await getBuffer(response.video_HD);
        await anyaV2.sendMessage(pika.chat, {
            video: videoBuffer,
            caption: `
*⎙ TikTok*

▢ *User:* ${response.author.name}            
▢ *Description:* ${response.description || "N/A"}
▢ *Link:* ${response.url}
              
${Config.footer}
`.trim()
        }, { quoted: pika })
        .then(() => pika.edit("> ✅ Downloaded, enjoy! 💕", key));
    })
    .catch(err => {
        console.error(err);
        pika.edit("❎ Error occurred, try again in 30 seconds, senpai.", key);
    });
});

//༺─────────────────────────────────────

anya({
    name: "tiktokdoc",
    alias: ['ttdoc', 'ttviddoc'],
    react: "📄",
    need: "url",
    category: "download",
    desc: "Download TikTok videos as a document",
    cooldown: 10,
    filename: __filename
},
async (anyaV2, pika, { args, prefix, command }) => {
    if (args.length < 1) return pika.reply(`_Senpai, please provide a TikTok video URL!_`);
    if (!/tiktok\.com\/@\w+\/video\/\d+/.test(args[0])) return pika.reply("❎ Invalid URL, baka!");
    const { key } = await pika.keyMsg("_Processing your request, senpai..._");
    tiktokdl(args[0])
    .then(async response => {
        if (!response) return pika.reply("❎ No results found, gomen!");
        const videoBuffer = await getBuffer(response.video_HD);
        await anyaV2.sendMessage(pika.chat, {
            document: videoBuffer,
            mimetype: 'video/mp4',
            fileName: 'Anya_TikTok_Download.mp4',
            caption: `
*⎙ TikTok*

▢ *User:* ${response.author.name}            
▢ *Description:* ${response.description || "N/A"}
▢ *Link:* ${response.url}
              
${Config.footer}
`.trim(),
            contextInfo: {
                externalAdReply: {
                    title: "𝗔𝗻𝘆𝗮 𝗧𝗶𝗸𝗧𝗼𝗸 𝗘𝗻𝗴𝗶𝗻𝗲",
                    body: response.description || "N/A",
                    thumbnailUrl: response.thumbnail,
                    showAdAttribution: true,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: pika })
        .then(() => pika.edit("> ✅ Downloaded, enjoy! 💕", key));
    })
    .catch(err => {
        console.error(err);
        pika.edit("❎ Error occurred, try again in 30 seconds, senpai.", key);
    });
});
