import "dotenv/config";
import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
} from "discord.js";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN as string;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

client.on("ready", () => {
    if (client.user) {
        console.log(`Logged in as ${client.user.tag}`);
    }
});

// Register slash commands on startup
client.once("ready", async () => {
    if (client.user) {
        console.log(`Logged in as ${client.user.tag}`);

        const commands = [
            // Judge Selfie context menu command
            {
                name: "Judge Selfie",
                type: 3, // 3 = MESSAGE context menu
            },
            // /judge slash command
            new SlashCommandBuilder()
                .setName("judge")
                .setDescription(
                    "Let the Judgerist judge your text with an over-the-top critique.",
                )
                .addStringOption((option) =>
                    option
                        .setName("note")
                        .setDescription("The text or note to be judged")
                        .setRequired(false),
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
                .toJSON(),
        ];

        const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
        try {
            await rest.put(Routes.applicationCommands(client.user.id), {
                body: commands,
            });
            console.log("Slash commands registered.");
        } catch (err) {
            console.error("Failed to register slash commands:", err);
        }
    }
});

client.on("interactionCreate", async (interaction) => {
    // Handle /judge slash command
    /*
    if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "judge"
    ) {
        let note = interaction.options.getString("note");
        let repliedToMessage = null;
        let imageAttachment = null;

        // Try to get the replied-to message if the user recently replied to a message before using /judge
        const channel = interaction.channel;
        if (channel && channel.isTextBased()) {
            // Fetch the last 10 messages to increase the chance of finding the user's reply
            const messages = await channel.messages.fetch({ limit: 10 });
            // Find the most recent message by the user (excluding the interaction itself) that is a reply
            const recentUserReply = messages.find(
                (msg) =>
                    msg.author.id === interaction.user.id &&
                    msg.reference?.messageId &&
                    // Exclude the interaction itself (which is not a message)
                    msg.createdTimestamp < interaction.createdTimestamp,
            );
            if (recentUserReply && recentUserReply.reference?.messageId) {
                try {
                    repliedToMessage = await channel.messages.fetch(
                        recentUserReply.reference.messageId,
                    );
                    // Check for image attachment in the replied-to message
                    imageAttachment = repliedToMessage.attachments.find((a) =>
                        a.contentType?.startsWith("image/"),
                    );
                    if (!note && !imageAttachment) {
                        // If no note and no image, use the text content of the replied-to message
                        note = repliedToMessage.content;
                    }
                } catch (err) {
                    // Ignore fetch errors, will prompt below if still no note or image
                }
            }
        }

        if (!note && !imageAttachment) {
            await interaction.reply({
                content:
                    "What would you like the Judgerist to judge? (Reply to a message with /judge, provide text, or let me judge your vibes!)",
                ephemeral: true,
            });
            return;
        }
        await interaction.deferReply();
        try {
            if (imageAttachment) {
                // Download the image
                const imageUrl = imageAttachment.url;
                const imageResponse = await axios.get(imageUrl, {
                    responseType: "arraybuffer",
                });
                const imageBuffer = Buffer.from(imageResponse.data, "binary");
                const imageBase64 = imageBuffer.toString("base64");
                // Judgerist prompt for images
                const prompt = `You are the Judgerist, an over-the-top, flamboyant, and brutally honest judge. React to this selfie or image with a dramatic, witty, and exaggerated response. Be creative, sassy, and never hold back. Do NOT give a score or use the word 'Critique'. Just react naturally as the Judgerist would.`;
                const response = await ai.models.generateContent({
                    model: "gemini-2.0-flash-001",
                    contents: [
                        {
                            inlineData: {
                                mimeType: imageAttachment.contentType ?? "",
                                data: imageBase64,
                            },
                        },
                        { text: prompt },
                    ],
                });
                let geminiReply =
                    response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
                    response.text?.trim();
                await interaction.editReply({
                    content: geminiReply || "Judgerist is speechless!",
                });
            } else {
                // Judgerist prompt for text
                const prompt = `You are the Judgerist, an over-the-top, flamboyant, and brutally honest judge. Respond to the following text with a dramatic, witty, and exaggerated reaction. Be creative, sassy, and never hold back. Do NOT give a score or use the word 'Critique'. Just react naturally as the Judgerist would.\n\nText: "${note}"`;
                const response = await ai.models.generateContent({
                    model: "gemini-2.0-flash-001",
                    contents: [{ text: prompt }],
                });
                let geminiReply =
                    response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
                    response.text?.trim();
                await interaction.editReply({
                    content: geminiReply || "Judgerist is speechless!",
                });
            }
        } catch (err: any) {
            await interaction.editReply({
                content: `Error judging: ${err.message}`,
            });
        }
        return;
    }
    */
    if (interaction.isMessageContextMenuCommand()) {
        if (interaction.commandName === "Judge Selfie") {
            const targetMessage = await interaction.channel?.messages.fetch(
                interaction.targetId,
            );
            if (!targetMessage) {
                await interaction.reply({
                    content: "Could not find the target message.",
                    ephemeral: true,
                });
                return;
            }
            // Check for image attachment
            const imageAttachment = targetMessage.attachments.find((a) =>
                a.contentType?.startsWith("image/"),
            );
            if (!imageAttachment) {
                await interaction.reply({
                    content: "The selected message does not contain an image.",
                    ephemeral: true,
                });
                return;
            }
            await interaction.deferReply();
            try {
                // Download the image
                const imageUrl = imageAttachment.url;
                const imageResponse = await axios.get(imageUrl, {
                    responseType: "arraybuffer",
                });
                const imageBuffer = Buffer.from(imageResponse.data, "binary");
                const imageBase64 = imageBuffer.toString("base64");
                // Judgerist prompt for images (natural, flamboyant, no score, no critique label)
                const prompt = `You are the Judgerist, an over-the-top, flamboyant, and brutally honest judge. React to this selfie with a dramatic, witty, and exaggerated response. Be creative, sassy, and never hold back. Do NOT give a score or use the word 'Critique'. Just react naturally as the Judgerist would.`;
                const response = await ai.models.generateContent({
                    model: "gemini-2.0-flash-001",
                    contents: [
                        {
                            inlineData: {
                                mimeType: imageAttachment.contentType ?? "",
                                data: imageBase64,
                            },
                        },
                        { text: prompt },
                    ],
                });
                let geminiReply =
                    response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
                    response.text?.trim();
                await interaction.editReply({
                    content: geminiReply || "Judgerist is speechless!",
                });
            } catch (err: any) {
                await interaction.editReply({
                    content: `Error judging selfie: ${err.message}`,
                });
            }
        }
    }
});

client.on("messageCreate", async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;
    // Only respond to messages starting with !judge
    if (!message.content.trim().toLowerCase().startsWith("!judge")) return;

    let note = message.content.slice("!judge".length).trim();
    let repliedToMessage = null;
    let imageAttachment = null;

    // If the message is a reply, fetch the referenced message
    if (message.reference?.messageId) {
        try {
            repliedToMessage = await message.channel.messages.fetch(
                message.reference.messageId,
            );
            // Check for image attachment in the replied-to message
            imageAttachment = repliedToMessage.attachments.find((a) =>
                a.contentType?.startsWith("image/"),
            );
            if (!note && !imageAttachment) {
                // If no note and no image, use the text content of the replied-to message
                note = repliedToMessage.content;
            }
        } catch (err) {
            // Ignore fetch errors, will prompt below if still no note or image
        }
    }

    if (!note && !imageAttachment) {
        await message.reply(
            "What would you like the Judgerist to judge? (Reply to a message with !judge, provide text, or let me judge your vibes!)",
        );
        return;
    }
    // Send a thinking indicator
    const sentMsg = await message.reply("Judgerist is judging... 🎭");
    try {
        if (imageAttachment) {
            // Download the image
            const imageUrl = imageAttachment.url;
            const imageResponse = await axios.get(imageUrl, {
                responseType: "arraybuffer",
            });
            const imageBuffer = Buffer.from(imageResponse.data, "binary");
            const imageBase64 = imageBuffer.toString("base64");
            // Judgerist prompt for images
            const prompt = `You are the Judgerist, an over-the-top, flamboyant, and brutally honest judge. React to this selfie or image with a dramatic, witty, and exaggerated response. Be creative, sassy, and never hold back. Do NOT give a score or use the word 'Critique'. Just react naturally as the Judgerist would.`;
            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash-001",
                contents: [
                    {
                        inlineData: {
                            mimeType: imageAttachment.contentType ?? "",
                            data: imageBase64,
                        },
                    },
                    { text: prompt },
                ],
            });
            let geminiReply =
                response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
                response.text?.trim();
            await sentMsg.edit(geminiReply || "Judgerist is speechless!");
        } else {
            // Judgerist prompt for text
            const prompt = `You are the Judgerist, an over-the-top, flamboyant, and brutally honest judge. Respond to the following text with a dramatic, witty, and exaggerated reaction. Be creative, sassy, and never hold back. Do NOT give a score or use the word 'Critique'. Just react naturally as the Judgerist would.\n\nText: "${note}"`;
            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash-001",
                contents: [{ text: prompt }],
            });
            let geminiReply =
                response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
                response.text?.trim();
            await sentMsg.edit(geminiReply || "Judgerist is speechless!");
        }
    } catch (err: any) {
        await sentMsg.edit(`Error judging: ${err.message}`);
    }
});

client.login(DISCORD_TOKEN);
