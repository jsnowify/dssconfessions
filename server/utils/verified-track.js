async function verifiedTrack(songId, spotify, getToken) {
  const token = await getToken();
  const { data: track } = await spotify.get(
    `https://api.spotify.com/v1/tracks/${encodeURIComponent(songId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    },
  );
  if (
    track?.id !== songId ||
    typeof track.name !== "string" ||
    !track.name ||
    typeof track.artists?.[0]?.name !== "string" ||
    !track.artists[0].name
  ) {
    const error = new Error("Could not verify selected song.");
    error.status = 400;
    throw error;
  }
  return {
    song_name: track.name,
    artist_name: track.artists[0].name,
    album_art: track.album?.images?.[0]?.url ?? null,
    spotify_url: track.external_urls?.spotify ?? null,
    spotify_track_id: songId,
  };
}
module.exports = { verifiedTrack };
