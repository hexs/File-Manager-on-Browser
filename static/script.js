document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');

    class UIWindow {
        constructor(x, y, width, height, title) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.title = title;
            this.isDragging = false;
            this.dragOffsetX = 0;
            this.dragOffsetY = 0;
            this.folderTree = [];
            this.currentPath = '/';
            this.selectedFolder = null;
            this.fetchFileStructure();
        }

        fetchFileStructure() {
            fetch('/get_files')
                .then(response => response.json())
                .then(data => {
                    this.folderTree = data;
                    this.selectedFolder = {name: 'Root', isFolder: true, children: this.folderTree};
                    drawAllWindows();
                });
        }

        draw() {
            // Window background
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // Window border
            ctx.strokeStyle = '#999999';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            // Title bar
            ctx.fillStyle = '#4a90e2';
            ctx.fillRect(this.x, this.y, this.width, 30);

            // Window title
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(this.title, this.x + 10, this.y + 20);

            // Close button
            ctx.fillStyle = '#ff5c5c';
            ctx.fillRect(this.x + this.width - 30, this.y + 5, 20, 20);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('×', this.x + this.width - 23, this.y + 20);

            // Path entry line
            this.drawPathEntry();

            // Folder tree
            this.drawFolderTree();

            // File view
            this.drawFileView();
        }

        drawPathEntry() {
            const pathEntryY = this.y + 35;
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x + 5, pathEntryY, this.width - 10, 25);
            ctx.strokeStyle = '#999999';
            ctx.strokeRect(this.x + 5, pathEntryY, this.width - 10, 25);

            ctx.fillStyle = 'black';
            ctx.font = '14px Arial';
            ctx.fillText(this.currentPath, this.x + 10, pathEntryY + 17);
        }

        drawFolderTree() {
            const treeWidth = this.width * 0.3;
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x, this.y + 65, treeWidth, this.height - 65);
            ctx.strokeStyle = '#999999';
            ctx.strokeRect(this.x, this.y + 65, treeWidth, this.height - 65);

            this.drawFolders(this.folderTree, this.x + 5, this.y + 75, 0);
        }

        drawFolders(folders, x, y, level) {
            folders.forEach((folder, index) => {
                const yPos = y + index * 20;
                ctx.fillStyle = 'black';
                ctx.font = '14px Arial';
                const icon = folder.isFolder ? '📁' : '📄';
                ctx.fillText(icon + ' ' + folder.name, x + level * 15, yPos);

                if (folder.isFolder && folder.children) {
                    this.drawFolders(folder.children, x, yPos + 20, level + 1);
                }
            });
        }

        drawFileView() {
            const fileViewX = this.x + this.width * 0.3;
            const fileViewWidth = this.width * 0.7;
            ctx.fillStyle = 'white';
            ctx.fillRect(fileViewX, this.y + 65, fileViewWidth, this.height - 65);
            ctx.strokeStyle = '#999999';
            ctx.strokeRect(fileViewX, this.y + 65, fileViewWidth, this.height - 65);

            if (this.selectedFolder) {
                ctx.fillStyle = 'black';
                ctx.font = '16px Arial';
                ctx.fillText(`Contents of ${this.selectedFolder.name}:`, fileViewX + 10, this.y + 85);

                if (this.selectedFolder.children) {
                    this.selectedFolder.children.forEach((item, index) => {
                        const icon = item.isFolder ? '📁' : '📄';
                        ctx.fillText(`${icon} ${item.name}`, fileViewX + 10, this.y + 115 + index * 25);
                    });
                }
            }
        }

        isInside(x, y) {
            return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
        }

        isOnCloseButton(x, y) {
            return x >= this.x + this.width - 30 && x <= this.x + this.width - 10 && y >= this.y + 5 && y <= this.y + 25;
        }

        isOnTitleBar(x, y) {
            return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + 30;
        }

        isOnPathEntry(x, y) {
            return x >= this.x + 5 && x <= this.x + this.width - 5 && y >= this.y + 35 && y <= this.y + 60;
        }

        handleClick(x, y) {
            if (this.isOnPathEntry(x, y)) {
                this.editPath();
                return;
            }

            const treeWidth = this.width * 0.3;
            if (x >= this.x && x <= this.x + treeWidth && y >= this.y + 65) {
                const clickedItem = this.findClickedItem(this.folderTree, x - this.x - 5, y - this.y - 75);
                if (clickedItem && clickedItem.isFolder) {
                    this.selectedFolder = clickedItem;
                    this.currentPath += clickedItem.name + '/';
                    drawAllWindows();
                }
            }
        }

        findClickedItem(items, x, y, level = 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const yPos = i * 20;
                if (y >= yPos && y < yPos + 20 && x >= level * 15 && x < (level + 1) * 15 + 100) {
                    return item;
                }
                if (item.isFolder && item.children) {
                    const childResult = this.findClickedItem(item.children, x, y - 20, level + 1);
                    if (childResult) return childResult;
                }
            }
            return null;
        }

        editPath() {
            const newPath = prompt('Enter new path:', this.currentPath);
            if (newPath !== null) {
                this.currentPath = newPath;
                // Here you would typically validate the path and update the view accordingly
                drawAllWindows();
            }
        }
    }

    const fileManager = new UIWindow(50, 50, 800, 600, 'File Manager');
    const windows = [fileManager];

    function drawAllWindows() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        windows.forEach(window => window.draw());
    }

    drawAllWindows();

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    function handleMouseDown(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        for (let i = windows.length - 1; i >= 0; i--) {
            const window = windows[i];
            if (window.isOnCloseButton(x, y)) {
                windows.splice(i, 1);
                drawAllWindows();
                return;
            } else if (window.isOnTitleBar(x, y)) {
                window.isDragging = true;
                window.dragOffsetX = x - window.x;
                window.dragOffsetY = y - window.y;
                windows.push(windows.splice(i, 1)[0]);
                drawAllWindows();
                return;
            } else if (window.isInside(x, y)) {
                window.handleClick(x, y);
                windows.push(windows.splice(i, 1)[0]);
                drawAllWindows();
                return;
            }
        }
    }

    function handleMouseMove(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const draggingWindow = windows.find(window => window.isDragging);
        if (draggingWindow) {
            draggingWindow.x = x - draggingWindow.dragOffsetX;
            draggingWindow.y = y - draggingWindow.dragOffsetY;
            drawAllWindows();
        }
    }

    function handleMouseUp() {
        windows.forEach(window => window.isDragging = false);
    }
});