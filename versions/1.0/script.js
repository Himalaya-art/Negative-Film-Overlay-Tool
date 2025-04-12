document.addEventListener('DOMContentLoaded', () => {
    // 确保有以下全局变量声明
    const imageInput = document.getElementById('imageInput');
    const imageList = document.getElementById('imageList');
    const blendCanvas = document.getElementById('blendCanvas');
    const ctx = blendCanvas.getContext('2d');
    const canvasMessage = document.getElementById('canvasMessage');
    const downloadBtn = document.getElementById('downloadBtn');
    
    const errorMessagesDiv = document.getElementById('errorMessages');
    let imagesData = [];
    
    // 添加图片加载事件监听
    imageInput.addEventListener('change', handleImageUpload);
    downloadBtn.addEventListener('click', downloadCanvas);
    
    
    function handleImageUpload(e) {
        clearError();
        const files = Array.from(e.target.files);
        
        if (files.length === 0) return;
        
        files.forEach(file => {
            if (!file.type.match(/image\/(png|jpeg|jpg|gif|webp)/i)) {
                displayError(`文件 ${file.name} 不是支持的图片类型 (支持PNG/JPEG/GIF/WEBP)`);
                return;
            }
    
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    imagesData.push({
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        file: file,
                        element: img,
                        inverted: false
                    });
                    addImageToList(imagesData[imagesData.length - 1]);
                    redrawCanvas();
                };
                img.onerror = () => displayError(`加载图片 ${file.name} 失败`);
                img.src = event.target.result;
            };
            reader.onerror = () => displayError(`读取文件 ${file.name} 失败`);
            reader.readAsDataURL(file);
        });
    }

    function addImageToList(imageData) {
        console.log(`开始添加图片到列表: ${imageData.file.name}`); // 日志 (AddToList Start)
        const listItem = document.createElement('li');
        listItem.setAttribute('data-id', imageData.id);
        
        // 添加全选复选框
        if (document.getElementById('selectAllCheckbox') === null) {
            // 创建独立的全选控制行
const selectAllRow = document.createElement('div');
selectAllRow.className = 'select-all-row';

const selectAllCheckbox = document.createElement('input');
selectAllCheckbox.type = 'checkbox';
selectAllCheckbox.id = 'selectAllCheckbox';

const selectAllLabel = document.createElement('label');
selectAllLabel.htmlFor = 'selectAllCheckbox';
selectAllLabel.textContent = '全选反转';

const removeAllButton = document.createElement('button');
removeAllButton.textContent = '移除全部';
removeAllButton.addEventListener('click', removeAllImages);
selectAllRow.appendChild(removeAllButton);
selectAllCheckbox.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('#imageList input[type="checkbox"]:not(#selectAllCheckbox)');
    checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
        const id = checkbox.id.replace('invert-', '');
        const imageData = imagesData.find(img => img.id === id);
        if (imageData) imageData.inverted = e.target.checked;
    });
    redrawCanvas();
});

