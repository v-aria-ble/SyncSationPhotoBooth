const video = document.getElementById('video');
const canvas1 = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
const canvas3 = document.getElementById('canvas3');
const canvas4 = document.getElementById('canvas4');
const startButton = document.getElementById('startButton');
const captureButton = document.getElementById('capture');
const swapButton = document.getElementById('swapBackground');
const photoTb = document.getElementById('photoTb');
const clearButton = document.getElementById('clearCanvas');
const downloadBtn = document.getElementById('downloadImage');
const syncPb = document.getElementById("syncMoodPb");
const overallMoodElement = document.getElementById("overallMoodElement");
const nowPlayingTb = document.getElementById('nowPlayingTb');
const emotionRanges = {
    happy: { energy: [0.7, 1], danceability: [0.7, 1]},
    sad: { energy: [0, 0.3], danceability: [0, 0.3]},
    angry: { energy: [0.7, 1], danceability: [0, 0.3]},
    neutral: { energy: [0.3, 0.7], danceability: [0.7, 1]},
    fear: { energy: [0.7, 1], danceability: [0, 0.3]},
    surprise: { energy: [0.7, 1], danceability: [0.7, 1]},
  };
  let displayEmotions = true; // Initial state for emotion display
const emotionDisplay = document.getElementById('toggleDisplay');
emotionDisplay.addEventListener('click', () => {
  displayEmotions = !displayEmotions; // Toggle the state
  alert(`Emotion Display is now ${displayEmotions ? "ON" : "OFF"}`);
});
// Example function to load CSV as JSON
  async function loadTracks() {
    const response = await fetch('/src/filtered_songs.csv');
    const text = await response.text();
    const tracks = parseCSV(text); // You can use a CSV parser here, such as PapaParse
  
    return tracks;
  }
  function filterTracksByEmotion(tracks, emotion) {
    const range = emotionRanges[emotion];
    
    return tracks.filter(track => {
      return track.energy >= range.energy[0] && track.energy <= range.energy[1] &&
             track.danceability >= range.danceability[0] && track.danceability <= range.danceability[1];
    });
  }
  function getRandomTrack(filteredTracks) {
    const randomIndex = Math.floor(Math.random() * filteredTracks.length);
    return filteredTracks[randomIndex];
  }
  async function getTrackBasedOnEmotion(emotion) {
    const tracks = await loadTracks();  // Load the tracks from CSV
    const filteredTracks = filterTracksByEmotion(tracks, emotion);  // Filter tracks by emotion
    
    if (filteredTracks.length > 0) {
      const randomTrack = getRandomTrack(filteredTracks);  // Get a random track from filtered list
      console.log('Random track for emotion ' + emotion + ': ', randomTrack);
      return randomTrack;  // This is your recommended track
    } else {
      console.log('No tracks found for this emotion.');
      return null;
    }
  }
      
  
  // Example CSV parsing using PapaParse
  function parseCSV(csvText) {
    const parsed = Papa.parse(csvText, { header: true });
    return parsed.data;
  }
    

let canvasArray = [canvas1, canvas2, canvas3, canvas4];
let currentCanvas = 0;
let allDetectedEmotions = [];


// Start Camera
startButton.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
});

