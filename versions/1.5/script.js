document.addEventListener('DOMContentLoaded', () => {
    // 确保有以下全局变量声明
    const imageInput = document.getElementById('imageInput');
    const imageList = document.getElementById('imageList');
    const blendCanvas = document.getElementById('blendCanvas');
    const ctx = blendCanvas.getContext('2d', { willReadFrequently: true });
    const canvasMessage = document.getElementById('canvasMessage');
    const downloadBtn = document.getElementById('downloadBtn');
    
    const errorMessagesDiv = document.getElementById('errorMessages');
    const performanceInfoDiv = document.getElementById('performanceInfo');
    const bodyElement = document.body;
    
    let imagesData = [];
    let isSelectAllRowAdded = false;
    
    // 添加图片加载事件监听
    imageInput.addEventListener('change', handleImageUpload);
    downloadBtn.addEventListener('click', downloadCanvas);
    
    
    function handleImageUpload(e) {
        clearFeedback();
        const files = Array.from(e.target.files);
        let processedCount = 0;
        const totalFiles = files.length;
        
        if (totalFiles === 0) return;
        
        // Show loading state immediately
        setLoadingState(true);
        
        files.forEach((file, index) => {
            if (!file.type.match(/image\/(png|jpeg|jpg|gif|webp)/i)) {
                displayError(`文件 ${file.name} 不是支持的图片类型 (支持PNG/JPEG/GIF/WEBP)`);
                processedCount++;
                checkCompletion();
                return;
            }
    
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const imageData = {
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        file: file,
                        element: img,
                        inverted: false
                    };
                    imagesData.push(imageData);
                    addImageToList(imageData);

                    // Create select all row only after the *first* image is added
                    if (!isSelectAllRowAdded) {
                        createSelectAllRow();
                        isSelectAllRowAdded = true;
                    }
                    processedCount++;
                    checkCompletion();
                };
                img.onerror = () => {
                    displayError(`加载图片 ${file.name} 失败`);
                    processedCount++;
                    checkCompletion();
                };
                img.src = event.target.result;
            };
            reader.onerror = () => {
                displayError(`读取文件 ${file.name} 失败`);
                processedCount++;
                checkCompletion();
            };
            reader.readAsDataURL(file);
        });

        // Function to check if all files are processed
        function checkCompletion() {
            if (processedCount === totalFiles) {
                redrawCanvas(); // Redraw only after all images are processed
                // Clear the input value to allow re-selecting the same file(s)
                imageInput.value = '';
            }
        }
    }

    function createSelectAllRow() {
        const selectAllRow = document.createElement('div');
        selectAllRow.className = 'select-all-row';
        selectAllRow.id = 'select-all-controls'; // Add ID for easy removal

        const selectAllLabel = document.createElement('label');
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'selectAllCheckbox';
        selectAllCheckbox.addEventListener('change', handleSelectAllChange);

        selectAllLabel.htmlFor = 'selectAllCheckbox';
        selectAllLabel.textContent = '全选反转';
        selectAllLabel.prepend(selectAllCheckbox); // Checkbox inside label

        const removeAllButton = document.createElement('button');
        removeAllButton.textContent = '移除全部';
        removeAllButton.addEventListener('click', removeAllImages);

        selectAllRow.appendChild(selectAllLabel);
        selectAllRow.appendChild(removeAllButton);

        // Insert before the imageList ul
        imageList.parentNode.insertBefore(selectAllRow, imageList);
    }

    function handleSelectAllChange(e) {
        const isChecked = e.target.checked;
        const checkboxes = imageList.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            if (checkbox.checked !== isChecked) {
                checkbox.checked = isChecked;
                // Trigger the change event handler for individual checkboxes
                checkbox.dispatchEvent(new Event('change'));
            }
        });
        // Redraw is handled by individual checkbox change events
    }

    function addImageToList(imageData) {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-id', imageData.id);
        listItem.style.animationDelay = `${imageList.children.length * 0.05}s`; // Stagger animation

        const previewImg = new Image();
        previewImg.src = imageData.element.src;
        previewImg.alt = `预览 ${imageData.file.name}`;
        previewImg.classList.toggle('inverted-preview', imageData.inverted); // Initial state
        listItem.appendChild(previewImg);

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'image-controls';

        const invertLabel = document.createElement('label');
        const invertCheckbox = document.createElement('input');
        invertCheckbox.type = 'checkbox';
        invertCheckbox.id = `invert-${imageData.id}`; // Use ID for label 'for'
        invertCheckbox.checked = imageData.inverted;
        invertCheckbox.addEventListener('change', (e) => {
            imageData.inverted = e.target.checked;
            previewImg.classList.toggle('inverted-preview', imageData.inverted);
            updateSelectAllCheckboxState();
            redrawCanvas();
        });

        invertLabel.htmlFor = `invert-${imageData.id}`;
        invertLabel.textContent = '反转颜色';
        invertLabel.prepend(invertCheckbox); // Checkbox inside label for better click area

        const removeButton = document.createElement('button');
        removeButton.textContent = '移除';
        removeButton.addEventListener('click', () => {
            removeImage(imageData.id);
        });

        controlsDiv.appendChild(invertLabel); // Label contains checkbox now
        controlsDiv.appendChild(removeButton);
        listItem.appendChild(controlsDiv);

        imageList.appendChild(listItem);
    }

    function updateSelectAllCheckboxState() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (!selectAllCheckbox) return; // No checkbox if no images

        const checkboxes = imageList.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length === 0) {
             selectAllCheckbox.checked = false;
             selectAllCheckbox.indeterminate = false;
             return;
        }

        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        const noneChecked = Array.from(checkboxes).every(cb => !cb.checked);

        if (allChecked) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else if (noneChecked) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false; // Or true, doesn't matter much visually
            selectAllCheckbox.indeterminate = true; // Visually indicates partial selection
        }
    }

    function removeImage(id) {
        clearFeedback();
        imagesData = imagesData.filter(imgData => imgData.id !== id);
        const listItem = imageList.querySelector(`li[data-id="${id}"]`);
        if (listItem) {
            listItem.remove(); // More modern than removeChild
        }

        if (imagesData.length === 0) {
            removeSelectAllRow(); // Clean up select all row if last image removed
        } else {
             updateSelectAllCheckboxState(); // Update selectAll state after removal
        }

        redrawCanvas();
    }

    function removeAllImages() {
        clearFeedback();
        imagesData = [];
        imageList.innerHTML = ''; // Clear all list items
        removeSelectAllRow(); // Remove the controls
        redrawCanvas(); // Update canvas (will show placeholder)
    }

    function removeSelectAllRow() {
        const selectAllRow = document.getElementById('select-all-controls');
        if (selectAllRow) {
            selectAllRow.remove();
            isSelectAllRowAdded = false;
        }
    }

    function redrawCanvas() {
        setLoadingState(true); // Show loading state
        const startTime = performance.now(); // Start timing
        clearFeedback();

        if (imagesData.length === 0) {
            ctx.clearRect(0, 0, blendCanvas.width, blendCanvas.height);
            blendCanvas.style.display = 'none';
            canvasMessage.style.display = 'block';
            downloadBtn.disabled = true;
            performanceInfoDiv.textContent = ''; // Clear performance info
            setLoadingState(false); // Hide loading
            return;
        }

        blendCanvas.style.display = 'block';
        canvasMessage.style.display = 'none';
        downloadBtn.disabled = false;

        // Use dimensions of the *first* image as the base
        const firstImage = imagesData[0].element;
        if (blendCanvas.width !== firstImage.naturalWidth || blendCanvas.height !== firstImage.naturalHeight) {
            blendCanvas.width = firstImage.naturalWidth;
            blendCanvas.height = firstImage.naturalHeight;
            console.log(`Canvas resized to: ${blendCanvas.width}x${blendCanvas.height}`);
        }

        ctx.clearRect(0, 0, blendCanvas.width, blendCanvas.height);
        ctx.globalCompositeOperation = 'source-over'; // Reset for the first image

        let inversionErrorOccurred = false;

        imagesData.forEach((imageData, index) => {
            let imageToDraw = imageData.element;

            if (imageData.inverted) {
                try {
                    imageToDraw = getInvertedImage(imageData.element);
                } catch (invError) {
                    console.error(`Image inversion failed: ${imageData.file.name}`, invError);
                    displayError(`反转图片 ${imageData.file.name} 时出错: ${invError.message}. 使用原始图片。`);
                    imageToDraw = imageData.element; // Fallback to original
                    inversionErrorOccurred = true; // Flag error
                }
            }

            // Apply 'multiply' blend mode for subsequent images
            if (index > 0) {
                ctx.globalCompositeOperation = 'multiply';
            } else {
                 ctx.globalCompositeOperation = 'source-over'; // Explicitly set for first image
            }

            // Draw the image, ensuring it covers the canvas
            try {
                ctx.drawImage(imageToDraw, 0, 0, blendCanvas.width, blendCanvas.height);
            } catch(drawError) {
                 console.error(`Error drawing image ${index + 1} (${imageData.file.name}):`, drawError);
                 displayError(`绘制图片 ${imageData.file.name} 时出错。`);
                 // Optionally skip this image or stop processing? For now, just log.
            }
        });

        // Reset composite operation after drawing all images
        ctx.globalCompositeOperation = 'source-over';

        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(1);
        performanceInfoDiv.textContent = `画布重绘耗时 ${duration} ms.${inversionErrorOccurred ? ' (处理期间发生反转错误)' : ''}`;
        console.log(`Canvas redraw completed in ${duration} ms.`); // Log performance

        setLoadingState(false); // Hide loading state
    }

    function getInvertedImage(originalImage) {
        // Consider caching inverted images if performance is critical and memory allows
        const offscreenCanvas = new OffscreenCanvas(originalImage.naturalWidth, originalImage.naturalHeight);
        // const offscreenCanvas = document.createElement('canvas'); // Fallback if OffscreenCanvas not supported
        // offscreenCanvas.width = originalImage.naturalWidth;
        // offscreenCanvas.height = originalImage.naturalHeight;
        const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true }); // Optimization hint

        // Draw the original image onto the offscreen canvas
        offscreenCtx.drawImage(originalImage, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        try {
            // Get pixel data
            const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            const data = imageData.data;

            // Invert RGB values (faster loop)
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];     // R
                data[i + 1] = 255 - data[i + 1]; // G
                data[i + 2] = 255 - data[i + 2]; // B
                // Alpha (data[i + 3]) remains unchanged
            }

            // Put the modified data back
            offscreenCtx.putImageData(imageData, 0, 0);
            return offscreenCanvas; // Return the canvas element itself
        } catch (e) {
            // Handle potential security errors (e.g., tainted canvas)
            console.error("Error getting/putting image data for inversion:", e);
            // Check if it's a security error
             if (e instanceof DOMException && e.name === 'SecurityError') {
                throw new Error("图片反转失败：无法处理跨域图片或画布已污染。");
             } else {
                 throw new Error(`图片反转时发生未知错误: ${e.message}`);
             }
        }
    }

    function downloadCanvas() {
        clearFeedback();
        if (imagesData.length === 0) {
            displayError("没有图片可供下载。");
            return;
        }

        try {
             // Use PNG for potentially better quality with transparency/inversion
            const dataURL = blendCanvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.href = dataURL;
            // Generate a slightly more descriptive filename
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            link.download = `blended-image-${timestamp}.png`;
            link.rel = 'noopener noreferrer'; // Security best practice

            // Trigger download
            document.body.appendChild(link); // Append required for Firefox
            link.click();
            document.body.removeChild(link); // Clean up link element

        } catch (e) {
             console.error("Canvas download failed:", e);
              // Check for security errors (e.g., tainted canvas)
             if (e instanceof DOMException && e.name === 'SecurityError') {
                displayError("下载失败：无法导出跨域图片或画布已污染。");
             } else {
                displayError(`下载图片时发生错误: ${e.message}`);
             }
        }
    }

    function clearFeedback() {
        errorMessagesDiv.textContent = '';
        errorMessagesDiv.style.display = 'none'; // Explicitly hide
    }

    function displayError(message) {
        errorMessagesDiv.textContent = message;
        errorMessagesDiv.style.display = 'block'; // Explicitly show
    }
    
    function setLoadingState(isLoading) {
         bodyElement.classList.toggle('is-loading', isLoading);
    }

    // Initial state
    console.log("DOM 加载完成，脚本初始化。");
    blendCanvas.style.display = 'none';
    canvasMessage.style.display = 'block';
    downloadBtn.disabled = true;
    setLoadingState(false); // Ensure loading is off initially
});