selectAllRow.appendChild(selectAllCheckbox);
selectAllRow.appendChild(selectAllLabel);
imageList.parentNode.insertBefore(selectAllRow, imageList);
        }

        // Create a preview image (can be styled differently)
        const previewImg = new Image();
        previewImg.src = imageData.element.src; // Use the loaded image src
        previewImg.alt = `预览 ${imageData.file.name}`;
        listItem.appendChild(previewImg);

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'image-controls';

        // Invert Checkbox
        const invertCheckbox = document.createElement('input');
        invertCheckbox.type = 'checkbox';
        invertCheckbox.id = `invert-${imageData.id}`;
        invertCheckbox.checked = imageData.inverted;
        invertCheckbox.addEventListener('change', (e) => {
            imageData.inverted = e.target.checked;
            // Optionally update preview style
            previewImg.classList.toggle('inverted-preview', imageData.inverted);
            
            // 更新全选复选框状态
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            if (selectAllCheckbox) {
                const checkboxes = document.querySelectorAll('#imageList input[type="checkbox"]:not(#selectAllCheckbox)');
                const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
                selectAllCheckbox.checked = allChecked;
            }
            
            redrawCanvas();
        });

        const invertLabel = document.createElement('label');
        invertLabel.htmlFor = `invert-${imageData.id}`;
        invertLabel.textContent = '反转颜色';

        // Remove Button
        const removeButton = document.createElement('button');
        removeButton.textContent = '移除';
        removeButton.addEventListener('click', () => {
            removeImage(imageData.id);
        });

        controlsDiv.appendChild(invertCheckbox);
        controlsDiv.appendChild(invertLabel);
        controlsDiv.appendChild(removeButton);
        listItem.appendChild(controlsDiv);

        imageList.appendChild(listItem);
        console.log(`完成添加图片到列表: ${imageData.file.name}`); // 日志 (AddToList End)
    }

    function removeImage(id) {
        clearError(); // 操作时清除错误
        imagesData = imagesData.filter(imgData => imgData.id !== id);
        const listItem = imageList.querySelector(`li[data-id="${id}"]`);
        if (listItem) {
            imageList.removeChild(listItem);
        }
        redrawCanvas();
    }

    function redrawCanvas() {
        console.log("开始重绘 Canvas..."); // 日志 (Redraw Start)
        clearError(); // 重绘时清除错误
        if (imagesData.length === 0) {
            ctx.clearRect(0, 0, blendCanvas.width, blendCanvas.height);
            blendCanvas.style.display = 'none'; // Hide canvas if empty
            canvasMessage.style.display = 'block'; // Show message
            downloadBtn.disabled = true;
            
            // 当没有图片时，移除全选反转和移除全部按钮
            const selectAllRow = document.querySelector('.select-all-row');
            if (selectAllRow) {
                selectAllRow.remove();
            }
            
            console.log("Canvas 已清空，无图片显示。"); // 日志 (Redraw Cleared)
            return;
        }

        blendCanvas.style.display = 'block'; // Show canvas
        canvasMessage.style.display = 'none'; // Hide message
        downloadBtn.disabled = false;
        console.log(`Canvas 尺寸设置为: ${blendCanvas.width}x${blendCanvas.height}`); // 日志 (Redraw Size Set)

        // Set canvas size based on the first image
        const firstImage = imagesData[0].element;
        blendCanvas.width = firstImage.naturalWidth;
        blendCanvas.height = firstImage.naturalHeight;

        // Clear canvas before drawing
        ctx.clearRect(0, 0, blendCanvas.width, blendCanvas.height);
        // Reset blend mode for the first image
        ctx.globalCompositeOperation = 'source-over';

        imagesData.forEach((imageData, index) => {
            console.log(`重绘 - 处理第 ${index + 1} 张图片: ${imageData.file.name}, 是否反转: ${imageData.inverted}`); // 日志 (Redraw Loop Item)
            let imageToDraw = imageData.element;

            // Apply inversion if needed
            if (imageData.inverted) {
                try {
                    console.log(`重绘 - 尝试反转图片: ${imageData.file.name}`); // 日志 (Redraw Invert Start)
                    imageToDraw = getInvertedImage(imageData.element);
                    console.log(`重绘 - 图片反转成功: ${imageData.file.name}`); // 日志 (Redraw Invert Success)
                } catch(invError) {
                    console.error(`重绘 - 图片反转失败: ${imageData.file.name}`, invError); // 日志 (Redraw Invert Fail)
                    displayError(`处理图片 ${imageData.file.name} 进行反转时出错: ${invError.message}`);
                    imageToDraw = imageData.element;
                }
            }

            // Apply 'multiply' blend mode for subsequent images
            if (index > 0) {
                ctx.globalCompositeOperation = 'multiply';
                console.log(`重绘 - 设置混合模式为 'multiply' (图片 ${index + 1})`); // 日志 (Redraw Blend Mode)
            } else {
                 ctx.globalCompositeOperation = 'source-over'; // 确保第一张图是 source-over
                 console.log(`重绘 - 设置混合模式为 'source-over' (图片 1)`); // 日志 (Redraw Blend Mode Reset)
            }

            // Draw the image (inverted or original) onto the canvas
            // Ensure images are drawn at the same size as the canvas
            console.log(`重绘 - 绘制图片 ${index + 1} 到 Canvas`); // 日志 (Redraw DrawImage)
            ctx.drawImage(imageToDraw, 0, 0, blendCanvas.width, blendCanvas.height);

            // Reset blend mode after drawing each image if needed for other operations,
            // but for simple stacking, setting it before the next draw is sufficient.
            // For clarity, you *could* reset here: ctx.globalCompositeOperation = 'source-over';
            // but it will be overwritten by 'multiply' in the next iteration anyway (if index > 0).
        });

        // IMPORTANT: Reset to default after the loop for any future drawing (if any)
         ctx.globalCompositeOperation = 'source-over';
         console.log("Canvas 重绘完成，混合模式重置为 'source-over'。"); // 日志 (Redraw End)
    }

    function getInvertedImage(originalImage) {
        const offscreenCanvas = document.createElement('canvas');
        const offscreenCtx = offscreenCanvas.getContext('2d');
        
        // 确保设置正确的画布尺寸
        offscreenCanvas.width = originalImage.width;
        offscreenCanvas.height = originalImage.height;
        
        // 先绘制原始图像
        offscreenCtx.drawImage(originalImage, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        
        try {
            const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            const data = imageData.data;
            
            // 优化反转算法
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];     // R
                data[i + 1] = 255 - data[i + 1]; // G
                data[i + 2] = 255 - data[i + 2]; // B
                // Alpha通道保持不变
            }
            
            offscreenCtx.putImageData(imageData, 0, 0);
            return offscreenCanvas;
        } catch (e) {
            console.error("图片反转失败:", e);
            throw new Error("图片反转失败，可能是跨域问题");
        }
    }

    function downloadCanvas() {
        clearError(); // 操作时清除错误
        if (imagesData.length === 0) return;

        try {
            const dataURL = blendCanvas.toDataURL('image/png'); // Or 'image/jpeg'

            const link = document.createElement('a');
            link.href = dataURL;
            link.download = 'blended-image.png'; // Filename for download
            link.target = '_blank';
            
            // 添加安全属性
            link.rel = 'noopener noreferrer';
            
            // 使用setTimeout确保下载链接被正确处理
            setTimeout(() => {
                document.body.appendChild(link); // Required for Firefox
                link.click();
                document.body.removeChild(link); // Clean up
            }, 100);
        } catch (e) {
            displayError(`下载图片失败: ${e.message}`);
        }
    }

    function clearError() {
        errorMessagesDiv.textContent = '';
    }

    function displayError(message) {
        errorMessagesDiv.textContent = message;
    }
    
    function removeAllImages() {
        clearError();
        imagesData = [];
        imageList.innerHTML = '';
        const selectAllRow = document.querySelector('.select-all-row');
        if (selectAllRow) {
            selectAllRow.remove();
        }
        redrawCanvas();
    }

    // Initial state
    console.log("DOM 加载完成，脚本初始化。"); // 日志 (Init)
    blendCanvas.style.display = 'none';
    canvasMessage.style.display = 'block';
});