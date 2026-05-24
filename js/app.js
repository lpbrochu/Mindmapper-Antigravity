import { MindMapStore } from './store.js';
import { MindMapCanvas } from './canvas.js';
import { NodeColorList } from './models.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize State Store and Visual Canvas
    const store = new MindMapStore();
    const canvas = new MindMapCanvas(store);
    
    let lastInspectedNodeID = null;

    // --- Panel Toggles (Sidebar & Inspector Collapse) ---
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const panelSidebar = document.getElementById('panel-sidebar');
    
    if (btnToggleSidebar && panelSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            panelSidebar.classList.toggle('collapsed');
            btnToggleSidebar.classList.toggle('active');
            setTimeout(() => canvas.updateTransform(), 300);
        });
    }

    const btnToggleInspector = document.getElementById('btn-toggle-inspector');
    const panelInspector = document.getElementById('panel-inspector');
    
    if (btnToggleInspector && panelInspector) {
        btnToggleInspector.addEventListener('click', () => {
            panelInspector.classList.toggle('collapsed');
            btnToggleInspector.classList.toggle('active');
            setTimeout(() => canvas.updateTransform(), 300);
        });
    }

    // --- Toolbar Node Operations ---
    const btnAddChild = document.getElementById('btn-add-child');
    if (btnAddChild) {
        btnAddChild.addEventListener('click', () => store.addChildToSelection());
    }

    const btnAddSibling = document.getElementById('btn-add-sibling');
    if (btnAddSibling) {
        btnAddSibling.addEventListener('click', () => store.addSiblingToSelection());
    }

    const btnDelete = document.getElementById('btn-delete');
    if (btnDelete) {
        btnDelete.addEventListener('click', () => store.deleteSelection());
    }

    const btnTidyLayout = document.getElementById('btn-tidy-layout');
    if (btnTidyLayout) {
        btnTidyLayout.addEventListener('click', () => store.tidyLayout());
    }

    // --- Zoom Controls ---
    const btnZoomOut = document.getElementById('btn-zoom-out');
    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => canvas.zoomAtViewportCenter(store.zoomScale / 1.18));
    }

    const btnZoomIn = document.getElementById('btn-zoom-in');
    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => canvas.zoomAtViewportCenter(store.zoomScale * 1.18));
    }

    const btnZoomReset = document.getElementById('btn-zoom-reset');
    if (btnZoomReset) {
        btnZoomReset.addEventListener('click', () => canvas.zoomAtViewportCenter(1.0));
    }

    // HUD Zoom controls
    const hudZoomOut = document.getElementById('hud-zoom-out');
    if (hudZoomOut) {
        hudZoomOut.addEventListener('click', () => canvas.zoomAtViewportCenter(store.zoomScale / 1.18));
    }

    const hudZoomIn = document.getElementById('hud-zoom-in');
    if (hudZoomIn) {
        hudZoomIn.addEventListener('click', () => canvas.zoomAtViewportCenter(store.zoomScale * 1.18));
    }

    // --- Document Settings Bindings ---
    const inputDocTitle = document.getElementById('input-doc-title');
    if (inputDocTitle) {
        inputDocTitle.addEventListener('input', (e) => {
            store.document.title = e.target.value.trim() === '' ? 'Untitled Mind Map' : e.target.value;
            store.markChanged(); // Silent backup update
        });
    }

    // --- File Serialization Handling (Save / Load / Import / Export) ---
    
    // File triggers
    const btnLoadJSON = document.getElementById('btn-load-json');
    const jsonFileInput = document.getElementById('json-file-input');
    if (btnLoadJSON && jsonFileInput) {
        btnLoadJSON.addEventListener('click', () => jsonFileInput.click());
        jsonFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                store.loadDocumentFromJSON(event.target.result, file.name);
                jsonFileInput.value = ''; // Reset
            };
            reader.readAsText(file);
        });
    }

    const btnSaveJSON = document.getElementById('btn-save-json');
    if (btnSaveJSON) {
        btnSaveJSON.addEventListener('click', () => saveJSONFlow());
    }

    const btnSaveAsJSON = document.getElementById('btn-save-as-json');
    if (btnSaveAsJSON) {
        btnSaveAsJSON.addEventListener('click', () => saveJSONFlow(true));
    }

    const btnImportMD = document.getElementById('btn-import-md');
    const markdownFileInput = document.getElementById('markdown-file-input');
    if (btnImportMD && markdownFileInput) {
        btnImportMD.addEventListener('click', () => markdownFileInput.click());
        markdownFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                store.importDocumentFromMarkdown(event.target.result, file.name);
                markdownFileInput.value = ''; // Reset
            };
            reader.readAsText(file);
        });
    }

    const btnExportMD = document.getElementById('btn-export-md');
    if (btnExportMD) {
        btnExportMD.addEventListener('click', () => {
            const mdText = store.exportDocumentToMarkdown();
            const fileName = `${sanitizeFileName(store.document.title)}.md`;
            downloadFile(mdText, fileName, 'text/markdown;charset=utf-8');
            store.statusMessage = `Exported ${fileName}`;
            store.notify();
        });
    }

    function saveJSONFlow(forceRename = false) {
        let name = store.currentFileName;
        if (!name || forceRename) {
            const input = prompt("Enter file name to save:", name || sanitizeFileName(store.document.title));
            if (input === null) return; // Cancelled
            name = input.trim() === '' ? 'mindmap' : input.trim();
            if (!name.endsWith('.json')) name += '.json';
            store.currentFileName = name;
        }

        const json = store.exportDocumentToJSON();
        downloadFile(json, name, 'application/json;charset=utf-8');
        store.statusMessage = `Saved ${name}`;
        store.notify();
    }

    function downloadFile(content, fileName, contentType) {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function sanitizeFileName(title) {
        const fallback = "Mind Map";
        const trimmed = title.trim();
        const source = trimmed === "" ? fallback : trimmed;
        return source.replace(/[/\\?%*:|"<>]/g, '-');
    }

    // --- Drag and Drop file loading overlay ---
    const viewport = document.getElementById('canvas-viewport');
    const dropZone = document.getElementById('drop-zone-overlay');
    
    if (viewport && dropZone) {
        window.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dropZone.classList.add('active');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            // Only deactivate if leaving viewport area
            if (e.relatedTarget === null) {
                dropZone.classList.remove('active');
            }
        });

        window.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        window.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('active');
            
            const file = e.dataTransfer.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                if (file.name.endsWith('.json')) {
                    store.loadDocumentFromJSON(event.target.result, file.name);
                } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
                    store.importDocumentFromMarkdown(event.target.result, file.name);
                } else {
                    store.statusMessage = 'Unsupported file format dropped!';
                    store.notify();
                }
            };
            reader.readAsText(file);
        });
    }

    // --- Inspector Reactive Binding System ---
    
    function renderInspector() {
        const container = document.getElementById('inspector-content');
        if (!container) return;

        const node = store.selectedNode;
        if (!node) {
            container.innerHTML = `
                <div class="content-unavailable">
                    <svg viewBox="0 0 24 24"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3zM13 13l6 6"/></svg>
                    <span>No Node Selected</span>
                </div>
            `;
            lastInspectedNodeID = null;
            return;
        }

        // To prevent keyboard focus loss while typing, don't rebuild elements if inspecting same node
        if (lastInspectedNodeID === node.id) {
            const inputTitle = document.getElementById('inspect-title');
            const inputNotes = document.getElementById('inspect-notes');
            const inputX = document.getElementById('inspect-x');
            const inputY = document.getElementById('inspect-y');

            if (inputTitle && document.activeElement !== inputTitle) {
                inputTitle.value = node.title;
            }
            if (inputNotes && document.activeElement !== inputNotes) {
                inputNotes.value = node.notes;
            }
            if (inputX && document.activeElement !== inputX) {
                inputX.value = Math.round(node.position.x);
            }
            if (inputY && document.activeElement !== inputY) {
                inputY.value = Math.round(node.position.y);
            }
            
            // Sync active picked color circles
            document.querySelectorAll('.color-picker-circle').forEach(circle => {
                circle.classList.toggle('active', circle.dataset.color === node.color);
            });
            return;
        }

        // Full rebuild for a brand new node selection
        lastInspectedNodeID = node.id;
        
        container.innerHTML = `
            <div class="inspector-section">
                <span class="inspector-label">Selected Node Title</span>
                <input type="text" id="inspect-title" class="inspector-input" value="${node.title}" placeholder="Idea description">
            </div>

            <div class="inspector-section">
                <span class="inspector-label">Color Theme</span>
                <div class="color-picker-grid">
                    ${NodeColorList.map(c => `
                        <div class="color-picker-circle ${c.id === node.color ? 'active' : ''}" 
                             data-color="${c.id}" 
                             style="background-color: ${c.border}; color: ${c.border}"
                             title="${c.label}"></div>
                    `).join('')}
                </div>
            </div>

            <div class="inspector-section">
                <span class="inspector-label">Notes</span>
                <textarea id="inspect-notes" class="inspector-input" placeholder="Add detailed notes here...">${node.notes || ''}</textarea>
            </div>

            <div class="inspector-section">
                <span class="inspector-label">Canvas Coordinates</span>
                <div class="coordinate-row">
                    <div class="coordinate-field">
                        <span>X</span>
                        <input type="number" id="inspect-x" value="${Math.round(node.position.x)}">
                    </div>
                    <div class="coordinate-field">
                        <span>Y</span>
                        <input type="number" id="inspect-y" value="${Math.round(node.position.y)}">
                    </div>
                </div>
            </div>

            <div class="inspector-section" style="margin-top: 10px;">
                <span class="inspector-label">Actions</span>
                <div class="inspector-actions-list">
                    <button type="button" class="btn-tool" id="inspect-btn-tidy">
                        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                        <span>Tidy Layout</span>
                    </button>
                    <button type="button" class="btn-tool" id="inspect-btn-child">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        <span>Add Child Node</span>
                    </button>
                    <button type="button" class="btn-tool" id="inspect-btn-sibling">
                        <svg viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                        <span>Add Sibling Node</span>
                    </button>
                    <button type="button" class="btn-tool btn-destructive" id="inspect-btn-delete" ${!store.canDeleteSelection ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        <span>Delete Branch</span>
                    </button>
                </div>
            </div>
        `;

        // Bind events to inspector inputs
        const inspectTitle = document.getElementById('inspect-title');
        const inspectNotes = document.getElementById('inspect-notes');
        const inspectX = document.getElementById('inspect-x');
        const inspectY = document.getElementById('inspect-y');

        inspectTitle.addEventListener('input', (e) => {
            const activeNode = store.selectedNode;
            if (activeNode) {
                activeNode.title = e.target.value;
                store.markChanged(); // Triggers canvas updates quietly
            }
        });

        inspectNotes.addEventListener('input', (e) => {
            const activeNode = store.selectedNode;
            if (activeNode) {
                activeNode.notes = e.target.value;
                store.markChanged();
            }
        });

        inspectX.addEventListener('input', (e) => {
            const activeNode = store.selectedNode;
            if (activeNode) {
                activeNode.position.x = Number(e.target.value);
                store.markChanged();
            }
        });

        inspectY.addEventListener('input', (e) => {
            const activeNode = store.selectedNode;
            if (activeNode) {
                activeNode.position.y = Number(e.target.value);
                store.markChanged();
            }
        });

        // Color circles binding
        container.querySelectorAll('.color-picker-circle').forEach(circle => {
            circle.addEventListener('click', () => {
                const activeNode = store.selectedNode;
                if (activeNode) {
                    activeNode.color = circle.dataset.color;
                    store.markChanged('Changed theme color');
                }
            });
        });

        // Button action bindings inside inspector
        document.getElementById('inspect-btn-tidy').addEventListener('click', () => store.tidyLayout());
        document.getElementById('inspect-btn-child').addEventListener('click', () => store.addChildToSelection());
        document.getElementById('inspect-btn-sibling').addEventListener('click', () => store.addSiblingToSelection());
        
        const insDelete = document.getElementById('inspect-btn-delete');
        if (insDelete) {
            insDelete.addEventListener('click', () => store.deleteSelection());
        }
    }

    // Subscribe to store updates to rebuild inspector
    store.subscribe(() => {
        renderInspector();
        
        // Sync active states on toolbar buttons based on selection
        const hasSelection = store.selectedNodeID !== null;
        const canDelete = store.canDeleteSelection;

        if (btnAddChild) btnAddChild.disabled = !hasSelection;
        if (btnAddSibling) btnAddSibling.disabled = !hasSelection;
        if (btnDelete) btnDelete.disabled = !canDelete;
    });

    // --- Keyboard Shortcuts System ---
    
    window.addEventListener('keydown', (e) => {
        // Skip shortcuts if currently writing inside any text input field
        const activeTag = document.activeElement.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement.classList.contains('editing')) {
            // Exceptions: Enter in input elements inside the canvas card
            return;
        }

        const distance = 12.0;
        switch (e.key) {
            // 1. Move selection using arrow keys
            case 'ArrowUp':
                e.preventDefault();
                store.moveSelectedBy(0, -distance);
                break;
            case 'ArrowDown':
                e.preventDefault();
                store.moveSelectedBy(0, distance);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                store.moveSelectedBy(-distance, 0);
                break;
            case 'ArrowRight':
                e.preventDefault();
                store.moveSelectedBy(distance, 0);
                break;

            // 2. Add node structures
            case 'Tab':
                e.preventDefault();
                store.addChildToSelection();
                break;
            case 'Enter':
                e.preventDefault();
                store.addSiblingToSelection();
                break;

            // 3. Deleting node branches
            case 'Backspace':
            case 'Delete':
                e.preventDefault();
                store.deleteSelection();
                break;

            // 4. Escape out of selections
            case 'Escape':
                e.preventDefault();
                store.selectedNodeID = null;
                store.notify();
                break;
                
            // 5. Cmd/Ctrl combos
            case 's':
                if (e.metaKey || e.ctrlKey) {
                    e.preventDefault();
                    saveJSONFlow();
                }
                break;
            case '=':
            case '+':
                if (e.metaKey || e.ctrlKey) {
                    e.preventDefault();
                    canvas.zoomAtViewportCenter(store.zoomScale * 1.18);
                }
                break;
            case '-':
                if (e.metaKey || e.ctrlKey) {
                    e.preventDefault();
                    canvas.zoomAtViewportCenter(store.zoomScale / 1.18);
                }
                break;
        }
    });

    // Initial render call
    store.notify();
});
