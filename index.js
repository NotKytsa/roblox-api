const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 ROOT CHECK
app.get("/", (req, res) => {
    res.json({ status: "API online" });
});

app.get("/game/:placeId", async (req, res) => {
    const placeId = req.params.placeId;

    try {
        const universeRes = await axios.get(
            `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
        );

        const universeId = universeRes.data.universeId;

        const gameRes = await axios.get(
            `https://games.roblox.com/v1/games?universeIds=${universeId}`
        );

        const game1 = gameRes.data.data?.[0];

        let game2 = null;
        try {
            const fb = await axios.get(
                `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`
            );
            game2 = fb.data?.[0];
        } catch {}

        const game = game2 || game1;

        if (!game) {
            return res.json({ error: "Game not found" });
        }

        let icon = null;
        try {
            const iconRes = await axios.get(
                `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png`
            );
            icon = iconRes.data.data?.[0]?.imageUrl || null;
        } catch {}

        let thumbnails = [];
        try {
            const thumbRes = await axios.get(
                `https://thumbnails.roblox.com/v1/games/multiget-thumbnails?universeIds=${universeId}&size=768x432&format=Png`
            );

            thumbnails = (thumbRes.data.data || []).map(
                t => t.imageUrl || t.thumbnailUrl
            );
        } catch {}

        let favorites = 0;
        try {
            const favRes = await axios.get(
                `https://games.roblox.com/v1/games/${universeId}/favorites/count`
            );
            favorites = favRes.data.favoritesCount || 0;
        } catch {}

        let gamepasses = [];
        try {
            const gpRes = await axios.get(
                `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100`
            );
            gamepasses = gpRes.data.data || [];
        } catch {}

        const likes =
            game.upVotes ??
            game.upvoteCount ??
            game.thumbsUpCount ??
            0;

        const dislikes =
            game.downVotes ??
            game.downvoteCount ??
            game.thumbsDownCount ??
            0;

        res.json({
            meta: { universeId, placeId },

            identity: {
                name: game.name,
                description: game.description,
                rootPlaceId: game.rootPlaceId
            },

            stats: {
                currentPlayers: game.playing || 0,
                maxPlayers: game.maxPlayers || 0,
                visits: game.visits || 0,
                likes,
                dislikes,
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

app.get("/search", async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.json({ error: "missing query" });
    }

    try {
        const url = `https://games.roblox.com/v1/games/list?keyword=${encodeURIComponent(query)}&limit=30`;

        const result = await axios.get(url);

        const games = result.data.data || [];

        const clean = games.map(g => ({
            name: g.name,
            placeId: g.rootPlaceId,
            universeId: g.id,
            playing: g.playing,
            visits: g.visits
        }));

        res.json({
            query: query.toLowerCase(),
            count: clean.length,
            results: clean
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log("🔥 API running on port " + PORT);
});
