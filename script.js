let srcMat, resizedMat, grayMat, transformedMat;

const uploadBtn = document.getElementById("uploadBtn");
const imageInput = document.getElementById("imageInput");
const infoSection = document.getElementById("infoSection");
const resizeSection = document.getElementById("resizeSection");
const transformSection = document.getElementById("transformSection");
const newWidthInput = document.getElementById("newWidthInput");
const topButtons = document.getElementById("topButtons");

uploadBtn.onclick = () => imageInput.click();

imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    srcMat = cv.imread(canvas);

    document.getElementById("originalImage").src = img.src;
    document.getElementById("imageInfo").textContent = `Width: ${img.width}, Height: ${img.height}`;
    infoSection.classList.remove("hidden");
    topButtons.classList.remove("hidden");
    resizeSection.classList.add("hidden");
    transformSection.classList.add("hidden");
    uploadBtn.classList.add("top-position");
};

document.getElementById("resizeBtn").onclick = () => {
    const newWidth = parseInt(newWidthInput.value);
    if (!newWidth || !srcMat) return alert("Enter valid width");

    const aspect = srcMat.rows / srcMat.cols;
    const newHeight = Math.round(newWidth * aspect);

    console.log(newWidth, newHeight)

    let dsize = new cv.Size(newWidth, newHeight);
    resizedMat = new cv.Mat();
    cv.resize(srcMat, resizedMat, dsize, 0, 0, cv.INTER_AREA);

    grayMat = new cv.Mat();
    cv.cvtColor(resizedMat, grayMat, cv.COLOR_RGBA2GRAY);

    cv.imshow("resizedCanvas", resizedMat);
    cv.imshow("grayCanvas", grayMat);

    showHistograms(resizedMat, grayMat);

    document.getElementById("imageInfo").textContent = `Size changed from ${srcMat.cols}×${srcMat.rows} → ${newWidth}×${newHeight}`;


    document.getElementById("originalImage").classList.add("hidden");

    resizeSection.classList.remove("hidden");
    transformSection.classList.remove("hidden");
};

function showHistograms(colorMat, grayMat) {
    const histograms = document.getElementById("histograms");
    histograms.innerHTML = "";

    const channels = ["Red", "Green", "Blue"];
    const srcVec = new cv.MatVector();
    srcVec.push_back(colorMat);

    for (let i = 0; i < 3; i++) {
        const histCanvas = document.createElement("canvas");
        histCanvas.width = 256;
        histCanvas.height = 100;
        drawHistogram(srcVec, i, histCanvas, channels[i]);
        histograms.appendChild(histCanvas);
    }

    srcVec.delete();

    const grayVec = new cv.MatVector();
    grayVec.push_back(grayMat);
    const grayCanvas = document.createElement("canvas");
    grayCanvas.width = 256;
    grayCanvas.height = 100;
    drawHistogram(grayVec, 0, grayCanvas, "Gray");
    histograms.appendChild(grayCanvas);
    grayVec.delete();
}

function drawHistogram(srcVec, channel, canvas, label) {
    let hist = new cv.Mat();
    let mask = new cv.Mat();
    let channels = [channel];
    let histSize = [256];
    let ranges = [0, 256];

    // Proper call using MatVector
    cv.calcHist(srcVec, channels, mask, hist, histSize, ranges);

    let result = hist.data32F;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 100);

    // Color selection based on label
    if (label === "Blue") ctx.fillStyle = "blue";
    else if (label === "Green") ctx.fillStyle = "green";
    else if (label === "Red") ctx.fillStyle = "red";
    else ctx.fillStyle = "gray";  // For grayscale histogram

    const max = Math.max(...result);

    for (let i = 0; i < 256; i++) {
        const h = (result[i] / max) * 100;
        ctx.fillRect(i, 100 - h, 1, h);
    }

    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(label, 5, 12);

    hist.delete();
    mask.delete();
}

document.getElementById("transformSelect").onchange = (e) => {
    const type = e.target.value;
    const inputs = document.getElementById("transformInputs");
    const applyBtn = document.getElementById("applyTransformBtn");
    inputs.innerHTML = "";
    applyBtn.classList.add("hidden");

    if (type === "rotate") {
        inputs.innerHTML = `<label>Angle: <input type="number" id="angleInput" /></label>`;
    } else if (type === "scale") {
        inputs.innerHTML = `<label>Scale factor: <input type="number" step="0.1" id="scaleInput" /></label>`;
    } else if (type === "translate") {
        inputs.innerHTML = `
      <label>Tx: <input type="number" id="txInput" /></label>
      <label>Ty: <input type="number" id="tyInput" /></label>`;
    }

    if (type) applyBtn.classList.remove("hidden");
};

document.getElementById("applyTransformBtn").onclick = () => {
    const type = document.getElementById("transformSelect").value;
    if (!grayMat) return;

    if (type === "rotate") {
        const angle = parseFloat(document.getElementById("angleInput").value);
        let center = new cv.Point(grayMat.cols / 2, grayMat.rows / 2);
        let M = cv.getRotationMatrix2D(center, angle, 1);
        transformedMat = new cv.Mat();
        cv.warpAffine(grayMat, transformedMat, M, new cv.Size(grayMat.cols, grayMat.rows));
    } else if (type === "scale") {
        const scale = parseFloat(document.getElementById("scaleInput").value);
        transformedMat = new cv.Mat();
        cv.resize(grayMat, transformedMat, new cv.Size(0, 0), scale, scale, cv.INTER_AREA);
    } else if (type === "translate") {
        const tx = parseInt(document.getElementById("txInput").value);
        const ty = parseInt(document.getElementById("tyInput").value);
        let M = cv.matFromArray(2, 3, cv.CV_32F, [1, 0, tx, 0, 1, ty]);
        transformedMat = new cv.Mat();
        cv.warpAffine(grayMat, transformedMat, M, new cv.Size(grayMat.cols, grayMat.rows));
    }

    cv.imshow("transformedCanvas", transformedMat);
    document.getElementById("transformResult").classList.remove("hidden");
};

document.getElementById("downloadTransformed").onclick = () => {
    const canvas = document.getElementById("transformedCanvas");
    const link = document.createElement("a");
    link.download = "transformed.png";
    link.href = canvas.toDataURL();
    link.click();
};

