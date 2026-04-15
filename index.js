const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/game/:placeId", async (req, res) => {
    const placeId = req.params.placeId;

    try {
        // 🔹 UniverseId
        const universeRes = await axios.get(
            `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
        );

        const universeId = universeRes.data.universeId;

        // 🔹 Game data
        const gameRes = await axios.get(
            `https://games.roblox.com/v1/games?universeIds=${universeId}`
        );

        const game = gameRes.data.data?.[0];

        if (!game) {
            return res.json({ error: "Game not found" });
        }

        // 🔹 ICON (safe)
        let icon = null;
        try {
            const iconRes = await axios.get(
                `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png`
            );
            icon = iconRes.data.data?.[0]?.imageUrl || null;
        } catch {}

        // 🔹 THUMBNAILS FIXED
        let thumbnails = [];
        try {
            const thumbRes = await axios.get(
                `https://thumbnails.roblox.com/v1/games/multiget-thumbnails?universeIds=${universeId}&size=768x432&format=Png`
            );

            thumbnails = (thumbRes.data.data || []).map(t => t.imageUrl || t.thumbnailUrl);
        } catch {}

        // 🔹 FAVORITES
        let favorites = 0;
        try {
            const favRes = await axios.get(
                `https://games.roblox.com/v1/games/${universeId}/favorites/count`
            );
            favorites = favRes.data.favoritesCount || 0;
        } catch {}

        // 🔹 GAMEPASSES SAFE
        let gamepasses = [];
        try {
            const gpRes = await axios.get(
                `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100`
            );
            gamepasses = gpRes.data.data || [];
        } catch {}

        // 🔥 RESPONSE CLEAN
        res.json({
            meta: { universeId, placeId },

            identity: {
                name: game.name,
                description: game.description,
                rootPlaceId: game.rootPlaceId
            },

            stats: {
                currentPlayers: game.playing,
                maxPlayers: game.maxPlayers,
                visits: game.visits,
                likes: game.upVotes,
                dislikes: game.downVotes,
                favorites
            },

            creator: game.creator,

            timestamps: {
                created: game.created,
                updated: game.updated
            },

            classification: {
                genre: game.genre,
                genreL1: game.genre_l1,
                genreL2: game.genre_l2
            },

            media: {
                icon,
                thumbnails
            },

            monetization: {
                gamepasses
            }
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message,
            step: "main crash"
        });
    }
});

app.listen(PORT, () => {
    console.log("🔥 API running on port " + PORT);
});
