console.log("IFRAME IS RUNNING");
// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement("script");

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

const videoIds = [];
const songs = [];
const currentVideoId = 0; //get the current video from server/db
const currentTime = 0; // get from server
const songCards = document.querySelectorAll(".songCard");

songCards.forEach((songCard, index) => {
  videoIds.push(songCard.dataset.videoId);
  songCard.addEventListener("click", function (event) {
    player.playVideoAt(index);
  });
});
// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "auto",
    width: "100%",
    playerVars: {
      playsinline: 1,
      enablejsapi: 1,
      loop: 1,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  player.loadPlaylist(videoIds, currentVideoId, currentTime);
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING) {
    const curSongIdx = player.getPlaylistIndex();
    console.log({ curSongIdx });
    console.log("IN IF CLAUSE PLAY");
  }
  if (event.data == YT.PlayerState.ENDED) {
    console.log("IN IF CLAUSE ENDED");
  }
}
function stopVideo() {
  player.stopVideo();
}
