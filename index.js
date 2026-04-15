const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

/*
    🎮 ROBLOX GAME INTELLIGENCE API
    - clean structure
    - multi-sources
    - thumbnails + stats + creator + metadata
*/

app.get("/game/:placeId", async (req, res) => {
    const placeId = req.params.placeId;

    try {
        // 🌐 1. Convert PlaceId → UniverseId
        const universeRes = await axios.get(
            `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
        );

        const universeId = universeRes.data.universeId;

        // 🎮 2. Core Game Data
        const gameRes = await axios.get(
            `https://games.roblox.com/v1/games?universeIds=${universeId}`
        );

        const game = gameRes.data.data[0];

        // 🖼️ 3. ICON
        const iconRes = await axios.get(
            `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png`
        );

        const icon = iconRes.data.data?.[0]?.imageUrl || null;

        // 🖼️ 4. THUMBNAILS (screens / previews)
        let thumbnails = [];

        try {
            const thumbRes = await axios.get(
                `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=768x432&format=Png`
            );

            thumbnails = thumbRes.data.data.map(t => t.imageUrl);
        } catch (e) {
            thumbnails = [];
        }

        // ❤️ 5. FAVORITES
        let favorites = 0;

        try {
            const favRes = await axios.get(
                `https://games.roblox.com/v1/games/${universeId}/favorites/count`
            );

            favorites = favRes.data.favoritesCount;
        } catch (e) {}

        // 💳 6. GAMEPASSES (best-effort)
       let gamepasses = [];

        try {
            const gpRes = await axios.get(
                `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100`
            );

            gamepasses = gpRes.data.data || [];
        } catch (e) {
            gamepasses = [];
        }

        // 📦 7. CLEAN OUTPUT API
        const response = {
            meta: {
                universeId,
                placeId
            },

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

            creator: {
                name: game.creator?.name,
                id: game.creator?.id,
                type: game.creator?.type
            },

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
                thumbnails: thumbnails.map(t => t.imageUrl || t.thumbnailUrl)
            },

            monetization: {
                gamepasses
            }
        };

        res.json(response);

    } catch (err) {
        res.json({
            error: err.message,
            step: "failed to fetch roblox game data"
        });
    }
});

app.listen(PORT, () => {
    console.log("🔥 Roblox Game API running on http://localhost:" + PORT);
});