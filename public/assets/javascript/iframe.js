console.log("IFRAME IS RUNNING");
 // 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
const videoIds = [];
const songCards = document.querySelectorAll(".songCard")
songCards.forEach((songCard) => { 
  videoIds.push(songCard.dataset.videoId); 
  songCard.addEventListener("click", function (event){
    const videoId = event.currentTarget.dataset.videoId
    console.log(videoId);
    onPlayerReady(event);
  })
});


function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: videoId,
    playerVars: {
      'playsinline': 1
    },
    events: {
      'onReady': onPlayerReady,
    }
  });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  event.target.playVideo();
}
