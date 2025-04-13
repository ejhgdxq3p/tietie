$(document).ready(function() {
    let selectedColor = "random"; // 默认随机颜色
    let currentNoteId = 0;
    let activeContextMenu = null;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let drawingCanvas = document.getElementById('drawing-canvas');
    let ctx = drawingCanvas.getContext('2d');
    let drawingData = null; // 存储当前绘图数据
    
    // 历史记录
    let boardHistory = []; // 存储黑板状态历史
    let currentHistoryIndex = -1; // 当前历史记录索引
    let isUndoRedoAction = false; // 标记是否正在执行撤销/重做操作
    
    // 初始化撤销和重做按钮状态
    updateHistoryButtonStates();
    
    // 选择便利贴颜色
    $(".color-option").click(function() {
        const color = $(this).data("color");
        if (color === "random") {
            // 不设置selectedColor，在创建时随机生成
            selectedColor = "random";
        } else {
            selectedColor = color;
            // 高亮显示选中的颜色
            $(".color-option").css("border", "2px solid white");
            $(this).css("border", "2px solid black");
        }
    });
    
    // 生成随机颜色
    function getRandomColor() {
        const colors = ["#FFFF99", "#FF9999", "#99FF99", "#9999FF", "#FF99FF", "#FFCC99", "#99FFFF"];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // 生成随机角度
    function getRandomRotation() {
        // 80%的概率生成正向便利贴，20%的概率有轻微倾斜
        return Math.random() > 0.2 ? 0 : (Math.random() * 6 - 3);
    }
    
    // 生成随机位置
    function getRandomPosition() {
        const boardWidth = $("#blackboard").width();
        const boardHeight = $("#blackboard").height();
        
        return {
            left: Math.random() * (boardWidth - 300) + 50,
            top: Math.random() * (boardHeight - 300) + 50
        };
    }
    
    // 初始化涂鸦区
    function initDrawingCanvas() {
        // 设置画布背景为白色
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        
        // 鼠标按下事件
        $('#drawing-canvas').mousedown(function(e) {
            isDrawing = true;
            const rect = drawingCanvas.getBoundingClientRect();
            lastX = e.clientX - rect.left;
            lastY = e.clientY - rect.top;
        });
        
        // 鼠标移动事件
        $('#drawing-canvas').mousemove(function(e) {
            if (!isDrawing) return;
            
            const rect = drawingCanvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            ctx.strokeStyle = $('#brush-color').val();
            ctx.lineWidth = $('#brush-size').val();
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            
            lastX = currentX;
            lastY = currentY;
            
            // 保存当前绘图数据
            drawingData = drawingCanvas.toDataURL();
        });
        
        // 鼠标松开事件
        $(document).mouseup(function() {
            isDrawing = false;
        });
        
        // 鼠标离开画布事件
        $('#drawing-canvas').mouseleave(function() {
            isDrawing = false;
        });
        
        // 清除画布按钮
        $('#clear-canvas').click(function() {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            drawingData = null;
        });
        
        // 上传图片
        $('#image-upload').change(function(e) {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        // 清除画布
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                        
                        // 计算图片缩放比例，保持宽高比
                        const ratio = Math.min(
                            drawingCanvas.width / img.width,
                            drawingCanvas.height / img.height
                        );
                        
                        const newWidth = img.width * ratio;
                        const newHeight = img.height * ratio;
                        
                        // 居中绘制图片
                        const x = (drawingCanvas.width - newWidth) / 2;
                        const y = (drawingCanvas.height - newHeight) / 2;
                        
                        ctx.drawImage(img, x, y, newWidth, newHeight);
                        
                        // 保存当前绘图数据
                        drawingData = drawingCanvas.toDataURL();
                    };
                    img.src = event.target.result;
                };
                
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
    
    // 初始化涂鸦区
    initDrawingCanvas();
    
    // 创建便利贴
    $("#create-note").click(function() {
        createNewNote();
        saveToHistory(); // 保存历史记录
    });
    
    function createNewNote() {
        const title = $("#note-title").val() || "";
        const content = $("#note-content").val() || "";
        const noteColor = selectedColor === "random" ? getRandomColor() : selectedColor;
        const position = getRandomPosition();
        const rotation = getRandomRotation();
        const noteId = currentNoteId++;
        const hasDrawing = drawingData !== null;
        
        // 创建便利贴HTML
        let noteHtml;
        
        if (hasDrawing) {
            // 带有涂鸦/图片的便利贴
            noteHtml = `
                <div class="sticky-note" id="note-${noteId}" style="background-color: ${noteColor}; left: ${position.left}px; top: ${position.top}px; --rotate-deg: ${rotation}deg;">
                    <div class="delete-btn">✕</div>
                    <div class="note-background" style="background-image: url('${drawingData}');"></div>
                    <div class="note-title" contenteditable="true">${title}</div>
                    <div class="note-content" contenteditable="true">${content}</div>
                    <div class="bottom-shadow"></div>
                </div>
            `;
        } else {
            // 普通便利贴
            noteHtml = `
                <div class="sticky-note" id="note-${noteId}" style="background-color: ${noteColor}; left: ${position.left}px; top: ${position.top}px; --rotate-deg: ${rotation}deg;">
                    <div class="delete-btn">✕</div>
                    <div class="note-title" contenteditable="true">${title}</div>
                    <div class="note-content" contenteditable="true">${content}</div>
                    <div class="bottom-shadow"></div>
                </div>
            `;
        }
        
        $("#blackboard").append(noteHtml);
        
        // 清空输入框和画布
        $("#note-title").val("");
        $("#note-content").val("");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        drawingData = null;
        
        // 使便利贴可拖动
        $(`#note-${noteId}`).draggable({
            containment: "parent",
            stack: ".sticky-note",
            start: function() {
                // 开始拖动时添加选中状态
                $('.sticky-note').removeClass('selected-note');
                $(this).addClass('selected-note');
                
                // 检查是否接近正向，添加网格对齐类
                const rotation = parseFloat($(this).css('--rotate-deg') || '0deg');
                if (Math.abs(rotation % 90) < 0.5) {
                    $(this).addClass('align-to-grid');
                    $(this).addClass('show-grid');
                }
                
                // 移除所有对齐指示线
                $('.alignment-guide').remove();
            },
            drag: function(event, ui) {
                // 检查是否接近正向
                const rotation = parseFloat($(this).css('--rotate-deg') || '0deg');
                if (Math.abs(rotation % 90) < 0.5) {
                    // 移除所有对齐指示线
                    $('.alignment-guide').remove();
                    
                    // 检查对齐
                    checkAlignment($(this), ui.position);
                }
                
                checkOverlap();
            },
            stop: function() {
                checkOverlap();
                $(this).removeClass('show-grid');
                // 移除所有对齐指示线
                $('.alignment-guide').remove();
                
                // 保存历史记录
                saveToHistory();
            }
        });
        
        // 添加键盘控制
        $(`#note-${noteId}`).on('click', function() {
            // 移除其他便利贴的选中状态
            $('.sticky-note').removeClass('selected-note');
            // 添加当前便利贴的选中状态
            $(this).addClass('selected-note');
        });
        
        // 删除按钮功能
        $(`#note-${noteId} .delete-btn`).click(function(e) {
            e.stopPropagation();
            $(`#note-${noteId}`).remove();
            checkOverlap();
            saveToHistory(); // 保存历史记录
        });
        
        // 右键菜单
        $(`#note-${noteId}`).on("contextmenu", function(e) {
            e.preventDefault();
            showContextMenu(e.pageX, e.pageY, noteId);
        });
        
        // 初始检查重叠
        setTimeout(checkOverlap, 100);
    }
    
    // 显示右键菜单
    function showContextMenu(x, y, noteId) {
        // 移除之前的菜单
        $(".context-menu").remove();
        
        const menuHtml = `
            <div class="context-menu">
                <div class="context-menu-item edit-note">编辑便利贴</div>
                <div class="context-menu-item change-color">更改颜色</div>
                <div class="color-submenu" style="display: none;">
                    <span class="color-menu-option" data-color="#FFFF99" style="background-color: #FFFF99;"></span>
                    <span class="color-menu-option" data-color="#FF9999" style="background-color: #FF9999;"></span>
                    <span class="color-menu-option" data-color="#99FF99" style="background-color: #99FF99;"></span>
                    <span class="color-menu-option" data-color="#9999FF" style="background-color: #9999FF;"></span>
                    <span class="color-menu-option" data-color="#FF99FF" style="background-color: #FF99FF;"></span>
                </div>
                <div class="context-menu-item delete-note">删除便利贴</div>
            </div>
        `;
        
        $("body").append(menuHtml);
        
        // 定位菜单
        $(".context-menu").css({
            top: y + "px",
            left: x + "px"
        });
        
        activeContextMenu = {
            menu: $(".context-menu"),
            noteId: noteId
        };
        
        // 菜单项点击事件
        $(".edit-note").click(function() {
            $(`#note-${noteId} .note-title`).focus();
            $(".context-menu").remove();
        });
        
        $(".change-color").hover(function() {
            $(".color-submenu").show();
        });
        
        $(".color-menu-option").click(function() {
            const color = $(this).data("color");
            $(`#note-${noteId}`).css("background-color", color);
            $(".context-menu").remove();
        });
        
        $(".delete-note").click(function() {
            $(`#note-${noteId}`).remove();
            $(".context-menu").remove();
        });
    }
    
    // 点击其他地方关闭右键菜单
    $(document).click(function() {
        $(".context-menu").remove();
    });
    
    // 保存黑板为图片
    $("#save-board").click(function() {
        html2canvas(document.getElementById("blackboard"), {
            scale: 2, // 提高分辨率
            useCORS: true, // 允许加载跨域图片
            allowTaint: true, // 允许图片污染画布
            backgroundColor: "#2a623d", // 设置背景色与黑板一致
            onclone: function(clonedDoc) {
                // 修复克隆文档中的样式问题
                $(clonedDoc).find('.sticky-note').each(function() {
                    const $note = $(this);
                    const rotation = $note.css('--rotate-deg') || '0deg';
                    const scale = $note.data('scale') || 1;
                    
                    // 直接设置transform样式，避免使用CSS变量
                    $note.css('transform', `rotate(${rotation}) scale(${scale})`);
                });
            }
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = '我的黑板便利贴_高清.png';
            link.href = canvas.toDataURL('image/png', 1.0); // 使用最高质量
            link.click();
        });
    });
    
    // 清空黑板
    $("#clear-board").click(function() {
        if (confirm("确定要清空黑板吗？此操作不可撤销。")) {
            $(".sticky-note").remove();
            saveToHistory(); // 保存历史记录
        }
    });
    
    // 按Enter键创建便利贴
    $("#note-content").keypress(function(e) {
        if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            createNewNote();
        }
    });
    
    // 全局键盘事件
    $(document).keydown(function(e) {
        const selectedNote = $('.selected-note');
        if (selectedNote.length > 0) {
            // 获取当前旋转角度
            let currentRotation = selectedNote.css('--rotate-deg') || '0deg';
            currentRotation = parseFloat(currentRotation);
            
            let currentScale;
            let rotationChanged = false;
            
            // 检查是否按下Shift键
            if (e.shiftKey) {
                switch(e.which) {
                    case 37: // Shift+左箭头键 - 旋转到最近的八向角度（逆时针）
                        // 将角度转换为0-360范围
                        let angle = currentRotation % 360;
                        if (angle < 0) angle += 360;
                        
                        // 找到最近的八向角度（逆时针方向）
                        for (let i = 0; i < 8; i++) {
                            const targetAngle = i * 45;
                            if (angle > targetAngle) continue;
                            // 找到第一个大于当前角度的八向角度
                            currentRotation = (i === 0 ? 315 : (i - 1) * 45);
                            break;
                        }
                        // 如果没有找到（当前角度接近360度）
                        if (angle > 315) currentRotation = 315;
                        rotationChanged = true;
                        break;
                    case 39: // Shift+右箭头键 - 旋转到最近的八向角度（顺时针）
                        // 将角度转换为0-360范围
                        let angle2 = currentRotation % 360;
                        if (angle2 < 0) angle2 += 360;
                        
                        // 找到最近的八向角度（顺时针方向）
                        for (let i = 7; i >= 0; i--) {
                            const targetAngle = i * 45;
                            if (angle2 < targetAngle) continue;
                            // 找到第一个小于当前角度的八向角度
                            currentRotation = (i === 7 ? 0 : (i + 1) * 45);
                            break;
                        }
                        // 如果没有找到（当前角度接近0度）
                        if (angle2 < 45) currentRotation = 45;
                        rotationChanged = true;
                        break;
                    case 38: // Shift+上箭头键 - 恢复原始大小
                        selectedNote.data('scale', 1);
                        currentScale = 1;
                        break;
                    case 40: // Shift+下箭头键 - 旋转到0度（正向）
                        currentRotation = 0;
                        rotationChanged = true;
                        break;
                    default: return;
                }
            } else {
                switch(e.which) {
                    case 37: // 左箭头键
                        currentRotation -= 1;
                        break;
                    case 39: // 右箭头键
                        currentRotation += 1;
                        break;
                    case 38: // 上箭头键
                        // 放大便利贴
                        currentScale = selectedNote.data('scale') || 1;
                        currentScale += 0.05;
                        selectedNote.data('scale', currentScale);
                        break;
                    case 40: // 下箭头键
                        // 缩小便利贴
                        currentScale = selectedNote.data('scale') || 1;
                        currentScale = Math.max(0.5, currentScale - 0.05);
                        selectedNote.data('scale', currentScale);
                        break;
                    default: return;
                }
            }
            
            // 更新旋转角度和缩放
            selectedNote.css('--rotate-deg', currentRotation + 'deg');
            currentScale = selectedNote.data('scale') || 1;
            selectedNote.css('transform', `rotate(${currentRotation}deg) scale(${currentScale})`);
            
            // 如果旋转角度是四个主要方向之一，添加网格对齐类
            if (Math.abs(currentRotation % 90) < 0.5) {
                selectedNote.addClass('align-to-grid');
                
                // 如果旋转角度刚刚改变为四个主要方向之一，触发磁吸对齐
                if (rotationChanged) {
                    // 模拟拖动事件以触发磁吸对齐
                    const position = {
                        left: parseInt(selectedNote.css('left')),
                        top: parseInt(selectedNote.css('top'))
                    };
                    
                    // 检查是否需要对齐
                    checkAlignment(selectedNote, position);
                    
                    // 应用新位置
                    selectedNote.css({
                        left: position.left + 'px',
                        top: position.top + 'px'
                    });
                }
            } else {
                selectedNote.removeClass('align-to-grid');
            }
            
            // 保存历史记录
            saveToHistory();
            
            e.preventDefault(); // 防止页面滚动
        }
        
        // 添加键盘快捷键
        if (e.ctrlKey || e.metaKey) { // Ctrl 或 Command 键
            if (e.which === 90) { // Z 键
                if (e.shiftKey) {
                    // Ctrl+Shift+Z 重做
                    $('#redo-button').click();
                } else {
                    // Ctrl+Z 撤销
                    $('#undo-button').click();
                }
                e.preventDefault();
            } else if (e.which === 89) { // Y 键
                // Ctrl+Y 重做
                $('#redo-button').click();
                e.preventDefault();
            }
        }
    });
    
    // 为测试便利贴添加点击事件
    $(document).on('click', '.sticky-note', function() {
        $('.sticky-note').removeClass('selected-note');
        $(this).addClass('selected-note');
    });
    
    // 检查便利贴重叠
    function checkOverlap() {
        // 移除所有covered类
        $(".sticky-note").removeClass("covered");
        
        // 获取所有便利贴
        const notes = $(".sticky-note").toArray();
        
        // 检查每个便利贴是否被其他便利贴覆盖
        for (let i = 0; i < notes.length; i++) {
            const note1 = $(notes[i]);
            const rect1 = notes[i].getBoundingClientRect();
            const topArea1 = {
                left: rect1.left,
                top: rect1.top,
                right: rect1.right,
                bottom: rect1.top + 30 // 顶部区域高度
            };
            
            for (let j = 0; j < notes.length; j++) {
                if (i !== j) {
                    const note2 = $(notes[j]);
                    const rect2 = notes[j].getBoundingClientRect();
                    const z1 = parseInt(note1.css("z-index")) || 1;
                    const z2 = parseInt(note2.css("z-index")) || 1;
                    
                    // 如果note2在note1上面且覆盖了note1的底部
                    if (z2 > z1 && 
                        rect2.left < rect1.right && 
                        rect2.right > rect1.left && 
                        rect2.top < rect1.bottom && 
                        rect2.bottom > rect1.bottom - 30) { // 底部区域高度
                        note1.addClass("covered");
                        break;
                    }
                    
                    // 如果note2在note1下面且note1的胶带区域完全覆盖了note2
                    if (z1 > z2 && 
                        topArea1.left < rect2.right && 
                        topArea1.right > rect2.left && 
                        topArea1.top < rect2.top && 
                        topArea1.bottom > rect2.top) {
                        note2.addClass("covered");
                    }
                }
            }
        }
    }
    
    // 窗口大小改变时重新检查重叠
    $(window).resize(function() {
        checkOverlap();
    });
    
    // 显示对齐指示线
    function showAlignmentGuide(type, position) {
        // 移除同类型的旧指示线
        $(`.alignment-guide.${type}-guide`).remove();
        
        const $blackboard = $('#blackboard');
        let $guide;
        
        if (type === 'vertical') {
            $guide = $('<div class="alignment-guide vertical-guide"></div>');
            $guide.css('left', position + 'px');
        } else {
            $guide = $('<div class="alignment-guide horizontal-guide"></div>');
            $guide.css('top', position + 'px');
        }
        
        $blackboard.append($guide);
        
        // 2秒后自动移除
        setTimeout(function() {
            $guide.fadeOut(200, function() {
                $(this).remove();
            });
        }, 2000);
    }
    
    // 修改检查对齐的函数
    function checkAlignment(note, position) {
        // 获取当前旋转角度
        const rotation = parseFloat(note.css('--rotate-deg') || '0deg');
        
        // 只对0°, 90°, 180°, 270°应用对齐效果
        if (Math.abs(rotation % 90) >= 0.5) {
            return position;
        }
        
        // 获取所有其他便利贴
        const $allNotes = $('.sticky-note').not(note);
        const threshold = 15; // 磁吸阈值（像素）
        
        // 当前便利贴位置和尺寸
        const currentLeft = position.left;
        const currentTop = position.top;
        const currentSize = 280; // 便利贴大小
        const currentRight = currentLeft + currentSize;
        const currentBottom = currentTop + currentSize;
        const currentCenterX = currentLeft + currentSize / 2;
        const currentCenterY = currentTop + currentSize / 2;
        
        // 检查与其他便利贴的对齐
        $allNotes.each(function() {
            const $other = $(this);
            const otherLeft = parseInt($other.css('left'));
            const otherTop = parseInt($other.css('top'));
            const otherSize = 280; // 便利贴大小
            const otherRight = otherLeft + otherSize;
            const otherBottom = otherTop + otherSize;
            const otherCenterX = otherLeft + otherSize / 2;
            const otherCenterY = otherTop + otherSize / 2;
            
            // 水平对齐检查
            if (Math.abs(currentLeft - otherLeft) < threshold) {
                // 左边缘对齐
                position.left = otherLeft;
                showAlignmentGuide('vertical', otherLeft);
            } else if (Math.abs(currentRight - otherRight) < threshold) {
                // 右边缘对齐
                position.left = otherRight - currentSize;
                showAlignmentGuide('vertical', otherRight);
            } else if (Math.abs(currentCenterX - otherCenterX) < threshold) {
                // 中心对齐
                position.left = otherCenterX - currentSize / 2;
                showAlignmentGuide('vertical', otherCenterX);
            }
            
            // 垂直对齐检查
            if (Math.abs(currentTop - otherTop) < threshold) {
                // 顶部对齐
                position.top = otherTop;
                showAlignmentGuide('horizontal', otherTop);
            } else if (Math.abs(currentBottom - otherBottom) < threshold) {
                // 底部对齐
                position.top = otherBottom - currentSize;
                showAlignmentGuide('horizontal', otherBottom);
            } else if (Math.abs(currentCenterY - otherCenterY) < threshold) {
                // 中心对齐
                position.top = otherCenterY - currentSize / 2;
                showAlignmentGuide('horizontal', otherCenterY);
            }
        });
        
        return position;
    }
    
    // 保存当前黑板状态到历史记录
    function saveToHistory() {
        if (isUndoRedoAction) return; // 如果正在执行撤销/重做操作，不保存历史
        
        // 获取当前黑板状态
        const currentState = {
            notes: [],
            boardColor: $("#blackboard").css("background-color")
        };
        
        // 收集所有便利贴的信息
        $('.sticky-note').each(function() {
            const $note = $(this);
            currentState.notes.push({
                id: $note.attr('id'),
                color: $note.css('background-color'),
                left: parseInt($note.css('left')),
                top: parseInt($note.css('top')),
                rotation: $note.css('--rotate-deg') || '0deg',
                scale: $note.data('scale') || 1,
                title: $note.find('.note-title').html(),
                content: $note.find('.note-content').html(),
                hasBackground: $note.find('.note-background').length > 0,
                backgroundImage: $note.find('.note-background').length > 0 ? 
                                $note.find('.note-background').css('background-image') : null,
                zIndex: parseInt($note.css('z-index')) || 1
            });
        });
        
        // 如果当前索引不是历史记录的最后一个，删除后面的历史记录
        if (currentHistoryIndex < boardHistory.length - 1) {
            boardHistory = boardHistory.slice(0, currentHistoryIndex + 1);
        }
        
        // 添加新的历史记录
        boardHistory.push(currentState);
        currentHistoryIndex = boardHistory.length - 1;
        
        // 限制历史记录数量，防止内存占用过大
        if (boardHistory.length > 30) {
            boardHistory.shift();
            currentHistoryIndex--;
        }
        
        // 更新撤销和重做按钮状态
        updateHistoryButtonStates();
        
        // 同时保存到本地存储
        saveToLocalStorage();
    }
    
    // 更新撤销和重做按钮状态
    function updateHistoryButtonStates() {
        // 禁用/启用撤销按钮
        if (currentHistoryIndex <= 0) {
            $('#undo-button').prop('disabled', true);
        } else {
            $('#undo-button').prop('disabled', false);
        }
        
        // 禁用/启用重做按钮
        if (currentHistoryIndex >= boardHistory.length - 1) {
            $('#redo-button').prop('disabled', true);
        } else {
            $('#redo-button').prop('disabled', false);
        }
    }
    
    // 撤销操作
    $('#undo-button').click(function() {
        if (currentHistoryIndex > 0) {
            isUndoRedoAction = true;
            currentHistoryIndex--;
            restoreBoardState(boardHistory[currentHistoryIndex]);
            updateHistoryButtonStates();
            isUndoRedoAction = false;
        }
    });
    
    // 重做操作
    $('#redo-button').click(function() {
        if (currentHistoryIndex < boardHistory.length - 1) {
            isUndoRedoAction = true;
            currentHistoryIndex++;
            restoreBoardState(boardHistory[currentHistoryIndex]);
            updateHistoryButtonStates();
            isUndoRedoAction = false;
        }
    });
    
    // 恢复黑板状态
    function restoreBoardState(state) {
        // 恢复黑板背景颜色
        $("#blackboard").css("background-color", state.boardColor || "#2a623d");
        
        // 根据背景颜色调整网格线颜色
        const color = state.boardColor || "#2a623d";
        if (color === "#FFFFFF" || color === "rgb(255, 255, 255)") {
            // 白色背景使用深色网格线
            document.documentElement.style.setProperty('--grid-color', 'rgba(0, 0, 0, 0.2)');
            document.documentElement.style.setProperty('--grid-color-active', 'rgba(0, 0, 0, 0.3)');
        } else {
            // 深色背景使用浅色网格线
            document.documentElement.style.setProperty('--grid-color', 'rgba(255, 255, 255, 0.3)');
            document.documentElement.style.setProperty('--grid-color-active', 'rgba(255, 255, 255, 0.4)');
        }
        
        // 高亮显示选中的颜色
        $(".board-color-option").removeClass("selected");
        $(".board-color-option").each(function() {
            const optionColor = $(this).data("color");
            const rgbColor = hexToRgb(optionColor);
            if (state.boardColor === optionColor || 
                state.boardColor === `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})`) {
                $(this).addClass("selected");
            }
        });
        
        // 清空黑板
        $('#blackboard').empty();
        
        // 恢复所有便利贴
        state.notes.forEach(note => {
            let noteHtml;
            
            if (note.hasBackground) {
                // 带有背景的便利贴
                noteHtml = `
                    <div class="sticky-note" id="${note.id}" style="background-color: ${note.color}; left: ${note.left}px; top: ${note.top}px; --rotate-deg: ${note.rotation}; z-index: ${note.zIndex};">
                        <div class="delete-btn">✕</div>
                        <div class="note-background" style="background-image: ${note.backgroundImage};"></div>
                        <div class="note-title" contenteditable="true">${note.title}</div>
                        <div class="note-content" contenteditable="true">${note.content}</div>
                        <div class="bottom-shadow"></div>
                    </div>
                `;
            } else {
                // 普通便利贴
                noteHtml = `
                    <div class="sticky-note" id="${note.id}" style="background-color: ${note.color}; left: ${note.left}px; top: ${note.top}px; --rotate-deg: ${note.rotation}; z-index: ${note.zIndex};">
                        <div class="delete-btn">✕</div>
                        <div class="note-title" contenteditable="true">${note.title}</div>
                        <div class="note-content" contenteditable="true">${note.content}</div>
                        <div class="bottom-shadow"></div>
                    </div>
                `;
            }
            
            $('#blackboard').append(noteHtml);
            
            // 恢复缩放
            $(`#${note.id}`).data('scale', note.scale);
            $(`#${note.id}`).css('transform', `rotate(${note.rotation}) scale(${note.scale})`);
            
            // 使便利贴可拖动
            $(`#${note.id}`).draggable({
                containment: "parent",
                stack: ".sticky-note",
                start: function() {
                    // 开始拖动时添加选中状态
                    $('.sticky-note').removeClass('selected-note');
                    $(this).addClass('selected-note');
                    
                    // 检查是否接近正向，添加网格对齐类
                    const rotation = parseFloat($(this).css('--rotate-deg') || '0deg');
                    if (Math.abs(rotation % 90) < 0.5) {
                        $(this).addClass('align-to-grid');
                        $(this).addClass('show-grid');
                    }
                    
                    // 移除所有对齐指示线
                    $('.alignment-guide').remove();
                },
                drag: function(event, ui) {
                    // 检查是否接近正向
                    const rotation = parseFloat($(this).css('--rotate-deg') || '0deg');
                    if (Math.abs(rotation % 90) < 0.5) {
                        // 移除所有对齐指示线
                        $('.alignment-guide').remove();
                        
                        // 检查对齐
                        checkAlignment($(this), ui.position);
                    }
                    
                    checkOverlap();
                },
                stop: function() {
                    checkOverlap();
                    $(this).removeClass('show-grid');
                    // 移除所有对齐指示线
                    $('.alignment-guide').remove();
                    
                    // 保存历史记录
                    saveToHistory();
                }
            });
        });
        
        // 重新绑定事件
        bindNoteEvents();
    }
    
    // 绑定便利贴事件
    function bindNoteEvents() {
        // 删除按钮点击事件
        $('.delete-btn').off('click').on('click', function(e) {
            e.stopPropagation();
            $(this).parent().remove();
            checkOverlap();
            saveToHistory();
        });
        
        // 双击编辑事件
        $('.sticky-note').off('dblclick').on('dblclick', function() {
            // 已经实现在现有代码中
        });
        
        // 右键菜单事件
        $('.sticky-note').off('contextmenu').on('contextmenu', function(e) {
            // 已经实现在现有代码中
        });
        
        // 点击选中事件
        $('.sticky-note').off('click').on('click', function() {
            $('.sticky-note').removeClass('selected-note');
            $(this).addClass('selected-note');
        });
    }
    
    // 辅助函数：将十六进制颜色转换为RGB
    function hexToRgb(hex) {
        // 移除#号
        hex = hex.replace('#', '');
        
        // 解析RGB值
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return { r, g, b };
    }
    
    // 黑板背景颜色选择
    $(".board-color-option").click(function() {
        const color = $(this).data("color");
        $("#blackboard").css("background-color", color);
        
        // 高亮显示选中的颜色
        $(".board-color-option").removeClass("selected");
        $(this).addClass("selected");
        
        // 根据背景颜色调整网格线颜色
        if (color === "#FFFFFF") {
            // 白色背景使用深色网格线
            document.documentElement.style.setProperty('--grid-color', 'rgba(0, 0, 0, 0.2)');
            document.documentElement.style.setProperty('--grid-color-active', 'rgba(0, 0, 0, 0.3)');
        } else {
            // 深色背景使用浅色网格线
            document.documentElement.style.setProperty('--grid-color', 'rgba(255, 255, 255, 0.3)');
            document.documentElement.style.setProperty('--grid-color-active', 'rgba(255, 255, 255, 0.4)');
        }
        
        // 保存历史记录
        saveToHistory();
    });
    
    // 默认选中绿色黑板
    $(".board-color-option[data-color='#2a623d']").addClass("selected");
    
    // 初始保存当前状态
    saveToHistory();

    // 添加鼠标悬停事件处理
    $(document).on('mouseenter', '.selected-note', function() {
        // 检查是否接近正向或45度的倍数
        const rotation = parseFloat($(this).css('--rotate-deg') || '0deg');
        if (Math.abs(rotation % 45) < 0.5) {
            $(this).addClass('show-grid');
        }
    });

    $(document).on('mouseleave', '.selected-note', function() {
        $(this).removeClass('show-grid');
    });

    // 添加保存和加载功能
    function saveToLocalStorage() {
        // 获取当前黑板状态
        const currentState = {
            notes: [],
            boardColor: $("#blackboard").css("background-color")
        };
        
        // 收集所有便利贴的信息
        $('.sticky-note').each(function() {
            const $note = $(this);
            currentState.notes.push({
                id: $note.attr('id'),
                color: $note.css('background-color'),
                left: parseInt($note.css('left')),
                top: parseInt($note.css('top')),
                rotation: $note.css('--rotate-deg') || '0deg',
                scale: $note.data('scale') || 1,
                title: $note.find('.note-title').html(),
                content: $note.find('.note-content').html(),
                hasBackground: $note.find('.note-background').length > 0,
                backgroundImage: $note.find('.note-background').length > 0 ? 
                                $note.find('.note-background').css('background-image') : null,
                zIndex: parseInt($note.css('z-index')) || 1
            });
        });
        
        // 保存到本地存储
        localStorage.setItem('blackboardState', JSON.stringify(currentState));
    }
    
    // 自动保存功能
    function setupAutoSave() {
        // 每30秒自动保存一次
        setInterval(saveToLocalStorage, 30000);
        
        // 页面关闭前保存
        $(window).on('beforeunload', function() {
            saveToLocalStorage();
        });
    }
    
    // 从本地存储加载
    function loadFromLocalStorage() {
        const savedState = localStorage.getItem('blackboardState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                restoreBoardState(state);
                return true;
            } catch (e) {
                console.error("加载保存的状态失败:", e);
                return false;
            }
        }
        return false;
    }
    
    // 尝试加载保存的状态
    if (!loadFromLocalStorage()) {
        // 如果没有保存的状态，初始化一个空状态
        saveToHistory();
    }
    
    // 设置自动保存
    setupAutoSave();
}); 