// Capture Image
// Capture Image
captureButton.addEventListener('click', async () => {
  // Check if all canvases are filled
  if (currentCanvas >= canvasArray.length) {
      alert("All canvases are filled!");
      return;
  }

  const canvas = canvasArray[currentCanvas];
  const ctx = canvas.getContext('2d');

  // Get video frame size
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  // Set desired resolution for the canvas (for example, 1280x720)
  const desiredWidth = 1280;
  const desiredHeight = 720;
  canvas.width = desiredWidth;
  canvas.height = desiredHeight;

  // Calculate the cropping area to fit the canvas dimensions
  let cropX = 0;
  let cropY = 0;
  let cropWidth = videoWidth;
  let cropHeight = videoHeight;

  // If the video is wider than the canvas, crop the width from the center
  if (videoWidth / videoHeight > desiredWidth / desiredHeight) {
      cropWidth = (videoHeight * desiredWidth) / desiredHeight;
      cropX = (videoWidth - cropWidth) / 2;
  } else {
      // If the video is taller than the canvas, crop the height from the center
      cropHeight = (videoWidth * desiredHeight) / desiredWidth;
      cropY = (videoHeight - cropHeight) / 2;
  }

  // Flip the image horizontally before drawing it
  ctx.save(); // Save the current state of the context
  ctx.scale(-1, 1); // Flip horizontally by scaling the x-axis by -1
  ctx.translate(-desiredWidth, 0); // Translate to maintain the canvas position

  // Draw the cropped and flipped video frame onto the canvas
  ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, desiredWidth, desiredHeight);

  ctx.restore(); // Restore the context to its original state

  // Convert canvas to Base64 image
  const imageData = canvas.toDataURL('image/jpeg', 1.0); // Use 1.0 for highest quality

  // Send image to Flask backend
  const response = await fetch('http://127.0.0.1:5000/process', {
      method: 'POST',
      body: JSON.stringify({ image: imageData }),
      headers: { 'Content-Type': 'application/json' },
  });

  // Handle the response...
  if (!response.ok) {
      console.error('Failed to fetch processed image:', response.statusText);
      return;
  }

  const result = await response.json();
  const dominantEmotions = result.dominant_emotions;
  const overallEmotion = result.overall_dominant_emotion;
  console.log('Backend Response:', result);
  console.log(`Dominant Emotions for Each Face: ${dominantEmotions.join(", ")}`);
  console.log(`Overall Dominant Emotion: ${overallEmotion}`);
  allDetectedEmotions.push(overallEmotion);

  // Update canvas with processed image (conditionally draw bounding boxes and emotions)
  if (displayEmotions) { // Allow toggle and skip for canvas2 and canvas4
    const processedImage = new Image();
    processedImage.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before drawing the new image
        ctx.drawImage(processedImage, 0, 0, canvas.width, canvas.height); // Draw processed image
    };
    processedImage.src = result.processed_image;
}


  // Increment to move to the next canvas
  currentCanvas++;
  if (currentCanvas === canvasArray.length) {
      calculateOverallEmotion();
  }
});

  swapButton.addEventListener("click", function() {
    // Get the parent div by its ID
    const canvasContainer = document.getElementById("canvasContainer");
    
    // Check the current background color and toggle
    if (canvasContainer) {
        const currentColor = canvasContainer.style.backgroundColor;
        if(currentColor === "white"){
            canvasContainer.style.backgroundColor = "black";
            syncPb.src = "/src/image/SYNCURMOODBLACK.png";
        }
        else {
            canvasContainer.style.backgroundColor = "white";
            syncPb.src = "/src/image/SYNCURMOODWHITE.png";
        }
    }
});
clearButton.addEventListener('click', () => {
    // Loop through all canvases in the canvasArray
    canvasArray.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      // Clear the canvas by resetting its content
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      overallMoodElement.textContent = '';
      nowPlayingTb.textContent = '';
    });
  
    // Reset the currentCanvas index
    currentCanvas = 0;
    allDetectedEmotions = [];
    overallMoodElement.textContent = ``; 
  
    alert('All canvases have been cleared!');
  });
  function calculateOverallEmotion() {
    const emotionCounts = {};
  
    // Count frequencies of each emotion
    allDetectedEmotions.forEach((emotion) => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
  
    // Determine the most frequent emotion
    const overallEmotion = Object.keys(emotionCounts).reduce((a, b) =>
      emotionCounts[a] > emotionCounts[b] ? a : b
    );
  
    console.log('Overall Emotion:', overallEmotion);
     
    displayMoodAndTrack(overallEmotion);
    // Optionally display it in the UI
    alert(`The overall dominant emotion is: ${overallEmotion}`);
  }
  async function displayMoodAndTrack(overallEmotion) {
    const track = await getTrackBasedOnEmotion(overallEmotion); // Get track based on the emotion

    // Set the overall mood
    overallMoodElement.textContent = `The overall mood: ${overallEmotion}`;

    if (track) {
        let artists = track.artists;
        artists = artists.replace(/[\[\]']/g, '').trim(); // Removes [ ] and '

        // Check if artists is an array, otherwise convert it or handle it
        if (Array.isArray(artists)) {
            artists = artists.filter(artist => artist.trim() !== '').join(', ');
        } else if (typeof artists === 'string') {
            // If artists is already a string, just use it
            artists = artists.trim();
        } else {
            // If artists is not an array or string, handle it (e.g., set it to "Unknown Artist")
            artists = 'Unknown Artist';
        }

        // Display the track details
        nowPlayingTb.textContent = ` Now Playing: ${track.name} - ${artists}`;
    } else {
        nowPlayingTb.textContent = ' No track found for this mood.';
    }
}


  downloadBtn.addEventListener("click", function() {
    // Use html2canvas with the callback pattern
    html2canvas(document.getElementById("canvasContainer"), {
        backgroundColor: null,
        scale: 3,  // Increase the resolution by a factor of 3
        logging: true,  // Enable logging to track the rendering process
        useCORS: true,  // Enable CORS to handle cross-origin images
        scrollX: 0,     // Prevent scrolling from affecting the capture
        scrollY: -window.scrollY,  // Fix scrolling offset
    }).then(function(canvas) {
        // Check if the canvas is rendered
        if (canvas) {
            // Convert the canvas to a Data URL (image/png)
            const imageData = canvas.toDataURL("image/png");

            // Create a temporary link element to trigger the download
            const link = document.createElement("a");
            link.href = imageData;
            link.download = "SyncsationPhotobooth.png";

            // Trigger the download by programmatically clicking the link
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);  // Clean up by removing the link after the click
        } else {
            console.error("Canvas was not rendered properly.");
        }
    }).catch(function(error) {
        console.error("Error capturing canvas:", error);
    });
});