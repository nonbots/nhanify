async function getPlaylists(playlistType, page, userId) {
  const offset = (+page - 1) * ITEMS_PER_PAGE;
  let totalPages, playlists, playlist, pageTitle;

  if (playlistType === "public") {
    pageTitle = "Public Playlists";
    playlist = await persistence.getPublicPlaylistTotal();
    if (!playlist) throw new NotFoundError();
    totalPages = Math.ceil(+playlist.count / ITEMS_PER_PAGE);
    if ((+page > totalPages && +page !== 1) || +page < 1)
      throw new NotFoundError();
    playlists = await persistence.getPublicPlaylistsPage(
      offset,
      ITEMS_PER_PAGE,
    );
  }
  if (playlistType === "your") {
    pageTitle = "Your Playlists";
    playlist = await persistence.getYourPlaylistTotal(userId);
    if (!playlist) throw new NotFoundError();
    totalPages = Math.ceil(+playlist.count / ITEMS_PER_PAGE);
    if ((+page > totalPages && +page !== 1) || +page < 1)
      throw new NotFoundError();
    playlists = await persistence.getYourPlaylistsPage(
      userId,
      offset,
      ITEMS_PER_PAGE,
    );
  }
  if (playlistType === "contribution") {
    pageTitle = "Contribution Playlists";
    playlist = await persistence.getContributionPlaylistTotal(userId);
    totalPages = Math.ceil(+playlist.count / ITEMS_PER_PAGE);
    if ((+page > totalPages && +page !== 1) || +page < 1)
      throw new NotFoundError();
    if (!playlist) throw new NotFoundError();
    playlists = await persistence.getContributionPlaylistsPage(
      userId,
      offset,
      ITEMS_PER_PAGE,
    );
  }
  const startPage = Math.max(+page - PAGE_OFFSET, 1);
  const endPage = Math.min(+page + PAGE_OFFSET, totalPages);
  return res.render("playlists", {
    startPage,
    endPage,
    totalPages,
    playlistType,
    pageTitle,
    playlists,
    page: +page,
    playlistTotal: +playlist.count,
  });
}

module.exports = { getPlaylists };
