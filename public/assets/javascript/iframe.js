/* global YT */
// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement("script");

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var player;
const eventSource = new EventSource("/api/event");
const currentVideoId = 0;
const currentTime = 0;
const parent = document.getElementsByClassName("playListWrap")[0];
const songCards = document.querySelectorAll(".songCard");
let videoIds = populatePlaylist(songCards); //also adds click songcard listener
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const card = document.createElement("div");
  card.classList.add("songCard");
  card.setAttribute("data-video-id", data.videoId);
  const descriptionDiv = document.createElement("div");
  card.appendChild(descriptionDiv);
  descriptionDiv.classList.add("descriptionDiv");
  const valNo = document.createElement("div");
  valNo.classList.add("valNo");
  descriptionDiv.appendChild(valNo);
  const valTitle = document.createElement("div");
  valTitle.classList.add("valTitle");
  descriptionDiv.appendChild(valTitle);
  const valDuration = document.createElement("div");
  valDuration.classList.add("valDuration");
  descriptionDiv.appendChild(valDuration);
  const valAddedBy = document.createElement("div");
  valAddedBy.classList.add("valAddedBy");
  descriptionDiv.appendChild(valAddedBy);
  const modDiv = document.createElement("div");
  modDiv.classList.add("modDiv");
  card.appendChild(modDiv);
  const valEdit = document.createElement("div");
  valEdit.classList.add("valEdit");
  modDiv.appendChild(valEdit);
  const editForm = document.createElement("form");
  valEdit.append(editForm);
  editForm.classList.add("delete");
  editForm.setAttribute(
    "action",
    `/contribution/playlists/1/playlist/1/6/49/edit`,
  );
  editForm.setAttribute("method", "get");
  const valDelete = document.createElement("div");
  valDelete.classList.add("valDelete");
  modDiv.appendChild(valDelete);
  const valNoText = document.createElement("p");
  valNo.appendChild(valNoText);
  valNoText.textContent = "*";
  const valTitleText = document.createElement("p");
  valTitle.appendChild(valTitleText);
  valTitleText.textContent = data.title;
  const valDurationText = document.createElement("p");
  valDuration.appendChild(valDurationText);
  valDurationText.textContent = data.duration;
  const valAddedByText = document.createElement("p");
  valAddedBy.appendChild(valAddedByText);
  valAddedByText.textContent = "placeholder";
  const deleteForm = document.createElement("form");
  deleteForm.classList.add("delete");
  const deleteInput = document.createElement("input");
  deleteInput.classList.add("deleteBtn");
  valDelete.appendChild(deleteForm);
  deleteForm.appendChild(deleteInput);
  deleteForm.setAttribute(
    "action",
    `/contribution/playlists/1/playlist/1/6/49/delete`,
  );
  deleteForm.setAttribute("method", "post");
  const editInput = document.createElement("input");
  editInput.classList.add("editBtn");
  editForm.appendChild(editInput);
  editInput.setAttribute("value", "");
  editInput.setAttribute("type", "submit");
  deleteInput.setAttribute("value", "");
  deleteInput.setAttribute("type", "submit");
  deleteInput.setAttribute(
    "onclick",
    "confirmSubmit(event,'Do you want to delete the song from the playlist?')",
  );
  parent.insertBefore(card, parent.firstChild);
  videoIds.unshift(data.videoId);
  player.loadPlaylist(videoIds, currentVideoId, currentTime);
};

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
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady() {
  player.loadPlaylist(videoIds, currentVideoId, currentTime);
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING) {
    const curSongIdx = player.getPlaylistIndex() + 1;
    const songCard = document.querySelector(
      `.songCard:nth-child(${curSongIdx})`,
    );
    const songIdx = songCard.querySelector("div.valNo > p").innerText;
    const songTitle = songCard.querySelector("div.valTitle > p ").innerText;
    const songAddedBy = songCard.querySelector("div.valAddedBy > p").innerText;

    document.getElementById("curSongNo").innerText = songIdx;
    document.getElementById("curSongTitle").innerText = songTitle;
    document.getElementById("curAddedBy").innerText = songAddedBy;
  }
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
  videoIds = populatePlaylist(songs);
  player.loadPlaylist(videoIds, currentVideoId, currentTime);
});

function populatePlaylist(songCards) {
  const videoIds = [];
  songCards.forEach((songCard, index) => {
    videoIds.push(songCard.dataset.videoId);
    songCard.addEventListener("click", function () {
      player.playVideoAt(index);
    });
  });
  return videoIds;
}
