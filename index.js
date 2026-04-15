app.get("/game/:placeId", async (req, res) => {
    const placeId = req.params.placeId;

    try {
        // 🔹 UniverseId
        const universeRes = await axios.get(
            `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
        );

        const universeId = universeRes.data.universeId;

        // 🔹 MAIN GAME API
        const gameRes = await axios.get(
            `https://games.roblox.com/v1/games?universeIds=${universeId}`
        );

        const game1 = gameRes.data.data?.[0];

        // 🔹 FALLBACK API (PLUS RICHE)
        let game2 = null;
        try {
            const fb = await axios.get(
                `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`
            );
            game2 = fb.data?.[0];
        } catch {}

        // 🔥 MERGE SAFE (priorité fallback si dispo)
        const game = game2 || game1;

        if (!game) {
            return res.json({ error: "Game not found" });
        }

        // 🔹 ICON
        let icon = null;
        try {
            const iconRes = await axios.get(
                `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png`
            );
            icon = iconRes.data.data?.[0]?.imageUrl || null;
        } catch {}

        // 🔹 THUMBNAILS
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

        // 🔹 GAMEPASSES
        let gamepasses = [];
        try {
            const gpRes = await axios.get(
                `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100`
            );
            gamepasses = gpRes.data.data || [];
        } catch {}

        // 🔥 SAFE VOTES (DOUBLE SOURCE)
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

        // 🔥 RESPONSE CLEAN
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
