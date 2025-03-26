/* global YT */
// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var player;
let prevExistingIdx = 0;
const songCards = document.querySelectorAll(".songCard");
let existingVideoIds = populatePlaylist(songCards); //also adds click songcard listener
// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
// eslint-disable-next-line no-unused-vars
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "auto",
    width: "100%",
    playerVars: {
      playsinline: 1,
      enablejsapi: 1,
      loop: 1,
      autoplay: 1,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady() {
  console.log("IN ON PLAYER READY");
  console.log("IN ELSE BRANCH OF ON PLAYER READY");
  renderCurSong();
  player.loadVideoById(existingVideoIds[prevExistingIdx]);
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
async function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.ENDED) {
    playSong();
  }
}

function playSong() {
  prevExistingIdx += 1;
  renderCurSong();
  player.loadVideoById(existingVideoIds[prevExistingIdx]);
  if (prevExistingIdx + 1 === existingVideoIds.length) {
    prevExistingIdx = -1;
  }
}

function renderCurSong() {
  const songCard = document.querySelector(
    `.songCard:nth-child(${prevExistingIdx + 1})`,
  );
  const songIdx = songCard.querySelector("div.valNo > p").innerText;
  const songTitle = songCard.querySelector("div.valTitle > p ").innerText;
  const songAddedBy = songCard.querySelector("div.valAddedBy > p").innerText;
  document.getElementById("curSongNo").innerText = songIdx;
  document.getElementById("curSongTitle").innerText = songTitle;
  document.getElementById("curAddedBy").innerText = songAddedBy;
}
const shuffleBtn = document.getElementById("shuffle");
shuffleBtn.addEventListener("click", function () {
  const songs = Array.from(songCards);
  for (let i = songs.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [songs[i], songs[randomIndex]] = [songs[randomIndex], songs[i]];
  }
  const playlist = document.getElementsByClassName("playListWrap")[0];
  songs.forEach((song, index) => {
    song.children[0].children[0].children[0].textContent = index + 1;
    playlist.appendChild(song);
  });
  existingVideoIds = populatePlaylist(songs);
  prevExistingIdx = 0;
  renderCurSong();
  player.loadVideoById(existingVideoIds[0]);
});

function populatePlaylist(songCards) {
  const videoIds = [];
  songCards.forEach((songCard, index) => {
    videoIds.push(songCard.dataset.videoId);
    songCard.addEventListener("click", function () {
      player.loadVideoById(songCard.dataset.videoId);
      prevExistingIdx = index;
      renderCurSong();
      if (prevExistingIdx + 1 === existingVideoIds.length) {
        prevExistingIdx = -1;
      }
    });
  });
  return videoIds;
}
