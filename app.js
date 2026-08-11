const promptInput = document.getElementById("prompt");

const characterCount =
    document.getElementById("characterCount");

const clearPrompt =
    document.getElementById("clearPrompt");

const generateButton =
    document.getElementById("generateButton");

const buttonText =
    document.getElementById("buttonText");

const orientation =
    document.getElementById("orientation");

const loadingBox =
    document.getElementById("loadingBox");

const statusText =
    document.getElementById("statusText");

const errorBox =
    document.getElementById("errorBox");

const resultSection =
    document.getElementById("resultSection");

const videoPlayer =
    document.getElementById("videoPlayer");

const downloadButton =
    document.getElementById("downloadButton");

const newVideoButton =
    document.getElementById("newVideoButton");


/* Character counter */

promptInput.addEventListener("input", () => {

    characterCount.textContent =
        `${promptInput.value.length} / 5000`;

});


/* Clear */

clearPrompt.addEventListener("click", () => {

    promptInput.value = "";

    characterCount.textContent = "0 / 5000";

    promptInput.focus();

});


/* Generate */

generateButton.addEventListener(
    "click",
    generateVideo
);


async function generateVideo() {

    const prompt = promptInput.value.trim();

    if (!prompt) {

        showError(
            "Please describe the video you want to create."
        );

        promptInput.focus();

        return;
    }


    hideError();

    resultSection.classList.add("hidden");

    loadingBox.classList.remove("hidden");

    generateButton.disabled = true;

    buttonText.textContent =
        "Starting generation...";


    try {

        const response = await fetch(
            "/api/generate",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    prompt,
                    orientation:
                        orientation.value
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to start generation."
            );

        }


        buttonText.textContent =
            "Generating...";


        statusText.textContent =
            "Your AI video is being created";


        await pollPrediction(data.id);


    } catch (error) {

        console.error(error);

        showError(
            error.message ||
            "Something went wrong."
        );

        stopLoading();

    }

}


/*
    Poll the Node.js backend until
    the AI video is ready.
*/

async function pollPrediction(id) {

    const messages = [
        "Creating scenes...",
        "Generating visuals...",
        "Adding motion...",
        "Building your video...",
        "Almost there...",
        "Finishing your video..."
    ];

    let messageIndex = 0;


    while (true) {

        await sleep(5000);


        const response = await fetch(
            `/api/status/${id}`
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to check video status."
            );

        }


        console.log(
            "Prediction status:",
            data.status
        );


        if (
            data.status === "starting" ||
            data.status === "processing"
        ) {

            statusText.textContent =
                messages[
                    messageIndex %
                    messages.length
                ];

            messageIndex++;

            continue;
        }


        if (data.status === "succeeded") {

            if (!data.videoUrl) {

                throw new Error(
                    "The video was generated but no video URL was returned."
                );

            }


            showVideo(data.videoUrl);

            stopLoading();

            return;
        }


        if (
            data.status === "failed" ||
            data.status === "canceled"
        ) {

            throw new Error(
                data.error ||
                "Video generation failed."
            );

        }


        statusText.textContent =
            "Still working...";

    }

}


/*
    Show generated video
*/

function showVideo(url) {

    videoPlayer.src = url;

    videoPlayer.load();

    downloadButton.href = url;

    resultSection.classList.remove(
        "hidden"
    );

    resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/*
    Stop loading state
*/

function stopLoading() {

    loadingBox.classList.add("hidden");

    generateButton.disabled = false;

    buttonText.textContent =
        "Generate 30-second video";

}


/*
    Error handling
*/

function showError(message) {

    errorBox.textContent = message;

    errorBox.classList.remove("hidden");

}


function hideError() {

    errorBox.classList.add("hidden");

    errorBox.textContent = "";

}


/*
    Create another video
*/

newVideoButton.addEventListener(
    "click",
    () => {

        resultSection.classList.add(
            "hidden"
        );

        videoPlayer.pause();

        videoPlayer.removeAttribute(
            "src"
        );

        promptInput.focus();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);


/*
    Small utility
*/

function sleep(ms) {

    return new Promise(
        resolve => setTimeout(
            resolve,
            ms
        )
    );

}


/*
    Ctrl/Cmd + Enter generates video
*/

promptInput.addEventListener(
    "keydown",
    event => {

        if (
            (event.ctrlKey || event.metaKey) &&
            event.key === "Enter"
        ) {

            generateVideo();

        }

    }
);
